# Cloud Tasks Deployment - Quick Reference

## Current Status
🔄 **Build In Progress**  
Build ID: `72426f1a-8c60-4867-87b4-ea948e3da035`  
Console: https://console.cloud.google.com/cloud-build/builds;region=northamerica-northeast2/72426f1a-8c60-4867-87b4-ea948e3da035?project=catchup-479221

---

## Quick Commands

### Check Build Status
```bash
gcloud builds describe 72426f1a-8c60-4867-87b4-ea948e3da035 \
  --region=northamerica-northeast2 \
  --project=catchup-479221 \
  --format="value(status)"
```

### After Build Completes
```bash
# Run post-deployment script
./scripts/post-deployment-cloud-tasks.sh
```

### Enable Cloud Tasks (When Ready)
```bash
echo "true" | gcloud secrets versions add use-cloud-tasks \
  --project=catchup-479221 \
  --data-file=-
```

### Rollback (If Needed)
```bash
echo "false" | gcloud secrets versions add use-cloud-tasks \
  --project=catchup-479221 \
  --data-file=-
```

---

## What Was Deployed

### Code Changes
- ✅ Cloud Tasks client (`src/jobs/cloud-tasks-client.ts`)
- ✅ Job handler endpoint (`src/api/jobs-handler.ts`)
- ✅ Idempotency manager (`src/jobs/idempotency.ts`)
- ✅ Queue configurations (`src/jobs/cloud-tasks-config.ts`)
- ✅ Updated queue factory with feature flag

### Secrets Added
- `use-cloud-tasks` = `false` (disabled by default)
- `gcp-project-id` = `catchup-479221`
- `gcp-region` = `us-central1`
- `cloud-run-url` = placeholder (update after deployment)
- `service-account-email` = `402592213346-compute@developer.gserviceaccount.com`

### Infrastructure
- ✅ 11 Cloud Tasks queues created in GCP
- ✅ Service account has Cloud Run Invoker role
- ✅ Cloud Tasks API enabled

---

## Expected Behavior

### Right Now (USE_CLOUD_TASKS=false)
- BullMQ workers should start normally
- No Cloud Tasks activity
- All existing functionality works as before

### After Enabling (USE_CLOUD_TASKS=true)
- Cloud Tasks creates tasks
- Job handler receives HTTP POST requests
- BullMQ workers stop (no longer needed)
- Zero "Stream isn't writeable" errors

---

## Monitoring

### Watch Logs
```bash
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=catchup"
```

### Check Errors
```bash
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=50
```

### Check Cloud Tasks
```bash
gcloud tasks queues list --location=us-central1
```

---

## Documentation

- `DEPLOYMENT_IN_PROGRESS.md` - Current status and next steps
- `CLOUD_TASKS_DEPLOYMENT_CHECKLIST.md` - Full deployment guide
- `READY_FOR_DEPLOYMENT.md` - Executive summary
- `scripts/post-deployment-cloud-tasks.sh` - Post-deployment automation

---

**Next Step**: Wait for build to complete (~10-15 min), then run post-deployment script
