import Bull from 'bull';
import Redis from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create Redis clients for Bull
const createRedisClient = () => new Redis(redisConfig);

// Job queue names
export const QUEUE_NAMES = {
  SUGGESTION_GENERATION: 'suggestion-generation',
  BATCH_NOTIFICATIONS: 'batch-notifications',
  CALENDAR_SYNC: 'calendar-sync',
  SUGGESTION_REGENERATION: 'suggestion-regeneration',
  GOOGLE_CONTACTS_SYNC: 'google-contacts-sync',
} as const;

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
export const suggestionGenerationQueue = new Bull(
  QUEUE_NAMES.SUGGESTION_GENERATION,
  {
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
  }
);

export const batchNotificationQueue = new Bull(
  QUEUE_NAMES.BATCH_NOTIFICATIONS,
  {
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
  }
);

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

// Queue event handlers for logging
suggestionGenerationQueue.on('error', (error) => {
  console.error('Suggestion generation queue error:', error);
});

suggestionGenerationQueue.on('failed', (job, error) => {
  console.error(
    `Suggestion generation job ${job.id} failed:`,
    error.message
  );
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

googleContactsSyncQueue.on('failed', (job, error) => {
  console.error(`Google Contacts sync job ${job.id} failed:`, error.message);
});

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  await Promise.all([
    suggestionGenerationQueue.close(),
    batchNotificationQueue.close(),
    calendarSyncQueue.close(),
    googleContactsSyncQueue.close(),
    suggestionRegenerationQueue.close(),
  ]);
}

/**
 * Enqueue a job to a specific queue
 */
export async function enqueueJob(
  queueName: keyof typeof QUEUE_NAMES,
  data: any,
  options?: Bull.JobOptions
): Promise<Bull.Job> {
  const queueMap = {
    'suggestion-generation': suggestionGenerationQueue,
    'batch-notifications': batchNotificationQueue,
    'calendar-sync': calendarSyncQueue,
    'suggestion-regeneration': suggestionRegenerationQueue,
  };

  const queue = queueMap[queueName];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  return queue.add(data, options);
}
