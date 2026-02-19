# Phase 2 Deployment Checklist - BullMQ Migration

**Date**: February 16, 2026  
**Status**: Ready for Production Deployment  
**Expected Impact**: Code quality improvement + future-proofing (Bull is deprecated)

---

## ⚠️ Important: Corrected Expectations

**Connection Reduction**: Minimal (33 connections with BullMQ, same as Bull)  
**Primary Benefits**: Code quality, future-proofing, better performance  
**Risk Level**: MEDIUM (user-facing queues involved)

See `BULLMQ_CONNECTION_ANALYSIS.md` for detailed analysis.

---

## Pre-Deployment Verification ✅

### Code Quality
- [x] TypeScript compilation passes
- [x] All 11 queues implemented
- [x] All 11 workers implemented
- [x] Factory pattern implemented
- [x] Worker selector implemented
- [x] Best practices verified

### Local Testing
- [x] Queue enqueuing: ✅ All 11 queues passed
- [x] Worker processing: ✅ All workers running
- [x] Event handling: ✅ Completed, failed, error events working
- [x] Rollback mechanism: ✅ Tested and working
- [x] Connection count: 33 (expected for BullMQ)

---

## Deployment Strategy: Incremental Rollout

### Why Incremental?

- Lower risk (test non-critical queues first)
- Easier to isolate issues
- Can rollback individual queue groups
- Builds confidence before critical queues

### Rollout Schedule

**Day 1: Non-Critical Queues** (Lowest Risk)
- webhook-health-check
- notification-reminder
- token-health-reminder

**Day 2: Medium-Risk Queues**
- adaptive-sync
- webhook-renewal
- suggestion-regeneration
- batch-notifications
- suggestion-generation

**Day 3: Critical Queues** (Highest Risk - User-Facing)
- token-refresh (CRITICAL - prevents auth failures)
- calendar-sync (CRITICAL - user-facing)
- google-contacts-sync (CRITICAL - user-facing)

---

## Day 1: Non-Critical Queues

### Step 1: Verify Environment

```bash
# Check USE_BULLMQ is set in production
gcloud run services describe catchup-app --region us-central1 --format="value(spec.template.spec.containers[0].env)"

# Should see: USE_BULLMQ=true
```

If not set, add it:
```bash
gcloud run services update catchup-app \
  --region us-central1 \
  --set-env-vars USE_BULLMQ=true
```

---

### Step 2: Deploy

```bash
# Deploy via Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

**Expected deployment time**: 5-10 minutes

---

### Step 3: Verify Startup

```bash
# Check logs for BullMQ initialization
gcloud run services logs read catchup-app --region us-central1 --limit 100 | grep "BullMQ"
```

**Look for**:
```
[Worker Selector] Using BullMQ worker (Phase 2)
[BullMQ Worker] Starting job worker...
[Queue Factory] Creating worker: webhook-health-check
[Queue Factory] Creating worker: notification-reminder
[Queue Factory] Creating worker: token-health-reminder
... (all 11 workers)
[BullMQ Worker] All workers started successfully
[BullMQ Worker] Using shared connection pool (1-3 connections total)
```

**Red flags**:
- ❌ "Using Bull worker (current)" - BullMQ not enabled
- ❌ Connection errors
- ❌ Worker startup failures

---

### Step 4: Monitor Non-Critical Queues (First Hour)

**Check every 15 minutes**:

```bash
# View recent logs
gcloud run services logs read catchup-app --region us-central1 --limit 50

# Look for job processing
gcloud run services logs read catchup-app --region us-central1 | grep "webhook-health-check\|notification-reminder\|token-health-reminder"
```

**Expected logs**:
```
[BullMQ] Processing webhook health check job X
[Worker webhook-health-check] Job X completed

[BullMQ] Processing notification reminder job Y
[Worker notification-reminder] Job Y completed

[BullMQ] Processing token health reminder job Z
[Worker token-health-reminder] Job Z completed
```

**Success criteria**:
- ✅ Jobs processing successfully
- ✅ No error logs
- ✅ Completion events firing

---

### Step 5: Monitor for 24 Hours

**Check every 4 hours**:
- [ ] Jobs still processing
- [ ] No error spikes
- [ ] No user complaints
- [ ] Application stable

**If successful after 24 hours**: Proceed to Day 2

**If issues occur**: Execute rollback (see below)

---

## Day 2: Medium-Risk Queues

### Step 1: Verify Day 1 Success

- [ ] Non-critical queues running for 24+ hours
- [ ] Zero errors
- [ ] All jobs processing successfully

### Step 2: Monitor Medium-Risk Queues

**These queues are more important but not user-facing**:

```bash
# Monitor adaptive-sync
gcloud run services logs read catchup-app --region us-central1 | grep "adaptive-sync"

# Monitor webhook-renewal
gcloud run services logs read catchup-app --region us-central1 | grep "webhook-renewal"

# Monitor suggestion queues
gcloud run services logs read catchup-app --region us-central1 | grep "suggestion-generation\|suggestion-regeneration"

# Monitor batch-notifications
gcloud run services logs read catchup-app --region us-central1 | grep "batch-notifications"
```

**Expected behavior**:
- ✅ Adaptive sync running daily
- ✅ Webhook renewal running daily
- ✅ Suggestions generating successfully
- ✅ Batch notifications sending

**Success criteria**:
- ✅ All medium-risk queues operational
- ✅ Job success rate >95%
- ✅ No error spikes
- ✅ No performance degradation

**If successful after 24 hours**: Proceed to Day 3

---

## Day 3: Critical Queues

### ⚠️ High Risk - User-Facing Features

**These queues directly impact users**:
- token-refresh: Prevents auth failures
- calendar-sync: User-facing calendar integration
- google-contacts-sync: User-facing contacts integration

### Step 1: Verify Days 1-2 Success

- [ ] Non-critical queues running for 48+ hours
- [ ] Medium-risk queues running for 24+ hours
- [ ] Zero critical errors
- [ ] All jobs processing successfully

### Step 2: Deploy During Low-Traffic Period

**Recommended time**: Late night or early morning (lowest user activity)

### Step 3: Monitor Critical Queues Closely

**First 2 hours - Check every 15 minutes**:

```bash
# Monitor token-refresh (CRITICAL)
gcloud run services logs read catchup-app --region us-central1 | grep "token-refresh"

# Monitor calendar-sync (CRITICAL)
gcloud run services logs read catchup-app --region us-central1 | grep "calendar-sync"

# Monitor google-contacts-sync (CRITICAL)
gcloud run services logs read catchup-app --region us-central1 | grep "google-contacts-sync"
```

**Expected logs**:
```
[BullMQ] Processing token refresh job X
[Token Refresh] Completed: N refreshed, 0 failed
[Worker token-refresh] Job X completed

[BullMQ] Processing calendar sync job Y
Processing calendar sync for user <user-id>
[Worker calendar-sync] Job Y completed

[BullMQ] Processing Google Contacts sync job Z
Processing incremental sync for user <user-id>
[Worker google-contacts-sync] Job Z completed
```

**Red flags**:
- ❌ Token refresh failures (users will lose access)
- ❌ Calendar sync errors (users won't see calendar data)
- ❌ Contacts sync failures (users won't see contacts)

### Step 4: Test User-Facing Features

**Manual testing**:
- [ ] Login to application
- [ ] Trigger calendar sync manually
- [ ] Trigger contacts sync manually
- [ ] Verify data appears correctly
- [ ] Check for any error messages

### Step 5: Monitor for 24 Hours

**First 24 hours - Check every 2 hours**:
- [ ] Token refresh running successfully
- [ ] Calendar sync working
- [ ] Contacts sync working
- [ ] No user complaints
- [ ] No error spikes

**Success criteria**:
- ✅ All critical queues operational
- ✅ Job success rate >95%
- ✅ Zero user-facing errors
- ✅ No user complaints
- ✅ All features working normally

---

## Rollback Procedures

### Option 1: Environment Variable (Fastest - 2 minutes)

```bash
# Disable BullMQ
gcloud run services update catchup-app \
  --region us-central1 \
  --set-env-vars USE_BULLMQ=false

# Verify rollback
gcloud run services logs read catchup-app --region us-central1 --limit 50 | grep "Worker Selector"
# Should see: [Worker Selector] Using Bull worker (current)
```

### Option 2: Traffic Routing (2 minutes)

```bash
# List revisions
gcloud run revisions list --service catchup-app --region us-central1

# Rollback to previous revision
gcloud run services update-traffic catchup-app \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region us-central1
```

### Option 3: Emergency Console Rollback

1. Go to Google Cloud Console
2. Navigate to Cloud Run → catchup-app
3. Click "Revisions" tab
4. Select previous revision
5. Click "Manage Traffic"
6. Set previous revision to 100%

---

## Monitoring Checklist

### Application Logs

**Check for**:
- ✅ BullMQ worker startup messages
- ✅ Job processing logs
- ✅ Job completion logs
- ❌ Connection errors
- ❌ Job failure spikes
- ❌ Worker errors

### Upstash Dashboard

**Monitor**:
- Connection count (should be ~33, same as before)
- Command usage (should be similar to Bull)
- Error rate (should be 0%)
- Latency (should be <10ms)

**Note**: Don't expect connection reduction - BullMQ uses same 3 connections per queue as Bull.

### User Experience

**Monitor**:
- User complaints (should be zero)
- Feature functionality (all working)
- Response times (no degradation)
- Error reports (none)

---

## Success Criteria

Phase 2 is successful if after 72 hours (3 days):

- ✅ All 11 queues operational with BullMQ
- ✅ Job success rate >95%
- ✅ Zero critical errors
- ✅ All user-facing features working
- ✅ No user complaints
- ✅ Application stable
- ✅ Better code quality (TypeScript, modern API)
- ✅ Future-proofed (Bull is deprecated)

**Note**: Connection count will be ~33 (same as Bull). This is expected and correct.

---

## Post-Deployment Actions

### If Successful

1. **Document Results**:
   - [ ] Update `REDIS_OPTIMIZATION_FINAL_STATUS.md`
   - [ ] Mark Phase 2 as complete in tasks.md
   - [ ] Document actual metrics

2. **Prepare Phase 3**:
   - [ ] Review cleanup tasks
   - [ ] Plan Bull package removal
   - [ ] Schedule code cleanup

3. **Communicate Success**:
   - [ ] Notify team
   - [ ] Share metrics
   - [ ] Document lessons learned

### If Issues Occur

1. **Execute Rollback**:
   - [ ] Use fastest rollback method
   - [ ] Verify Bull is working
   - [ ] Monitor for stability

2. **Root Cause Analysis**:
   - [ ] Document issue in detail
   - [ ] Review logs for patterns
   - [ ] Identify fix needed

3. **Plan Retry**:
   - [ ] Fix identified issues
   - [ ] Test fix locally
   - [ ] Retry deployment

---

## Key Differences from Original Plan

### Corrected Expectations

**Connection Reduction**:
- ❌ Original: 38-46 → 1-3 (93-97% reduction)
- ✅ Actual: 38-46 → 33 (13-28% reduction)

**Primary Benefits**:
- ✅ Code quality (modern TypeScript API)
- ✅ Future-proofing (Bull is deprecated)
- ✅ Better performance
- ✅ Better error handling
- ✅ Active maintenance

**Why Still Worth It**:
- Code is already complete
- Bull is deprecated (no future updates)
- BullMQ is objectively better
- Instant rollback available
- Even small improvements help

---

## Resources

### Documentation
- `BULLMQ_CONNECTION_ANALYSIS.md` - Connection count analysis
- `PHASE_2_LOCAL_TESTING_COMPLETE.md` - Local test results
- `REDIS_OPTIMIZATION_BEST_PRACTICES_VERIFICATION.md` - Best practices
- `PHASE_2_BULLMQ_MIGRATION_GUIDE.md` - Migration guide

### Implementation
- `src/jobs/bullmq-connection.ts` - Connection config
- `src/jobs/queue-factory.ts` - Queue/worker factory
- `src/jobs/bullmq-queue.ts` - Queue definitions
- `src/jobs/bullmq-worker.ts` - Worker implementations
- `src/jobs/worker-selector.ts` - Bull/BullMQ switcher

---

## Timeline

**Day 1**: Non-critical queues (24h monitoring)  
**Day 2**: Medium-risk queues (24h monitoring)  
**Day 3**: Critical queues (24h monitoring)  
**Total**: 3 days for full rollout

**Alternative**: Deploy all at once (higher risk, faster completion)

---

**Ready to deploy?** Start with Day 1 (non-critical queues) and monitor for 24 hours.

**Questions?** Review `BULLMQ_CONNECTION_ANALYSIS.md` for detailed analysis.
