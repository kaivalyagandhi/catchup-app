/**
 * BullMQ Queue Definitions
 *
 * This file replaces queue.ts with BullMQ-based queues that use
 * a shared connection pool, reducing Redis connections from 33 to 1-3.
 *
 * Key improvements over Bull:
 * - Shared connection pool (1-3 connections vs 33)
 * - Better TypeScript support
 * - More efficient Redis usage
 * - Modern API with async/await
 */

import { Queue, JobsOptions } from 'bullmq';
import { createQueue } from './queue-factory';

// Job queue names (same as Bull for compatibility)
export const QUEUE_NAMES = {
  SUGGESTION_GENERATION: 'suggestion-generation',
  BATCH_NOTIFICATIONS: 'batch-notifications',
  CALENDAR_SYNC: 'calendar-sync',
  SUGGESTION_REGENERATION: 'suggestion-regeneration',
  GOOGLE_CONTACTS_SYNC: 'google-contacts-sync',
  TOKEN_HEALTH_REMINDER: 'token-health-reminder',
  TOKEN_REFRESH: 'token-refresh',
  WEBHOOK_RENEWAL: 'webhook-renewal',
  NOTIFICATION_REMINDER: 'notification-reminder',
  ADAPTIVE_SYNC: 'adaptive-sync',
  WEBHOOK_HEALTH_CHECK: 'webhook-health-check',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Default job options with exponential backoff
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2 seconds
  },
  removeOnComplete: true,
  removeOnFail: false, // Keep failed jobs for debugging
};

// Create all queues using the factory (shares connection pool)
export const suggestionGenerationQueue = createQueue(
  QUEUE_NAMES.SUGGESTION_GENERATION,
  {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

export const batchNotificationQueue = createQueue(
  QUEUE_NAMES.BATCH_NOTIFICATIONS,
  {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

export const calendarSyncQueue = createQueue(QUEUE_NAMES.CALENDAR_SYNC, {
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const suggestionRegenerationQueue = createQueue(
  QUEUE_NAMES.SUGGESTION_REGENERATION,
  {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

export const googleContactsSyncQueue = createQueue(
  QUEUE_NAMES.GOOGLE_CONTACTS_SYNC,
  {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

export const tokenHealthReminderQueue = createQueue(
  QUEUE_NAMES.TOKEN_HEALTH_REMINDER,
  {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

export const tokenRefreshQueue = createQueue(QUEUE_NAMES.TOKEN_REFRESH, {
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const webhookRenewalQueue = createQueue(QUEUE_NAMES.WEBHOOK_RENEWAL, {
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const notificationReminderQueue = createQueue(
  QUEUE_NAMES.NOTIFICATION_REMINDER,
  {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

export const adaptiveSyncQueue = createQueue(QUEUE_NAMES.ADAPTIVE_SYNC, {
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const webhookHealthCheckQueue = createQueue(
  QUEUE_NAMES.WEBHOOK_HEALTH_CHECK,
  {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

/**
 * Enqueue a job to a specific queue
 *
 * Compatible with Bull API for easy migration.
 */
export async function enqueueJob(
  queueName: QueueName,
  data: any,
  options?: JobsOptions
): Promise<any> {
  const queueMap: Record<QueueName, Queue> = {
    [QUEUE_NAMES.SUGGESTION_GENERATION]: suggestionGenerationQueue,
    [QUEUE_NAMES.BATCH_NOTIFICATIONS]: batchNotificationQueue,
    [QUEUE_NAMES.CALENDAR_SYNC]: calendarSyncQueue,
    [QUEUE_NAMES.SUGGESTION_REGENERATION]: suggestionRegenerationQueue,
    [QUEUE_NAMES.GOOGLE_CONTACTS_SYNC]: googleContactsSyncQueue,
    [QUEUE_NAMES.TOKEN_HEALTH_REMINDER]: tokenHealthReminderQueue,
    [QUEUE_NAMES.TOKEN_REFRESH]: tokenRefreshQueue,
    [QUEUE_NAMES.WEBHOOK_RENEWAL]: webhookRenewalQueue,
    [QUEUE_NAMES.NOTIFICATION_REMINDER]: notificationReminderQueue,
    [QUEUE_NAMES.ADAPTIVE_SYNC]: adaptiveSyncQueue,
    [QUEUE_NAMES.WEBHOOK_HEALTH_CHECK]: webhookHealthCheckQueue,
  };

  const queue = queueMap[queueName];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  // BullMQ requires a job name as first parameter
  // Use queue name as job name for consistency
  return queue.add(queueName, data, options);
}

/**
 * Graceful shutdown
 *
 * Note: Workers are closed separately in bullmq-worker.ts
 * This only closes the queue connections.
 */
export async function closeQueues(): Promise<void> {
  console.log('[BullMQ Queues] Closing all queues...');

  await Promise.all([
    suggestionGenerationQueue.close(),
    batchNotificationQueue.close(),
    calendarSyncQueue.close(),
    suggestionRegenerationQueue.close(),
    googleContactsSyncQueue.close(),
    tokenHealthReminderQueue.close(),
    tokenRefreshQueue.close(),
    webhookRenewalQueue.close(),
    notificationReminderQueue.close(),
    adaptiveSyncQueue.close(),
    webhookHealthCheckQueue.close(),
  ]);

  console.log('[BullMQ Queues] All queues closed');
}

