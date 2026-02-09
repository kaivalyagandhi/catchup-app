/**
 * Webhook Metrics Service
 *
 * Calculates webhook failure rates and provides metrics for monitoring.
 * Used to detect high failure rates and alert admins.
 *
 * Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "2. Webhook Failure Alerts"
 */

import pool from '../db/connection';

export interface WebhookMetrics {
  successCount: number;
  failureCount: number;
  ignoredCount: number;
  totalCount: number;
  failureRate: number; // Percentage (0-100)
  timeWindowHours: number;
}

/**
 * Calculate webhook failure rate over the last 24 hours
 *
 * Returns success count, failure count, and failure rate percentage.
 * Used to detect when webhook reliability drops below acceptable threshold.
 *
 * @param hoursWindow - Time window to analyze (default: 24 hours)
 * @returns Webhook metrics including failure rate
 */
export async function calculateWebhookFailureRate(
  hoursWindow: number = 24
): Promise<WebhookMetrics> {
  const windowStart = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

  const result = await pool.query<{
    success_count: string;
    failure_count: string;
    ignored_count: string;
    total_count: string;
  }>(
    `SELECT 
       COUNT(*) FILTER (WHERE result = 'success') as success_count,
       COUNT(*) FILTER (WHERE result = 'failure') as failure_count,
       COUNT(*) FILTER (WHERE result = 'ignored') as ignored_count,
       COUNT(*) as total_count
     FROM webhook_notifications
     WHERE created_at >= $1`,
    [windowStart]
  );

  const row = result.rows[0];
  const successCount = parseInt(row.success_count, 10);
  const failureCount = parseInt(row.failure_count, 10);
  const ignoredCount = parseInt(row.ignored_count, 10);
  const totalCount = parseInt(row.total_count, 10);

  // Calculate failure rate (exclude ignored notifications from calculation)
  const relevantCount = successCount + failureCount;
  const failureRate = relevantCount > 0 ? (failureCount / relevantCount) * 100 : 0;

  return {
    successCount,
    failureCount,
    ignoredCount,
    totalCount,
    failureRate,
    timeWindowHours: hoursWindow,
  };
}

/**
 * Get webhook metrics for a specific user
 *
 * Returns webhook metrics for a single user over the specified time window.
 *
 * @param userId - User ID to get metrics for
 * @param hoursWindow - Time window to analyze (default: 24 hours)
 * @returns Webhook metrics for the user
 */
export async function getUserWebhookMetrics(
  userId: string,
  hoursWindow: number = 24
): Promise<WebhookMetrics> {
  const windowStart = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

  const result = await pool.query<{
    success_count: string;
    failure_count: string;
    ignored_count: string;
    total_count: string;
  }>(
    `SELECT 
       COUNT(*) FILTER (WHERE result = 'success') as success_count,
       COUNT(*) FILTER (WHERE result = 'failure') as failure_count,
       COUNT(*) FILTER (WHERE result = 'ignored') as ignored_count,
       COUNT(*) as total_count
     FROM webhook_notifications
     WHERE user_id = $1 AND created_at >= $2`,
    [userId, windowStart]
  );

  const row = result.rows[0];
  const successCount = parseInt(row.success_count, 10);
  const failureCount = parseInt(row.failure_count, 10);
  const ignoredCount = parseInt(row.ignored_count, 10);
  const totalCount = parseInt(row.total_count, 10);

  // Calculate failure rate (exclude ignored notifications from calculation)
  const relevantCount = successCount + failureCount;
  const failureRate = relevantCount > 0 ? (failureCount / relevantCount) * 100 : 0;

  return {
    successCount,
    failureCount,
    ignoredCount,
    totalCount,
    failureRate,
    timeWindowHours: hoursWindow,
  };
}

/**
 * Check if failure rate exceeds threshold
 *
 * Returns true if the failure rate is above the specified threshold.
 * Default threshold is 5% as specified in requirements.
 *
 * @param metrics - Webhook metrics to check
 * @param thresholdPercent - Failure rate threshold (default: 5%)
 * @returns True if failure rate exceeds threshold
 */
export function isFailureRateHigh(metrics: WebhookMetrics, thresholdPercent: number = 5): boolean {
  return metrics.failureRate > thresholdPercent;
}

/**
 * Get recent webhook failures with details
 *
 * Returns the most recent webhook failures for troubleshooting.
 *
 * @param limit - Maximum number of failures to return (default: 10)
 * @param hoursWindow - Time window to search (default: 24 hours)
 * @returns Array of recent webhook failures
 */
export async function getRecentWebhookFailures(
  limit: number = 10,
  hoursWindow: number = 24
): Promise<
  Array<{
    userId: string;
    channelId: string;
    resourceId: string;
    resourceState: string;
    errorMessage: string | null;
    createdAt: Date;
  }>
> {
  const windowStart = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

  const result = await pool.query<{
    user_id: string;
    channel_id: string;
    resource_id: string;
    resource_state: string;
    error_message: string | null;
    created_at: Date;
  }>(
    `SELECT 
       user_id,
       channel_id,
       resource_id,
       resource_state,
       error_message,
       created_at
     FROM webhook_notifications
     WHERE result = 'failure' AND created_at >= $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [windowStart, limit]
  );

  return result.rows.map((row) => ({
    userId: row.user_id,
    channelId: row.channel_id,
    resourceId: row.resource_id,
    resourceState: row.resource_state,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }));
}
