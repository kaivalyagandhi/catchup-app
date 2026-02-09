#!/bin/bash

echo "=========================================="
echo "Cost Optimization Deployment Verification"
echo "=========================================="
echo ""

# Check if gcloud is authenticated
echo "1. Checking gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo "❌ Not authenticated with gcloud"
    echo "   Run: gcloud auth login"
    echo ""
    exit 1
fi
echo "✅ Authenticated"
echo ""

# Check latest Cloud Build
echo "2. Checking latest Cloud Build..."
echo "----------------------------------------"
gcloud builds list --limit=1 --format="table(id,status,createTime,tags)"
echo ""

# Get the latest build ID and status
BUILD_ID=$(gcloud builds list --limit=1 --format="value(id)")
BUILD_STATUS=$(gcloud builds list --limit=1 --format="value(status)")

echo "Latest Build: $BUILD_ID"
echo "Status: $BUILD_STATUS"
echo ""

if [ "$BUILD_STATUS" != "SUCCESS" ]; then
    echo "⚠️  Build did not succeed. Status: $BUILD_STATUS"
    echo ""
    echo "View build logs:"
    echo "  gcloud builds log $BUILD_ID"
    echo ""
    echo "Or view in console:"
    echo "  https://console.cloud.google.com/cloud-build/builds/$BUILD_ID"
    echo ""
    exit 1
fi

echo "✅ Build succeeded"
echo ""

# Check Cloud Run service
echo "3. Checking Cloud Run service..."
echo "----------------------------------------"
SERVICE_URL=$(gcloud run services describe catchup --region=us-central1 --format='value(status.url)' 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
    echo "❌ Could not get Cloud Run service URL"
    exit 1
fi

echo "Service URL: $SERVICE_URL"
echo ""

# Check service status
echo "4. Testing health endpoint..."
echo "----------------------------------------"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health")
echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed with status: $HTTP_STATUS"
    echo ""
    echo "Checking recent logs for errors..."
    echo "----------------------------------------"
    gcloud run services logs read catchup --region=us-central1 --limit=20
    exit 1
fi
echo ""

# Check Redis connection in logs
echo "5. Checking Redis connection..."
echo "----------------------------------------"
REDIS_LOGS=$(gcloud run services logs read catchup --region=us-central1 --limit=100 | grep -i "redis" | head -5)

if echo "$REDIS_LOGS" | grep -q "connected"; then
    echo "✅ Redis connected successfully"
    echo "$REDIS_LOGS"
else
    echo "⚠️  No Redis connection messages found"
    echo "Recent Redis-related logs:"
    echo "$REDIS_LOGS"
fi
echo ""

# Check for errors
echo "6. Checking for errors in logs..."
echo "----------------------------------------"
ERROR_COUNT=$(gcloud run services logs read catchup --region=us-central1 --limit=100 | grep -i "error" | wc -l | tr -d ' ')
echo "Error count in last 100 log lines: $ERROR_COUNT"

if [ "$ERROR_COUNT" -gt 5 ]; then
    echo "⚠️  High error count detected"
    echo "Recent errors:"
    gcloud run services logs read catchup --region=us-central1 --limit=100 | grep -i "error" | head -5
else
    echo "✅ Error count is acceptable"
fi
echo ""

# Check Cloud Run configuration
echo "7. Checking Cloud Run configuration..."
echo "----------------------------------------"
echo "Min instances: $(gcloud run services describe catchup --region=us-central1 --format='value(spec.template.metadata.annotations.autoscaling\.knative\.dev/minScale)')"
echo "Max instances: $(gcloud run services describe catchup --region=us-central1 --format='value(spec.template.metadata.annotations.autoscaling\.knative\.dev/maxScale)')"
echo "Memory: $(gcloud run services describe catchup --region=us-central1 --format='value(spec.template.spec.containers[0].resources.limits.memory)')"
echo "CPU: $(gcloud run services describe catchup --region=us-central1 --format='value(spec.template.spec.containers[0].resources.limits.cpu)')"
echo ""

# Summary
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo "✅ Deployment verification complete!"
echo ""
echo "Next steps:"
echo "1. Test the app in browser: https://catchup.club"
echo "2. Check Cache-Control headers in DevTools Network tab"
echo "3. Monitor for 15-30 minutes"
echo "4. If everything works, delete Cloud Memorystore:"
echo "   https://console.cloud.google.com/memorystore/redis/instances"
echo ""
echo "Expected savings: ~$60-70/month"
echo ""
