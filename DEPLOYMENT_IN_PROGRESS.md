# Cloud Tasks Deployment - In Progress

**Date**: 2026-02-19  
**Build ID**: 72426f1a-8c60-4867-87b4-ea948e3da035  
**Region**: northamerica-northeast2  
**Status**: WORKING (In Progress)

---

## What's Happening

The Cloud Build pipeline is currently deploying the Cloud Tasks migration to production:

1. ✅ Code committed and pushed to GitHub
2. ✅ Production tag (`prod`) pushed to trigger deployment
3. ✅ GCP Secret Manager updated with Cloud Tasks secrets
4. ✅ cloudbuild.yaml updated to include new secrets
5. 🔄 Cloud Build running (installing, building, deploying)

**Build Console**: https://console.cloud.google.com/cloud-build/builds;region=northamerica-northeast2/72426f1a-8c60-4867-87b4-ea948e3da035?project=catchup-479221

---

## Secrets Created

The following secrets were added to GCP Secret Manager:

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `use-cloud-tasks` | `false` | Feature flag (disabled by default) |
| `gcp-project-id` | `catchup-479221` | GCP project ID |
| `gcp-region` | `us-central1` | Cloud Tasks region |
| `cloud-run-url` | `http://localhost:3000` | Placeholder (update after deployment) |
| `service-account-email` | `402592213346-compute@developer.gserviceaccount.com` | Service account for OIDC |

---

## Post-Deployment Steps

### Step 1: Wait for Build to Complete

Monitor the build:
```bash
# Check build status
gcloud builds describe 72426f1a-8c60-4867-87b4-ea948e3da035 \
  --region=northamerica-northeast2 \
  --project=catchup-479221 \
  --format="value(status)"

# Watch build logs
gcloud builds log 72426f1a-8c60-4867-87b4-ea948e3da035 \
  --region=northamerica-northeast2 \
  --project=catchup-479221 \
  --stream
```

### Step 2: Run Post-Deployment Script

Once the build completes successfully, run:
```bash
./scripts/post-deployment-cloud-tasks.sh
```

This script will:
- Get the Cloud Run service URL
- Update the `cloud-run-url` secret
- Verify the health endpoint
- Test the job handler endpoint
- Display next steps

### Step 3: Verify Deployment

Check that the service is running:
```bash
# Get service URL
CLOUD_RUN_URL=$(gcloud run services describe catchup \
  --region=us-central1 \
  --format='value(status.url)')

echo "Service URL: $CLOUD_RUN_URL"

# Test health endpoint
curl $CLOUD_RUN_URL/health

# Test job handler (should return 401 without OIDC token)
curl -X POST $CLOUD_RUN_URL/api/jobs/webhook-health-check \
  -H "Content-Type: application/json" \
  -d '{"data":{"test":true},"idempotencyKey":"test123","jobName":"webhook-health-check"}'
```

### Step 4: Monitor Logs

Watch for any errors:
```bash
# Watch logs in real-time
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=catchup"

# Check for errors
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=50

# Check for BullMQ activity (should still be active since USE_CLOUD_TASKS=false)
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message=~'BullMQ'" --limit=20
```

### Step 5: Enable Cloud Tasks (When Ready)

After verifying the deployment is stable, enable Cloud Tasks:

```bash
# Enable Cloud Tasks
echo "true" | gcloud secrets versions add use-cloud-tasks \
  --project=catchup-479221 \
  --data-file=-

# Verify the secret was updated
gcloud secrets versions access latest --secret=use-cloud-tasks --project=catchup-479221

# The change will take effect on the next Cloud Run instance restart
# You can force a restart by redeploying or waiting for auto-scaling
```

### Step 6: Monitor Cloud Tasks

Once enabled, monitor Cloud Tasks activity:

```bash
# List queues
gcloud tasks queues list --location=us-central1

# Check tasks in a specific queue
gcloud tasks list --queue=webhook-health-check-queue --location=us-central1

# Watch for job execution logs
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message=~'\\[Jobs\\]'" --limit=50

# Check for Cloud Tasks errors
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message=~'\\[Cloud Tasks\\]'" --limit=50
```

---

## Current Configuration

### Feature Flag Status
- **USE_CLOUD_TASKS**: `false` (BullMQ still active)
- **Reason**: Safe deployment - verify everything works before switching

### Cloud Tasks Queues
All 11 queues are created and ready:
1. token-refresh-queue
2. calendar-sync-queue
3. google-contacts-sync-queue
4. adaptive-sync-queue
5. webhook-renewal-queue
6. suggestion-regeneration-queue
7. batch-notifications-queue
8. suggestion-generation-queue
9. webhook-health-check-queue
10. notification-reminder-queue
11. token-health-reminder-queue

### Expected Behavior
- BullMQ workers should start normally
- No Cloud Tasks activity yet (feature disabled)
- All existing functionality should work as before

---

## Rollback Plan

If issues arise after enabling Cloud Tasks:

```bash
# Disable Cloud Tasks (revert to BullMQ)
echo "false" | gcloud secrets versions add use-cloud-tasks \
  --project=catchup-479221 \
  --data-file=-

# Verify BullMQ workers restart
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message=~'BullMQ'" --limit=20

# Check for "Stream isn't writeable" errors
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message=~'Stream isn'" --limit=20
```

---

## Success Criteria

### Deployment Success
- ✅ Build completes without errors
- ✅ Cloud Run service is running
- ✅ Health endpoint returns 200
- ✅ Job handler endpoint returns 401 (OIDC required)
- ✅ BullMQ workers start successfully
- ✅ No errors in logs

### Cloud Tasks Enablement Success (After Step 5)
- ✅ Zero "Stream isn't writeable" errors
- ✅ Job execution success rate >99.9%
- ✅ All 11 queues operational
- ✅ Tasks being created and executed
- ✅ No user-facing issues

---

## Timeline

- **Now**: Build in progress (~10-15 minutes)
- **+15 min**: Run post-deployment script
- **+30 min**: Verify deployment stable
- **+2 hours**: Enable Cloud Tasks (if stable)
- **+24 hours**: Monitor medium-risk queues
- **+48 hours**: Monitor critical queues
- **+7 days**: Remove BullMQ code (Phase 3.2)

---

## Documentation

- **Deployment Checklist**: `CLOUD_TASKS_DEPLOYMENT_CHECKLIST.md`
- **Implementation Summary**: `CLOUD_TASKS_IMPLEMENTATION_COMPLETE.md`
- **Ready for Deployment**: `READY_FOR_DEPLOYMENT.md`
- **Deployment Summary**: `DEPLOYMENT_SUMMARY.md`
- **Post-Deployment Script**: `scripts/post-deployment-cloud-tasks.sh`

---

## Contact Information

**GCP Project**: catchup-479221  
**Cloud Run Service**: catchup  
**Region**: us-central1  
**Build Region**: northamerica-northeast2

**Support Resources**:
- Cloud Build Console: https://console.cloud.google.com/cloud-build
- Cloud Run Console: https://console.cloud.google.com/run
- Cloud Tasks Console: https://console.cloud.google.com/cloudtasks
- Secret Manager Console: https://console.cloud.google.com/security/secret-manager

---

**Status**: 🔄 Build In Progress  
**Next Step**: Wait for build to complete, then run `./scripts/post-deployment-cloud-tasks.sh`  
**ETA**: ~10-15 minutes
