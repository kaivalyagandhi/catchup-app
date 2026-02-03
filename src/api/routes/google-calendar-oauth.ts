/**
 * Google Calendar OAuth Routes
 * Handles OAuth flow for Google Calendar integration
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getAuthorizationUrl, getTokensFromCode } from '../../integrations/google-calendar-config';
import { getUserProfile } from '../../integrations/google-calendar-service';
import { upsertToken, getToken, deleteToken } from '../../integrations/oauth-repository';

const router = Router();

/**
 * GET /api/calendar/oauth/authorize
 * Redirect user to Google OAuth consent screen
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
    const authUrl = getAuthorizationUrl(state);
    res.json({ authUrl });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error generating authorization URL:', errorMsg);
    res.status(500).json({ error: 'Failed to generate authorization URL', details: errorMsg });
  }
});

/**
 * GET /api/calendar/oauth/callback
 * Handle OAuth callback from Google
 * Note: This endpoint does NOT require authentication since it's called by Google redirect
 * Instead, we use state parameter to identify the user
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      res.redirect('/?calendar_error=missing_code');
      return;
    }

    if (!state || typeof state !== 'string') {
      res.redirect('/?calendar_error=missing_state');
      return;
    }

    // Decode state to get userId (state should be base64 encoded userId)
    let userId: string;
    try {
      userId = Buffer.from(state, 'base64').toString('utf-8');
    } catch (error) {
      console.error('Failed to decode state:', error);
      res.redirect('/?calendar_error=invalid_state');
      return;
    }

    console.log('Exchanging authorization code for tokens...');
    // Exchange code for tokens
    let tokens;
    try {
      tokens = await getTokensFromCode(code);
    } catch (tokenError) {
      const tokenErrorMsg = tokenError instanceof Error ? tokenError.message : String(tokenError);
      console.error('Failed to exchange code for tokens:', tokenErrorMsg);
      res.status(400).json({
        error: 'Failed to exchange authorization code',
        details: tokenErrorMsg,
      });
      return;
    }

    if (!tokens || !tokens.access_token) {
      console.error('No access token received:', tokens);
      res.status(400).json({ error: 'Failed to obtain access token' });
      return;
    }

    console.log('Getting user profile...');
    // Get user profile to verify
    let profile;
    try {
      profile = await getUserProfile(tokens);
      console.log('User profile retrieved:', { email: profile.email, name: profile.name });
    } catch (profileError) {
      const profileErrorMsg =
        profileError instanceof Error ? profileError.message : String(profileError);
      console.error('Failed to get user profile:', profileErrorMsg);
      res.status(400).json({
        error: 'Failed to get user profile',
        details: profileErrorMsg,
      });
      return;
    }

    console.log('Storing tokens in database...');
    // Store tokens in database
    try {
      const emailToStore = profile.email || undefined;
      console.log('Storing email:', emailToStore);
      await upsertToken(
        userId,
        'google_calendar',
        tokens.access_token,
        tokens.refresh_token || undefined,
        tokens.token_type || undefined,
        tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        tokens.scope || undefined,
        emailToStore
      );

      // Clear any unresolved token health notifications
      try {
        const { tokenHealthNotificationService } = await import(
          '../../integrations/token-health-notification-service'
        );
        const resolvedCount = await tokenHealthNotificationService.resolveNotifications(
          userId,
          'google_calendar'
        );
        if (resolvedCount > 0) {
          console.log(`Resolved ${resolvedCount} token health notifications for user ${userId}`);
        }
      } catch (notificationError) {
        // Log error but don't fail the OAuth flow
        console.error('Failed to resolve token health notifications:', notificationError);
      }
    } catch (dbError) {
      const dbErrorMsg = dbError instanceof Error ? dbError.message : String(dbError);
      console.error('Failed to store tokens in database:', dbErrorMsg);
      res.status(500).json({
        error: 'Failed to store calendar connection',
        details: dbErrorMsg,
      });
      return;
    }

    console.log('Calendar connection successful for user:', userId);

    // Register webhook for push notifications (Requirement 6.1)
    let webhookRegistered = false;
    try {
      const { CalendarWebhookManager } = await import('../../integrations/calendar-webhook-manager');
      const webhookManager = CalendarWebhookManager.getInstance();
      
      await webhookManager.registerWebhook(
        userId,
        tokens.access_token,
        tokens.refresh_token || undefined
      );
      
      webhookRegistered = true;
      console.log(`Webhook registered successfully for user ${userId}`);
    } catch (webhookError) {
      // Handle webhook registration failures gracefully (Requirement 6.5)
      const webhookErrorMsg = webhookError instanceof Error ? webhookError.message : String(webhookError);
      console.error('Failed to register webhook, will fall back to polling:', webhookErrorMsg);
      // Don't fail the OAuth flow if webhook registration fails
    }

    // Initialize sync schedule with appropriate frequency (Requirements 6.3, 6.5)
    try {
      const { AdaptiveSyncScheduler } = await import('../../integrations/adaptive-sync-scheduler');
      const scheduler = AdaptiveSyncScheduler.getInstance();
      
      // Set frequency based on webhook status
      // 8 hours if webhook active (fallback), 4 hours if webhook failed (normal polling)
      const frequency = webhookRegistered ? 8 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000;
      
      await scheduler.initializeSchedule(userId, 'google_calendar', frequency);
      console.log(`Sync schedule initialized for user ${userId} with ${webhookRegistered ? '8-hour' : '4-hour'} frequency`);
    } catch (scheduleError) {
      const scheduleErrorMsg = scheduleError instanceof Error ? scheduleError.message : String(scheduleError);
      console.error('Failed to initialize sync schedule:', scheduleErrorMsg);
      // Don't fail the OAuth flow if schedule initialization fails
    }

    // Trigger initial calendar sync and suggestion regeneration in background
    try {
      const { enqueueJob, QUEUE_NAMES } = await import('../../jobs/queue');
      
      // Enqueue calendar sync job (non-blocking)
      await enqueueJob(QUEUE_NAMES.CALENDAR_SYNC, {
        userId: userId,
        reason: 'oauth_reconnect',
      });
      console.log(`Calendar sync job queued for user ${userId}`);
      
      // Enqueue suggestion regeneration
      await enqueueJob(QUEUE_NAMES.SUGGESTION_REGENERATION, {
        userId: userId,
        reason: 'calendar_sync',
      });
      console.log(`Suggestion regeneration queued for user ${userId}`);
    } catch (jobError) {
      console.error('Failed to enqueue background jobs:', jobError);
      // Don't fail the OAuth flow if job queueing fails
    }

    // Redirect to frontend with success immediately (don't wait for sync)
    res.redirect('/?calendar_success=true');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Unexpected error in OAuth callback:', errorMsg);
    console.error('Stack:', errorStack);
    res.redirect(`/?calendar_error=${encodeURIComponent(errorMsg)}`);
  }
});

/**
 * GET /api/calendar/oauth/status
 * Check if user has connected Google Calendar
 */
router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const token = await getToken(req.userId, 'google_calendar');
    console.log('Status check - Token retrieved:', {
      connected: !!token,
      email: token?.email,
      expiresAt: token?.expiresAt,
    });

    res.json({
      connected: !!token,
      email: token?.email || null,
      expiresAt: token?.expiresAt || null,
    });
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    res.status(500).json({ error: 'Failed to check OAuth status' });
  }
});

/**
 * DELETE /api/calendar/oauth/disconnect
 * Disconnect Google Calendar
 */
router.delete('/disconnect', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    console.log('Disconnecting Google Calendar for user:', req.userId);

    // Stop webhook if active (Requirement 6.1)
    try {
      const { CalendarWebhookManager } = await import('../../integrations/calendar-webhook-manager');
      const webhookManager = CalendarWebhookManager.getInstance();
      
      await webhookManager.stopWebhook(req.userId);
      console.log(`Webhook stopped for user ${req.userId}`);
    } catch (webhookError) {
      const webhookErrorMsg = webhookError instanceof Error ? webhookError.message : String(webhookError);
      console.error('Failed to stop webhook:', webhookErrorMsg);
      // Continue with disconnect even if webhook stop fails
    }

    // Clean up sync schedule (Requirement 5.1)
    try {
      const { AdaptiveSyncScheduler } = await import('../../integrations/adaptive-sync-scheduler');
      const scheduler = AdaptiveSyncScheduler.getInstance();
      
      await scheduler.removeSchedule(req.userId, 'google_calendar');
      console.log(`Sync schedule removed for user ${req.userId}`);
    } catch (scheduleError) {
      const scheduleErrorMsg = scheduleError instanceof Error ? scheduleError.message : String(scheduleError);
      console.error('Failed to remove sync schedule:', scheduleErrorMsg);
      // Continue with disconnect even if schedule removal fails
    }

    // Reset circuit breaker state (Requirement 2.1)
    try {
      const { CircuitBreakerManager } = await import('../../integrations/circuit-breaker-manager');
      const circuitBreakerManager = CircuitBreakerManager.getInstance();
      
      await circuitBreakerManager.reset(req.userId, 'google_calendar');
      console.log(`Circuit breaker reset for user ${req.userId}`);
    } catch (circuitBreakerError) {
      const circuitBreakerErrorMsg = circuitBreakerError instanceof Error ? circuitBreakerError.message : String(circuitBreakerError);
      console.error('Failed to reset circuit breaker:', circuitBreakerErrorMsg);
      // Continue with disconnect even if circuit breaker reset fails
    }

    // Clear token health records (Requirement 1.1)
    try {
      const { TokenHealthMonitor } = await import('../../integrations/token-health-monitor');
      const tokenHealthMonitor = TokenHealthMonitor.getInstance();
      
      await tokenHealthMonitor.clearTokenHealth(req.userId, 'google_calendar');
      console.log(`Token health records cleared for user ${req.userId}`);
    } catch (tokenHealthError) {
      const tokenHealthErrorMsg = tokenHealthError instanceof Error ? tokenHealthError.message : String(tokenHealthError);
      console.error('Failed to clear token health records:', tokenHealthErrorMsg);
      // Continue with disconnect even if token health clearing fails
    }

    // Delete OAuth token
    await deleteToken(req.userId, 'google_calendar');
    console.log('Google Calendar disconnected successfully for user:', req.userId);

    res.json({ message: 'Google Calendar disconnected successfully' });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error disconnecting Google Calendar:', errorMsg);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar', details: errorMsg });
  }
});

export default router;
