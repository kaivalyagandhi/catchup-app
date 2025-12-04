/**
 * Google Contacts OAuth Routes
 * Handles OAuth flow for Google Contacts integration
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { googleContactsOAuthService } from '../../integrations/google-contacts-oauth-service';
import { googleContactsSyncQueue } from '../../jobs/queue';
import { GoogleContactsSyncJobData } from '../../jobs/types';
import { scheduleUserGoogleContactsSync, removeUserGoogleContactsSync } from '../../jobs/scheduler';

const router = Router();

/**
 * GET /api/contacts/oauth/authorize
 * Get authorization URL to redirect user to Google OAuth consent screen
 */
router.get('/authorize', (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Encode userId as state parameter
    const state = Buffer.from(userId).toString('base64');
    const authUrl = googleContactsOAuthService.getAuthorizationUrl(state);
    res.json({ authUrl });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error generating authorization URL:', errorMsg);
    res.status(500).json({
      error: 'Failed to generate authorization URL',
      details: errorMsg,
    });
  }
});

/**
 * GET /api/contacts/oauth/callback
 * Handle OAuth callback from Google
 * Note: This endpoint does NOT require authentication since it's called by Google redirect
 * Instead, we use state parameter to identify the user
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      res.redirect('/?contacts_error=missing_code');
      return;
    }

    if (!state || typeof state !== 'string') {
      res.redirect('/?contacts_error=missing_state');
      return;
    }

    // Decode state to get userId
    let userId: string;
    try {
      userId = Buffer.from(state, 'base64').toString('utf-8');
    } catch (error) {
      console.error('Failed to decode state:', error);
      res.redirect('/?contacts_error=invalid_state');
      return;
    }

    console.log('Exchanging authorization code for tokens...');

    // Exchange code for tokens and store them
    let tokens;
    try {
      tokens = await googleContactsOAuthService.handleCallback(code, userId);
    } catch (tokenError) {
      const tokenErrorMsg = tokenError instanceof Error ? tokenError.message : String(tokenError);
      console.error('Failed to exchange code for tokens:', tokenErrorMsg);
      res.redirect(`/?contacts_error=${encodeURIComponent(tokenErrorMsg)}`);
      return;
    }

    console.log('Google Contacts connection successful for user:', userId);

    // Reset sync state to force full sync (important for reconnection)
    try {
      const { resetSyncState } = await import('../../integrations/sync-state-repository');
      await resetSyncState(userId);
      console.log(`Sync state reset for user ${userId}`);
    } catch (resetError) {
      // Log error but don't fail the OAuth flow
      const resetErrorMsg = resetError instanceof Error ? resetError.message : String(resetError);
      console.error('Failed to reset sync state:', resetErrorMsg);
    }

    // Queue immediate full sync job
    try {
      const jobData: GoogleContactsSyncJobData = {
        userId: userId,
        syncType: 'full',
      };

      const job = await googleContactsSyncQueue.add(jobData, {
        jobId: `google-contacts-sync-${userId}-${Date.now()}`,
      });

      console.log(`Full sync job queued for user ${userId}, job ID: ${job.id}`);
    } catch (queueError) {
      // Log error but don't fail the OAuth flow
      const queueErrorMsg = queueError instanceof Error ? queueError.message : String(queueError);
      console.error('Failed to queue sync job:', queueErrorMsg);
    }

    // Schedule daily incremental sync
    try {
      await scheduleUserGoogleContactsSync(userId);
      console.log(`Daily sync scheduled for user ${userId}`);
    } catch (scheduleError) {
      // Log error but don't fail the OAuth flow
      const scheduleErrorMsg =
        scheduleError instanceof Error ? scheduleError.message : String(scheduleError);
      console.error('Failed to schedule daily sync:', scheduleErrorMsg);
    }

    // Redirect to frontend with success
    res.redirect('/?contacts_success=true');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Unexpected error in OAuth callback:', errorMsg);
    console.error('Stack:', errorStack);
    res.redirect(`/?contacts_error=${encodeURIComponent(errorMsg)}`);
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
      (job) => job.id === `google-contacts-sync-${req.userId}`
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
      details: errorMsg,
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
      const scheduleErrorMsg =
        scheduleError instanceof Error ? scheduleError.message : String(scheduleError);
      console.error('Failed to remove scheduled sync:', scheduleErrorMsg);
    }

    console.log('Google Contacts disconnected successfully for user:', req.userId);

    res.json({ message: 'Google Contacts disconnected successfully' });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error disconnecting Google Contacts:', errorMsg);
    res.status(500).json({
      error: 'Failed to disconnect Google Contacts',
      details: errorMsg,
    });
  }
});

export default router;
