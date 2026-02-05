/**
 * Webhook Health Check Processor Tests
 *
 * Tests the webhook health check job processor.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Job } from 'bull';
import {
  processWebhookHealthCheck,
  WebhookHealthCheckJobData,
} from './webhook-health-check-processor';
import pool from '../../db/connection';
import { calendarWebhookManager } from '../../integrations/calendar-webhook-manager';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID_2 = '00000000-0000-0000-0000-000000000002';

describe('Webhook Health Check Processor', () => {
  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM webhook_notifications WHERE user_id IN ($1, $2)', [
      TEST_USER_ID,
      TEST_USER_ID_2,
    ]);
    await pool.query('DELETE FROM calendar_webhook_subscriptions WHERE user_id IN ($1, $2)', [
      TEST_USER_ID,
      TEST_USER_ID_2,
    ]);
    await pool.query('DELETE FROM oauth_tokens WHERE user_id IN ($1, $2)', [
      TEST_USER_ID,
      TEST_USER_ID_2,
    ]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [TEST_USER_ID, TEST_USER_ID_2]);

    // Create test users
    await pool.query(
      `INSERT INTO users (id, email, name, google_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [TEST_USER_ID, `test-${Date.now()}@example.com`, 'Test User 1', 'google-test-1']
    );

    await pool.query(
      `INSERT INTO users (id, email, name, google_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [TEST_USER_ID_2, `test-${Date.now()}-2@example.com`, 'Test User 2', 'google-test-2']
    );
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM webhook_notifications WHERE user_id IN ($1, $2)', [
      TEST_USER_ID,
      TEST_USER_ID_2,
    ]);
    await pool.query('DELETE FROM calendar_webhook_subscriptions WHERE user_id IN ($1, $2)', [
      TEST_USER_ID,
      TEST_USER_ID_2,
    ]);
    await pool.query('DELETE FROM oauth_tokens WHERE user_id IN ($1, $2)', [
      TEST_USER_ID,
      TEST_USER_ID_2,
    ]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [TEST_USER_ID, TEST_USER_ID_2]);
  });

  describe('processWebhookHealthCheck', () => {
    it('should detect webhooks with no recent notifications', async () => {
      // Create a webhook subscription with no notifications
      await pool.query(
        `INSERT INTO calendar_webhook_subscriptions 
         (user_id, channel_id, resource_id, resource_uri, expiration, token)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          TEST_USER_ID,
          'test-channel-1',
          'test-resource-1',
          'https://example.com',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
          'test-token-1',
        ]
      );

      // Create a notification that's 49 hours old (stale)
      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          TEST_USER_ID,
          'test-channel-1',
          'test-resource-1',
          'exists',
          'success',
          new Date(Date.now() - 49 * 60 * 60 * 1000), // 49 hours ago
        ]
      );

      // Create mock job
      const mockJob = {
        id: 'test-job-1',
        data: {},
      } as Job<WebhookHealthCheckJobData>;

      // Process the job
      const result = await processWebhookHealthCheck(mockJob);

      // Verify results
      expect(result.totalWebhooks).toBe(1);
      expect(result.staleWebhooks).toBe(1);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0]).toContain('has not received notifications');
    });

    it('should detect webhooks expiring within 24 hours', async () => {
      // Create a webhook subscription expiring in 12 hours
      await pool.query(
        `INSERT INTO calendar_webhook_subscriptions 
         (user_id, channel_id, resource_id, resource_uri, expiration, token)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          TEST_USER_ID,
          'test-channel-2',
          'test-resource-2',
          'https://example.com',
          new Date(Date.now() + 12 * 60 * 60 * 1000), // Expires in 12 hours
          'test-token-2',
        ]
      );

      // Create a recent notification (not stale)
      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          TEST_USER_ID,
          'test-channel-2',
          'test-resource-2',
          'exists',
          'success',
          new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        ]
      );

      // Create mock job
      const mockJob = {
        id: 'test-job-2',
        data: {},
      } as Job<WebhookHealthCheckJobData>;

      // Process the job
      const result = await processWebhookHealthCheck(mockJob);

      // Verify results
      expect(result.totalWebhooks).toBe(1);
      expect(result.expiringWebhooks).toBe(1);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts.some((alert) => alert.includes('expires in'))).toBe(true);
    });

    it('should handle webhooks with no notifications at all', async () => {
      // Create a webhook subscription with no notifications
      await pool.query(
        `INSERT INTO calendar_webhook_subscriptions 
         (user_id, channel_id, resource_id, resource_uri, expiration, token)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          TEST_USER_ID,
          'test-channel-3',
          'test-resource-3',
          'https://example.com',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
          'test-token-3',
        ]
      );

      // Don't create any notifications

      // Create mock job
      const mockJob = {
        id: 'test-job-3',
        data: {},
      } as Job<WebhookHealthCheckJobData>;

      // Process the job
      const result = await processWebhookHealthCheck(mockJob);

      // Verify results
      expect(result.totalWebhooks).toBe(1);
      expect(result.staleWebhooks).toBe(1);
      expect(result.alerts.length).toBeGreaterThan(0);
    });

    it('should not flag healthy webhooks', async () => {
      // Create a webhook subscription with recent notifications
      await pool.query(
        `INSERT INTO calendar_webhook_subscriptions 
         (user_id, channel_id, resource_id, resource_uri, expiration, token)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          TEST_USER_ID,
          'test-channel-4',
          'test-resource-4',
          'https://example.com',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
          'test-token-4',
        ]
      );

      // Create a recent notification (within 48 hours)
      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          TEST_USER_ID,
          'test-channel-4',
          'test-resource-4',
          'exists',
          'success',
          new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        ]
      );

      // Create mock job
      const mockJob = {
        id: 'test-job-4',
        data: {},
      } as Job<WebhookHealthCheckJobData>;

      // Process the job
      const result = await processWebhookHealthCheck(mockJob);

      // Verify results
      expect(result.totalWebhooks).toBe(1);
      expect(result.staleWebhooks).toBe(0);
      expect(result.expiringWebhooks).toBe(0);
      expect(result.alerts.length).toBe(0);
    });

    it('should handle multiple webhooks', async () => {
      // Create multiple webhook subscriptions
      await pool.query(
        `INSERT INTO calendar_webhook_subscriptions 
         (user_id, channel_id, resource_id, resource_uri, expiration, token)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          TEST_USER_ID,
          'test-channel-5',
          'test-resource-5',
          'https://example.com',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          'test-token-5',
        ]
      );

      await pool.query(
        `INSERT INTO calendar_webhook_subscriptions 
         (user_id, channel_id, resource_id, resource_uri, expiration, token)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          TEST_USER_ID_2,
          'test-channel-6',
          'test-resource-6',
          'https://example.com',
          new Date(Date.now() + 12 * 60 * 60 * 1000), // Expires in 12 hours
          'test-token-6',
        ]
      );

      // Create notifications
      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          TEST_USER_ID,
          'test-channel-5',
          'test-resource-5',
          'exists',
          'success',
          new Date(Date.now() - 49 * 60 * 60 * 1000), // Stale
        ]
      );

      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          TEST_USER_ID_2,
          'test-channel-6',
          'test-resource-6',
          'exists',
          'success',
          new Date(Date.now() - 1 * 60 * 60 * 1000), // Recent
        ]
      );

      // Create mock job
      const mockJob = {
        id: 'test-job-5',
        data: {},
      } as Job<WebhookHealthCheckJobData>;

      // Process the job
      const result = await processWebhookHealthCheck(mockJob);

      // Verify results
      expect(result.totalWebhooks).toBe(2);
      expect(result.staleWebhooks).toBe(1);
      expect(result.expiringWebhooks).toBe(1);
      expect(result.alerts.length).toBeGreaterThan(0);
    });
  });
});
