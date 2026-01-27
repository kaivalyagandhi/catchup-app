/**
 * Google Contacts Sync Service Usage Example
 * 
 * This file demonstrates how to use the sync service in your application.
 */

import { googleContactsSyncService } from './google-contacts-sync-service';
import { googleContactsOAuthService } from './google-contacts-oauth-service';

/**
 * Example: Perform full sync after OAuth connection
 */
async function performInitialSync(userId: string) {
  try {
    // Get access token
    const accessToken = await googleContactsOAuthService.getAccessToken(userId);
    
    // Perform full sync
    const result = await googleContactsSyncService.performFullSync(userId, accessToken);
    
    console.log('Full sync completed:', {
      contactsImported: result.contactsImported,
      duration: result.duration,
      errors: result.errors.length,
    });
    
    return result;
  } catch (error) {
    console.error('Full sync failed:', error);
    throw error;
  }
}

/**
 * Example: Perform incremental sync
 */
async function performDailySync(userId: string) {
  try {
    // Get access token
    const accessToken = await googleContactsOAuthService.getAccessToken(userId);
    
    // Perform incremental sync
    const result = await googleContactsSyncService.performIncrementalSync(userId, accessToken);
    
    console.log('Incremental sync completed:', {
      contactsUpdated: result.contactsUpdated,
      contactsDeleted: result.contactsDeleted,
      duration: result.duration,
      errors: result.errors.length,
    });
    
    return result;
  } catch (error) {
    console.error('Incremental sync failed:', error);
    throw error;
  }
}

/**
 * Example: Check sync state
 */
async function checkSyncStatus(userId: string) {
  try {
    const syncState = await googleContactsSyncService.getSyncState(userId);
    
    if (!syncState) {
      console.log('No sync state found for user');
      return null;
    }
    
    console.log('Sync state:', {
      lastFullSync: syncState.lastFullSyncAt,
      lastIncrementalSync: syncState.lastIncrementalSyncAt,
      totalContacts: syncState.totalContactsSynced,
      status: syncState.lastSyncStatus,
      error: syncState.lastSyncError,
    });
    
    return syncState;
  } catch (error) {
    console.error('Failed to check sync status:', error);
    throw error;
  }
}

/**
 * Example: OAuth callback handler that triggers full sync
 */
async function handleOAuthCallback(code: string, userId: string) {
  try {
    // Handle OAuth callback
    const tokens = await googleContactsOAuthService.handleCallback(code, userId);
    
    console.log('OAuth connection successful');
    
    // Trigger full sync
    const syncResult = await performInitialSync(userId);
    
    return {
      tokens,
      syncResult,
    };
  } catch (error) {
    console.error('OAuth callback failed:', error);
    throw error;
  }
}

export {
  performInitialSync,
  performDailySync,
  checkSyncStatus,
  handleOAuthCallback,
};
