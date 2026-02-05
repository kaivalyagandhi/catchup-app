/**
 * Webhook Metrics Service Tests
 *
 * Tests webhook failure rate calculation and alert triggering.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import pool from '../db/connection';
import {
  calculateWebhookFailureRate,
  getUserWebhookMetrics,
  isFailureRateHigh,
  getRecentWebhookFailures,
} from './webhook-metrics-service';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID_2 = '00000000-0000-0000-0000-000000000002';

describe('Webhook Metrics Service', () => {
  beforeEach(async () => {
    // Create test users
    await pool.query(
      `INSERT INTO users (id, email, name, google_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [TEST_USER_ID, 'test1@example.com', 'Test User 1', 'google-test-1']
    );

    await pool.query(
      `INSERT INTO users (id, email, name, google_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [TEST_USER_ID_2, 'test2@example.com', 'Test User 2', 'google-test-2']
    );

    // Clean up test data
    await pool.query('DELETE FROM webhook_notifications WHERE user_id IN ($1, $2)', [
      TEST_USER_ID,
      TEST_USER_ID_2,
    ]);
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM webhook_notifications WHERE user_id IN ($1, $2)', [
      TEST_USER_ID,
      TEST_USER_ID_2,
    ]);
  });

  describe('calculateWebhookFailureRate', () => {
    it('should calculate failure rate correctly with mixed results', async () => {
      // Insert 10 notifications: 6 failures, 3 successes, 1 ignored
      const notifications = [
        { result: 'failure' },
        { result: 'failure' },
        { result: 'failure' },
        { result: 'failure' },
        { result: 'failure' },
        { result: 'failure' },
        { result: 'success' },
        { result: 'success' },
        { result: 'success' },
        { result: 'ignored' },
      ];

      for (const notification of notifications) {
        await pool.query(
          `INSERT INTO webhook_notifications 
           (user_id, channel_id, resource_id, resource_state, result, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [TEST_USER_ID, 'test-channel', 'test-resource', 'exists', notification.result]
        );
      }

      const metrics = await calculateWebhookFailureRate(24);

      expect(metrics.successCount).toBe(3);
      expect(metrics.failureCount).toBe(6);
      expect(metrics.ignoredCount).toBe(1);
      expect(metrics.totalCount).toBe(10);
      // Failure rate = 6 / (6 + 3) = 66.67%
      expect(metrics.failureRate).toBeCloseTo(66.67, 1);
    });

    it('should return 0% failure rate when all notifications succeed', async () => {
      // Insert 5 successful notifications
      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO webhook_notifications 
           (user_id, channel_id, resource_id, resource_state, result, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [TEST_USER_ID, 'test-channel', 'test-resource', 'exists', 'success']
        );
      }

      const metrics = await calculateWebhookFailureRate(24);

      expect(metrics.successCount).toBe(5);
      expect(metrics.failureCount).toBe(0);
      expect(metrics.failureRate).toBe(0);
    });

    it('should return 100% failure rate when all notifications fail', async () => {
      // Insert 5 failed notifications
      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO webhook_notifications 
           (user_id, channel_id, resource_id, resource_state, result, error_message, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [TEST_USER_ID, 'test-channel', 'test-resource', 'exists', 'failure', 'Test error']
        );
      }

      const metrics = await calculateWebhookFailureRate(24);

      expect(metrics.successCount).toBe(0);
      expect(metrics.failureCount).toBe(5);
      expect(metrics.failureRate).toBe(100);
    });

    it('should exclude ignored notifications from failure rate calculation', async () => {
      // Insert 5 ignored, 2 success, 1 failure
      // Failure rate should be 1 / (2 + 1) = 33.33%
      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO webhook_notifications 
           (user_id, channel_id, resource_id, resource_state, result, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [TEST_USER_ID, 'test-channel', 'test-resource', 'sync', 'ignored']
        );
      }

      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [TEST_USER_ID, 'test-channel', 'test-resource', 'exists', 'success']
      );

      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [TEST_USER_ID, 'test-channel', 'test-resource', 'exists', 'success']
      );

      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, error_message, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [TEST_USER_ID, 'test-channel', 'test-resource', 'exists', 'failure', 'Test error']
      );

      const metrics = await calculateWebhookFailureRate(24);

      expect(metrics.ignoredCount).toBe(5);
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.failureRate).toBeCloseTo(33.33, 1);
    });

    it('should only include notifications within time window', async () => {
      // Insert old notification (25 hours ago)
      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '25 hours')`,
        [TEST_USER_ID, 'test-channel', 'test-resource', 'exists', 'failure']
      );

      // Insert recent notification (1 hour ago)
      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '1 hour')`,
        [TEST_USER_ID, 'test-channel', 'test-resource', 'exists', 'success']
      );

      const metrics = await calculateWebhookFailureRate(24);

      // Should only count the recent notification
      expect(metrics.totalCount).toBe(1);
      expect(metrics.successCount).toBe(1);
      expect(metrics.failureCount).toBe(0);
    });
  });

  describe('getUserWebhookMetrics', () => {
    it('should return metrics for specific user only', async () => {
      // Insert notifications for user 1
      for (let i = 0; i < 3; i++) {
        await pool.query(
          `INSERT INTO webhook_notifications 
           (user_id, channel_id, resource_id, resource_state, result, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [TEST_USER_ID, 'test-channel', 'test-resource', 'exists', 'success']
        );
      }

      // Insert notifications for user 2
      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO webhook_notifications 
           (user_id, channel_id, resource_id, resource_state, result, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [TEST_USER_ID_2, 'test-channel', 'test-resource', 'exists', 'failure']
        );
      }

      const metrics = await getUserWebhookMetrics(TEST_USER_ID, 24);

      expect(metrics.totalCount).toBe(3);
      expect(metrics.successCount).toBe(3);
      expect(metrics.failureCount).toBe(0);
    });
  });

  describe('isFailureRateHigh', () => {
    it('should return true when failure rate exceeds threshold', () => {
      const metrics = {
        successCount: 3,
        failureCount: 7,
        ignoredCount: 0,
        totalCount: 10,
        failureRate: 70, // 70%
        timeWindowHours: 24,
      };

      expect(isFailureRateHigh(metrics, 5)).toBe(true);
    });

    it('should return false when failure rate is below threshold', () => {
      const metrics = {
        successCount: 97,
        failureCount: 3,
        ignoredCount: 0,
        totalCount: 100,
        failureRate: 3, // 3%
        timeWindowHours: 24,
      };

      expect(isFailureRateHigh(metrics, 5)).toBe(false);
    });

    it('should return false when failure rate equals threshold', () => {
      const metrics = {
        successCount: 95,
        failureCount: 5,
        ignoredCount: 0,
        totalCount: 100,
        failureRate: 5, // 5%
        timeWindowHours: 24,
      };

      expect(isFailureRateHigh(metrics, 5)).toBe(false);
    });
  });

  describe('getRecentWebhookFailures', () => {
    it('should return recent failures with details', async () => {
      // Insert some failures
      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, error_message, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [TEST_USER_ID, 'channel-1', 'resource-1', 'exists', 'failure', 'Error 1']
      );

      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, error_message, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [TEST_USER_ID, 'channel-2', 'resource-2', 'exists', 'failure', 'Error 2']
      );

      // Insert a success (should not be returned)
      await pool.query(
        `INSERT INTO webhook_notifications 
         (user_id, channel_id, resource_id, resource_state, result, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [TEST_USER_ID, 'channel-3', 'resource-3', 'exists', 'success']
      );

      const failures = await getRecentWebhookFailures(10, 24);

      expect(failures.length).toBe(2);
      expect(failures[0].errorMessage).toBe('Error 2'); // Most recent first
      expect(failures[1].errorMessage).toBe('Error 1');
    });

    it('should limit number of failures returned', async () => {
      // Insert 5 failures
      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO webhook_notifications 
           (user_id, channel_id, resource_id, resource_state, result, error_message, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [TEST_USER_ID, 'test-channel', 'test-resource', 'exists', 'failure', `Error ${i}`]
        );
      }

      const failures = await getRecentWebhookFailures(3, 24);

      expect(failures.length).toBe(3);
    });
  });

  describe('Webhook failure alert scenario', () => {
    it('should detect high failure rate and provide alert data', async () => {
      // Simulate 10 webhook notifications with 6 failures (60% failure rate)
      const notifications = [
        { result: 'failure', error: 'Invalid subscription' },
        { result: 'failure', error: 'Invalid subscription' },
        { result: 'failure', error: 'Expired webhook' },
        { result: 'failure', error: 'Expired webhook' },
        { result: 'failure', error: 'Network error' },
        { result: 'failure', error: 'Network error' },
        { result: 'success', error: null },
        { result: 'success', error: null },
        { result: 'success', error: null },
        { result: 'success', error: null },
      ];

      for (const notification of notifications) {
        await pool.query(
          `INSERT INTO webhook_notifications 
           (user_id, channel_id, resource_id, resource_state, result, error_message, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            TEST_USER_ID,
            'test-channel',
            'test-resource',
            'exists',
            notification.result,
            notification.error,
          ]
        );
      }

      // Calculate metrics
      const metrics = await calculateWebhookFailureRate(24);

      // Verify failure rate > 5%
      expect(metrics.failureRate).toBeGreaterThan(5);
      expect(metrics.failureRate).toBeCloseTo(60, 1);

      // Verify alert should be triggered
      expect(isFailureRateHigh(metrics, 5)).toBe(true);

      // Get recent failures for alert context
      const recentFailures = await getRecentWebhookFailures(5, 24);
      expect(recentFailures.length).toBe(5);
      expect(recentFailures.every((f) => f.errorMessage !== null)).toBe(true);
    });
  });
});
