#!/bin/bash

# Configure Cloud Run Service with Environment Variables and Secrets
# This script updates the Cloud Run service with all required environment variables and secrets
# Usage: ./scripts/configure-cloud-run-secrets.sh <PROJECT_ID> <CLOUD_RUN_SERVICE_URL>

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 2 ]; then
  echo -e "${RED}Usage: $0 <PROJECT_ID> <CLOUD_RUN_SERVICE_URL>${NC}"
  echo "Example: $0 my-project https://catchup-abc123.run.app"
  exit 1
fi

PROJECT_ID=$1
CLOUD_RUN_SERVICE_URL=$2
CLOUD_RUN_SERVICE="catchup"
REGION="us-central1"

echo -e "${YELLOW}Configuring Cloud Run Service: $CLOUD_RUN_SERVICE${NC}"
echo "Project ID: $PROJECT_ID"
echo "Service URL: $CLOUD_RUN_SERVICE_URL"
echo "Region: $REGION"
echo ""

# Step 1: Get Cloud SQL connection string
echo -e "${YELLOW}Step 1: Getting Cloud SQL connection string...${NC}"
CLOUD_SQL_CONNECTION_NAME=$(gcloud sql instances describe catchup-db --format='value(connectionName)' 2>/dev/null || echo "")

if [ -z "$CLOUD_SQL_CONNECTION_NAME" ]; then
  echo -e "${RED}Error: Could not find Cloud SQL instance 'catchup-db'${NC}"
  echo "Please ensure the Cloud SQL instance is created first (Task 4)"
  exit 1
fi

echo -e "${GREEN}✓ Cloud SQL connection: $CLOUD_SQL_CONNECTION_NAME${NC}"
echo ""

# Step 2: Update environment variables
echo -e "${YELLOW}Step 2: Updating environment variables...${NC}"

gcloud run services update $CLOUD_RUN_SERVICE \
  --region=$REGION \
  --set-env-vars=\
NODE_ENV=production,\
LOG_LEVEL=info,\
PORT=3000,\
DATABASE_HOST=/cloudsql/$CLOUD_SQL_CONNECTION_NAME,\
DATABASE_PORT=5432,\
DATABASE_NAME=catchup_db,\
GOOGLE_REDIRECT_URI=$CLOUD_RUN_SERVICE_URL/auth/google/callback

echo -e "${GREEN}✓ Environment variables updated${NC}"
echo ""

# Step 3: Update secrets
echo -e "${YELLOW}Step 3: Updating secrets from Secret Manager...${NC}"

# List of secrets to configure
SECRETS=(
  "GOOGLE_CLIENT_ID=google-oauth-client-id:latest"
  "GOOGLE_CLIENT_SECRET=google-oauth-client-secret:latest"
  "DATABASE_USER=database-user:latest"
  "DATABASE_PASSWORD=db-password:latest"
  "JWT_SECRET=jwt-secret:latest"
  "ENCRYPTION_KEY=encryption-key:latest"
  "GOOGLE_CLOUD_API_KEY=google-cloud-api-key:latest"
  "GOOGLE_GEMINI_API_KEY=google-gemini-api-key:latest"
  "TWILIO_ACCOUNT_SID=twilio-account-sid:latest"
  "TWILIO_AUTH_TOKEN=twilio-auth-token:latest"
  "TWILIO_PHONE_NUMBER=twilio-phone-number:latest"
  "SENDGRID_API_KEY=sendgrid-api-key:latest"
  "SENDGRID_FROM_EMAIL=sendgrid-from-email:latest"
)

# Build the secrets string
SECRETS_STRING=""
for secret in "${SECRETS[@]}"; do
  if [ -z "$SECRETS_STRING" ]; then
    SECRETS_STRING="$secret"
  else
    SECRETS_STRING="$SECRETS_STRING,$secret"
  fi
done

# Update secrets
gcloud run services update $CLOUD_RUN_SERVICE \
  --region=$REGION \
  --update-secrets=$SECRETS_STRING

echo -e "${GREEN}✓ Secrets updated${NC}"
echo ""

# Step 4: Verify configuration
echo -e "${YELLOW}Step 4: Verifying configuration...${NC}"

# Get service details
SERVICE_DETAILS=$(gcloud run services describe $CLOUD_RUN_SERVICE --region=$REGION --format=json)

# Check environment variables
echo -e "${YELLOW}Environment Variables:${NC}"
echo "$SERVICE_DETAILS" | jq -r '.spec.template.spec.containers[0].env[]? | "\(.name)=\(.value)"' | head -10

echo ""
echo -e "${YELLOW}Secrets:${NC}"
echo "$SERVICE_DETAILS" | jq -r '.spec.template.spec.containers[0].envFrom[]? | .secretRef.name' | head -10

echo ""

# Step 5: Verify service account has access to secrets
echo -e "${YELLOW}Step 5: Verifying service account access to secrets...${NC}"

SERVICE_ACCOUNT="catchup-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"
echo "Service Account: $SERVICE_ACCOUNT"
echo ""

# Check a few key secrets
KEY_SECRETS=("google-oauth-client-id" "db-password" "encryption-key")
for secret in "${KEY_SECRETS[@]}"; do
  HAS_ACCESS=$(gcloud secrets get-iam-policy $secret --format=json 2>/dev/null | jq -r ".bindings[]? | select(.members[] | contains(\"$SERVICE_ACCOUNT\")) | .role" | grep -c "secretAccessor" || echo "0")
  
  if [ "$HAS_ACCESS" -gt 0 ]; then
    echo -e "${GREEN}✓ $secret: Service account has access${NC}"
  else
    echo -e "${YELLOW}⚠ $secret: Service account may not have access${NC}"
  fi
done

echo ""

# Step 6: Test health check
echo -e "${YELLOW}Step 6: Testing health check endpoint...${NC}"

# Wait a moment for the service to update
sleep 2

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$CLOUD_RUN_SERVICE_URL/health" 2>/dev/null || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
  echo -e "${GREEN}✓ Health check endpoint responding (HTTP $HEALTH_CHECK)${NC}"
else
  echo -e "${YELLOW}⚠ Health check endpoint returned HTTP $HEALTH_CHECK (expected 200)${NC}"
  echo "The service may still be starting up. Check logs with:"
  echo "  gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$CLOUD_RUN_SERVICE\" --limit=20"
fi

echo ""
echo -e "${GREEN}Configuration complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor the service: gcloud run services describe $CLOUD_RUN_SERVICE --region=$REGION"
echo "2. Check logs: gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$CLOUD_RUN_SERVICE\" --limit=20"
echo "3. Test the application: curl $CLOUD_RUN_SERVICE_URL/health"
