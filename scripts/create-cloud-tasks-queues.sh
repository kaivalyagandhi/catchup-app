#!/bin/bash
# Script to create Cloud Tasks queues for all 11 job types
# Part of Phase 3: Cloud Tasks Migration

set -e

PROJECT_ID="catchup-479221"
LOCATION="us-central1"

echo "🚀 Creating Cloud Tasks queues for project: $PROJECT_ID"
echo "📍 Location: $LOCATION"
echo ""

# Enable Cloud Tasks API
echo "1️⃣ Enabling Cloud Tasks API..."
gcloud services enable cloudtasks.googleapis.com --project="$PROJECT_ID" --quiet
echo "✅ Cloud Tasks API enabled"
echo ""

echo "2️⃣ Creating queues..."
echo ""

# Function to create a queue
create_queue() {
  local queue_name=$1
  local max_attempts=$2
  local min_backoff=$3
  local max_backoff=$4
  local max_doublings=$5
  local max_dispatches=$6
  
  echo "Creating queue: $queue_name"
  
  local cmd="gcloud tasks queues create $queue_name \
    --location=$LOCATION \
    --project=$PROJECT_ID \
    --max-attempts=$max_attempts \
    --min-backoff=$min_backoff \
    --max-backoff=$max_backoff \
    --max-doublings=$max_doublings \
    --quiet"
  
  # Add max-dispatches-per-second if specified
  if [ -n "$max_dispatches" ]; then
    cmd="$cmd --max-dispatches-per-second=$max_dispatches"
  fi
  
  # Execute the command
  if eval "$cmd" 2>&1; then
    echo "  ✅ Created $queue_name"
  else
    echo "  ⚠️  Failed to create $queue_name (may already exist)"
  fi
  echo ""
}

# Create all queues
create_queue "token-refresh-queue" 3 "60s" "3600s" 2 10
create_queue "calendar-sync-queue" 5 "30s" "1800s" 3 20
create_queue "google-contacts-sync-queue" 5 "30s" "1800s" 3 10
create_queue "adaptive-sync-queue" 5 "10s" "300s" 3 ""
create_queue "webhook-renewal-queue" 5 "30s" "1800s" 3 ""
create_queue "suggestion-regeneration-queue" 3 "60s" "3600s" 2 ""
create_queue "batch-notifications-queue" 5 "10s" "300s" 3 50
create_queue "suggestion-generation-queue" 3 "60s" "3600s" 2 ""
create_queue "webhook-health-check-queue" 3 "30s" "900s" 2 ""
create_queue "notification-reminder-queue" 3 "60s" "1800s" 2 ""
create_queue "token-health-reminder-queue" 3 "60s" "1800s" 2 ""

echo "3️⃣ Verifying service account permissions..."
SERVICE_ACCOUNT="402592213346-compute@developer.gserviceaccount.com"

# Add Cloud Run Invoker role to service account
gcloud run services add-iam-policy-binding catchup \
  --region="$LOCATION" \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/run.invoker" \
  --project="$PROJECT_ID" \
  --quiet 2>&1 || echo "  ⚠️  IAM binding may already exist"

echo "✅ Service account has Cloud Run Invoker role"
echo ""

echo "4️⃣ Listing all queues..."
gcloud tasks queues list --location="$LOCATION" --project="$PROJECT_ID"
echo ""

echo "✅ Cloud Tasks infrastructure setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Install @google-cloud/tasks package: npm install @google-cloud/tasks"
echo "  2. Implement Cloud Tasks client wrapper"
echo "  3. Create job handler endpoint"
echo "  4. Test with non-critical queues first"
