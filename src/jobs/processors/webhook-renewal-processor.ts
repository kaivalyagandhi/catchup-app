/**
 * Webhook Renewal Processor
 *
 * Runs CalendarWebhookManager.renewExpiringWebhooks() daily to renew
 * webhooks before they expire.
 *
 * Requirements: 6.4
 */

import { Job } from 'bull';
import { CalendarWebhookManager } from '../../integrations/calendar-webhook-manager';

export interface WebhookRenewalJobData {
  // No data needed - processes all users
}

export interface WebhookRenewalResult {
  renewed: number;
  failed: number;
  errors: string[];
  highFailureRate: boolean;
}

const FAILURE_RATE_THRESHOLD = 0.05; // 5% failure rate triggers alert

/**
 * Process webhook renewal job
 *
 * Renews all webhooks expiring within 24 hours.
 */
export async function processWebhookRenewal(
  job: Job<WebhookRenewalJobData>
): Promise<WebhookRenewalResult> {
  console.log(`[Webhook Renewal] Starting webhook renewal job ${job.id}`);

  const webhookManager = new CalendarWebhookManager();
  const errors: string[] = [];

  try {
    // Renew all expiring webhooks
    const result = await webhookManager.renewExpiringWebhooks();

    console.log(
      `[Webhook Renewal] Completed: ${result.renewed} renewed, ${result.failed} failed`
    );

    // Calculate failure rate
    const total = result.renewed + result.failed;
    const failureRate = total > 0 ? result.failed / total : 0;
    const highFailureRate = failureRate > FAILURE_RATE_THRESHOLD;

    if (highFailureRate) {
      const errorMsg = `High webhook renewal failure rate: ${(failureRate * 100).toFixed(1)}% (${result.failed}/${total})`;
      console.error(`[Webhook Renewal] ALERT: ${errorMsg}`);
      errors.push(errorMsg);
    }

    return {
      renewed: result.renewed,
      failed: result.failed,
      errors,
      highFailureRate,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Webhook Renewal] Job failed:`, errorMsg);
    errors.push(errorMsg);

    throw error; // Re-throw to mark job as failed
  }
}
