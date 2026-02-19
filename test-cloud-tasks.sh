#!/bin/bash
# Quick test script for Cloud Tasks

echo "🚀 Cloud Tasks Testing"
echo "====================="
echo ""

# Check if USE_CLOUD_TASKS is enabled
if grep -q "USE_CLOUD_TASKS=true" .env; then
  echo "✅ Feature flag enabled: USE_CLOUD_TASKS=true"
else
  echo "❌ Feature flag not enabled"
  echo "Please set USE_CLOUD_TASKS=true in .env"
  exit 1
fi

# Check if queues exist
echo ""
echo "📋 Checking Cloud Tasks queues..."
QUEUE_COUNT=$(gcloud tasks queues list --location=us-central1 --project=catchup-479221 --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')

if [ "$QUEUE_COUNT" -eq 11 ]; then
  echo "✅ All 11 queues exist in GCP"
else
  echo "⚠️  Found $QUEUE_COUNT queues (expected 11)"
fi

# Check if build is up to date
echo ""
echo "🔨 Checking build..."
if [ -f "dist/scripts/test-cloud-tasks.js" ]; then
  echo "✅ Test script compiled"
else
  echo "❌ Test script not found, running build..."
  npm run build
fi

echo ""
echo "====================="
echo "Ready to test!"
echo ""
echo "Next steps:"
echo "1. Start the server in Terminal 1:"
echo "   npm run dev"
echo ""
echo "2. Run the test script in Terminal 2:"
echo "   node dist/scripts/test-cloud-tasks.js"
echo ""
echo "Or run both automatically:"
echo "   npm run dev & sleep 5 && node dist/scripts/test-cloud-tasks.js"
echo ""
