# Task 18: Configure Environment and Secrets

## Overview

This guide explains how to configure the Cloud Run service with environment variables and secrets from Google Secret Manager. This task implements Requirements 3.1, 3.2, 7.1, and 7.2.

## Prerequisites

Before starting this task, ensure:
- Cloud Run service `catchup` is created (Task 16)
- Cloud SQL instance `catchup-db` is created (Task 4)
- Secrets are stored in Google Secret Manager (Task 3)
- You have the correct GCP project ID

## Environment Variables vs Secrets

### Environment Variables (Plain Text)
These are non-sensitive configuration values set directly on the Cloud Run service:
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `PORT=3000`
- `DATABASE_HOST=<Cloud SQL proxy connection>`
- `DATABASE_NAME=catchup_db`
- `DATABASE_PORT=5432`

### Secrets (From Secret Manager)
These are sensitive credentials retrieved from Google Secret Manager:
- `GOOGLE_CLIENT_ID` ← from `google-oauth-client-id` secret
- `GOOGLE_CLIENT_SECRET` ← from `google-oauth-client-secret` secret
- `DATABASE_USER` ← from `database-user` secret
- `DATABASE_PASSWORD` ← from `db-password` secret
- `JWT_SECRET` ← from `jwt-secret` secret
- `ENCRYPTION_KEY` ← from `encryption-key` secret
- `GOOGLE_CLOUD_API_KEY` ← from `google-cloud-api-key` secret
- `GOOGLE_GEMINI_API_KEY` ← from `google-gemini-api-key` secret
- `TWILIO_ACCOUNT_SID` ← from `twilio-account-sid` secret
- `TWILIO_AUTH_TOKEN` ← from `twilio-auth-token` secret
- `TWILIO_PHONE_NUMBER` ← from `twilio-phone-number` secret
- `SENDGRID_API_KEY` ← from `sendgrid-api-key` secret
- `SENDGRID_FROM_EMAIL` ← from `sendgrid-from-email` secret
- `GOOGLE_REDIRECT_URI` ← from `google-redirect-uri` secret

## Step 1: Get Cloud SQL Connection String

First, get the Cloud SQL instance connection name:

```bash
gcloud sql instances describe catchup-db --format='value(connectionName)'
```

This will output something like: `PROJECT_ID:us-central1:catchup-db`

Store this value as `CLOUD_SQL_CONNECTION_NAME` for use in the next steps.

## Step 2: Update Cloud Run Service with Environment Variables

Update the Cloud Run service with plain-text environment variables:

```bash
gcloud run services update catchup \
  --region=us-central1 \
  --set-env-vars=\
NODE_ENV=production,\
LOG_LEVEL=info,\
PORT=3000,\
DATABASE_HOST=/cloudsql/CLOUD_SQL_CONNECTION_NAME,\
DATABASE_PORT=5432,\
DATABASE_NAME=catchup_db,\
GOOGLE_REDIRECT_URI=https://YOUR_CLOUD_RUN_URL/auth/google/callback
```

Replace:
- `CLOUD_SQL_CONNECTION_NAME` with the value from Step 1
- `YOUR_CLOUD_RUN_URL` with your Cloud Run service URL (e.g., `https://catchup-abc123.run.app`)

## Step 3: Update Cloud Run Service with Secrets

Update the Cloud Run service to inject secrets from Secret Manager:

```bash
gcloud run services update catchup \
  --region=us-central1 \
  --update-secrets=\
GOOGLE_CLIENT_ID=google-oauth-client-id:latest,\
GOOGLE_CLIENT_SECRET=google-oauth-client-secret:latest,\
DATABASE_USER=database-user:latest,\
DATABASE_PASSWORD=db-password:latest,\
JWT_SECRET=jwt-secret:latest,\
ENCRYPTION_KEY=encryption-key:latest,\
GOOGLE_CLOUD_API_KEY=google-cloud-api-key:latest,\
GOOGLE_GEMINI_API_KEY=google-gemini-api-key:latest,\
TWILIO_ACCOUNT_SID=twilio-account-sid:latest,\
TWILIO_AUTH_TOKEN=twilio-auth-token:latest,\
TWILIO_PHONE_NUMBER=twilio-phone-number:latest,\
SENDGRID_API_KEY=sendgrid-api-key:latest,\
SENDGRID_FROM_EMAIL=sendgrid-from-email:latest
```

**Note:** If any of these secrets don't exist yet, create them first using:

```bash
echo -n "YOUR_SECRET_VALUE" | gcloud secrets create SECRET_NAME --data-file=-
```

## Step 4: Verify Configuration

Verify that all environment variables and secrets are correctly configured:

```bash
gcloud run services describe catchup --region=us-central1
```

Look for:
- `environmentVariables` section showing all plain-text variables
- `secretEnvironmentVariables` section showing all secrets

## Step 5: Verify Secrets Are Accessible

Verify that the Cloud Run service account has access to all secrets:

```bash
# For each secret, check the IAM policy
gcloud secrets get-iam-policy google-oauth-client-id
gcloud secrets get-iam-policy google-oauth-client-secret
gcloud secrets get-iam-policy database-user
gcloud secrets get-iam-policy db-password
gcloud secrets get-iam-policy jwt-secret
gcloud secrets get-iam-policy encryption-key
# ... and so on for other secrets
```

The Cloud Run service account (`catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com`) should have the `roles/secretmanager.secretAccessor` role.

## Step 6: Test Application Startup

Deploy the application and check that it starts successfully:

```bash
# Get the Cloud Run service URL
SERVICE_URL=$(gcloud run services describe catchup --region=us-central1 --format='value(status.url)')

# Test the health check endpoint
curl $SERVICE_URL/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Step 7: Verify Secrets Are Not Logged

Check the Cloud Logging to ensure secrets are not being logged:

```bash
# Check for any logs containing sensitive keywords
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=catchup AND (jsonPayload.message=~'secret' OR jsonPayload.message=~'password' OR jsonPayload.message=~'token' OR jsonPayload.message=~'key')" \
  --limit=50 --format=json
```

If any secrets appear in logs, this indicates a security issue that needs to be fixed.

## Troubleshooting

### "Secret not found" error

If you get an error like "Secret not found: google-oauth-client-id", create the secret first:

```bash
echo -n "YOUR_VALUE" | gcloud secrets create google-oauth-client-id --data-file=-
```

Then grant the Cloud Run service account access:

```bash
gcloud secrets add-iam-policy-binding google-oauth-client-id \
  --member=serviceAccount:catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### "Permission denied" error

If you get a permission error, ensure the Cloud Run service account has access to the secrets:

```bash
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member=serviceAccount:catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Application fails to start

Check the Cloud Logging for startup errors:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=catchup" \
  --limit=20 --format=json
```

Look for environment variable validation errors or missing secrets.

## Verification Checklist

- [ ] Cloud SQL connection string obtained
- [ ] Environment variables set on Cloud Run service
- [ ] Secrets configured on Cloud Run service
- [ ] Cloud Run service account has access to all secrets
- [ ] Health check endpoint responds with 200 status
- [ ] Application logs show successful startup
- [ ] No secrets appear in application logs
- [ ] Database connectivity verified

## Next Steps

After completing this task:
1. Proceed to Task 19: Configure health check
2. Proceed to Task 20: Deploy to Cloud Run
3. Proceed to Task 21: Verify secrets are stored and accessible

## References

- [Cloud Run Environment Variables Documentation](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Cloud Run Secrets Documentation](https://cloud.google.com/run/docs/configuring/secrets)
- [Google Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud SQL Auth Proxy Documentation](https://cloud.google.com/sql/docs/postgres/sql-proxy)
