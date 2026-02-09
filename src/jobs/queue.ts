import Bull from 'bull';
import Redis, { RedisOptions } from 'ioredis';

// Redis connection configuration
// Supports both local Redis and Upstash (serverless Redis with TLS)
const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  // TLS support for Upstash and other cloud Redis providers
  // Set REDIS_TLS=true for Upstash connections
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Log Redis configuration on startup (without password)
console.log('[Redis Queue] Connecting to Redis:', {
  host: redisConfig.host,
  port: redisConfig.port,
  tls: redisConfig.tls ? 'enabled' : 'disabled',
  passwordSet: !!redisConfig.password,
});

// Create Redis clients for Bull
const createRedisClient = () => {
  const client = new Redis(redisConfig);

  // Log connection events
  client.on('connect', () => {
    console.log('[Redis Queue] Connected to Redis successfully');
  });

  client.on('ready', () => {
    console.log('[Redis Queue] Redis client ready');
  });

  client.on('error', (error) => {
    console.error('[Redis Queue] Redis connection error:', error.message);
  });

  client.on('close', () => {
    console.log('[Redis Queue] Redis connection closed');
  });

  return client;
};

// Job queue names
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
export const DEFAULT_JOB_OPTIONS: Bull.JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2 seconds
  },
  removeOnComplete: true,
  removeOnFail: false, // Keep failed jobs for debugging
};

// Create queues
export const suggestionGenerationQueue = new Bull(QUEUE_NAMES.SUGGESTION_GENERATION, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const batchNotificationQueue = new Bull(QUEUE_NAMES.BATCH_NOTIFICATIONS, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const calendarSyncQueue = new Bull(QUEUE_NAMES.CALENDAR_SYNC, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const suggestionRegenerationQueue = new Bull(QUEUE_NAMES.SUGGESTION_REGENERATION, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const googleContactsSyncQueue = new Bull(QUEUE_NAMES.GOOGLE_CONTACTS_SYNC, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const tokenHealthReminderQueue = new Bull(QUEUE_NAMES.TOKEN_HEALTH_REMINDER, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const tokenRefreshQueue = new Bull(QUEUE_NAMES.TOKEN_REFRESH, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const webhookRenewalQueue = new Bull(QUEUE_NAMES.WEBHOOK_RENEWAL, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const notificationReminderQueue = new Bull(QUEUE_NAMES.NOTIFICATION_REMINDER, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const adaptiveSyncQueue = new Bull(QUEUE_NAMES.ADAPTIVE_SYNC, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const webhookHealthCheckQueue = new Bull(QUEUE_NAMES.WEBHOOK_HEALTH_CHECK, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return createRedisClient();
      case 'subscriber':
        return createRedisClient();
      case 'bclient':
        return createRedisClient();
      default:
        return createRedisClient();
    }
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

// Queue event handlers for logging
suggestionGenerationQueue.on('error', (error) => {
  console.error('Suggestion generation queue error:', error);
});

suggestionGenerationQueue.on('failed', (job, error) => {
  console.error(`Suggestion generation job ${job.id} failed:`, error.message);
});

batchNotificationQueue.on('error', (error) => {
  console.error('Batch notification queue error:', error);
});

batchNotificationQueue.on('failed', (job, error) => {
  console.error(`Batch notification job ${job.id} failed:`, error.message);
});

calendarSyncQueue.on('error', (error) => {
  console.error('Calendar sync queue error:', error);
});

calendarSyncQueue.on('failed', (job, error) => {
  console.error(`Calendar sync job ${job.id} failed:`, error.message);
});

suggestionRegenerationQueue.on('error', (error) => {
  console.error('Suggestion regeneration queue error:', error);
});

suggestionRegenerationQueue.on('failed', (job, error) => {
  console.error(`Suggestion regeneration job ${job.id} failed:`, error.message);
});

googleContactsSyncQueue.on('error', (error) => {
  console.error('Google Contacts sync queue error:', error);
});

googleContactsSyncQueue.on('failed', async (job, error) => {
  console.error(`Google Contacts sync job ${job.id} failed:`, error.message);

  // Clean up sync state on failure
  try {
    const { markSyncFailed } = await import('../integrations/sync-state-repository');
    await markSyncFailed(job.data.userId, error.message);
  } catch (cleanupError) {
    console.error('Failed to clean up sync state:', cleanupError);
  }
});

googleContactsSyncQueue.on('completed', async (job) => {
  console.log(`Google Contacts sync job ${job.id} completed successfully`);
});

tokenHealthReminderQueue.on('error', (error) => {
  console.error('Token health reminder queue error:', error);
});

tokenHealthReminderQueue.on('failed', (job, error) => {
  console.error(`Token health reminder job ${job.id} failed:`, error.message);
});

tokenHealthReminderQueue.on('completed', (job, result) => {
  console.log(`Token health reminder job ${job.id} completed:`, result);
});

// Token refresh queue events
tokenRefreshQueue.on('error', (error) => {
  console.error('Token refresh queue error:', error);
});

tokenRefreshQueue.on('failed', (job, error) => {
  console.error(`Token refresh job ${job.id} failed:`, error.message);
});

tokenRefreshQueue.on('completed', (job, result) => {
  console.log(`Token refresh job ${job.id} completed:`, result);

  // Alert on high failure rate
  if (result.highFailureRate) {
    console.error(`ALERT: High token refresh failure rate detected!`);
  }
});

// Webhook renewal queue events
webhookRenewalQueue.on('error', (error) => {
  console.error('Webhook renewal queue error:', error);
});

webhookRenewalQueue.on('failed', (job, error) => {
  console.error(`Webhook renewal job ${job.id} failed:`, error.message);
});

webhookRenewalQueue.on('completed', (job, result) => {
  console.log(`Webhook renewal job ${job.id} completed:`, result);

  // Alert on high failure rate
  if (result.highFailureRate) {
    console.error(`ALERT: High webhook renewal failure rate detected!`);
  }
});

// Notification reminder queue events
notificationReminderQueue.on('error', (error) => {
  console.error('Notification reminder queue error:', error);
});

notificationReminderQueue.on('failed', (job, error) => {
  console.error(`Notification reminder job ${job.id} failed:`, error.message);
});

notificationReminderQueue.on('completed', (job, result) => {
  console.log(`Notification reminder job ${job.id} completed:`, result);
});

// Adaptive sync queue events
adaptiveSyncQueue.on('error', (error) => {
  console.error('Adaptive sync queue error:', error);
});

adaptiveSyncQueue.on('failed', (job, error) => {
  console.error(`Adaptive sync job ${job.id} failed:`, error.message);
});

adaptiveSyncQueue.on('completed', (job, result) => {
  console.log(`Adaptive sync job ${job.id} completed:`, result);
});

// Webhook health check queue events
webhookHealthCheckQueue.on('error', (error) => {
  console.error('Webhook health check queue error:', error);
});

webhookHealthCheckQueue.on('failed', (job, error) => {
  console.error(`Webhook health check job ${job.id} failed:`, error.message);
});

webhookHealthCheckQueue.on('completed', (job, result) => {
  console.log(`Webhook health check job ${job.id} completed:`, result);

  // Alert on high failure rate or many stale webhooks
  if (result.alerts && result.alerts.length > 0) {
    console.warn(`WEBHOOK HEALTH ALERTS: ${result.alerts.length} issues detected`);
    result.alerts.forEach((alert: string) => console.warn(`  - ${alert}`));
  }
});

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  await Promise.all([
    suggestionGenerationQueue.close(),
    batchNotificationQueue.close(),
    calendarSyncQueue.close(),
    googleContactsSyncQueue.close(),
    suggestionRegenerationQueue.close(),
    tokenHealthReminderQueue.close(),
    tokenRefreshQueue.close(),
    webhookRenewalQueue.close(),
    notificationReminderQueue.close(),
    adaptiveSyncQueue.close(),
    webhookHealthCheckQueue.close(),
  ]);
}

/**
 * Enqueue a job to a specific queue
 */
export async function enqueueJob(
  queueName: QueueName,
  data: any,
  options?: Bull.JobOptions
): Promise<Bull.Job> {
  const queueMap: Record<QueueName, Bull.Queue> = {
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

  return queue.add(data, options);
}
