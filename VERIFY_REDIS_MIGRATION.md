# Verify Redis Migration to Upstash

This guide helps you verify that the Redis migration from Cloud Memorystore to Upstash is working correctly.

## What Changed

- **Before**: Cloud Memorystore Redis (no TLS, $60/month)
- **After**: Upstash Redis (TLS enabled, serverless, ~$0-5/month)

## Environment Variables

Make sure these are set in Cloud Run:

```bash
REDIS_HOST=your-upstash-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password
REDIS_TLS=true  # IMPORTANT: Must be "true" for Upstash
```

## Verification Steps

### 1. Check Cloud Run Logs

After restarting Cloud Run, look for these log messages:

```
[Redis Cache] Connecting to Redis: {
  host: 'your-host.upstash.io',
  port: 6379,
  db: 0,
  tls: 'enabled',
  passwordSet: true
}
[Redis Cache] Connected to Redis successfully
[Redis Cache] Redis client ready

[Redis Queue] Connecting to Redis: {
  host: 'your-host.upstash.io',
  port: 6379,
  tls: 'enabled',
  passwordSet: true
}
[Redis Queue] Connected to Redis successfully
[Redis Queue] Redis client ready
```

**Good signs:**
- ✅ `tls: 'enabled'` - TLS is configured
- ✅ `passwordSet: true` - Password is set
- ✅ `Connected to Redis successfully` - Connection established
- ✅ `Redis client ready` - Client is ready to use

**Bad signs:**
- ❌ `tls: 'disabled'` - TLS not enabled (won't work with Upstash)
- ❌ `Redis connection error` - Connection failed
- ❌ `passwordSet: false` - Password missing

### 2. Check Health Endpoint

Visit: https://catchup.club/health

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-09T...",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "redisConfig": {
      "host": "your-host.upstash.io",
      "port": "6379",
      "tls": "enabled"
    }
  }
}
```

**If Redis is unhealthy:**
- Status will be `"degraded"` (app still works, but no caching)
- Check Cloud Run logs for error messages
- Verify environment variables are set correctly

### 2a. Check Admin Sync Health Dashboard

**For admin users**, navigate to: https://catchup.club/admin/sync-health.html

The dashboard now includes a **Redis Health Status** section showing:
- **Connection Status**: Healthy/Unhealthy/Unknown with color-coded indicator
- **Configuration**: Host, Port, TLS status (✓ Enabled / ✗ Disabled)

This provides real-time visibility into Redis connectivity alongside sync health metrics.

**Access requirements:**
- Must be logged in as an admin user
- Dashboard is accessible from Preferences page → Admin link (for admin users only)

### 3. Test Queue Functionality

Trigger a background job (e.g., sync contacts):

1. Go to Preferences → Disconnect Google Contacts
2. Reconnect Google Contacts
3. Check Cloud Run logs for:

```
[Redis Queue] Connected to Redis successfully
Google Contacts sync job <id> completed successfully
```

### 4. Test Cache Functionality

1. Load the Directory page (contacts list)
2. Reload the page (should be faster due to caching)
3. Check Cloud Run logs for cache operations

## Troubleshooting

### Error: "Redis connection error: ECONNREFUSED"

**Cause**: Can't connect to Redis host

**Fix**:
1. Verify `REDIS_HOST` is set correctly in Cloud Run
2. Check Upstash dashboard - is the database active?
3. Verify network connectivity

### Error: "Redis connection error: ENOTFOUND"

**Cause**: DNS resolution failed for Redis host

**Fix**:
1. Check `REDIS_HOST` spelling in Cloud Run env vars
2. Verify the Upstash endpoint is correct

### Error: "Redis connection error: certificate verify failed"

**Cause**: TLS certificate validation failed

**Fix**:
1. Verify `REDIS_TLS=true` is set in Cloud Run
2. Check that you're using the correct Upstash endpoint

### Error: "Redis connection error: WRONGPASS"

**Cause**: Incorrect Redis password

**Fix**:
1. Get the correct password from Upstash dashboard
2. Update `REDIS_PASSWORD` in Cloud Run
3. Restart Cloud Run

### Status: "degraded" (Redis unhealthy but app works)

**Cause**: Redis connection failed, but app continues without caching

**Impact**:
- App still works
- No caching (slower performance)
- Background jobs may fail

**Fix**:
1. Check Cloud Run logs for specific error
2. Fix the Redis connection issue
3. Restart Cloud Run

## Performance Comparison

### Before (Cloud Memorystore)
- Connection: Direct, no TLS
- Latency: ~1-2ms (same region)
- Cost: $60/month (always running)

### After (Upstash)
- Connection: TLS encrypted
- Latency: ~5-10ms (serverless)
- Cost: ~$0-5/month (pay per request)

**Expected behavior:**
- Slightly higher latency (acceptable)
- Same functionality
- Significant cost savings

## Monitoring

### Cloud Run Logs

Filter for Redis logs:

```
resource.type="cloud_run_revision"
textPayload=~"Redis"
```

### Upstash Dashboard

Monitor:
- Request count
- Bandwidth usage
- Error rate
- Cost

## Rollback Plan

If Upstash isn't working, you can rollback to Cloud Memorystore:

1. **Don't delete Cloud Memorystore yet!**
2. Update Cloud Run env vars:
   ```bash
   REDIS_HOST=10.x.x.x  # Cloud Memorystore IP
   REDIS_PORT=6379
   REDIS_TLS=false  # Disable TLS
   # Remove REDIS_PASSWORD
   ```
3. Restart Cloud Run
4. Verify health endpoint shows Redis as healthy

## Next Steps

Once verified working for 24-48 hours:

1. ✅ Verify health endpoint shows Redis healthy
2. ✅ Verify background jobs are working
3. ✅ Verify caching is working (faster page loads)
4. ✅ Monitor Upstash dashboard for errors
5. ✅ Check cost in Upstash dashboard

**Then delete Cloud Memorystore:**

```bash
gcloud redis instances delete catchup-redis --region=us-central1
```

**Expected savings:** ~$60/month

