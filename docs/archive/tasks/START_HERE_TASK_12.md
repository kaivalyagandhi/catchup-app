# Task 12: Configure Cloud Build Trigger - START HERE

## What You Need to Do

Configure a Cloud Build trigger that automatically builds and deploys your application whenever you push code to the main branch on GitHub.

## Quick Start (2 minutes)

### Step 1: Run the Setup Script
```bash
./scripts/setup-cloud-build-trigger.sh
```

The script will:
- Ask for your GitHub username/organization
- Ask for your GitHub repository name
- Create the Cloud Build trigger
- Show you the configuration

### Step 2: Verify It Works
```bash
./scripts/verify-cloud-build-trigger.sh
```

This will confirm the trigger is properly configured.

### Done! 🎉

Your trigger is now active. When you push code to main, it will automatically build and deploy.

---

## If You Prefer Manual Setup

Run this command (replace the placeholders):

```bash
gcloud builds triggers create github \
  --name=catchup-main-deploy \
  --repo-name=YOUR_REPO_NAME \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern=^main$ \
  --build-config=cloudbuild.yaml \
  --service-account=projects/YOUR_PROJECT_ID/serviceAccounts/catchup-cloud-build@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

Then verify:
```bash
gcloud builds triggers describe catchup-main-deploy
```

---

## What Happens Next

When you push code to main:

1. GitHub notifies Cloud Build
2. Cloud Build trigger fires
3. `cloudbuild.yaml` runs:
   - Installs dependencies
   - Runs tests
   - Builds Docker image
   - Pushes to Artifact Registry
   - Deploys to Cloud Run (in later tasks)
4. You can monitor the build in Cloud Build console

---

## Useful Commands

```bash
# List all triggers
gcloud builds triggers list

# View trigger details
gcloud builds triggers describe catchup-main-deploy

# Manually trigger a build (for testing)
gcloud builds triggers run catchup-main-deploy --branch=main

# View recent builds
gcloud builds list --limit=5

# Monitor a build in real-time
gcloud builds log --stream BUILD_ID
```

---

## Troubleshooting

### "Repository not found"
→ Connect your GitHub repo in [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)

### "Service account not found"
→ Make sure you completed Task 2 (create service accounts)

### "Trigger not firing when I push"
→ Check GitHub webhook in your repository settings → Webhooks

### Need more help?
→ Read: `.kiro/specs/google-cloud-deployment/TASK_12_CLOUD_BUILD_TRIGGER_GUIDE.md`

---

## Documentation

- **Quick Reference:** `TASK_12_QUICK_REFERENCE.md`
- **Full Guide:** `.kiro/specs/google-cloud-deployment/TASK_12_CLOUD_BUILD_TRIGGER_GUIDE.md`
- **Implementation Details:** `TASK_12_IMPLEMENTATION_SUMMARY.md`
- **Completion Report:** `TASK_12_COMPLETION_REPORT.md`

---

## Prerequisites Checklist

Before starting, make sure you have:

- [ ] Completed Task 1 (GCP project setup)
- [ ] Completed Task 2 (service accounts)
- [ ] Completed Task 3 (secrets)
- [ ] Completed Task 11 (cloudbuild.yaml)
- [ ] GitHub repository created
- [ ] `gcloud` CLI installed
- [ ] Authenticated with GCP: `gcloud auth login`
- [ ] Project configured: `gcloud config set project PROJECT_ID`

---

## Next Steps

After this task:

1. **Task 13:** Add test execution to pipeline
2. **Task 14:** Add image push to Artifact Registry
3. **Task 15:** Add Cloud Run deployment to pipeline

---

## Summary

✅ **Task 12 is ready to implement**

**Start here:** `./scripts/setup-cloud-build-trigger.sh`

**Verify here:** `./scripts/verify-cloud-build-trigger.sh`

**Questions?** See the full guide: `.kiro/specs/google-cloud-deployment/TASK_12_CLOUD_BUILD_TRIGGER_GUIDE.md`
