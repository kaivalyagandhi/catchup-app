# GCP Service Accounts and IAM Roles Setup Guide

## Overview

This guide walks you through creating two service accounts for the CatchUp deployment:

1. **Cloud Run Service Account** - Runs the application and accesses secrets/database
2. **Cloud Build Service Account** - Builds images and deploys to Cloud Run

## Prerequisites

- GCP project created and selected
- Required APIs enabled (from Task 1)
- Access to Google Cloud Console

## Part 1: Create Cloud Run Service Account

### Step 1: Navigate to Service Accounts

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. In the left sidebar, click **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **Service Account**

### Step 2: Create the Service Account

1. **Service account name:** `catchup-cloud-run`
2. **Service account ID:** `catchup-cloud-run` (auto-filled)
3. **Description:** "Service account for CatchUp Cloud Run application"
4. Click **Create and Continue**

### Step 3: Grant Cloud Run Service Account Permissions

On the "Grant this service account access to project" screen, add these roles:

**Role 1: Cloud SQL Client**
- Search for "Cloud SQL Client"
- Select `roles/cloudsql.client`
- Click **Continue**

**Role 2: Secret Accessor**
- Click **Add Another Role**
- Search for "Secret Accessor"
- Select `roles/secretmanager.secretAccessor`
- Click **Continue**

**Role 3: Cloud Logging Log Writer** (optional but recommended)
- Click **Add Another Role**
- Search for "Cloud Logging Log Writer"
- Select `roles/logging.logWriter`
- Click **Done**

### Step 4: Verify Cloud Run Service Account

1. You should see the service account listed in the Credentials page
2. Click on `catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com`
3. Verify the roles are assigned:
   - Cloud SQL Client
   - Secret Accessor
   - Cloud Logging Log Writer

**Screenshot/Confirmation Needed:** Take a screenshot showing the service account and its roles, or confirm in chat that you've completed this step.

---

## Part 2: Create Cloud Build Service Account

### Step 1: Create the Service Account

1. Go back to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**

### Step 2: Create the Service Account

1. **Service account name:** `catchup-cloud-build`
2. **Service account ID:** `catchup-cloud-build` (auto-filled)
3. **Description:** "Service account for CatchUp Cloud Build pipeline"
4. Click **Create and Continue**

### Step 3: Grant Cloud Build Service Account Permissions

On the "Grant this service account access to project" screen, add these roles:

**Role 1: Artifact Registry Writer**
- Search for "Artifact Registry Writer"
- Select `roles/artifactregistry.writer`
- Click **Continue**

**Role 2: Cloud Run Admin**
- Click **Add Another Role**
- Search for "Cloud Run Admin"
- Select `roles/run.admin`
- Click **Continue**

**Role 3: Cloud SQL Client** (for running migrations)
- Click **Add Another Role**
- Search for "Cloud SQL Client"
- Select `roles/cloudsql.client`
- Click **Continue**

**Role 4: Service Account User**
- Click **Add Another Role**
- Search for "Service Account User"
- Select `roles/iam.serviceAccountUser`
- Click **Done**

### Step 4: Verify Cloud Build Service Account

1. You should see the service account listed in the Credentials page
2. Click on `catchup-cloud-build@PROJECT_ID.iam.gserviceaccount.com`
3. Verify the roles are assigned:
   - Artifact Registry Writer
   - Cloud Run Admin
   - Cloud SQL Client
   - Service Account User

**Screenshot/Confirmation Needed:** Take a screenshot showing the service account and its roles, or confirm in chat that you've completed this step.

---

## Part 3: Verify IAM Configuration

### Step 1: Check IAM Bindings

1. Go to **IAM & Admin** → **IAM**
2. Look for both service accounts in the list:
   - `catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com`
   - `catchup-cloud-build@PROJECT_ID.iam.gserviceaccount.com`
3. Verify each has the correct roles assigned

### Step 2: Document Service Account Emails

You'll need these email addresses for later tasks. Save them:

```
Cloud Run Service Account Email: catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com
Cloud Build Service Account Email: catchup-cloud-build@PROJECT_ID.iam.gserviceaccount.com
```

Replace `PROJECT_ID` with your actual GCP project ID.

---

## Verification Checklist

- [ ] Cloud Run service account created with name `catchup-cloud-run`
- [ ] Cloud Run service account has `Cloud SQL Client` role
- [ ] Cloud Run service account has `Secret Accessor` role
- [ ] Cloud Run service account has `Cloud Logging Log Writer` role
- [ ] Cloud Build service account created with name `catchup-cloud-build`
- [ ] Cloud Build service account has `Artifact Registry Writer` role
- [ ] Cloud Build service account has `Cloud Run Admin` role
- [ ] Cloud Build service account has `Cloud SQL Client` role
- [ ] Cloud Build service account has `Service Account User` role
- [ ] Both service accounts visible in IAM & Admin → IAM page
- [ ] Service account email addresses documented

---

## Troubleshooting

### "Role not found" error
- Make sure you're searching for the exact role name
- Some roles may have different names in different regions
- Try searching by role ID (e.g., `roles/cloudsql.client`)

### Service account not appearing in IAM list
- Refresh the page
- Make sure you're in the correct project
- Check that the service account was created successfully

### Permission denied errors later
- Verify the service account has all required roles
- Check that the roles are assigned at the project level (not resource level)
- Wait a few minutes for IAM changes to propagate

---

## Next Steps

Once you've completed this task and confirmed all service accounts and roles are set up:

1. Document the service account email addresses
2. Move to Task 3: Set up Google Secret Manager
3. The service accounts will be used in Cloud Build and Cloud Run configuration

---

## Requirements Validation

This task validates the following requirements:

- **Requirement 3.1:** Service accounts will retrieve credentials from Secret Manager
- **Requirement 3.2:** Service accounts will inject credentials as environment variables
- **Requirement 12.2:** IAM roles are properly configured for secure access

