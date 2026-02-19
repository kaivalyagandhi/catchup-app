# BullMQ Serverless Connection Fix

**Date**: 2026-02-19
**Issue**: "Stream isn't writeable and enableOfflineQueue options is false"
**Root Cause**: BullMQ TCP connections incompatible with Upstash serverless recommendations

## The Problem

According to [Upstash documentation](docs/upstash-redis/connectclient.md):
> "Because upstash-redis is HTTP based, we recommend it for Serverless functions. Other TCP based clients can cause connection problems in highly concurrent use cases."

However, **BullMQ requires TCP connections** because it uses blocking commands (BLPOP/BRPOP) that aren't available via HTTP.

This creates a fundamental conflict:
- **Upstash recommendation**: Use HTTP-based `@upstash/redis` client
- **BullMQ requirement**: Use TCP-based `ioredis` client
- **Result**: Connection instability in Cloud Run serverless environment

## Current Metrics (from Upstash Dashboard)

- **Commands**: 1.8M / Unlimited
- **Bandwidth**: 219 MB / 200 GB
- **Storage**: 54 KB / 100 GB
- **Cost**: $2.53 (Budget: $20)
- **Eviction**: OFF (noeviction policy)

## Changes Made

### 1. Enable Offline Queue (Immediate Fix)
**File**: `src/jobs/bullmq-connection.ts`

Changed:
```typescript
enableOfflineQueue: false  // Fail fast
```

To:
```typescript
enableOfflineQueue: true   // Queue commands when Redis temporarily unavailable
```

**Why**: Allows workers to queue commands during connection re-establishment after eviction policy change.

### 2. Optimize Connection Settings
Added serverless-specific settings:
```typescript
lazyConnect: false,         // Connect immediately to detect issues early
maxRetriesPerRequest: null, // Required for BullMQ blocking commands
```

## Why This Happens in Serverless

### Cloud Run Characteristics
1. **Auto-scaling**: Creates multiple container instances
2. **Cold starts**: Containers start/stop frequently
3. **Connection pooling**: Each instance creates its own connections
4. **No persistent state**: Connections don't persist between requests

### BullMQ Connection Pattern
- Each worker needs a persistent TCP connection
- 11 workers × 1-3 connections each = 11-33 connections
- Connections must stay open for blocking commands
- Connection failures cause "Stream isn't writeable" errors

### Eviction Policy Impact
- Changing from `allkeys-lru` to `noeviction` requires reconnection
- During reconnection, existing connections become invalid
- Without `enableOfflineQueue`, commands fail immediately
- With `enableOfflineQueue`, commands are queued until reconnection

## Alternative Solutions Considered

### Option A: Switch to HTTP-based Queue (Not Viable)
- Upstash recommends HTTP for serverless
- But no HTTP-based queue library supports blocking commands
- Would require complete rewrite of job system

### Option B: Use Google Cloud Tasks (Future Consideration)
- Native GCP serverless queue service
- No Redis connection needed
- But requires significant refactoring
- Cost: $0.40 per million operations

### Option C: Increase Connection Limits (Not Needed)
- Upstash free tier: Unlimited connections
- Current usage: 1-3 connections (down from 33-36)
- Not a connection limit issue

### Option D: Use Upstash QStash (Future Consideration)
- Upstash's HTTP-based queue service
- Designed for serverless
- But requires migration from BullMQ
- Cost: $1 per 100k requests

## Current Solution: Hybrid Approach

We're using a **hybrid approach** that balances both requirements:

1. **BullMQ with TCP** (for job queues)
   - Uses `ioredis` with shared connection pool
   - `enableOfflineQueue: true` for resilience
   - Optimized retry strategy
   - 11 workers sharing 1-3 connections

2. **HTTP Redis** (for cache/rate-limiting)
   - Uses `@upstash/redis` HTTP client
   - Zero persistent connections
   - Perfect for serverless
   - Used in `src/utils/http-redis-client.ts`

## Expected Results After Fix

### Before
- ❌ All 11 workers failing with "Stream isn't writeable"
- ❌ Background jobs not processing
- ❌ Continuous error logs
- ❌ Connection instability

### After
- ✅ Workers queue commands during reconnection
- ✅ Background jobs process successfully
- ✅ Graceful handling of connection issues
- ✅ Stable operation in Cloud Run

## Monitoring

### Check Worker Status
```bash
gcloud run services logs read catchup \
  --region=us-central1 \
  --limit=100 \
  --project=catchup-479221 | \
  grep -E "Worker.*started|Worker.*error"
```

### Check Connection Count (Upstash Dashboard)
- Should remain at 1-3 connections
- Should not spike to 33-36 connections

### Check Command Usage (Upstash Dashboard)
- Monitor daily command usage
- Should stay within free tier limits

### Check Error Rate
```bash
gcloud run services logs read catchup \
  --region=us-central1 \
  --limit=200 \
  --project=catchup-479221 | \
  grep "Stream isn't writeable" | wc -l
```

Should return 0 after deployment.

## Deployment Steps

1. **Commit changes**:
   ```bash
   git add src/jobs/bullmq-connection.ts BULLMQ_SERVERLESS_FIX.md
   git commit -m "fix: enable BullMQ offline queue for serverless resilience"
   ```

2. **Tag and push**:
   ```bash
   git tag -f prod
   git push origin main --tags --force
   ```

3. **Wait for deployment** (~5 minutes)

4. **Verify workers are running**:
   ```bash
   gcloud run services logs read catchup \
     --region=us-central1 \
     --limit=50 \
     --project=catchup-479221 | \
     grep -i "worker"
   ```

## Long-term Recommendations

### 1. Monitor Command Usage
- Current: 1.8M commands (high for free tier)
- Set up alerts if approaching limits
- Consider upgrading if usage grows

### 2. Consider QStash Migration
If BullMQ continues to have issues:
- Migrate to Upstash QStash (HTTP-based queue)
- Better suited for serverless
- No TCP connection issues
- Cost: ~$1 per 100k requests

### 3. Optimize Job Frequency
- Review job schedules in `src/jobs/`
- Reduce frequency where possible
- Batch operations to reduce command count

### 4. Connection Pool Monitoring
- Add metrics for connection count
- Alert on connection spikes
- Track connection errors

## Related Documentation

- **Upstash Docs**: `docs/upstash-redis/`
- **BullMQ Connection**: `src/jobs/bullmq-connection.ts`
- **HTTP Redis Client**: `src/utils/http-redis-client.ts`
- **Phase 2 Guide**: `PHASE_2_BULLMQ_MIGRATION_GUIDE.md`
- **Deployment Status**: `DEPLOYMENT_VERIFICATION_RESULTS.md`

## References

- [Upstash Redis for Serverless](https://upstash.com/blog/serverless-database-connections)
- [BullMQ Connections Guide](https://docs.bullmq.io/guide/connections)
- [Google Cloud Run Best Practices](https://cloud.google.com/run/docs/tips/general)
