/**
 * Google Contacts Sync Job Processor
 *
 * Processes background sync jobs for Google Contacts integration.
 * Handles both full and incremental synchronization.
 *
 * Now integrated with SyncOrchestrator for optimization features:
 * - Token health validation before sync
 * - Circuit breaker pattern to prevent repeated failures
 * - Adaptive scheduling based on change detection
 * - Comprehensive metrics recording
 *
 * Requirements: 3.7, 4.5, 10.5
 */

import { Job } from '../job-types';
import { GoogleContactsSyncJobData, GoogleContactsSyncResult } from '../types';
import { googleContactsOAuthService } from '../../integrations/google-contacts-oauth-service';
import { groupSyncService } from '../../integrations/group-sync-service';
import { syncOrchestrator } from '../../integrations/sync-orchestrator';

/**
 * Process Google Contacts sync job
 *
 * Executes sync operation through SyncOrchestrator which handles:
 * - Token health validation
 * - Circuit breaker checks
 * - Adaptive scheduling
 * - Metrics recording
 *
 * Requirements: 1.1, 1.4, 2.2, 5.1, 5.2, 10.5
 */
export async function processGoogleContactsSync(
  job: Job<GoogleContactsSyncJobData>
): Promise<GoogleContactsSyncResult> {
  const { userId, syncType } = job.data;

  console.log(`Processing ${syncType} sync for user ${userId}, job ID: ${job.id}`);

  const result: GoogleContactsSyncResult = {
    userId,
    syncType,
    duration: 0,
    errors: [],
  };

  try {
    // Check if user has connected Google Contacts
    const isConnected = await googleContactsOAuthService.isConnected(userId);
    if (!isConnected) {
      const errorMessage = `Google Contacts not connected for user ${userId}`;
      console.error(errorMessage);
      result.errors.push(errorMessage);
      throw new Error(errorMessage);
    }

    // Get access token and refresh token
    let accessToken: string;
    let refreshToken: string | undefined;
    try {
      accessToken = await googleContactsOAuthService.getAccessToken(userId);
      refreshToken = await googleContactsOAuthService.getRefreshToken(userId);
    } catch (error) {
      const errorMessage = `Failed to get access token for user ${userId}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.error(errorMessage);
      result.errors.push(errorMessage);
      throw error;
    }

    // Execute sync through orchestrator
    // This adds token health checks, circuit breaker, adaptive scheduling, and metrics
    console.log(`Executing ${syncType} sync through orchestrator for user ${userId}`);
    const orchestratorResult = await syncOrchestrator.executeSyncJob({
      userId,
      integrationType: 'google_contacts',
      syncType: syncType === 'full' ? 'full' : 'incremental',
      accessToken,
      refreshToken,
      bypassCircuitBreaker: false, // Respect circuit breaker for scheduled syncs
    });

    // Check if sync was skipped
    if (orchestratorResult.result === 'skipped') {
      console.log(
        `Sync skipped for user ${userId}: ${orchestratorResult.skipReason || 'unknown reason'}`
      );
      result.errors.push(`Sync skipped: ${orchestratorResult.skipReason || 'unknown reason'}`);
      result.duration = orchestratorResult.duration || 0;
      return result;
    }

    // Check if sync failed
    if (!orchestratorResult.success) {
      const errorMessage = orchestratorResult.errorMessage || 'Sync failed';
      console.error(`Sync failed for user ${userId}: ${errorMessage}`);
      result.errors.push(errorMessage);
      result.duration = orchestratorResult.duration || 0;
      throw new Error(errorMessage);
    }

    // Sync contact groups and generate mapping suggestions
    // This runs after successful contact sync
    console.log(`Syncing contact groups for user ${userId}`);
    let groupsImported = 0;
    try {
      const groupSyncResult = await groupSyncService.syncContactGroups(userId, accessToken);
      groupsImported = groupSyncResult.groupsImported + groupSyncResult.groupsUpdated;
      console.log(
        `Group sync completed - imported: ${groupSyncResult.groupsImported}, ` +
          `updated: ${groupSyncResult.groupsUpdated}, ` +
          `suggestions: ${groupSyncResult.suggestionsGenerated}`
      );
    } catch (groupError) {
      const groupErrorMsg = groupError instanceof Error ? groupError.message : String(groupError);
      console.error(`Group sync failed: ${groupErrorMsg}`);
      result.errors.push(`Group sync error: ${groupErrorMsg}`);
      // Don't fail the entire sync if group sync fails
    }

    // Populate result from orchestrator
    result.contactsImported = orchestratorResult.itemsProcessed || 0;
    result.contactsUpdated = 0; // Orchestrator doesn't distinguish imported vs updated
    result.contactsDeleted = 0;
    result.groupsImported = groupsImported;
    result.duration = orchestratorResult.duration || 0;

    console.log(
      `${syncType} sync completed for user ${userId} - ` +
        `items processed: ${result.contactsImported || 0}, ` +
        `groups: ${result.groupsImported || 0}, ` +
        `duration: ${result.duration}ms, ` +
        `errors: ${result.errors.length}, ` +
        `API calls saved: ${orchestratorResult.apiCallsSaved || 0}`
    );

    return result;
  } catch (error) {
    const errorMessage = `${syncType} sync failed for user ${userId}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(errorMessage);

    // Add error to result if not already present
    if (!result.errors.includes(errorMessage)) {
      result.errors.push(errorMessage);
    }

    // Re-throw to mark job as failed
    throw error;
  }
}
