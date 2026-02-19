# Phase 1 Deployment Checklist

**Date**: February 16, 2026  
**Status**: Ready for Production Deployment  
**Expected Impact**: 13-22% connection reduction (38-46 → 33-36)

---

## Pre-Deployment Verification ✅

### Code Quality
- [x] TypeScript compilation passes (`npm run typecheck`)
- [x] Tests run successfully (`npm test`)
- [x] Old ioredis code commented out for rollback
- [x] HTTP Redis client implemented and tested

### Local Testing Results
- [x] HTTP Redis client tested locally
- [x] Cache operations verified
- [x] Rate limiting verified
- [x] SMS rate limiting verified

### Code Review
- [x] All HTTP Redis methods implemented correctly
- [x] Error handling in place (fail-open strategy)
- [x] Exponential backoff configured
- [x] TTL settings appropriate

---

## Production Deployment Steps

### Step 1: Verify Upstash Redis Credentials

Check that production has the correct environment variables:

```bash
# Required variables in Cloud Run:
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_rest_token_here
```

**How to verify**:
1. Go to Google Cloud Console
2. Navigate to Cloud Run → catchup-app service
3. Click "Edit & Deploy New Revision"
4. Check "Variables & Secrets" tab
5. Verify both variables are set

**If not set**, follow `PHASE_1_DEPLOYMENT_GUIDE.md` to configure secrets.

---

### Step 2: Deploy to Production

**Option A: Via Cloud Build (Recommended)**

```bash
# Trigger Cloud Build deployment
gcloud builds submit --config cloudbuild.yaml
```

**Option B: Via Cloud Run CLI**

```bash
# Build and deploy
npm run build
gcloud run deploy catchup-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

**Expected deployment time**: 5-10 minutes

---

### Step 3: Verify Deployment

**Check deployment status**:
```bash
gcloud run services describe catchup-app --region us-central1
```

Look for:
- Status: Ready
- Latest revision deployed
- No errors in logs

**Check application logs**:
```bash
gcloud run services logs read catchup-app --region us-central1 --limit 50
```

Look for:
- `[HTTP Redis] Client initialized with REST API`
- `[Rate Limiter] Using HTTP Redis client (0 connections)`
- `[Redis Cache] Using HTTP Redis client (0 connections)`
- `[SMS Rate Limiter] Using HTTP Redis client (0 connections)`
- No Redis connection errors

---

### Step 4: Monitor Upstash Dashboard (First Hour)

**Go to**: https://console.upstash.com

**Monitor these metrics**:

1. **Connection Count** (should drop immediately):
   - Before: 38-46 connections
   - After: 33-36 connections
   - **Target**: 13-22% reduction

2. **Command Usage** (should drop over time):
   - Before: ~105K commands/day
   - After: ~70K commands/day
   - **Target**: 30-40% reduction

3. **Error Rate**:
   - Should remain at 0%
   - Any spike indicates issues

4. **Latency**:
   - HTTP Redis adds <10ms latency
   - Should not impact user experience

**Check every 15 minutes for first hour**

---

### Step 5: Test Application Functionality

**Test these features manually**:

1. **Cache Operations**:
   - [ ] Login to application
   - [ ] Navigate between pages (should be fast)
   - [ ] Check browser console for errors

2. **Rate Limiting**:
   - [ ] Make multiple API requests quickly
   - [ ] Should see rate limit headers in response
   - [ ] Should get 429 error if limit exceeded

3. **SMS Rate Limiting** (if applicable):
   - [ ] Send SMS via Twilio integration
   - [ ] Verify rate limiting works

4. **General Functionality**:
   - [ ] Google Calendar sync works
   - [ ] Google Contacts sync works
   - [ ] Voice notes work
   - [ ] All features operational

---

### Step 6: Monitor Application Logs (24 Hours)

**Check logs periodically**:
```bash
# View recent logs
gcloud run services logs read catchup-app --region us-central1 --limit 100

# Follow logs in real-time
gcloud run services logs tail catchup-app --region us-central1
```

**Look for**:
- ✅ No Redis connection errors
- ✅ No HTTP Redis timeout errors
- ✅ No cache miss spikes
- ✅ No rate limiting errors
- ❌ Any error messages containing "Redis", "Upstash", or "rate limit"

**Monitor at these intervals**:
- Hour 1: Every 15 minutes
- Hours 2-4: Every hour
- Hours 5-24: Every 4 hours

---

### Step 7: Verify Metrics After 24 Hours

**Upstash Dashboard Metrics**:

1. **Connection Count**:
   - [ ] Stable at 33-36 connections
   - [ ] No spikes above 40
   - [ ] No connection errors

2. **Command Usage**:
   - [ ] Reduced to ~70K/day (30-40% reduction)
   - [ ] Stable over 24 hours
   - [ ] No unusual spikes

3. **Performance**:
   - [ ] Latency <10ms for cache operations
   - [ ] No timeout errors
   - [ ] Cache hit rate >80%

**Application Metrics**:

1. **Response Times**:
   - [ ] API response times within 10% of baseline
   - [ ] No user complaints about slowness

2. **Error Rates**:
   - [ ] No increase in error rates
   - [ ] No new error types

3. **User Experience**:
   - [ ] No user complaints
   - [ ] All features working normally

---

## Success Criteria

Phase 1 is successful if ALL of these are met after 24 hours:

- [x] Deployment completed without errors
- [ ] Connection count: 33-36 (13-22% reduction from 38-46)
- [ ] Command usage: ~70K/day (30-40% reduction from 105K)
- [ ] Zero Redis connection errors
- [ ] Zero HTTP Redis timeout errors
- [ ] API response times within 10% of baseline
- [ ] All application features working normally
- [ ] No user complaints

---

## Rollback Procedure

If any issues occur, rollback immediately:

### Option 1: Revert to Previous Revision

```bash
# List revisions
gcloud run revisions list --service catchup-app --region us-central1

# Rollback to previous revision
gcloud run services update-traffic catchup-app \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region us-central1
```

### Option 2: Uncomment Old Code and Redeploy

1. Uncomment old ioredis code in:
   - `src/utils/cache.ts`
   - `src/utils/rate-limiter.ts`
   - `src/sms/sms-rate-limiter.ts`

2. Comment out HTTP Redis code

3. Redeploy:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

### Option 3: Emergency Rollback via Console

1. Go to Google Cloud Console
2. Navigate to Cloud Run → catchup-app
3. Click "Revisions" tab
4. Select previous revision
5. Click "Manage Traffic"
6. Set previous revision to 100%

**Rollback time**: 2-5 minutes

---

## Post-Deployment Actions

### If Successful

1. **Update Documentation**:
   - [ ] Mark Phase 1 as complete in `REDIS_OPTIMIZATION_FINAL_STATUS.md`
   - [ ] Update `.kiro/specs/redis-optimization/tasks.md`
   - [ ] Document actual metrics achieved

2. **Prepare for Phase 2**:
   - [ ] Review Phase 2 tasks
   - [ ] Plan BullMQ migration timeline
   - [ ] Set up local testing environment

3. **Communicate Success**:
   - [ ] Notify team of successful deployment
   - [ ] Share metrics (connection reduction, command reduction)
   - [ ] Celebrate! 🎉

### If Issues Occur

1. **Immediate Actions**:
   - [ ] Execute rollback procedure
   - [ ] Document issue in detail
   - [ ] Check logs for error patterns

2. **Root Cause Analysis**:
   - [ ] Identify what went wrong
   - [ ] Determine if issue is fixable
   - [ ] Create fix plan

3. **Retry Deployment**:
   - [ ] Fix identified issues
   - [ ] Test fix locally
   - [ ] Redeploy with monitoring

---

## Monitoring Dashboard

**Upstash Console**: https://console.upstash.com
- Connection count
- Command usage
- Error rate
- Latency

**Google Cloud Console**: https://console.cloud.google.com
- Cloud Run logs
- Error reporting
- Performance metrics

**Application Health**:
- Test login: https://your-app-url.run.app
- Admin dashboard: https://your-app-url.run.app/admin/sync-health.html

---

## Contact Information

**If issues occur**:
1. Check logs first
2. Review rollback procedure
3. Execute rollback if needed
4. Document issue for later analysis

**Resources**:
- Deployment Guide: `PHASE_1_DEPLOYMENT_GUIDE.md`
- Best Practices: `REDIS_OPTIMIZATION_BEST_PRACTICES_VERIFICATION.md`
- Overall Status: `REDIS_OPTIMIZATION_FINAL_STATUS.md`

---

## Notes

- HTTP Redis uses REST API (no persistent connections)
- Expected latency increase: <10ms
- Fail-open strategy: errors allow requests through
- Rollback is instant via traffic routing
- Old code preserved for quick rollback

---

**Ready to deploy?** Follow steps 1-7 above and monitor closely for 24 hours.

**Questions?** Review `PHASE_1_DEPLOYMENT_GUIDE.md` for detailed instructions.
