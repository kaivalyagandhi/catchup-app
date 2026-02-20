/**
 * Webhook Health Check Processor
 *
 * Monitors webhook health and takes corrective actions:
 * - Alerts if no notifications received in 48 hours
 * - Attempts to re-register broken webhooks
 * - Checks for webhooks expiring within 24 hours
 *
 * Runs every 12 hours via scheduled job.
 * Requirements: Enhanced webhook monitoring
 */

import { Job } from '../job-types';
import {
  getAllActiveSubscriptions,
  getWebhooksWithNoRecentNotifications,
  getWebhooksExpiringWithinHours,
} from '../../integrations/webhook-health-repository';
import { calendarWebhookManager } from '../../integrations/calendar-webhook-manager';
import pool from '../../db/connection';

export interface WebhookHealthCheckJobData {
  // No data needed - processes all webhooks
}

export interface WebhookHealthCheckResult {
  totalWebhooks: number;
  staleWebhooks: number;
  expiringWebhooks: number;
  reregistrationAttempts: number;
  reregistrationSuccesses: number;
  reregistrationFailures: number;
  alerts: string[];
  errors: string[];
}

/**
 * Process webhook health check job
 *
 * Checks all active webhook subscriptions for health issues:
 * 1. Identifies webhooks with no notifications in 48+ hours
 * 2. Attempts to re-register broken webhooks
 * 3. Checks for webhooks expiring within 24 hours
 * 4. Sends alerts for issues detected
 */
export async function processWebhookHealthCheck(
  job: Job<WebhookHealthCheckJobData>
): Promise<WebhookHealthCheckResult> {
  console.log('[WebhookHealthCheckProcessor] Starting webhook health check...');

  const result: WebhookHealthCheckResult = {
    totalWebhooks: 0,
    staleWebhooks: 0,
    expiringWebhooks: 0,
    reregistrationAttempts: 0,
    reregistrationSuccesses: 0,
    reregistrationFailures: 0,
    alerts: [],
    errors: [],
  };

  try {
    // Get all active webhook subscriptions
    const activeWebhooks = await getAllActiveSubscriptions();
    result.totalWebhooks = activeWebhooks.length;

    console.log(`[WebhookHealthCheckProcessor] Found ${result.totalWebhooks} active webhooks`);

    // Check for webhooks with no recent notifications (48+ hours)
    const staleWebhooks = await getWebhooksWithNoRecentNotifications(48);
    result.staleWebhooks = staleWebhooks.length;

    if (staleWebhooks.length > 0) {
      console.log(
        `[WebhookHealthCheckProcessor] Found ${staleWebhooks.length} stale webhooks (no notifications in 48+ hours)`
      );

      // Alert and attempt re-registration for stale webhooks
      for (const webhook of staleWebhooks) {
        const hours = webhook.hoursSinceLastNotification
          ? Number(webhook.hoursSinceLastNotification).toFixed(1)
          : 'unknown';
        const alertMessage = `Webhook for user ${webhook.userId} has not received notifications in ${hours} hours`;
        result.alerts.push(alertMessage);
        console.warn(`[WebhookHealthCheckProcessor] ALERT: ${alertMessage}`);

        // Attempt to re-register the webhook
        try {
          result.reregistrationAttempts++;
          console.log(
            `[WebhookHealthCheckProcessor] Attempting to re-register webhook for user ${webhook.userId}...`
          );

          // Get user's OAuth tokens
          const tokenResult = await pool.query(
            'SELECT access_token, refresh_token FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
            [webhook.userId, 'google_calendar']
          );

          if (tokenResult.rows.length === 0) {
            const errorMsg = `No OAuth tokens found for user ${webhook.userId}`;
            result.errors.push(errorMsg);
            result.reregistrationFailures++;
            console.error(`[WebhookHealthCheckProcessor] ${errorMsg}`);
            continue;
          }

          const { access_token, refresh_token } = tokenResult.rows[0];

          // Stop old webhook
          await calendarWebhookManager.stopWebhook(webhook.userId);

          // Register new webhook
          await calendarWebhookManager.registerWebhook(webhook.userId, access_token, refresh_token);

          result.reregistrationSuccesses++;
          console.log(
            `[WebhookHealthCheckProcessor] Successfully re-registered webhook for user ${webhook.userId}`
          );
        } catch (error) {
          result.reregistrationFailures++;
          const errorMsg = `Failed to re-register webhook for user ${webhook.userId}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          console.error(`[WebhookHealthCheckProcessor] ${errorMsg}`);
        }
      }
    }

    // Check for webhooks expiring within 24 hours
    const expiringWebhooks = await getWebhooksExpiringWithinHours(24);
    result.expiringWebhooks = expiringWebhooks.length;

    if (expiringWebhooks.length > 0) {
      console.log(
        `[WebhookHealthCheckProcessor] Found ${expiringWebhooks.length} webhooks expiring within 24 hours`
      );

      for (const webhook of expiringWebhooks) {
        const hours = Number(webhook.hoursUntilExpiration).toFixed(1);
        const alertMessage = `Webhook for user ${webhook.userId} expires in ${hours} hours`;
        result.alerts.push(alertMessage);
        console.warn(`[WebhookHealthCheckProcessor] ALERT: ${alertMessage}`);
      }

      // Note: Webhook renewal is handled by the separate webhook-renewal-processor
      // which runs daily. This health check just alerts on expiring webhooks.
    }

    // Log summary
    console.log(
      `[WebhookHealthCheckProcessor] Health check complete:`,
      `\n  Total webhooks: ${result.totalWebhooks}`,
      `\n  Stale webhooks: ${result.staleWebhooks}`,
      `\n  Expiring webhooks: ${result.expiringWebhooks}`,
      `\n  Re-registration attempts: ${result.reregistrationAttempts}`,
      `\n  Re-registration successes: ${result.reregistrationSuccesses}`,
      `\n  Re-registration failures: ${result.reregistrationFailures}`,
      `\n  Alerts: ${result.alerts.length}`,
      `\n  Errors: ${result.errors.length}`
    );

    // Alert on high failure rate (>20%)
    if (
      result.reregistrationAttempts > 0 &&
      result.reregistrationFailures / result.reregistrationAttempts > 0.2
    ) {
      const highFailureAlert = `HIGH FAILURE RATE: ${result.reregistrationFailures}/${result.reregistrationAttempts} webhook re-registrations failed`;
      result.alerts.push(highFailureAlert);
      console.error(`[WebhookHealthCheckProcessor] ALERT: ${highFailureAlert}`);
    }

    return result;
  } catch (error) {
    const errorMsg = `Webhook health check failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    console.error(`[WebhookHealthCheckProcessor] ${errorMsg}`);
    throw error;
  }
}
