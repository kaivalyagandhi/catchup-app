# Cloud Tasks Local Testing Guide

## Status: Ready for Testing ✅

**Date**: 2026-02-19  
**Phase**: 3.1.3 - Local Testing  
**Prerequisites**: ✅ All infrastructure and code complete

---

## 🎯 Testing Objectives

1. Verify Cloud Tasks integration works end-to-end
2. Test all 11 job types execute successfully
3. Validate idempotency prevents duplicates
4. Confirm retry logic works correctly
5. Ensure no TypeScript or runtime errors

---

## 📋 Prerequisites Checklist

### Infrastructure (GCP)
- [x] Cloud Tasks API enabled in project `catchup-479221`
- [x] 11 queues created with retry configurations
- [x] Service account has Cloud Run Invoker role
- [x] @google-cloud/tasks package installed

### Code Implementation
- [x] `src/jobs/cloud-tasks-config.ts` - Queue configurations
- [x] `src/jobs/cloud-tasks-client.ts` - Client wrapper
- [x] `src/jobs/idempotency.ts` - Duplicate prevention
- [x] `src/api/jobs-handler.ts` - HTTP endpoint
- [x] `src/jobs/queue-factory.ts` - Feature flag support
- [x] TypeScript compilation passes (`npm run typecheck`)

### Environment Variables
- [x] `USE_CLOUD_TASKS=false` (will change to true for testing)
- [x] `GCP_PROJECT_ID=catchup-479221`
- [x] `GCP_REGION=us-central1`
- [x] `CLOUD_RUN_URL=http://localhost:3000`
- [x] `SERVICE_ACCOUNT_EMAIL=402592213346-compute@developer.gserviceaccount.com`
- [x] Upstash Redis credentials configured

---

## 🚀 Testing Steps

### Step 1: Enable Cloud Tasks

```bash
# Edit .env file
# Change: USE_CLOUD_TASKS=false
# To:     USE_CLOUD_TASKS=true

# Verify the change
grep USE_CLOUD_TASKS .env
# Should output: USE_CLOUD_TASKS=true
```

### Step 2: Start the Application

```bash
# Terminal 1: Start the server
npm run dev

# Expected output:
# [Queue Factory] Creating Cloud Tasks queue: ...
# Server running on http://localhost:3000
```

### Step 3: Test Non-Critical Queue First

Start with the lowest-risk queue to verify basic functionality.

**Test: webhook-health-check**

```bash
# Terminal 2: Trigger webhook health check
# This will create a Cloud Tasks task

# Option A: Via API (if endpoint exists)
curl -X POST http://localhost:3000/api/webhooks/health-check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Option B: Via direct queue usage (create test script)
# See test-cloud-tasks.ts below
```

**Expected Logs (Terminal 1)**:
```
[Cloud Tasks] Created task: projects/catchup-479221/locations/us-central1/queues/webhook-health-check-queue/tasks/...
[Jobs] Cloud Tasks headers: { queueName: 'webhook-health-check-queue', ... }
[Jobs] Starting job: webhook-health-check
[Idempotency] Marked as processed: <hash>
[Jobs] Completed job: webhook-health-check (123ms)
```

### Step 4: Verify in GCP Console

```bash
# Check queue status
gcloud tasks queues describe webhook-health-check-queue \
  --location=us-central1

# List tasks in queue
gcloud tasks list \
  --queue=webhook-health-check-queue \
  --location=us-central1

# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision" \
  --limit=50 \
  --format=json
```

### Step 5: Test Idempotency

Create the same task twice to verify duplicate detection.

```bash
# Create task 1
# (Use same test as Step 3)

# Create task 2 (identical data)
# (Use same test as Step 3)

# Expected: Second request returns { duplicate: true }
```

**Expected Logs**:
```
[Jobs] Duplicate request detected: <hash>
[Jobs] Completed job: webhook-health-check (5ms)
```

### Step 6: Test All 11 Job Types

Test each job type in order of risk (low → high).

#### Non-Critical Queues (Test First)

1. **webhook-health-check** ✅ (tested in Step 3)
2. **notification-reminder**
3. **token-health-reminder**

#### Medium-Risk Queues

4. **adaptive-sync**
5. **webhook-renewal**
6. **suggestion-regeneration**
7. **batch-notifications**
8. **suggestion-generation**

#### Critical Queues (Test Last)

9. **token-refresh** ⚠️ CRITICAL
10. **calendar-sync** ⚠️ CRITICAL
11. **google-contacts-sync** ⚠️ CRITICAL

**Testing Script** (create `scripts/test-cloud-tasks.ts`):

```typescript
import { createQueue } from '../src/jobs/queue-factory';

async function testAllQueues() {
  const jobTypes = [
    'webhook-health-check',
    'notification-reminder',
    'token-health-reminder',
    'adaptive-sync',
    'webhook-renewal',
    'suggestion-regeneration',
    'batch-notifications',
    'suggestion-generation',
    'token-refresh',
    'calendar-sync',
    'google-contacts-sync'
  ];

  for (const jobType of jobTypes) {
    console.log(`\n🧪 Testing: ${jobType}`);
    
    try {
      const queue = createQueue(jobType);
      const taskName = await queue.add(jobType, {
        test: true,
        timestamp: Date.now()
      });
      
      console.log(`✅ Task created: ${taskName}`);
      
      // Wait 2 seconds before next test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ All tests complete');
}

testAllQueues().catch(console.error);
```

**Run the test**:
```bash
# Compile TypeScript
npm run build

# Run test script
node dist/scripts/test-cloud-tasks.js
```

### Step 7: Test Error Handling

Verify retry logic works correctly.

**Test 5xx Error (Retryable)**:
```typescript
// Modify a processor to throw a retryable error
throw new Error('Database connection timeout'); // 5xx

// Expected: Cloud Tasks retries with exponential backoff
```

**Test 4xx Error (Non-Retryable)**:
```typescript
// Modify a processor to throw a permanent error
throw new Error('Invalid data format'); // 4xx

// Expected: Cloud Tasks does NOT retry
```

### Step 8: Monitor Logs

Watch for errors and verify all jobs complete successfully.

```bash
# Terminal 1: Application logs
npm run dev

# Terminal 2: GCP logs
gcloud logging tail "resource.type=cloud_run_revision" \
  --format=json

# Terminal 3: Queue monitoring
watch -n 5 'gcloud tasks queues list --location=us-central1'
```

---

## ✅ Success Criteria

### Functional Requirements
- [ ] All 11 job types execute successfully
- [ ] Tasks appear in Cloud Tasks queues
- [ ] Job handler receives and processes tasks
- [ ] Idempotency prevents duplicates
- [ ] Retry logic works (5xx → retry, 4xx → no retry)
- [ ] OIDC authentication works
- [ ] No TypeScript errors
- [ ] No runtime errors

### Performance Requirements
- [ ] Task creation latency < 100ms
- [ ] Job execution latency < 5 seconds (p95)
- [ ] Idempotency check latency < 50ms

### Monitoring Requirements
- [ ] Logs show task creation
- [ ] Logs show job execution
- [ ] Logs show idempotency checks
- [ ] GCP Console shows tasks in queues
- [ ] Cloud Monitoring shows metrics

---

## 🐛 Troubleshooting

### Issue: Tasks not appearing in queues

**Symptoms**:
- No tasks visible in GCP Console
- No logs in Cloud Run

**Possible Causes**:
1. Feature flag not enabled (`USE_CLOUD_TASKS=false`)
2. GCP credentials not configured
3. Queue names don't match configuration

**Solutions**:
```bash
# 1. Verify feature flag
grep USE_CLOUD_TASKS .env

# 2. Check GCP authentication
gcloud auth list
gcloud config get-value project

# 3. Verify queue names
gcloud tasks queues list --location=us-central1
```

### Issue: OIDC authentication fails

**Symptoms**:
- 401 Unauthorized errors
- "Missing OIDC token" in logs

**Possible Causes**:
1. Service account email incorrect
2. Cloud Run Invoker role not assigned
3. Local development (OIDC not available)

**Solutions**:
```bash
# 1. Verify service account
echo $SERVICE_ACCOUNT_EMAIL

# 2. Check IAM permissions
gcloud projects get-iam-policy catchup-479221 \
  --flatten="bindings[].members" \
  --filter="bindings.role:roles/run.invoker"

# 3. For local testing, temporarily disable OIDC validation
# Edit src/api/jobs-handler.ts:
# Comment out validateOIDCToken middleware
```

### Issue: Idempotency not working

**Symptoms**:
- Duplicate jobs execute
- No "Duplicate request detected" logs

**Possible Causes**:
1. Redis connection failed
2. Idempotency key generation inconsistent
3. TTL expired

**Solutions**:
```bash
# 1. Test Redis connection
curl $UPSTASH_REDIS_REST_URL/ping \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# 2. Check idempotency keys in Redis
# Use Upstash Console or Redis CLI

# 3. Verify TTL is 24 hours (86400 seconds)
# Check src/jobs/idempotency.ts
```

### Issue: Jobs fail with "Unknown job type"

**Symptoms**:
- 400 Bad Request errors
- "Unknown job type: ..." in logs

**Possible Causes**:
1. Job name doesn't match configuration
2. Processor function not found
3. Import path incorrect

**Solutions**:
```bash
# 1. Check job names in cloud-tasks-config.ts
cat src/jobs/cloud-tasks-config.ts | grep "name:"

# 2. Verify processor files exist
ls src/jobs/processors/

# 3. Check import paths in jobs-handler.ts
grep "import.*processor" src/api/jobs-handler.ts
```

### Issue: High latency

**Symptoms**:
- Task creation > 100ms
- Job execution > 5 seconds

**Possible Causes**:
1. Network latency to GCP
2. Cold start (first request)
3. Database connection slow

**Solutions**:
```bash
# 1. Check network latency
ping -c 5 cloudtasks.googleapis.com

# 2. Warm up the system
# Run a few test tasks first

# 3. Check database connection pool
# Verify DATABASE_POOL_MIN and DATABASE_POOL_MAX in .env
```

---

## 🔄 Rollback Plan

If critical issues arise during testing:

### Immediate Rollback

```bash
# 1. Stop the application
# Ctrl+C in Terminal 1

# 2. Disable Cloud Tasks
# Edit .env:
USE_CLOUD_TASKS=false

# 3. Restart application
npm run dev

# 4. Verify BullMQ is working
# Check logs for "Creating BullMQ queue" messages
```

### Verify Rollback

```bash
# Check queue factory logs
# Should see: [Queue Factory] Creating BullMQ queue: ...

# Verify workers are running
# Should see: [Worker ...] Job ... completed

# Test a job
# Should execute via BullMQ, not Cloud Tasks
```

---

## 📊 Testing Checklist

### Pre-Testing
- [ ] All code changes committed
- [ ] TypeScript compilation passes
- [ ] Environment variables configured
- [ ] GCP infrastructure verified
- [ ] Backup plan ready

### During Testing
- [ ] Feature flag enabled
- [ ] Application started successfully
- [ ] Non-critical queue tested first
- [ ] Idempotency verified
- [ ] All 11 job types tested
- [ ] Error handling tested
- [ ] Logs monitored continuously

### Post-Testing
- [ ] All tests passed
- [ ] No errors in logs
- [ ] Performance metrics acceptable
- [ ] GCP Console shows tasks
- [ ] Idempotency working
- [ ] Ready for staging deployment

---

## 📈 Next Steps After Testing

### If Testing Succeeds ✅

1. **Document Results**
   - Create `CLOUD_TASKS_LOCAL_TESTING_RESULTS.md`
   - Include metrics, logs, screenshots
   - Note any issues and resolutions

2. **Prepare for Staging**
   - Update staging environment variables
   - Deploy to staging Cloud Run
   - Run same tests in staging

3. **Plan Production Rollout**
   - Define gradual rollout strategy
   - Set up monitoring and alerts
   - Prepare rollback procedures

### If Testing Fails ❌

1. **Rollback Immediately**
   - Set `USE_CLOUD_TASKS=false`
   - Restart application
   - Verify BullMQ works

2. **Analyze Failures**
   - Review error logs
   - Identify root causes
   - Document issues

3. **Fix and Retest**
   - Implement fixes
   - Run TypeScript checks
   - Repeat testing steps

---

## 🔗 Related Documentation

- **Implementation Summary**: `CLOUD_TASKS_IMPLEMENTATION_COMPLETE.md`
- **Progress Tracking**: `CLOUD_TASKS_PHASE_3_PROGRESS.md`
- **Design Document**: `.kiro/specs/cloud-tasks-migration/design.md`
- **Requirements**: `.kiro/specs/cloud-tasks-migration/requirements.md`
- **Tasks**: `.kiro/specs/cloud-tasks-migration/tasks.md`

---

## 📝 Testing Log Template

Use this template to document your testing:

```markdown
# Cloud Tasks Local Testing Results

**Date**: YYYY-MM-DD
**Tester**: [Your Name]
**Duration**: [Start Time] - [End Time]

## Environment
- Node.js Version: 
- npm Version: 
- OS: 
- GCP Project: catchup-479221
- GCP Region: us-central1

## Test Results

### Non-Critical Queues
- [ ] webhook-health-check: ✅ / ❌
- [ ] notification-reminder: ✅ / ❌
- [ ] token-health-reminder: ✅ / ❌

### Medium-Risk Queues
- [ ] adaptive-sync: ✅ / ❌
- [ ] webhook-renewal: ✅ / ❌
- [ ] suggestion-regeneration: ✅ / ❌
- [ ] batch-notifications: ✅ / ❌
- [ ] suggestion-generation: ✅ / ❌

### Critical Queues
- [ ] token-refresh: ✅ / ❌
- [ ] calendar-sync: ✅ / ❌
- [ ] google-contacts-sync: ✅ / ❌

## Idempotency Test
- [ ] Duplicate detection works: ✅ / ❌
- [ ] Cached results returned: ✅ / ❌

## Error Handling Test
- [ ] 5xx errors retry: ✅ / ❌
- [ ] 4xx errors don't retry: ✅ / ❌

## Performance Metrics
- Task creation latency: ___ ms
- Job execution latency (p95): ___ ms
- Idempotency check latency: ___ ms

## Issues Encountered
1. [Issue description]
   - Cause: [Root cause]
   - Solution: [How it was fixed]

## Conclusion
- Overall Status: ✅ PASS / ❌ FAIL
- Ready for Staging: YES / NO
- Notes: [Additional observations]
```

---

**Status**: 📋 Ready to Begin Testing  
**Confidence**: HIGH - All prerequisites met  
**Risk**: LOW - Feature flag allows instant rollback  
**Estimated Time**: 2-4 hours for complete testing
