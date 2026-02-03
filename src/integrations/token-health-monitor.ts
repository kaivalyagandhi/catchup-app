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
  async checkTokenHealth(
    userId: string,
    integrationType: IntegrationType
  ): Promise<TokenHealth> {
    // First, check if there's an existing token_health record
    // This is important because the token may have been marked as revoked or expired
    // by a previous API call failure
    const existingHealth = await this.getTokenHealth(userId, integrationType);
    
    // If token is already marked as revoked or expired, return that status immediately
    // Don't recalculate based on expiry date
    if (existingHealth && (existingHealth.status === 'revoked' || existingHealth.status === 'expired')) {
      return existingHealth;
    }

    const provider = this.getProviderName(integrationType);
    const token = await getToken(userId, provider);

    if (!token) {
      return await this.updateTokenHealth(userId, integrationType, 'unknown', null, 'No token found');
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
    const result = await pool.query<TokenHealthRow>(
      'SELECT * FROM token_health WHERE user_id = $1 AND integration_type = $2',
      [userId, integrationType]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToTokenHealth(result.rows[0]);
  }

  /**
   * Proactively refresh tokens expiring within 48 hours
   * Runs every 6 hours via cron job
   *
   * Requirements: 8.1, 8.3, 8.4
   */
  async refreshExpiringTokens(): Promise<{
    refreshed: number;
    failed: number;
  }> {
    const fortyEightHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Find all tokens expiring within 48 hours
    const result = await pool.query<TokenHealthRow>(
      `SELECT * FROM token_health 
       WHERE expiry_date IS NOT NULL 
       AND expiry_date < $1 
       AND status IN ('valid', 'expiring_soon')`,
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

        // Update token health to valid
        await this.checkTokenHealth(userId, integrationType);
        refreshed++;

        // Requirement 8.5: Token refresh audit logging
        console.log(`[TokenHealthMonitor] Successfully refreshed token for user ${userId}, integration ${integrationType}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        // Requirement 8.4: Token refresh failure handling
        await this.updateTokenHealth(
          row.user_id,
          row.integration_type as IntegrationType,
          'revoked',
          row.expiry_date,
          `Token refresh failed: ${errorMsg}`
        );
        
        failed++;

        // Requirement 8.5: Token refresh audit logging
        console.error(`[TokenHealthMonitor] Failed to refresh token for user ${row.user_id}, integration ${row.integration_type}: ${errorMsg}`);
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
  async clearTokenHealth(
    userId: string,
    integrationType: IntegrationType
  ): Promise<void> {
    await pool.query(
      `DELETE FROM token_health 
       WHERE user_id = $1 AND integration_type = $2`,
      [userId, integrationType]
    );
  }
}

// Export singleton instance
export const tokenHealthMonitor = TokenHealthMonitor.getInstance();
