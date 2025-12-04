# Task 12: Configure Cloud Build Trigger - Implementation Guide

## Overview

Task 12 configures a Cloud Build trigger that automatically builds and deploys the CatchUp application whenever code is pushed to the main branch on GitHub.

**Requirement:** 4.1 - WHEN code is pushed to the main branch THEN the system SHALL automatically trigger a deployment pipeline

## Prerequisites

Before starting this task, ensure:

1. ✅ Task 1-3 completed: GCP project setup, service accounts, and secrets configured
2. ✅ Task 11 completed: `cloudbuild.yaml` created and Artifact Registry repository set up
3. ✅ GitHub repository exists and is accessible
4. ✅ `gcloud` CLI installed and authenticated: `gcloud auth login`
5. ✅ GCP project set: `gcloud config set project PROJECT_ID`

## Step 1: Connect GitHub Repository to GCP

Before creating a trigger, you need to connect your GitHub repository to GCP.

### Option A: Using Cloud Console (Recommended for First-Time Setup)

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click **Create Trigger**
3. Select **GitHub** as the source
4. Click **Authenticate with GitHub** and authorize GCP to access your repositories
5. Select your repository from the list
6. Click **Connect Repository**

### Option B: Using gcloud CLI

If you've already connected your repository, skip to Step 2.

## Step 2: Create the Cloud Build Trigger

Replace the placeholders in the command below:
- `PROJECT_ID`: Your GCP project ID
- `REPO_NAME`: Your GitHub repository name (e.g., `catchup`)
- `GITHUB_USERNAME`: Your GitHub username or organization name

```bash
gcloud builds triggers create github \
  --name=catchup-main-deploy \
  --repo-name=REPO_NAME \
  --repo-owner=GITHUB_USERNAME \
  --branch-pattern=^main$ \
  --build-config=cloudbuild.yaml \
  --service-account=projects/PROJECT_ID/serviceAccounts/catchup-cloud-build@PROJECT_ID.iam.gserviceaccount.com
```

### Example Command

```bash
gcloud builds triggers create github \
  --name=catchup-main-deploy \
  --repo-name=catchup \
  --repo-owner=my-github-username \
  --branch-pattern=^main$ \
  --build-config=cloudbuild.yaml \
  --service-account=projects/my-project-123/serviceAccounts/catchup-cloud-build@my-project-123.iam.gserviceaccount.com
```

### Command Explanation

| Parameter | Purpose |
|-----------|---------|
| `--name=catchup-main-deploy` | Unique name for this trigger |
| `--repo-name=REPO_NAME` | GitHub repository name |
| `--repo-owner=GITHUB_USERNAME` | GitHub username or organization |
| `--branch-pattern=^main$` | Regex pattern to match main branch only |
| `--build-config=cloudbuild.yaml` | Path to build configuration file in repo |
| `--service-account=...` | Service account for Cloud Build to use |

## Step 3: Verify Trigger Creation

List all triggers to confirm creation:

```bash
gcloud builds triggers list
```

Expected output should include:
```
NAME                  DESCRIPTION  FILENAME             DISABLED
catchup-main-deploy                cloudbuild.yaml      False
```

## Step 4: Describe the Trigger

Get detailed information about the trigger:

```bash
gcloud builds triggers describe catchup-main-deploy
```

Expected output should show:
```
createTime: '2025-01-XX...'
description: ''
disabled: false
filename: cloudbuild.yaml
github:
  branch: ^main$
  owner: GITHUB_USERNAME
  name: REPO_NAME
id: TRIGGER_ID
name: catchup-main-deploy
serviceAccountId: catchup-cloud-build@PROJECT_ID.iam.gserviceaccount.com
```

## Step 5: Test the Trigger (Optional)

To test the trigger without pushing code:

```bash
gcloud builds triggers run catchup-main-deploy --branch=main
```

This will manually trigger a build. Monitor it:

```bash
gcloud builds log --stream $(gcloud builds list --limit=1 --format='value(id)')
```

## Troubleshooting

### Error: "Repository not found"

**Cause:** GitHub repository not connected to GCP

**Solution:**
1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click **Connect Repository**
3. Authenticate with GitHub and select your repository

### Error: "Service account not found"

**Cause:** Cloud Build service account doesn't exist

**Solution:**
Verify the service account exists:
```bash
gcloud iam service-accounts list | grep catchup-cloud-build
```

If not found, create it (from Task 2):
```bash
gcloud iam service-accounts create catchup-cloud-build \
  --display-name="CatchUp Cloud Build Service Account"
```

### Error: "Invalid branch pattern"

**Cause:** Branch pattern regex is incorrect

**Solution:**
- Use `^main$` for exact match on "main" branch
- Use `^develop$` for develop branch
- Use `^.*$` for all branches

### Trigger Not Firing on Push

**Cause:** GitHub webhook not configured

**Solution:**
1. Go to your GitHub repository settings
2. Click **Webhooks**
3. Verify a webhook exists for `cloudbuild.googleapis.com`
4. If missing, recreate the trigger in Cloud Console to auto-configure webhook

## Validation Checklist

After completing this task, verify:

- [ ] Trigger appears in `gcloud builds triggers list`
- [ ] Trigger details show correct repository and branch pattern
- [ ] Service account is correctly assigned
- [ ] `cloudbuild.yaml` path is correct
- [ ] GitHub webhook is configured (check GitHub repo settings)
- [ ] Manual trigger test succeeds (optional)

## Next Steps

After completing this task:

1. **Task 13:** Add test execution to pipeline
2. **Task 14:** Add image push to Artifact Registry
3. **Task 15:** Add Cloud Run deployment to pipeline

## References

- [Cloud Build Triggers Documentation](https://cloud.google.com/build/docs/automating-builds/create-manage-triggers)
- [GitHub Integration Guide](https://cloud.google.com/build/docs/automating-builds/github/connect-repo-github)
- [gcloud builds triggers create github](https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github)

## Notes

- The trigger will automatically fire when code is pushed to the main branch
- Each push will trigger a new build using the `cloudbuild.yaml` configuration
- Build logs are available in Cloud Build console or via `gcloud builds log`
- The service account must have permissions to push to Artifact Registry and deploy to Cloud Run (configured in Task 2)
