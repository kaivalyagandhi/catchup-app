# Task 18: Configure Environment and Secrets - Quick Start

## What This Task Does

Configures the Cloud Run service with environment variables and secrets from Google Secret Manager. This ensures the application has access to all required configuration and credentials.

## Quick Steps

### 1. Verify Secrets Exist

```bash
./scripts/verify-secrets-exist.sh
```

If any secrets are missing, create them:

```bash
echo -n "YOUR_VALUE" | gcloud secrets create SECRET_NAME --data-file=-
```

### 2. Get Your Cloud Run Service URL

```bash
gcloud run services describe catchup --region=us-central1 --format='value(status.url)'
```

### 3. Run Configuration Script

```bash
./scripts/configure-cloud-run-secrets.sh PROJECT_ID https://YOUR_CLOUD_RUN_URL
```

Replace:
- `PROJECT_ID` with your GCP project ID
- `https://YOUR_CLOUD_RUN_URL` with the URL from step 2

### 4. Verify Configuration

```bash
# Check environment variables
gcloud run services describe catchup --region=us-central1 --format=json | jq '.spec.template.spec.containers[0].env'

# Check secrets
gcloud run services describe catchup --region=us-central1 --format=json | jq '.spec.template.spec.containers[0].envFrom'

# Test health check
curl https://YOUR_CLOUD_RUN_URL/health
```

## What Gets Configured

### Environment Variables (Plain Text)
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `PORT=3000`
- `DATABASE_HOST=/cloudsql/PROJECT_ID:us-central1:catchup-db`
- `DATABASE_PORT=5432`
- `DATABASE_NAME=catchup_db`
- `GOOGLE_REDIRECT_URI=https://YOUR_CLOUD_RUN_URL/auth/google/callback`

### Secrets (From Secret Manager)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `GOOGLE_CLOUD_API_KEY` (optional)
- `GOOGLE_GEMINI_API_KEY` (optional)
- `TWILIO_ACCOUNT_SID` (optional)
- `TWILIO_AUTH_TOKEN` (optional)
- `TWILIO_PHONE_NUMBER` (optional)
- `SENDGRID_API_KEY` (optional)
- `SENDGRID_FROM_EMAIL` (optional)

## Troubleshooting

### Secret Not Found

```bash
# List all secrets
gcloud secrets list

# Create missing secret
echo -n "VALUE" | gcloud secrets create SECRET_NAME --data-file=-

# Grant service account access
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member=serviceAccount:catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Health Check Not Responding

```bash
# Check application logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=catchup" --limit=20

# Check service status
gcloud run services describe catchup --region=us-central1
```

### Permission Denied

```bash
# Grant service account access to all secrets
for secret in google-oauth-client-id google-oauth-client-secret database-user db-password jwt-secret encryption-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member=serviceAccount:catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com \
    --role=roles/secretmanager.secretAccessor
done
```

## Documentation

For detailed information, see:
- `.kiro/specs/google-cloud-deployment/TASK_18_ENVIRONMENT_SECRETS_GUIDE.md` - Step-by-step guide
- `.kiro/specs/google-cloud-deployment/ENVIRONMENT_CONFIGURATION_REFERENCE.md` - Complete reference
- `TASK_18_ENVIRONMENT_SECRETS_COMPLETION.md` - Completion report

## Next Task

After completing this task, proceed to:
- **Task 19**: Configure health check
- **Task 20**: Deploy to Cloud Run
- **Task 21**: Verify secrets are stored and accessible
