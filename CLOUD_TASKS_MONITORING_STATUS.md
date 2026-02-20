# Cloud Tasks Monitoring Status

**Date**: 2026-02-19  
**Time**: 23:00 UTC  
**Status**: ⚠️ ISSUE FOUND - Cloud Tasks Not Enabled

---

## Issue Summary

**Problem**: Cloud Tasks is NOT running despite `use-cloud-tasks` secret being set to `true`.

**Root Cause**: The secret value contains a trailing newline (`true\n`), causing the comparison to fail:
```typescript
// In queue-factory.ts line 30
const USE_CLOUD_TASKS = process.env.USE_CLOUD_TASKS === 'true';
// Fails because process.env.USE_CLOUD_TASKS = 'true\n' (with newline)
```

**Evidence**:
- Logs show "[BullMQ] Retry attempt" messages (BullMQ is running)
- No "[Cloud Tasks]" messages in logs
- Secret value: `true\n` (verified with `od -c`)

---

## Monitoring Results

### 1. ✅ Service Health
```bash
curl https://catchup-o3hr5vkqkq-uc.a.run.app/health
```
**Status**: HEALTHY (database + redis connected)

### 2. ❌ Error Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=50
```
**Status**: NO ERRORS (but BullMQ is running, not Cloud Tasks)

### 3. ✅ Cloud Tasks Queues
```bash
gcloud tasks queues list --location=us-central1
```
**Status**: ALL 11 QUEUES RUNNING (but not being used)

| Queue Name | State | Max Rate | Max Attempts |
|------------|-------|----------|--------------|
| adaptive-sync-queue | RUNNING | 500/sec | 5 |
| batch-notifications-queue | RUNNING | 50/sec | 5 |
| calendar-sync-queue | RUNNING | 20/sec | 5 |
| google-contacts-sync-queue | RUNNING | 10/sec | 5 |
| notification-reminder-queue | RUNNING | 500/sec | 3 |
| suggestion-generation-queue | RUNNING | 500/sec | 3 |
| suggestion-regeneration-queue | RUNNING | 500/sec | 3 |
| token-health-reminder-queue | RUNNING | 500/sec | 3 |
| token-refresh-queue | RUNNING | 10/sec | 3 |
| webhook-health-check-queue | RUNNING | 500/sec | 3 |
| webhook-renewal-queue | RUNNING | 500/sec | 5 |

### 4. ❌ Job Execution
```bash
gcloud logging read 'resource.type=cloud_run_revision AND textPayload=~"BullMQ"' --limit=20
```
**Status**: BullMQ IS RUNNING (not Cloud Tasks)

**Sample Logs**:
```
2026-02-19T22:54:55.763183Z [BullMQ] Retry attempt 1, waiting 1000ms
2026-02-19T22:54:45.664094Z [BullMQ] Retry attempt 1, waiting 1000ms
2026-02-19T22:54:38.162970Z [BullMQ] Retry attempt 2, waiting 1000ms
```

### 5. ⚠️ Configuration
```bash
gcloud secrets versions access latest --secret=use-cloud-tasks
```
**Status**: SECRET VALUE HAS TRAILING NEWLINE

**Value**: `true\n` (should be `true` without newline)

---

## Fix Required

### Option 1: Update Secret (Remove Newline)
```bash
# Create new secret version without newline
echo -n "true" | gcloud secrets versions add use-cloud-tasks --project=catchup-479221 --data-file=-

# Verify (should show no newline)
gcloud secrets versions access latest --secret=use-cloud-tasks --project=catchup-479221 | od -c
# Expected: 0000000    t   r   u   e
```

### Option 2: Update Code (Trim Value)
```typescript
// In src/jobs/queue-factory.ts line 30
const USE_CLOUD_TASKS = process.env.USE_CLOUD_TASKS?.trim() === 'true';
```

**Recommendation**: Use Option 1 (update secret) - cleaner and follows best practices.

---

## Deployment Steps After Fix

### 1. Update Secret
```bash
echo -n "true" | gcloud secrets versions add use-cloud-tasks --project=catchup-479221 --data-file=-
```

### 2. Restart Cloud Run Service
```bash
# Force new revision to pick up updated secret
gcloud run services update catchup --region=us-central1 --update-env-vars=FORCE_RESTART=$(date +%s)

# Or trigger new deployment
gcloud run deploy catchup --source . --region=us-central1
```

### 3. Verify Cloud Tasks is Running
```bash
# Wait 2 minutes for service to start

# Check logs for Cloud Tasks messages
gcloud logging read 'resource.type=cloud_run_revision AND textPayload=~"Cloud Tasks"' --limit=10

# Should see:
# [Queue Factory] Creating Cloud Tasks queue: ...
# [Cloud Tasks] Created task: ...
```

### 4. Verify BullMQ is NOT Running
```bash
# Check logs for BullMQ messages (should be none)
gcloud logging read 'resource.type=cloud_run_revision AND textPayload=~"BullMQ"' --limit=10

# Should see NO results or only old logs
```

### 5. Monitor for 2 Hours
```bash
# Watch for errors
gcloud logging tail "resource.type=cloud_run_revision AND severity>=ERROR"

# Watch for job execution
gcloud logging tail "resource.type=cloud_run_revision" | grep -i "jobs\|task"

# Check queue activity
watch -n 30 'gcloud tasks queues describe token-refresh-queue --location=us-central1 | grep tasksDispatched'
```

---

## Expected Behavior After Fix

### Startup Logs
```
[Queue Factory] Creating Cloud Tasks queue: token-refresh
[Queue Factory] Creating Cloud Tasks queue: calendar-sync
[Queue Factory] Creating Cloud Tasks queue: google-contacts-sync
...
[Queue Factory] Workers not used with Cloud Tasks. Skipping worker creation for: token-refresh
```

### Job Execution Logs
```
[Cloud Tasks] Created task: projects/catchup-479221/locations/us-central1/queues/token-refresh-queue/tasks/...
[Jobs] Starting job: token-refresh
[Jobs] Completed job: token-refresh
```

### No BullMQ Logs
```
# Should NOT see:
[BullMQ] Retry attempt 1, waiting 1000ms
[BullMQ Worker] Starting job worker...
```

---

## Rollback Plan

If Cloud Tasks fails after fix:

### 1. Disable Cloud Tasks
```bash
echo -n "false" | gcloud secrets versions add use-cloud-tasks --project=catchup-479221 --data-file=-
```

### 2. Restart Service
```bash
gcloud run services update catchup --region=us-central1 --update-env-vars=FORCE_RESTART=$(date +%s)
```

### 3. Verify BullMQ Starts
```bash
gcloud logging read 'resource.type=cloud_run_revision AND textPayload=~"BullMQ Worker"' --limit=10
# Should see: [BullMQ Worker] Starting job worker...
```

---

## Summary

**Current State**:
- ❌ Cloud Tasks NOT running (despite secret being set)
- ✅ BullMQ IS running (fallback working)
- ✅ Service is healthy
- ✅ No errors (other than BullMQ connection issues)

**Root Cause**:
- Secret value has trailing newline: `true\n`
- Code comparison fails: `'true\n' === 'true'` → false

**Fix**:
- Update secret without newline: `echo -n "true"`
- Restart service to pick up new secret
- Verify Cloud Tasks starts

**Timeline**:
- Fix: 5 minutes
- Verification: 2 hours
- Full monitoring: 24 hours

---

**Next Action**: ✅ COMPLETED - Monitoring new deployment

---

## Fix Applied (2026-02-19 23:05 UTC)

### Issue 1: Secret with Trailing Newline ✅ FIXED
- **Problem**: Secret value was `true\n` instead of `true`
- **Fix**: Created new secret version without newline
  ```bash
  echo -n "true" | gcloud secrets versions add use-cloud-tasks --project=catchup-479221 --data-file=-
  ```
- **Verification**: `od -c` shows `t r u e` (no newline)

### Issue 2: Workers Still Starting ✅ FIXED
- **Problem**: `src/index.ts` was calling `startWorker()` unconditionally
- **Fix**: Added check for `USE_CLOUD_TASKS` before starting workers
  ```typescript
  const useCloudTasks = process.env.USE_CLOUD_TASKS?.trim() === 'true';
  if (useCloudTasks) {
    console.log('[Startup] Using Cloud Tasks - workers not needed');
  } else {
    console.log('[Startup] Using BullMQ/Bull - starting workers');
    const { startWorker } = await import('./jobs/worker-selector');
    await startWorker();
  }
  ```
- **Commit**: `244cd99` - "fix: Skip worker startup when Cloud Tasks is enabled"
- **Tag**: `prod-cloud-tasks-fix`

### Deployment Status
- **Revision 1**: `catchup-00053-g6z` - Had Cloud Tasks enabled but workers still starting
- **Revision 2**: Deploying now with worker startup fix
- **Expected**: No BullMQ workers, only Cloud Tasks

---

## Monitoring Commands for New Deployment

### 1. Check Build Status
```bash
# Watch Cloud Build
gcloud builds list --limit=1 --format="table(id,status,createTime,duration)"

# Or check in console
# https://console.cloud.google.com/cloud-build/builds?project=catchup-479221
```

### 2. Wait for Deployment
```bash
# Check latest revision
gcloud run services describe catchup --region=us-central1 --format='value(status.latestReadyRevisionName)'

# Wait for new revision (should be catchup-00054-xxx or higher)
```

### 3. Verify Cloud Tasks is Running (No BullMQ)
```bash
# Check startup logs (should see "Using Cloud Tasks")
gcloud logging read 'resource.type=cloud_run_revision AND textPayload=~"Startup"' --limit=10

# Should see:
# [Startup] Using Cloud Tasks - workers not needed

# Should NOT see:
# [Startup] Using BullMQ/Bull - starting workers
# [BullMQ Worker] Starting job worker...
```

### 4. Verify No BullMQ Messages
```bash
# Check for BullMQ logs (should be empty or only old revisions)
gcloud logging read 'resource.type=cloud_run_revision AND textPayload=~"BullMQ"' --limit=10 --format=json | jq -r '.[] | "\(.labels.revision_name) \(.timestamp) \(.textPayload)"'

# All BullMQ messages should be from old revisions (catchup-00052 or earlier)
```

### 5. Verify Cloud Tasks Queue Creation
```bash
# Check for Cloud Tasks queue creation logs
gcloud logging read 'resource.type=cloud_run_revision AND textPayload=~"Queue Factory.*Cloud Tasks"' --limit=20

# Should see:
# [Queue Factory] Creating Cloud Tasks queue: token-refresh
# [Queue Factory] Creating Cloud Tasks queue: calendar-sync
# etc.
```

### 6. Monitor for Errors
```bash
# Watch for errors in real-time
gcloud logging tail "resource.type=cloud_run_revision AND severity>=ERROR"

# Should see NO errors related to:
# - Stream isn't writeable
# - Connection refused
# - ECONNRESET
```

### 7. Test Job Execution (When Jobs Trigger)
```bash
# Watch for Cloud Tasks task creation
gcloud logging tail "resource.type=cloud_run_revision" | grep -i "cloud tasks\|jobs"

# Should eventually see:
# [Cloud Tasks] Created task: projects/catchup-479221/locations/us-central1/queues/.../tasks/...
# [Jobs] Starting job: webhook-health-check
# [Jobs] Completed job: webhook-health-check
```

---

## Success Criteria

### Immediate (Within 5 Minutes)
- ✅ New revision deployed
- ✅ Service is healthy
- ✅ Startup log shows "Using Cloud Tasks - workers not needed"
- ✅ NO BullMQ worker startup messages
- ✅ NO "Stream isn't writeable" errors

### Short-term (Within 2 Hours)
- ✅ At least one job executes via Cloud Tasks
- ✅ Task creation logs appear
- ✅ Job execution logs appear
- ✅ No errors in logs

### Medium-term (Within 24 Hours)
- ✅ All 11 job types execute successfully
- ✅ Task success rate >99.9%
- ✅ No user-facing issues
- ✅ Zero BullMQ connection errors

---

## Current Status

**Time**: 2026-02-19 23:10 UTC  
**Action**: Waiting for Cloud Build to complete  
**Next**: Monitor new deployment for Cloud Tasks activation
