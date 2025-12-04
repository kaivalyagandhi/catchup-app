#!/bin/bash

# Task 12: Setup Cloud Build Trigger
# This script creates and configures the Cloud Build trigger for GitHub

set -e

echo "=========================================="
echo "Cloud Build Trigger Setup"
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
    echo "❌ ERROR: No GCP project configured."
    echo "Run: gcloud config set project PROJECT_ID"
    exit 1
fi

echo "✓ GCP Project: $PROJECT_ID"
echo ""

# Prompt for GitHub details
echo "GitHub Repository Configuration"
echo "==============================="
read -p "Enter GitHub username or organization: " GITHUB_USERNAME
read -p "Enter GitHub repository name: " REPO_NAME

if [ -z "$GITHUB_USERNAME" ] || [ -z "$REPO_NAME" ]; then
    echo "❌ ERROR: GitHub username and repository name are required"
    exit 1
fi

echo ""
echo "Configuration Summary:"
echo "====================="
echo "GCP Project: $PROJECT_ID"
echo "GitHub Owner: $GITHUB_USERNAME"
echo "GitHub Repo: $REPO_NAME"
echo "Trigger Name: catchup-main-deploy"
echo "Branch Pattern: ^main$"
echo "Build Config: cloudbuild.yaml"
echo ""

read -p "Continue with this configuration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo "Setting up Cloud Build trigger..."
echo ""

# Verify service account exists
SERVICE_ACCOUNT="catchup-cloud-build@${PROJECT_ID}.iam.gserviceaccount.com"
echo "Verifying service account: $SERVICE_ACCOUNT"

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT" &> /dev/null; then
    echo "❌ ERROR: Service account not found: $SERVICE_ACCOUNT"
    echo ""
    echo "Please complete Task 2 first to create the service account:"
    echo "gcloud iam service-accounts create catchup-cloud-build \\"
    echo "  --display-name=\"CatchUp Cloud Build Service Account\""
    exit 1
fi

echo "✓ Service account exists"
echo ""

# Check if trigger already exists
TRIGGER_NAME="catchup-main-deploy"
if gcloud builds triggers describe "$TRIGGER_NAME" &> /dev/null; then
    echo "⚠ WARNING: Trigger '$TRIGGER_NAME' already exists"
    read -p "Delete and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deleting existing trigger..."
        gcloud builds triggers delete "$TRIGGER_NAME" --quiet
        echo "✓ Trigger deleted"
    else
        echo "Setup cancelled."
        exit 0
    fi
fi

echo ""
echo "Creating Cloud Build trigger..."
echo ""

# Create the trigger
gcloud builds triggers create github \
  --name="$TRIGGER_NAME" \
  --repo-name="$REPO_NAME" \
  --repo-owner="$GITHUB_USERNAME" \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml \
  --service-account="projects/${PROJECT_ID}/serviceAccounts/${SERVICE_ACCOUNT}"

echo ""
echo "✓ Trigger created successfully"
echo ""

# Verify trigger
echo "Verifying trigger configuration..."
echo ""
gcloud builds triggers describe "$TRIGGER_NAME" --format='table(
    name,
    filename,
    github.owner,
    github.name,
    github.branch,
    disabled
)'

echo ""
echo "=========================================="
echo "✓ Setup Complete"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Verify trigger: ./scripts/verify-cloud-build-trigger.sh"
echo "2. Push code to main branch to trigger a build"
echo "3. Monitor build: gcloud builds log --stream BUILD_ID"
echo ""
echo "Useful Commands:"
echo "- List triggers: gcloud builds triggers list"
echo "- View trigger: gcloud builds triggers describe catchup-main-deploy"
echo "- Manual trigger: gcloud builds triggers run catchup-main-deploy --branch=main"
echo "- View logs: gcloud builds log --stream BUILD_ID"
