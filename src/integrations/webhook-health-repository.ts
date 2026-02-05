/**
 * Webhook Health Repository
 *
 * Manages webhook health tracking and notification event logging.
 * Used by WebhookHealthCheckProcessor to monitor webhook reliability.
 */

import pool from '../db/connection';

/**
 * Get the last notification timestamp for a user's webhook
 *
 * Returns the most recent webhook notification received for the user.
 * Used to detect webhooks that haven't received notifications in 48+ hours.
 */
export async function getLastNotificationTimestamp(
  userId: string
): Promise<Date | null> {
  const result = await pool.query<{ created_at: Date }>(
    `SELECT created_at 
     FROM webhook_notifications 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].created_at;
}

/**
 * Get all active webhook subscriptions
 *
 * Returns all webhook subscriptions that are currently registered.
 * Used by health check job to monitor all active webhooks.
 */
export async function getAllActiveSubscriptions(): Promise<
  Array<{
    userId: string;
    channelId: string;
    resourceId: string;
    expiration: Date;
    createdAt: Date;
  }>
> {
  const result = await pool.query<{
    user_id: string;
    channel_id: string;
    resource_id: string;
    expiration: Date;
    created_at: Date;
  }>(
    `SELECT user_id, channel_id, resource_id, expiration, created_at
     FROM calendar_webhook_subscriptions
     ORDER BY created_at DESC`
  );

  return result.rows.map((row) => ({
    userId: row.user_id,
    channelId: row.channel_id,
    resourceId: row.resource_id,
    expiration: row.expiration,
    createdAt: row.created_at,
  }));
}

/**
 * Track a webhook notification event
 *
 * Logs webhook notification to webhook_notifications table.
 * Used to track webhook health and detect failures.
 */
export async function trackNotificationEvent(data: {
  userId: string;
  channelId: string;
  resourceId: string;
  resourceState: string;
  result: 'success' | 'failure' | 'ignored';
  errorMessage?: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO webhook_notifications 
     (user_id, channel_id, resource_id, resource_state, result, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.userId,
      data.channelId,
      data.resourceId,
      data.resourceState,
      data.result,
      data.errorMessage || null,
    ]
  );
}

/**
 * Get webhooks with no notifications in the specified hours
 *
 * Returns webhooks that haven't received any notifications recently.
 * Used to detect potentially broken webhooks.
 */
export async function getWebhooksWithNoRecentNotifications(
  hoursThreshold: number
): Promise<
  Array<{
    userId: string;
    channelId: string;
    resourceId: string;
    expiration: Date;
    lastNotificationAt: Date | null;
    hoursSinceLastNotification: number | null;
  }>
> {
  const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

  const result = await pool.query<{
    user_id: string;
    channel_id: string;
    resource_id: string;
    expiration: Date;
    last_notification_at: Date | null;
    hours_since_last_notification: number | null;
  }>(
    `SELECT 
       ws.user_id,
       ws.channel_id,
       ws.resource_id,
       ws.expiration,
       MAX(wn.created_at) as last_notification_at,
       EXTRACT(EPOCH FROM (NOW() - MAX(wn.created_at))) / 3600 as hours_since_last_notification
     FROM calendar_webhook_subscriptions ws
     LEFT JOIN webhook_notifications wn ON ws.user_id = wn.user_id
     GROUP BY ws.user_id, ws.channel_id, ws.resource_id, ws.expiration
     HAVING MAX(wn.created_at) IS NULL OR MAX(wn.created_at) < $1`,
    [thresholdDate]
  );

  return result.rows.map((row) => ({
    userId: row.user_id,
    channelId: row.channel_id,
    resourceId: row.resource_id,
    expiration: row.expiration,
    lastNotificationAt: row.last_notification_at,
    hoursSinceLastNotification: row.hours_since_last_notification,
  }));
}

/**
 * Get webhooks expiring within specified hours
 *
 * Returns webhooks that will expire soon and need renewal.
 * Used by health check job to proactively renew webhooks.
 */
export async function getWebhooksExpiringWithinHours(
  hoursFromNow: number
): Promise<
  Array<{
    userId: string;
    channelId: string;
    resourceId: string;
    expiration: Date;
    hoursUntilExpiration: number;
  }>
> {
  const expirationThreshold = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

  const result = await pool.query<{
    user_id: string;
    channel_id: string;
    resource_id: string;
    expiration: Date;
    hours_until_expiration: number;
  }>(
    `SELECT 
       user_id,
       channel_id,
       resource_id,
       expiration,
       EXTRACT(EPOCH FROM (expiration - NOW())) / 3600 as hours_until_expiration
     FROM calendar_webhook_subscriptions
     WHERE expiration <= $1
     ORDER BY expiration ASC`,
    [expirationThreshold]
  );

  return result.rows.map((row) => ({
    userId: row.user_id,
    channelId: row.channel_id,
    resourceId: row.resource_id,
    expiration: row.expiration,
    hoursUntilExpiration: row.hours_until_expiration,
  }));
}
