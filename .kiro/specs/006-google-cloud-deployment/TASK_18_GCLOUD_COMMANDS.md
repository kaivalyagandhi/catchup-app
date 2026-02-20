# Task 18: Exact gcloud Commands

This document contains the exact gcloud commands needed to configure the Cloud Run service with environment variables and secrets.

## Prerequisites

Before running these commands:
1. Set your GCP project ID:
   ```bash
   export PROJECT_ID="your-project-id"
   export CLOUD_RUN_SERVICE="catchup"
   export REGION="us-central1"
   ```

2. Get your Cloud Run service URL:
   ```bash
   export CLOUD_RUN_URL=$(gcloud run services describe $CLOUD_RUN_SERVICE --region=$REGION --format='value(status.url)')
   echo "Cloud Run URL: $CLOUD_RUN_URL"
   ```

3. Get your Cloud SQL connection string:
   ```bash
   export CLOUD_SQL_CONNECTION=$(gcloud sql instances describe catchup-db --format='value(connectionName)')
   echo "Cloud SQL Connection: $CLOUD_SQL_CONNECTION"
   ```

## Step 1: Update Environment Variables

```bash
gcloud run services update $CLOUD_RUN_SERVICE \
  --region=$REGION \
  --set-env-vars=\
NODE_ENV=production,\
LOG_LEVEL=info,\
PORT=3000,\
DATABASE_HOST=/cloudsql/$CLOUD_SQL_CONNECTION,\
DATABASE_PORT=5432,\
DATABASE_NAME=catchup_db,\
GOOGLE_REDIRECT_URI=$CLOUD_RUN_URL/auth/google/callback
```

## Step 2: Update Secrets

```bash
gcloud run services update $CLOUD_RUN_SERVICE \
  --region=$REGION \
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

## Step 3: Verify Configuration

### View Environment Variables

```bash
gcloud run services describe $CLOUD_RUN_SERVICE --region=$REGION --format=json | jq '.spec.template.spec.containers[0].env'
```

Expected output:
```json
[
  {
    "name": "NODE_ENV",
    "value": "production"
  },
  {
    "name": "LOG_LEVEL",
    "value": "info"
  },
  {
    "name": "PORT",
    "value": "3000"
  },
  {
    "name": "DATABASE_HOST",
    "value": "/cloudsql/PROJECT_ID:us-central1:catchup-db"
  },
  {
    "name": "DATABASE_PORT",
    "value": "5432"
  },
  {
    "name": "DATABASE_NAME",
    "value": "catchup_db"
  },
  {
    "name": "GOOGLE_REDIRECT_URI",
    "value": "https://catchup-abc123.run.app/auth/google/callback"
  }
]
```

### View Secrets

```bash
gcloud run services describe $CLOUD_RUN_SERVICE --region=$REGION --format=json | jq '.spec.template.spec.containers[0].envFrom'
```

Expected output:
```json
[
  {
    "secretRef": {
      "name": "GOOGLE_CLIENT_ID"
    }
  },
  {
    "secretRef": {
      "name": "GOOGLE_CLIENT_SECRET"
    }
  },
  ...
]
```

### View Full Service Configuration

```bash
gcloud run services describe $CLOUD_RUN_SERVICE --region=$REGION
```

## Step 4: Verify Service Account Access

### Check Service Account

```bash
export SERVICE_ACCOUNT="catchup-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"
echo "Service Account: $SERVICE_ACCOUNT"
```

### Verify Access to Key Secrets

```bash
# Check google-oauth-client-id
gcloud secrets get-iam-policy google-oauth-client-id --format=json | jq '.bindings[] | select(.members[] | contains("'$SERVICE_ACCOUNT'"))'

# Check db-password
gcloud secrets get-iam-policy db-password --format=json | jq '.bindings[] | select(.members[] | contains("'$SERVICE_ACCOUNT'"))'

# Check encryption-key
gcloud secrets get-iam-policy encryption-key --format=json | jq '.bindings[] | select(.members[] | contains("'$SERVICE_ACCOUNT'"))'
```

Expected output should show `roles/secretmanager.secretAccessor` role.

### Grant Access to All Secrets (if needed)

```bash
for secret in \
  google-oauth-client-id \
  google-oauth-client-secret \
  database-user \
  db-password \
  jwt-secret \
  encryption-key \
  google-cloud-api-key \
  google-gemini-api-key \
  twilio-account-sid \
  twilio-auth-token \
  twilio-phone-number \
  sendgrid-api-key \
  sendgrid-from-email; do
  
  gcloud secrets add-iam-policy-binding $secret \
    --member=serviceAccount:$SERVICE_ACCOUNT \
    --role=roles/secretmanager.secretAccessor
done
```

## Step 5: Test Health Check

```bash
# Test health check endpoint
curl $CLOUD_RUN_URL/health

# Expected response:
# {"status":"healthy","timestamp":"2025-01-15T10:30:00Z"}
```

## Step 6: Check Application Logs

```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$CLOUD_RUN_SERVICE" \
  --limit=20 \
  --format=json

# View only errors
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$CLOUD_RUN_SERVICE AND severity=ERROR" \
  --limit=20 \
  --format=json

# View startup logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$CLOUD_RUN_SERVICE AND jsonPayload.message=~'Starting'" \
  --limit=10 \
  --format=json
```

## Step 7: Verify Secrets Are Not Logged

```bash
# Check for any logs containing sensitive keywords
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$CLOUD_RUN_SERVICE AND (jsonPayload.message=~'secret' OR jsonPayload.message=~'password' OR jsonPayload.message=~'token' OR jsonPayload.message=~'key')" \
  --limit=50 \
  --format=json
```

If this returns any results, it indicates a security issue where secrets are being logged.

## Troubleshooting Commands

### List All Secrets

```bash
gcloud secrets list
```

### Create a Missing Secret

```bash
echo -n "YOUR_SECRET_VALUE" | gcloud secrets create SECRET_NAME --data-file=-
```

### Update a Secret

```bash
echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-
```

### View a Secret Value

```bash
gcloud secrets versions access latest --secret=SECRET_NAME
```

### Delete a Secret

```bash
gcloud secrets delete SECRET_NAME
```

### Check Service Status

```bash
gcloud run services describe $CLOUD_RUN_SERVICE --region=$REGION
```

### View Service Revisions

```bash
gcloud run revisions list --service=$CLOUD_RUN_SERVICE --region=$REGION
```

### View Service Logs (Real-time)

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$CLOUD_RUN_SERVICE" \
  --limit=50 \
  --follow
```

## Complete Automation Script

To run all steps at once, use the provided script:

```bash
./scripts/configure-cloud-run-secrets.sh $PROJECT_ID $CLOUD_RUN_URL
```

Or verify secrets exist first:

```bash
./scripts/verify-secrets-exist.sh
```

## References

- [Cloud Run gcloud Commands](https://cloud.google.com/sdk/gcloud/reference/run)
- [Secret Manager gcloud Commands](https://cloud.google.com/sdk/gcloud/reference/secrets)
- [Cloud Logging gcloud Commands](https://cloud.google.com/sdk/gcloud/reference/logging)
