# Phase 1: HTTP Redis Migration - Deployment Guide

**Status**: Code Complete ✅ | Ready for Production Deployment  
**Date**: February 10, 2026

## Pre-Deployment Checklist

- [x] HTTP Redis client implemented and tested locally
- [x] Cache service migrated to HTTP Redis
- [x] Rate limiter migrated to HTTP Redis  
- [x] SMS rate limiter migrated to HTTP Redis
- [x] Local testing passed (all operations working)
- [ ] Production secrets configured in Google Cloud
- [ ] Cloud Run configuration updated
- [ ] Deployment script ready

## Step 1: Configure Production Secrets

Add the Upstash REST API credentials to Google Cloud Secret Manager:

```bash
# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Create secrets (use the same values from your .env file)
echo -n "https://your-database.upstash.io" | \
  gcloud secrets create upstash-redis-rest-url --data-file=-

echo -n "YOUR_REST_TOKEN_HERE" | \
  gcloud secrets create upstash-redis-rest-token --data-file=-

# Grant Cloud Run service account access to secrets
SERVICE_ACCOUNT=$(gcloud run services describe catchup \
  --region=us-central1 \
  --format='value(spec.template.spec.serviceAccountName)')

gcloud secrets add-iam-policy-binding upstash-redis-rest-url \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding upstash-redis-rest-token \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 2: Update Cloud Build Configuration

The `cloudbuild.yaml` needs to be updated to include the new secrets. Add these to the `--update-secrets` flag:

```yaml
- name: 'gcr.io/cloud-builders/gcloud'
  args:
    - 'run'
    - 'deploy'
    - 'catchup'
    - '--image=gcr.io/$PROJECT_ID/catchup:$TAG_NAME'
    - '--region=us-central1'
    - '--platform=managed'
    - '--update-secrets=UPSTASH_REDIS_REST_URL=upstash-redis-rest-url:latest,UPSTASH_REDIS_REST_TOKEN=upstash-redis-rest-token:latest,REDIS_URL=redis-url:latest,DATABASE_URL=database-url:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,JWT_SECRET=jwt-secret:latest,ENCRYPTION_KEY=encryption-key:latest,TWILIO_ACCOUNT_SID=twilio-account-sid:latest,TWILIO_AUTH_TOKEN=twilio-auth-token:latest,GOOGLE_GEMINI_API_KEY=google-gemini-api-key:latest'
```

## Step 3: Deploy to Production

```bash
# Commit the changes
git add .
git commit -m "feat: Phase 1 HTTP Redis migration - deploy to production"

# Tag for production deployment
git tag -f prod
git push origin main
git push -f origin prod
```

This will trigger Cloud Build and deploy the new version.

## Step 4: Monitor Deployment (First 24 Hours)

### Immediate Checks (First 5 Minutes)

1. **Verify Deployment Success**
   ```bash
   # Check Cloud Run deployment status
   gcloud run services describe catchup --region=us-central1
   
   # Check application is responding
   curl -s -o /dev/null -w "%{http_code}" https://catchup.club
   ```

2. **Check Application Logs**
   ```bash
   # Look for HTTP Redis initialization messages
   gcloud run services logs read catchup --region=us-central1 --limit=50 | grep "HTTP Redis"
   
   # Expected output:
   # [HTTP Redis] Client initialized with REST API
   # [Redis Cache] Using HTTP Redis client (0 connections)
   # [Rate Limiter] Using HTTP Redis client (0 connections)
   # [SMS Rate Limiter] Using HTTP Redis client (0 connections)
   ```

3. **Check for Errors**
   ```bash
   # Look for any Redis-related errors
   gcloud run services logs read catchup --region=us-central1 --limit=100 | grep -i "error"
   ```

### Upstash Dashboard Monitoring

Go to https://console.upstash.com and monitor:

1. **Connection Count** (should drop to 33-36)
   - Before: 38-46 connections
   - After: 33-36 connections
   - Reduction: 5-10 connections (13-22%)

2. **Command Usage** (should drop by 30-40%)
   - Before: ~105K commands/day
   - After: ~70K commands/day
   - Reduction: ~35K commands/day

3. **Error Rate** (should be 0%)
   - No connection errors
   - No authentication errors
   - No timeout errors

### Application Performance Monitoring

1. **API Response Times**
   ```bash
   # Test key endpoints
   time curl -s https://catchup.club/api/contacts -H "Authorization: Bearer YOUR_TOKEN"
   time curl -s https://catchup.club/api/groups -H "Authorization: Bearer YOUR_TOKEN"
   ```
   
   Expected: Response times should not increase by more than 10%

2. **Cache Hit Rate**
   - Monitor cache operations in logs
   - Should maintain >80% hit rate

3. **Rate Limiting**
   - Test rate limiting is working
   - Make 60+ requests in 1 minute
   - Should get 429 response after limit

### Continuous Monitoring (24 Hours)

Monitor these metrics every few hours:

- [ ] Hour 1: Check logs, Upstash dashboard, API response times
- [ ] Hour 4: Verify connection count stable at 33-36
- [ ] Hour 8: Check command usage trending down
- [ ] Hour 12: Verify no errors in logs
- [ ] Hour 24: Final verification before Phase 2

## Step 5: Document Results

After 24 hours of stable operation, document:

1. **Connection Reduction**
   - Before: X connections
   - After: Y connections
   - Reduction: Z% 

2. **Command Usage Reduction**
   - Before: X commands/day
   - After: Y commands/day
   - Reduction: Z%

3. **Performance Impact**
   - API response time change: X%
   - Cache hit rate: Y%
   - Error rate: Z%

4. **Issues Encountered**
   - List any issues and resolutions

## Rollback Procedure (If Needed)

If critical issues occur:

1. **Immediate Rollback**
   ```bash
   # Revert to previous version
   git revert HEAD
   git tag -f prod
   git push -f origin prod
   ```

2. **Alternative: Uncomment Old Code**
   - Uncomment ioredis code in cache.ts, rate-limiter.ts, sms-rate-limiter.ts
   - Remove httpRedis imports
   - Redeploy

3. **Verify Rollback**
   ```bash
   # Check logs for ioredis connections
   gcloud run services logs read catchup --region=us-central1 | grep "ioredis"
   ```

## Success Criteria

Phase 1 is successful if:

- ✅ Application deployed without errors
- ✅ Connections reduced to 33-36 (from 38-46)
- ✅ Command usage reduced by 30-40%
- ✅ Zero connection errors for 24 hours
- ✅ API response times within 10% of baseline
- ✅ All features working (cache, rate limiting, SMS)

## Next Steps

After successful Phase 1 deployment and 24-hour monitoring:

1. **Proceed to Phase 2**: BullMQ Migration
2. **Expected Results**: Further reduce connections to 1-3
3. **Timeline**: 1-2 weeks for Phase 2 implementation

---

**Deployment Checklist**:
- [ ] Secrets configured in Google Cloud
- [ ] cloudbuild.yaml updated
- [ ] Code committed and tagged
- [ ] Deployment triggered
- [ ] Initial checks passed (5 minutes)
- [ ] 24-hour monitoring complete
- [ ] Results documented
- [ ] Ready for Phase 2

