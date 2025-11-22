/**
 * Queue Tests
 *
 * Tests for Bull queue configuration and setup
 */

import { describe, it, expect, afterAll } from 'vitest';
import {
  suggestionGenerationQueue,
  batchNotificationQueue,
  calendarSyncQueue,
  closeQueues,
  QUEUE_NAMES,
} from './queue';

describe('Job Queues', () => {
  afterAll(async () => {
    await closeQueues();
  });

  it('should create suggestion generation queue', () => {
    expect(suggestionGenerationQueue).toBeDefined();
    expect(suggestionGenerationQueue.name).toBe(
      QUEUE_NAMES.SUGGESTION_GENERATION
    );
  });

  it('should create batch notification queue', () => {
    expect(batchNotificationQueue).toBeDefined();
    expect(batchNotificationQueue.name).toBe(
      QUEUE_NAMES.BATCH_NOTIFICATIONS
    );
  });

  it('should create calendar sync queue', () => {
    expect(calendarSyncQueue).toBeDefined();
    expect(calendarSyncQueue.name).toBe(QUEUE_NAMES.CALENDAR_SYNC);
  });

  it('should have default job options configured', () => {
    const defaultOptions = suggestionGenerationQueue.defaultJobOptions;
    expect(defaultOptions).toBeDefined();
    expect(defaultOptions?.attempts).toBe(3);
    expect(defaultOptions?.backoff).toEqual({
      type: 'exponential',
      delay: 2000,
    });
  });
});
