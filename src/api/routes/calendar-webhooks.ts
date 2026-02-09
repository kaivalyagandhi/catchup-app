/**
 * Calendar Webhook Routes
 *
 * Handles incoming webhook notifications from Google Calendar API.
 * Validates notifications and triggers immediate incremental syncs.
 *
 * Requirements: 6.2, 6.7
 */

import { Router, Request, Response } from 'express';
import { calendarWebhookManager } from '../../integrations/calendar-webhook-manager';
import { syncOrchestrator } from '../../integrations/sync-orchestrator';
import { getToken } from '../../integrations/oauth-repository';
import { trackNotificationEvent } from '../../integrations/webhook-health-repository';

const router = Router();

/**
 * POST /api/webhooks/calendar
 *
 * Receives push notifications from Google Calendar when calendar data changes.
 * Validates the notification and triggers an immediate incremental sync.
 *
 * Google sends these headers:
 * - X-Goog-Channel-ID: The channel ID we registered
 * - X-Goog-Resource-ID: The resource ID Google assigned
 * - X-Goog-Resource-State: "sync" (initial) or "exists" (change detected)
 * - X-Goog-Resource-URI: The resource URI
 * - X-Goog-Channel-Token: Our verification token
 *
 * Requirements: 6.2, 6.7
 */
router.post('/calendar', async (req: Request, res: Response) => {
  try {
    // Extract Google webhook headers
    // Requirements: 6.7 - Validate headers
    const channelId = req.headers['x-goog-channel-id'] as string;
    const resourceId = req.headers['x-goog-resource-id'] as string;
    const resourceState = req.headers['x-goog-resource-state'] as string;
    const resourceUri = req.headers['x-goog-resource-uri'] as string;
    const channelToken = req.headers['x-goog-channel-token'] as string;

    console.log('[CalendarWebhook] Received notification:', {
      channelId,
      resourceId,
      resourceState,
      resourceUri,
    });

    // Validate required headers
    if (!channelId || !resourceId || !resourceState) {
      console.warn('[CalendarWebhook] Missing required headers');
      return res.status(400).json({
        error: 'Missing required headers',
        required: ['X-Goog-Channel-ID', 'X-Goog-Resource-ID', 'X-Goog-Resource-State'],
      });
    }

    // Handle webhook notification
    // This validates channel_id and resource_id against database
    // Requirements: 6.7
    let result: { userId: string; shouldSync: boolean };
    let notificationResult: 'success' | 'failure' | 'ignored' = 'success';
    let errorMessage: string | undefined;

    try {
      result = await calendarWebhookManager.handleWebhookNotification(
        channelId,
        resourceId,
        resourceState
      );

      // Determine notification result based on resource state
      if (resourceState === 'sync') {
        notificationResult = 'ignored'; // Initial confirmation
      } else if (resourceState === 'exists') {
        notificationResult = 'success'; // Valid change notification
      } else {
        notificationResult = 'ignored'; // Unknown state
      }

      // Log notification to webhook_notifications table
      // Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "2. Webhook Failure Alerts"
      await trackNotificationEvent({
        userId: result.userId,
        channelId,
        resourceId,
        resourceState,
        result: notificationResult,
      });
    } catch (error) {
      // Log failed notification
      notificationResult = 'failure';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[CalendarWebhook] Error handling webhook notification:', error);

      // Try to log the failure (userId might not be available if validation failed)
      try {
        // Attempt to get userId from database by channel/resource
        const subscription = await calendarWebhookManager.getWebhookStatus(''); // Will need userId
        // For now, we'll skip logging if we can't get userId
        // This is a rare case where the webhook is invalid
      } catch (logError) {
        console.error('[CalendarWebhook] Could not log failed notification:', logError);
      }

      // Respond immediately to Google (they expect 200 OK quickly)
      res.status(200).json({ received: true });
      return;
    }

    // Respond immediately to Google (they expect 200 OK quickly)
    res.status(200).json({ received: true });

    // Trigger sync asynchronously if needed
    // Requirements: 6.2 - Trigger immediate incremental sync on "exists" notification
    if (result.shouldSync) {
      console.log(`[CalendarWebhook] Triggering sync for user ${result.userId}`);

      // Don't await - run in background
      triggerWebhookSync(result.userId).catch((error) => {
        console.error(`[CalendarWebhook] Error triggering sync for user ${result.userId}:`, error);
      });
    }
  } catch (error) {
    console.error('[CalendarWebhook] Error handling webhook notification:', error);

    // Still return 200 to Google to avoid retries
    // Log the error for investigation
    res.status(200).json({ received: true, error: 'Internal processing error' });
  }
});

/**
 * Trigger webhook-initiated sync for a user
 */
async function triggerWebhookSync(userId: string): Promise<void> {
  try {
    // Get user's OAuth tokens
    const token = await getToken(userId, 'google_calendar');

    if (!token) {
      console.warn(`[CalendarWebhook] No OAuth tokens found for user ${userId}, skipping sync`);
      return;
    }

    // Execute sync via orchestrator
    const result = await syncOrchestrator.executeSyncJob({
      userId,
      integrationType: 'google_calendar',
      syncType: 'webhook_triggered',
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      bypassCircuitBreaker: false, // Respect circuit breaker even for webhook syncs
    });

    console.log(
      `[CalendarWebhook] Sync completed for user ${userId}: ${result.result}, ` +
        `processed ${result.itemsProcessed || 0} items`
    );
  } catch (error) {
    console.error(`[CalendarWebhook] Error executing sync for user ${userId}:`, error);
    throw error;
  }
}

export default router;
