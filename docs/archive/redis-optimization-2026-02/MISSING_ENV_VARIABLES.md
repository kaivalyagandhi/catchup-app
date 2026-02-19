# Missing Environment Variables in Cloud Run

## Critical for BullMQ (Redis Optimization)

These variables are **required** for BullMQ to connect to Upstash Redis:

### 1. REDIS_DB
- **Value**: `0`
- **Purpose**: Specifies which Redis database to use (Upstash uses database 0)
- **Impact**: BullMQ connection will fail without this

### 2. REDIS_TLS
- **Value**: `true`
- **Purpose**: Enables TLS for Upstash Redis connection
- **Impact**: Connection will fail without TLS enabled for Upstash

## Important Configuration Variables

### 3. GEMINI_MODEL
- **Value**: `gemini-2.5-flash`
- **Purpose**: Specifies which Gemini model to use for AI features
- **Impact**: Falls back to default model if not set

### 4. GEMINI_SCHEDULING_MODEL
- **Value**: `gemini-2.5-flash-lite-preview`
- **Purpose**: Specifies which Gemini model to use for scheduling features
- **Impact**: Falls back to default model if not set

### 5. JWT_EXPIRES_IN
- **Value**: `7d`
- **Purpose**: JWT token expiration time
- **Impact**: May use different default if not set

### 6. FEED_SECRET
- **Value**: `61a2240687311fc3f234130d35f97f0ad32cd52408fd74b960d9c8af54ef660c`
- **Purpose**: Secret key for calendar feed URLs
- **Impact**: Calendar feed URLs won't work without this

## Feature Flags

### 7. SMS_ENRICHMENT_ENABLED
- **Value**: `true`
- **Purpose**: Enable/disable SMS enrichment feature
- **Impact**: SMS enrichment won't work if not set

### 8. RATE_LIMIT_MESSAGES_PER_HOUR
- **Value**: `20`
- **Purpose**: SMS rate limiting threshold
- **Impact**: May use different default if not set

### 9. MAX_MEDIA_SIZE_MB
- **Value**: `5`
- **Purpose**: Maximum MMS media file size
- **Impact**: May use different default if not set

### 10. VERIFICATION_CODE_EXPIRY_MINUTES
- **Value**: `10`
- **Purpose**: SMS verification code expiration time
- **Impact**: May use different default if not set

### 11. DISABLE_RATE_LIMITING
- **Value**: `true` (for development) or `false` (for production)
- **Purpose**: Disable rate limiting for testing
- **Impact**: Rate limiting behavior

### 12. ENABLE_TEST_DATA_ENDPOINTS
- **Value**: `false` (for production)
- **Purpose**: Enable/disable test data endpoints
- **Impact**: Security - should be false in production

## Database Connection Pool

### 13. DATABASE_POOL_MIN
- **Value**: `2`
- **Purpose**: Minimum database connection pool size
- **Impact**: May use different default if not set

### 14. DATABASE_POOL_MAX
- **Value**: `10`
- **Purpose**: Maximum database connection pool size
- **Impact**: May use different default if not set

## How to Add These Variables

### Option 1: Add as Plain Environment Variables (Recommended for non-sensitive)

```bash
gcloud run services update catchup \
  --region=us-central1 \
  --update-env-vars="REDIS_DB=0,REDIS_TLS=true,GEMINI_MODEL=gemini-2.5-flash,GEMINI_SCHEDULING_MODEL=gemini-2.5-flash-lite-preview,JWT_EXPIRES_IN=7d,SMS_ENRICHMENT_ENABLED=true,RATE_LIMIT_MESSAGES_PER_HOUR=20,MAX_MEDIA_SIZE_MB=5,VERIFICATION_CODE_EXPIRY_MINUTES=10,DISABLE_RATE_LIMITING=false,ENABLE_TEST_DATA_ENDPOINTS=false,DATABASE_POOL_MIN=2,DATABASE_POOL_MAX=10" \
  --project=catchup-479221
```

### Option 2: Add FEED_SECRET as Secret (Recommended for sensitive)

```bash
# Create secret
echo -n "61a2240687311fc3f234130d35f97f0ad32cd52408fd74b960d9c8af54ef660c" | \
  gcloud secrets create feed-secret --data-file=- --project=catchup-479221

# Update Cloud Run to use secret
gcloud run services update catchup \
  --region=us-central1 \
  --update-secrets="FEED_SECRET=feed-secret:latest" \
  --project=catchup-479221
```

## Current Issue

The BullMQ workers are failing with error:
```
[Worker adaptive-sync] Worker error: Stream isn't writeable and enableOfflineQueue options is false
```

This is because:
1. **REDIS_DB** is not set (BullMQ doesn't know which database to use)
2. **REDIS_TLS** is not set (BullMQ can't connect to Upstash without TLS)

The `REDIS_URL` secret is correct: `rediss://:AYu6AAIncDFlZWMzMmI4ZDU5YjU0MzMwOTY4ZjhiNDJmNzQxY2YwMXAxMzU3NzA@generous-lamb-35770.upstash.io:6379`

However, the BullMQ connection code in `src/jobs/bullmq-connection.ts` parses the URL but may not be handling the TLS correctly.

## Recommended Action

Add the missing environment variables, especially **REDIS_DB** and **REDIS_TLS**, then redeploy.
