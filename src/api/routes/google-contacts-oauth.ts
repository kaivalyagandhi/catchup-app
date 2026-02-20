/**
 * Google Contacts OAuth Routes
 * Handles OAuth flow for Google Contacts integration
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { googleContactsOAuthService } from '../../integrations/google-contacts-oauth-service';
import { CloudTasksQueue } from '../../jobs/cloud-tasks-client';
import { GoogleContactsSyncJobData } from '../../jobs/types';
// Note: Scheduler functions are deprecated with Cloud Tasks
// Recurring jobs are handled by Cloud Scheduler

const router = Router();

// Cloud Tasks queue for Google Contacts sync
const googleContactsSyncQueue = new CloudTasksQueue('google-contacts-sync');

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
      res.redirect('/app?view=preferences&contacts_error=missing_code');
      return;
    }

    if (!state || typeof state !== 'string') {
      res.redirect('/app?view=preferences&contacts_error=missing_state');
      return;
    }

    // Decode state to get userId
    let userId: string;
    try {
      userId = Buffer.from(state, 'base64').toString('utf-8');
    } catch (error) {
      console.error('Failed to decode state:', error);
      res.redirect('/app?view=preferences&contacts_error=invalid_state');
      return;
    }

    console.log('Exchanging authorization code for tokens...');

    // Exchange code for tokens and store them
    let tokens;
    try {
      tokens = await googleContactsOAuthService.handleCallback(code, userId);

      // Clear token health status and notifications after storing new tokens
      try {
        // Clear token health status so it gets rechecked with new token
        const { TokenHealthMonitor } = await import('../../integrations/token-health-monitor');
        const tokenHealthMonitor = TokenHealthMonitor.getInstance();
        await tokenHealthMonitor.clearTokenHealth(userId, 'google_contacts');
        console.log(`Cleared token health status for user ${userId}`);

        // Clear any unresolved token health notifications
        const { tokenHealthNotificationService } = await import(
          '../../integrations/token-health-notification-service'
        );
        const resolvedCount = await tokenHealthNotificationService.resolveNotifications(
          userId,
          'google_contacts'
        );
        if (resolvedCount > 0) {
          console.log(`Resolved ${resolvedCount} token health notifications for user ${userId}`);
        }
      } catch (notificationError) {
        // Log error but don't fail the OAuth flow
        console.error('Failed to clear token health status:', notificationError);
      }
    } catch (tokenError) {
      const tokenErrorMsg = tokenError instanceof Error ? tokenError.message : String(tokenError);
      console.error('Failed to exchange code for tokens:', tokenErrorMsg);
      res.redirect(`/app?view=preferences&contacts_error=${encodeURIComponent(tokenErrorMsg)}`);
      return;
    }

    console.log('Google Contacts connection successful for user:', userId);

    // Initialize sync schedule with default frequency (Requirement 5.1)
    try {
      const { AdaptiveSyncScheduler } = await import('../../integrations/adaptive-sync-scheduler');
      const scheduler = AdaptiveSyncScheduler.getInstance();

      // Default frequency for contacts: 3 days
      await scheduler.initializeSchedule(userId, 'google_contacts');
      console.log(`Sync schedule initialized for user ${userId} with default 3-day frequency`);
    } catch (scheduleError) {
      const scheduleErrorMsg =
        scheduleError instanceof Error ? scheduleError.message : String(scheduleError);
      console.error('Failed to initialize sync schedule:', scheduleErrorMsg);
      // Don't fail the OAuth flow if schedule initialization fails
    }

    // Initialize circuit breaker in closed state (Requirement 2.1)
    try {
      const { CircuitBreakerManager } = await import('../../integrations/circuit-breaker-manager');
      const circuitBreakerManager = CircuitBreakerManager.getInstance();

      // Reset ensures circuit breaker is in closed state
      await circuitBreakerManager.reset(userId, 'google_contacts');
      console.log(`Circuit breaker initialized in closed state for user ${userId}`);
    } catch (circuitBreakerError) {
      const circuitBreakerErrorMsg =
        circuitBreakerError instanceof Error
          ? circuitBreakerError.message
          : String(circuitBreakerError);
      console.error('Failed to initialize circuit breaker:', circuitBreakerErrorMsg);
      // Don't fail the OAuth flow if circuit breaker initialization fails
    }

    // Run initial token health check (Requirement 1.1)
    try {
      const { TokenHealthMonitor } = await import('../../integrations/token-health-monitor');
      const tokenHealthMonitor = TokenHealthMonitor.getInstance();

      const tokenHealth = await tokenHealthMonitor.checkTokenHealth(userId, 'google_contacts');
      console.log(`Initial token health check completed for user ${userId}: ${tokenHealth.status}`);
    } catch (tokenHealthError) {
      const tokenHealthErrorMsg =
        tokenHealthError instanceof Error ? tokenHealthError.message : String(tokenHealthError);
      console.error('Failed to run initial token health check:', tokenHealthErrorMsg);
      // Don't fail the OAuth flow if token health check fails
    }

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

    // Note: Immediate first sync is handled by GoogleContactsOAuthService.handleCallback()
    // which was called above. We don't need to queue another sync job here.
    // Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 1: Immediate First Sync"

    // Schedule future incremental syncs
    // Note: With Cloud Tasks, recurring syncs are handled by Cloud Scheduler
    // The adaptive sync scheduler manages sync timing automatically
    console.log(`Sync scheduling handled by Cloud Scheduler for user ${userId}`);

    // Redirect to Preferences page with success message
    res.redirect('/app?view=preferences&contacts_success=true');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Unexpected error in OAuth callback:', errorMsg);
    console.error('Stack:', errorStack);
    res.redirect(`/app?view=preferences&contacts_error=${encodeURIComponent(errorMsg)}`);
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

    // Note: With Cloud Tasks, auto-sync is managed by Cloud Scheduler
    // All connected users have auto-sync enabled via adaptive scheduler
    const autoSyncEnabled = true;

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

    // Clean up sync schedule (Requirement 5.1)
    try {
      const { AdaptiveSyncScheduler } = await import('../../integrations/adaptive-sync-scheduler');
      const scheduler = AdaptiveSyncScheduler.getInstance();

      await scheduler.removeSchedule(req.userId, 'google_contacts');
      console.log(`Sync schedule removed for user ${req.userId}`);
    } catch (scheduleError) {
      const scheduleErrorMsg =
        scheduleError instanceof Error ? scheduleError.message : String(scheduleError);
      console.error('Failed to remove sync schedule:', scheduleErrorMsg);
      // Continue with disconnect even if schedule removal fails
    }

    // Reset circuit breaker state (Requirement 2.1)
    try {
      const { CircuitBreakerManager } = await import('../../integrations/circuit-breaker-manager');
      const circuitBreakerManager = CircuitBreakerManager.getInstance();

      await circuitBreakerManager.reset(req.userId, 'google_contacts');
      console.log(`Circuit breaker reset for user ${req.userId}`);
    } catch (circuitBreakerError) {
      const circuitBreakerErrorMsg =
        circuitBreakerError instanceof Error
          ? circuitBreakerError.message
          : String(circuitBreakerError);
      console.error('Failed to reset circuit breaker:', circuitBreakerErrorMsg);
      // Continue with disconnect even if circuit breaker reset fails
    }

    // Clear token health records (Requirement 1.1)
    try {
      const { TokenHealthMonitor } = await import('../../integrations/token-health-monitor');
      const tokenHealthMonitor = TokenHealthMonitor.getInstance();

      await tokenHealthMonitor.clearTokenHealth(req.userId, 'google_contacts');
      console.log(`Token health records cleared for user ${req.userId}`);
    } catch (tokenHealthError) {
      const tokenHealthErrorMsg =
        tokenHealthError instanceof Error ? tokenHealthError.message : String(tokenHealthError);
      console.error('Failed to clear token health records:', tokenHealthErrorMsg);
      // Continue with disconnect even if token health clearing fails
    }

    // Disconnect OAuth and delete tokens
    await googleContactsOAuthService.disconnect(req.userId);

    // Stop scheduled sync jobs
    // Note: With Cloud Tasks, recurring syncs are handled by Cloud Scheduler
    // Disconnection is tracked in database, adaptive scheduler will skip this user
    console.log('Sync scheduling handled by Cloud Scheduler for user:', req.userId);

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
