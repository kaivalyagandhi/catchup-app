/**
 * Adaptive Sync Processor
 *
 * Runs AdaptiveSyncScheduler.getUsersDueForSync() every 12 hours to check
 * which users need syncing, then executes syncs via SyncOrchestrator.
 *
 * Requirements: 5.1, 5.2
 */

import { Job } from 'bull';
import { AdaptiveSyncScheduler } from '../../integrations/adaptive-sync-scheduler';
import { SyncOrchestrator } from '../../integrations/sync-orchestrator';
import * as oauthRepository from '../../integrations/oauth-repository';

export interface AdaptiveSyncJobData {
  integrationType: 'google_contacts' | 'google_calendar';
}

export interface AdaptiveSyncResult {
  usersProcessed: number;
  syncsTriggered: number;
  syncsSkipped: number;
  errors: string[];
}

/**
 * Process adaptive sync job
 *
 * Gets users due for sync and executes syncs via orchestrator.
 */
export async function processAdaptiveSync(
  job: Job<AdaptiveSyncJobData>
): Promise<AdaptiveSyncResult> {
  const { integrationType } = job.data;
  console.log(`[Adaptive Sync] Starting adaptive sync job ${job.id} for ${integrationType}`);

  const adaptiveScheduler = AdaptiveSyncScheduler.getInstance();
  const syncOrchestrator = new SyncOrchestrator();
  const errors: string[] = [];
  let syncsTriggered = 0;
  let syncsSkipped = 0;

  try {
    // Get users due for sync
    const userIds = await adaptiveScheduler.getUsersDueForSync(integrationType);
    console.log(`[Adaptive Sync] Found ${userIds.length} users due for sync`);

    // Execute sync for each user
    for (const userId of userIds) {
      try {
        // Get user's OAuth tokens
        const tokens = await oauthRepository.getToken(
          userId,
          integrationType === 'google_contacts' ? 'google_contacts' : 'google_calendar'
        );

        if (!tokens) {
          console.log(`[Adaptive Sync] No tokens found for user ${userId}, skipping`);
          syncsSkipped++;
          continue;
        }

        const result = await syncOrchestrator.executeSyncJob({
          userId,
          integrationType,
          syncType: 'incremental',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          bypassCircuitBreaker: false,
        });

        if (result.result === 'success') {
          syncsTriggered++;
        } else {
          syncsSkipped++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Adaptive Sync] Error syncing user ${userId}:`, errorMsg);
        errors.push(`User ${userId}: ${errorMsg}`);
        syncsSkipped++;
      }
    }

    console.log(
      `[Adaptive Sync] Completed: ${syncsTriggered} syncs triggered, ${syncsSkipped} skipped`
    );

    return {
      usersProcessed: userIds.length,
      syncsTriggered,
      syncsSkipped,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Adaptive Sync] Job failed:`, errorMsg);
    errors.push(errorMsg);

    throw error; // Re-throw to mark job as failed
  }
}
