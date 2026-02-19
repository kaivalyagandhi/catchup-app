# Cloud Tasks Migration: Serverless-Native Job Queue Architecture - Design Document

## 1. Overview

### 1.1 Problem Statement

The current job queue system uses BullMQ with TCP-based Redis connections (ioredis), which is fundamentally incompatible with serverless Cloud Run environments. This causes:

- **Production failures**: All 11 BullMQ workers failing with "Stream isn't writeable" errors
- **Zombie connections**: Containers freeze → TCP connections killed → ETIMEDOUT errors  
- **Architectural mismatch**: BullMQ requires persistent connections; Cloud Run containers freeze/thaw unpredictably
- **Cost inefficiency**: Paying $2.53/month for Upstash Redis that doesn't work properly

**Root Cause**: Upstash explicitly states that TCP-based clients (ioredis/BullMQ) are incompatible with serverless due to the zombie connection problem. They recommend HTTP-based clients only.

### 1.2 Solution Summary

Migrate to Google Cloud Tasks, which uses stateless HTTP requests designed specifically for serverless environments:

- **HTTP-based architecture**: No TCP connection issues
- **Native Cloud Run integration**: Official Google tutorial and OIDC authentication
- **Cost reduction**: $0/month (free tier) vs $2.53/month (Upstash)
- **Built-in features**: Automatic retry, exponential backoff, monitoring
- **Production-ready**: Used by thousands of GCP customers

### 1.3 Expected Outcomes

- Eliminate all BullMQ connection failures (100% → 0% error rate)
- Achieve >99.9% job execution success rate
- Reduce queue infrastructure cost from $2.53/month to $0/month ($30/year savings)
- Simplify architecture (no connection management)
- Improve observability with native Cloud Monitoring integration


## 2. Architecture Design

### 2.1 Current Architecture Analysis

```
Current State (BullMQ + ioredis):
├── BullMQ Queues: 11 queues (one per job type)
├── ioredis Connection: TCP-based persistent connections
├── Workers: 11 workers processing jobs
└── Upstash Redis: TCP endpoint
    Issues:
    - Zombie connections when containers freeze
    - "Stream isn't writeable" errors
    - ETIMEDOUT errors on reconnection
    - 100% failure rate in production
```

**Issues**:
- TCP connections break when Cloud Run containers freeze
- BullMQ cannot recover from frozen connections
- Upstash explicitly states TCP clients incompatible with serverless
- Cannot scale (connection issues worsen with more containers)

### 2.2 Target Architecture

```
Serverless-Native Architecture (Cloud Tasks + HTTP):
├── Cloud Tasks Queues: 11 queues (one per job type)
├── HTTP Requests: Stateless POST requests to Cloud Run
├── Job Handler Endpoint: /api/jobs/:jobName
├── OIDC Authentication: Automatic token generation
├── Idempotency: Upstash Redis (HTTP client)
└── Monitoring: Cloud Monitoring + Cloud Logging
    Benefits:
    - No persistent connections
    - Automatic retry with exponential backoff
    - Native Cloud Run integration
    - $0/month cost (free tier)
```

### 2.3 Technology Selection

#### Google Cloud Tasks

**Use Cases**:
- Background job processing
- Scheduled tasks (up to 30 days)
- Asynchronous API operations
- Webhook delivery with retry

**Advantages**:
- HTTP-based (no TCP connection issues)
- Designed for serverless (Cloud Run, Cloud Functions)
- Built-in retry with exponential backoff
- Native OIDC authentication
- Integrated monitoring (Cloud Monitoring)
- Free tier: 1M operations/month

**Trade-offs**:
- GCP vendor lock-in (acceptable for native integration)
- No execution order guarantees (acceptable for our use case)
- Occasional delays during system restarts (acceptable)
- >99.999% single execution, but duplicates possible (mitigated with idempotency)

**Configuration**:
```typescript
import { CloudTasksClient } from '@google-cloud/tasks';

const client = new CloudTasksClient();
const project = 'catchup-479221';
const location = 'us-central1';
const serviceUrl = 'https://catchup-402592213346.us-central1.run.app';

// Create task with OIDC authentication
const task = {
  httpRequest: {
    httpMethod: 'POST',
    url: `${serviceUrl}/api/jobs/google-contacts-sync`,
    headers: { 'Content-Type': 'application/json' },
    body: Buffer.from(JSON.stringify({ userId: '123' })).toString('base64'),
    oidcToken: {
      serviceAccountEmail: '402592213346-compute@developer.gserviceaccount.com',
      audience: serviceUrl
    }
  },
  scheduleTime: {
    seconds: Date.now() / 1000 + 3600 // 1 hour delay
  }
};

const [response] = await client.createTask({
  parent: client.queuePath(project, location, 'google-contacts-sync-queue'),
  task
});
```

#### Upstash Redis (HTTP Client)

**Use Cases** (Keep for):
- Idempotency key storage
- Cache operations
- Rate limiting
- Temporary data storage

**Why Keep**:
- HTTP-based client works perfectly with serverless
- Already implemented (`src/utils/http-redis-client.ts`)
- No connection issues
- Free tier sufficient for our usage

**What to Stop Using**:
- ❌ BullMQ (TCP-based job queues)
- ❌ ioredis (TCP-based Redis client)
- ❌ Any TCP-based queue system


## 3. Component Design

### 3.1 Cloud Tasks Queue Configuration

**File**: `src/jobs/cloud-tasks-config.ts`

**Purpose**: Define queue configurations for all 11 job types

**Interface**:
```typescript
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
```

**Retry Algorithm Example**:
For `calendar-sync` (minBackoff=30s, maxBackoff=1800s, maxDoublings=3):
- 1st retry: 30s
- 2nd retry: 60s (doubled)
- 3rd retry: 120s (doubled)
- 4th retry: 240s (doubled)
- 5th retry: 480s (linear increase by 2^3 * 30s)
- 6th+ retry: 960s, 1440s, 1800s (capped at maxBackoff)


### 3.2 Cloud Tasks Client Wrapper

**File**: `src/jobs/cloud-tasks-client.ts`

**Purpose**: Provide BullMQ-compatible interface for easy migration

**Interface**:
```typescript
import { CloudTasksClient } from '@google-cloud/tasks';
import { createHash } from 'crypto';

export interface TaskOptions {
  delay?: number; // Delay in seconds
  scheduleTime?: Date; // Absolute schedule time
  attempts?: number; // Max retry attempts (overrides queue config)
}

export class CloudTasksQueue {
  private client: CloudTasksClient;
  private projectId: string;
  private location: string;
  private serviceUrl: string;
  private serviceAccountEmail: string;
  private queueName: string;

  constructor(jobName: string) {
    this.client = new CloudTasksClient();
    this.projectId = process.env.GCP_PROJECT_ID || 'catchup-479221';
    this.location = process.env.GCP_REGION || 'us-central1';
    this.serviceUrl = process.env.CLOUD_RUN_URL || 'https://catchup-402592213346.us-central1.run.app';
    this.serviceAccountEmail = process.env.SERVICE_ACCOUNT_EMAIL || '402592213346-compute@developer.gserviceaccount.com';
    
    const config = QUEUE_CONFIGS[jobName];
    if (!config) {
      throw new Error(`Unknown job type: ${jobName}`);
    }
    this.queueName = config.name;
  }

  /**
   * Add a task to the queue (BullMQ-compatible interface)
   */
  async add(jobName: string, data: any, options?: TaskOptions): Promise<string> {
    // Generate idempotency key
    const idempotencyKey = this.generateIdempotencyKey(jobName, data);
    
    // Calculate schedule time
    let scheduleTime: { seconds: number } | undefined;
    if (options?.scheduleTime) {
      scheduleTime = { seconds: Math.floor(options.scheduleTime.getTime() / 1000) };
    } else if (options?.delay) {
      scheduleTime = { seconds: Math.floor(Date.now() / 1000) + options.delay };
    }
    
    // Validate schedule time (max 30 days)
    if (scheduleTime) {
      const maxScheduleLimit = 30 * 24 * 60 * 60; // 30 days in seconds
      const now = Math.floor(Date.now() / 1000);
      if (scheduleTime.seconds - now > maxScheduleLimit) {
        throw new Error('Schedule time cannot be more than 30 days in the future');
      }
      if (scheduleTime.seconds < now) {
        throw new Error('Schedule time cannot be in the past');
      }
    }

    // Create task
    const task = {
      httpRequest: {
        httpMethod: 'POST' as const,
        url: `${this.serviceUrl}/api/jobs/${jobName}`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({
          data,
          idempotencyKey,
          jobName
        })).toString('base64'),
        oidcToken: {
          serviceAccountEmail: this.serviceAccountEmail,
          audience: this.serviceUrl
        }
      },
      scheduleTime
    };

    const parent = this.client.queuePath(this.projectId, this.location, this.queueName);
    
    try {
      const [response] = await this.client.createTask({ parent, task });
      console.log(`[Cloud Tasks] Created task: ${response.name}`);
      return response.name || '';
    } catch (error: any) {
      console.error(`[Cloud Tasks] Error creating task:`, error);
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Generate idempotency key from job name and data
   */
  private generateIdempotencyKey(jobName: string, data: any): string {
    const hash = createHash('sha256');
    hash.update(jobName);
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Close the client (for compatibility with BullMQ)
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}
```

**Usage Example**:
```typescript
// Before (BullMQ)
import { createQueue } from './queue-factory';
const queue = createQueue('google-contacts-sync');
await queue.add('sync', { userId: '123' }, { delay: 3600 });

// After (Cloud Tasks)
import { CloudTasksQueue } from './cloud-tasks-client';
const queue = new CloudTasksQueue('google-contacts-sync');
await queue.add('google-contacts-sync', { userId: '123' }, { delay: 3600 });
```

**Migration Notes**:
- Nearly identical API to BullMQ
- `add()` method signature matches BullMQ
- Automatic idempotency key generation
- Schedule time validation (30-day limit)
- Base64 encoding handled automatically


### 3.3 Job Handler Endpoint

**File**: `src/api/jobs-handler.ts`

**Purpose**: Single endpoint to handle all job types with OIDC authentication and idempotency

**Implementation**:
```typescript
import express, { Request, Response, NextFunction } from 'express';
import { httpRedis } from '../utils/http-redis-client';

const router = express.Router();

// Middleware: Validate OIDC token
async function validateOIDCToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[Jobs] Missing or invalid Authorization header');
    return res.status(401).json({ error: 'Unauthorized: Missing OIDC token' });
  }

  // Cloud Run automatically validates OIDC tokens
  // If we reach here, token is valid
  // Additional validation can be added if needed
  
  next();
}

// Middleware: Check idempotency
async function checkIdempotency(req: Request, res: Response, next: NextFunction) {
  const { idempotencyKey } = req.body;
  
  if (!idempotencyKey) {
    console.error('[Jobs] Missing idempotency key');
    return res.status(400).json({ error: 'Missing idempotency key' });
  }

  try {
    const key = `idempotency:${idempotencyKey}`;
    const processed = await httpRedis.get(key);
    
    if (processed) {
      console.log(`[Jobs] Duplicate request detected: ${idempotencyKey}`);
      return res.status(200).json({ 
        success: true, 
        duplicate: true,
        message: 'Task already processed'
      });
    }
    
    next();
  } catch (error: any) {
    console.error('[Jobs] Error checking idempotency:', error);
    // Fail open: allow request if Redis is down
    next();
  }
}

// Middleware: Log Cloud Tasks headers
function logCloudTasksHeaders(req: Request, res: Response, next: NextFunction) {
  const headers = {
    queueName: req.headers['x-cloudtasks-queuename'],
    taskName: req.headers['x-cloudtasks-taskname'],
    retryCount: req.headers['x-cloudtasks-taskretrycount'],
    executionCount: req.headers['x-cloudtasks-taskexecutioncount'],
    eta: req.headers['x-cloudtasks-tasketa']
  };
  
  console.log('[Jobs] Cloud Tasks headers:', headers);
  next();
}

// Apply middleware
router.use(validateOIDCToken);
router.use(logCloudTasksHeaders);
router.use(checkIdempotency);

// Job handler endpoint
router.post('/jobs/:jobName', async (req: Request, res: Response) => {
  const { jobName } = req.params;
  const { data, idempotencyKey } = req.body;
  
  console.log(`[Jobs] Starting job: ${jobName}`, { data, idempotencyKey });
  
  try {
    // Route to appropriate job processor
    await executeJob(jobName, data);
    
    // Mark idempotency key as processed (24 hour TTL)
    await httpRedis.set(`idempotency:${idempotencyKey}`, '1', 86400);
    
    console.log(`[Jobs] Completed job: ${jobName}`);
    res.status(200).json({ success: true });
    
  } catch (error: any) {
    console.error(`[Jobs] Error in job ${jobName}:`, error);
    
    // Determine if error is retryable
    if (isRetryableError(error)) {
      // Return 5xx for transient errors (Cloud Tasks will retry)
      res.status(500).json({ 
        error: error.message,
        retryable: true
      });
    } else {
      // Return 4xx for permanent errors (Cloud Tasks won't retry)
      res.status(400).json({ 
        error: error.message,
        retryable: false
      });
    }
  }
});

// Execute job based on job name
async function executeJob(jobName: string, data: any): Promise<void> {
  switch (jobName) {
    case 'token-refresh':
      const { refreshTokens } = await import('../jobs/processors/token-refresh-processor');
      await refreshTokens(data);
      break;
      
    case 'calendar-sync':
      const { syncCalendar } = await import('../jobs/processors/calendar-sync-processor');
      await syncCalendar(data);
      break;
      
    case 'google-contacts-sync':
      const { syncContacts } = await import('../jobs/processors/google-contacts-sync-processor');
      await syncContacts(data);
      break;
      
    case 'adaptive-sync':
      const { runAdaptiveSync } = await import('../jobs/processors/adaptive-sync-processor');
      await runAdaptiveSync(data);
      break;
      
    case 'webhook-renewal':
      const { renewWebhooks } = await import('../jobs/processors/webhook-renewal-processor');
      await renewWebhooks(data);
      break;
      
    case 'suggestion-regeneration':
      const { regenerateSuggestions } = await import('../jobs/processors/suggestion-regeneration-processor');
      await regenerateSuggestions(data);
      break;
      
    case 'batch-notifications':
      const { sendBatchNotifications } = await import('../jobs/processors/batch-notifications-processor');
      await sendBatchNotifications(data);
      break;
      
    case 'suggestion-generation':
      const { generateSuggestions } = await import('../jobs/processors/suggestion-generation-processor');
      await generateSuggestions(data);
      break;
      
    case 'webhook-health-check':
      const { checkWebhookHealth } = await import('../jobs/processors/webhook-health-check-processor');
      await checkWebhookHealth(data);
      break;
      
    case 'notification-reminder':
      const { sendNotificationReminder } = await import('../jobs/processors/notification-reminder-processor');
      await sendNotificationReminder(data);
      break;
      
    case 'token-health-reminder':
      const { sendTokenHealthReminder } = await import('../jobs/processors/token-health-reminder-processor');
      await sendTokenHealthReminder(data);
      break;
      
    default:
      throw new Error(`Unknown job type: ${jobName}`);
  }
}

// Determine if error is retryable
function isRetryableError(error: any): boolean {
  // Network errors, timeouts, rate limits are retryable
  if (error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND') {
    return true;
  }
  
  // HTTP 429, 503, 5xx are retryable
  if (error.statusCode === 429 || 
      error.statusCode === 503 ||
      (error.statusCode >= 500 && error.statusCode < 600)) {
    return true;
  }
  
  // Database connection errors are retryable
  if (error.message?.includes('connection') || 
      error.message?.includes('timeout')) {
    return true;
  }
  
  // Everything else is permanent
  return false;
}

export default router;
```

**Error Handling Strategy**:
- **2xx**: Success, task deleted from queue
- **4xx** (except 429): Permanent failure, task deleted, no retry
- **429, 503, 5xx**: Transient failure, automatic retry with exponential backoff
- **Idempotency**: Duplicate requests return 200 without re-execution


### 3.4 Job Processor Migration

**Pattern**: Extract existing BullMQ worker logic into standalone processor functions

**Before (BullMQ Worker)**:
```typescript
// src/jobs/bullmq-worker.ts
import { createWorker } from './queue-factory';

const googleContactsSyncWorker = createWorker('google-contacts-sync', async (job) => {
  const { userId } = job.data;
  
  console.log(`Starting Google Contacts sync for user ${userId}`);
  
  // Business logic here
  await syncContactsForUser(userId);
  
  console.log(`Completed Google Contacts sync for user ${userId}`);
});

googleContactsSyncWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

googleContactsSyncWorker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});
```

**After (Processor Function)**:
```typescript
// src/jobs/processors/google-contacts-sync-processor.ts
export async function syncContacts(data: { userId: string }): Promise<void> {
  const { userId } = data;
  
  console.log(`Starting Google Contacts sync for user ${userId}`);
  
  // Business logic remains unchanged
  await syncContactsForUser(userId);
  
  console.log(`Completed Google Contacts sync for user ${userId}`);
}
```

**Migration Steps** (per job type):
1. Create new file in `src/jobs/processors/`
2. Extract business logic from BullMQ worker
3. Export as async function
4. Remove event handlers (handled by job handler endpoint)
5. Keep error handling (throw errors for retry)
6. Test processor function independently

**Processor Files** (11 total):
- `token-refresh-processor.ts`
- `calendar-sync-processor.ts`
- `google-contacts-sync-processor.ts`
- `adaptive-sync-processor.ts`
- `webhook-renewal-processor.ts`
- `suggestion-regeneration-processor.ts`
- `batch-notifications-processor.ts`
- `suggestion-generation-processor.ts`
- `webhook-health-check-processor.ts`
- `notification-reminder-processor.ts`
- `token-health-reminder-processor.ts`


### 3.5 Queue Factory Migration

**File**: `src/jobs/queue-factory.ts`

**Purpose**: Provide backward-compatible interface during migration

**Implementation**:
```typescript
import { CloudTasksQueue } from './cloud-tasks-client';

// Feature flag for gradual migration
const USE_CLOUD_TASKS = process.env.USE_CLOUD_TASKS === 'true';

export function createQueue(jobName: string): CloudTasksQueue {
  if (!USE_CLOUD_TASKS) {
    throw new Error('BullMQ is deprecated. Set USE_CLOUD_TASKS=true to use Cloud Tasks.');
  }
  
  return new CloudTasksQueue(jobName);
}

// Helper function to enqueue job
export async function enqueueJob(
  jobName: string,
  data: any,
  options?: { delay?: number; scheduleTime?: Date }
): Promise<string> {
  const queue = createQueue(jobName);
  return await queue.add(jobName, data, options);
}
```

**Usage in Application Code**:
```typescript
// Before (BullMQ)
import { createQueue } from './jobs/queue-factory';
const queue = createQueue('google-contacts-sync');
await queue.add('sync', { userId: '123' });

// After (Cloud Tasks) - minimal changes
import { enqueueJob } from './jobs/queue-factory';
await enqueueJob('google-contacts-sync', { userId: '123' });
```

**Migration Strategy**:
1. Set `USE_CLOUD_TASKS=false` initially (keep BullMQ)
2. Deploy Cloud Tasks infrastructure
3. Test Cloud Tasks with non-critical jobs
4. Set `USE_CLOUD_TASKS=true` to switch to Cloud Tasks
5. Monitor for 24 hours
6. Remove BullMQ code after successful migration


### 3.6 Idempotency System

**File**: `src/jobs/idempotency.ts`

**Purpose**: Prevent duplicate job execution using Upstash Redis (HTTP client)

**Implementation**:
```typescript
import { httpRedis } from '../utils/http-redis-client';
import { createHash } from 'crypto';

export class IdempotencyManager {
  private static readonly TTL = 86400; // 24 hours (matches Cloud Tasks deduplication window)
  private static readonly KEY_PREFIX = 'idempotency:';

  /**
   * Generate idempotency key from job name and data
   */
  static generateKey(jobName: string, data: any): string {
    const hash = createHash('sha256');
    hash.update(jobName);
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Check if job has already been processed
   */
  static async isProcessed(idempotencyKey: string): Promise<boolean> {
    try {
      const key = `${this.KEY_PREFIX}${idempotencyKey}`;
      const value = await httpRedis.get(key);
      return value !== null;
    } catch (error) {
      console.error('[Idempotency] Error checking key:', error);
      // Fail open: allow execution if Redis is down
      return false;
    }
  }

  /**
   * Mark job as processed
   */
  static async markProcessed(idempotencyKey: string): Promise<void> {
    try {
      const key = `${this.KEY_PREFIX}${idempotencyKey}`;
      await httpRedis.set(key, '1', this.TTL);
      console.log(`[Idempotency] Marked as processed: ${idempotencyKey}`);
    } catch (error) {
      console.error('[Idempotency] Error marking key:', error);
      // Non-critical: log error but don't fail job
    }
  }

  /**
   * Get cached result for duplicate request
   */
  static async getCachedResult(idempotencyKey: string): Promise<any | null> {
    try {
      const key = `${this.KEY_PREFIX}${idempotencyKey}:result`;
      return await httpRedis.get(key);
    } catch (error) {
      console.error('[Idempotency] Error getting cached result:', error);
      return null;
    }
  }

  /**
   * Cache result for duplicate requests
   */
  static async cacheResult(idempotencyKey: string, result: any): Promise<void> {
    try {
      const key = `${this.KEY_PREFIX}${idempotencyKey}:result`;
      await httpRedis.set(key, result, this.TTL);
    } catch (error) {
      console.error('[Idempotency] Error caching result:', error);
      // Non-critical: log error but don't fail job
    }
  }

  /**
   * Clear idempotency key (for testing)
   */
  static async clear(idempotencyKey: string): Promise<void> {
    try {
      const key = `${this.KEY_PREFIX}${idempotencyKey}`;
      const resultKey = `${this.KEY_PREFIX}${idempotencyKey}:result`;
      await httpRedis.del(key);
      await httpRedis.del(resultKey);
    } catch (error) {
      console.error('[Idempotency] Error clearing key:', error);
    }
  }
}
```

**Usage in Job Handler**:
```typescript
// Check idempotency before execution
const isProcessed = await IdempotencyManager.isProcessed(idempotencyKey);
if (isProcessed) {
  const cachedResult = await IdempotencyManager.getCachedResult(idempotencyKey);
  return res.status(200).json({ 
    success: true, 
    duplicate: true,
    result: cachedResult
  });
}

// Execute job
const result = await executeJob(jobName, data);

// Mark as processed and cache result
await IdempotencyManager.markProcessed(idempotencyKey);
await IdempotencyManager.cacheResult(idempotencyKey, result);
```

**Key Design Decisions**:
- **24-hour TTL**: Matches Cloud Tasks deduplication window
- **HTTP Redis**: No TCP connection issues
- **Fail Open**: Allow execution if Redis is down (better than blocking)
- **Result Caching**: Return cached result for duplicate requests
- **SHA-256 Hash**: Deterministic key generation from job data


## 4. Implementation Phases

### 4.1 Phase 1: Infrastructure Setup (Priority: HIGH)

**Goal**: Create Cloud Tasks queues and configure IAM permissions

**Estimated Effort**: 2 hours

**Tasks**:
1. Enable Cloud Tasks API in GCP project
2. Create 11 Cloud Tasks queues with retry configurations
3. Verify service account has Cloud Run Invoker role
4. Test basic task creation and execution
5. Verify OIDC authentication works

**Commands**:
```bash
# Enable Cloud Tasks API
gcloud services enable cloudtasks.googleapis.com --project=catchup-479221

# Create queues (repeat for all 11 job types)
gcloud tasks queues create token-refresh-queue \
  --location=us-central1 \
  --max-attempts=3 \
  --min-backoff=60s \
  --max-backoff=3600s \
  --max-doublings=2 \
  --max-dispatches-per-second=10

gcloud tasks queues create calendar-sync-queue \
  --location=us-central1 \
  --max-attempts=5 \
  --min-backoff=30s \
  --max-backoff=1800s \
  --max-doublings=3 \
  --max-dispatches-per-second=20

# ... create remaining 9 queues

# Verify service account has Cloud Run Invoker role
gcloud run services add-iam-policy-binding catchup \
  --region=us-central1 \
  --member="serviceAccount:402592213346-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"

# List queues to verify
gcloud tasks queues list --location=us-central1
```

**Success Criteria**:
- ✅ All 11 queues created successfully
- ✅ Service account has Cloud Run Invoker role
- ✅ Can create test task via gcloud CLI
- ✅ Test task reaches Cloud Run endpoint

**Rollback Plan**:
- Delete queues if issues arise
- No impact on production (BullMQ still running)

### 4.2 Phase 2: Code Implementation (Priority: HIGH)

**Goal**: Implement Cloud Tasks client, job handler, and processor functions

**Estimated Effort**: 16 hours

**Tasks**:
1. Install `@google-cloud/tasks` npm package
2. Create `cloud-tasks-config.ts` with queue configurations
3. Create `cloud-tasks-client.ts` with CloudTasksQueue class
4. Create `jobs-handler.ts` with job handler endpoint
5. Create `idempotency.ts` with IdempotencyManager
6. Extract 11 processor functions from BullMQ workers
7. Update `queue-factory.ts` with feature flag
8. Add environment variables to `.env`
9. Update application routes to include job handler
10. Write unit tests for all components

**Environment Variables**:
```bash
# Cloud Tasks Configuration
USE_CLOUD_TASKS=false  # Feature flag (set to true after testing)
GCP_PROJECT_ID=catchup-479221
GCP_REGION=us-central1
CLOUD_RUN_URL=https://catchup-402592213346.us-central1.run.app
SERVICE_ACCOUNT_EMAIL=402592213346-compute@developer.gserviceaccount.com
```

**Success Criteria**:
- ✅ All code compiles without errors
- ✅ Unit tests pass for all components
- ✅ Can create tasks programmatically
- ✅ Job handler endpoint responds correctly
- ✅ Idempotency system works

**Rollback Plan**:
- Keep BullMQ code intact
- Feature flag allows instant rollback
- No database changes required

### 4.3 Phase 3: Testing (Priority: HIGH)

**Goal**: Comprehensive testing of all job types and error scenarios

**Estimated Effort**: 8 hours

**Tasks**:
1. Unit tests for CloudTasksQueue class
2. Unit tests for job handler endpoint
3. Unit tests for idempotency system
4. Integration tests for each job type
5. Test OIDC authentication
6. Test retry behavior (simulate failures)
7. Test idempotency (duplicate requests)
8. Test error handling (4xx vs 5xx)
9. Load testing (100 tasks/minute)
10. End-to-end testing in staging

**Test Scenarios**:
```typescript
// Unit test: Task creation
describe('CloudTasksQueue', () => {
  it('should create task with correct payload', async () => {
    const queue = new CloudTasksQueue('google-contacts-sync');
    const taskName = await queue.add('google-contacts-sync', { userId: '123' });
    expect(taskName).toBeDefined();
  });

  it('should validate schedule time (max 30 days)', async () => {
    const queue = new CloudTasksQueue('google-contacts-sync');
    const futureDate = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    await expect(
      queue.add('google-contacts-sync', { userId: '123' }, { scheduleTime: futureDate })
    ).rejects.toThrow('Schedule time cannot be more than 30 days');
  });
});

// Integration test: Job execution
describe('Job Handler', () => {
  it('should execute google-contacts-sync job', async () => {
    const response = await request(app)
      .post('/api/jobs/google-contacts-sync')
      .set('Authorization', `Bearer ${validOIDCToken}`)
      .send({
        data: { userId: '123' },
        idempotencyKey: 'test-key-123',
        jobName: 'google-contacts-sync'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should prevent duplicate execution', async () => {
    // First request
    await request(app)
      .post('/api/jobs/google-contacts-sync')
      .set('Authorization', `Bearer ${validOIDCToken}`)
      .send({
        data: { userId: '123' },
        idempotencyKey: 'test-key-456',
        jobName: 'google-contacts-sync'
      });
    
    // Duplicate request
    const response = await request(app)
      .post('/api/jobs/google-contacts-sync')
      .set('Authorization', `Bearer ${validOIDCToken}`)
      .send({
        data: { userId: '123' },
        idempotencyKey: 'test-key-456',
        jobName: 'google-contacts-sync'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.duplicate).toBe(true);
  });
});
```

**Success Criteria**:
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ All 11 job types execute successfully
- ✅ Retry behavior works correctly
- ✅ Idempotency prevents duplicates
- ✅ Load test handles 100 tasks/minute

**Rollback Plan**:
- Fix issues in development
- Don't deploy to production until all tests pass

### 4.4 Phase 4: Staging Deployment (Priority: MEDIUM)

**Goal**: Deploy to staging environment and validate end-to-end

**Estimated Effort**: 4 hours

**Tasks**:
1. Deploy code to staging Cloud Run
2. Create Cloud Tasks queues in staging
3. Set `USE_CLOUD_TASKS=true` in staging
4. Trigger all 11 job types manually
5. Monitor Cloud Logging for errors
6. Verify jobs complete successfully
7. Test retry behavior with intentional failures
8. Monitor for 24 hours

**Validation Checklist**:
- [ ] All 11 job types execute successfully
- [ ] No "Stream isn't writeable" errors
- [ ] OIDC authentication works
- [ ] Idempotency prevents duplicates
- [ ] Retry behavior works correctly
- [ ] Cloud Monitoring shows metrics
- [ ] Cloud Logging shows job execution logs

**Success Criteria**:
- ✅ All jobs execute successfully in staging
- ✅ Zero connection errors
- ✅ Job execution success rate >99%
- ✅ No issues after 24 hours

**Rollback Plan**:
- Set `USE_CLOUD_TASKS=false` to revert to BullMQ
- Fix issues before production deployment


### 4.5 Phase 5: Production Deployment (Priority: HIGH)

**Goal**: Deploy to production and migrate all job types

**Estimated Effort**: 4 hours

**Tasks**:
1. Deploy code to production Cloud Run
2. Verify Cloud Tasks queues exist in production
3. Set `USE_CLOUD_TASKS=true` in production
4. Monitor Cloud Logging for errors
5. Verify all scheduled jobs execute
6. Monitor for 48 hours
7. Verify cost savings ($0/month)
8. Document any issues

**Deployment Steps**:
```bash
# 1. Deploy to production
git tag prod
git push origin prod

# 2. Verify queues exist
gcloud tasks queues list --location=us-central1 --project=catchup-479221

# 3. Update environment variable
gcloud run services update catchup \
  --region=us-central1 \
  --update-env-vars USE_CLOUD_TASKS=true

# 4. Monitor logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=catchup" \
  --limit=100 \
  --format=json

# 5. Check queue metrics
gcloud tasks queues describe google-contacts-sync-queue \
  --location=us-central1
```

**Monitoring Checklist**:
- [ ] All 11 job types executing successfully
- [ ] Zero "Stream isn't writeable" errors
- [ ] Job execution success rate >99.9%
- [ ] Cloud Monitoring shows healthy metrics
- [ ] No user complaints about missing syncs
- [ ] Upstash Redis command usage reduced
- [ ] Cost reduced to $0/month

**Success Criteria**:
- ✅ All jobs execute successfully in production
- ✅ Zero connection errors for 48 hours
- ✅ Job execution success rate >99.9%
- ✅ Cost reduced from $2.53/month to $0/month
- ✅ No user-facing issues

**Rollback Plan**:
```bash
# Immediate rollback if critical issues
gcloud run services update catchup \
  --region=us-central1 \
  --update-env-vars USE_CLOUD_TASKS=false

# Monitor logs to verify BullMQ is working
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

### 4.6 Phase 6: Cleanup (Priority: LOW)

**Goal**: Remove BullMQ code and dependencies

**Estimated Effort**: 2 hours

**Tasks**:
1. Remove `bullmq` package from `package.json`
2. Remove `src/jobs/bullmq-connection.ts`
3. Remove `src/jobs/bullmq-queue.ts`
4. Remove `src/jobs/bullmq-worker.ts`
5. Remove BullMQ-related environment variables
6. Update documentation
7. Archive old code in git history

**Files to Remove**:
- `src/jobs/bullmq-connection.ts`
- `src/jobs/bullmq-queue.ts`
- `src/jobs/bullmq-worker.ts`
- Any BullMQ-specific configuration files

**Files to Update**:
- `package.json`: Remove `bullmq` dependency
- `src/jobs/queue-factory.ts`: Remove BullMQ code
- `.env.example`: Remove BullMQ environment variables
- Documentation: Update queue system documentation

**Success Criteria**:
- ✅ All BullMQ code removed
- ✅ Application compiles without errors
- ✅ All tests pass
- ✅ Documentation updated
- ✅ Clean git history

**Rollback Plan**:
- BullMQ code preserved in git history
- Can restore from previous commit if needed


## 5. Data Flow and Interactions

### 5.1 Task Creation Flow

```
Application Code → CloudTasksQueue.add()
    ↓
Generate idempotency key (SHA-256 hash)
    ↓
Validate schedule time (<30 days)
    ↓
Create task payload (base64-encoded JSON)
    ↓
Add OIDC token configuration
    ↓
Cloud Tasks API → createTask()
    ↓
Task stored in queue
    ↓
Return task name to caller
```

**Performance**:
- Task creation: ~50-100ms (HTTP API call)
- Acceptable for background jobs
- No blocking on task execution

### 5.2 Task Execution Flow

```
Cloud Tasks → HTTP POST to /api/jobs/:jobName
    ↓
Cloud Run validates OIDC token
    ↓
Job handler validates request
    ↓
Check idempotency key in Redis
    ↓
Already processed? → Return 200 (duplicate)
    ↓
Not processed? → Execute job processor
    ↓
Job processor runs business logic
    ↓
Success? → Mark idempotency key as processed
    ↓
Return 200 (success) or 5xx (retry) or 4xx (permanent failure)
    ↓
Cloud Tasks receives response
    ↓
2xx → Delete task from queue
5xx/429/503 → Retry with exponential backoff
4xx → Delete task (permanent failure)
```

**Performance**:
- Job execution start: <5 seconds (p95)
- Idempotency check: <50ms
- Total overhead: <100ms

### 5.3 Retry Flow

```
Task execution fails (5xx error)
    ↓
Cloud Tasks checks retry config
    ↓
Attempts < maxAttempts? → Schedule retry
    ↓
Calculate backoff delay (exponential)
    ↓
Wait for backoff period
    ↓
Retry task execution
    ↓
Success? → Delete task
    ↓
Still failing? → Repeat until maxAttempts reached
    ↓
Max attempts reached → Delete task (permanent failure)
    ↓
Log failure to Cloud Logging
```

**Retry Example** (calendar-sync):
- 1st failure: Retry after 30s
- 2nd failure: Retry after 60s
- 3rd failure: Retry after 120s
- 4th failure: Retry after 240s
- 5th failure: Retry after 480s
- Max attempts (5) reached → Permanent failure

### 5.4 Idempotency Flow

```
Task arrives at job handler
    ↓
Extract idempotency key from payload
    ↓
Check Redis: GET idempotency:{key}
    ↓
Key exists? → Return cached result (200)
    ↓
Key doesn't exist? → Execute job
    ↓
Job completes successfully
    ↓
Store in Redis: SET idempotency:{key} = "1" (TTL: 24h)
    ↓
Cache result: SET idempotency:{key}:result = {result} (TTL: 24h)
    ↓
Return success (200)
```

**Duplicate Request Handling**:
- First request: Execute job, cache result
- Duplicate request (within 24h): Return cached result
- After 24h: Key expired, execute job again


## 6. Configuration and Environment

### 6.1 Environment Variables

**New Variables** (Cloud Tasks):
```bash
# Cloud Tasks Configuration
USE_CLOUD_TASKS=true                    # Feature flag to enable Cloud Tasks
GCP_PROJECT_ID=catchup-479221           # GCP project ID
GCP_REGION=us-central1                  # Cloud Tasks region (same as Cloud Run)
CLOUD_RUN_URL=https://catchup-402592213346.us-central1.run.app  # Cloud Run service URL
SERVICE_ACCOUNT_EMAIL=402592213346-compute@developer.gserviceaccount.com  # Service account for OIDC
```

**Existing Variables** (Keep):
```bash
# Upstash Redis (HTTP client for idempotency)
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_rest_token_here
```

**Variables to Remove** (After cleanup):
```bash
# BullMQ (deprecated)
REDIS_URL=rediss://:password@your-database.upstash.io:6379
REDIS_HOST=your-database.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_TLS=true
```

### 6.2 Package Dependencies

**Add**:
```json
{
  "dependencies": {
    "@google-cloud/tasks": "^5.0.0"
  }
}
```

**Keep** (for idempotency):
```json
{
  "dependencies": {
    "@upstash/redis": "^1.28.0"
  }
}
```

**Remove** (after cleanup):
```json
{
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.2"
  }
}
```

### 6.3 GCP IAM Configuration

**Service Account**: `402592213346-compute@developer.gserviceaccount.com`

**Required Roles**:
1. **Cloud Run Invoker** (`roles/run.invoker`)
   - Allows Cloud Tasks to invoke Cloud Run endpoints
   - Already assigned to service account

2. **Cloud Tasks Enqueuer** (`roles/cloudtasks.enqueuer`)
   - Allows application to create tasks
   - Automatically granted to Compute Engine default service account

**Verify Permissions**:
```bash
# Check Cloud Run Invoker role
gcloud run services get-iam-policy catchup \
  --region=us-central1 \
  --format=json

# Should show:
# {
#   "bindings": [
#     {
#       "role": "roles/run.invoker",
#       "members": [
#         "serviceAccount:402592213346-compute@developer.gserviceaccount.com"
#       ]
#     }
#   ]
# }
```

### 6.4 Cloud Tasks Queue Configuration

**Queue Creation Script**:
```bash
#!/bin/bash
# scripts/create-cloud-tasks-queues.sh

PROJECT_ID="catchup-479221"
LOCATION="us-central1"

# Array of queue configurations
declare -A QUEUES=(
  ["token-refresh-queue"]="--max-attempts=3 --min-backoff=60s --max-backoff=3600s --max-doublings=2 --max-dispatches-per-second=10"
  ["calendar-sync-queue"]="--max-attempts=5 --min-backoff=30s --max-backoff=1800s --max-doublings=3 --max-dispatches-per-second=20"
  ["google-contacts-sync-queue"]="--max-attempts=5 --min-backoff=30s --max-backoff=1800s --max-doublings=3 --max-dispatches-per-second=10"
  ["adaptive-sync-queue"]="--max-attempts=5 --min-backoff=10s --max-backoff=300s --max-doublings=3"
  ["webhook-renewal-queue"]="--max-attempts=5 --min-backoff=30s --max-backoff=1800s --max-doublings=3"
  ["suggestion-regeneration-queue"]="--max-attempts=3 --min-backoff=60s --max-backoff=3600s --max-doublings=2"
  ["batch-notifications-queue"]="--max-attempts=5 --min-backoff=10s --max-backoff=300s --max-doublings=3 --max-dispatches-per-second=50"
  ["suggestion-generation-queue"]="--max-attempts=3 --min-backoff=60s --max-backoff=3600s --max-doublings=2"
  ["webhook-health-check-queue"]="--max-attempts=3 --min-backoff=30s --max-backoff=900s --max-doublings=2"
  ["notification-reminder-queue"]="--max-attempts=3 --min-backoff=60s --max-backoff=1800s --max-doublings=2"
  ["token-health-reminder-queue"]="--max-attempts=3 --min-backoff=60s --max-backoff=1800s --max-doublings=2"
)

# Create each queue
for queue_name in "${!QUEUES[@]}"; do
  echo "Creating queue: $queue_name"
  gcloud tasks queues create "$queue_name" \
    --location="$LOCATION" \
    --project="$PROJECT_ID" \
    ${QUEUES[$queue_name]}
  
  if [ $? -eq 0 ]; then
    echo "✓ Created $queue_name"
  else
    echo "✗ Failed to create $queue_name"
  fi
done

echo "Done! Created ${#QUEUES[@]} queues."
```

**Queue Deletion Script** (for cleanup/testing):
```bash
#!/bin/bash
# scripts/delete-cloud-tasks-queues.sh

PROJECT_ID="catchup-479221"
LOCATION="us-central1"

QUEUES=(
  "token-refresh-queue"
  "calendar-sync-queue"
  "google-contacts-sync-queue"
  "adaptive-sync-queue"
  "webhook-renewal-queue"
  "suggestion-regeneration-queue"
  "batch-notifications-queue"
  "suggestion-generation-queue"
  "webhook-health-check-queue"
  "notification-reminder-queue"
  "token-health-reminder-queue"
)

for queue_name in "${QUEUES[@]}"; do
  echo "Deleting queue: $queue_name"
  gcloud tasks queues delete "$queue_name" \
    --location="$LOCATION" \
    --project="$PROJECT_ID" \
    --quiet
done

echo "Done! Deleted ${#QUEUES[@]} queues."
```


## 7. Testing Strategy

### 7.1 Unit Tests

**CloudTasksQueue Tests** (`src/jobs/cloud-tasks-client.test.ts`):
```typescript
import { CloudTasksQueue } from './cloud-tasks-client';
import { CloudTasksClient } from '@google-cloud/tasks';

jest.mock('@google-cloud/tasks');

describe('CloudTasksQueue', () => {
  let queue: CloudTasksQueue;
  let mockClient: jest.Mocked<CloudTasksClient>;

  beforeEach(() => {
    mockClient = new CloudTasksClient() as jest.Mocked<CloudTasksClient>;
    queue = new CloudTasksQueue('google-contacts-sync');
  });

  describe('add', () => {
    it('should create task with correct payload', async () => {
      mockClient.createTask.mockResolvedValue([{ name: 'task-123' }]);
      
      const taskName = await queue.add('google-contacts-sync', { userId: '123' });
      
      expect(taskName).toBe('task-123');
      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          task: expect.objectContaining({
            httpRequest: expect.objectContaining({
              httpMethod: 'POST',
              url: expect.stringContaining('/api/jobs/google-contacts-sync')
            })
          })
        })
      );
    });

    it('should generate idempotency key', async () => {
      mockClient.createTask.mockResolvedValue([{ name: 'task-123' }]);
      
      await queue.add('google-contacts-sync', { userId: '123' });
      
      const call = mockClient.createTask.mock.calls[0][0];
      const body = JSON.parse(
        Buffer.from(call.task.httpRequest.body, 'base64').toString()
      );
      
      expect(body.idempotencyKey).toBeDefined();
      expect(body.idempotencyKey).toHaveLength(64); // SHA-256 hex
    });

    it('should validate schedule time (max 30 days)', async () => {
      const futureDate = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
      
      await expect(
        queue.add('google-contacts-sync', { userId: '123' }, { scheduleTime: futureDate })
      ).rejects.toThrow('Schedule time cannot be more than 30 days');
    });

    it('should reject past schedule time', async () => {
      const pastDate = new Date(Date.now() - 1000);
      
      await expect(
        queue.add('google-contacts-sync', { userId: '123' }, { scheduleTime: pastDate })
      ).rejects.toThrow('Schedule time cannot be in the past');
    });

    it('should handle delay option', async () => {
      mockClient.createTask.mockResolvedValue([{ name: 'task-123' }]);
      
      await queue.add('google-contacts-sync', { userId: '123' }, { delay: 3600 });
      
      const call = mockClient.createTask.mock.calls[0][0];
      expect(call.task.scheduleTime).toBeDefined();
      expect(call.task.scheduleTime.seconds).toBeGreaterThan(Date.now() / 1000);
    });
  });
});
```

**Job Handler Tests** (`src/api/jobs-handler.test.ts`):
```typescript
import request from 'supertest';
import express from 'express';
import jobsHandler from './jobs-handler';
import { IdempotencyManager } from '../jobs/idempotency';

jest.mock('../jobs/idempotency');

const app = express();
app.use(express.json());
app.use(jobsHandler);

describe('Job Handler', () => {
  const validOIDCToken = 'Bearer valid-token';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /jobs/:jobName', () => {
    it('should execute job successfully', async () => {
      (IdempotencyManager.isProcessed as jest.Mock).mockResolvedValue(false);
      
      const response = await request(app)
        .post('/api/jobs/google-contacts-sync')
        .set('Authorization', validOIDCToken)
        .send({
          data: { userId: '123' },
          idempotencyKey: 'test-key-123',
          jobName: 'google-contacts-sync'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(IdempotencyManager.markProcessed).toHaveBeenCalledWith('test-key-123');
    });

    it('should prevent duplicate execution', async () => {
      (IdempotencyManager.isProcessed as jest.Mock).mockResolvedValue(true);
      (IdempotencyManager.getCachedResult as jest.Mock).mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post('/api/jobs/google-contacts-sync')
        .set('Authorization', validOIDCToken)
        .send({
          data: { userId: '123' },
          idempotencyKey: 'test-key-456',
          jobName: 'google-contacts-sync'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.duplicate).toBe(true);
      expect(IdempotencyManager.markProcessed).not.toHaveBeenCalled();
    });

    it('should return 401 without OIDC token', async () => {
      const response = await request(app)
        .post('/api/jobs/google-contacts-sync')
        .send({
          data: { userId: '123' },
          idempotencyKey: 'test-key-789',
          jobName: 'google-contacts-sync'
        });
      
      expect(response.status).toBe(401);
    });

    it('should return 400 for missing idempotency key', async () => {
      const response = await request(app)
        .post('/api/jobs/google-contacts-sync')
        .set('Authorization', validOIDCToken)
        .send({
          data: { userId: '123' },
          jobName: 'google-contacts-sync'
        });
      
      expect(response.status).toBe(400);
    });

    it('should return 500 for retryable errors', async () => {
      (IdempotencyManager.isProcessed as jest.Mock).mockResolvedValue(false);
      
      // Mock job processor to throw retryable error
      jest.spyOn(console, 'error').mockImplementation();
      
      const response = await request(app)
        .post('/api/jobs/failing-job')
        .set('Authorization', validOIDCToken)
        .send({
          data: { userId: '123' },
          idempotencyKey: 'test-key-fail',
          jobName: 'failing-job'
        });
      
      expect(response.status).toBe(500);
      expect(response.body.retryable).toBe(true);
    });
  });
});
```

**Idempotency Tests** (`src/jobs/idempotency.test.ts`):
```typescript
import { IdempotencyManager } from './idempotency';
import { httpRedis } from '../utils/http-redis-client';

jest.mock('../utils/http-redis-client');

describe('IdempotencyManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKey', () => {
    it('should generate consistent key for same input', () => {
      const key1 = IdempotencyManager.generateKey('job-1', { userId: '123' });
      const key2 = IdempotencyManager.generateKey('job-1', { userId: '123' });
      
      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA-256 hex
    });

    it('should generate different keys for different inputs', () => {
      const key1 = IdempotencyManager.generateKey('job-1', { userId: '123' });
      const key2 = IdempotencyManager.generateKey('job-1', { userId: '456' });
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('isProcessed', () => {
    it('should return true if key exists', async () => {
      (httpRedis.get as jest.Mock).mockResolvedValue('1');
      
      const result = await IdempotencyManager.isProcessed('test-key');
      
      expect(result).toBe(true);
      expect(httpRedis.get).toHaveBeenCalledWith('idempotency:test-key');
    });

    it('should return false if key does not exist', async () => {
      (httpRedis.get as jest.Mock).mockResolvedValue(null);
      
      const result = await IdempotencyManager.isProcessed('test-key');
      
      expect(result).toBe(false);
    });

    it('should fail open on Redis error', async () => {
      (httpRedis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));
      
      const result = await IdempotencyManager.isProcessed('test-key');
      
      expect(result).toBe(false); // Fail open
    });
  });

  describe('markProcessed', () => {
    it('should store key with 24 hour TTL', async () => {
      await IdempotencyManager.markProcessed('test-key');
      
      expect(httpRedis.set).toHaveBeenCalledWith('idempotency:test-key', '1', 86400);
    });
  });
});
```

### 7.2 Integration Tests

**End-to-End Job Execution**:
```typescript
describe('Cloud Tasks Integration', () => {
  it('should execute google-contacts-sync end-to-end', async () => {
    // Create task
    const queue = new CloudTasksQueue('google-contacts-sync');
    const taskName = await queue.add('google-contacts-sync', { userId: 'test-user-123' });
    
    expect(taskName).toBeDefined();
    
    // Wait for task to execute (Cloud Tasks will call our endpoint)
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify job completed
    const syncStatus = await getSyncStatus('test-user-123');
    expect(syncStatus.lastSync).toBeDefined();
    expect(syncStatus.status).toBe('completed');
  });

  it('should retry failed jobs', async () => {
    // Create task that will fail initially
    const queue = new CloudTasksQueue('calendar-sync');
    await queue.add('calendar-sync', { userId: 'test-user-456', simulateFailure: true });
    
    // Wait for retries
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // Verify job eventually succeeded
    const syncStatus = await getSyncStatus('test-user-456');
    expect(syncStatus.status).toBe('completed');
  });
});
```

### 7.3 Load Tests

**Concurrent Task Creation**:
```typescript
describe('Load Testing', () => {
  it('should handle 100 tasks/minute', async () => {
    const queue = new CloudTasksQueue('batch-notifications');
    const tasks = [];
    
    // Create 100 tasks
    for (let i = 0; i < 100; i++) {
      tasks.push(queue.add('batch-notifications', { userId: `user-${i}` }));
    }
    
    const results = await Promise.all(tasks);
    
    expect(results).toHaveLength(100);
    expect(results.every(r => r !== null)).toBe(true);
  });
});
```


## 8. Monitoring and Observability

### 8.1 Metrics to Track

**Cloud Tasks Metrics** (Built-in Cloud Monitoring):
- Task creation rate (per queue)
- Task execution rate (per queue)
- Task execution latency (p50, p95, p99)
- Task failure rate (per queue)
- Queue depth (tasks waiting)
- Task retry count distribution
- Task age (time in queue)

**Application Metrics** (Custom):
- Job execution success rate (per job type)
- Job execution duration (per job type)
- Idempotency cache hit rate
- Duplicate request count
- Job processor error rate

**Cost Metrics**:
- Cloud Tasks operations per month
- Projected monthly cost
- Cost savings vs BullMQ

### 8.2 Logging Strategy

**Log Levels**:

**INFO** - Normal operations:
```typescript
console.log('[Cloud Tasks] Created task:', {
  taskName: response.name,
  queue: queueName,
  jobName,
  scheduleTime: task.scheduleTime
});

console.log('[Jobs] Starting job:', {
  jobName,
  data,
  idempotencyKey,
  retryCount: req.headers['x-cloudtasks-taskretrycount']
});

console.log('[Jobs] Completed job:', {
  jobName,
  duration: Date.now() - startTime,
  success: true
});
```

**WARN** - Degraded performance:
```typescript
console.warn('[Jobs] Duplicate request detected:', {
  jobName,
  idempotencyKey,
  cachedResult: true
});

console.warn('[Idempotency] Redis unavailable, failing open:', {
  error: error.message
});
```

**ERROR** - Failures:
```typescript
console.error('[Cloud Tasks] Error creating task:', {
  jobName,
  error: error.message,
  stack: error.stack
});

console.error('[Jobs] Job execution failed:', {
  jobName,
  error: error.message,
  retryable: isRetryableError(error),
  retryCount: req.headers['x-cloudtasks-taskretrycount']
});
```

**Structured Logging Format**:
```typescript
{
  timestamp: '2026-02-19T12:00:00.000Z',
  severity: 'INFO',
  component: 'cloud-tasks',
  operation: 'task_created',
  taskName: 'projects/catchup-479221/locations/us-central1/queues/google-contacts-sync-queue/tasks/123',
  queue: 'google-contacts-sync-queue',
  jobName: 'google-contacts-sync',
  userId: '123',
  scheduleTime: '2026-02-19T13:00:00.000Z',
  trace: 'projects/catchup-479221/traces/abc123'
}
```

### 8.3 Cloud Monitoring Dashboard

**Dashboard Configuration**:
```yaml
# Cloud Monitoring Dashboard for Cloud Tasks
displayName: "Cloud Tasks - Job Queue Monitoring"
mosaicLayout:
  columns: 12
  tiles:
    # Task Creation Rate
    - width: 6
      height: 4
      widget:
        title: "Task Creation Rate (per queue)"
        xyChart:
          dataSets:
            - timeSeriesQuery:
                timeSeriesFilter:
                  filter: 'resource.type="cloud_tasks_queue" AND metric.type="cloudtasks.googleapis.com/queue/task_attempt_count"'
                  aggregation:
                    alignmentPeriod: "60s"
                    perSeriesAligner: "ALIGN_RATE"
                    crossSeriesReducer: "REDUCE_SUM"
                    groupByFields: ["resource.queue_id"]
    
    # Task Execution Latency
    - width: 6
      height: 4
      widget:
        title: "Task Execution Latency (p95)"
        xyChart:
          dataSets:
            - timeSeriesQuery:
                timeSeriesFilter:
                  filter: 'resource.type="cloud_tasks_queue" AND metric.type="cloudtasks.googleapis.com/queue/task_attempt_delays"'
                  aggregation:
                    alignmentPeriod: "60s"
                    perSeriesAligner: "ALIGN_DELTA"
                    crossSeriesReducer: "REDUCE_PERCENTILE_95"
    
    # Queue Depth
    - width: 6
      height: 4
      widget:
        title: "Queue Depth (tasks waiting)"
        xyChart:
          dataSets:
            - timeSeriesQuery:
                timeSeriesFilter:
                  filter: 'resource.type="cloud_tasks_queue" AND metric.type="cloudtasks.googleapis.com/queue/depth"'
                  aggregation:
                    alignmentPeriod: "60s"
                    perSeriesAligner: "ALIGN_MEAN"
                    groupByFields: ["resource.queue_id"]
    
    # Task Failure Rate
    - width: 6
      height: 4
      widget:
        title: "Task Failure Rate"
        xyChart:
          dataSets:
            - timeSeriesQuery:
                timeSeriesFilter:
                  filter: 'resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.label.response_code_class="5xx"'
                  aggregation:
                    alignmentPeriod: "60s"
                    perSeriesAligner: "ALIGN_RATE"
```

**Access Dashboard**:
```bash
# Create dashboard
gcloud monitoring dashboards create --config-from-file=cloud-tasks-dashboard.yaml

# View in Cloud Console
https://console.cloud.google.com/monitoring/dashboards
```

### 8.4 Alerting Rules

**Critical Alerts** (PagerDuty/Email):
- Task failure rate > 5% for 5 minutes
- Queue depth > 1000 tasks for 10 minutes
- Job execution latency p95 > 60 seconds
- Cloud Tasks API errors > 10/minute

**Warning Alerts** (Slack/Email):
- Task failure rate > 1% for 10 minutes
- Queue depth > 500 tasks for 15 minutes
- Job execution latency p95 > 30 seconds
- Idempotency cache hit rate < 50%

**Alert Configuration**:
```yaml
# Cloud Monitoring Alert Policy
displayName: "Cloud Tasks - High Failure Rate"
conditions:
  - displayName: "Task failure rate > 5%"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.label.response_code_class="5xx"'
      comparison: COMPARISON_GT
      thresholdValue: 0.05
      duration: "300s"
      aggregations:
        - alignmentPeriod: "60s"
          perSeriesAligner: "ALIGN_RATE"
notificationChannels:
  - "projects/catchup-479221/notificationChannels/email-alerts"
alertStrategy:
  autoClose: "1800s"
```

**Create Alerts**:
```bash
# Create alert policy
gcloud alpha monitoring policies create --policy-from-file=alert-policy.yaml

# List alert policies
gcloud alpha monitoring policies list
```

### 8.5 Cloud Logging Queries

**View All Job Executions**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="catchup"
jsonPayload.component="cloud-tasks"
```

**View Failed Jobs**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="catchup"
jsonPayload.component="cloud-tasks"
severity="ERROR"
```

**View Specific Job Type**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="catchup"
jsonPayload.jobName="google-contacts-sync"
```

**View Retry Attempts**:
```
resource.type="cloud_run_revision"
resource.labels.service_name="catchup"
httpRequest.requestUrl=~"/api/jobs/"
httpRequest.requestHeaders."x-cloudtasks-taskretrycount">0
```

**Export Logs to BigQuery** (for analysis):
```bash
# Create log sink
gcloud logging sinks create cloud-tasks-logs \
  bigquery.googleapis.com/projects/catchup-479221/datasets/cloud_tasks_logs \
  --log-filter='resource.type="cloud_run_revision" AND jsonPayload.component="cloud-tasks"'
```


## 9. Error Handling and Recovery

### 9.1 Cloud Tasks Error Handling

**HTTP Status Code Handling**:
```typescript
// 2xx: Success - task deleted from queue
if (statusCode >= 200 && statusCode < 300) {
  console.log('[Cloud Tasks] Task completed successfully');
  // Task automatically deleted
}

// 429, 503, 5xx: Transient errors - automatic retry
if (statusCode === 429 || statusCode === 503 || statusCode >= 500) {
  console.warn('[Cloud Tasks] Transient error, will retry');
  // Cloud Tasks automatically retries with exponential backoff
}

// 4xx (except 429): Permanent errors - no retry
if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
  console.error('[Cloud Tasks] Permanent error, task deleted');
  // Task automatically deleted, no retry
}
```

**Retry Configuration**:
```typescript
// Example: calendar-sync queue
{
  maxAttempts: 5,
  minBackoff: '30s',
  maxBackoff: '1800s',
  maxDoublings: 3
}

// Retry schedule:
// 1st retry: 30s
// 2nd retry: 60s (doubled)
// 3rd retry: 120s (doubled)
// 4th retry: 240s (doubled)
// 5th retry: 480s (linear increase)
// Max attempts reached: Task deleted
```

### 9.2 Job Processor Error Handling

**Retryable Errors**:
```typescript
export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

// Usage in job processor
async function syncContacts(data: { userId: string }): Promise<void> {
  try {
    await googleContactsAPI.sync(data.userId);
  } catch (error: any) {
    if (error.code === 'ETIMEDOUT' || error.statusCode === 503) {
      throw new RetryableError(`Transient error: ${error.message}`);
    }
    throw error; // Permanent error
  }
}
```

**Error Classification**:
```typescript
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND') {
    return true;
  }
  
  // HTTP errors
  if (error.statusCode === 429 || 
      error.statusCode === 503 ||
      (error.statusCode >= 500 && error.statusCode < 600)) {
    return true;
  }
  
  // Database errors
  if (error.message?.includes('connection') || 
      error.message?.includes('timeout')) {
    return true;
  }
  
  // Custom retryable errors
  if (error instanceof RetryableError) {
    return true;
  }
  
  return false;
}
```

### 9.3 Idempotency Error Handling

**Redis Unavailable**:
```typescript
async function checkIdempotency(req: Request, res: Response, next: NextFunction) {
  try {
    const processed = await IdempotencyManager.isProcessed(idempotencyKey);
    if (processed) {
      return res.status(200).json({ success: true, duplicate: true });
    }
    next();
  } catch (error) {
    console.error('[Idempotency] Redis error, failing open:', error);
    // Fail open: allow execution if Redis is down
    next();
  }
}
```

**Graceful Degradation**:
- If Redis is unavailable, allow job execution
- Log warning for monitoring
- Better to execute duplicate than block all jobs
- Idempotency is best-effort, not guaranteed

### 9.4 Recovery Procedures

**High Task Failure Rate**:
```bash
# 1. Check Cloud Logging for error patterns
gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR" \
  --limit=100 \
  --format=json

# 2. Identify common error messages
# Group by error message and count occurrences

# 3. Fix root cause (e.g., API credentials, database connection)

# 4. Purge failed tasks if needed
gcloud tasks queues purge google-contacts-sync-queue \
  --location=us-central1
```

**Queue Depth Growing**:
```bash
# 1. Check queue depth
gcloud tasks queues describe google-contacts-sync-queue \
  --location=us-central1

# 2. Check if Cloud Run is scaling
gcloud run services describe catchup \
  --region=us-central1 \
  --format="value(status.conditions)"

# 3. Increase Cloud Run max instances if needed
gcloud run services update catchup \
  --region=us-central1 \
  --max-instances=10

# 4. Increase queue dispatch rate if needed
gcloud tasks queues update google-contacts-sync-queue \
  --location=us-central1 \
  --max-dispatches-per-second=50
```

**OIDC Authentication Failures**:
```bash
# 1. Verify service account has Cloud Run Invoker role
gcloud run services get-iam-policy catchup \
  --region=us-central1

# 2. Add role if missing
gcloud run services add-iam-policy-binding catchup \
  --region=us-central1 \
  --member="serviceAccount:402592213346-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"

# 3. Test OIDC token generation
gcloud auth print-identity-token \
  --impersonate-service-account=402592213346-compute@developer.gserviceaccount.com \
  --audiences=https://catchup-402592213346.us-central1.run.app
```

**Rollback to BullMQ**:
```bash
# 1. Set feature flag to false
gcloud run services update catchup \
  --region=us-central1 \
  --update-env-vars USE_CLOUD_TASKS=false

# 2. Verify BullMQ is working
gcloud logging read "resource.type=cloud_run_revision AND textPayload=~'BullMQ'" \
  --limit=50

# 3. Monitor for stability
# Wait 1 hour and check error rates
```

### 9.5 Dead Letter Queue (Manual)

**Note**: Cloud Tasks doesn't have built-in DLQ, but we can implement manually

**Failed Task Logging**:
```typescript
// In job handler, log permanently failed tasks
if (retryCount >= maxAttempts) {
  await logFailedTask({
    jobName,
    data,
    error: error.message,
    retryCount,
    timestamp: new Date()
  });
}

// Store in database for manual review
async function logFailedTask(task: FailedTask): Promise<void> {
  await pool.query(
    `INSERT INTO failed_tasks (job_name, data, error, retry_count, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [task.jobName, JSON.stringify(task.data), task.error, task.retryCount, task.timestamp]
  );
}
```

**Manual Retry**:
```typescript
// Admin endpoint to retry failed tasks
router.post('/admin/retry-failed-task/:id', async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(
    'SELECT * FROM failed_tasks WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const task = result.rows[0];
  
  // Re-enqueue task
  await enqueueJob(task.job_name, JSON.parse(task.data));
  
  // Mark as retried
  await pool.query(
    'UPDATE failed_tasks SET retried_at = NOW() WHERE id = $1',
    [id]
  );
  
  res.json({ success: true });
});
```


## 10. Security Considerations

### 10.1 OIDC Authentication

**How It Works**:
1. Cloud Tasks generates OIDC token using service account
2. Token includes audience claim (Cloud Run service URL)
3. Cloud Run validates token automatically
4. Invalid tokens rejected with 401 Unauthorized

**Token Validation**:
```typescript
// Cloud Run automatically validates OIDC tokens
// Additional validation can be added if needed
async function validateOIDCToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing OIDC token' });
  }
  
  // Cloud Run has already validated the token
  // If we reach here, token is valid
  
  // Optional: Additional validation
  const token = authHeader.substring(7);
  const decoded = jwt.decode(token);
  
  if (decoded.aud !== process.env.CLOUD_RUN_URL) {
    return res.status(401).json({ error: 'Unauthorized: Invalid audience' });
  }
  
  next();
}
```

**Service Account Permissions**:
- Principle of least privilege
- Only Cloud Run Invoker role
- No additional permissions needed
- Audit service account usage regularly

### 10.2 Request Validation

**Validate Request Source**:
```typescript
// Verify request comes from Cloud Tasks
function validateCloudTasksRequest(req: Request, res: Response, next: NextFunction) {
  const queueName = req.headers['x-cloudtasks-queuename'];
  const taskName = req.headers['x-cloudtasks-taskname'];
  
  if (!queueName || !taskName) {
    console.warn('[Jobs] Request missing Cloud Tasks headers');
    return res.status(400).json({ error: 'Invalid request source' });
  }
  
  // Verify queue name matches expected pattern
  const validQueues = Object.values(QUEUE_CONFIGS).map(c => c.name);
  if (!validQueues.includes(queueName as string)) {
    console.warn('[Jobs] Invalid queue name:', queueName);
    return res.status(400).json({ error: 'Invalid queue name' });
  }
  
  next();
}
```

**Validate Payload**:
```typescript
// Validate job data structure
function validateJobPayload(req: Request, res: Response, next: NextFunction) {
  const { data, idempotencyKey, jobName } = req.body;
  
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid data field' });
  }
  
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return res.status(400).json({ error: 'Invalid idempotency key' });
  }
  
  if (!jobName || typeof jobName !== 'string') {
    return res.status(400).json({ error: 'Invalid job name' });
  }
  
  next();
}
```

### 10.3 Data Security

**Sensitive Data Handling**:
```typescript
// Never log sensitive data
console.log('[Jobs] Starting job:', {
  jobName,
  userId: data.userId, // OK: User ID is not sensitive
  // DON'T LOG: passwords, tokens, API keys, PII
});

// Redact sensitive fields before logging
function redactSensitiveData(data: any): any {
  const redacted = { ...data };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
  
  for (const field of sensitiveFields) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }
  
  return redacted;
}
```

**Encryption**:
- All data in transit encrypted (HTTPS)
- Cloud Tasks uses TLS 1.2+
- Cloud Run enforces HTTPS
- Redis uses TLS for HTTP client

### 10.4 Rate Limiting

**Prevent Abuse**:
```typescript
// Rate limit task creation per user
const rateLimiter = new Map<string, number>();

async function rateLimitTaskCreation(userId: string): Promise<boolean> {
  const key = `task_creation:${userId}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  
  const count = rateLimiter.get(key) || 0;
  
  if (count >= 100) { // Max 100 tasks per minute per user
    console.warn('[Rate Limit] Task creation limit exceeded:', { userId });
    return false;
  }
  
  rateLimiter.set(key, count + 1);
  
  // Clean up old entries
  setTimeout(() => {
    rateLimiter.delete(key);
  }, windowMs);
  
  return true;
}
```

**Queue Rate Limits**:
- Configured per queue in Cloud Tasks
- Prevents overwhelming Cloud Run
- Default: 500 dispatches/second per queue
- Adjust based on Cloud Run capacity

### 10.5 Audit Logging

**Log All Security Events**:
```typescript
// Log authentication failures
console.error('[Security] OIDC authentication failed:', {
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date()
});

// Log unauthorized access attempts
console.error('[Security] Unauthorized access attempt:', {
  endpoint: req.path,
  ip: req.ip,
  timestamp: new Date()
});

// Log task creation
console.log('[Audit] Task created:', {
  jobName,
  userId: data.userId,
  createdBy: req.user?.id,
  timestamp: new Date()
});
```

**Audit Trail**:
- All task creations logged
- All job executions logged
- All failures logged with context
- Logs retained for 30 days (Cloud Logging default)
- Export to BigQuery for long-term retention


## 11. Performance Optimization

### 11.1 Task Creation Optimization

**Batch Task Creation**:
```typescript
// Create multiple tasks in parallel
async function enqueueBatchJobs(
  jobName: string,
  dataArray: any[]
): Promise<string[]> {
  const queue = new CloudTasksQueue(jobName);
  
  // Create tasks in parallel (max 10 concurrent)
  const chunks = chunkArray(dataArray, 10);
  const results: string[] = [];
  
  for (const chunk of chunks) {
    const promises = chunk.map(data => queue.add(jobName, data));
    const taskNames = await Promise.all(promises);
    results.push(...taskNames);
  }
  
  return results;
}
```

**Connection Pooling**:
```typescript
// Reuse CloudTasksClient instance
let clientInstance: CloudTasksClient | null = null;

function getCloudTasksClient(): CloudTasksClient {
  if (!clientInstance) {
    clientInstance = new CloudTasksClient();
  }
  return clientInstance;
}
```

### 11.2 Job Execution Optimization

**Parallel Processing**:
```typescript
// Process multiple items in parallel within a job
async function syncContacts(data: { userId: string }): Promise<void> {
  const contacts = await fetchContacts(data.userId);
  
  // Process in batches of 10
  const chunks = chunkArray(contacts, 10);
  
  for (const chunk of chunks) {
    await Promise.all(chunk.map(contact => processContact(contact)));
  }
}
```

**Caching**:
```typescript
// Cache frequently accessed data
async function getUser(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;
  
  // Check cache first
  const cached = await httpRedis.get<User>(cacheKey);
  if (cached) return cached;
  
  // Fetch from database
  const user = await db.getUser(userId);
  
  // Cache for 1 hour
  await httpRedis.set(cacheKey, user, 3600);
  
  return user;
}
```

### 11.3 Idempotency Optimization

**Efficient Key Generation**:
```typescript
// Use fast hash algorithm
import { createHash } from 'crypto';

function generateIdempotencyKey(jobName: string, data: any): string {
  // Use SHA-256 (fast and collision-resistant)
  const hash = createHash('sha256');
  hash.update(jobName);
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}
```

**Redis Pipeline**:
```typescript
// Check and set idempotency key in single round-trip
async function checkAndMarkProcessed(key: string): Promise<boolean> {
  // Use Redis SET NX (set if not exists)
  const result = await httpRedis.set(
    `idempotency:${key}`,
    '1',
    { nx: true, ex: 86400 }
  );
  
  return result === 'OK'; // true if key was set (not processed)
}
```

### 11.4 Cloud Run Optimization

**Minimum Instances**:
```bash
# Set minimum instances to reduce cold starts
gcloud run services update catchup \
  --region=us-central1 \
  --min-instances=1

# Cost: ~$10/month per instance
# Benefit: Eliminates cold starts for job handlers
```

**CPU Allocation**:
```bash
# Allocate CPU always (not just during requests)
gcloud run services update catchup \
  --region=us-central1 \
  --cpu-throttling=false

# Benefit: Faster job execution
# Cost: Slightly higher (CPU billed during idle time)
```

**Concurrency**:
```bash
# Increase max concurrent requests per instance
gcloud run services update catchup \
  --region=us-central1 \
  --concurrency=80

# Default: 80
# Max: 1000
# Benefit: Handle more tasks per instance
```

### 11.5 Queue Configuration Optimization

**Dispatch Rate**:
```bash
# Increase dispatch rate for high-volume queues
gcloud tasks queues update batch-notifications-queue \
  --location=us-central1 \
  --max-dispatches-per-second=100

# Default: 500
# Adjust based on Cloud Run capacity
```

**Concurrent Dispatches**:
```bash
# Increase concurrent dispatches
gcloud tasks queues update batch-notifications-queue \
  --location=us-central1 \
  --max-concurrent-dispatches=2000

# Default: 1000
# Benefit: More tasks executing simultaneously
```


## 12. Migration Strategy

### 12.1 Pre-Migration Checklist

**Infrastructure**:
- [ ] Cloud Tasks API enabled
- [ ] All 11 queues created with correct retry configs
- [ ] Service account has Cloud Run Invoker role
- [ ] Environment variables configured
- [ ] Scripts for queue creation/deletion ready

**Code**:
- [ ] `@google-cloud/tasks` package installed
- [ ] CloudTasksQueue class implemented
- [ ] Job handler endpoint implemented
- [ ] Idempotency system implemented
- [ ] All 11 processor functions extracted
- [ ] Feature flag added to queue-factory
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing

**Documentation**:
- [ ] Design document reviewed and approved
- [ ] Deployment runbook created
- [ ] Rollback procedure documented
- [ ] Monitoring dashboard configured
- [ ] Alert policies created

### 12.2 Migration Phases

**Phase 1: Infrastructure Setup** (Day 1)
- Enable Cloud Tasks API
- Create all 11 queues
- Verify IAM permissions
- Test basic task creation

**Phase 2: Code Implementation** (Days 2-4)
- Implement Cloud Tasks client
- Implement job handler endpoint
- Extract processor functions
- Write tests

**Phase 3: Testing** (Days 5-6)
- Unit tests
- Integration tests
- Load tests
- End-to-end tests in staging

**Phase 4: Staging Deployment** (Day 7)
- Deploy to staging
- Set USE_CLOUD_TASKS=true
- Monitor for 24 hours
- Fix any issues

**Phase 5: Production Deployment** (Day 8)
- Deploy to production
- Set USE_CLOUD_TASKS=true
- Monitor for 48 hours
- Verify cost savings

**Phase 6: Cleanup** (Day 9-10)
- Remove BullMQ code
- Update documentation
- Archive old code

### 12.3 Gradual Rollout Strategy

**Option A: Feature Flag (Recommended)**
```typescript
// All jobs switch at once
const USE_CLOUD_TASKS = process.env.USE_CLOUD_TASKS === 'true';

if (USE_CLOUD_TASKS) {
  await enqueueJob('google-contacts-sync', { userId });
} else {
  await bullmqQueue.add('sync', { userId });
}
```

**Option B: Per-Job Rollout** (More cautious)
```typescript
// Migrate one job type at a time
const CLOUD_TASKS_JOBS = new Set([
  'webhook-health-check',  // Day 1: Non-critical
  'notification-reminder',  // Day 2: Non-critical
  'token-health-reminder',  // Day 3: Non-critical
  // ... add more as confidence grows
]);

if (CLOUD_TASKS_JOBS.has(jobName)) {
  await enqueueJob(jobName, data);
} else {
  await bullmqQueue.add(jobName, data);
}
```

**Recommendation**: Use Option A (feature flag) after thorough testing in staging

### 12.4 Rollback Procedures

**Immediate Rollback** (< 5 minutes):
```bash
# Set feature flag to false
gcloud run services update catchup \
  --region=us-central1 \
  --update-env-vars USE_CLOUD_TASKS=false

# Verify BullMQ is working
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

**Partial Rollback** (specific job types):
```typescript
// Rollback specific job types
const BULLMQ_JOBS = new Set([
  'google-contacts-sync',  // Rollback this job
]);

if (BULLMQ_JOBS.has(jobName)) {
  await bullmqQueue.add(jobName, data);
} else {
  await enqueueJob(jobName, data);
}
```

**Data Preservation**:
- No data migration needed
- Both systems can run simultaneously
- No job loss during rollback
- Idempotency prevents duplicates

### 12.5 Post-Migration Validation

**Validation Checklist**:
- [ ] All 11 job types executing successfully
- [ ] Zero "Stream isn't writeable" errors
- [ ] Job execution success rate >99.9%
- [ ] Cloud Monitoring shows healthy metrics
- [ ] No user complaints about missing syncs
- [ ] Cost reduced to $0/month
- [ ] Upstash Redis command usage reduced
- [ ] No increase in Cloud Run costs

**Monitoring Period**:
- Day 1-2: Monitor every hour
- Day 3-7: Monitor twice daily
- Week 2+: Monitor daily
- Month 1+: Monitor weekly

**Success Criteria**:
- ✅ 7 days with zero connection errors
- ✅ Job execution success rate >99.9%
- ✅ Cost savings confirmed ($30/year)
- ✅ No user-facing issues
- ✅ Team comfortable with new system


## 13. Risk Assessment and Mitigation

### 13.1 High Risk Items

#### Risk 1: Duplicate Job Execution

**Description**: Cloud Tasks guarantees >99.999% single execution, but duplicates are possible

**Probability**: Low  
**Impact**: High (could cause duplicate notifications or data corruption)  
**Risk Level**: HIGH

**Mitigation Strategies**:
1. Implement idempotency keys with Redis storage
2. Make all job processors idempotent (safe to run multiple times)
3. Use database transactions for atomic operations
4. Add duplicate detection in business logic
5. Monitor duplicate rate in production

**Contingency Plan**:
- Idempotency system catches >99% of duplicates
- Job processors designed to be idempotent
- Database constraints prevent duplicate data
- Monitor and alert on duplicate rate >0.1%

**Monitoring**:
- Track idempotency cache hit rate
- Alert if duplicate rate >0.1%
- Log all duplicate requests for analysis

#### Risk 2: OIDC Authentication Issues

**Description**: OIDC token validation failures could block all job execution

**Probability**: Low  
**Impact**: High (all jobs would fail)  
**Risk Level**: HIGH

**Mitigation Strategies**:
1. Verify service account permissions before deployment
2. Test OIDC authentication in staging
3. Monitor authentication failures
4. Have rollback plan ready
5. Document troubleshooting steps

**Contingency Plan**:
- Immediate rollback to BullMQ if authentication fails
- Fix IAM permissions and redeploy
- Service account already has correct permissions (verified)

**Monitoring**:
- Track 401 Unauthorized errors
- Alert if authentication failure rate >1%
- Log all authentication failures with context

### 13.2 Medium Risk Items

#### Risk 3: Migration Complexity

**Description**: Migrating 11 job types could introduce bugs or missed edge cases

**Probability**: Medium  
**Impact**: Medium (some jobs might fail)  
**Risk Level**: MEDIUM

**Mitigation Strategies**:
1. Comprehensive testing before deployment
2. Gradual rollout with feature flag
3. Monitor each job type separately
4. Keep BullMQ code for rollback
5. Test in staging first

**Contingency Plan**:
- Rollback to BullMQ if critical jobs fail
- Fix issues in development and redeploy
- Can run both systems simultaneously during migration

**Monitoring**:
- Track success rate per job type
- Alert if any job type has <95% success rate
- Monitor for new error patterns

#### Risk 4: Performance Degradation

**Description**: HTTP-based Cloud Tasks might have higher latency than TCP-based BullMQ

**Probability**: Low  
**Impact**: Medium (jobs might take longer to start)  
**Risk Level**: MEDIUM

**Mitigation Strategies**:
1. Load testing before deployment
2. Monitor job execution latency
3. Optimize Cloud Run configuration (min instances)
4. Set performance budgets (p95 < 5 seconds)
5. Tune queue dispatch rates

**Contingency Plan**:
- Increase Cloud Run min instances to reduce cold starts
- Optimize job processors for faster execution
- Adjust queue dispatch rates if needed

**Monitoring**:
- Track job execution start latency (p50, p95, p99)
- Alert if p95 > 10 seconds
- Compare to BullMQ baseline

### 13.3 Low Risk Items

#### Risk 5: Cost Overrun

**Description**: Cloud Tasks usage might exceed free tier

**Probability**: Very Low  
**Impact**: Low ($0.40 per million operations)  
**Risk Level**: LOW

**Mitigation Strategies**:
1. Monitor Cloud Tasks operations daily
2. Set budget alerts at 80% of free tier
3. Optimize task creation (avoid unnecessary tasks)
4. Project monthly usage based on current patterns

**Contingency Plan**:
- Free tier is 1M operations/month
- Current usage: ~24K operations/month
- 40x headroom before hitting limit
- Cost if exceeded: $0.40 per million = negligible

**Monitoring**:
- Track daily operations count
- Project monthly usage
- Alert at 800K operations/month (80% of free tier)

#### Risk 6: Vendor Lock-in

**Description**: Cloud Tasks is GCP-specific, harder to migrate to other cloud providers

**Probability**: N/A (accepted trade-off)  
**Impact**: Low (already on GCP)  
**Risk Level**: LOW

**Mitigation Strategies**:
1. Abstract queue interface (already done with queue-factory)
2. Keep business logic separate from queue system
3. Document migration path to other queue systems
4. Accept trade-off for native integration benefits

**Contingency Plan**:
- Can migrate to AWS SQS or Azure Queue Storage if needed
- Queue interface abstraction makes migration easier
- Business logic remains unchanged

### 13.4 Risk Matrix

| Risk | Probability | Impact | Level | Mitigation Priority |
|------|------------|--------|-------|-------------------|
| Duplicate Execution | Low | High | HIGH | 1 |
| OIDC Authentication | Low | High | HIGH | 1 |
| Migration Complexity | Medium | Medium | MEDIUM | 2 |
| Performance Degradation | Low | Medium | MEDIUM | 2 |
| Cost Overrun | Very Low | Low | LOW | 3 |
| Vendor Lock-in | N/A | Low | LOW | 3 |


## 14. Success Metrics and KPIs

### 14.1 Primary Success Metrics

**Job Execution Success Rate**:
- Target: >99.9%
- Current (BullMQ): ~0% (all failing)
- Measurement: Cloud Monitoring + Cloud Logging
- Success: Sustained >99.9% for 7 days

**Production Error Rate**:
- Target: 0 "Stream isn't writeable" errors
- Current (BullMQ): 100% of jobs failing
- Measurement: Cloud Logging error count
- Success: Zero connection errors for 7 days

**Cost Savings**:
- Target: $30/year ($2.53/month → $0/month)
- Current: $2.53/month (Upstash Redis)
- Measurement: GCP billing + Upstash billing
- Success: $0/month for queue infrastructure

**Migration Completion**:
- Target: 100% of job types migrated within 2 weeks
- Current: 0% migrated
- Measurement: Feature flag status + job execution logs
- Success: All 11 job types using Cloud Tasks

### 14.2 Secondary Success Metrics

**Job Enqueue Latency**:
- Target: <100ms (p95)
- Measurement: Application logs + Cloud Monitoring
- Success: p95 latency <100ms for 7 days

**Job Execution Start Latency**:
- Target: <5 seconds (p95)
- Measurement: Cloud Tasks metrics + application logs
- Success: p95 latency <5 seconds for 7 days

**Idempotency Check Latency**:
- Target: <50ms (p95)
- Measurement: Application logs
- Success: p95 latency <50ms for 7 days

**Duplicate Job Prevention**:
- Target: >99% of duplicates caught
- Measurement: Idempotency cache hit rate
- Success: Cache hit rate >99% for duplicate requests

### 14.3 Operational Metrics

**Queue Depth**:
- Target: <100 tasks per queue
- Measurement: Cloud Monitoring
- Alert: >500 tasks for 15 minutes

**Task Retry Rate**:
- Target: <5% of tasks require retry
- Measurement: Cloud Tasks metrics
- Alert: >10% retry rate for 10 minutes

**Job Execution Duration**:
- Target: <30 seconds (p95) per job type
- Measurement: Application logs
- Alert: p95 >60 seconds for any job type

**Cloud Run Scaling**:
- Target: <10 instances during normal load
- Measurement: Cloud Monitoring
- Alert: >20 instances for 10 minutes

### 14.4 Business Metrics

**User-Facing Features**:
- Target: 100% uptime for sync features
- Measurement: User reports + feature monitoring
- Success: No user complaints about missing syncs

**Data Freshness**:
- Target: Contacts/calendar synced within 24 hours
- Measurement: Database timestamps
- Success: All users synced within SLA

**System Reliability**:
- Target: 99.9% uptime for job system
- Measurement: Cloud Monitoring + incident reports
- Success: <8.76 hours downtime per year

### 14.5 Monitoring Dashboard

**Key Metrics to Display**:

**Job Execution Health**:
- Success rate per job type (gauge)
- Failure rate per job type (line chart)
- Execution duration per job type (histogram)
- Target: >99.9% success rate

**Queue Health**:
- Queue depth per queue (bar chart)
- Task creation rate (line chart)
- Task execution rate (line chart)
- Target: Queue depth <100

**Performance**:
- Job enqueue latency (histogram)
- Job execution start latency (histogram)
- Idempotency check latency (histogram)
- Target: p95 <5 seconds

**Cost**:
- Cloud Tasks operations per day (bar chart)
- Projected monthly operations (gauge)
- Cost savings vs BullMQ (counter)
- Target: <1M operations/month (free tier)

### 14.6 Success Criteria Recap

The migration will be considered successful when:
- ✅ Job execution success rate >99.9% for 7 consecutive days
- ✅ Zero "Stream isn't writeable" errors for 7 consecutive days
- ✅ Cost reduced from $2.53/month to $0/month
- ✅ All 11 job types migrated and operational
- ✅ No user-facing issues or complaints
- ✅ Team comfortable with new system
- ✅ Documentation complete and up-to-date


## 15. Documentation and Knowledge Transfer

### 15.1 Documentation Updates Required

**Architecture Documentation**:
- Update system architecture diagrams (remove BullMQ, add Cloud Tasks)
- Document Cloud Tasks integration patterns
- Explain OIDC authentication flow
- Document idempotency system

**API Documentation**:
- Document job handler endpoint (`/api/jobs/:jobName`)
- Document CloudTasksQueue API
- Document idempotency system API
- Add migration guide for developers

**Operations Documentation**:
- Create troubleshooting runbook
- Document monitoring procedures
- Create alert response procedures
- Document rollback procedures

**Developer Documentation**:
- Update development setup guide
- Document new environment variables
- Create code examples for common patterns
- Document testing procedures

### 15.2 Runbook

**Common Issues and Solutions**:

**Issue: High Task Failure Rate**
```
Symptoms: Task failure rate >5%
Diagnosis: Check Cloud Logging for error patterns
Solution:
  1. Identify common error messages
  2. Fix root cause (API credentials, database connection, etc.)
  3. Purge failed tasks if needed
  4. Monitor for improvement
```

**Issue: Queue Depth Growing**
```
Symptoms: Queue depth >1000 tasks
Diagnosis: Check if Cloud Run is scaling properly
Solution:
  1. Check Cloud Run instance count
  2. Increase max instances if needed
  3. Increase queue dispatch rate if needed
  4. Check for slow job processors
```

**Issue: OIDC Authentication Failures**
```
Symptoms: 401 Unauthorized errors
Diagnosis: Check service account IAM permissions
Solution:
  1. Verify service account has Cloud Run Invoker role
  2. Add role if missing
  3. Test OIDC token generation
  4. Redeploy if needed
```

**Issue: Idempotency System Down**
```
Symptoms: Redis connection errors
Diagnosis: Check Upstash Redis status
Solution:
  1. Verify Upstash Redis is accessible
  2. Check environment variables
  3. System fails open (allows execution)
  4. Fix Redis connection and monitor
```

**Issue: Jobs Not Executing**
```
Symptoms: Tasks created but not executing
Diagnosis: Check Cloud Run logs and queue status
Solution:
  1. Verify Cloud Run service is running
  2. Check queue is not paused
  3. Verify OIDC authentication works
  4. Check Cloud Run has capacity
```

### 15.3 Training Materials

**Team Training Topics**:
1. Cloud Tasks architecture and concepts
2. OIDC authentication flow
3. Idempotency system design
4. Monitoring and alerting
5. Troubleshooting procedures
6. Rollback procedures

**Training Format**:
- Technical presentation (1 hour)
- Hands-on workshop (2 hours)
- Q&A session (30 minutes)
- Written documentation for reference

**Training Checklist**:
- [ ] Explain Cloud Tasks vs BullMQ differences
- [ ] Demo task creation and execution
- [ ] Show monitoring dashboard
- [ ] Walk through troubleshooting scenarios
- [ ] Practice rollback procedure
- [ ] Review documentation

### 15.4 Knowledge Base Articles

**Article 1: Understanding Cloud Tasks**
- What is Cloud Tasks
- How it works with Cloud Run
- OIDC authentication explained
- Retry behavior and configuration

**Article 2: Creating and Managing Tasks**
- Using CloudTasksQueue class
- Scheduling tasks for future execution
- Configuring retry behavior
- Monitoring task execution

**Article 3: Idempotency Best Practices**
- Why idempotency matters
- How our idempotency system works
- Writing idempotent job processors
- Handling duplicate requests

**Article 4: Monitoring and Alerting**
- Key metrics to monitor
- Using Cloud Monitoring dashboard
- Responding to alerts
- Troubleshooting common issues

**Article 5: Migration from BullMQ**
- Why we migrated
- Key differences
- Migration process
- Lessons learned

### 15.5 Code Examples

**Example 1: Creating a Task**
```typescript
import { enqueueJob } from './jobs/queue-factory';

// Simple task
await enqueueJob('google-contacts-sync', { userId: '123' });

// Delayed task (1 hour)
await enqueueJob('google-contacts-sync', { userId: '123' }, { delay: 3600 });

// Scheduled task (specific time)
const scheduleTime = new Date('2026-02-20T10:00:00Z');
await enqueueJob('google-contacts-sync', { userId: '123' }, { scheduleTime });
```

**Example 2: Writing a Job Processor**
```typescript
// src/jobs/processors/my-job-processor.ts
export async function processMyJob(data: { userId: string }): Promise<void> {
  const { userId } = data;
  
  console.log(`Starting my job for user ${userId}`);
  
  try {
    // Business logic here
    await doSomething(userId);
    
    console.log(`Completed my job for user ${userId}`);
  } catch (error) {
    // Throw RetryableError for transient failures
    if (isTransientError(error)) {
      throw new RetryableError(`Transient error: ${error.message}`);
    }
    
    // Throw regular error for permanent failures
    throw error;
  }
}
```

**Example 3: Testing a Job**
```typescript
import { processMyJob } from './my-job-processor';

describe('My Job Processor', () => {
  it('should process job successfully', async () => {
    await processMyJob({ userId: '123' });
    
    // Verify expected side effects
    const result = await checkResult('123');
    expect(result).toBeDefined();
  });
  
  it('should throw RetryableError for transient failures', async () => {
    // Mock transient failure
    mockTransientFailure();
    
    await expect(processMyJob({ userId: '123' }))
      .rejects.toThrow(RetryableError);
  });
});
```


## 16. Future Enhancements

### 16.1 Short-term Improvements (1-3 months)

**Enhanced Monitoring**:
- Real-time dashboard with auto-refresh
- Predictive alerts based on usage trends
- Anomaly detection for unusual patterns
- Integration with PagerDuty for critical alerts

**Performance Optimization**:
- Implement task batching for bulk operations
- Add result caching for idempotent operations
- Optimize job processors for faster execution
- Tune Cloud Run configuration for better performance

**Developer Experience**:
- CLI tool for creating and managing tasks
- Local development mode with mock Cloud Tasks
- Better error messages and debugging tools
- Code generation for new job types

### 16.2 Medium-term Improvements (3-6 months)

**Advanced Features**:
- Task dependencies (job chaining)
- Scheduled jobs (cron-like)
- Job prioritization
- Dead letter queue with automatic retry

**Observability**:
- Distributed tracing with Cloud Trace
- Custom metrics for business logic
- Cost attribution per job type
- Performance profiling

**Reliability**:
- Multi-region task execution
- Automatic failover
- Circuit breaker for external APIs
- Rate limiting per job type

### 16.3 Long-term Improvements (6-12 months)

**Workflow Engine**:
- Complex job workflows (DAGs)
- Conditional execution
- Parallel execution
- Human-in-the-loop approvals

**Advanced Scheduling**:
- Cron expressions
- Timezone-aware scheduling
- Holiday calendars
- Dynamic scheduling based on load

**Cost Optimization**:
- Intelligent batching to reduce operations
- Task deduplication at queue level
- Automatic scaling based on queue depth
- Cost analysis and recommendations

### 16.4 Potential Alternatives

**If Cloud Tasks Doesn't Meet Needs**:

**Option 1: Cloud Scheduler + Cloud Run**
- For cron-like scheduled jobs
- Direct HTTP invocation
- No queue management needed
- Cost: $0.10 per job per month

**Option 2: Pub/Sub + Cloud Run**
- For event-driven architecture
- Better for high-throughput scenarios
- More complex setup
- Cost: $0.40 per million messages

**Option 3: Workflows**
- For complex multi-step processes
- Visual workflow designer
- Built-in error handling
- Cost: $0.01 per 1000 steps

**When to Consider Alternatives**:
- Need for complex workflows (use Workflows)
- Need for pub/sub patterns (use Pub/Sub)
- Need for simple cron jobs (use Cloud Scheduler)
- Need for >1M operations/month (evaluate costs)

## 17. Conclusion

### 17.1 Summary

This design document outlines a comprehensive approach to migrating from BullMQ (TCP-based) to Google Cloud Tasks (HTTP-based) for background job processing in the CatchUp application.

**Key Points**:
1. **Problem**: BullMQ with TCP connections is incompatible with serverless Cloud Run
2. **Solution**: Cloud Tasks with HTTP requests designed for serverless
3. **Benefits**: Eliminate connection errors, reduce costs, simplify architecture
4. **Approach**: Phased migration with feature flag and comprehensive testing

### 17.2 Expected Benefits

**Technical Benefits**:
- Eliminate 100% of BullMQ connection failures
- Achieve >99.9% job execution success rate
- Simplify architecture (no connection management)
- Native Cloud Run integration with OIDC
- Built-in retry with exponential backoff
- Integrated monitoring with Cloud Monitoring

**Business Benefits**:
- Reduce queue infrastructure cost from $2.53/month to $0/month ($30/year savings)
- Improve user experience (no sync failures)
- Reduce operational overhead
- Foundation for future scaling
- Increased system reliability

**Operational Benefits**:
- Easier troubleshooting with Cloud Logging
- Better observability with Cloud Monitoring
- Simpler deployment (no Redis connection config)
- Faster development (no connection issues)
- Better team confidence in system

### 17.3 Next Steps

1. **Review and Approval**: Get stakeholder approval for design
2. **Phase 1 Implementation**: Create Cloud Tasks infrastructure
3. **Phase 2 Implementation**: Implement code changes
4. **Phase 3 Testing**: Comprehensive testing in staging
5. **Phase 4 Deployment**: Deploy to production with monitoring
6. **Phase 5 Cleanup**: Remove BullMQ code and dependencies

### 17.4 Success Criteria Recap

The migration will be considered successful when:
- ✅ Job execution success rate >99.9% for 7 consecutive days
- ✅ Zero "Stream isn't writeable" errors for 7 consecutive days
- ✅ Cost reduced from $2.53/month to $0/month
- ✅ All 11 job types migrated and operational
- ✅ No user-facing issues or complaints
- ✅ Team comfortable with new system
- ✅ Documentation complete and up-to-date

## 18. Appendix

### 18.1 Reference Links

**Official Documentation**:
- [Cloud Tasks Documentation](https://cloud.google.com/tasks/docs)
- [Cloud Tasks Node.js Client](https://cloud.google.com/nodejs/docs/reference/tasks/latest)
- [Cloud Tasks Quotas](https://cloud.google.com/tasks/docs/quotas)
- [Common Pitfalls](https://cloud.google.com/tasks/docs/common-pitfalls)
- [Authentication](https://cloud.google.com/tasks/docs/authentication)
- [Cloud Run Tutorial](https://cloud.google.com/tasks/docs/tutorial-gcf)

**Internal Documentation**:
- Requirements Document: `.kiro/specs/cloud-tasks-migration/requirements.md`
- Tasks Document: `.kiro/specs/cloud-tasks-migration/tasks.md` (to be created)
- Research Document: `CLOUD_TASKS_RESEARCH.md`
- Cost Analysis: `CLOUD_TASKS_VS_QSTASH_ANALYSIS.md`

**Related Specs**:
- Redis Optimization: `.kiro/specs/redis-optimization/`
- Google Integrations: `.kiro/steering/google-integrations.md`

### 18.2 Glossary

**Terms**:
- **Cloud Tasks**: Google Cloud service for asynchronous task execution
- **OIDC**: OpenID Connect, authentication protocol for service-to-service calls
- **Idempotency**: Property that allows operations to be safely repeated
- **Exponential Backoff**: Retry strategy with increasing delays
- **Service Account**: GCP identity for service-to-service authentication
- **Queue**: Collection of tasks waiting to be executed
- **Task**: Unit of work to be executed asynchronously
- **Job Processor**: Function that executes task business logic
- **Retry Config**: Configuration for automatic retry behavior

### 18.3 Contact Information

**Technical Lead**: [Your Name]  
**DevOps Lead**: [DevOps Name]  
**Product Owner**: [Product Name]  
**GCP Support**: https://cloud.google.com/support

### 18.4 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-19 | Kiro AI | Initial design document |

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-19  
**Status**: Draft - Awaiting Review  
**Next Review Date**: 2026-02-26

