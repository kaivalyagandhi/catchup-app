#!/bin/bash
# Update GCP Secret Manager with Cloud Tasks configuration
# Run this script to add the new secrets needed for Cloud Tasks migration

set -e  # Exit on error

PROJECT_ID="catchup-479221"

echo "=========================================="
echo "Cloud Tasks Secrets Update"
echo "=========================================="
echo "Project: $PROJECT_ID"
echo ""

# Function to create or update a secret
update_secret() {
  local secret_name=$1
  local secret_value=$2
  
  echo "Updating secret: $secret_name"
  
  # Check if secret exists
  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
    # Secret exists, add new version
    echo "$secret_value" | gcloud secrets versions add "$secret_name" \
      --project="$PROJECT_ID" \
      --data-file=-
    echo "✅ Updated existing secret: $secret_name"
  else
    # Secret doesn't exist, create it
    echo "$secret_value" | gcloud secrets create "$secret_name" \
      --project="$PROJECT_ID" \
      --replication-policy="automatic" \
      --data-file=-
    echo "✅ Created new secret: $secret_name"
  fi
  echo ""
}

# Cloud Tasks Configuration Secrets
echo "Adding Cloud Tasks configuration secrets..."
echo ""

# USE_CLOUD_TASKS (feature flag)
update_secret "use-cloud-tasks" "false"

# GCP_PROJECT_ID (already known, but good to have in secrets)
update_secret "gcp-project-id" "$PROJECT_ID"

# GCP_REGION
update_secret "gcp-region" "us-central1"

# CLOUD_RUN_URL (will be updated after deployment)
echo "⚠️  CLOUD_RUN_URL needs to be updated after deployment"
echo "Run this command after deployment:"
echo ""
echo "CLOUD_RUN_URL=\$(gcloud run services describe catchup --region=us-central1 --format='value(status.url)')"
echo "echo \"\$CLOUD_RUN_URL\" | gcloud secrets versions add cloud-run-url --project=$PROJECT_ID --data-file=-"
echo ""
update_secret "cloud-run-url" "http://localhost:3000"

# SERVICE_ACCOUNT_EMAIL
update_secret "service-account-email" "402592213346-compute@developer.gserviceaccount.com"

echo "=========================================="
echo "✅ Cloud Tasks Secrets Updated"
echo "=========================================="
echo ""
echo "Secrets created/updated:"
echo "  - use-cloud-tasks (false - disabled by default)"
echo "  - gcp-project-id (catchup-479221)"
echo "  - gcp-region (us-central1)"
echo "  - cloud-run-url (placeholder - update after deployment)"
echo "  - service-account-email (402592213346-compute@developer.gserviceaccount.com)"
echo ""
echo "Next Steps:"
echo "1. Deploy to Cloud Run (will trigger on git tag push)"
echo "2. Update cloud-run-url secret with actual URL"
echo "3. Update cloudbuild.yaml to include new secrets"
echo "4. Redeploy to apply new secrets"
echo ""
