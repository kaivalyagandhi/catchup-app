#!/bin/bash

# Task 12: Verify Cloud Build Trigger Configuration
# This script validates that the Cloud Build trigger is properly configured

set -e

echo "=========================================="
echo "Cloud Build Trigger Verification"
echo "=========================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ ERROR: gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ ERROR: No GCP project configured. Run: gcloud config set project PROJECT_ID"
    exit 1
fi

echo "✓ GCP Project: $PROJECT_ID"
echo ""

# Check if trigger exists
TRIGGER_NAME="catchup-main-deploy"
echo "Checking for trigger: $TRIGGER_NAME"

if ! gcloud builds triggers describe "$TRIGGER_NAME" &> /dev/null; then
    echo "❌ ERROR: Trigger '$TRIGGER_NAME' not found"
    echo ""
    echo "Available triggers:"
    gcloud builds triggers list
    exit 1
fi

echo "✓ Trigger found"
echo ""

# Get trigger details
echo "Trigger Configuration:"
echo "====================="
gcloud builds triggers describe "$TRIGGER_NAME" --format='table(
    name,
    filename,
    github.owner,
    github.name,
    github.branch,
    disabled
)'

echo ""
echo "Detailed Information:"
echo "===================="
gcloud builds triggers describe "$TRIGGER_NAME" --format='yaml'

echo ""
echo "Service Account:"
echo "================"
SERVICE_ACCOUNT=$(gcloud builds triggers describe "$TRIGGER_NAME" --format='value(serviceAccountId)')
echo "Service Account: $SERVICE_ACCOUNT"

# Verify service account exists
if gcloud iam service-accounts describe "$SERVICE_ACCOUNT" &> /dev/null; then
    echo "✓ Service account exists"
else
    echo "❌ ERROR: Service account not found: $SERVICE_ACCOUNT"
    exit 1
fi

echo ""
echo "GitHub Configuration:"
echo "===================="
REPO_OWNER=$(gcloud builds triggers describe "$TRIGGER_NAME" --format='value(github.owner)')
REPO_NAME=$(gcloud builds triggers describe "$TRIGGER_NAME" --format='value(github.name)')
BRANCH_PATTERN=$(gcloud builds triggers describe "$TRIGGER_NAME" --format='value(github.branch)')

echo "Repository Owner: $REPO_OWNER"
echo "Repository Name: $REPO_NAME"
echo "Branch Pattern: $BRANCH_PATTERN"

echo ""
echo "Build Configuration:"
echo "==================="
BUILD_CONFIG=$(gcloud builds triggers describe "$TRIGGER_NAME" --format='value(filename)')
echo "Build Config File: $BUILD_CONFIG"

# Check if cloudbuild.yaml exists in repo
if [ -f "cloudbuild.yaml" ]; then
    echo "✓ cloudbuild.yaml found in repository"
else
    echo "⚠ WARNING: cloudbuild.yaml not found in current directory"
fi

echo ""
echo "Recent Builds:"
echo "=============="
echo "Last 5 builds triggered by this trigger:"
gcloud builds list --filter="substitutions._TRIGGER_NAME=$TRIGGER_NAME" --limit=5 --format='table(
    id,
    status,
    createTime,
    duration
)'

echo ""
echo "=========================================="
echo "✓ Verification Complete"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Push code to main branch to trigger a build"
echo "2. Monitor build: gcloud builds log --stream BUILD_ID"
echo "3. Check Cloud Run deployment after build succeeds"
