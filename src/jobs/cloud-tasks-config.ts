/**
 * Cloud Tasks Queue Configuration
 * 
 * Defines retry policies and rate limits for all 11 job queues.
 * These configurations match the queues created in GCP.
 */

export interface QueueConfig {
  name: string;
  retryConfig: {
    maxAttempts: number;
    minBackoff: string;
    maxBackoff: string;
    maxDoublings: number;
  };
  rateLimits?: {
    maxDispatchesPerSecond?: number;
    maxConcurrentDispatches?: number;
  };
}

export const QUEUE_CONFIGS: Record<string, QueueConfig> = {
  'token-refresh': {
    name: 'token-refresh-queue',
    retryConfig: {
      maxAttempts: 3,
      minBackoff: '60s',
      maxBackoff: '3600s',
      maxDoublings: 2
    },
    rateLimits: {
      maxDispatchesPerSecond: 10
    }
  },
  'calendar-sync': {
    name: 'calendar-sync-queue',
    retryConfig: {
      maxAttempts: 5,
      minBackoff: '30s',
      maxBackoff: '1800s',
      maxDoublings: 3
    },
    rateLimits: {
      maxDispatchesPerSecond: 20
    }
  },
  'google-contacts-sync': {
    name: 'google-contacts-sync-queue',
    retryConfig: {
      maxAttempts: 5,
      minBackoff: '30s',
      maxBackoff: '1800s',
      maxDoublings: 3
    },
    rateLimits: {
      maxDispatchesPerSecond: 10
    }
  },
  'adaptive-sync': {
    name: 'adaptive-sync-queue',
    retryConfig: {
      maxAttempts: 5,
      minBackoff: '10s',
      maxBackoff: '300s',
      maxDoublings: 3
    }
  },
  'webhook-renewal': {
    name: 'webhook-renewal-queue',
    retryConfig: {
      maxAttempts: 5,
      minBackoff: '30s',
      maxBackoff: '1800s',
      maxDoublings: 3
    }
  },
  'suggestion-regeneration': {
    name: 'suggestion-regeneration-queue',
    retryConfig: {
      maxAttempts: 3,
      minBackoff: '60s',
      maxBackoff: '3600s',
      maxDoublings: 2
    }
  },
  'batch-notifications': {
    name: 'batch-notifications-queue',
    retryConfig: {
      maxAttempts: 5,
      minBackoff: '10s',
      maxBackoff: '300s',
      maxDoublings: 3
    },
    rateLimits: {
      maxDispatchesPerSecond: 50
    }
  },
  'suggestion-generation': {
    name: 'suggestion-generation-queue',
    retryConfig: {
      maxAttempts: 3,
      minBackoff: '60s',
      maxBackoff: '3600s',
      maxDoublings: 2
    }
  },
  'webhook-health-check': {
    name: 'webhook-health-check-queue',
    retryConfig: {
      maxAttempts: 3,
      minBackoff: '30s',
      maxBackoff: '900s',
      maxDoublings: 2
    }
  },
  'notification-reminder': {
    name: 'notification-reminder-queue',
    retryConfig: {
      maxAttempts: 3,
      minBackoff: '60s',
      maxBackoff: '1800s',
      maxDoublings: 2
    }
  },
  'token-health-reminder': {
    name: 'token-health-reminder-queue',
    retryConfig: {
      maxAttempts: 3,
      minBackoff: '60s',
      maxBackoff: '1800s',
      maxDoublings: 2
    }
  }
};

/**
 * Get queue configuration by job name
 */
export function getQueueConfig(jobName: string): QueueConfig {
  const config = QUEUE_CONFIGS[jobName];
  if (!config) {
    throw new Error(`Unknown job type: ${jobName}`);
  }
  return config;
}

/**
 * Get all queue names
 */
export function getAllQueueNames(): string[] {
  return Object.keys(QUEUE_CONFIGS);
}
