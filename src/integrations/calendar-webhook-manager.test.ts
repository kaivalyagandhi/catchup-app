/**
 * Calendar Webhook Manager Tests
 *
 * Tests webhook registration retry logic with exponential backoff
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalendarWebhookManager } from './calendar-webhook-manager';
import { google } from 'googleapis';
import pool from '../db/connection';
import { adaptiveSyncScheduler } from './adaptive-sync-scheduler';

// Mock dependencies
vi.mock('googleapis');
vi.mock('../db/connection');
vi.mock('./adaptive-sync-scheduler');
vi.mock('./google-calendar-config', () => ({
  getOAuth2Client: vi.fn(() => ({})),
}));

describe('CalendarWebhookManager - Registration Retry', () => {
  let webhookManager: CalendarWebhookManager;
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
  const TEST_ACCESS_TOKEN = 'test-access-token';
  const TEST_REFRESH_TOKEN = 'test-refresh-token';

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create webhook manager instance
    webhookManager = new CalendarWebhookManager('http://localhost:3000/api/webhooks/calendar');

    // Mock pool.query for logging
    vi.mocked(pool.query).mockResolvedValue({
      rows: [],
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
    } as any);

    // Mock adaptive sync scheduler
    vi.mocked(adaptiveSyncScheduler.setWebhookFallbackFrequency).mockResolvedValue(undefined);
    vi.mocked(adaptiveSyncScheduler.restoreNormalPollingFrequency).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerWebhook with retry logic', () => {
    it('should succeed on first attempt', async () => {
      // Mock successful Google Calendar API response
      const mockWatch = vi.fn().mockResolvedValue({
        data: {
          id: 'test-channel-id',
          resourceId: 'test-resource-id',
          resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
      });

      vi.mocked(google.calendar).mockReturnValue({
        events: {
          watch: mockWatch,
        },
      } as any);

      // Mock database insert for storing subscription
      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [
          {
            id: 'subscription-id',
            user_id: TEST_USER_ID,
            channel_id: 'test-channel-id',
            resource_id: 'test-resource-id',
            resource_uri: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            token: 'test-token',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      // Execute
      const result = await webhookManager.registerWebhook(
        TEST_USER_ID,
        TEST_ACCESS_TOKEN,
        TEST_REFRESH_TOKEN
      );

      // Verify
      expect(mockWatch).toHaveBeenCalledTimes(1);
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.channelId).toBe('test-channel-id');
      expect(adaptiveSyncScheduler.setWebhookFallbackFrequency).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should retry up to 3 times with exponential backoff and succeed on 3rd attempt', async () => {
      // Mock Google Calendar API to fail first 2 attempts, succeed on 3rd
      const mockWatch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          data: {
            id: 'test-channel-id',
            resourceId: 'test-resource-id',
            resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

      vi.mocked(google.calendar).mockReturnValue({
        events: {
          watch: mockWatch,
        },
      } as any);

      // Mock database insert for storing subscription
      vi.mocked(pool.query).mockResolvedValue({
        rows: [
          {
            id: 'subscription-id',
            user_id: TEST_USER_ID,
            channel_id: 'test-channel-id',
            resource_id: 'test-resource-id',
            resource_uri: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            token: 'test-token',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      // Mock setTimeout to avoid actual delays in tests
      vi.useFakeTimers();

      // Execute (don't await yet)
      const promise = webhookManager.registerWebhook(
        TEST_USER_ID,
        TEST_ACCESS_TOKEN,
        TEST_REFRESH_TOKEN
      );

      // Fast-forward through backoff delays
      // First retry: 2s delay
      await vi.advanceTimersByTimeAsync(2000);
      // Second retry: 4s delay
      await vi.advanceTimersByTimeAsync(4000);

      // Wait for completion
      const result = await promise;

      // Verify
      expect(mockWatch).toHaveBeenCalledTimes(3);
      expect(result.userId).toBe(TEST_USER_ID);
      expect(adaptiveSyncScheduler.setWebhookFallbackFrequency).toHaveBeenCalledWith(TEST_USER_ID);

      // Verify logging was called for each attempt
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_notifications'),
        expect.arrayContaining([TEST_USER_ID])
      );

      vi.useRealTimers();
    });

    it('should fall back to polling after 3 failed attempts', async () => {
      // Mock Google Calendar API to fail all 3 attempts
      const mockWatch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Service unavailable'));

      vi.mocked(google.calendar).mockReturnValue({
        events: {
          watch: mockWatch,
        },
      } as any);

      // Mock setTimeout to avoid actual delays in tests
      vi.useFakeTimers();

      // Execute (don't await yet)
      const promise = webhookManager.registerWebhook(
        TEST_USER_ID,
        TEST_ACCESS_TOKEN,
        TEST_REFRESH_TOKEN
      );

      // Fast-forward through backoff delays
      await vi.advanceTimersByTimeAsync(2000); // First retry
      await vi.advanceTimersByTimeAsync(4000); // Second retry

      // Wait for completion (should throw)
      await expect(promise).rejects.toThrow('Webhook registration failed after 3 attempts');

      // Verify
      expect(mockWatch).toHaveBeenCalledTimes(3);
      expect(adaptiveSyncScheduler.restoreNormalPollingFrequency).toHaveBeenCalledWith(
        TEST_USER_ID
      );

      // Verify failure logging was called for each attempt
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_notifications'),
        expect.arrayContaining([TEST_USER_ID])
      );

      vi.useRealTimers();
    });

    it('should use exponential backoff delays (2s, 4s, 8s)', async () => {
      // Mock Google Calendar API to fail all attempts
      const mockWatch = vi.fn().mockRejectedValue(new Error('Network error'));

      vi.mocked(google.calendar).mockReturnValue({
        events: {
          watch: mockWatch,
        },
      } as any);

      // Mock setTimeout to track delays
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // Execute (don't await yet)
      const promise = webhookManager.registerWebhook(
        TEST_USER_ID,
        TEST_ACCESS_TOKEN,
        TEST_REFRESH_TOKEN
      );

      // Fast-forward through delays
      await vi.advanceTimersByTimeAsync(2000); // First retry delay
      await vi.advanceTimersByTimeAsync(4000); // Second retry delay

      // Wait for completion
      await expect(promise).rejects.toThrow();

      // Verify exponential backoff delays
      // First delay: 2^1 * 1000 = 2000ms
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
      // Second delay: 2^2 * 1000 = 4000ms
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 4000);

      vi.useRealTimers();
    });

    it('should log registration_success event on success', async () => {
      // Mock successful Google Calendar API response
      const mockWatch = vi.fn().mockResolvedValue({
        data: {
          id: 'test-channel-id',
          resourceId: 'test-resource-id',
          resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      vi.mocked(google.calendar).mockReturnValue({
        events: {
          watch: mockWatch,
        },
      } as any);

      // Mock database queries
      const mockQuery = vi.mocked(pool.query);
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'subscription-id',
            user_id: TEST_USER_ID,
            channel_id: 'test-channel-id',
            resource_id: 'test-resource-id',
            resource_uri: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            token: 'test-token',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      // Execute
      await webhookManager.registerWebhook(TEST_USER_ID, TEST_ACCESS_TOKEN, TEST_REFRESH_TOKEN);

      // Verify registration_success was logged
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_notifications'),
        expect.arrayContaining([
          TEST_USER_ID,
          expect.any(String), // channel_id
          'registration_success',
          'registration_attempt_1',
          'success',
          null, // no error message
        ])
      );
    });

    it('should log registration_failure events on each failed attempt', async () => {
      // Mock Google Calendar API to fail all attempts
      const mockWatch = vi.fn().mockRejectedValue(new Error('Network error'));

      vi.mocked(google.calendar).mockReturnValue({
        events: {
          watch: mockWatch,
        },
      } as any);

      // Mock setTimeout to avoid actual delays
      vi.useFakeTimers();

      // Execute
      const promise = webhookManager.registerWebhook(
        TEST_USER_ID,
        TEST_ACCESS_TOKEN,
        TEST_REFRESH_TOKEN
      );

      // Fast-forward through delays
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      // Wait for completion
      await expect(promise).rejects.toThrow();

      // Verify registration_failure was logged for each attempt
      const mockQuery = vi.mocked(pool.query);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_notifications'),
        expect.arrayContaining([
          TEST_USER_ID,
          'attempt-1',
          'registration_failure',
          'registration_attempt_1',
          'failure',
          'Network error',
        ])
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_notifications'),
        expect.arrayContaining([
          TEST_USER_ID,
          'attempt-2',
          'registration_failure',
          'registration_attempt_2',
          'failure',
          'Network error',
        ])
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_notifications'),
        expect.arrayContaining([
          TEST_USER_ID,
          'attempt-3',
          'registration_failure',
          'registration_attempt_3',
          'failure',
          'Network error',
        ])
      );

      vi.useRealTimers();
    });
  });
});
