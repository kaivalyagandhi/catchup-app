# Redis Optimization: Hybrid HTTP + BullMQ Architecture

## Executive Summary

**Problem:** Current Bull queue implementation creates 33 Redis connections (11 queues × 3 connections each), overwhelming Upstash free tier limits and causing ECONNRESET errors.

**Solution:** Hybrid architecture using HTTP-based Redis for cache/rate-limiting and BullMQ for queues with connection pooling.

**Expected Outcomes:**
- Reduce Redis connections from 33 to 1-3 (97% reduction)
- Reduce Redis command usage by 60-80%
- Eliminate connection errors
- Maintain all existing functionality
- Stay within Upstash free tier (500K commands/month)

## Current State Analysis

### Connection Usage
```
Current Architecture (Bull + ioredis):
├── Cache (ioredis): 1 connection
├── Rate Limiter (ioredis): 1 connection  
├── SMS Rate Limiter (ioredis): 1 connection
├── Connection Pool Manager (ioredis): 2-10 connections
└── Bull Queues (11 queues × 3 connections): 33 connections
    ├── suggestion-generation: 3 connections
    ├── batch-notifications: 3 connections
    ├── calendar-sync: 3 connections
    ├── suggestion-regeneration: 3 connections
    ├── google-contacts-sync: 3 connections
    ├── token-health-reminder: 3 connections
    ├── token-refresh: 3 connections
    ├── webhook-renewal: 3 connections
    ├── notification-reminder: 3 connections
    ├── adaptive-sync: 3 connections
    └── webhook-health-check: 3 connections

Total: 38-46 concurrent connections
```

### Command Usage
```
Current Usage (from Upstash dashboard):
- Total: 105K commands (21% of free tier)
- Writes: 28,678
- Reads: 76,391
- Trend: High usage from queue health checks and connection management
```

### Issues
1. **Connection Errors:** ECONNRESET, ETIMEDOUT from too many connections
2. **High Command Usage:** Queue health checks consume significant quota
3. **Reliability:** Frequent disconnections and reconnections
4. **Scalability:** Cannot add more queues without hitting limits

## Proposed Architecture

### Target State
```
Hybrid Architecture (HTTP Redis + BullMQ):
├── Cache (@upstash/redis HTTP): 0 connections
├── Rate Limiter (@upstash/redis HTTP): 0 connections
├── SMS Rate Limiter (@upstash/redis HTTP): 0 connections
└── BullMQ Queues (shared connection pool): 1-3 connections
    └── All 11 queues share connection pool

Total: 1-3 concurrent connections (93-97% reduction)
```

### Technology Stack

**HTTP Redis Client:**
- Package: `@upstash/redis`
- Use case: Cache, rate limiting, simple key-value operations
- Connection model: Stateless HTTP requests
- Latency: ~10-50ms per operation (acceptable for cache/rate-limiting)

**BullMQ:**
- Package: `bullmq`
- Use case: Background job queues
- Connection model: Shared connection pool
- Latency: ~1-5ms per operation (critical for job processing)

## Requirements

### Functional Requirements

#### FR-1: Cache Operations
- **Current:** ioredis-based cache in `src/utils/cache.ts`
- **Target:** HTTP Redis-based cache
- **Operations:**
  - Get/Set with TTL
  - Delete single keys
  - Delete by pattern (using SCAN)
  - Exists check
  - Get-or-set pattern
- **Performance:** < 100ms per operation (acceptable for cache)
- **Compatibility:** Maintain existing API surface

#### FR-2: Rate Limiting
- **Current:** ioredis-based rate limiter in `src/utils/rate-limiter.ts`
- **Target:** HTTP Redis-based rate limiter
- **Operations:**
  - Sliding window rate limiting
  - Per-user quotas
  - Multiple rate limit types (API, voice, SMS, etc.)
- **Performance:** < 50ms per check (critical for request handling)
- **Compatibility:** Maintain existing API surface

#### FR-3: SMS Rate Limiting
- **Current:** ioredis-based SMS rate limiter in `src/sms/sms-rate-limiter.ts`
- **Target:** HTTP Redis-based rate limiter
- **Operations:**
  - 20 messages per hour per phone number
  - Sliding window tracking
  - Quota checking
- **Performance:** < 50ms per check
- **Compatibility:** Maintain existing API surface

#### FR-4: Background Job Queues
- **Current:** Bull-based queues in `src/jobs/queue.ts`
- **Target:** BullMQ-based queues with shared connection pool
- **Queues:**
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
- **Operations:**
  - Add jobs with options (delay, priority, retry)
  - Process jobs with concurrency
  - Job events (completed, failed, progress)
  - Job cleanup (remove completed/failed)
- **Performance:** < 10ms per job operation
- **Compatibility:** Maintain job processing logic

#### FR-5: Connection Pool Manager
- **Current:** Custom Redis pool in `src/sms/connection-pool-manager.ts`
- **Target:** Remove or simplify (HTTP Redis doesn't need pooling)
- **Decision:** Evaluate if still needed for other services

### Non-Functional Requirements

#### NFR-1: Performance
- Cache operations: < 100ms (90th percentile)
- Rate limit checks: < 50ms (95th percentile)
- Queue operations: < 10ms (95th percentile)
- No degradation in user-facing features

#### NFR-2: Reliability
- Zero connection errors (ECONNRESET, ETIMEDOUT)
- Automatic retry with exponential backoff
- Graceful degradation on Redis unavailability
- 99.9% uptime for critical operations

#### NFR-3: Scalability
- Support 1000+ requests/minute
- Handle 100+ concurrent users
- Process 1000+ background jobs/day
- Stay within Upstash free tier (500K commands/month)

#### NFR-4: Cost
- Stay within Upstash free tier ($0/month)
- Reduce command usage by 60-80%
- No additional infrastructure costs

#### NFR-5: Maintainability
- Clear separation of concerns (HTTP vs TCP Redis)
- Consistent error handling
- Comprehensive logging
- Easy to test and debug

## Implementation Phases

### Phase 1: HTTP Redis Migration (Priority: HIGH)
**Goal:** Reduce connection count immediately by migrating cache and rate limiting to HTTP Redis

**Estimated Effort:** 4-6 hours

**Tasks:**
1. Install `@upstash/redis` package
2. Migrate `src/utils/cache.ts` to HTTP Redis
3. Migrate `src/utils/rate-limiter.ts` to HTTP Redis
4. Migrate `src/sms/sms-rate-limiter.ts` to HTTP Redis
5. Update environment variables (add REST URL and token)
6. Test cache operations
7. Test rate limiting
8. Deploy and monitor

**Success Criteria:**
- All cache operations work correctly
- All rate limiting works correctly
- Zero connection errors from cache/rate-limiting
- Command usage reduced by 30-40%

**Rollback Plan:**
- Keep old ioredis code commented out
- Can revert by uncommenting and redeploying

### Phase 2: Queue Optimization (Priority: MEDIUM)
**Goal:** Temporarily reduce queue connections by disabling non-critical queues

**Estimated Effort:** 1-2 hours

**Tasks:**
1. Identify critical vs non-critical queues
2. Disable non-critical queues (comment out initialization)
3. Update queue processors to handle missing queues gracefully
4. Deploy and monitor

**Critical Queues (keep enabled):**
- google-contacts-sync (user-facing feature)
- calendar-sync (user-facing feature)
- token-refresh (prevents auth failures)

**Non-Critical Queues (temporarily disable):**
- suggestion-generation (can run on-demand)
- batch-notifications (can be delayed)
- suggestion-regeneration (can run on-demand)
- token-health-reminder (nice-to-have)
- webhook-renewal (has fallback)
- notification-reminder (nice-to-have)
- adaptive-sync (has fallback)
- webhook-health-check (nice-to-have)

**Success Criteria:**
- Reduce connections from 33 to 9 (3 queues × 3 connections)
- No impact on critical user-facing features
- Command usage reduced by additional 20-30%

**Rollback Plan:**
- Uncomment disabled queues and redeploy

### Phase 3: BullMQ Migration (Priority: MEDIUM)
**Goal:** Migrate from Bull to BullMQ for proper connection pooling

**Estimated Effort:** 6-8 hours

**Tasks:**
1. Install `bullmq` package
2. Create BullMQ queue factory with shared connection
3. Migrate queue definitions from Bull to BullMQ
4. Migrate job processors from Bull to BullMQ Workers
5. Update job event handlers
6. Test all queue operations
7. Test job processing
8. Deploy and monitor
9. Re-enable all queues

**Success Criteria:**
- All 11 queues operational
- Shared connection pool (1-3 connections total)
- All job processing works correctly
- Zero connection errors
- Command usage stays within free tier

**Rollback Plan:**
- Keep Bull code in separate branch
- Can revert to Bull + disabled queues if issues arise

### Phase 4: Cleanup and Optimization (Priority: LOW)
**Goal:** Remove unused code and optimize remaining Redis usage

**Estimated Effort:** 2-3 hours

**Tasks:**
1. Remove Bull package and old code
2. Remove ioredis from cache/rate-limiting
3. Evaluate Connection Pool Manager necessity
4. Optimize Redis command usage (batch operations)
5. Add monitoring and alerting
6. Update documentation

**Success Criteria:**
- Clean codebase with no unused dependencies
- Comprehensive monitoring in place
- Documentation updated
- Command usage optimized

## Technical Design

### HTTP Redis Client Configuration

```typescript
// src/utils/http-redis-client.ts
import { Redis } from '@upstash/redis';

export const httpRedis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  retry: {
    retries: 3,
    backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 10000),
  },
  automaticDeserialization: true,
});
```

### BullMQ Shared Connection

```typescript
// src/jobs/bullmq-connection.ts
import { ConnectionOptions } from 'bullmq';

export const bullmqConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// All queues share this connection
```

### Queue Factory Pattern

```typescript
// src/jobs/queue-factory.ts
import { Queue, Worker, QueueOptions } from 'bullmq';
import { bullmqConnection } from './bullmq-connection';

export function createQueue<T>(name: string, options?: QueueOptions): Queue<T> {
  return new Queue<T>(name, {
    connection: bullmqConnection,
    ...options,
  });
}

export function createWorker<T>(
  name: string,
  processor: (job: Job<T>) => Promise<void>,
  options?: WorkerOptions
): Worker<T> {
  return new Worker<T>(name, processor, {
    connection: bullmqConnection,
    ...options,
  });
}
```

### Migration Mapping

#### Cache Operations
```typescript
// BEFORE (ioredis)
await redis.set(key, value, 'EX', ttl);
await redis.get(key);
await redis.del(key);
await redis.exists(key);

// AFTER (@upstash/redis)
await httpRedis.set(key, value, { ex: ttl });
await httpRedis.get(key);
await httpRedis.del(key);
await httpRedis.exists(key);
```

#### Rate Limiting
```typescript
// BEFORE (ioredis)
await redis.zadd(key, now, `${now}-${Math.random()}`);
await redis.zcard(key);
await redis.zremrangebyscore(key, 0, windowStart);

// AFTER (@upstash/redis)
await httpRedis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
await httpRedis.zcard(key);
await httpRedis.zremrangebyscore(key, 0, windowStart);
```

#### Queue Operations
```typescript
// BEFORE (Bull)
import Bull from 'bull';
const queue = new Bull('my-queue', { redis: redisOptions });
queue.add({ data: 'value' }, { delay: 1000 });
queue.process(async (job) => { /* process */ });

// AFTER (BullMQ)
import { Queue, Worker } from 'bullmq';
const queue = new Queue('my-queue', { connection: bullmqConnection });
await queue.add('job-name', { data: 'value' }, { delay: 1000 });
const worker = new Worker('my-queue', async (job) => { /* process */ });
```

## Environment Variables

### New Variables (Phase 1)
```bash
# Upstash HTTP Redis (for cache and rate limiting)
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_rest_token_here
```

### Existing Variables (keep for BullMQ)
```bash
# Upstash TCP Redis (for BullMQ queues)
REDIS_URL=rediss://:password@your-database.upstash.io:6379
```

### Configuration Priority
1. Use `UPSTASH_REDIS_REST_URL` for cache and rate limiting (HTTP)
2. Use `REDIS_URL` for BullMQ queues (TCP)
3. Fall back to individual variables if needed

## Testing Strategy

### Unit Tests

#### Cache Tests
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
});
```

#### Rate Limiter Tests
```typescript
describe('HTTP Redis Rate Limiter', () => {
  it('should allow requests within limit', async () => {
    const result = await checkRateLimit('user-1', { maxRequests: 10, windowMs: 60000 });
    expect(result.allowed).toBe(true);
  });

  it('should block requests over limit', async () => {
    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      await checkRateLimit('user-2', { maxRequests: 10, windowMs: 60000 });
    }
    // 11th request should be blocked
    const result = await checkRateLimit('user-2', { maxRequests: 10, windowMs: 60000 });
    expect(result.allowed).toBe(false);
  });
});
```

#### Queue Tests
```typescript
describe('BullMQ Queues', () => {
  it('should add and process jobs', async () => {
    const queue = createQueue('test-queue');
    const worker = createWorker('test-queue', async (job) => {
      return { processed: true };
    });

    await queue.add('test-job', { data: 'value' });
    
    // Wait for job to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const completed = await queue.getCompleted();
    expect(completed.length).toBe(1);
  });
});
```

### Integration Tests

#### End-to-End Cache Test
```typescript
it('should cache API responses', async () => {
  // Make API request (should hit database)
  const response1 = await request(app).get('/api/contacts');
  expect(response1.status).toBe(200);
  
  // Make same request (should hit cache)
  const response2 = await request(app).get('/api/contacts');
  expect(response2.status).toBe(200);
  expect(response2.body).toEqual(response1.body);
});
```

#### End-to-End Rate Limiting Test
```typescript
it('should rate limit API requests', async () => {
  // Make 60 requests (at limit)
  for (let i = 0; i < 60; i++) {
    const response = await request(app).get('/api/test');
    expect(response.status).toBe(200);
  }
  
  // 61st request should be rate limited
  const response = await request(app).get('/api/test');
  expect(response.status).toBe(429);
});
```

#### End-to-End Queue Test
```typescript
it('should process background jobs', async () => {
  // Trigger job creation
  await request(app).post('/api/sync/google-contacts');
  
  // Wait for job to process
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Verify job completed
  const status = await request(app).get('/api/sync/status');
  expect(status.body.lastSync).toBeDefined();
});
```

### Performance Tests

#### Latency Benchmarks
```typescript
describe('Performance', () => {
  it('cache operations should complete in < 100ms', async () => {
    const start = Date.now();
    await cache.get('test-key');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('rate limit checks should complete in < 50ms', async () => {
    const start = Date.now();
    await checkRateLimit('user-1', RateLimits.API_PER_USER);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
  });
});
```

### Load Tests

#### Concurrent Request Test
```bash
# Use Apache Bench or similar
ab -n 1000 -c 10 https://catchup.club/api/contacts

# Expected results:
# - 0% error rate
# - < 200ms average response time
# - No Redis connection errors
```

## Monitoring and Observability

### Metrics to Track

#### Redis Metrics
- **Connection count:** Should be 1-3 (down from 38-46)
- **Command count:** Should be < 500K/month (free tier limit)
- **Error rate:** Should be 0%
- **Latency:** 
  - HTTP Redis: < 100ms (p95)
  - BullMQ: < 10ms (p95)

#### Queue Metrics
- **Jobs processed:** Track per queue
- **Job success rate:** Should be > 95%
- **Job duration:** Track per queue type
- **Queue depth:** Should stay < 100 jobs

#### Application Metrics
- **API response time:** Should not increase
- **Error rate:** Should not increase
- **Cache hit rate:** Should be > 80%
- **Rate limit rejections:** Track per endpoint

### Logging

#### Log Levels
```typescript
// INFO: Normal operations
console.log('[HTTP Redis] Cache hit for key:', key);
console.log('[BullMQ] Job completed:', jobId);

// WARN: Degraded performance
console.warn('[HTTP Redis] Slow response:', duration, 'ms');
console.warn('[BullMQ] Job retry attempt:', attempt);

// ERROR: Failures
console.error('[HTTP Redis] Operation failed:', error);
console.error('[BullMQ] Job failed after retries:', error);
```

#### Structured Logging
```typescript
logger.info('cache_operation', {
  operation: 'get',
  key: key,
  hit: true,
  duration: 45,
  timestamp: new Date().toISOString(),
});
```

### Alerting

#### Critical Alerts (PagerDuty/Email)
- Redis connection errors > 10/minute
- Queue processing stopped > 5 minutes
- Error rate > 5%
- Command usage > 450K/month (90% of free tier)

#### Warning Alerts (Slack/Email)
- Cache hit rate < 70%
- Queue depth > 50 jobs
- Job failure rate > 10%
- Command usage > 400K/month (80% of free tier)

### Dashboards

#### Upstash Dashboard
- Monitor command usage (daily/monthly)
- Track connection count
- View error rates
- Check latency metrics

#### Application Dashboard (Grafana/Cloud Monitoring)
- Redis operations per second
- Cache hit/miss ratio
- Queue processing rate
- Job success/failure rate
- API response times

## Risk Assessment

### High Risk Items

#### Risk 1: HTTP Redis Latency
**Description:** HTTP Redis has higher latency than TCP Redis (10-50ms vs 1-5ms)

**Mitigation:**
- Only use for cache and rate limiting (not latency-critical)
- Implement aggressive caching at application level
- Monitor p95/p99 latency and alert on degradation

**Contingency:**
- Can revert to ioredis for specific operations if needed
- Keep old code in git history for quick rollback

#### Risk 2: BullMQ Migration Bugs
**Description:** API differences between Bull and BullMQ may cause job processing issues

**Mitigation:**
- Comprehensive testing before migration
- Migrate one queue at a time
- Keep Bull code in separate branch
- Monitor job success rates closely

**Contingency:**
- Rollback to Bull if critical jobs fail
- Fix issues in development before re-deploying

#### Risk 3: Connection Pool Exhaustion
**Description:** BullMQ connection pool may still hit limits under high load

**Mitigation:**
- Configure connection pool size appropriately
- Implement queue concurrency limits
- Monitor connection count continuously

**Contingency:**
- Upgrade to Upstash paid plan if needed
- Implement job throttling

### Medium Risk Items

#### Risk 4: Command Usage Exceeds Free Tier
**Description:** Even with optimizations, usage may exceed 500K commands/month

**Mitigation:**
- Monitor usage daily
- Implement command usage alerts at 80% and 90%
- Optimize high-frequency operations

**Contingency:**
- Upgrade to paid plan (~$10-20/month)
- Implement more aggressive caching
- Reduce queue polling frequency

#### Risk 5: Data Migration Issues
**Description:** Existing Redis data may not migrate cleanly

**Mitigation:**
- HTTP Redis and TCP Redis use same data format
- No data migration needed (same Upstash instance)
- Test with production data in staging

**Contingency:**
- Clear Redis cache if corruption occurs
- Application will rebuild cache automatically

### Low Risk Items

#### Risk 6: Performance Degradation
**Description:** Application performance may degrade slightly

**Mitigation:**
- Comprehensive performance testing
- Monitor key metrics (response time, throughput)
- Load testing before production deployment

**Contingency:**
- Optimize slow operations
- Add more caching layers
- Revert specific changes if needed

## Success Metrics

### Phase 1 Success Criteria
- ✅ Redis connections reduced from 38-46 to 33-36
- ✅ Command usage reduced by 30-40%
- ✅ Zero connection errors from cache/rate-limiting
- ✅ No increase in API response times
- ✅ All cache operations functional
- ✅ All rate limiting functional

### Phase 2 Success Criteria
- ✅ Redis connections reduced from 33-36 to 9-12
- ✅ Command usage reduced by additional 20-30%
- ✅ Critical queues operational
- ✅ No impact on user-facing features

### Phase 3 Success Criteria
- ✅ Redis connections reduced to 1-3
- ✅ All 11 queues operational
- ✅ Zero connection errors
- ✅ Command usage < 500K/month
- ✅ All background jobs processing correctly

### Overall Success Criteria
- ✅ 93-97% reduction in Redis connections (38-46 → 1-3)
- ✅ 60-80% reduction in command usage
- ✅ Zero connection errors for 7 consecutive days
- ✅ All functionality maintained
- ✅ Stay within Upstash free tier
- ✅ No increase in error rates
- ✅ No degradation in user experience

## Timeline

### Week 1: Phase 1 (HTTP Redis Migration)
- **Day 1-2:** Install packages, migrate cache
- **Day 3-4:** Migrate rate limiters, test
- **Day 5:** Deploy to production, monitor

### Week 2: Phase 2 (Queue Optimization)
- **Day 1:** Identify and disable non-critical queues
- **Day 2:** Test and deploy
- **Day 3-7:** Monitor stability

### Week 3-4: Phase 3 (BullMQ Migration)
- **Week 3:** Develop and test BullMQ migration
- **Week 4:** Deploy to production, re-enable all queues

### Week 5: Phase 4 (Cleanup)
- **Day 1-3:** Remove old code, optimize
- **Day 4-5:** Documentation and monitoring

**Total Timeline:** 5 weeks (with buffer for issues)

## Dependencies

### External Dependencies
- `@upstash/redis` (HTTP Redis client)
- `bullmq` (Modern queue system)
- Upstash Redis instance (already provisioned)

### Internal Dependencies
- All services using cache must be updated
- All services using rate limiting must be updated
- All queue processors must be migrated
- Environment variables must be updated

### Team Dependencies
- Development: Implementation and testing
- DevOps: Deployment and monitoring setup
- QA: Comprehensive testing
- Product: Acceptance of temporary feature limitations (Phase 2)

## Appendix

### A. Current File Structure
```
src/
├── utils/
│   ├── cache.ts (ioredis → @upstash/redis)
│   └── rate-limiter.ts (ioredis → @upstash/redis)
├── sms/
│   ├── sms-rate-limiter.ts (ioredis → @upstash/redis)
│   └── connection-pool-manager.ts (evaluate necessity)
└── jobs/
    ├── queue.ts (Bull → BullMQ)
    └── processors/ (Bull → BullMQ Workers)
```

### B. Package Changes
```json
{
  "dependencies": {
    // Add
    "@upstash/redis": "^1.28.0",
    "bullmq": "^5.0.0",
    
    // Keep (for BullMQ)
    "ioredis": "^5.3.2",
    
    // Remove (after Phase 3)
    "bull": "^4.12.0"
  }
}
```

### C. Environment Variable Template
```bash
# .env.example

# Upstash HTTP Redis (for cache and rate limiting)
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_rest_token_here

# Upstash TCP Redis (for BullMQ queues)
REDIS_URL=rediss://:password@your-database.upstash.io:6379

# Legacy (can be removed after migration)
REDIS_HOST=your-database.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_TLS=true
```

### D. Reference Documentation
- Upstash Redis HTTP API: https://upstash.com/docs/redis/features/restapi
- @upstash/redis SDK: https://github.com/upstash/upstash-redis
- BullMQ Documentation: https://docs.bullmq.io/
- Bull to BullMQ Migration: https://docs.bullmq.io/bull/migration

### E. Contact Information
- **Technical Lead:** [Your Name]
- **DevOps Lead:** [DevOps Name]
- **Product Owner:** [Product Name]
- **Upstash Support:** support@upstash.com
