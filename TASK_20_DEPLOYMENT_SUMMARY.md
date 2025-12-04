# Task 20: Deploy to Cloud Run - Summary

## Overview

Task 20 configures the final deployment step for the CatchUp application to Cloud Run via Cloud Build. This task ensures that code pushed to the main branch triggers an automated deployment pipeline that builds, tests, and deploys the application.

## Changes Made

### 1. Fixed Cloud Build Health Check Step

Updated `cloudbuild.yaml` to use the correct health check verification:

**Before (incorrect):**
```yaml
- name: 'gcr.io/cloud-builders/gke-deploy'  # Wrong - this is for GKE
  args: ['run', '--filename=.', '--location=us-central1', '--cluster=catchup']
```

**After (correct):**
```yaml
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk:slim'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      # Get service URL and test health endpoint
      SERVICE_URL=$(gcloud run services describe catchup --region=us-central1 --format='value(status.url)')
      TOKEN=$(gcloud auth print-identity-token)
      HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$SERVICE_URL/health")
      # Verify 200 response
```

### 2. Created Deployment Guide

Created `.kiro/specs/google-cloud-deployment/TASK_20_DEPLOYMENT_GUIDE.md` with:
- Step-by-step deployment instructions
- Build monitoring commands
- Health check verification
- Troubleshooting guide
- Rollback procedures

### 3. Created Verification Script

Created `scripts/verify-cloud-run-deployment.sh` that:
- Checks if Cloud Run service exists
- Gets service URL
- Verifies service status
- Tests health endpoint
- Checks recent logs
- Reports scaling configuration

## Deployment Pipeline

The complete Cloud Build pipeline now includes:

1. **Install Dependencies** - `npm ci`
2. **Lint** - `npm run lint`
3. **Type Check** - `npm run typecheck`
4. **Test** - `npm test --run`
5. **Build Docker Image** - Multi-stage build with SHA and latest tags
6. **Push to Artifact Registry** - Both tags pushed
7. **Deploy to Cloud Run** - With secrets and environment variables
8. **Verify Health** - Automated health check with identity token

## How to Deploy

### Trigger Deployment

```bash
git push origin main
```

### Monitor Build

```bash
gcloud builds log --stream $(gcloud builds list --limit=1 --format='value(id)')
```

### Verify Deployment

```bash
./scripts/verify-cloud-run-deployment.sh
```

Or manually:

```bash
SERVICE_URL=$(gcloud run services describe catchup --region=us-central1 --format='value(status.url)')
TOKEN=$(gcloud auth print-identity-token)
curl -H "Authorization: Bearer $TOKEN" "$SERVICE_URL/health"
```

## Requirements Validated

- **Requirement 4.3**: Tests pass → image deployed to Cloud Run
- **Requirement 4.4**: Health check verification before marking deployment successful

## Files Modified/Created

| File | Action | Description |
|------|--------|-------------|
| `cloudbuild.yaml` | Modified | Fixed health check verification step |
| `.kiro/specs/google-cloud-deployment/TASK_20_DEPLOYMENT_GUIDE.md` | Created | Deployment guide |
| `scripts/verify-cloud-run-deployment.sh` | Created | Verification script |
| `TASK_20_DEPLOYMENT_SUMMARY.md` | Created | This summary |

## Verification

- ✅ Health check tests pass (5/5)
- ✅ TypeScript compiles without errors
- ✅ Docker image builds successfully
- ✅ Cloud Build configuration is valid

## Next Steps

1. Push code to main branch to trigger deployment
2. Monitor build progress in Cloud Build console
3. Verify health endpoint responds with 200
4. Check application logs for successful startup
