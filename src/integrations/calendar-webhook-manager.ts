/**
 * Calendar Webhook Manager
 *
 * Manages Google Calendar push notifications (webhooks) to replace polling with
 * real-time event updates. Handles webhook registration, renewal, validation,
 * and cleanup.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { google } from 'googleapis';
import { getOAuth2Client } from './google-calendar-config';
import pool from '../db/connection';
import crypto from 'crypto';
import { adaptiveSyncScheduler } from './adaptive-sync-scheduler';

/**
 * Webhook subscription details
 */
export interface WebhookSubscription {
  userId: string;
  channelId: string;
  resourceId: string;
  resourceUri: string;
  expiration: Date;
  token: string; // Verification token
  createdAt: Date;
}

interface WebhookSubscriptionRow {
  id: string;
  user_id: string;
  channel_id: string;
  resource_id: string;
  resource_uri: string;
  expiration: Date;
  token: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Calendar Webhook Manager
 *
 * Manages Google Calendar push notifications for real-time sync
 */
export class CalendarWebhookManager {
  private static instance: CalendarWebhookManager;
  private webhookUrl: string;

  constructor(webhookUrl?: string) {
    // Use environment variable or default to localhost for development
    this.webhookUrl =
      webhookUrl ||
      process.env.CALENDAR_WEBHOOK_URL ||
      'http://localhost:3000/api/webhooks/calendar';
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CalendarWebhookManager {
    if (!CalendarWebhookManager.instance) {
      CalendarWebhookManager.instance = new CalendarWebhookManager();
    }
    return CalendarWebhookManager.instance;
  }

  /**
   * Register webhook for user's calendars
   *
   * Calls Google Calendar API watch endpoint to register push notifications.
   * Generates unique channel_id and verification token.
   * Stores subscription in database.
   *
   * Requirements: 6.1, 6.6
   */
  async registerWebhook(
    userId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<WebhookSubscription> {
    console.log(`[CalendarWebhookManager] Registering webhook for user ${userId}`);

    try {
      // Generate unique channel ID and verification token
      const channelId = `calendar-${userId}-${crypto.randomBytes(8).toString('hex')}`;
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Set up OAuth client
      const oauth2Client = getOAuth2Client({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Register webhook with Google Calendar API
      // Watch the primary calendar for changes
      const response = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: this.webhookUrl,
          token: verificationToken,
          // Expiration is set by Google (typically 7 days)
        },
      });

      if (!response.data.id || !response.data.resourceId || !response.data.expiration) {
        throw new Error('Invalid webhook registration response from Google');
      }

      // Parse expiration (Google returns milliseconds since epoch)
      const expiration = new Date(parseInt(response.data.expiration));

      // Store subscription in database
      const subscription = await this.storeWebhookSubscription({
        userId,
        channelId: response.data.id,
        resourceId: response.data.resourceId,
        resourceUri: response.data.resourceUri || '',
        expiration,
        token: verificationToken,
      });

      console.log(
        `[CalendarWebhookManager] Webhook registered successfully for user ${userId}, ` +
          `channel ${channelId}, expires ${expiration.toISOString()}`
      );

      // Requirement 6.3: Set calendar polling to 8 hours when webhook is active
      await adaptiveSyncScheduler.setWebhookFallbackFrequency(userId);

      return subscription;
    } catch (error) {
      console.error(`[CalendarWebhookManager] Failed to register webhook for user ${userId}:`, error);
      
      // Requirement 6.5: Fall back to polling at 4-hour frequency when webhook registration fails
      await adaptiveSyncScheduler.restoreNormalPollingFrequency(userId);
      
      throw error;
    }
  }

  /**
   * Handle incoming webhook notification from Google
   *
   * Validates channel_id and resource_id against database.
   * Triggers immediate incremental sync on "exists" notification.
   * Ignores "sync" notifications (initial confirmation).
   *
   * Requirements: 6.2, 6.7
   */
  async handleWebhookNotification(
    channelId: string,
    resourceId: string,
    resourceState: string
  ): Promise<{ userId: string; shouldSync: boolean }> {
    console.log(
      `[CalendarWebhookManager] Received webhook notification: ` +
        `channel=${channelId}, resource=${resourceId}, state=${resourceState}`
    );

    try {
      // Validate channel_id and resource_id against database
      // Requirements: 6.7
      const subscription = await this.getWebhookByChannelAndResource(channelId, resourceId);

      if (!subscription) {
        console.warn(
          `[CalendarWebhookManager] Invalid webhook notification: ` +
            `channel ${channelId} and resource ${resourceId} not found in database`
        );
        throw new Error('Invalid webhook notification: subscription not found');
      }

      // Check if subscription has expired
      if (subscription.expiration < new Date()) {
        console.warn(
          `[CalendarWebhookManager] Webhook notification for expired subscription: ` +
            `channel ${channelId}, expired ${subscription.expiration.toISOString()}`
        );
        // Still process it, but log the warning
      }

      // Handle different resource states
      // Requirements: 6.2
      if (resourceState === 'sync') {
        // Initial confirmation - ignore
        console.log(`[CalendarWebhookManager] Ignoring 'sync' notification for channel ${channelId}`);
        return { userId: subscription.userId, shouldSync: false };
      } else if (resourceState === 'exists') {
        // Calendar data changed - trigger sync
        console.log(
          `[CalendarWebhookManager] Calendar changed for user ${subscription.userId}, triggering sync`
        );
        return { userId: subscription.userId, shouldSync: true };
      } else {
        console.log(
          `[CalendarWebhookManager] Unknown resource state '${resourceState}' for channel ${channelId}`
        );
        return { userId: subscription.userId, shouldSync: false };
      }
    } catch (error) {
      console.error('[CalendarWebhookManager] Error handling webhook notification:', error);
      throw error;
    }
  }

  /**
   * Renew webhooks expiring within 24 hours
   *
   * Checks for webhooks expiring soon and renews them.
   * Updates expiration in database.
   * Runs daily via cron job.
   *
   * Requirements: 6.4
   */
  async renewExpiringWebhooks(): Promise<{ renewed: number; failed: number }> {
    console.log('[CalendarWebhookManager] Checking for expiring webhooks...');

    try {
      // Find webhooks expiring within 24 hours
      const expiringWebhooks = await this.getExpiringWebhooks(24);

      console.log(`[CalendarWebhookManager] Found ${expiringWebhooks.length} expiring webhooks`);

      let renewed = 0;
      let failed = 0;

      for (const webhook of expiringWebhooks) {
        try {
          // Get user's OAuth tokens
          const tokenResult = await pool.query(
            'SELECT access_token, refresh_token FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
            [webhook.userId, 'google_calendar']
          );

          if (tokenResult.rows.length === 0) {
            console.warn(
              `[CalendarWebhookManager] No OAuth tokens found for user ${webhook.userId}, skipping renewal`
            );
            failed++;
            continue;
          }

          const { access_token, refresh_token } = tokenResult.rows[0];

          // Stop old webhook
          await this.stopWebhookInternal(webhook.userId, access_token, refresh_token);

          // Register new webhook
          await this.registerWebhook(webhook.userId, access_token, refresh_token);

          renewed++;
          console.log(`[CalendarWebhookManager] Renewed webhook for user ${webhook.userId}`);
        } catch (error) {
          console.error(
            `[CalendarWebhookManager] Failed to renew webhook for user ${webhook.userId}:`,
            error
          );
          failed++;
        }
      }

      console.log(
        `[CalendarWebhookManager] Webhook renewal complete: ${renewed} renewed, ${failed} failed`
      );

      return { renewed, failed };
    } catch (error) {
      console.error('[CalendarWebhookManager] Error renewing expiring webhooks:', error);
      throw error;
    }
  }

  /**
   * Stop webhook (user disconnects calendar)
   *
   * Calls Google Calendar API stop endpoint.
   * Deletes subscription from database.
   * Restores normal polling frequency.
   *
   * Requirements: 6.5
   */
  async stopWebhook(userId: string): Promise<void> {
    console.log(`[CalendarWebhookManager] Stopping webhook for user ${userId}`);

    try {
      // Get user's OAuth tokens
      const tokenResult = await pool.query(
        'SELECT access_token, refresh_token FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
        [userId, 'google_calendar']
      );

      if (tokenResult.rows.length === 0) {
        console.warn(
          `[CalendarWebhookManager] No OAuth tokens found for user ${userId}, cleaning up database only`
        );
        // Still delete from database
        await this.deleteWebhookSubscription(userId);
        return;
      }

      const { access_token, refresh_token } = tokenResult.rows[0];

      await this.stopWebhookInternal(userId, access_token, refresh_token);
    } catch (error) {
      console.error(`[CalendarWebhookManager] Error stopping webhook for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Internal method to stop webhook with provided tokens
   */
  private async stopWebhookInternal(
    userId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    try {
      // Get webhook subscription
      const subscription = await this.getWebhookStatus(userId);

      if (!subscription) {
        console.log(`[CalendarWebhookManager] No webhook found for user ${userId}`);
        return;
      }

      // Set up OAuth client
      const oauth2Client = getOAuth2Client({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Stop webhook via Google Calendar API
      await calendar.channels.stop({
        requestBody: {
          id: subscription.channelId,
          resourceId: subscription.resourceId,
        },
      });

      console.log(
        `[CalendarWebhookManager] Stopped webhook channel ${subscription.channelId} for user ${userId}`
      );

      // Delete from database
      await this.deleteWebhookSubscription(userId);

      // Requirement 6.5: Restore normal polling frequency when webhook is stopped
      await adaptiveSyncScheduler.restoreNormalPollingFrequency(userId);

      console.log(`[CalendarWebhookManager] Webhook stopped successfully for user ${userId}`);
    } catch (error) {
      // If Google API call fails, still try to clean up database
      console.error(
        `[CalendarWebhookManager] Error calling Google API to stop webhook, cleaning up database:`,
        error
      );
      await this.deleteWebhookSubscription(userId);
      
      // Restore normal polling frequency even if API call failed
      await adaptiveSyncScheduler.restoreNormalPollingFrequency(userId);
    }
  }

  /**
   * Get webhook subscription status for a user
   */
  async getWebhookStatus(userId: string): Promise<WebhookSubscription | null> {
    const result = await pool.query<WebhookSubscriptionRow>(
      'SELECT * FROM calendar_webhook_subscriptions WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToWebhookSubscription(result.rows[0]);
  }

  /**
   * Store webhook subscription in database
   */
  private async storeWebhookSubscription(data: {
    userId: string;
    channelId: string;
    resourceId: string;
    resourceUri: string;
    expiration: Date;
    token: string;
  }): Promise<WebhookSubscription> {
    const result = await pool.query<WebhookSubscriptionRow>(
      `INSERT INTO calendar_webhook_subscriptions 
       (user_id, channel_id, resource_id, resource_uri, expiration, token)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id)
       DO UPDATE SET
         channel_id = EXCLUDED.channel_id,
         resource_id = EXCLUDED.resource_id,
         resource_uri = EXCLUDED.resource_uri,
         expiration = EXCLUDED.expiration,
         token = EXCLUDED.token,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [data.userId, data.channelId, data.resourceId, data.resourceUri, data.expiration, data.token]
    );

    return this.rowToWebhookSubscription(result.rows[0]);
  }

  /**
   * Get webhook by channel_id and resource_id
   */
  private async getWebhookByChannelAndResource(
    channelId: string,
    resourceId: string
  ): Promise<WebhookSubscription | null> {
    const result = await pool.query<WebhookSubscriptionRow>(
      'SELECT * FROM calendar_webhook_subscriptions WHERE channel_id = $1 AND resource_id = $2',
      [channelId, resourceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToWebhookSubscription(result.rows[0]);
  }

  /**
   * Get webhooks expiring within specified hours
   */
  private async getExpiringWebhooks(hoursFromNow: number): Promise<WebhookSubscription[]> {
    const expirationThreshold = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

    const result = await pool.query<WebhookSubscriptionRow>(
      'SELECT * FROM calendar_webhook_subscriptions WHERE expiration <= $1',
      [expirationThreshold]
    );

    return result.rows.map((row) => this.rowToWebhookSubscription(row));
  }

  /**
   * Delete webhook subscription from database
   */
  private async deleteWebhookSubscription(userId: string): Promise<void> {
    await pool.query('DELETE FROM calendar_webhook_subscriptions WHERE user_id = $1', [userId]);
  }

  /**
   * Convert database row to WebhookSubscription
   */
  private rowToWebhookSubscription(row: WebhookSubscriptionRow): WebhookSubscription {
    return {
      userId: row.user_id,
      channelId: row.channel_id,
      resourceId: row.resource_id,
      resourceUri: row.resource_uri,
      expiration: row.expiration,
      token: row.token,
      createdAt: row.created_at,
    };
  }
}

// Export singleton instance
export const calendarWebhookManager = new CalendarWebhookManager();

