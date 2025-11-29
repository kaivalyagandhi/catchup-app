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

    // Populate result
    result.contactsImported = syncResult.contactsImported;
    result.contactsUpdated = syncResult.contactsUpdated;
    result.contactsDeleted = syncResult.contactsDeleted;
    result.groupsImported = syncResult.groupsImported;
    result.duration = syncResult.duration;
    result.errors = syncResult.errors.map(e => e.errorMessage);

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
