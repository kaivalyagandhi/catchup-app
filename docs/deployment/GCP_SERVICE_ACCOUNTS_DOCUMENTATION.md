# GCP Service Accounts Documentation

## Created Service Accounts

### 1. Cloud Run Service Account
- **Email:** `catchup-cloud-run@catchup-479221.iam.gserviceaccount.com`
- **Name:** catchup-cloud-run
- **Description:** Service account for CatchUp Cloud Run application
- **Status:** Enabled
- **Key ID:** 109636264729600864965

### 2. Cloud Build Service Account
- **Email:** `catchup-cloud-build@catchup-479221.iam.gserviceaccount.com`
- **Name:** catchup-cloud-build
- **Description:** Service account for CatchUp Cloud Build pipeline
- **Status:** Enabled
- **Key ID:** 115422545317274351035

### 3. Bot Service Account (Pre-existing)
- **Email:** `bot-740@catchup-479221.iam.gserviceaccount.com`
- **Name:** bot
- **Status:** Enabled
- **Key ID:** 10097996727913055092

---

## Service Account Roles

### Cloud Run Service Account (`catchup-cloud-run@catchup-479221.iam.gserviceaccount.com`)

**Assigned Roles:**
- `roles/cloudsql.client` - Cloud SQL Client (access to Cloud SQL database)
- `roles/secretmanager.secretAccessor` - Secret Accessor (access to Secret Manager)
- `roles/logging.logWriter` - Cloud Logging Log Writer (write logs)

**Purpose:** Runs the CatchUp application on Cloud Run and accesses database and secrets

---

### Cloud Build Service Account (`catchup-cloud-build@catchup-479221.iam.gserviceaccount.com`)

**Assigned Roles:**
- `roles/artifactregistry.writer` - Artifact Registry Writer (push Docker images)
- `roles/run.admin` - Cloud Run Admin (deploy to Cloud Run)
- `roles/cloudsql.client` - Cloud SQL Client (run migrations)
- `roles/iam.serviceAccountUser` - Service Account User (impersonate Cloud Run service account)

**Purpose:** Builds Docker images, runs tests, and deploys to Cloud Run via CI/CD pipeline

---

## GCP Project Information

- **Project ID:** catchup-479221
- **Project Name:** catchup

---

## Usage in Deployment

### Cloud Run Configuration
When deploying to Cloud Run, use:
```
Service Account: catchup-cloud-run@catchup-479221.iam.gserviceaccount.com
```

### Cloud Build Configuration
When setting up Cloud Build pipeline, use:
```
Service Account: catchup-cloud-build@catchup-479221.iam.gserviceaccount.com
```

---

## Requirements Validation

✅ **Requirement 3.1:** Service accounts created for retrieving credentials from Secret Manager
✅ **Requirement 3.2:** Service accounts configured to inject credentials as environment variables
✅ **Requirement 12.2:** IAM roles properly configured for secure access

---

## Next Steps

1. ✅ Task 2 Complete: Service accounts and IAM roles created
2. → Task 3: Set up Google Secret Manager
3. → Task 4: Create Cloud SQL PostgreSQL instance
4. → Task 5: Initialize database schema

