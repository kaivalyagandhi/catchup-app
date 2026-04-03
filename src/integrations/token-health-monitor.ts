/**
 * Token Health Monitor
 *
 * Proactively validates OAuth tokens before sync attempts to prevent wasted API calls.
 * Monitors token expiry, handles token refresh, and emits events for notification service.
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6
 */

import pool from '../db/connection';
import { getToken } from './oauth-repository';
import { googleContactsOAuthService } from './google-contacts-oauth-service';
import { EventEmitter } from 'events';

export type IntegrationType = 'google_contacts' | 'google_calendar';
export type TokenStatus = 'valid' | 'expiring_soon' | 'expired' | 'revoked' | 'unknown';

export interface TokenHealth {
  userId: string;
  integrationType: IntegrationType;
  status: TokenStatus;
  lastChecked: Date;
  expiryDate: Date | null;
  errorMessage: string | null;
}

interface TokenHealthRow {
  id: string;
  user_id: string;
  integration_type: string;
  status: string;
  last_checked: Date;
  expiry_date: Date | null;
  error_message: string | null;
  consecutive_failures: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * TokenHealthMonitor
 * Validates OAuth token health and manages proactive token refresh
 */
export class TokenHealthMonitor extends EventEmitter {
  private static instance: TokenHealthMonitor;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TokenHealthMonitor {
    if (!TokenHealthMonitor.instance) {
      TokenHealthMonitor.instance = new TokenHealthMonitor();
    }
    return TokenHealthMonitor.instance;
  }

  /**
   * Check token health before sync
   * Returns token status and triggers refresh if needed
   *
   * Requirements: 1.1, 1.3, 1.4
   */
  async checkTokenHealth(userId: string, integrationType: IntegrationType): Promise<TokenHealth> {
    // First, check if there's an existing token_health record
    // This is important because the token may have been marked as revoked or expired
    // by a previous API call failure
    const existingHealth = await this.getTokenHealth(userId, integrationType);

    // If token is already marked as revoked or expired, return that status immediately
    // Don't recalculate based on expiry date
    if (
      existingHealth &&
      (existingHealth.status === 'revoked' || existingHealth.status === 'expired')
    ) {
      return existingHealth;
    }

    const provider = this.getProviderName(integrationType);
    const token = await getToken(userId, provider);

    if (!token) {
      return await this.updateTokenHealth(
        userId,
        integrationType,
        'unknown',
        null,
        'No token found'
      );
    }

    const now = new Date();
    const expiryDate = token.expiresAt;

    // Check if token is expired
    if (expiryDate && expiryDate < now) {
      return await this.updateTokenHealth(
        userId,
        integrationType,
        'expired',
        expiryDate,
        'Token has expired'
      );
    }

    // Check if token is expiring soon (within 24 hours)
    // Requirement 1.2: Token expiry classification
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (expiryDate && expiryDate < twentyFourHoursFromNow) {
      return await this.updateTokenHealth(
        userId,
        integrationType,
        'expiring_soon',
        expiryDate,
        'Token expires within 24 hours'
      );
    }

    // Token is valid
    return await this.updateTokenHealth(userId, integrationType, 'valid', expiryDate || null, null);
  }

  /**
   * Mark token as invalid (called when API returns 401/invalid_grant)
   *
   * Requirement 1.3: Token error handling
   */
  async markTokenInvalid(
    userId: string,
    integrationType: IntegrationType,
    reason: string
  ): Promise<void> {
    const provider = this.getProviderName(integrationType);
    const token = await getToken(userId, provider);

    await this.updateTokenHealth(
      userId,
      integrationType,
      'revoked',
      token?.expiresAt || null,
      reason
    );
  }

  /**
   * Get token health status
   */
  async getTokenHealth(
    userId: string,
    integrationType: IntegrationType
  ): Promise<TokenHealth | null> {
    try {
      const result = await pool.query<TokenHealthRow>(
        'SELECT * FROM token_health WHERE user_id = $1 AND integration_type = $2',
        [userId, integrationType]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.rowToTokenHealth(result.rows[0]);
    } catch (error) {
      // If table doesn't exist, return null (token health is optional)
      console.warn(`Could not get token health for ${integrationType}:`, error);
      return null;
    }
  }

  /**
   * Proactively refresh tokens that are expiring soon or already expired.
   * Uses error classification to distinguish transient vs non-recoverable failures.
   * Implements 3-strike escalation for consecutive transient failures.
   *
   * Requirements: 8.1, 8.3, 8.4, 5.1, 5.2, 5.3, 5.5
   */
  async refreshExpiringTokens(): Promise<{
    refreshed: number;
    failed: number;
  }> {
    const fortyEightHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Find all tokens expiring within 48 hours OR already expired (not just valid/expiring_soon)
    const result = await pool.query<TokenHealthRow>(
      `SELECT * FROM token_health 
       WHERE expiry_date IS NOT NULL 
       AND expiry_date < $1 
       AND status IN ('valid', 'expiring_soon', 'expired')`,
      [fortyEightHoursFromNow]
    );

    let refreshed = 0;
    let failed = 0;

    for (const row of result.rows) {
      try {
        const userId = row.user_id;
        const integrationType = row.integration_type as IntegrationType;

        // Check if refresh token exists
        const provider = this.getProviderName(integrationType);
        const token = await getToken(userId, provider);

        if (!token || !token.refreshToken) {
          // Requirement 8.6: Missing refresh token handling
          await this.updateTokenHealth(
            userId,
            integrationType,
            'revoked',
            row.expiry_date,
            'Missing refresh token - re-authentication required'
          );
          // Create notification for missing refresh token
          try {
            const { tokenHealthNotificationService } = await import('./token-health-notification-service');
            await tokenHealthNotificationService.createNotification(userId, integrationType, 'token_invalid');
          } catch (notifError) {
            console.error(`[TokenHealthMonitor] Failed to create notification for user ${userId}:`, notifError);
          }
          failed++;
          continue;
        }

        // Attempt to refresh token
        if (integrationType === 'google_contacts') {
          await googleContactsOAuthService.refreshAccessToken(userId);
        } else if (integrationType === 'google_calendar') {
          // TODO: Implement calendar token refresh when calendar OAuth service is available
          throw new Error('Calendar token refresh not yet implemented');
        }

        // Update token health to valid and reset consecutive_failures
        await this.checkTokenHealth(userId, integrationType);
        await pool.query(
          `UPDATE token_health SET consecutive_failures = 0 WHERE user_id = $1 AND integration_type = $2`,
          [userId, integrationType]
        );
        refreshed++;

        // Requirement 8.5: Token refresh audit logging
        console.log(
          `[TokenHealthMonitor] Successfully refreshed token for user ${userId}, integration ${integrationType}`
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const userId = row.user_id;
        const integrationType = row.integration_type as IntegrationType;
        const classification = this.classifyRefreshError(error);

        if (classification === 'non-recoverable') {
          // Non-recoverable: mark revoked + create notification
          await this.updateTokenHealth(
            userId,
            integrationType,
            'revoked',
            row.expiry_date,
            `Token refresh failed (non-recoverable): ${errorMsg}`
          );
          // Create reconnection notification
          try {
            const { tokenHealthNotificationService } = await import('./token-health-notification-service');
            await tokenHealthNotificationService.createNotification(userId, integrationType, 'token_invalid');
          } catch (notifError) {
            console.error(`[TokenHealthMonitor] Failed to create notification for user ${userId}:`, notifError);
          }
        } else {
          // Transient: retain status, increment consecutive_failures, log details
          const currentFailures = (row as any).consecutive_failures ?? 0;
          const newFailures = currentFailures + 1;

          console.warn(
            `[TokenHealthMonitor] Transient refresh failure for user ${userId}, integration ${integrationType}: ${errorMsg} (consecutive_failures: ${newFailures})`
          );

          if (newFailures >= 3) {
            // 3-strike escalation: mark as revoked
            await this.updateTokenHealth(
              userId,
              integrationType,
              'revoked',
              row.expiry_date,
              `Token refresh failed after 3 consecutive transient failures: ${errorMsg}`
            );
            await pool.query(
              `UPDATE token_health SET consecutive_failures = $1 WHERE user_id = $2 AND integration_type = $3`,
              [newFailures, userId, integrationType]
            );
            // Create reconnection notification
            try {
              const { tokenHealthNotificationService } = await import('./token-health-notification-service');
              await tokenHealthNotificationService.createNotification(userId, integrationType, 'token_invalid');
            } catch (notifError) {
              console.error(`[TokenHealthMonitor] Failed to create notification for user ${userId}:`, notifError);
            }
          } else {
            // Retain current status, just increment failures
            await pool.query(
              `UPDATE token_health SET consecutive_failures = $1 WHERE user_id = $2 AND integration_type = $3`,
              [newFailures, userId, integrationType]
            );
          }
        }

        failed++;

        // Requirement 8.5: Token refresh audit logging
        console.error(
          `[TokenHealthMonitor] Failed to refresh token for user ${userId}, integration ${integrationType} (${classification}): ${errorMsg}`
        );
      }
    }

    return { refreshed, failed };
  }

  /**
   * Update token health in database and emit events
   *
   * Requirement 1.5: Token health persistence
   * Requirement 1.6: Token health event emission
   */
  private async updateTokenHealth(
    userId: string,
    integrationType: IntegrationType,
    status: TokenStatus,
    expiryDate: Date | null,
    errorMessage: string | null
  ): Promise<TokenHealth> {
    // Get previous status for event emission
    const previousHealth = await this.getTokenHealth(userId, integrationType);
    const previousStatus = previousHealth?.status || 'unknown';

    // Upsert token health
    const result = await pool.query<TokenHealthRow>(
      `INSERT INTO token_health (user_id, integration_type, status, last_checked, expiry_date, error_message)
       VALUES ($1, $2, $3, NOW(), $4, $5)
       ON CONFLICT (user_id, integration_type)
       DO UPDATE SET
         status = EXCLUDED.status,
         last_checked = EXCLUDED.last_checked,
         expiry_date = EXCLUDED.expiry_date,
         error_message = EXCLUDED.error_message,
         updated_at = NOW()
       RETURNING *`,
      [userId, integrationType, status, expiryDate, errorMessage]
    );

    const tokenHealth = this.rowToTokenHealth(result.rows[0]);

    // Emit event if status changed from valid to invalid
    // Requirement 1.6: Token health event emission
    if (
      previousStatus === 'valid' &&
      (status === 'expired' || status === 'revoked' || status === 'expiring_soon')
    ) {
      this.emit('token_health_changed', {
        userId,
        integrationType,
        oldStatus: previousStatus,
        newStatus: status,
        errorMessage,
      });
    }

    return tokenHealth;
  }

  /**
   * Convert database row to TokenHealth object
   */
  private rowToTokenHealth(row: TokenHealthRow): TokenHealth {
    return {
      userId: row.user_id,
      integrationType: row.integration_type as IntegrationType,
      status: row.status as TokenStatus,
      lastChecked: row.last_checked,
      expiryDate: row.expiry_date,
      errorMessage: row.error_message,
    };
  }

  /**
   * Get provider name from integration type
   */
  private getProviderName(integrationType: IntegrationType): string {
    return integrationType === 'google_contacts' ? 'google_contacts' : 'google_calendar';
  }

  /**
   * Clear token health records for a user
   * Used during disconnection flows
   *
   * Requirements: 1.1
   */
  async clearTokenHealth(userId: string, integrationType: IntegrationType): Promise<void> {
    await pool.query(
      `DELETE FROM token_health 
       WHERE user_id = $1 AND integration_type = $2`,
      [userId, integrationType]
    );
  }

  /**
   * Classify a token refresh error as non-recoverable or transient.
   * - HTTP 400 with invalid_grant → non-recoverable
   * - HTTP 401 → non-recoverable
   * - HTTP 5xx → transient
   * - Network errors / timeouts → transient
   *
   * Requirements: 5.1, 5.2, 5.3
   */
  classifyRefreshError(error: unknown): 'non-recoverable' | 'transient' {
    if (error && typeof error === 'object') {
      const err = error as any;

      // Check for HTTP status code (Google API errors often have response.status or code)
      const status = err.response?.status ?? err.code ?? err.status;

      if (status === 401) {
        return 'non-recoverable';
      }

      if (status === 400) {
        // Check for invalid_grant in error body/message
        const message = err.response?.data?.error ?? err.message ?? '';
        if (typeof message === 'string' && message.includes('invalid_grant')) {
          return 'non-recoverable';
        }
        // 400 without invalid_grant could be transient (malformed request edge case)
        return 'non-recoverable';
      }

      // HTTP 5xx errors are transient
      if (typeof status === 'number' && status >= 500 && status < 600) {
        return 'transient';
      }

      // Network errors (ECONNREFUSED, ETIMEDOUT, ENOTFOUND, etc.)
      const errorCode = err.code;
      if (typeof errorCode === 'string') {
        const networkCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH', 'ECONNRESET', 'EPIPE', 'EAI_AGAIN'];
        if (networkCodes.includes(errorCode)) {
          return 'transient';
        }
      }

      // Check message for network/timeout indicators
      const errorMessage = err.message ?? '';
      if (typeof errorMessage === 'string') {
        const transientPatterns = ['timeout', 'network', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'socket hang up'];
        if (transientPatterns.some(p => errorMessage.toLowerCase().includes(p.toLowerCase()))) {
          return 'transient';
        }
        // invalid_grant in message
        if (errorMessage.includes('invalid_grant')) {
          return 'non-recoverable';
        }
      }
    }

    // Default: treat unknown errors as non-recoverable to be safe
    return 'non-recoverable';
  }
}

// Export singleton instance
export const tokenHealthMonitor = TokenHealthMonitor.getInstance();
