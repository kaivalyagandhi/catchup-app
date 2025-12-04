# Environment Configuration Reference

## Overview

This document provides a comprehensive reference for all environment variables and secrets required to run CatchUp on Google Cloud Platform.

## Environment Variables (Plain Text)

These variables are set directly on the Cloud Run service and are not sensitive.

### Application Configuration

| Variable | Value | Description | Required |
|----------|-------|-------------|----------|
| `NODE_ENV` | `production` | Node.js environment | Yes |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) | Yes |
| `PORT` | `3000` | Port the application listens on | Yes |

### Database Configuration

| Variable | Value | Description | Required |
|----------|-------|-------------|----------|
| `DATABASE_HOST` | `/cloudsql/PROJECT_ID:us-central1:catchup-db` | Cloud SQL connection string | Yes |
| `DATABASE_PORT` | `5432` | PostgreSQL port | Yes |
| `DATABASE_NAME` | `catchup_db` | Database name | Yes |
| `DATABASE_USER` | From Secret Manager | Database username | Yes (secret) |
| `DATABASE_PASSWORD` | From Secret Manager | Database password | Yes (secret) |

### Google OAuth Configuration

| Variable | Value | Description | Required |
|----------|-------|-------------|----------|
| `GOOGLE_CLIENT_ID` | From Secret Manager | Google OAuth client ID | Yes (secret) |
| `GOOGLE_CLIENT_SECRET` | From Secret Manager | Google OAuth client secret | Yes (secret) |
| `GOOGLE_REDIRECT_URI` | `https://YOUR_CLOUD_RUN_URL/auth/google/callback` | OAuth redirect URI | Yes |

### Security Configuration

| Variable | Value | Description | Required |
|----------|-------|-------------|----------|
| `JWT_SECRET` | From Secret Manager | Secret for signing JWT tokens | Yes (secret) |
| `ENCRYPTION_KEY` | From Secret Manager | Key for encrypting OAuth tokens | Yes (secret) |

### Google Cloud APIs

| Variable | Value | Description | Required |
|----------|-------|-------------|----------|
| `GOOGLE_CLOUD_API_KEY` | From Secret Manager | API key for Google Cloud APIs | No (secret) |
| `GOOGLE_GEMINI_API_KEY` | From Secret Manager | API key for Google Gemini | No (secret) |

### Twilio SMS Configuration

| Variable | Value | Description | Required |
|----------|-------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | From Secret Manager | Twilio account SID | No (secret) |
| `TWILIO_AUTH_TOKEN` | From Secret Manager | Twilio auth token | No (secret) |
| `TWILIO_PHONE_NUMBER` | From Secret Manager | Twilio phone number | No (secret) |

### SendGrid Email Configuration

| Variable | Value | Description | Required |
|----------|-------|-------------|----------|
| `SENDGRID_API_KEY` | From Secret Manager | SendGrid API key | No (secret) |
| `SENDGRID_FROM_EMAIL` | From Secret Manager | SendGrid from email address | No (secret) |

## Secrets in Google Secret Manager

These are sensitive values stored in Google Secret Manager and injected as environment variables.

### Required Secrets

| Secret Name | Environment Variable | Description | Example |
|-------------|----------------------|-------------|---------|
| `google-oauth-client-id` | `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123456789-abc.apps.googleusercontent.com` |
| `google-oauth-client-secret` | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-abc123xyz...` |
| `database-user` | `DATABASE_USER` | PostgreSQL username | `catchup_user` |
| `db-password` | `DATABASE_PASSWORD` | PostgreSQL password | `secure_password_here` |
| `jwt-secret` | `JWT_SECRET` | JWT signing secret (min 32 chars) | `your-secret-key-min-32-characters` |
| `encryption-key` | `ENCRYPTION_KEY` | AES-256 encryption key (64 hex chars) | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` |

### Optional Secrets

| Secret Name | Environment Variable | Description | Example |
|-------------|----------------------|-------------|---------|
| `google-cloud-api-key` | `GOOGLE_CLOUD_API_KEY` | Google Cloud API key | `AIzaSyD...` |
| `google-gemini-api-key` | `GOOGLE_GEMINI_API_KEY` | Google Gemini API key | `AIzaSyD...` |
| `twilio-account-sid` | `TWILIO_ACCOUNT_SID` | Twilio account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `twilio-auth-token` | `TWILIO_AUTH_TOKEN` | Twilio auth token | `your_auth_token_here` |
| `twilio-phone-number` | `TWILIO_PHONE_NUMBER` | Twilio phone number | `+1234567890` |
| `sendgrid-api-key` | `SENDGRID_API_KEY` | SendGrid API key | `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `sendgrid-from-email` | `SENDGRID_FROM_EMAIL` | SendGrid from email | `noreply@catchup.app` |

## Creating Secrets in Google Secret Manager

### Create a Secret

```bash
echo -n "YOUR_SECRET_VALUE" | gcloud secrets create SECRET_NAME --data-file=-
```

### Update a Secret

```bash
echo -n "NEW_SECRET_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-
```

### View a Secret

```bash
gcloud secrets versions access latest --secret=SECRET_NAME
```

### Delete a Secret

```bash
gcloud secrets delete SECRET_NAME
```

## Configuring Cloud Run Service

### Set Environment Variables

```bash
gcloud run services update catchup \
  --region=us-central1 \
  --set-env-vars=\
NODE_ENV=production,\
LOG_LEVEL=info,\
PORT=3000,\
DATABASE_HOST=/cloudsql/PROJECT_ID:us-central1:catchup-db,\
DATABASE_PORT=5432,\
DATABASE_NAME=catchup_db,\
GOOGLE_REDIRECT_URI=https://YOUR_CLOUD_RUN_URL/auth/google/callback
```

### Set Secrets

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

## Verification

### Check Environment Variables

```bash
gcloud run services describe catchup --region=us-central1 --format=json | jq '.spec.template.spec.containers[0].env'
```

### Check Secrets

```bash
gcloud run services describe catchup --region=us-central1 --format=json | jq '.spec.template.spec.containers[0].envFrom'
```

### Verify Service Account Access

```bash
gcloud secrets get-iam-policy SECRET_NAME
```

The Cloud Run service account (`catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com`) should have the `roles/secretmanager.secretAccessor` role.

## Security Best Practices

1. **Never commit secrets to version control** - Use `.env.example` with placeholder values
2. **Use Secret Manager for production** - Never hardcode secrets in code or environment
3. **Rotate secrets regularly** - Update secrets periodically for security
4. **Audit secret access** - Monitor who accesses secrets via Cloud Logging
5. **Use least privilege** - Grant only necessary permissions to service accounts
6. **Encrypt secrets in transit** - Always use HTTPS for API calls
7. **Never log secrets** - Ensure application doesn't log sensitive values

## Troubleshooting

### Secret Not Found

If you get "Secret not found" error:

```bash
# List all secrets
gcloud secrets list

# Create the missing secret
echo -n "VALUE" | gcloud secrets create SECRET_NAME --data-file=-
```

### Permission Denied

If you get "Permission denied" error:

```bash
# Grant service account access to secret
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member=serviceAccount:catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Application Fails to Start

Check logs for environment variable validation errors:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=catchup" \
  --limit=20 --format=json
```

## References

- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Cloud Run Secrets](https://cloud.google.com/run/docs/configuring/secrets)
- [Google Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy)
