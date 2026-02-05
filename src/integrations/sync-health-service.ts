/**
 * Sync Health Service
 * 
 * Aggregates sync health metrics across all users for admin dashboard.
 * Queries token_health, circuit_breaker_state, sync_metrics, and sync_schedule tables.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.8
 */

import pool from '../db/connection';

export interface SyncHealthMetrics {
  totalUsers: number;
  activeIntegrations: {
    contacts: number;
    calendar: number;
  };
  invalidTokens: {
    contacts: number;
    calendar: number;
  };
  openCircuitBreakers: {
    contacts: number;
    calendar: number;
  };
  syncSuccessRate24h: {
    contacts: number;  // percentage
    calendar: number;  // percentage
  };
  apiCallsSaved: {
    byCircuitBreaker: number;
    byAdaptiveScheduling: number;
    byWebhooks: number;
    total: number;
  };
  persistentFailures: Array<{
    userId: string;
    email: string;
    integrationType: string;
    lastSuccessfulSync: Date | null;
    failureCount: number;
    lastError: string;
  }>;
}

export interface UserSyncStatus {
  tokenHealth: {
    status: string;
    lastChecked: Date;
    expiryDate: Date | null;
    errorMessage: string | null;
  } | null;
  circuitBreakerState: {
    state: string;
    failureCount: number;
    lastFailureAt: Date | null;
    nextRetryAt: Date | null;
  } | null;
  syncSchedule: {
    currentFrequency: number;
    lastSyncAt: Date | null;
    nextSyncAt: Date;
    consecutiveNoChanges: number;
  } | null;
  lastSync: Date | null;
  lastSyncResult: 'success' | 'failure' | null;
  webhookActive: boolean;  // calendar only
}

export class SyncHealthService {
  /**
   * Get comprehensive sync health metrics
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   */
  async getHealthMetrics(
    integrationType?: 'google_contacts' | 'google_calendar'
  ): Promise<SyncHealthMetrics> {
    const integrationFilter = integrationType
      ? `AND integration_type = '${integrationType}'`
      : '';

    // Get total users with active integrations
    const totalUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM oauth_tokens
      WHERE provider IN ('google_contacts', 'google_calendar')
      ${integrationFilter.replace('integration_type', 'provider')}
    `;
    const totalUsersResult = await pool.query(totalUsersQuery);
    const totalUsers = parseInt(totalUsersResult.rows[0]?.count || '0');

    // Get active integrations count by type
    const activeIntegrationsQuery = `
      SELECT 
        provider as integration_type,
        COUNT(DISTINCT user_id) as count
      FROM oauth_tokens
      WHERE provider IN ('google_contacts', 'google_calendar')
      ${integrationFilter.replace('integration_type', 'provider')}
      GROUP BY provider
    `;
    const activeIntegrationsResult = await pool.query(activeIntegrationsQuery);
    const activeIntegrations = {
      contacts: 0,
      calendar: 0,
    };
    activeIntegrationsResult.rows.forEach((row) => {
      if (row.integration_type === 'google_contacts') {
        activeIntegrations.contacts = parseInt(row.count);
      } else if (row.integration_type === 'google_calendar') {
        activeIntegrations.calendar = parseInt(row.count);
      }
    });

    // Get invalid tokens count by type
    const invalidTokensQuery = `
      SELECT 
        integration_type,
        COUNT(*) as count
      FROM token_health
      WHERE status IN ('expired', 'revoked')
      ${integrationFilter}
      GROUP BY integration_type
    `;
    const invalidTokensResult = await pool.query(invalidTokensQuery);
    const invalidTokens = {
      contacts: 0,
      calendar: 0,
    };
    invalidTokensResult.rows.forEach((row) => {
      if (row.integration_type === 'google_contacts') {
        invalidTokens.contacts = parseInt(row.count);
      } else if (row.integration_type === 'google_calendar') {
        invalidTokens.calendar = parseInt(row.count);
      }
    });

    // Get open circuit breakers count by type
    const openCircuitBreakersQuery = `
      SELECT 
        integration_type,
        COUNT(*) as count
      FROM circuit_breaker_state
      WHERE state = 'open'
      ${integrationFilter}
      GROUP BY integration_type
    `;
    const openCircuitBreakersResult = await pool.query(openCircuitBreakersQuery);
    const openCircuitBreakers = {
      contacts: 0,
      calendar: 0,
    };
    openCircuitBreakersResult.rows.forEach((row) => {
      if (row.integration_type === 'google_contacts') {
        openCircuitBreakers.contacts = parseInt(row.count);
      } else if (row.integration_type === 'google_calendar') {
        openCircuitBreakers.calendar = parseInt(row.count);
      }
    });

    // Calculate sync success rate over last 24 hours
    const syncSuccessRateQuery = `
      SELECT 
        integration_type,
        COUNT(*) FILTER (WHERE result = 'success') as success_count,
        COUNT(*) as total_count
      FROM sync_metrics
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ${integrationFilter}
      GROUP BY integration_type
    `;
    const syncSuccessRateResult = await pool.query(syncSuccessRateQuery);
    const syncSuccessRate24h = {
      contacts: 0,
      calendar: 0,
    };
    syncSuccessRateResult.rows.forEach((row) => {
      const successRate = row.total_count > 0
        ? (parseInt(row.success_count) / parseInt(row.total_count)) * 100
        : 0;
      
      if (row.integration_type === 'google_contacts') {
        syncSuccessRate24h.contacts = Math.round(successRate * 100) / 100;
      } else if (row.integration_type === 'google_calendar') {
        syncSuccessRate24h.calendar = Math.round(successRate * 100) / 100;
      }
    });

    // Calculate API calls saved
    const apiCallsSavedQuery = `
      SELECT 
        SUM(api_calls_saved) FILTER (WHERE skip_reason = 'circuit_breaker_open') as circuit_breaker_saved,
        SUM(api_calls_saved) FILTER (WHERE skip_reason = 'adaptive_scheduling') as adaptive_saved,
        SUM(api_calls_saved) FILTER (WHERE sync_type = 'webhook_triggered') as webhook_saved,
        SUM(api_calls_saved) as total_saved
      FROM sync_metrics
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ${integrationFilter}
    `;
    const apiCallsSavedResult = await pool.query(apiCallsSavedQuery);
    const apiCallsSaved = {
      byCircuitBreaker: parseInt(apiCallsSavedResult.rows[0]?.circuit_breaker_saved || '0'),
      byAdaptiveScheduling: parseInt(apiCallsSavedResult.rows[0]?.adaptive_saved || '0'),
      byWebhooks: parseInt(apiCallsSavedResult.rows[0]?.webhook_saved || '0'),
      total: parseInt(apiCallsSavedResult.rows[0]?.total_saved || '0'),
    };

    // Get persistent failures (>7 days)
    const persistentFailuresQuery = `
      SELECT 
        u.id as user_id,
        u.email,
        ss.integration_type,
        ss.last_sync_at as last_successful_sync,
        cbs.failure_count,
        cbs.last_failure_reason as last_error
      FROM users u
      INNER JOIN sync_schedule ss ON u.id = ss.user_id
      LEFT JOIN circuit_breaker_state cbs ON u.id = cbs.user_id AND ss.integration_type = cbs.integration_type
      WHERE (
        ss.last_sync_at IS NULL 
        OR ss.last_sync_at < NOW() - INTERVAL '7 days'
      )
      ${integrationFilter.replace('AND', 'AND ss.')}
      ORDER BY ss.last_sync_at ASC NULLS FIRST
      LIMIT 100
    `;
    const persistentFailuresResult = await pool.query(persistentFailuresQuery);
    const persistentFailures = persistentFailuresResult.rows.map((row) => ({
      userId: row.user_id,
      email: row.email,
      integrationType: row.integration_type,
      lastSuccessfulSync: row.last_successful_sync,
      failureCount: parseInt(row.failure_count || '0'),
      lastError: row.last_error || 'Unknown error',
    }));

    return {
      totalUsers,
      activeIntegrations,
      invalidTokens,
      openCircuitBreakers,
      syncSuccessRate24h,
      apiCallsSaved,
      persistentFailures,
    };
  }

  /**
   * Get detailed user sync status
   * Requirements: 10.1, 10.2, 10.3
   */
  async getUserSyncStatus(userId: string): Promise<{
    contacts: UserSyncStatus;
    calendar: UserSyncStatus;
  }> {
    const contactsStatus = await this.getUserSyncStatusForIntegration(
      userId,
      'google_contacts'
    );
    const calendarStatus = await this.getUserSyncStatusForIntegration(
      userId,
      'google_calendar'
    );

    return {
      contacts: contactsStatus,
      calendar: calendarStatus,
    };
  }

  /**
   * Get sync status for a specific integration
   */
  private async getUserSyncStatusForIntegration(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<UserSyncStatus> {
    // Get token health
    const tokenHealthQuery = `
      SELECT status, last_checked, expiry_date, error_message
      FROM token_health
      WHERE user_id = $1 AND integration_type = $2
    `;
    const tokenHealthResult = await pool.query(tokenHealthQuery, [userId, integrationType]);
    const tokenHealth = tokenHealthResult.rows[0]
      ? {
          status: tokenHealthResult.rows[0].status,
          lastChecked: tokenHealthResult.rows[0].last_checked,
          expiryDate: tokenHealthResult.rows[0].expiry_date,
          errorMessage: tokenHealthResult.rows[0].error_message,
        }
      : null;

    // Get circuit breaker state
    const circuitBreakerQuery = `
      SELECT state, failure_count, last_failure_at, next_retry_at
      FROM circuit_breaker_state
      WHERE user_id = $1 AND integration_type = $2
    `;
    const circuitBreakerResult = await pool.query(circuitBreakerQuery, [userId, integrationType]);
    const circuitBreakerState = circuitBreakerResult.rows[0]
      ? {
          state: circuitBreakerResult.rows[0].state,
          failureCount: parseInt(circuitBreakerResult.rows[0].failure_count),
          lastFailureAt: circuitBreakerResult.rows[0].last_failure_at,
          nextRetryAt: circuitBreakerResult.rows[0].next_retry_at,
        }
      : null;

    // Get sync schedule
    const syncScheduleQuery = `
      SELECT current_frequency_ms, last_sync_at, next_sync_at, consecutive_no_changes
      FROM sync_schedule
      WHERE user_id = $1 AND integration_type = $2
    `;
    const syncScheduleResult = await pool.query(syncScheduleQuery, [userId, integrationType]);
    const syncSchedule = syncScheduleResult.rows[0]
      ? {
          currentFrequency: parseInt(syncScheduleResult.rows[0].current_frequency_ms),
          lastSyncAt: syncScheduleResult.rows[0].last_sync_at,
          nextSyncAt: syncScheduleResult.rows[0].next_sync_at,
          consecutiveNoChanges: parseInt(syncScheduleResult.rows[0].consecutive_no_changes),
        }
      : null;

    // Get last sync result
    const lastSyncQuery = `
      SELECT created_at, result
      FROM sync_metrics
      WHERE user_id = $1 AND integration_type = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const lastSyncResult = await pool.query(lastSyncQuery, [userId, integrationType]);
    const lastSync = lastSyncResult.rows[0]?.created_at || null;
    const lastSyncResultValue = lastSyncResult.rows[0]?.result || null;

    // Check webhook status (calendar only)
    let webhookActive = false;
    if (integrationType === 'google_calendar') {
      const webhookQuery = `
        SELECT id
        FROM calendar_webhook_subscriptions
        WHERE user_id = $1 AND expiration > NOW()
      `;
      const webhookResult = await pool.query(webhookQuery, [userId]);
      webhookActive = webhookResult.rows.length > 0;
    }

    return {
      tokenHealth,
      circuitBreakerState,
      syncSchedule,
      lastSync,
      lastSyncResult: lastSyncResultValue,
      webhookActive,
    };
  }
}
