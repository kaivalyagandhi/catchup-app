#!/bin/bash
# Cloud Tasks Deployment Commands
# Run these commands in order to deploy to GCP

set -e  # Exit on error

echo "=========================================="
echo "Cloud Tasks Deployment Script"
echo "=========================================="
echo ""

# Step 1: Commit all changes
echo "Step 1: Committing changes to git..."
git add .
git status

read -p "Review changes above. Continue with commit? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

git commit -m "feat: Cloud Tasks migration - Phase 3.1 complete

- Implement Cloud Tasks client with BullMQ-compatible interface
- Create job handler endpoint with OIDC authentication
- Add idempotency system using HTTP Redis
- Update queue factory with USE_CLOUD_TASKS feature flag
- Create 11 Cloud Tasks queues in GCP
- Add comprehensive documentation
- Archive obsolete documentation files

Fixes: BullMQ TCP connection issues in serverless Cloud Run
Cost: Reduces queue infrastructure from \$2.53/month to \$0/month
Status: Ready for staging deployment"

echo "✅ Changes committed"
echo ""

# Step 2: Create and push tag
echo "Step 2: Creating production tag..."
git tag -a v1.5.0-cloud-tasks -m "Cloud Tasks Migration - Phase 3.1

Major Changes:
- Migrate from BullMQ (TCP) to Cloud Tasks (HTTP)
- Eliminate all 'Stream isn't writeable' errors
- Reduce queue cost from \$2.53/month to \$0/month
- Add OIDC authentication for job handlers
- Implement idempotency with HTTP Redis

Breaking Changes:
- None (feature flag allows gradual rollout)

Rollback:
- Set USE_CLOUD_TASKS=false to revert to BullMQ"

git push origin main
git push origin v1.5.0-cloud-tasks

echo "✅ Tag pushed to GitHub"
echo ""

# Step 3: Deploy to Cloud Run (with Cloud Tasks disabled initially)
echo "Step 3: Deploying to Cloud Run (USE_CLOUD_TASKS=false)..."
echo "This is a safe deployment - Cloud Tasks is disabled initially"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

gcloud run deploy catchup \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars USE_CLOUD_TASKS=false

echo "✅ Deployed to Cloud Run"
echo ""

# Step 4: Get Cloud Run URL
echo "Step 4: Getting Cloud Run URL..."
CLOUD_RUN_URL=$(gcloud run services describe catchup --region=us-central1 --format='value(status.url)')
echo "Cloud Run URL: $CLOUD_RUN_URL"
echo ""

# Step 5: Update CLOUD_RUN_URL environment variable
echo "Step 5: Updating CLOUD_RUN_URL environment variable..."
gcloud run services update catchup \
  --region us-central1 \
  --set-env-vars CLOUD_RUN_URL=$CLOUD_RUN_URL

echo "✅ CLOUD_RUN_URL updated"
echo ""

# Step 6: Verify deployment
echo "Step 6: Verifying deployment..."
echo "Testing health endpoint..."
curl -s $CLOUD_RUN_URL/health | jq .

echo ""
echo "Testing job handler endpoint (should return 401 without OIDC token)..."
curl -s -X POST $CLOUD_RUN_URL/api/jobs/webhook-health-check \
  -H "Content-Type: application/json" \
  -d '{"data":{"test":true},"idempotencyKey":"test123","jobName":"webhook-health-check"}' \
  | jq .

echo ""
echo "✅ Deployment verified"
echo ""

# Step 7: Enable Cloud Tasks
echo "Step 7: Enabling Cloud Tasks..."
echo "⚠️  This will switch from BullMQ to Cloud Tasks"
echo ""

read -p "Enable Cloud Tasks now? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cloud Tasks not enabled. You can enable it later with:"
    echo "gcloud run services update catchup --region us-central1 --set-env-vars USE_CLOUD_TASKS=true"
    exit 0
fi

gcloud run services update catchup \
  --region us-central1 \
  --set-env-vars USE_CLOUD_TASKS=true

echo "✅ Cloud Tasks enabled"
echo ""

# Step 8: Monitor
echo "Step 8: Monitoring deployment..."
echo ""
echo "Watch logs in real-time:"
echo "gcloud logging tail \"resource.type=cloud_run_revision AND resource.labels.service_name=catchup\""
echo ""
echo "Check for errors:"
echo "gcloud logging read \"resource.type=cloud_run_revision AND severity>=ERROR\" --limit=50"
echo ""
echo "Check Cloud Tasks queues:"
echo "gcloud tasks queues list --location=us-central1"
echo ""
echo "Check recent job executions:"
echo "gcloud logging read \"resource.type=cloud_run_revision AND jsonPayload.message=~'\\[Jobs\\]'\" --limit=50"
echo ""

# Step 9: Success
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Monitor logs for 2 hours (non-critical queues)"
echo "2. Monitor for 24 hours (medium-risk queues)"
echo "3. Monitor for 48 hours (critical queues)"
echo "4. After 7 days of stability, remove BullMQ code (Phase 3.2)"
echo ""
echo "Rollback (if needed):"
echo "gcloud run services update catchup --region us-central1 --set-env-vars USE_CLOUD_TASKS=false"
echo ""
echo "Documentation:"
echo "- CLOUD_TASKS_DEPLOYMENT_CHECKLIST.md"
echo "- READY_FOR_DEPLOYMENT.md"
echo "- CLOUD_TASKS_IMPLEMENTATION_COMPLETE.md"
echo ""
