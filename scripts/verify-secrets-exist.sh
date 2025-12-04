#!/bin/bash

# Verify that all required secrets exist in Google Secret Manager
# Usage: ./scripts/verify-secrets-exist.sh

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Verifying secrets in Google Secret Manager...${NC}"
echo ""

# List of required secrets
REQUIRED_SECRETS=(
  "google-oauth-client-id"
  "google-oauth-client-secret"
  "database-user"
  "db-password"
  "jwt-secret"
  "encryption-key"
  "google-cloud-api-key"
  "google-gemini-api-key"
  "twilio-account-sid"
  "twilio-auth-token"
  "twilio-phone-number"
  "sendgrid-api-key"
  "sendgrid-from-email"
)

# Optional secrets
OPTIONAL_SECRETS=(
  "google-redirect-uri"
)

MISSING_SECRETS=()
EXISTING_SECRETS=()

# Check required secrets
echo -e "${YELLOW}Required Secrets:${NC}"
for secret in "${REQUIRED_SECRETS[@]}"; do
  if gcloud secrets describe $secret &>/dev/null; then
    echo -e "${GREEN}✓ $secret${NC}"
    EXISTING_SECRETS+=("$secret")
  else
    echo -e "${RED}✗ $secret (MISSING)${NC}"
    MISSING_SECRETS+=("$secret")
  fi
done

echo ""

# Check optional secrets
echo -e "${YELLOW}Optional Secrets:${NC}"
for secret in "${OPTIONAL_SECRETS[@]}"; do
  if gcloud secrets describe $secret &>/dev/null; then
    echo -e "${GREEN}✓ $secret${NC}"
    EXISTING_SECRETS+=("$secret")
  else
    echo -e "${YELLOW}⚠ $secret (not found, but optional)${NC}"
  fi
done

echo ""

# Summary
if [ ${#MISSING_SECRETS[@]} -eq 0 ]; then
  echo -e "${GREEN}✓ All required secrets exist!${NC}"
  exit 0
else
  echo -e "${RED}✗ Missing ${#MISSING_SECRETS[@]} required secret(s):${NC}"
  for secret in "${MISSING_SECRETS[@]}"; do
    echo "  - $secret"
  done
  echo ""
  echo "Create missing secrets with:"
  for secret in "${MISSING_SECRETS[@]}"; do
    echo "  echo -n \"YOUR_VALUE\" | gcloud secrets create $secret --data-file=-"
  done
  exit 1
fi
