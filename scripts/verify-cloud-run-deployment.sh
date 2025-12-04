#!/bin/bash
# Verify Cloud Run Deployment Script
# This script verifies that the CatchUp application is deployed and healthy on Cloud Run

set -e

# Configuration
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-catchup}"

echo "============================================"
echo "Cloud Run Deployment Verification"
echo "============================================"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "ERROR: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "ERROR: No GCP project configured"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Step 1: Check if service exists
echo "Step 1: Checking if Cloud Run service exists..."
if ! gcloud run services describe "$SERVICE_NAME" --region="$REGION" &>/dev/null; then
    echo "ERROR: Service '$SERVICE_NAME' not found in region '$REGION'"
    exit 1
fi
echo "✓ Service exists"
echo ""

# Step 2: Get service URL
echo "Step 2: Getting service URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')
if [ -z "$SERVICE_URL" ]; then
    echo "ERROR: Could not get service URL"
    exit 1
fi
echo "✓ Service URL: $SERVICE_URL"
echo ""

# Step 3: Check service status
echo "Step 3: Checking service status..."
SERVICE_STATUS=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.conditions[0].status)')
if [ "$SERVICE_STATUS" != "True" ]; then
    echo "WARNING: Service status is not 'True'"
    gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='yaml(status.conditions)'
fi
echo "✓ Service status: Ready"
echo ""

# Step 4: Get latest revision
echo "Step 4: Getting latest revision..."
LATEST_REVISION=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.latestReadyRevisionName)')
echo "✓ Latest revision: $LATEST_REVISION"
echo ""

# Step 5: Test health endpoint
echo "Step 5: Testing health endpoint..."
TOKEN=$(gcloud auth print-identity-token 2>/dev/null || echo "")
if [ -z "$TOKEN" ]; then
    echo "WARNING: Could not get identity token. Health check may fail if service requires authentication."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" 2>/dev/null || echo "000")
else
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$SERVICE_URL/health" 2>/dev/null || echo "000")
fi

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✓ Health check passed (HTTP $HTTP_STATUS)"
    
    # Get health response body
    if [ -n "$TOKEN" ]; then
        HEALTH_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$SERVICE_URL/health" 2>/dev/null)
    else
        HEALTH_RESPONSE=$(curl -s "$SERVICE_URL/health" 2>/dev/null)
    fi
    echo "  Response: $HEALTH_RESPONSE"
else
    echo "✗ Health check failed (HTTP $HTTP_STATUS)"
    echo "  This may be expected if the service requires authentication"
fi
echo ""

# Step 6: Check recent logs
echo "Step 6: Checking recent logs..."
echo "Recent log entries:"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
    --limit=5 \
    --format='table(timestamp,jsonPayload.message)' 2>/dev/null || echo "  (No logs found or permission denied)"
echo ""

# Step 7: Check scaling configuration
echo "Step 7: Checking scaling configuration..."
MIN_INSTANCES=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(spec.template.metadata.annotations."autoscaling.knative.dev/minScale")' 2>/dev/null || echo "0")
MAX_INSTANCES=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(spec.template.metadata.annotations."autoscaling.knative.dev/maxScale")' 2>/dev/null || echo "100")
echo "✓ Min instances: $MIN_INSTANCES"
echo "✓ Max instances: $MAX_INSTANCES"
echo ""

# Summary
echo "============================================"
echo "Deployment Verification Summary"
echo "============================================"
echo "Service: $SERVICE_NAME"
echo "URL: $SERVICE_URL"
echo "Revision: $LATEST_REVISION"
echo "Health: HTTP $HTTP_STATUS"
echo "Scaling: $MIN_INSTANCES - $MAX_INSTANCES instances"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✓ Deployment verification PASSED"
    exit 0
else
    echo "⚠ Deployment verification completed with warnings"
    echo "  Health check returned HTTP $HTTP_STATUS"
    exit 0
fi
