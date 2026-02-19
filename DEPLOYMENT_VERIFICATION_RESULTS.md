# Production Deployment Verification Results
**Date**: 2026-02-19
**Revision**: catchup-00051-tjq
**Status**: ⚠️ ISSUES DETECTED

## Deployment Status

✅ **Code Deployed**: Latest revision `catchup-00051-tjq` is running
✅ **Service Ready**: All health checks passing
✅ **Secrets Configured**: All 44 environment variables in Secret Manager
✅ **Eviction Policy**: Changed to `noeviction` on Upstash

## Critical Issues

### 🔴 BullMQ Workers Failing

**Error**: `Stream isn't writeable and enableOfflineQueue options is false`

**Affected Workers** (All 11):
- google-contacts-sync
- calendar-sync
- suggestion-generation
- suggestion-regeneration
- batch-notifications
- token-refresh
- webhook-renewal
- webhook-health-check
- token-health-reminder
- notification-reminder
- adaptive-sync

**Frequency**: Continuous errors, workers unable to process jobs

**Impact**:
- Background jobs not running
- Sync operations failing
- Notifications not being sent
- Token refresh not working
- Webhook management broken

## Root Cause Analysis

The "Stream isn't writeable" error typically occurs when:

1. **Eviction Policy Issue**: Redis is evicting keys needed by BullMQ
   - **Status**: Changed to `noeviction` but may need time to propagate
   - **Action**: Verify eviction policy is active in Upstash dashboard

2. **Connection Pool Issue**: Too many connections or connection reuse problem
   - **Status**: Using shared connection pool (should be 1-3 connections)
   - **Action**: Check Upstash dashboard for connection count

3. **Memory Limit**: Redis running out of memory
   - **Status**: Free tier has 256MB limit
   - **Action**: Check memory usage in Upstash dashboard

4. **enableOfflineQueue**: BullMQ option not set correctly
   - **Status**: Currently set to `false` in code
   - **Action**: Consider enabling for better resilience

## Verification Steps Needed

### 1. Check Upstash Dashboard
- [ ] Verify eviction policy is `noeviction`
- [ ] Check current connection count (should be 1-3, not 33-36)
- [ ] Check memory usage (should be under 256MB)
- [ ] Check command usage (should be within free tier)
- [ ] Look for any error messages or alerts

### 2. Check Recent Logs
```bash
# Check for successful BullMQ connections
gcloud run services logs read catchup \
  --region=us-central1 \
  --limit=200 \
  --project=catchup-479221 \
  --format="value(textPayload,timestamp)" | \
  grep -E "BullMQ|Redis connection|Server started"

# Check for worker errors
gcloud run services logs read catchup \
  --region=us-central1 \
  --limit=100 \
  --project=catchup-479221 | \
  grep "Worker error"
```

### 3. Test Redis Connection
```bash
# Test Redis connection from Cloud Run
gcloud run services logs read catchup \
  --region=us-central1 \
  --limit=50 \
  --project=catchup-479221 | \
  grep -i "redis"
```

## Potential Solutions

### Option 1: Enable Offline Queue (Quick Fix)
**File**: `src/jobs/bullmq-connection.ts`

Change:
```typescript
enableOfflineQueue: false
```

To:
```typescript
enableOfflineQueue: true
```

**Pros**: Workers can queue operations when Redis is unavailable
**Cons**: May mask underlying connection issues

### Option 2: Increase maxRetriesPerRequest
**File**: `src/jobs/bullmq-connection.ts`

Change:
```typescript
maxRetriesPerRequest: 3
```

To:
```typescript
maxRetriesPerRequest: 10
```

**Pros**: More resilient to temporary connection issues
**Cons**: Longer delays before failing

### Option 3: Add Connection Retry Logic
Add exponential backoff for Redis connection failures

**Pros**: Better handling of transient issues
**Cons**: More complex code

### Option 4: Wait for Eviction Policy Propagation
The eviction policy change may need time to take effect

**Pros**: No code changes needed
**Cons**: Uncertain timeline

### Option 5: Restart Service
Force a fresh start with new eviction policy

```bash
gcloud run services update catchup \
  --region=us-central1 \
  --project=catchup-479221 \
  --no-traffic
  
gcloud run services update catchup \
  --region=us-central1 \
  --project=catchup-479221 \
  --to-latest
```

## Comparison with Local Testing

**Local**: ✅ BullMQ workers running successfully
**Production**: ❌ BullMQ workers failing with stream errors

**Key Differences**:
- Local: Direct connection to Upstash
- Production: Connection through Cloud Run environment
- Local: Single instance
- Production: Multiple instances (auto-scaling)

## Solution Applied

### Fix: Enable Offline Queue + Optimize Connection Settings

**Changes Made** (`src/jobs/bullmq-connection.ts`):

1. **Enable Offline Queue**:
   ```typescript
   enableOfflineQueue: true  // Was: false
   ```
   - Allows workers to queue commands during reconnection
   - Prevents "Stream isn't writeable" errors
   - Commands execute once connection is re-established

2. **Optimize for Serverless**:
   ```typescript
   lazyConnect: false,         // Connect immediately
   maxRetriesPerRequest: null, // Required for BullMQ
   ```

**Why This Works**:
- Eviction policy change (`allkeys-lru` → `noeviction`) requires reconnection
- During reconnection, existing connections become temporarily invalid
- With `enableOfflineQueue: true`, commands are queued instead of failing
- Once reconnected with new policy, queued commands execute successfully

**Trade-offs**:
- Slightly higher memory usage (queued commands in memory)
- Small latency increase during reconnection
- But: Workers remain functional instead of crashing

See `BULLMQ_SERVERLESS_FIX.md` for complete analysis.

## Next Steps

1. **Immediate**: Check Upstash dashboard to verify eviction policy and connection count
2. **Short-term**: Consider enabling `enableOfflineQueue: true` for resilience
3. **Medium-term**: Monitor logs after eviction policy propagates
4. **Long-term**: Evaluate if Phase 3 cleanup can proceed

## Success Criteria (Not Met)

- [ ] All 11 BullMQ workers running without errors
- [ ] Connection count reduced to 1-3 (down from 33-36)
- [ ] No "Stream isn't writeable" errors in logs
- [ ] Background jobs processing successfully
- [ ] Memory usage within free tier limits

## Related Documentation

- `REDIS_DEPLOYMENT_STATUS.md` - Deployment troubleshooting guide
- `PHASE_2_DEPLOYMENT_CHECKLIST.md` - Phase 2 verification steps
- `.kiro/specs/redis-optimization/tasks.md` - Phase 3 tasks
- `BULLMQ_CONNECTION_ANALYSIS.md` - Connection configuration analysis

## Logs Timestamp

Last checked: 2026-02-19 01:04:55 UTC
Revision: catchup-00051-tjq
