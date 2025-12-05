# Task 12: Cloud Build Trigger - Quick Reference

## One-Line Setup

```bash
./scripts/setup-cloud-build-trigger.sh
```

## One-Line Verification

```bash
./scripts/verify-cloud-build-trigger.sh
```

## Manual Setup (One Command)

```bash
gcloud builds triggers create github \
  --name=catchup-main-deploy \
  --repo-name=REPO_NAME \
  --repo-owner=GITHUB_USERNAME \
  --branch-pattern=^main$ \
  --build-config=cloudbuild.yaml \
  --service-account=projects/PROJECT_ID/serviceAccounts/catchup-cloud-build@PROJECT_ID.iam.gserviceaccount.com
```

## Useful Commands

| Command | Purpose |
|---------|---------|
| `gcloud builds triggers list` | List all triggers |
| `gcloud builds triggers describe catchup-main-deploy` | View trigger details |
| `gcloud builds triggers run catchup-main-deploy --branch=main` | Manually trigger a build |
| `gcloud builds list --limit=5` | View recent builds |
| `gcloud builds log --stream BUILD_ID` | Monitor a build in real-time |
| `gcloud builds log BUILD_ID` | View completed build logs |

## Trigger Configuration

```
Name:              catchup-main-deploy
Repository:        Your GitHub repo
Branch Pattern:    ^main$
Build Config:      cloudbuild.yaml
Service Account:   catchup-cloud-build@PROJECT_ID.iam.gserviceaccount.com
```

## What Happens When You Push

1. Code pushed to main branch
2. GitHub webhook notifies Cloud Build
3. Cloud Build trigger fires
4. `cloudbuild.yaml` steps execute:
   - Install dependencies
   - Run tests
   - Build Docker image
   - Push to Artifact Registry
   - Deploy to Cloud Run (later tasks)
5. Build logs available in Cloud Build console

## Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| "Repository not found" | Connect GitHub repo in Cloud Console |
| "Service account not found" | Create service account from Task 2 |
| "Trigger not firing" | Check GitHub webhook in repo settings |
| "Build fails" | Check `cloudbuild.yaml` syntax and permissions |

## Documentation

- **Full Guide:** `.kiro/specs/google-cloud-deployment/TASK_12_CLOUD_BUILD_TRIGGER_GUIDE.md`
- **Implementation:** `TASK_12_IMPLEMENTATION_SUMMARY.md`
- **Deliverables:** `TASK_12_DELIVERABLES.md`

## Status

✅ Task 12 Complete - Ready to use

## Next Task

Task 13: Add test execution to pipeline
