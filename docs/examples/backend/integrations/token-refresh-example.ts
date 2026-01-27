/**
 * Token Refresh Example
 * 
 * Demonstrates automatic token refresh functionality for Google Contacts integration.
 * This example shows both proactive and reactive token refresh scenarios.
 * 
 * Requirements: 10.2, 10.3
 */

import { GoogleContactsOAuthService } from './google-contacts-oauth-service';
import { GoogleContactsSyncService } from './google-contacts-sync-service';
import { GroupSyncService } from './group-sync-service';

/**
 * Example 1: Proactive Token Refresh
 * 
 * The OAuth service automatically refreshes tokens before they expire.
 * This is the preferred approach used by background jobs.
 */
async function exampleProactiveRefresh(userId: string) {
  console.log('=== Proactive Token Refresh Example ===\n');
  
  const oauthService = new GoogleContactsOAuthService();
  
  try {
    // getAccessToken() automatically checks expiration and refreshes if needed
    console.log('Getting access token (will refresh if expired)...');
    const accessToken = await oauthService.getAccessToken(userId);
    
    console.log('✓ Access token obtained successfully');
    console.log(`Token length: ${accessToken.length} characters`);
    console.log('\nToken was automatically refreshed if it was expired or expiring within 5 minutes.\n');
    
    return accessToken;
  } catch (error) {
    console.error('✗ Failed to get access token:', error);
    throw error;
  }
}

/**
 * Example 2: Reactive Token Refresh (Sync Service)
 * 
 * If an API call fails with 401, the sync service automatically:
 * 1. Detects the auth error
 * 2. Refreshes the token
 * 3. Retries the original request
 */
async function exampleReactiveRefreshSync(userId: string) {
  console.log('=== Reactive Token Refresh Example (Sync Service) ===\n');
  
  const syncService = new GoogleContactsSyncService();
  
  try {
    console.log('Attempting incremental sync...');
    console.log('If token is expired, service will:');
    console.log('  1. Detect 401 error');
    console.log('  2. Refresh token automatically');
    console.log('  3. Retry the sync operation\n');
    
    // This will handle token refresh automatically if 401 occurs
    const result = await syncService.performIncrementalSync(userId, 'expired-token-example');
    
    console.log('✓ Sync completed successfully');
    console.log(`Contacts updated: ${result.contactsUpdated || 0}`);
    console.log(`Contacts deleted: ${result.contactsDeleted || 0}`);
    console.log(`Duration: ${result.duration}ms\n`);
    
    return result;
  } catch (error) {
    console.error('✗ Sync failed:', error);
    throw error;
  }
}

/**
 * Example 3: Reactive Token Refresh (Group Sync Service)
 * 
 * Group sync operations also handle token refresh automatically.
 */
async function exampleReactiveRefreshGroups(userId: string) {
  console.log('=== Reactive Token Refresh Example (Group Sync Service) ===\n');
  
  const groupSyncService = new GroupSyncService();
  
  try {
    console.log('Attempting group sync...');
    console.log('If token is expired, service will:');
    console.log('  1. Detect 401 error');
    console.log('  2. Refresh token automatically');
    console.log('  3. Retry the group sync operation\n');
    
    // This will handle token refresh automatically if 401 occurs
    const result = await groupSyncService.syncContactGroups(userId, 'expired-token-example');
    
    console.log('✓ Group sync completed successfully');
    console.log(`Groups imported: ${result.groupsImported}`);
    console.log(`Groups updated: ${result.groupsUpdated}`);
    console.log(`Suggestions generated: ${result.suggestionsGenerated}\n`);
    
    return result;
  } catch (error) {
    console.error('✗ Group sync failed:', error);
    throw error;
  }
}

/**
 * Example 4: Manual Token Refresh
 * 
 * You can also manually refresh tokens if needed.
 */
async function exampleManualRefresh(userId: string) {
  console.log('=== Manual Token Refresh Example ===\n');
  
  const oauthService = new GoogleContactsOAuthService();
  
  try {
    console.log('Manually refreshing access token...');
    const newAccessToken = await oauthService.refreshAccessToken(userId);
    
    console.log('✓ Token refreshed successfully');
    console.log(`New token length: ${newAccessToken.length} characters`);
    console.log('Token has been updated in the database.\n');
    
    return newAccessToken;
  } catch (error) {
    console.error('✗ Token refresh failed:', error);
    console.error('User may need to reconnect their Google Contacts account.\n');
    throw error;
  }
}

/**
 * Example 5: Token Refresh Failure Handling
 * 
 * Shows how the system handles refresh failures.
 */
async function exampleRefreshFailure(userId: string) {
  console.log('=== Token Refresh Failure Example ===\n');
  
  const oauthService = new GoogleContactsOAuthService();
  
  try {
    console.log('Attempting to refresh token...');
    await oauthService.refreshAccessToken(userId);
    
    console.log('✓ Token refreshed successfully\n');
  } catch (error) {
    console.log('✗ Token refresh failed');
    console.log('Error:', error instanceof Error ? error.message : String(error));
    console.log('\nPossible reasons:');
    console.log('  - No refresh token available');
    console.log('  - Refresh token has been revoked');
    console.log('  - User disconnected Google Contacts');
    console.log('  - Network error\n');
    console.log('Action required: User must reconnect Google Contacts account\n');
  }
}

/**
 * Example 6: Connection Status Check
 * 
 * Check if user has connected Google Contacts and token status.
 */
async function exampleConnectionStatus(userId: string) {
  console.log('=== Connection Status Example ===\n');
  
  const oauthService = new GoogleContactsOAuthService();
  
  try {
    const status = await oauthService.getConnectionStatus(userId);
    
    console.log('Connection Status:');
    console.log(`  Connected: ${status.connected}`);
    console.log(`  Email: ${status.email || 'N/A'}`);
    console.log(`  Token expires: ${status.expiresAt || 'N/A'}`);
    
    if (status.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(status.expiresAt);
      const minutesUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));
      
      console.log(`  Minutes until expiry: ${minutesUntilExpiry}`);
      
      if (minutesUntilExpiry < 5) {
        console.log('  ⚠️  Token will be refreshed on next API call');
      } else {
        console.log('  ✓ Token is valid');
      }
    }
    
    console.log();
  } catch (error) {
    console.error('✗ Failed to get connection status:', error);
  }
}

/**
 * Main example runner
 */
async function runExamples() {
  const userId = 'example-user-id';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Google Contacts Token Refresh Examples                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Example 1: Check connection status
    await exampleConnectionStatus(userId);
    
    // Example 2: Proactive refresh (recommended)
    await exampleProactiveRefresh(userId);
    
    // Example 3: Manual refresh
    await exampleManualRefresh(userId);
    
    // Example 4: Reactive refresh in sync service
    // await exampleReactiveRefreshSync(userId);
    
    // Example 5: Reactive refresh in group sync service
    // await exampleReactiveRefreshGroups(userId);
    
    // Example 6: Refresh failure handling
    // await exampleRefreshFailure('non-existent-user');
    
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Export examples for use in other modules
export {
  exampleProactiveRefresh,
  exampleReactiveRefreshSync,
  exampleReactiveRefreshGroups,
  exampleManualRefresh,
  exampleRefreshFailure,
  exampleConnectionStatus,
  runExamples,
};

// Run examples if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}
