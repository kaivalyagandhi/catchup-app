/**
 * Graceful Degradation Service
 *
 * Provides cached data when sync is unavailable due to:
 * - Circuit breaker being open
 * - Invalid/expired tokens
 * - Other sync failures
 *
 * Requirements: 9.2, 9.4
 */

import pool from '../db/connection';
import { CircuitBreakerManager } from './circuit-breaker-manager';
import { TokenHealthMonitor } from './token-health-monitor';

export interface CachedDataResponse<T> {
  data: T;
  cached: boolean;
  lastUpdated: Date | null;
  syncUnavailable: boolean;
  unavailableReason?: 'circuit_breaker_open' | 'invalid_token' | 'sync_error';
}

export class GracefulDegradationService {
  constructor(
    private circuitBreakerManager: CircuitBreakerManager,
    private tokenHealthMonitor: TokenHealthMonitor
  ) {}

  /**
   * Check if sync is available for a user and integration
   * Returns reason if unavailable
   */
  async checkSyncAvailability(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<{
    available: boolean;
    reason?: 'circuit_breaker_open' | 'invalid_token';
  }> {
    try {
      // Check circuit breaker
      const canSync = await this.circuitBreakerManager.canExecuteSync(userId, integrationType);
      if (!canSync) {
        return { available: false, reason: 'circuit_breaker_open' };
      }

      // Check token health
      const tokenHealth = await this.tokenHealthMonitor.getTokenHealth(userId, integrationType);
      if (tokenHealth && ['expired', 'revoked'].includes(tokenHealth.status)) {
        return { available: false, reason: 'invalid_token' };
      }

      return { available: true };
    } catch (error) {
      // If tables don't exist or other errors, assume sync is available
      // This allows the app to work even if sync optimization tables aren't set up
      console.warn(`Error checking sync availability for ${integrationType}:`, error);
      return { available: true };
    }
  }

  /**
   * Get cached contacts with last sync timestamp
   * Requirements: 9.2, 9.4
   */
  async getCachedContacts(userId: string): Promise<CachedDataResponse<any[]>> {
    const availability = await this.checkSyncAvailability(userId, 'google_contacts');

    // Get contacts from database (cached data)
    const result = await pool.query(
      `SELECT 
        c.*,
        COALESCE(
          (SELECT last_incremental_sync_at FROM google_contacts_sync_state WHERE user_id = $1),
          (SELECT last_full_sync_at FROM google_contacts_sync_state WHERE user_id = $1)
        ) as last_synced_at
      FROM contacts c
      WHERE c.user_id = $1 AND c.archived = false
      ORDER BY c.name`,
      [userId]
    );

    const lastSyncedAt = result.rows[0]?.last_synced_at || null;

    return {
      data: result.rows.map((row) => {
        const { last_synced_at, ...contact } = row;
        return contact;
      }),
      cached: !availability.available,
      lastUpdated: lastSyncedAt,
      syncUnavailable: !availability.available,
      unavailableReason: availability.reason,
    };
  }

  /**
   * Get cached calendar events with last sync timestamp
   * Requirements: 9.2, 9.4
   */
  async getCachedCalendarEvents(
    userId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<CachedDataResponse<any[]>> {
    const availability = await this.checkSyncAvailability(userId, 'google_calendar');

    // Build query with optional date filters
    let query = `
      SELECT 
        ce.*,
        (SELECT last_calendar_sync FROM users WHERE id = $1) as last_synced_at
      FROM calendar_events ce
      WHERE ce.user_id = $1
    `;
    const params: any[] = [userId];

    if (startTime) {
      params.push(startTime);
      query += ` AND ce.start_time >= $${params.length}`;
    }

    if (endTime) {
      params.push(endTime);
      query += ` AND ce.end_time <= $${params.length}`;
    }

    query += ` ORDER BY ce.start_time`;

    const result = await pool.query(query, params);

    const lastSyncedAt = result.rows[0]?.last_synced_at || null;

    return {
      data: result.rows.map((row) => {
        const { last_synced_at, ...event } = row;
        return event;
      }),
      cached: !availability.available,
      lastUpdated: lastSyncedAt,
      syncUnavailable: !availability.available,
      unavailableReason: availability.reason,
    };
  }

  /**
   * Get sync status for display in UI
   * Requirements: 9.1, 9.6
   */
  async getSyncStatus(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<{
    available: boolean;
    reason?: string;
    lastSuccessfulSync: Date | null;
    requiresReauth: boolean;
    reauthUrl?: string;
  }> {
    try {
      const availability = await this.checkSyncAvailability(userId, integrationType);

      // Get last successful sync time
      let lastSuccessfulSync: Date | null = null;
      try {
        if (integrationType === 'google_contacts') {
          const result = await pool.query(
            `SELECT COALESCE(last_incremental_sync_at, last_full_sync_at) as last_sync
             FROM google_contacts_sync_state
             WHERE user_id = $1`,
            [userId]
          );
          lastSuccessfulSync = result.rows[0]?.last_sync || null;
        } else {
          // Calendar sync time is stored in users table
          const result = await pool.query(
            `SELECT last_calendar_sync as last_sync
             FROM users
             WHERE id = $1`,
            [userId]
          );
          lastSuccessfulSync = result.rows[0]?.last_sync || null;
        }
      } catch (error) {
        // If sync state tables don't exist, that's okay
        console.warn(`Could not fetch last sync time for ${integrationType}:`, error);
      }

      // Determine if re-auth is required
      const requiresReauth = availability.reason === 'invalid_token';

      // Generate re-auth URL if needed
      let reauthUrl: string | undefined;
      if (requiresReauth) {
        if (integrationType === 'google_contacts') {
          reauthUrl = `/api/contacts/oauth/authorize?userId=${userId}`;
        } else {
          reauthUrl = `/api/calendar/oauth/authorize?userId=${userId}`;
        }
      }

      return {
        available: availability.available,
        reason: availability.reason,
        lastSuccessfulSync,
        requiresReauth,
        reauthUrl,
      };
    } catch (error) {
      // If anything fails, return a safe default
      console.error(`Error getting sync status for ${integrationType}:`, error);
      return {
        available: true,
        lastSuccessfulSync: null,
        requiresReauth: false,
      };
    }
  }

  /**
   * Get comprehensive sync health for both integrations
   * Used by UI to display warning banners
   * Requirements: 9.1, 9.6
   */
  async getComprehensiveSyncHealth(userId: string): Promise<{
    contacts: {
      available: boolean;
      reason?: string;
      lastSuccessfulSync: Date | null;
      requiresReauth: boolean;
      reauthUrl?: string;
    };
    calendar: {
      available: boolean;
      reason?: string;
      lastSuccessfulSync: Date | null;
      requiresReauth: boolean;
      reauthUrl?: string;
    };
  }> {
    const [contactsStatus, calendarStatus] = await Promise.all([
      this.getSyncStatus(userId, 'google_contacts'),
      this.getSyncStatus(userId, 'google_calendar'),
    ]);

    return {
      contacts: contactsStatus,
      calendar: calendarStatus,
    };
  }
}
