# Task 20: Deploy to Cloud Run - Deployment Guide

## Overview

This guide covers deploying the CatchUp application to Cloud Run via Cloud Build. The deployment is triggered automatically when code is pushed to the main branch.

## Prerequisites

Before deploying, ensure the following are complete:

1. **GCP Project Setup** (Task 1) - APIs enabled
2. **Service Accounts** (Task 2) - IAM roles configured
3. **Secret Manager** (Task 3) - Secrets stored
4. **Cloud SQL** (Task 4) - Database instance created
5. **Database Schema** (Task 5) - Migrations applied
6. **Docker Image** (Tasks 6-10) - Dockerfile configured
7. **Cloud Build Pipeline** (Tasks 11-15) - cloudbuild.yaml configured
8. **Cloud Run Service** (Tasks 16-19) - Service created and configured

## Deployment Steps

### Step 1: Trigger Deployment

Push your code to the main branch to trigger the Cloud Build pipeline:

```bash
# Ensure you're on the main branch
git checkout main

# Pull latest changes
git pull origin main

# Add and commit any changes
git add .
git commit -m "Deploy to Cloud Run"

# Push to trigger deployment
git push origin main
```

### Step 2: Monitor Build Progress

Watch the build in real-time:

```bash
# Stream the latest build logs
gcloud builds log --stream $(gcloud builds list --limit=1 --format='value(id)')

# Or list recent builds
gcloud builds list --limit=5 --format='table(id,status,createTime,duration)'
```

You can also monitor builds in the [Cloud Build Console](https://console.cloud.google.com/cloud-build/builds).

### Step 3: Get Service URL

Once the build completes, get the Cloud Run service URL:

```bash
gcloud run services describe catchup \
  --region=us-central1 \
  --format='value(status.url)'
```

### Step 4: Test Health Endpoint

Verify the deployment is healthy:

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe catchup --region=us-central1 --format='value(status.url)')

# Get an identity token for authenticated request
TOKEN=$(gcloud auth print-identity-token)

# Test the health endpoint
curl -H "Authorization: Bearer $TOKEN" "$SERVICE_URL/health"
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-04T...",
  "version": "1.0.0"
}
```

### Step 5: Check Service Status

Verify the Cloud Run service is running correctly:

```bash
gcloud run services describe catchup \
  --region=us-central1 \
  --format='yaml(status)'
```

Look for:
- `conditions[].status: "True"` for Ready, ConfigurationsReady, and RoutesReady
- `latestReadyRevisionName` should match the latest deployment

## Build Pipeline Steps

The Cloud Build pipeline executes these steps:

1. **Install Dependencies** - `npm ci`
2. **Lint** - `npm run lint`
3. **Type Check** - `npm run typecheck`
4. **Test** - `npm test --run`
5. **Build Docker Image** - Multi-stage build
6. **Push to Artifact Registry** - Both SHA and latest tags
7. **Deploy to Cloud Run** - With secrets and environment variables
8. **Verify Health** - Automated health check

## Troubleshooting

### Build Failed

Check the build logs:
```bash
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)')
```

Common issues:
- **Lint errors**: Fix code style issues
- **Type errors**: Fix TypeScript errors
- **Test failures**: Fix failing tests
- **Docker build errors**: Check Dockerfile syntax

### Deployment Failed

Check Cloud Run logs:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=catchup" \
  --limit=50 \
  --format=json
```

Common issues:
- **Missing secrets**: Ensure all secrets exist in Secret Manager
- **Permission errors**: Check service account IAM roles
- **Container crash**: Check application startup logs

### Health Check Failed

If the health check fails after deployment:

1. Check if the service is running:
   ```bash
   gcloud run services describe catchup --region=us-central1
   ```

2. Check application logs:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision" --limit=20
   ```

3. Verify environment variables:
   ```bash
   gcloud run services describe catchup --region=us-central1 --format='yaml(spec.template.spec.containers[0].env)'
   ```

## Rollback

If a deployment causes issues, rollback to a previous revision:

```bash
# List revisions
gcloud run revisions list --service=catchup --region=us-central1

# Route traffic to a previous revision
gcloud run services update-traffic catchup \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION_NAME=100
```

## Verification Checklist

After deployment, verify:

- [ ] Build completed successfully
- [ ] Docker image pushed to Artifact Registry
- [ ] Cloud Run service updated
- [ ] Health endpoint returns 200
- [ ] Application logs show successful startup
- [ ] Database connectivity working (check logs)

## Requirements Validated

This task validates:
- **Requirement 4.3**: Tests pass → image deployed to Cloud Run
- **Requirement 4.4**: Health check verification before marking deployment successful
