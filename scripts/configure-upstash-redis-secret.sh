#!/bin/bash

# Configure Upstash Redis Secret for Cloud Run
# This script creates a REDIS_URL secret in the connection string format
# Format: rediss://:PASSWORD@ENDPOINT:PORT

set -e

echo "=== Configuring Upstash Redis Secret ==="
echo ""

# Check if we have the individual secrets
echo "Checking existing Upstash Redis secrets..."
REDIS_HOST=$(gcloud secrets versions access latest --secret="upstash-redis-host" 2>/dev/null || echo "")
REDIS_PORT=$(gcloud secrets versions access latest --secret="upstash-redis-port" 2>/dev/null || echo "")
REDIS_PASSWORD=$(gcloud secrets versions access latest --secret="upstash-redis-password" 2>/dev/null || echo "")

if [ -z "$REDIS_HOST" ] || [ -z "$REDIS_PORT" ] || [ -z "$REDIS_PASSWORD" ]; then
  echo "❌ Error: Missing Upstash Redis secrets"
  echo ""
  echo "Please create the following secrets first:"
  echo "  gcloud secrets create upstash-redis-host --data-file=- <<< 'your-database.upstash.io'"
  echo "  gcloud secrets create upstash-redis-port --data-file=- <<< '6379'"
  echo "  gcloud secrets create upstash-redis-password --data-file=- <<< 'your_password'"
  exit 1
fi

echo "✅ Found existing secrets:"
echo "   Host: $REDIS_HOST"
echo "   Port: $REDIS_PORT"
echo "   Password: [REDACTED]"
echo ""

# Construct the REDIS_URL connection string
# Format: rediss://:PASSWORD@ENDPOINT:PORT
REDIS_URL="rediss://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"

echo "Creating REDIS_URL secret..."
echo "$REDIS_URL" | gcloud secrets create redis-url --data-file=- 2>/dev/null || \
  echo "$REDIS_URL" | gcloud secrets versions add redis-url --data-file=-

echo "✅ REDIS_URL secret created/updated"
echo ""

# Update Cloud Run service to use REDIS_URL
echo "Updating Cloud Run service to use REDIS_URL..."
gcloud run services update catchup \
  --region=us-central1 \
  --update-secrets=REDIS_URL=redis-url:latest

echo ""
echo "✅ Cloud Run service updated with REDIS_URL"
echo ""
echo "=== Configuration Complete ==="
echo ""
echo "Next steps:"
echo "1. Deploy the updated application: npm run deploy:production"
echo "2. Check logs for successful Redis connections"
echo "3. Verify functionality at https://catchup.club"
echo ""
echo "Expected log messages:"
echo "  [Redis Cache] Connecting using REDIS_URL connection string"
echo "  [Redis Cache] Connected to Redis successfully"
echo "  [Rate Limiter] Connecting using REDIS_URL connection string"
echo "  [Redis Queue] Connected to Redis successfully"
