/**
 * Google Contacts OAuth Routes
 * Handles OAuth flow for Google Contacts integration
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { googleContactsOAuthService } from '../../integrations/google-contacts-oauth-service';
import { googleContactsSyncQueue } from '../../jobs/queue';
import { GoogleContactsSyncJobData } from '../../jobs/types';
import { 
  scheduleUserGoogleContactsSync, 
  removeUserGoogleContactsSync 
} from '../../jobs/scheduler';

const router = Router();

/**
 * GET /api/contacts/oauth/authorize
 * Get authorization URL to redirect user to Google OAuth consent screen
 */
router.get('/authorize', (req: Request, res: Response) => {
  try {
    const authUrl = googleContactsOAuthService.getAuthorizationUrl();
    res.json({ authUrl });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error generating authorization URL:', errorMsg);
    res.status(500).json({ 
      error: 'Failed to generate authorization URL', 
      details: errorMsg 
    });
  }
});

/**
 * GET /api/contacts/oauth/callback
 * Handle OAuth callback from Google
 * Note: This endpoint requires the user to be authenticated with a valid JWT token
 */
router.get('/callback', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Authorization code is required' });
      return;
    }

    console.log('Exchanging authorization code for tokens...');
    
    // Exchange code for tokens and store them
    let tokens;
    try {
      tokens = await googleContactsOAuthService.handleCallback(code, req.userId);
    } catch (tokenError) {
      const tokenErrorMsg = tokenError instanceof Error ? tokenError.message : String(tokenError);
      console.error('Failed to exchange code for tokens:', tokenErrorMsg);
      res.status(400).json({ 
        error: 'Failed to exchange authorization code', 
        details: tokenErrorMsg 
      });
      return;
    }

    console.log('Google Contacts connection successful for user:', req.userId);
    
    // Reset sync state to force full sync (important for reconnection)
    try {
      const { resetSyncState } = await import('../../integrations/sync-state-repository');
      await resetSyncState(req.userId);
      console.log(`Sync state reset for user ${req.userId}`);
    } catch (resetError) {
      // Log error but don't fail the OAuth flow
      const resetErrorMsg = resetError instanceof Error ? resetError.message : String(resetError);
      console.error('Failed to reset sync state:', resetErrorMsg);
    }
    
    // Queue immediate full sync job
    try {
      const jobData: GoogleContactsSyncJobData = {
        userId: req.userId,
        syncType: 'full',
      };

      const job = await googleContactsSyncQueue.add(jobData, {
        jobId: `google-contacts-sync-${req.userId}-${Date.now()}`,
      });

      console.log(`Full sync job queued for user ${req.userId}, job ID: ${job.id}`);
    } catch (queueError) {
      // Log error but don't fail the OAuth flow
      const queueErrorMsg = queueError instanceof Error ? queueError.message : String(queueError);
      console.error('Failed to queue sync job:', queueErrorMsg);
    }

    // Schedule daily incremental sync
    try {
      await scheduleUserGoogleContactsSync(req.userId);
      console.log(`Daily sync scheduled for user ${req.userId}`);
    } catch (scheduleError) {
      // Log error but don't fail the OAuth flow
      const scheduleErrorMsg = scheduleError instanceof Error ? scheduleError.message : String(scheduleError);
      console.error('Failed to schedule daily sync:', scheduleErrorMsg);
    }

    res.json({
      message: 'Google Contacts connected successfully',
      expiresAt: tokens.expiresAt,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Unexpected error in OAuth callback:', errorMsg);
    console.error('Stack:', errorStack);
    res.status(500).json({ 
      error: 'Failed to complete OAuth flow', 
      details: errorMsg 
    });
  }
});

/**
 * GET /api/contacts/oauth/status
 * Check if user has connected Google Contacts
 * Returns comprehensive status including sync state and auto-sync status
 */
router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Get OAuth connection status
    const connectionStatus = await googleContactsOAuthService.getConnectionStatus(req.userId);
    
    // If not connected, return basic status
    if (!connectionStatus.connected) {
      res.json({
        connected: false,
        autoSyncEnabled: false,
      });
      return;
    }

    // Get sync state
    const { getSyncState } = await import('../../integrations/sync-state-repository');
    const syncState = await getSyncState(req.userId);

    // Check if auto-sync is enabled by checking for scheduled job
    const repeatableJobs = await googleContactsSyncQueue.getRepeatableJobs();
    const autoSyncEnabled = repeatableJobs.some(
      job => job.id === `google-contacts-sync-${req.userId}`
    );

    // Determine last sync timestamp (prefer incremental, fallback to full)
    const lastSyncAt = syncState?.lastIncrementalSyncAt || syncState?.lastFullSyncAt || null;

    // Build comprehensive status response
    const status = {
      connected: true,
      email: connectionStatus.email,
      expiresAt: connectionStatus.expiresAt,
      lastSyncAt,
      totalContactsSynced: syncState?.totalContactsSynced || 0,
      lastSyncStatus: syncState?.lastSyncStatus || 'pending',
      lastSyncError: syncState?.lastSyncError || null,
      autoSyncEnabled,
    };
    
    console.log('Status check - Google Contacts:', { 
      userId: req.userId,
      connected: status.connected, 
      email: status.email,
      lastSyncAt: status.lastSyncAt,
      totalContactsSynced: status.totalContactsSynced,
      autoSyncEnabled: status.autoSyncEnabled,
    });

    res.json(status);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error checking OAuth status:', errorMsg);
    res.status(500).json({ 
      error: 'Failed to check OAuth status',
      details: errorMsg
    });
  }
});

/**
 * DELETE /api/contacts/oauth/disconnect
 * Disconnect Google Contacts
 */
router.delete('/disconnect', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    console.log('Disconnecting Google Contacts for user:', req.userId);
    
    await googleContactsOAuthService.disconnect(req.userId);
    
    // Stop scheduled sync jobs
    try {
      await removeUserGoogleContactsSync(req.userId);
      console.log('Scheduled sync jobs stopped for user:', req.userId);
    } catch (scheduleError) {
      // Log error but don't fail the disconnect flow
      const scheduleErrorMsg = scheduleError instanceof Error ? scheduleError.message : String(scheduleError);
      console.error('Failed to remove scheduled sync:', scheduleErrorMsg);
    }
    
    console.log('Google Contacts disconnected successfully for user:', req.userId);

    res.json({ message: 'Google Contacts disconnected successfully' });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error disconnecting Google Contacts:', errorMsg);
    res.status(500).json({ 
      error: 'Failed to disconnect Google Contacts', 
      details: errorMsg 
    });
  }
});

export default router;
