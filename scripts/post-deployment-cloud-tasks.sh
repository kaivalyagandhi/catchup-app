#!/bin/bash
# Post-Deployment Script for Cloud Tasks
# Run this after Cloud Run deployment completes to update CLOUD_RUN_URL secret

set -e  # Exit on error

PROJECT_ID="catchup-479221"
REGION="us-central1"
SERVICE_NAME="catchup"

echo "=========================================="
echo "Cloud Tasks Post-Deployment Setup"
echo "=========================================="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Step 1: Wait for deployment to complete
echo "Step 1: Checking deployment status..."
echo ""

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)' 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
  echo "❌ ERROR: Could not get Cloud Run service URL"
  echo "Make sure the service is deployed:"
  echo "gcloud run services describe $SERVICE_NAME --region=$REGION"
  exit 1
fi

echo "✅ Service URL: $SERVICE_URL"
echo ""

# Step 2: Update cloud-run-url secret
echo "Step 2: Updating cloud-run-url secret..."
echo ""

echo "$SERVICE_URL" | gcloud secrets versions add cloud-run-url \
  --project=$PROJECT_ID \
  --data-file=-

echo "✅ cloud-run-url secret updated"
echo ""

# Step 3: Verify health endpoint
echo "Step 3: Verifying health endpoint..."
echo ""

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Health check passed (HTTP $HTTP_STATUS)"
else
  echo "⚠️  Health check returned HTTP $HTTP_STATUS"
  echo "This may be normal if the service is still starting up"
fi
echo ""

# Step 4: Test job handler endpoint (should return 401 without OIDC token)
echo "Step 4: Testing job handler endpoint..."
echo ""

JOB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$SERVICE_URL/api/jobs/webhook-health-check" \
  -H "Content-Type: application/json" \
  -d '{"data":{"test":true},"idempotencyKey":"test123","jobName":"webhook-health-check"}')

if [ "$JOB_STATUS" = "401" ]; then
  echo "✅ Job handler endpoint working (HTTP 401 - OIDC required)"
else
  echo "⚠️  Job handler returned HTTP $JOB_STATUS (expected 401)"
fi
echo ""

# Step 5: Display next steps
echo "=========================================="
echo "✅ Post-Deployment Setup Complete"
echo "=========================================="
echo ""
echo "Service URL: $SERVICE_URL"
echo "cloud-run-url secret: Updated"
echo ""
echo "Next Steps:"
echo ""
echo "1. Monitor deployment logs:"
echo "   gcloud logging tail \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\""
echo ""
echo "2. Check for errors:"
echo "   gcloud logging read \"resource.type=cloud_run_revision AND severity>=ERROR\" --limit=50"
echo ""
echo "3. When ready to enable Cloud Tasks:"
echo "   echo \"true\" | gcloud secrets versions add use-cloud-tasks --project=$PROJECT_ID --data-file=-"
echo ""
echo "4. Monitor Cloud Tasks queues:"
echo "   gcloud tasks queues list --location=$REGION"
echo ""
echo "5. Check job executions:"
echo "   gcloud logging read \"resource.type=cloud_run_revision AND jsonPayload.message=~'\\[Jobs\\]'\" --limit=50"
echo ""
echo "Rollback (if needed):"
echo "   echo \"false\" | gcloud secrets versions add use-cloud-tasks --project=$PROJECT_ID --data-file=-"
echo ""
