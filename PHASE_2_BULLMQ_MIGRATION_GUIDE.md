# Phase 2: BullMQ Migration - Complete Guide

**Status**: Implementation Complete ✅ | Ready for Testing  
**Date**: February 10, 2026

---

## Overview

Phase 2 migrates all 11 job queues from Bull to BullMQ, reducing Redis connections from 33 to 1-3 (90% reduction) through connection pooling.

### What's Been Created

✅ **BullMQ Infrastructure**
- `src/jobs/bullmq-connection.ts` - Shared connection configuration
- `src/jobs/queue-factory.ts` - Factory for creating queues/workers
- `src/jobs/bullmq-queue.ts` - BullMQ queue definitions (replaces queue.ts)
- `src/jobs/bullmq-worker.ts` - BullMQ worker implementation (replaces worker.ts)
- `src/jobs/worker-selector.ts` - Switch between Bull/BullMQ via env var

✅ **Application Integration**
- `src/index.ts` - Updated to use worker-selector for graceful Bull/BullMQ switching
- `.env` - Added USE_BULLMQ configuration variable

✅ **All 11 Queues Migrated**
1. webhook-health-check (non-critical)
2. notification-reminder (non-critical)
3. token-health-reminder (non-critical)
4. adaptive-sync (medium-risk)
5. webhook-renewal (medium-risk)
6. suggestion-regeneration (medium-risk)
7. batch-notifications (medium-risk)
8. suggestion-generation (medium-risk)
9. token-refresh (CRITICAL)
10. calendar-sync (CRITICAL)
11. google-contacts-sync (CRITICAL)

---

## Testing Locally

### Step 1: Build the Project

```bash
npm run build
```

### Step 2: Enable BullMQ

Add to your `.env` file:

```bash
# Enable BullMQ (Phase 2)
USE_BULLMQ=true
```

### Step 3: Start the Application

```bash
npm run dev
```

### Step 4: Verify BullMQ is Running

Check the logs for:

```
[Worker Selector] Using BullMQ worker (Phase 2)
[BullMQ] Connection configuration: { host: '...', port: 6379, ... }
[Queue Factory] Creating queue: webhook-health-check
[Queue Factory] Creating worker: webhook-health-check
... (repeat for all 11 queues)
[BullMQ Worker] All workers started successfully
[BullMQ Worker] Using shared connection pool (1-3 connections total)
```

### Step 5: Test Queue Operations

#### Test 1: Enqueue a Job

```typescript
// In Node REPL or test script
const { enqueueJob, QUEUE_NAMES } = require('./dist/jobs/bullmq-queue');

// Test webhook health check (lowest risk)
await enqueueJob(QUEUE_NAMES.WEBHOOK_HEALTH_CHECK, {
  test: true,
  timestamp: new Date().toISOString()
});
```

#### Test 2: Verify Job Processing

Check logs for:
```
[BullMQ] Processing webhook health check job <job-id>
[Worker webhook-health-check] Job <job-id> completed
```

#### Test 3: Test All Queues

```bash
# Run the test script
node -e "
const { enqueueJob, QUEUE_NAMES } = require('./dist/jobs/bullmq-queue');

async function testAllQueues() {
  console.log('Testing all BullMQ queues...\n');
  
  for (const [name, queueName] of Object.entries(QUEUE_NAMES)) {
    try {
      console.log(\`Testing \${queueName}...\`);
      const job = await enqueueJob(queueName, {
        test: true,
        timestamp: new Date().toISOString()
      });
      console.log(\`  ✅ Job \${job.id} enqueued to \${queueName}\`);
    } catch (error) {
      console.error(\`  ❌ Failed to enqueue to \${queueName}:\`, error.message);
    }
  }
  
  console.log('\nAll queues tested. Check logs for job processing.');
  process.exit(0);
}

testAllQueues();
"
```

### Step 6: Monitor Redis Connections

Check Upstash dashboard:
- **Before**: 33 connections (Bull)
- **After**: 1-3 connections (BullMQ)
- **Reduction**: 90%+

---

## Rollback to Bull (If Needed)

If you encounter issues, you can instantly rollback:

### Option 1: Environment Variable

```bash
# In .env file, change:
USE_BULLMQ=false

# Or remove the line entirely (defaults to Bull)
```

Restart the application - it will use Bull again.

### Option 2: Code Rollback

If you need to completely remove BullMQ:

```bash
# The old Bull code is still in place:
# - src/jobs/queue.ts (Bull queues)
# - src/jobs/worker.ts (Bull workers)

# Just set USE_BULLMQ=false or remove it
```

---

## Deployment to Production

### Pre-Deployment Checklist

- [ ] All local tests passed
- [ ] Verified connection count drops to 1-3
- [ ] Tested all 11 queues locally
- [ ] Reviewed job processing logs
- [ ] Phase 1 (HTTP Redis) deployed and stable

### Step 1: Update Environment Variables

Add to production environment (Cloud Run):

```bash
# Add to cloudbuild.yaml or set via gcloud
USE_BULLMQ=true
```

### Step 2: Deploy

```bash
# Commit changes
git add .
git commit -m "feat: Phase 2 BullMQ migration - reduce connections to 1-3"

# Tag for production
git tag -f prod
git push origin main
git push -f origin prod
```

### Step 3: Monitor Deployment

#### Immediate Checks (First 5 Minutes)

1. **Verify Deployment Success**
   ```bash
   gcloud run services describe catchup --region=us-central1
   ```

2. **Check Application Logs**
   ```bash
   gcloud run services logs read catchup --region=us-central1 --limit=100 | grep "BullMQ"
   
   # Expected:
   # [Worker Selector] Using BullMQ worker (Phase 2)
   # [BullMQ Worker] All workers started successfully
   # [BullMQ Worker] Using shared connection pool (1-3 connections total)
   ```

3. **Check for Errors**
   ```bash
   gcloud run services logs read catchup --region=us-central1 --limit=100 | grep -i "error"
   ```

#### Upstash Dashboard Monitoring

Go to https://console.upstash.com:

1. **Connection Count** (should drop dramatically)
   - Before: 33-36 connections
   - After: 1-3 connections
   - **Target**: 93-97% reduction

2. **Command Usage** (should drop further)
   - Before: ~70K commands/day (after Phase 1)
   - After: ~40K commands/day
   - **Target**: 60-80% total reduction from original 105K

3. **Error Rate** (should be 0%)
   - No connection errors
   - No job processing errors

#### Queue Health Monitoring

1. **Verify All Queues Processing**
   ```bash
   # Check logs for job processing
   gcloud run services logs read catchup --region=us-central1 --limit=200 | grep "Processing.*job"
   ```

2. **Check Job Success Rates**
   - Monitor for "completed" vs "failed" messages
   - Target: >95% success rate

3. **Monitor Critical Queues**
   - token-refresh: Should process without errors
   - calendar-sync: User-facing, monitor closely
   - google-contacts-sync: User-facing, monitor closely

### Step 4: Extended Monitoring (24 Hours)

Monitor these metrics:

- [ ] Hour 1: Verify connection count stable at 1-3
- [ ] Hour 4: Check command usage trending down
- [ ] Hour 8: Verify all queues processing jobs
- [ ] Hour 12: Check job success rates >95%
- [ ] Hour 24: Final verification before Phase 3

---

## Comparison: Bull vs BullMQ

### API Differences

| Feature | Bull | BullMQ |
|---------|------|--------|
| Queue Creation | `new Bull('name', options)` | `new Queue('name', options)` |
| Worker Creation | `queue.process(fn)` | `new Worker('name', fn)` |
| Event Handlers | On Queue | On Worker |
| Job Adding | `queue.add(data)` | `queue.add('jobName', data)` |
| Connections | 3 per queue | Shared pool (1-3 total) |
| TypeScript | Basic | Full support |

### Connection Reduction

```
Bull Architecture:
├── Queue 1: 3 connections (client, subscriber, bclient)
├── Queue 2: 3 connections
├── ... (11 queues)
└── Queue 11: 3 connections
Total: 33 connections

BullMQ Architecture:
├── Shared Connection Pool: 1-3 connections
├── Queue 1: Uses shared pool
├── Queue 2: Uses shared pool
├── ... (11 queues)
└── Queue 11: Uses shared pool
Total: 1-3 connections (90% reduction!)
```

---

## Troubleshooting

### Issue: Jobs Not Processing

**Symptoms**: Jobs enqueued but not processed

**Solution**:
1. Check worker is started: Look for "[BullMQ Worker] All workers started"
2. Check Redis connection: Verify REDIS_URL is correct
3. Check logs for errors: `grep -i "error" logs`

### Issue: High Connection Count

**Symptoms**: Upstash shows >5 connections

**Solution**:
1. Verify USE_BULLMQ=true is set
2. Check only one instance is running
3. Restart application to reset connections

### Issue: Job Failures

**Symptoms**: Jobs failing with errors

**Solution**:
1. Check processor logic hasn't changed
2. Verify job data format is correct
3. Check Redis connectivity
4. Review error logs for specific issues

### Issue: Performance Degradation

**Symptoms**: Slower job processing

**Solution**:
1. Check Redis latency in Upstash dashboard
2. Verify concurrency settings (default: 1)
3. Monitor queue depth (should be <100)
4. Check for network issues

---

## Success Criteria

Phase 2 is successful if:

- ✅ All 11 queues operational with BullMQ
- ✅ Connections reduced to 1-3 (from 33-36)
- ✅ Command usage < 200K/month
- ✅ Zero connection errors for 24 hours
- ✅ Job success rate >95%
- ✅ No user-facing issues
- ✅ All critical queues processing correctly

---

## Next Steps After Phase 2

Once Phase 2 is stable for 24 hours:

1. **Proceed to Phase 3**: Cleanup and optimization
   - Remove Bull package
   - Clean up old code
   - Set up monitoring and alerts

2. **Monitor Long-Term**:
   - Track command usage trends
   - Optimize cache TTLs
   - Fine-tune queue settings

3. **Document Results**:
   - Final connection count
   - Final command usage
   - Performance impact
   - Lessons learned

---

## Files Reference

### New Files (BullMQ)
- `src/jobs/bullmq-connection.ts` - Connection config
- `src/jobs/bullmq-queue.ts` - Queue definitions
- `src/jobs/bullmq-worker.ts` - Worker implementation
- `src/jobs/queue-factory.ts` - Factory pattern
- `src/jobs/worker-selector.ts` - Bull/BullMQ switcher

### Old Files (Bull - Keep for Rollback)
- `src/jobs/queue.ts` - Bull queues
- `src/jobs/worker.ts` - Bull workers

### Configuration
- `.env` - Add `USE_BULLMQ=true`
- `cloudbuild.yaml` - Add USE_BULLMQ env var for production

---

**Status**: Ready for Testing and Deployment! 🚀

