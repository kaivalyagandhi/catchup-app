# Redis Optimization Deployment Status

## ✅ Completed

### 1. Environment Variables Migration
- ✅ All 16 environment variables moved to Secret Manager
- ✅ Plain env vars removed to avoid conflicts
- ✅ Secrets created successfully:
  - redis-db, redis-tls
  - gemini-model, gemini-scheduling-model
  - jwt-expires-in, feed-secret
  - sms-enrichment-enabled, rate-limit-messages-per-hour
  - max-media-size-mb, verification-code-expiry-minutes
  - disable-rate-limiting, enable-test-data-endpoints
  - database-pool-min, database-pool-max
  - upstash-redis-rest-url, upstash-redis-rest-token

### 2. Deployment
- ✅ Cloud Run revision `catchup-00049-fp2` deployed successfully
- ✅ BullMQ workers starting successfully
- ✅ HTTP Redis client initialized

## ⚠️ Current Issues

### Issue 1: BullMQ Connection Errors
**Error**: `Stream isn't writeable and enableOfflineQueue options is false`

**Cause**: BullMQ workers cannot connect to Upstash Redis

**Possible Reasons**:
1. **Eviction Policy**: Upstash Redis has `optimistic-volatile` eviction policy, but BullMQ requires `noeviction`
2. **TLS Configuration**: May need additional TLS settings for Upstash
3. **Connection String Format**: REDIS_URL may need adjustment

### Issue 2: Upstash Eviction Policy
**Warning**: `IMPORTANT! Eviction policy is optimistic-volatile. It should be "noeviction"`

**Impact**: BullMQ requires `noeviction` policy to prevent job data loss

**Solution**: Change Upstash Redis eviction policy to `noeviction`

## 🔍 Diagnostic Information

### Current Configuration
```bash
REDIS_URL=rediss://:AYu6AAIncDFlZWMzMmI4ZDU5YjU0MzMwOTY4ZjhiNDJmNzQxY2YwMXAxMzU3NzA@generous-lamb-35770.upstash.io:6379
REDIS_DB=0
REDIS_TLS=true
```

### BullMQ Connection Code
Location: `src/jobs/bullmq-connection.ts`

The code parses REDIS_URL and sets:
- host: generous-lamb-35770.upstash.io
- port: 6379
- password: AYu6AAIncDFlZWMzMmI4ZDU5YjU0MzMwOTY4ZjhiNDJmNzQxY2YwMXAxMzU3NzA
- db: 0
- tls: {} (because protocol is rediss://)

### HTTP Redis Client
- ✅ Working correctly
- Uses REST API (no persistent connections)
- Used for cache and rate limiting

## 📋 Next Steps

### Step 1: Fix Upstash Eviction Policy
1. Go to [Upstash Console](https://console.upstash.io)
2. Select your Redis database: `generous-lamb-35770`
3. Go to "Configuration" or "Settings"
4. Change eviction policy from `optimistic-volatile` to `noeviction`
5. Save changes

**Why**: BullMQ stores job data in Redis and cannot function with an eviction policy that removes data

### Step 2: Verify BullMQ Connection
After changing eviction policy:

```bash
# Check logs for BullMQ workers
gcloud run services logs read catchup \
  --region=us-central1 \
  --limit=100 \
  --project=catchup-479221 | grep -i bullmq

# Look for:
# ✅ "All workers started successfully"
# ❌ "Stream isn't writeable" errors
```

### Step 3: Test BullMQ Functionality
Once workers are connected:

1. **Test job processing**:
   - Trigger a sync job
   - Check if jobs are being processed
   - Verify no errors in logs

2. **Monitor Upstash dashboard**:
   - Check connection count (should be 1-3)
   - Verify commands are being executed
   - Monitor memory usage

### Step 4: Monitor for 24-48 Hours
- Watch for any connection errors
- Monitor Upstash usage and costs
- Verify all background jobs are processing correctly

## 🔧 Alternative Solutions (If Eviction Policy Change Doesn't Work)

### Option 1: Use Upstash for HTTP Redis Only
- Keep HTTP Redis client for cache and rate limiting (working)
- Use a different Redis provider for BullMQ (e.g., Redis Cloud, Railway)
- Requires additional Redis instance

### Option 2: Disable BullMQ (Rollback to Bull)
- Set `USE_BULLMQ=false`
- Revert to Bull with 33-36 connections
- Less optimal but proven to work

### Option 3: Use Different Upstash Database
- Create a new Upstash database with `noeviction` policy
- Update REDIS_URL to point to new database
- Keep current database for HTTP Redis client

## 📊 Cost Impact

### Current Setup
- Upstash Redis: Free tier or pay-as-you-go
- HTTP Redis: ~0 connections (REST API)
- BullMQ: Should be 1-3 connections (currently failing)

### If BullMQ Works
- Total connections: 1-3 (vs. 33-36 with Bull)
- Significant reduction in connection overhead
- Better scalability

## 📝 Documentation Updated
- ✅ `MISSING_ENV_VARIABLES.md` - List of missing env vars
- ✅ `ADD_ALL_TO_SECRET_MANAGER.sh` - Script to add secrets
- ✅ `FIX_ENV_VARS_CONFLICT.sh` - Script to fix conflicts
- ✅ `REDIS_DEPLOYMENT_STATUS.md` - This document

## 🎯 Success Criteria

- [ ] Upstash eviction policy changed to `noeviction`
- [ ] BullMQ workers connect successfully (no "Stream isn't writeable" errors)
- [ ] All 11 workers running without errors
- [ ] Jobs being processed successfully
- [ ] Upstash dashboard shows 1-3 connections
- [ ] No errors in logs for 24 hours
- [ ] HTTP Redis client still working for cache/rate limiting

## 📞 Support

If issues persist after changing eviction policy:
1. Check Upstash documentation for BullMQ compatibility
2. Review BullMQ connection configuration in `src/jobs/bullmq-connection.ts`
3. Consider alternative solutions listed above
4. Contact Upstash support for assistance with eviction policy

---

**Last Updated**: 2026-02-17 00:46 UTC
**Current Revision**: catchup-00049-fp2
**Status**: Deployed, awaiting Upstash configuration change
