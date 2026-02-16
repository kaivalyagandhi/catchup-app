# Redis Optimization: Hybrid HTTP + BullMQ Architecture - Design Document

## 1. Overview

### 1.1 Problem Statement

The current Bull queue implementation creates 33 Redis connections (11 queues × 3 connections each), overwhelming Upstash free tier limits and causing ECONNRESET errors. This design addresses connection exhaustion and high command usage through a hybrid architecture.

### 1.2 Solution Summary

Implement a hybrid architecture that uses:
- **HTTP-based Redis** (@upstash/redis) for cache and rate limiting (stateless, zero connections)
- **BullMQ** with shared connection pool for background job queues (1-3 connections total)

### 1.3 Expected Outcomes

- Reduce Redis connections from 38-46 to 1-3 (93-97% reduction)
- Reduce Redis command usage by 60-80%
- Eliminate connection errors (ECONNRESET, ETIMEDOUT)
- Maintain all existing functionality
- Stay within Upstash free tier (500K commands/month)

## 2. Architecture Design

### 2.1 Current Architecture Analysis

```
Current State (Bull + ioredis):
├── Cache (ioredis): 1 connection
├── Rate Limiter (ioredis): 1 connection
├── SMS Rate Limiter (ioredis): 1 connection
├── Connection Pool Manager (ioredis): 2-10 connections
└── Bull Queues: 33 connections (11 queues × 3 each)
    Total: 38-46 concurrent connections
```

**Issues**:
- Connection exhaustion on Upstash free tier
- High command usage from queue health checks
- Frequent disconnections and reconnections
- Cannot scale (add more queues)

### 2.2 Target Architecture

```
Hybrid Architecture (HTTP Redis + BullMQ):
├── Cache (@upstash/redis HTTP): 0 connections
├── Rate Limiter (@upstash/redis HTTP): 0 connections
├── SMS Rate Limiter (@upstash/redis HTTP): 0 connections
└── BullMQ Queues (shared pool): 1-3 connections
    Total: 1-3 concurrent connections (93-97% reduction)
```


### 2.3 Technology Selection

#### HTTP Redis Client (@upstash/redis)

**Use Cases**:
- Cache operations (get/set/delete)
- Rate limiting (sliding window)
- SMS rate limiting
- Simple key-value operations

**Advantages**:
- Zero persistent connections (stateless HTTP)
- Built-in retry with exponential backoff
- Automatic serialization/deserialization
- Perfect for Upstash REST API

**Trade-offs**:
- Higher latency: 10-50ms vs 1-5ms (acceptable for cache/rate-limiting)
- HTTP overhead per request
- Not suitable for pub/sub or streams

**Configuration**:
```typescript
import { Redis } from '@upstash/redis';

const httpRedis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  retry: {
    retries: 3,
    backoff: (retryCount) => Math.min(1000 * 2 ** retryCount, 10000)
  },
  automaticDeserialization: true
});
```

#### BullMQ

**Use Cases**:
- Background job processing
- Scheduled tasks
- Job retry and failure handling
- Job progress tracking

**Advantages**:
- Shared connection pool (all queues use 1-3 connections)
- Modern API with TypeScript support
- Better performance than Bull
- Active maintenance and updates

**Trade-offs**:
- API differences from Bull (migration required)
- Requires TCP connection (can't use HTTP)

**Configuration**:
```typescript
import { Queue, Worker, ConnectionOptions } from 'bullmq';

const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// All queues share this connection
const queue = new Queue('my-queue', { connection });
```


## 3. Component Design

### 3.1 HTTP Redis Client Module

**File**: `src/utils/http-redis-client.ts`

**Purpose**: Centralized HTTP Redis client for cache and rate limiting

**Interface**:
```typescript
export class HttpRedisClient {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      retry: { retries: 3, backoff: exponentialBackoff }
    });
  }

  // Cache operations
  async get<T>(key: string): Promise<T | null>;
  async set(key: string, value: any, ttlSeconds?: number): Promise<void>;
  async del(key: string): Promise<void>;
  async exists(key: string): Promise<boolean>;
  async deletePattern(pattern: string): Promise<number>;

  // Rate limiting operations
  async zadd(key: string, score: number, member: string): Promise<void>;
  async zcard(key: string): Promise<number>;
  async zremrangebyscore(key: string, min: number, max: number): Promise<void>;
  async expire(key: string, seconds: number): Promise<void>;
}

export const httpRedis = new HttpRedisClient();
```

**Error Handling**:
- Automatic retry with exponential backoff (3 attempts)
- Graceful degradation on Redis unavailability
- Detailed error logging with context
- Fallback to in-memory cache for critical operations

### 3.2 Cache Service Migration

**File**: `src/utils/cache.ts`

**Current Implementation** (ioredis):
```typescript
import { redis } from './redis-client';

export async function get<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

export async function set(key: string, value: any, ttl: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
}
```

**New Implementation** (@upstash/redis):
```typescript
import { httpRedis } from './http-redis-client';

export async function get<T>(key: string): Promise<T | null> {
  return await httpRedis.get<T>(key);
}

export async function set(key: string, value: any, ttl: number): Promise<void> {
  await httpRedis.set(key, value, ttl);
}

export async function del(key: string): Promise<void> {
  await httpRedis.del(key);
}

export async function deletePattern(pattern: string): Promise<number> {
  return await httpRedis.deletePattern(pattern);
}
```

**Migration Notes**:
- Automatic JSON serialization (no manual JSON.stringify)
- TTL as third parameter (not 'EX' flag)
- Same API surface for backward compatibility


### 3.3 Rate Limiter Migration

**File**: `src/utils/rate-limiter.ts`

**Current Implementation** (ioredis):
```typescript
import { redis } from './redis-client';

export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `rate_limit:${userId}:${config.type}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Add current request
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  
  // Count requests in window
  const count = await redis.zcard(key);
  
  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);
  
  // Set expiry
  await redis.expire(key, Math.ceil(config.windowMs / 1000));

  return {
    allowed: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    resetAt: new Date(now + config.windowMs)
  };
}
```

**New Implementation** (@upstash/redis):
```typescript
import { httpRedis } from './http-redis-client';

export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `rate_limit:${userId}:${config.type}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Add current request
  await httpRedis.zadd(key, now, `${now}-${Math.random()}`);
  
  // Count requests in window
  const count = await httpRedis.zcard(key);
  
  // Remove old entries
  await httpRedis.zremrangebyscore(key, 0, windowStart);
  
  // Set expiry
  await httpRedis.expire(key, Math.ceil(config.windowMs / 1000));

  return {
    allowed: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    resetAt: new Date(now + config.windowMs)
  };
}
```

**Migration Notes**:
- Nearly identical API (minimal changes)
- Same sliding window algorithm
- Performance: <50ms per check (acceptable)

### 3.4 SMS Rate Limiter Migration

**File**: `src/sms/sms-rate-limiter.ts`

**Current Implementation** (ioredis):
```typescript
import { redis } from '../utils/redis-client';

export async function checkSMSRateLimit(
  phoneNumber: string
): Promise<boolean> {
  const key = `sms_rate_limit:${phoneNumber}`;
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  await redis.zadd(key, now, `${now}`);
  const count = await redis.zcount(key, oneHourAgo, now);
  await redis.zremrangebyscore(key, 0, oneHourAgo);
  await redis.expire(key, 3600);

  return count <= 20; // 20 messages per hour
}
```

**New Implementation** (@upstash/redis):
```typescript
import { httpRedis } from '../utils/http-redis-client';

export async function checkSMSRateLimit(
  phoneNumber: string
): Promise<boolean> {
  const key = `sms_rate_limit:${phoneNumber}`;
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  await httpRedis.zadd(key, now, `${now}`);
  const count = await httpRedis.zcard(key);
  await httpRedis.zremrangebyscore(key, 0, oneHourAgo);
  await httpRedis.expire(key, 3600);

  return count <= 20; // 20 messages per hour
}
```

**Migration Notes**:
- Same logic, different client
- Maintains 20 messages/hour limit
- Performance: <50ms per check


### 3.5 BullMQ Queue Factory

**File**: `src/jobs/bullmq-connection.ts`

**Purpose**: Shared connection configuration for all BullMQ queues

**Implementation**:
```typescript
import { ConnectionOptions } from 'bullmq';

export const bullmqConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Connection pool settings
  maxRetriesPerRequest: null,
  enableOfflineQueue: false
};
```

**File**: `src/jobs/queue-factory.ts`

**Purpose**: Factory pattern for creating queues and workers

**Implementation**:
```typescript
import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import { bullmqConnection } from './bullmq-connection';

export function createQueue<T = any>(
  name: string,
  options?: Partial<QueueOptions>
): Queue<T> {
  return new Queue<T>(name, {
    connection: bullmqConnection,
    ...options
  });
}

export function createWorker<T = any>(
  name: string,
  processor: (job: Job<T>) => Promise<any>,
  options?: Partial<WorkerOptions>
): Worker<T> {
  return new Worker<T>(name, processor, {
    connection: bullmqConnection,
    concurrency: 1,
    ...options
  });
}
```

**Usage Example**:
```typescript
import { createQueue, createWorker } from './queue-factory';

// Create queue (shares connection)
const suggestionQueue = createQueue('suggestion-generation');

// Add job
await suggestionQueue.add('generate', { userId: '123' });

// Create worker (shares connection)
const worker = createWorker('suggestion-generation', async (job) => {
  const { userId } = job.data;
  await generateSuggestions(userId);
});
```

### 3.6 Queue Migration Strategy

**Queues to Migrate** (11 total):
1. suggestion-generation
2. batch-notifications
3. calendar-sync
4. suggestion-regeneration
5. google-contacts-sync
6. token-health-reminder
7. token-refresh
8. webhook-renewal
9. notification-reminder
10. adaptive-sync
11. webhook-health-check

**Migration Pattern** (per queue):

**Before (Bull)**:
```typescript
import Bull from 'bull';

const queue = new Bull('suggestion-generation', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }
});

queue.process(async (job) => {
  const { userId } = job.data;
  await generateSuggestions(userId);
});

queue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});
```

**After (BullMQ)**:
```typescript
import { createQueue, createWorker } from './queue-factory';

const queue = createQueue('suggestion-generation');

const worker = createWorker('suggestion-generation', async (job) => {
  const { userId } = job.data;
  await generateSuggestions(userId);
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});
```

**Key Differences**:
- Separate Queue and Worker classes
- Shared connection via factory
- Event listeners on Worker, not Queue
- Job options slightly different


## 4. Implementation Phases

### 4.1 Phase 1: HTTP Redis Migration (Priority: HIGH)

**Goal**: Reduce connection count immediately by migrating cache and rate limiting

**Estimated Effort**: 4-6 hours

**Tasks**:
1. Install @upstash/redis package
2. Create HttpRedisClient wrapper
3. Migrate cache.ts to use HTTP Redis
4. Migrate rate-limiter.ts to use HTTP Redis
5. Migrate sms-rate-limiter.ts to use HTTP Redis
6. Update environment variables
7. Test all cache operations
8. Test all rate limiting
9. Deploy to production
10. Monitor for 24 hours

**Success Criteria**:
- All cache operations work correctly
- All rate limiting works correctly
- Zero connection errors from cache/rate-limiting
- Command usage reduced by 30-40%
- No increase in API response times

**Rollback Plan**:
- Keep old ioredis code commented out
- Can revert by uncommenting and redeploying
- No data migration needed (same Redis instance)

### 4.2 Phase 2: Queue Optimization (Priority: MEDIUM)

**Goal**: Temporarily reduce queue connections by disabling non-critical queues

**Estimated Effort**: 1-2 hours

**Tasks**:
1. Identify critical vs non-critical queues
2. Comment out non-critical queue initialization
3. Update queue processors to handle missing queues
4. Deploy to production
5. Monitor for 48 hours

**Critical Queues** (keep enabled):
- google-contacts-sync (user-facing)
- calendar-sync (user-facing)
- token-refresh (prevents auth failures)

**Non-Critical Queues** (temporarily disable):
- suggestion-generation (can run on-demand)
- batch-notifications (can be delayed)
- suggestion-regeneration (can run on-demand)
- token-health-reminder (nice-to-have)
- webhook-renewal (has fallback)
- notification-reminder (nice-to-have)
- adaptive-sync (has fallback)
- webhook-health-check (nice-to-have)

**Success Criteria**:
- Reduce connections from 33 to 9 (3 queues × 3 connections)
- No impact on critical user-facing features
- Command usage reduced by additional 20-30%

**Rollback Plan**:
- Uncomment disabled queues
- Redeploy

### 4.3 Phase 3: BullMQ Migration (Priority: MEDIUM)

**Goal**: Migrate from Bull to BullMQ for proper connection pooling

**Estimated Effort**: 6-8 hours

**Tasks**:
1. Install bullmq package
2. Create bullmq-connection.ts with shared config
3. Create queue-factory.ts with factory functions
4. Migrate queue definitions (one at a time)
5. Migrate job processors to Workers
6. Update job event handlers
7. Test each queue thoroughly
8. Deploy to production
9. Re-enable all queues
10. Monitor for 7 days

**Migration Order** (safest first):
1. webhook-health-check (lowest risk)
2. notification-reminder
3. token-health-reminder
4. adaptive-sync
5. webhook-renewal
6. suggestion-regeneration
7. batch-notifications
8. suggestion-generation
9. token-refresh (critical)
10. calendar-sync (critical)
11. google-contacts-sync (critical)

**Success Criteria**:
- All 11 queues operational
- Shared connection pool (1-3 connections total)
- All job processing works correctly
- Zero connection errors
- Command usage stays within free tier

**Rollback Plan**:
- Keep Bull code in separate git branch
- Can revert to Bull + disabled queues
- Gradual rollback (one queue at a time)

### 4.4 Phase 4: Cleanup and Optimization (Priority: LOW)

**Goal**: Remove unused code and optimize remaining Redis usage

**Estimated Effort**: 2-3 hours

**Tasks**:
1. Remove Bull package from package.json
2. Remove old ioredis code from cache/rate-limiting
3. Evaluate Connection Pool Manager necessity
4. Optimize Redis command usage (batch operations)
5. Add comprehensive monitoring
6. Update documentation
7. Create runbook for troubleshooting

**Success Criteria**:
- Clean codebase with no unused dependencies
- Comprehensive monitoring in place
- Documentation updated
- Command usage optimized


## 5. Data Flow and Interactions

### 5.1 Cache Operations Flow

```
Request → API Handler
    ↓
Check Cache (HTTP Redis)
    ↓
Cache Hit? → Return cached data
    ↓
Cache Miss → Fetch from database
    ↓
Store in Cache (HTTP Redis, TTL)
    ↓
Return data
```

**Performance**:
- Cache hit: ~10-50ms (HTTP Redis latency)
- Cache miss: Database query time + cache write
- Acceptable for non-critical paths

### 5.2 Rate Limiting Flow

```
Request → Rate Limit Middleware
    ↓
Check Rate Limit (HTTP Redis)
    ↓
Within Limit? → Continue to handler
    ↓
Over Limit? → Return 429 Too Many Requests
```

**Performance**:
- Rate limit check: ~10-50ms
- Critical path, but acceptable latency
- Sliding window algorithm

### 5.3 Background Job Flow

```
API Handler → Add Job to Queue (BullMQ)
    ↓
Queue stores job in Redis (TCP)
    ↓
Worker picks up job (BullMQ)
    ↓
Process job
    ↓
Mark complete/failed
    ↓
Emit events
```

**Performance**:
- Job add: ~1-5ms (TCP Redis)
- Job processing: Depends on job type
- Low latency critical for job system

### 5.4 Connection Management

```
Application Startup
    ↓
Initialize HTTP Redis Client (stateless)
    ↓
Initialize BullMQ Connection (1-3 TCP connections)
    ↓
Create Queues (share connection)
    ↓
Create Workers (share connection)
    ↓
Application Ready
```

**Connection Lifecycle**:
- HTTP Redis: No persistent connections
- BullMQ: Persistent connection pool
- Automatic reconnection on failure
- Graceful shutdown on app termination


## 6. Configuration and Environment

### 6.1 Environment Variables

**New Variables** (Phase 1):
```bash
# Upstash HTTP Redis (for cache and rate limiting)
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_rest_token_here
```

**Existing Variables** (keep for BullMQ):
```bash
# Upstash TCP Redis (for BullMQ queues)
REDIS_URL=rediss://:password@your-database.upstash.io:6379

# Or individual components
REDIS_HOST=your-database.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_TLS=true
```

**Configuration Priority**:
1. Use UPSTASH_REDIS_REST_URL for cache and rate limiting (HTTP)
2. Use REDIS_URL for BullMQ queues (TCP)
3. Fall back to individual variables if needed

### 6.2 Package Dependencies

**Add**:
```json
{
  "dependencies": {
    "@upstash/redis": "^1.28.0",
    "bullmq": "^5.0.0"
  }
}
```

**Keep** (for BullMQ):
```json
{
  "dependencies": {
    "ioredis": "^5.3.2"
  }
}
```

**Remove** (after Phase 3):
```json
{
  "dependencies": {
    "bull": "^4.12.0"
  }
}
```

### 6.3 Configuration Files

**File**: `src/config/redis.config.ts`

```typescript
export const redisConfig = {
  http: {
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    retry: {
      retries: 3,
      backoff: (retryCount: number) => 
        Math.min(1000 * Math.pow(2, retryCount), 10000)
    }
  },
  tcp: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined
  },
  cache: {
    defaultTTL: 3600, // 1 hour
    maxTTL: 86400 // 24 hours
  },
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 60
  }
};
```


## 7. Testing Strategy

### 7.1 Unit Tests

**Cache Tests** (`src/utils/cache.test.ts`):
```typescript
describe('HTTP Redis Cache', () => {
  it('should set and get values', async () => {
    await cache.set('test-key', 'test-value', 60);
    const value = await cache.get('test-key');
    expect(value).toBe('test-value');
  });

  it('should handle TTL expiration', async () => {
    await cache.set('test-key', 'test-value', 1);
    await sleep(1100);
    const value = await cache.get('test-key');
    expect(value).toBeNull();
  });

  it('should delete keys', async () => {
    await cache.set('test-key', 'test-value');
    await cache.delete('test-key');
    const value = await cache.get('test-key');
    expect(value).toBeNull();
  });

  it('should delete by pattern', async () => {
    await cache.set('user:1:profile', 'data1');
    await cache.set('user:2:profile', 'data2');
    const deleted = await cache.deletePattern('user:*:profile');
    expect(deleted).toBe(2);
  });
});
```

**Rate Limiter Tests** (`src/utils/rate-limiter.test.ts`):
```typescript
describe('HTTP Redis Rate Limiter', () => {
  it('should allow requests within limit', async () => {
    const result = await checkRateLimit('user-1', {
      type: 'api',
      maxRequests: 10,
      windowMs: 60000
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeLessThanOrEqual(10);
  });

  it('should block requests over limit', async () => {
    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      await checkRateLimit('user-2', {
        type: 'api',
        maxRequests: 10,
        windowMs: 60000
      });
    }
    
    // 11th request should be blocked
    const result = await checkRateLimit('user-2', {
      type: 'api',
      maxRequests: 10,
      windowMs: 60000
    });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after window expires', async () => {
    // Fill rate limit
    for (let i = 0; i < 10; i++) {
      await checkRateLimit('user-3', {
        type: 'api',
        maxRequests: 10,
        windowMs: 1000
      });
    }
    
    // Wait for window to expire
    await sleep(1100);
    
    // Should allow requests again
    const result = await checkRateLimit('user-3', {
      type: 'api',
      maxRequests: 10,
      windowMs: 1000
    });
    expect(result.allowed).toBe(true);
  });
});
```

**Queue Tests** (`src/jobs/queue-factory.test.ts`):
```typescript
describe('BullMQ Queue Factory', () => {
  it('should create queue with shared connection', async () => {
    const queue = createQueue('test-queue');
    expect(queue).toBeDefined();
    expect(queue.name).toBe('test-queue');
  });

  it('should add and process jobs', async () => {
    const queue = createQueue('test-queue');
    const processedJobs: any[] = [];
    
    const worker = createWorker('test-queue', async (job) => {
      processedJobs.push(job.data);
      return { processed: true };
    });

    await queue.add('test-job', { data: 'value' });
    
    // Wait for job to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(processedJobs).toHaveLength(1);
    expect(processedJobs[0]).toEqual({ data: 'value' });
    
    await worker.close();
    await queue.close();
  });

  it('should handle job failures with retry', async () => {
    const queue = createQueue('test-queue');
    let attempts = 0;
    
    const worker = createWorker('test-queue', async (job) => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Simulated failure');
      }
      return { success: true };
    });

    await queue.add('test-job', { data: 'value' }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 100 }
    });
    
    // Wait for retries
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(attempts).toBe(3);
    
    await worker.close();
    await queue.close();
  });
});
```

### 7.2 Integration Tests

**End-to-End Cache Test**:
```typescript
describe('Cache Integration', () => {
  it('should cache API responses', async () => {
    const app = createTestApp();
    
    // First request (cache miss)
    const response1 = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${testToken}`);
    expect(response1.status).toBe(200);
    
    // Second request (cache hit)
    const response2 = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${testToken}`);
    expect(response2.status).toBe(200);
    expect(response2.body).toEqual(response1.body);
  });
});
```

**End-to-End Rate Limiting Test**:
```typescript
describe('Rate Limiting Integration', () => {
  it('should rate limit API requests', async () => {
    const app = createTestApp();
    
    // Make 60 requests (at limit)
    for (let i = 0; i < 60; i++) {
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
    }
    
    // 61st request should be rate limited
    const response = await request(app)
      .get('/api/test')
      .set('Authorization', `Bearer ${testToken}`);
    expect(response.status).toBe(429);
    expect(response.body.error).toContain('rate limit');
  });
});
```

**End-to-End Queue Test**:
```typescript
describe('Background Jobs Integration', () => {
  it('should process background jobs', async () => {
    const app = createTestApp();
    
    // Trigger job creation
    const response = await request(app)
      .post('/api/sync/google-contacts')
      .set('Authorization', `Bearer ${testToken}`);
    expect(response.status).toBe(202);
    
    // Wait for job to process
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify job completed
    const statusResponse = await request(app)
      .get('/api/sync/status')
      .set('Authorization', `Bearer ${testToken}`);
    expect(statusResponse.body.lastSync).toBeDefined();
    expect(statusResponse.body.status).toBe('completed');
  });
});
```

### 7.3 Performance Tests

**Latency Benchmarks**:
```typescript
describe('Performance', () => {
  it('cache operations should complete in < 100ms', async () => {
    const iterations = 100;
    const durations: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await cache.get('test-key');
      durations.push(Date.now() - start);
    }
    
    const p95 = percentile(durations, 95);
    expect(p95).toBeLessThan(100);
  });

  it('rate limit checks should complete in < 50ms', async () => {
    const iterations = 100;
    const durations: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await checkRateLimit('user-1', RateLimits.API_PER_USER);
      durations.push(Date.now() - start);
    }
    
    const p95 = percentile(durations, 95);
    expect(p95).toBeLessThan(50);
  });

  it('queue operations should complete in < 10ms', async () => {
    const queue = createQueue('test-queue');
    const iterations = 100;
    const durations: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await queue.add('test-job', { data: i });
      durations.push(Date.now() - start);
    }
    
    const p95 = percentile(durations, 95);
    expect(p95).toBeLessThan(10);
    
    await queue.close();
  });
});
```

### 7.4 Load Tests

**Concurrent Request Test**:
```bash
# Use Apache Bench
ab -n 1000 -c 10 https://catchup.club/api/contacts

# Expected results:
# - 0% error rate
# - < 200ms average response time
# - No Redis connection errors
```

**Queue Throughput Test**:
```typescript
describe('Queue Load Test', () => {
  it('should handle 1000 jobs without errors', async () => {
    const queue = createQueue('test-queue');
    const processedCount = { value: 0 };
    
    const worker = createWorker('test-queue', async (job) => {
      processedCount.value++;
      await sleep(10); // Simulate work
    }, { concurrency: 10 });

    // Add 1000 jobs
    const jobs = [];
    for (let i = 0; i < 1000; i++) {
      jobs.push(queue.add('test-job', { id: i }));
    }
    await Promise.all(jobs);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    expect(processedCount.value).toBe(1000);
    
    await worker.close();
    await queue.close();
  });
});
```


## 8. Monitoring and Observability

### 8.1 Metrics to Track

**Redis Connection Metrics**:
- Active TCP connections (target: 1-3)
- HTTP request count (per minute)
- Connection errors (target: 0)
- Connection pool utilization

**Command Usage Metrics**:
- Total commands per day
- Commands by type (GET, SET, ZADD, etc.)
- Commands by source (cache, rate-limit, queue)
- Percentage of free tier used

**Performance Metrics**:
- Cache operation latency (p50, p95, p99)
- Rate limit check latency (p50, p95, p99)
- Queue operation latency (p50, p95, p99)
- API response time impact

**Queue Metrics**:
- Jobs processed per hour
- Job success rate (target: >95%)
- Job duration by type
- Queue depth (target: <100)
- Failed job count

**Application Metrics**:
- Cache hit rate (target: >80%)
- Rate limit rejections per hour
- API error rate
- User-facing feature availability

### 8.2 Logging Strategy

**Log Levels**:

**INFO** - Normal operations:
```typescript
logger.info('cache_hit', { key, ttl, duration: 45 });
logger.info('rate_limit_check', { userId, allowed: true, remaining: 55 });
logger.info('job_completed', { queue: 'sync', jobId, duration: 1234 });
```

**WARN** - Degraded performance:
```typescript
logger.warn('cache_slow_response', { key, duration: 150 });
logger.warn('rate_limit_approaching', { userId, remaining: 5 });
logger.warn('job_retry', { queue: 'sync', jobId, attempt: 2 });
```

**ERROR** - Failures:
```typescript
logger.error('cache_operation_failed', { key, error: error.message });
logger.error('rate_limit_error', { userId, error: error.message });
logger.error('job_failed', { queue: 'sync', jobId, error: error.message });
```

**Structured Logging Format**:
```typescript
{
  timestamp: '2026-02-10T12:00:00.000Z',
  level: 'info',
  service: 'redis-optimization',
  operation: 'cache_get',
  key: 'user:123:profile',
  hit: true,
  duration: 45,
  userId: '123',
  requestId: 'req-abc-123'
}
```

### 8.3 Alerting Rules

**Critical Alerts** (PagerDuty/Email):
- Redis connection errors > 10/minute
- Queue processing stopped > 5 minutes
- Error rate > 5%
- Command usage > 450K/month (90% of free tier)
- Cache hit rate < 50%

**Warning Alerts** (Slack/Email):
- Cache hit rate < 70%
- Queue depth > 50 jobs
- Job failure rate > 10%
- Command usage > 400K/month (80% of free tier)
- Slow cache operations (>100ms) > 10%

**Alert Configuration**:
```typescript
const alerts = {
  critical: {
    connectionErrors: { threshold: 10, window: '1m' },
    queueStopped: { threshold: 5, window: '5m' },
    errorRate: { threshold: 0.05, window: '5m' },
    commandUsage: { threshold: 450000, window: '1month' }
  },
  warning: {
    cacheHitRate: { threshold: 0.70, window: '1h' },
    queueDepth: { threshold: 50, window: '5m' },
    jobFailureRate: { threshold: 0.10, window: '1h' },
    commandUsage: { threshold: 400000, window: '1month' }
  }
};
```

### 8.4 Dashboards

**Upstash Dashboard** (built-in):
- Command usage (daily/monthly)
- Connection count
- Error rates
- Latency metrics
- Storage usage

**Application Dashboard** (Grafana/Cloud Monitoring):

**Panel 1: Redis Connections**
- Active TCP connections (line chart)
- HTTP requests per minute (line chart)
- Connection errors (counter)

**Panel 2: Command Usage**
- Total commands per day (bar chart)
- Commands by type (pie chart)
- Free tier usage percentage (gauge)
- Projected monthly usage (line chart)

**Panel 3: Performance**
- Cache operation latency (histogram)
- Rate limit check latency (histogram)
- Queue operation latency (histogram)
- API response time (line chart)

**Panel 4: Queue Health**
- Jobs processed per hour (line chart)
- Job success rate (gauge)
- Queue depth by queue (bar chart)
- Failed jobs (counter)

**Panel 5: Application Metrics**
- Cache hit/miss ratio (pie chart)
- Rate limit rejections (counter)
- API error rate (line chart)
- Feature availability (status indicators)


## 9. Error Handling and Recovery

### 9.1 HTTP Redis Error Handling

**Connection Errors**:
```typescript
try {
  const value = await httpRedis.get(key);
  return value;
} catch (error) {
  if (error.message.includes('ECONNREFUSED')) {
    logger.error('redis_connection_refused', { key, error });
    // Fall back to in-memory cache or skip cache
    return null;
  } else if (error.message.includes('ETIMEDOUT')) {
    logger.error('redis_timeout', { key, error });
    // Retry with exponential backoff (handled by client)
    throw error;
  } else {
    logger.error('redis_unknown_error', { key, error });
    throw error;
  }
}
```

**Automatic Retry**:
- Built into @upstash/redis client
- 3 retry attempts
- Exponential backoff: 1s, 2s, 4s
- Max delay: 10 seconds

**Graceful Degradation**:
```typescript
async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  try {
    // Try cache first
    const cached = await cache.get<T>(key);
    if (cached) return cached;
  } catch (error) {
    logger.warn('cache_unavailable', { key, error });
    // Continue without cache
  }
  
  // Fetch fresh data
  const data = await fetchFn();
  
  try {
    // Try to cache for next time
    await cache.set(key, data, 3600);
  } catch (error) {
    logger.warn('cache_write_failed', { key, error });
    // Continue without caching
  }
  
  return data;
}
```

### 9.2 BullMQ Error Handling

**Job Failure Handling**:
```typescript
const worker = createWorker('sync-queue', async (job) => {
  try {
    await processSync(job.data);
  } catch (error) {
    logger.error('job_processing_failed', {
      queue: 'sync-queue',
      jobId: job.id,
      attempt: job.attemptsMade,
      error: error.message
    });
    throw error; // Will trigger retry
  }
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000
  }
});

worker.on('failed', (job, error) => {
  logger.error('job_failed_permanently', {
    queue: 'sync-queue',
    jobId: job?.id,
    attempts: job?.attemptsMade,
    error: error.message
  });
  
  // Notify user or admin
  notifyJobFailure(job, error);
});
```

**Connection Recovery**:
```typescript
// BullMQ handles reconnection automatically
// Monitor connection events
worker.on('error', (error) => {
  logger.error('worker_error', { error: error.message });
});

worker.on('ioredis:close', () => {
  logger.warn('worker_connection_closed');
});

worker.on('ioredis:reconnecting', () => {
  logger.info('worker_reconnecting');
});
```

### 9.3 Rate Limiting Error Handling

**Rate Limit Check Failure**:
```typescript
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await checkRateLimit(req.userId, RateLimits.API_PER_USER);
    
    if (!result.allowed) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: result.resetAt
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error('rate_limit_check_failed', {
      userId: req.userId,
      error: error.message
    });
    
    // Fail open: Allow request if rate limiter is down
    logger.warn('rate_limit_bypassed', { userId: req.userId });
    next();
  }
}
```

### 9.4 Recovery Procedures

**Redis Connection Issues**:
1. Check Upstash dashboard for service status
2. Verify environment variables are correct
3. Test connection with redis-cli or HTTP request
4. Check network connectivity
5. Review application logs for error patterns
6. Restart application if needed

**High Command Usage**:
1. Check Upstash dashboard for usage breakdown
2. Identify high-frequency operations
3. Increase cache TTL to reduce reads
4. Batch operations where possible
5. Consider upgrading to paid tier if needed

**Queue Processing Stopped**:
1. Check worker logs for errors
2. Verify Redis connection is healthy
3. Check queue depth (may be backed up)
4. Restart workers if needed
5. Clear stuck jobs if necessary

**Performance Degradation**:
1. Check cache hit rate (should be >80%)
2. Monitor Redis latency metrics
3. Check for slow database queries
4. Review application logs for errors
5. Scale up resources if needed


## 10. Security Considerations

### 10.1 Credential Management

**Environment Variables**:
- Store Redis credentials in environment variables only
- Never commit credentials to version control
- Use different credentials for dev/staging/production
- Rotate credentials periodically

**Access Control**:
```typescript
// Validate environment variables on startup
function validateRedisConfig(): void {
  const required = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'REDIS_HOST',
    'REDIS_PASSWORD'
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

### 10.2 Data Security

**Sensitive Data Handling**:
- Never cache sensitive data (passwords, tokens)
- Use short TTLs for user data
- Clear cache on user logout
- Encrypt sensitive data before caching

**Cache Key Namespacing**:
```typescript
// Prevent key collisions and unauthorized access
function getCacheKey(userId: string, resource: string): string {
  return `cache:${userId}:${resource}`;
}

function getRateLimitKey(userId: string, type: string): string {
  return `rate_limit:${userId}:${type}`;
}
```

### 10.3 Rate Limiting Security

**Prevent Abuse**:
- Implement per-user rate limits
- Implement per-IP rate limits
- Use sliding window algorithm
- Log rate limit violations

**Rate Limit Bypass Prevention**:
```typescript
// Don't allow rate limit bypass on error
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await checkRateLimit(req.userId, RateLimits.API_PER_USER);
    
    if (!result.allowed) {
      // Log potential abuse
      logger.warn('rate_limit_exceeded', {
        userId: req.userId,
        ip: req.ip,
        endpoint: req.path
      });
      
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: result.resetAt
      });
      return;
    }
    
    next();
  } catch (error) {
    // In production, fail closed (reject request)
    if (process.env.NODE_ENV === 'production') {
      logger.error('rate_limit_error_fail_closed', {
        userId: req.userId,
        error: error.message
      });
      res.status(503).json({ error: 'Service temporarily unavailable' });
      return;
    }
    
    // In development, fail open (allow request)
    logger.warn('rate_limit_error_fail_open', {
      userId: req.userId,
      error: error.message
    });
    next();
  }
}
```

### 10.4 Queue Security

**Job Data Validation**:
```typescript
// Validate job data before processing
const worker = createWorker('sync-queue', async (job) => {
  // Validate job data
  if (!job.data.userId || typeof job.data.userId !== 'string') {
    throw new Error('Invalid job data: missing or invalid userId');
  }
  
  // Verify user exists and has permission
  const user = await getUserById(job.data.userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Process job
  await processSync(job.data);
});
```

**Job Isolation**:
- Each job runs in isolation
- No shared state between jobs
- Timeout limits to prevent runaway jobs
- Resource limits (memory, CPU)


## 11. Performance Optimization

### 11.1 Cache Optimization

**Cache Strategy**:
```typescript
// Tiered caching with different TTLs
const CacheTTLs = {
  USER_PROFILE: 3600,        // 1 hour (changes infrequently)
  CONTACTS_LIST: 1800,       // 30 minutes (moderate changes)
  SUGGESTIONS: 300,          // 5 minutes (changes frequently)
  RATE_LIMIT: 60,            // 1 minute (sliding window)
  SESSION: 86400             // 24 hours (long-lived)
};
```

**Cache Warming**:
```typescript
// Pre-populate cache for common queries
async function warmCache(userId: string): Promise<void> {
  const promises = [
    cache.set(`user:${userId}:profile`, await getUserProfile(userId), CacheTTLs.USER_PROFILE),
    cache.set(`user:${userId}:contacts`, await getContacts(userId), CacheTTLs.CONTACTS_LIST),
    cache.set(`user:${userId}:suggestions`, await getSuggestions(userId), CacheTTLs.SUGGESTIONS)
  ];
  
  await Promise.all(promises);
}
```

**Cache Invalidation**:
```typescript
// Invalidate cache on data changes
async function updateContact(userId: string, contactId: string, data: any): Promise<void> {
  // Update database
  await db.updateContact(contactId, data);
  
  // Invalidate related caches
  await Promise.all([
    cache.delete(`user:${userId}:contacts`),
    cache.delete(`user:${userId}:suggestions`),
    cache.delete(`contact:${contactId}`)
  ]);
}
```

### 11.2 Rate Limiting Optimization

**Batch Rate Limit Checks**:
```typescript
// Check multiple rate limits in parallel
async function checkMultipleRateLimits(
  userId: string,
  types: string[]
): Promise<Map<string, RateLimitResult>> {
  const checks = types.map(type => 
    checkRateLimit(userId, { type, maxRequests: 60, windowMs: 60000 })
  );
  
  const results = await Promise.all(checks);
  
  return new Map(types.map((type, i) => [type, results[i]]));
}
```

**Optimized Sliding Window**:
```typescript
// Use Redis pipeline for atomic operations
async function checkRateLimitOptimized(
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `rate_limit:${userId}:${config.type}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Execute all operations in parallel
  const [_, count, __] = await Promise.all([
    httpRedis.zadd(key, now, `${now}-${Math.random()}`),
    httpRedis.zcard(key),
    httpRedis.zremrangebyscore(key, 0, windowStart)
  ]);
  
  // Set expiry (fire and forget)
  httpRedis.expire(key, Math.ceil(config.windowMs / 1000)).catch(err => 
    logger.warn('expire_failed', { key, error: err.message })
  );

  return {
    allowed: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    resetAt: new Date(now + config.windowMs)
  };
}
```

### 11.3 Queue Optimization

**Job Batching**:
```typescript
// Batch similar jobs together
async function batchNotifications(notifications: Notification[]): Promise<void> {
  const queue = createQueue('batch-notifications');
  
  // Group by user
  const byUser = notifications.reduce((acc, notif) => {
    if (!acc[notif.userId]) acc[notif.userId] = [];
    acc[notif.userId].push(notif);
    return acc;
  }, {} as Record<string, Notification[]>);
  
  // Add one job per user with all notifications
  const jobs = Object.entries(byUser).map(([userId, notifs]) =>
    queue.add('send-batch', { userId, notifications: notifs })
  );
  
  await Promise.all(jobs);
}
```

**Job Priority**:
```typescript
// Prioritize critical jobs
await queue.add('sync', { userId }, {
  priority: 1 // Higher priority = processed first
});

await queue.add('cleanup', { userId }, {
  priority: 10 // Lower priority = processed last
});
```

**Job Deduplication**:
```typescript
// Prevent duplicate jobs
await queue.add('sync', { userId }, {
  jobId: `sync-${userId}`, // Unique ID prevents duplicates
  removeOnComplete: true,
  removeOnFail: false
});
```

### 11.4 Connection Pool Optimization

**BullMQ Connection Settings**:
```typescript
export const bullmqConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  
  // Optimization settings
  maxRetriesPerRequest: null,      // Disable per-request retry
  enableReadyCheck: false,         // Skip ready check
  enableOfflineQueue: false,       // Disable offline queue
  connectTimeout: 10000,           // 10 second timeout
  keepAlive: 30000,                // Keep connection alive
  family: 4,                       // IPv4 only
  
  // Connection pool
  lazyConnect: false,              // Connect immediately
  autoResubscribe: true,           // Auto-resubscribe on reconnect
  autoResendUnfulfilledCommands: true
};
```


## 12. Migration Strategy

### 12.1 Phase 1: HTTP Redis Migration (Week 1)

**Day 1-2: Setup and Cache Migration**
1. Install @upstash/redis package
2. Create HttpRedisClient wrapper
3. Migrate cache.ts to use HTTP Redis
4. Write unit tests for cache operations
5. Test locally with all cache operations

**Day 3-4: Rate Limiter Migration**
1. Migrate rate-limiter.ts to use HTTP Redis
2. Migrate sms-rate-limiter.ts to use HTTP Redis
3. Write unit tests for rate limiting
4. Test locally with rate limit scenarios
5. Load test rate limiting

**Day 5: Deployment and Monitoring**
1. Update environment variables in production
2. Deploy to production
3. Monitor for 24 hours:
   - Connection count (should drop to 33-36)
   - Command usage (should drop by 30-40%)
   - Error rates (should be 0)
   - API response times (should not increase)
4. Rollback if issues detected

**Success Criteria**:
- ✅ All cache operations functional
- ✅ All rate limiting functional
- ✅ Zero connection errors
- ✅ Command usage reduced by 30-40%
- ✅ No performance degradation

### 12.2 Phase 2: Queue Optimization (Week 2)

**Day 1: Analysis and Planning**
1. Review queue usage patterns
2. Identify critical vs non-critical queues
3. Document dependencies
4. Create rollback plan

**Day 2: Implementation**
1. Comment out non-critical queue initialization
2. Update queue processors to handle missing queues
3. Test locally with critical queues only
4. Verify no impact on user-facing features

**Day 3-7: Deployment and Monitoring**
1. Deploy to production
2. Monitor for 48 hours:
   - Connection count (should drop to 9-12)
   - Command usage (should drop by additional 20-30%)
   - Critical features working (contacts sync, calendar sync)
   - No user complaints
3. Document any issues
4. Rollback if critical features affected

**Success Criteria**:
- ✅ Connections reduced to 9-12
- ✅ Command usage reduced by additional 20-30%
- ✅ Critical features operational
- ✅ No user impact

### 12.3 Phase 3: BullMQ Migration (Week 3-4)

**Week 3: Development and Testing**

**Day 1-2: Setup**
1. Install bullmq package
2. Create bullmq-connection.ts
3. Create queue-factory.ts
4. Write unit tests for factory

**Day 3-5: Queue Migration**
1. Migrate queues one at a time (lowest risk first)
2. Test each queue thoroughly
3. Verify job processing
4. Check event handlers

**Migration Order**:
1. webhook-health-check (Day 3)
2. notification-reminder (Day 3)
3. token-health-reminder (Day 4)
4. adaptive-sync (Day 4)
5. webhook-renewal (Day 5)
6. suggestion-regeneration (Day 5)

**Week 4: Critical Queues and Deployment**

**Day 1-2: Critical Queue Migration**
1. batch-notifications
2. suggestion-generation
3. token-refresh
4. calendar-sync
5. google-contacts-sync

**Day 3: Integration Testing**
1. Test all queues together
2. Load test queue system
3. Verify connection count (should be 1-3)
4. Test job retry and failure handling

**Day 4: Deployment**
1. Deploy to production
2. Re-enable all queues
3. Monitor closely for 24 hours

**Day 5-7: Monitoring and Stabilization**
1. Monitor all metrics
2. Fix any issues
3. Optimize performance
4. Document lessons learned

**Success Criteria**:
- ✅ All 11 queues operational
- ✅ Connections reduced to 1-3
- ✅ All job processing functional
- ✅ Zero connection errors
- ✅ Command usage within free tier

### 12.4 Phase 4: Cleanup (Week 5)

**Day 1-2: Code Cleanup**
1. Remove Bull package
2. Remove old ioredis code from cache/rate-limiting
3. Evaluate Connection Pool Manager
4. Remove unused dependencies

**Day 3: Optimization**
1. Optimize Redis command usage
2. Implement batch operations
3. Tune cache TTLs
4. Optimize queue settings

**Day 4-5: Documentation and Monitoring**
1. Update all documentation
2. Create troubleshooting runbook
3. Set up comprehensive monitoring
4. Configure alerts
5. Train team on new system

**Success Criteria**:
- ✅ Clean codebase
- ✅ Comprehensive monitoring
- ✅ Documentation complete
- ✅ Team trained

### 12.5 Rollback Procedures

**Phase 1 Rollback** (HTTP Redis):
1. Revert to previous git commit
2. Redeploy application
3. Verify old code is running
4. Monitor for stability
5. Investigate issues

**Phase 2 Rollback** (Queue Optimization):
1. Uncomment disabled queues
2. Redeploy application
3. Verify all queues running
4. Monitor connection count
5. May need to upgrade Upstash tier

**Phase 3 Rollback** (BullMQ):
1. Checkout Bull branch
2. Redeploy application
3. Verify Bull queues running
4. May need to clear BullMQ data
5. Monitor for stability

**Emergency Rollback**:
1. Keep previous version deployed in staging
2. Can switch traffic to staging if needed
3. Database is compatible with both versions
4. No data migration required


## 13. Risk Assessment and Mitigation

### 13.1 High Risk Items

#### Risk 1: HTTP Redis Latency Impact

**Description**: HTTP Redis has 10-50ms latency vs 1-5ms for TCP, potentially impacting user experience

**Probability**: Medium  
**Impact**: Medium  
**Risk Level**: HIGH

**Mitigation Strategies**:
1. Only use HTTP Redis for non-critical paths (cache, rate limiting)
2. Implement aggressive caching at application level
3. Use cache-aside pattern with fallback to database
4. Monitor p95/p99 latency and alert on degradation
5. Set performance budgets (cache: <100ms, rate limit: <50ms)

**Contingency Plan**:
- Can revert specific operations to ioredis if needed
- Keep old code in git history for quick rollback
- Implement feature flags for gradual rollout
- Have staging environment for testing

**Monitoring**:
- Track cache operation latency (p50, p95, p99)
- Track rate limit check latency
- Alert if p95 > 100ms for cache or p95 > 50ms for rate limiting
- Monitor API response time impact

#### Risk 2: BullMQ Migration Bugs

**Description**: API differences between Bull and BullMQ may cause job processing failures

**Probability**: Medium  
**Impact**: High  
**Risk Level**: HIGH

**Mitigation Strategies**:
1. Comprehensive testing before migration
2. Migrate one queue at a time (lowest risk first)
3. Keep Bull code in separate git branch
4. Monitor job success rates closely
5. Implement detailed logging for debugging
6. Test all job types and edge cases

**Contingency Plan**:
- Rollback to Bull if critical jobs fail
- Fix issues in development before re-deploying
- Can run Bull and BullMQ side-by-side temporarily
- Have staging environment mirroring production

**Monitoring**:
- Track job success rate per queue
- Alert if success rate < 95%
- Monitor job duration for anomalies
- Track failed job count

#### Risk 3: Connection Pool Exhaustion

**Description**: BullMQ connection pool may still hit limits under high load

**Probability**: Low  
**Impact**: High  
**Risk Level**: MEDIUM

**Mitigation Strategies**:
1. Configure connection pool size appropriately
2. Implement queue concurrency limits
3. Monitor connection count continuously
4. Load test before production deployment
5. Have auto-scaling plan ready

**Contingency Plan**:
- Upgrade to Upstash paid plan if needed ($10-20/month)
- Implement job throttling
- Reduce queue concurrency
- Scale horizontally with multiple workers

**Monitoring**:
- Track active connection count
- Alert if connections > 5
- Monitor connection errors
- Track queue depth

### 13.2 Medium Risk Items

#### Risk 4: Command Usage Exceeds Free Tier

**Description**: Even with optimizations, usage may exceed 500K commands/month

**Probability**: Low  
**Impact**: Medium  
**Risk Level**: MEDIUM

**Mitigation Strategies**:
1. Monitor usage daily
2. Implement command usage alerts at 80% and 90%
3. Optimize high-frequency operations
4. Increase cache TTLs where appropriate
5. Batch operations where possible

**Contingency Plan**:
- Upgrade to paid plan (~$10-20/month)
- Implement more aggressive caching
- Reduce queue polling frequency
- Optimize rate limiting algorithm

**Monitoring**:
- Track daily command usage
- Project monthly usage
- Alert at 400K (80%) and 450K (90%)
- Identify high-usage operations

#### Risk 5: Data Migration Issues

**Description**: Existing Redis data may not migrate cleanly

**Probability**: Very Low  
**Impact**: Low  
**Risk Level**: LOW

**Mitigation Strategies**:
1. HTTP Redis and TCP Redis use same data format
2. No data migration needed (same Upstash instance)
3. Test with production data in staging
4. Cache can be cleared without data loss
5. Application rebuilds cache automatically

**Contingency Plan**:
- Clear Redis cache if corruption occurs
- Application will rebuild cache from database
- No permanent data loss (cache is ephemeral)
- Queue jobs can be re-added if needed

**Monitoring**:
- Monitor cache hit rate
- Track data serialization errors
- Alert on unexpected cache misses

### 13.3 Low Risk Items

#### Risk 6: Performance Degradation

**Description**: Application performance may degrade slightly

**Probability**: Low  
**Impact**: Low  
**Risk Level**: LOW

**Mitigation Strategies**:
1. Comprehensive performance testing
2. Monitor key metrics (response time, throughput)
3. Load testing before production deployment
4. Gradual rollout with feature flags
5. A/B testing if possible

**Contingency Plan**:
- Optimize slow operations
- Add more caching layers
- Revert specific changes if needed
- Scale up resources if needed

**Monitoring**:
- Track API response times
- Monitor cache hit rate
- Track database query times
- Alert on performance degradation

### 13.4 Risk Matrix

| Risk | Probability | Impact | Level | Mitigation Priority |
|------|------------|--------|-------|-------------------|
| HTTP Redis Latency | Medium | Medium | HIGH | 1 |
| BullMQ Migration Bugs | Medium | High | HIGH | 1 |
| Connection Pool Exhaustion | Low | High | MEDIUM | 2 |
| Command Usage Exceeds Tier | Low | Medium | MEDIUM | 2 |
| Data Migration Issues | Very Low | Low | LOW | 3 |
| Performance Degradation | Low | Low | LOW | 3 |


## 14. Success Metrics and KPIs

### 14.1 Phase 1 Success Metrics

**Connection Reduction**:
- Target: 38-46 → 33-36 connections
- Measurement: Upstash dashboard connection count
- Success: Sustained reduction for 24 hours

**Command Usage Reduction**:
- Target: 30-40% reduction
- Measurement: Upstash dashboard command count
- Success: Daily usage < 70K commands (vs 105K baseline)

**Error Rate**:
- Target: 0 connection errors
- Measurement: Application logs + Upstash dashboard
- Success: Zero ECONNRESET or ETIMEDOUT errors

**Performance**:
- Target: No increase in API response times
- Measurement: Application monitoring (p95 latency)
- Success: p95 latency within 10% of baseline

### 14.2 Phase 2 Success Metrics

**Connection Reduction**:
- Target: 33-36 → 9-12 connections
- Measurement: Upstash dashboard connection count
- Success: Sustained reduction for 48 hours

**Command Usage Reduction**:
- Target: Additional 20-30% reduction
- Measurement: Upstash dashboard command count
- Success: Daily usage < 50K commands

**Feature Availability**:
- Target: 100% uptime for critical features
- Measurement: Feature monitoring + user reports
- Success: No user complaints about sync issues

### 14.3 Phase 3 Success Metrics

**Connection Reduction**:
- Target: 9-12 → 1-3 connections (93-97% total reduction)
- Measurement: Upstash dashboard connection count
- Success: Sustained reduction for 7 days

**Command Usage**:
- Target: < 500K commands/month (within free tier)
- Measurement: Upstash dashboard monthly usage
- Success: Projected monthly usage < 450K

**Queue Health**:
- Target: >95% job success rate
- Measurement: Queue monitoring dashboard
- Success: All queues processing jobs successfully

**Error Rate**:
- Target: 0 connection errors
- Measurement: Application logs + Upstash dashboard
- Success: Zero errors for 7 consecutive days

### 14.4 Overall Success Criteria

**Primary Metrics**:
- ✅ Redis connections: 1-3 (93-97% reduction from 38-46)
- ✅ Command usage: < 500K/month (within free tier)
- ✅ Connection errors: 0 for 7 consecutive days
- ✅ All functionality maintained
- ✅ No user-facing issues

**Secondary Metrics**:
- ✅ Cache hit rate: >80%
- ✅ API response time: Within 10% of baseline
- ✅ Queue job success rate: >95%
- ✅ Rate limiting functional: 100% uptime
- ✅ Zero data loss

**Business Metrics**:
- ✅ Cost: $0/month (stay on free tier)
- ✅ Reliability: 99.9% uptime
- ✅ User satisfaction: No complaints
- ✅ Team confidence: Comfortable with new system

### 14.5 Monitoring Dashboard

**Key Metrics to Display**:

**Connection Health**:
- Current connection count (gauge)
- Connection count over time (line chart)
- Connection errors (counter)
- Target: 1-3 connections, 0 errors

**Command Usage**:
- Daily command count (bar chart)
- Monthly projection (gauge with free tier limit)
- Commands by type (pie chart)
- Target: < 500K/month

**Performance**:
- Cache operation latency (histogram)
- Rate limit check latency (histogram)
- API response time (line chart)
- Target: p95 < 100ms for cache, < 50ms for rate limit

**Queue Health**:
- Jobs processed per hour (line chart)
- Job success rate (gauge)
- Queue depth (bar chart per queue)
- Failed jobs (counter)
- Target: >95% success rate, queue depth < 100

**Application Health**:
- Cache hit rate (gauge)
- Rate limit rejections (counter)
- API error rate (line chart)
- Feature availability (status indicators)
- Target: >80% cache hit rate, <5% error rate


## 15. Documentation and Knowledge Transfer

### 15.1 Documentation Updates Required

**Architecture Documentation**:
- Update system architecture diagrams
- Document hybrid Redis approach
- Explain HTTP vs TCP Redis usage
- Document connection pooling strategy

**API Documentation**:
- Update cache API documentation
- Update rate limiting documentation
- Document queue API changes
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

### 15.2 Training Materials

**Team Training Topics**:
1. HTTP Redis vs TCP Redis differences
2. BullMQ API and patterns
3. Monitoring and alerting
4. Troubleshooting procedures
5. Performance optimization techniques

**Training Format**:
- Technical presentation (1 hour)
- Hands-on workshop (2 hours)
- Q&A session (30 minutes)
- Written documentation for reference

### 15.3 Runbook

**Common Issues and Solutions**:

**Issue: High Redis Connection Count**
```
Symptoms: Connection count > 5
Diagnosis: Check which services are creating connections
Solution: 
  1. Review application logs for connection creation
  2. Check if old ioredis clients are still active
  3. Restart application to reset connections
  4. Verify BullMQ is using shared connection
```

**Issue: High Command Usage**
```
Symptoms: Command usage approaching free tier limit
Diagnosis: Check Upstash dashboard for command breakdown
Solution:
  1. Identify high-frequency operations
  2. Increase cache TTLs
  3. Batch operations where possible
  4. Consider upgrading to paid tier
```

**Issue: Cache Miss Rate High**
```
Symptoms: Cache hit rate < 70%
Diagnosis: Check cache TTLs and invalidation patterns
Solution:
  1. Review cache TTL configuration
  2. Check for excessive cache invalidation
  3. Implement cache warming for common queries
  4. Monitor cache key patterns
```

**Issue: Queue Processing Stopped**
```
Symptoms: Jobs not being processed
Diagnosis: Check worker logs and Redis connection
Solution:
  1. Verify Redis connection is healthy
  2. Check worker process is running
  3. Review worker logs for errors
  4. Restart workers if needed
  5. Check queue depth for backlog
```

**Issue: Rate Limiting Not Working**
```
Symptoms: Users not being rate limited
Diagnosis: Check rate limiter logs and Redis connection
Solution:
  1. Verify Redis connection is healthy
  2. Check rate limit configuration
  3. Review rate limiter logs for errors
  4. Test rate limiting manually
  5. Verify middleware is applied to routes
```

### 15.4 Knowledge Base Articles

**Article 1: Understanding the Hybrid Redis Architecture**
- Why we use HTTP Redis for cache/rate-limiting
- Why we use TCP Redis for queues
- Trade-offs and benefits
- Performance characteristics

**Article 2: Working with BullMQ**
- Creating queues and workers
- Adding jobs with options
- Handling job failures
- Monitoring queue health

**Article 3: Cache Best Practices**
- Choosing appropriate TTLs
- Cache invalidation strategies
- Cache warming techniques
- Monitoring cache performance

**Article 4: Rate Limiting Strategies**
- Sliding window algorithm
- Per-user vs per-IP rate limiting
- Handling rate limit errors
- Monitoring rate limit usage

**Article 5: Troubleshooting Redis Issues**
- Common error messages
- Diagnostic procedures
- Resolution steps
- When to escalate


## 16. Future Enhancements

### 16.1 Short-term Improvements (1-3 months)

**Enhanced Monitoring**:
- Real-time dashboard with auto-refresh
- Predictive alerts based on usage trends
- Anomaly detection for unusual patterns
- Integration with PagerDuty/Slack

**Performance Optimization**:
- Implement Redis pipelining for batch operations
- Add read-through cache pattern
- Optimize cache key structure
- Implement cache compression for large values

**Queue Improvements**:
- Add job priority queues
- Implement job scheduling (cron-like)
- Add job progress tracking
- Implement job result storage

### 16.2 Medium-term Improvements (3-6 months)

**Advanced Caching**:
- Multi-tier caching (memory + Redis)
- Cache warming on application startup
- Intelligent cache prefetching
- Cache analytics and optimization

**Rate Limiting Enhancements**:
- Token bucket algorithm option
- Dynamic rate limits based on user tier
- Rate limit quotas per feature
- Rate limit analytics dashboard

**Queue Scaling**:
- Horizontal scaling with multiple workers
- Auto-scaling based on queue depth
- Queue priority management
- Dead letter queue for failed jobs

### 16.3 Long-term Improvements (6-12 months)

**Redis Cluster**:
- Evaluate Redis cluster for high availability
- Implement sharding for large datasets
- Add read replicas for scaling reads
- Implement failover automation

**Advanced Analytics**:
- Machine learning for cache optimization
- Predictive scaling for queues
- Usage pattern analysis
- Cost optimization recommendations

**Multi-Region Support**:
- Geo-distributed Redis instances
- Regional cache invalidation
- Cross-region queue replication
- Latency optimization

### 16.4 Potential Upgrades

**Upstash Paid Tier Benefits**:
- Higher connection limits (1000+)
- Higher command limits (10M+/month)
- Better performance (lower latency)
- Priority support
- Cost: ~$10-20/month

**When to Upgrade**:
- Command usage consistently > 450K/month
- Need more than 3 concurrent connections
- Require lower latency (<10ms)
- Need priority support

**Alternative Solutions**:
- Self-hosted Redis (if cost-effective at scale)
- Redis Enterprise (for enterprise features)
- AWS ElastiCache (if already on AWS)
- Google Cloud Memorystore (if already on GCP)

## 17. Conclusion

### 17.1 Summary

This design document outlines a comprehensive approach to optimizing Redis usage in the CatchUp application through a hybrid architecture:

1. **HTTP Redis** (@upstash/redis) for cache and rate limiting - eliminates persistent connections
2. **BullMQ** with shared connection pool for background jobs - reduces connections from 33 to 1-3

The solution addresses the current issues of connection exhaustion and high command usage while maintaining all existing functionality.

### 17.2 Expected Benefits

**Technical Benefits**:
- 93-97% reduction in Redis connections (38-46 → 1-3)
- 60-80% reduction in command usage
- Zero connection errors
- Improved reliability and stability
- Better scalability for future growth

**Business Benefits**:
- Stay within Upstash free tier ($0/month)
- Improved user experience (no sync failures)
- Reduced operational overhead
- Foundation for future scaling
- Increased system reliability

### 17.3 Next Steps

1. **Review and Approval**: Get stakeholder approval for design
2. **Phase 1 Implementation**: Begin HTTP Redis migration
3. **Monitoring Setup**: Implement comprehensive monitoring
4. **Team Training**: Train team on new architecture
5. **Phased Rollout**: Execute migration phases carefully
6. **Documentation**: Keep documentation updated throughout

### 17.4 Success Criteria Recap

The migration will be considered successful when:
- ✅ Redis connections reduced to 1-3 (93-97% reduction)
- ✅ Command usage < 500K/month (within free tier)
- ✅ Zero connection errors for 7 consecutive days
- ✅ All functionality maintained
- ✅ No user-facing issues
- ✅ Team comfortable with new system

## 18. Appendix

### 18.1 Reference Links

**Documentation**:
- Upstash Redis: https://upstash.com/docs/redis
- @upstash/redis SDK: https://github.com/upstash/upstash-redis
- BullMQ: https://docs.bullmq.io/
- Bull to BullMQ Migration: https://docs.bullmq.io/bull/migration

**Related Specs**:
- Requirements Document: `.kiro/specs/redis-optimization/requirements.md`
- Tasks Document: `.kiro/specs/redis-optimization/tasks.md` (to be created)

### 18.2 Glossary

**Terms**:
- **HTTP Redis**: Stateless Redis client using REST API
- **TCP Redis**: Traditional Redis client using TCP protocol
- **BullMQ**: Modern job queue library for Node.js
- **Connection Pool**: Shared set of Redis connections
- **Rate Limiting**: Restricting request frequency per user
- **Cache Hit Rate**: Percentage of cache requests that succeed
- **Queue Depth**: Number of pending jobs in a queue
- **TTL**: Time To Live (cache expiration time)

### 18.3 Contact Information

**Technical Lead**: [Your Name]  
**DevOps Lead**: [DevOps Name]  
**Product Owner**: [Product Name]  
**Upstash Support**: support@upstash.com

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-10  
**Status**: Draft - Awaiting Review
