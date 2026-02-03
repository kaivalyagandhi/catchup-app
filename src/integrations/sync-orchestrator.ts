/**
 * Sync Orchestrator
 *
 * Coordinates all sync optimization components (TokenHealthMonitor, CircuitBreakerManager,
 * AdaptiveSyncScheduler) to intelligently manage Google API synchronization.
 *
 * This orchestration layer wraps existing sync services and adds:
 * - Token health validation before sync
 * - Circuit breaker pattern to prevent repeated failures
 * - Adaptive scheduling based on change detection
 * - Comprehensive metrics recording
 *
 * Requirements: 1.1, 1.4, 2.2, 5.1, 5.2, 10.5
 */

import { TokenHealthMonitor } from './token-health-monitor';
import { CircuitBreakerManager } from './circuit-breaker-manager';
import { AdaptiveSyncScheduler } from './adaptive-sync-scheduler';
import { GoogleContactsSyncService } from './google-contacts-sync-service';
import { forceRefreshCalendarEvents } from '../calendar/calendar-service';
import pool from '../db/connection';

/**
 * Sync job execution result
 */
export interface SyncJobResult {
  success: boolean;
  syncType: 'full' | 'incremental' | 'webhook_triggered' | 'manual';
  result: 'success' | 'failure' | 'skipped';
  skipReason?: 'circuit_breaker_open' | 'invalid_token' | 'token_expiring';
  duration?: number;
  itemsProcessed?: number;
  apiCallsMade?: number;
  apiCallsSaved?: number;
  errorMessage?: string;
  changesDetected?: boolean;
}

/**
 * Sync job configuration
 */
export interface SyncJobConfig {
  userId: string;
  integrationType: 'google_contacts' | 'google_calendar';
  syncType: 'full' | 'incremental' | 'webhook_triggered' | 'manual';
  accessToken: string;
  refreshToken?: string;
  bypassCircuitBreaker?: boolean; // For manual syncs
}

/**
 * Sync Orchestrator
 *
 * Coordinates token health, circuit breaker, and adaptive scheduling
 * to optimize Google API sync operations.
 */
export class SyncOrchestrator {
  private tokenHealthMonitor: TokenHealthMonitor;
  private circuitBreakerManager: CircuitBreakerManager;
  private adaptiveSyncScheduler: AdaptiveSyncScheduler;
  private contactsSyncService: GoogleContactsSyncService;

  constructor(
    tokenHealthMonitor?: TokenHealthMonitor,
    circuitBreakerManager?: CircuitBreakerManager,
    adaptiveSyncScheduler?: AdaptiveSyncScheduler,
    contactsSyncService?: GoogleContactsSyncService
  ) {
    this.tokenHealthMonitor = tokenHealthMonitor || TokenHealthMonitor.getInstance();
    this.circuitBreakerManager = circuitBreakerManager || CircuitBreakerManager.getInstance();
    this.adaptiveSyncScheduler = adaptiveSyncScheduler || AdaptiveSyncScheduler.getInstance();
    this.contactsSyncService = contactsSyncService || new GoogleContactsSyncService();
  }

  /**
   * Execute a sync job with full orchestration
   *
   * Checks all conditions before executing sync:
   * 1. Token health validation
   * 2. Circuit breaker state check
   * 3. Execute sync if allowed
   * 4. Update all components based on result
   * 5. Record comprehensive metrics
   *
   * Requirements: 1.1, 1.4, 2.2, 5.1, 5.2
   */
  async executeSyncJob(config: SyncJobConfig): Promise<SyncJobResult> {
    const { userId, integrationType, syncType, accessToken, refreshToken, bypassCircuitBreaker } =
      config;

    const startTime = Date.now();
    let apiCallsSaved = 0;

    console.log(
      `[SyncOrchestrator] Starting ${syncType} sync for user ${userId}, integration ${integrationType}`
    );

    try {
      // Step 1: Check token health
      // Requirements: 1.1, 1.4 - Validate token before API calls
      const tokenHealth = await this.tokenHealthMonitor.checkTokenHealth(userId, integrationType);

      if (tokenHealth.status === 'expired' || tokenHealth.status === 'revoked') {
        console.log(
          `[SyncOrchestrator] Token is ${tokenHealth.status}, skipping sync for user ${userId}`
        );

        // Record skipped sync
        await this.recordSyncMetrics({
          userId,
          integrationType,
          syncType,
          result: 'skipped',
          skipReason: 'invalid_token',
          duration: Date.now() - startTime,
          apiCallsSaved: 1, // Saved one API call by not attempting sync
        });

        return {
          success: false,
          syncType,
          result: 'skipped',
          skipReason: 'invalid_token',
          duration: Date.now() - startTime,
          apiCallsSaved: 1,
        };
      }

      if (tokenHealth.status === 'expiring_soon') {
        console.log(
          `[SyncOrchestrator] Token expiring soon for user ${userId}, attempting proactive refresh`
        );
        // Note: Token refresh is handled by TokenHealthMonitor.refreshExpiringTokens() cron job
        // We log this but continue with sync
      }

      // Step 2: Check circuit breaker state
      // Requirements: 2.2 - Circuit breaker blocks execution when open
      if (!bypassCircuitBreaker) {
        const canExecute = await this.circuitBreakerManager.canExecuteSync(
          userId,
          integrationType
        );

        if (!canExecute) {
          const state = await this.circuitBreakerManager.getState(userId, integrationType);
          console.log(
            `[SyncOrchestrator] Circuit breaker is ${state?.state || 'unknown'}, skipping sync for user ${userId}`
          );

          // Record skipped sync
          await this.recordSyncMetrics({
            userId,
            integrationType,
            syncType,
            result: 'skipped',
            skipReason: 'circuit_breaker_open',
            duration: Date.now() - startTime,
            apiCallsSaved: 1, // Saved one API call by not attempting sync
          });

          return {
            success: false,
            syncType,
            result: 'skipped',
            skipReason: 'circuit_breaker_open',
            duration: Date.now() - startTime,
            apiCallsSaved: 1,
          };
        }
      } else {
        console.log(`[SyncOrchestrator] Bypassing circuit breaker for manual sync`);
      }

      // Step 3: Execute sync
      let syncResult: SyncJobResult;

      if (integrationType === 'google_contacts') {
        syncResult = await this.executeContactsSync(
          userId,
          syncType,
          accessToken,
          refreshToken,
          startTime
        );
      } else {
        syncResult = await this.executeCalendarSync(
          userId,
          syncType,
          accessToken,
          refreshToken,
          startTime
        );
      }

      // Step 4: Update components based on result
      if (syncResult.success) {
        // Record success in circuit breaker
        await this.circuitBreakerManager.recordSuccess(userId, integrationType);

        // Update adaptive scheduler (only for scheduled syncs, not manual)
        if (syncType !== 'manual') {
          const changesDetected = syncResult.changesDetected || false;
          await this.adaptiveSyncScheduler.calculateNextSync(
            userId,
            integrationType,
            changesDetected
          );
        }
      } else {
        // Record failure in circuit breaker
        const error = new Error(syncResult.errorMessage || 'Sync failed');
        await this.circuitBreakerManager.recordFailure(userId, integrationType, error);

        // Mark token as invalid if auth error
        if (syncResult.errorMessage?.includes('401') || syncResult.errorMessage?.includes('unauthorized')) {
          await this.tokenHealthMonitor.markTokenInvalid(
            userId,
            integrationType,
            syncResult.errorMessage
          );
        }
      }

      // Step 5: Record metrics
      await this.recordSyncMetrics({
        userId,
        integrationType,
        syncType,
        result: syncResult.result,
        duration: syncResult.duration,
        itemsProcessed: syncResult.itemsProcessed,
        apiCallsMade: syncResult.apiCallsMade || 1,
        apiCallsSaved: syncResult.apiCallsSaved || 0,
        errorMessage: syncResult.errorMessage,
      });

      return syncResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[SyncOrchestrator] Sync failed for user ${userId}: ${errorMessage}`);

      // Record failure in circuit breaker
      await this.circuitBreakerManager.recordFailure(
        userId,
        integrationType,
        error instanceof Error ? error : new Error(errorMessage)
      );

      // Record failed sync metrics
      await this.recordSyncMetrics({
        userId,
        integrationType,
        syncType,
        result: 'failure',
        duration: Date.now() - startTime,
        errorMessage,
      });

      return {
        success: false,
        syncType,
        result: 'failure',
        duration: Date.now() - startTime,
        errorMessage,
      };
    }
  }

  /**
   * Execute contacts sync
   */
  private async executeContactsSync(
    userId: string,
    syncType: 'full' | 'incremental' | 'webhook_triggered' | 'manual',
    accessToken: string,
    refreshToken: string | undefined,
    startTime: number
  ): Promise<SyncJobResult> {
    try {
      let result;

      if (syncType === 'full') {
        result = await this.contactsSyncService.performFullSync(userId, accessToken);
      } else {
        result = await this.contactsSyncService.performIncrementalSync(userId, accessToken);
      }

      // Determine if changes were detected
      const changesDetected =
        (result.contactsImported || 0) > 0 ||
        (result.contactsUpdated || 0) > 0 ||
        (result.contactsDeleted || 0) > 0;

      const itemsProcessed =
        (result.contactsImported || 0) +
        (result.contactsUpdated || 0) +
        (result.contactsDeleted || 0);

      return {
        success: true,
        syncType,
        result: 'success',
        duration: result.duration || Date.now() - startTime,
        itemsProcessed,
        apiCallsMade: 1, // At least one API call was made
        changesDetected,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        syncType,
        result: 'failure',
        duration: Date.now() - startTime,
        errorMessage,
      };
    }
  }

  /**
   * Execute calendar sync
   */
  private async executeCalendarSync(
    userId: string,
    syncType: 'full' | 'incremental' | 'webhook_triggered' | 'manual',
    accessToken: string,
    refreshToken: string | undefined,
    startTime: number
  ): Promise<SyncJobResult> {
    try {
      const result = await forceRefreshCalendarEvents(userId, accessToken, refreshToken);

      // Calendar sync always detects changes if events are returned
      const changesDetected = result.eventCount > 0;

      return {
        success: result.success,
        syncType,
        result: 'success',
        duration: Date.now() - startTime,
        itemsProcessed: result.eventCount,
        apiCallsMade: 1, // At least one API call was made
        changesDetected,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        syncType,
        result: 'failure',
        duration: Date.now() - startTime,
        errorMessage,
      };
    }
  }

  /**
   * Record sync metrics to database
   *
   * Requirements: 10.5 - Track sync results, duration, API calls saved
   */
  private async recordSyncMetrics(metrics: {
    userId: string;
    integrationType: 'google_contacts' | 'google_calendar';
    syncType: 'full' | 'incremental' | 'webhook_triggered' | 'manual';
    result: 'success' | 'failure' | 'skipped';
    skipReason?: 'circuit_breaker_open' | 'invalid_token' | 'token_expiring';
    duration?: number;
    itemsProcessed?: number;
    apiCallsMade?: number;
    apiCallsSaved?: number;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO sync_metrics (
          user_id, integration_type, sync_type, result, skip_reason,
          duration_ms, items_processed, api_calls_made, api_calls_saved, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          metrics.userId,
          metrics.integrationType,
          metrics.syncType,
          metrics.result,
          metrics.skipReason || null,
          metrics.duration || null,
          metrics.itemsProcessed || null,
          metrics.apiCallsMade || null,
          metrics.apiCallsSaved || null,
          metrics.errorMessage || null,
        ]
      );

      console.log(
        `[SyncOrchestrator] Recorded metrics: ${metrics.result} for user ${metrics.userId}, ` +
          `integration ${metrics.integrationType}, saved ${metrics.apiCallsSaved || 0} API calls`
      );
    } catch (error) {
      console.error('[SyncOrchestrator] Failed to record sync metrics:', error);
      // Don't throw - metrics recording failure shouldn't break sync
    }
  }
}

// Export singleton instance
export const syncOrchestrator = new SyncOrchestrator();
