# Cost Optimization Deployment Guide

This guide walks through deploying the cost optimization changes to production.

## Pre-Deployment Checklist

- [x] Upstash Redis account created
- [x] Upstash secrets added to GCP Secret Manager:
  - `upstash-redis-host`
  - `upstash-redis-port`
  - `upstash-redis-password`
- [x] Code changes tested locally (TypeScript compiles, tests run)
- [x] `cloudbuild.yaml` updated with Upstash configuration

## Step 1: Deploy to Production with Prod Tag

Deploy using the `prod` tag for production versioning:

```bash
# Check what files have changed
git status

# Add all the optimization changes
git add .

# Commit with a descriptive message
git commit -m "Cost optimization: Upstash Redis migration + Cloud Run scale-to-zero

- Replace Cloud Memorystore with Upstash Redis (TLS support)
- Add scale-to-zero config (min-instances=0, max-instances=10)
- Add HTTP Cache-Control headers (60s for data, 300s for preferences)
- Limit heavy job concurrency to 1 (contacts sync, calendar sync, AI jobs)
- Reduce Cloud Build machine to E2_MEDIUM
- Estimated savings: ~$60-70/month"

# Push to main branch
git push origin main

# Tag as production release
git tag prod
git push origin prod
```

**Note:** The `prod` tag triggers a production build with version format `YYYY.MM.DD.BUILD`

## Step 2: Monitor the Deployment

### Watch Cloud Build

1. Go to: https://console.cloud.google.com/cloud-build/builds
2. You should see a new build starting
3. Click on it to watch the logs in real-time
4. Build will take ~5-6 minutes (slightly longer due to E2_MEDIUM machine)

### Key Things to Watch For

- ✅ Build completes successfully
- ✅ Docker image pushes to Artifact Registry
- ✅ Cloud Run deployment succeeds
- ✅ Health check passes (Step 8)

### Monitor Build Progress

```bash
# Watch the latest build
gcloud builds list --limit=1

# Stream logs for the latest build (get BUILD_ID from above)
gcloud builds log <BUILD_ID> --stream
```

## Step 3: Verify the Deployment

Once the build completes, test that everything works:

```bash
# Get your Cloud Run URL
gcloud run services describe catchup --region=us-central1 --format='value(status.url)'

# Test the health endpoint
curl https://catchup.club/health

# Check if Redis is connecting (look for "Redis connected successfully" in logs)
gcloud run services logs read catchup --region=us-central1 --limit=50
```

### Test in the Browser

1. Go to https://catchup.club
2. Log in with Google SSO
3. Navigate around (contacts, groups, preferences)
4. Check browser DevTools → Network tab → Look for `Cache-Control` headers on API responses
5. Verify everything loads correctly

### Verify Cache-Control Headers

In browser DevTools Network tab, check these endpoints:
- `GET /api/contacts` → Should have `Cache-Control: private, max-age=60`
- `GET /api/groups-tags/groups` → Should have `Cache-Control: private, max-age=60`
- `GET /api/groups-tags/tags` → Should have `Cache-Control: private, max-age=60`
- `GET /api/preferences/*` → Should have `Cache-Control: private, max-age=300`

## Step 4: Monitor for Issues (Wait 15-30 minutes)

Watch for any errors:

```bash
# Stream logs in real-time
gcloud run services logs tail catchup --region=us-central1

# Check for Redis connection errors
gcloud run services logs read catchup --region=us-central1 --limit=100 | grep -i redis

# Check for job queue errors
gcloud run services logs read catchup --region=us-central1 --limit=100 | grep -i "queue error"

# Check for any errors
gcloud run services logs read catchup --region=us-central1 --limit=100 | grep -i error
```

### What to Look For

- ✅ "Redis connected successfully" messages
- ✅ No "Redis connection error" messages
- ✅ Jobs processing correctly
- ✅ No increase in error rates
- ✅ Response times are normal

### Test Job Queues

Verify all 11 job queues are working:
1. Trigger a contact sync (if you have Google Contacts connected)
2. Check logs for job processing messages
3. Verify no job failures related to Redis

## Step 5: Delete Cloud Memorystore (After Confirming Everything Works)

**⚠️ IMPORTANT: Only do this after confirming the app works perfectly with Upstash for at least 30 minutes!**

### Via GCP Console

1. Go to Cloud Memorystore: https://console.cloud.google.com/memorystore/redis/instances
2. Find your Redis instance (probably named something like `catchup-redis`)
3. Click the checkbox next to it
4. Click **"DELETE"** at the top
5. Confirm deletion

### Via gcloud CLI

```bash
# List Redis instances
gcloud redis instances list --region=us-central1

# Delete the instance (replace INSTANCE_NAME)
gcloud redis instances delete INSTANCE_NAME --region=us-central1
```

**Expected savings:** ~$60.70/month immediately

## Step 6: Verify Scale-to-Zero Works

After 15-30 minutes of no traffic:

1. Go to: https://console.cloud.google.com/run/detail/us-central1/catchup/metrics
2. Look at the "Container instance count" graph
3. It should drop to 0 when idle
4. Visit the site again and watch it scale back up (cold start ~10-15 seconds)

### Test Cold Start

```bash
# Wait for scale-to-zero (15-30 min of no traffic)
# Then test cold start
time curl https://catchup.club/health

# Should take ~10-15 seconds on first request
# Subsequent requests should be fast (<1 second)
```

## Step 7: Set Up Cost Monitoring

### Create Budget Alerts

1. Go to: https://console.cloud.google.com/billing/budgets
2. Click **"CREATE BUDGET"**
3. Set up two alerts:

**Alert 1: Warning at $60/month**
- Name: "CatchUp Cost Warning"
- Budget amount: $60
- Alert threshold: 100%

**Alert 2: Critical at $80/month**
- Name: "CatchUp Cost Critical"
- Budget amount: $80
- Alert threshold: 100%

### Monitor Costs

```bash
# Check current month costs
gcloud billing accounts list
gcloud billing projects describe PROJECT_ID
```

Or view in console: https://console.cloud.google.com/billing

## Rollback Plan (If Something Goes Wrong)

### Quick Rollback: Revert to Cloud Memorystore

If you see errors after deployment:

```bash
# Update Cloud Run to use old Cloud Memorystore IP
gcloud run services update catchup \
  --region=us-central1 \
  --set-env-vars=REDIS_HOST=10.56.216.227,REDIS_PORT=6379,REDIS_TLS=false \
  --clear-secrets=REDIS_HOST,REDIS_PORT,REDIS_PASSWORD
```

### Full Rollback: Revert Git Commit

```bash
# Revert the commit
git revert HEAD

# Push to trigger redeployment
git push origin main

# Update prod tag
git tag -d prod
git push origin :refs/tags/prod
git tag prod
git push origin prod
```

### Rollback Checklist

If rolling back:
1. Update Cloud Run environment variables (see above)
2. Verify app works with Cloud Memorystore
3. Keep Upstash secrets (no cost if not used)
4. Investigate the issue before trying again

## Success Criteria

After 24 hours, verify:

- [ ] Monthly GCP costs reduced to ~$40-50/month (check billing)
- [ ] All 11 job queues functioning correctly with Upstash
- [ ] No increase in error rates (check logs)
- [ ] Cold start times under 15 seconds (test manually)
- [ ] HTTP caching headers present on read endpoints (check DevTools)
- [ ] Job memory usage stable (no OOM errors in logs)
- [ ] Application scales to 0 when idle (check metrics)
- [ ] Cloud Memorystore deleted (check console)

## Post-Deployment Monitoring

### Week 1: Daily Checks

```bash
# Check error rates
gcloud run services logs read catchup --region=us-central1 --limit=500 | grep -i error | wc -l

# Check Redis connection health
gcloud run services logs read catchup --region=us-central1 --limit=100 | grep "Redis connected"

# Check instance count (should scale to 0 when idle)
gcloud run services describe catchup --region=us-central1 --format='value(status.conditions[0].message)'
```

### Week 2: Cost Verification

1. Go to: https://console.cloud.google.com/billing
2. Compare costs to previous month
3. Expected reduction: ~$60-70/month
4. Document actual savings in tasks.md

## Troubleshooting

### Issue: Redis Connection Errors

**Symptoms:** Logs show "Redis connection error"

**Solution:**
```bash
# Verify Upstash credentials
gcloud secrets versions access latest --secret=upstash-redis-host
gcloud secrets versions access latest --secret=upstash-redis-port
gcloud secrets versions access latest --secret=upstash-redis-password

# Test connection manually
redis-cli -h <host> -p <port> -a <password> --tls ping
```

### Issue: Jobs Not Processing

**Symptoms:** Job queues stuck, no job completion logs

**Solution:**
```bash
# Check Redis connection in logs
gcloud run services logs read catchup --region=us-central1 --limit=200 | grep -i "queue"

# Restart Cloud Run service
gcloud run services update catchup --region=us-central1 --no-traffic
gcloud run services update catchup --region=us-central1 --to-latest
```

### Issue: High Cold Start Times

**Symptoms:** First request takes >20 seconds

**Solution:**
```bash
# Set min-instances to 1 (adds ~$5/month)
gcloud run services update catchup \
  --region=us-central1 \
  --min-instances=1
```

### Issue: Out of Memory Errors

**Symptoms:** Logs show "OOM" or container crashes

**Solution:**
```bash
# Increase memory to 1Gi (adds ~$8/month)
gcloud run services update catchup \
  --region=us-central1 \
  --memory=1Gi
```

## Related Documentation

- **Cost Optimization Guide:** `docs/deployment/COST_OPTIMIZATION.md`
- **Task List:** `.kiro/specs/cloud-cost-optimization/tasks.md`
- **Design Document:** `.kiro/specs/cloud-cost-optimization/design.md`
- **Requirements:** `.kiro/specs/cloud-cost-optimization/requirements.md`

## Deployment Completed

Date: _______________
Deployed by: _______________
Build ID: _______________
Production Version: _______________

**Verification Checklist:**
- [ ] Deployment successful
- [ ] Health check passing
- [ ] Redis connected
- [ ] Jobs processing
- [ ] Cache headers present
- [ ] Scale-to-zero working
- [ ] Cloud Memorystore deleted
- [ ] Cost monitoring set up

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________
