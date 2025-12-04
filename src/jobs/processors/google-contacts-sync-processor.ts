/**
 * Google Contacts Sync Job Processor
 *
 * Processes background sync jobs for Google Contacts integration.
 * Handles both full and incremental synchronization.
 *
 * Requirements: 3.7, 4.5, 10.5
 */

import Bull from 'bull';
import { GoogleContactsSyncJobData, GoogleContactsSyncResult } from '../types';
import { googleContactsSyncService } from '../../integrations/google-contacts-sync-service';
import { googleContactsOAuthService } from '../../integrations/google-contacts-oauth-service';
import { groupSyncService } from '../../integrations/group-sync-service';

/**
 * Process Google Contacts sync job
 *
 * Executes sync operation and updates sync state on completion/failure.
 * Handles token refresh and error recovery.
 */
export async function processGoogleContactsSync(
  job: Bull.Job<GoogleContactsSyncJobData>
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

    // Get access token
    let accessToken: string;
    try {
      accessToken = await googleContactsOAuthService.getAccessToken(userId);
    } catch (error) {
      const errorMessage = `Failed to get access token for user ${userId}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.error(errorMessage);
      result.errors.push(errorMessage);
      throw error;
    }

    // Execute sync based on type
    const startTime = Date.now();
    let syncResult;

    if (syncType === 'full') {
      console.log(`Executing full sync for user ${userId}`);
      syncResult = await googleContactsSyncService.performFullSync(userId, accessToken);
    } else {
      console.log(`Executing incremental sync for user ${userId}`);
      syncResult = await googleContactsSyncService.performIncrementalSync(userId, accessToken);
    }

    // Sync contact groups and generate mapping suggestions
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

    // Populate result
    result.contactsImported = syncResult.contactsImported;
    result.contactsUpdated = syncResult.contactsUpdated;
    result.contactsDeleted = syncResult.contactsDeleted;
    result.groupsImported = groupsImported;
    result.duration = syncResult.duration;
    result.errors = syncResult.errors.map((e) => e.errorMessage).concat(result.errors);

    console.log(
      `${syncType} sync completed for user ${userId} - ` +
        `imported: ${result.contactsImported || 0}, ` +
        `updated: ${result.contactsUpdated || 0}, ` +
        `deleted: ${result.contactsDeleted || 0}, ` +
        `groups: ${result.groupsImported || 0}, ` +
        `duration: ${result.duration}ms, ` +
        `errors: ${result.errors.length}`
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
