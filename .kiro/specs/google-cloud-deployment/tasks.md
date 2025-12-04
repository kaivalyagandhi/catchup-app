# Implementation Plan - Hackathon Edition

## Overview

Simplified deployment plan focused on getting CatchUp running on Google Cloud in 2-3 days. Covers essentials only: GCP setup, containerization, database, and CI/CD. Advanced features (load testing, monitoring, rollback procedures) deferred to post-hackathon.

---

## Phase 1: GCP Setup and Infrastructure

- [x] 1. Set up GCP project and enable required APIs
  - Set project: `gcloud config set project PROJECT_ID`
  - Enable APIs using gcloud:
    ```bash
    gcloud services enable run.googleapis.com
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable artifactregistry.googleapis.com
    gcloud services enable sqladmin.googleapis.com
    gcloud services enable secretmanager.googleapis.com
    gcloud services enable cloudresourcemanager.googleapis.com
    ```
  - Verify APIs are enabled: `gcloud services list --enabled`
  - _Requirements: 2.1, 3.1, 4.1_

- [x] 2. Create service accounts and IAM roles
  - Create Cloud Run service account:
    ```bash
    gcloud iam service-accounts create catchup-cloud-run \
      --display-name="CatchUp Cloud Run Service Account"
    ```
  - Create Cloud Build service account:
    ```bash
    gcloud iam service-accounts create catchup-cloud-build \
      --display-name="CatchUp Cloud Build Service Account"
    ```
  - Grant Cloud Run service account permissions:
    ```bash
    gcloud projects add-iam-policy-binding PROJECT_ID \
      --member=serviceAccount:catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com \
      --role=roles/secretmanager.secretAccessor
    gcloud projects add-iam-policy-binding PROJECT_ID \
      --member=serviceAccount:catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com \
      --role=roles/cloudsql.client
    ```
  - Grant Cloud Build service account permissions:
    ```bash
    gcloud projects add-iam-policy-binding PROJECT_ID \
      --member=serviceAccount:catchup-cloud-build@PROJECT_ID.iam.gserviceaccount.com \
      --role=roles/artifactregistry.writer
    gcloud projects add-iam-policy-binding PROJECT_ID \
      --member=serviceAccount:catchup-cloud-build@PROJECT_ID.iam.gserviceaccount.com \
      --role=roles/run.developer
    ```
  - Verify service accounts: `gcloud iam service-accounts list`
  - _Requirements: 3.1, 3.2, 12.2_

- [x] 3. Set up Google Secret Manager
  - Create secrets using gcloud:
    ```bash
    echo -n "YOUR_OAUTH_SECRET" | gcloud secrets create google-oauth-secret --data-file=-
    echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password --data-file=-
    echo -n "YOUR_API_KEY" | gcloud secrets create api-key --data-file=-
    echo -n "YOUR_ENCRYPTION_KEY" | gcloud secrets create encryption-key --data-file=-
    ```
  - Grant Cloud Run service account access to secrets:
    ```bash
    gcloud secrets add-iam-policy-binding google-oauth-secret \
      --member=serviceAccount:catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com \
      --role=roles/secretmanager.secretAccessor
    # Repeat for other secrets
    ```
  - List secrets: `gcloud secrets list`
  - _Requirements: 3.1, 3.2, 12.1_

- [ ] 4. Create Cloud SQL PostgreSQL instance
  - Create instance using gcloud:
    ```bash
    gcloud sql instances create catchup-db \
      --database-version=POSTGRES_15 \
      --tier=db-f1-micro \
      --region=us-central1 \
      --availability-type=zonal
    ```
  - Create database user:
    ```bash
    gcloud sql users create catchup_user \
      --instance=catchup-db \
      --password=YOUR_PASSWORD
    ```
  - Create database:
    ```bash
    gcloud sql databases create catchup_db \
      --instance=catchup-db
    ```
  - Get connection name: `gcloud sql instances describe catchup-db --format='value(connectionName)'`
  - Store credentials in Secret Manager (see Task 3)
  - _Requirements: 2.1, 2.2, 10.1_

- [ ] 5. Initialize database schema
  - Get Cloud SQL proxy connection string:
    ```bash
    gcloud sql instances describe catchup-db --format='value(connectionName)'
    ```
  - Connect and run migrations:
    ```bash
    gcloud sql connect catchup-db --user=catchup_user
    # Then run: \i scripts/migrations/001_create_core_tables.sql
    ```
  - Verify schema: `gcloud sql databases describe catchup_db --instance=catchup-db`
  - _Requirements: 2.2, 2.3_

---

## Phase 2: Containerization

- [x] 6. Create Dockerfile with multi-stage build
  - Build stage: install deps, build TypeScript, run tests
  - Runtime stage: copy built app, production deps only
  - Expose port 3000, set health check
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 7. Add environment variable validation
  - Create validation function for required env vars
  - Fail fast with clear error messages
  - Call from src/index.ts on startup
  - _Requirements: 1.4_

- [x] 8. Implement graceful shutdown (simplified)
  - Add SIGTERM handler to src/index.ts
  - Close Express server on SIGTERM signal
  - Cloud Run will force-kill after 60s if needed
  - _Requirements: 1.5, 8.4_

- [x] 9. Create health check endpoint
  - Add GET /health endpoint
  - Return { status: 'healthy', timestamp: Date }
  - Check database connectivity
  - _Requirements: 6.3_

- [x] 10. Build and test Docker image locally
  - Build: `docker build -t catchup:latest .`
  - Run: `docker run -p 3000:3000 catchup:latest`
  - Verify app starts, health check responds
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

---

## Phase 3: CI/CD Pipeline

- [x] 11. Create cloudbuild.yaml
  - Create Artifact Registry repository:
    ```bash
    gcloud artifacts repositories create catchup-repo \
      --repository-format=docker \
      --location=us-central1 \
      --description="CatchUp Docker images"
    ```
  - Verify repo: `gcloud artifacts repositories list`
  - Create cloudbuild.yaml with build steps (provided template)
  - Validate config: `gcloud builds submit --dry-run`
  - _Requirements: 4.1, 4.2_

- [x] 12. Configure Cloud Build trigger
  - Create trigger from GitHub:
    ```bash
    gcloud builds triggers create github \
      --name=catchup-main-deploy \
      --repo-name=REPO_NAME \
      --repo-owner=GITHUB_USERNAME \
      --branch-pattern=^main$ \
      --build-config=cloudbuild.yaml \
      --service-account=projects/PROJECT_ID/serviceAccounts/catchup-cloud-build@PROJECT_ID.iam.gserviceaccount.com
    ```
  - List triggers: `gcloud builds triggers list`
  - Verify trigger: `gcloud builds triggers describe catchup-main-deploy`
  - _Requirements: 4.1_

- [x] 13. Add test execution to pipeline
  - Update cloudbuild.yaml with test steps:
    ```yaml
    - name: 'node:18'
      entrypoint: npm
      args: ['ci']
    - name: 'node:18'
      entrypoint: npm
      args: ['run', 'lint']
    - name: 'node:18'
      entrypoint: npm
      args: ['run', 'typecheck']
    - name: 'node:18'
      entrypoint: npm
      args: ['test', '--run']
    ```
  - Validate: `gcloud builds submit --dry-run`
  - _Requirements: 4.2_

- [x] 14. Add image push to Artifact Registry
  - Update cloudbuild.yaml with image build and push:
    ```yaml
    - name: 'gcr.io/cloud-builders/docker'
      args: ['build', '-t', 'us-central1-docker.pkg.dev/PROJECT_ID/catchup-repo/catchup:$SHORT_SHA', '.']
    - name: 'gcr.io/cloud-builders/docker'
      args: ['push', 'us-central1-docker.pkg.dev/PROJECT_ID/catchup-repo/catchup:$SHORT_SHA']
    ```
  - Verify image push: `gcloud artifacts docker images list us-central1-docker.pkg.dev/PROJECT_ID/catchup-repo`
  - _Requirements: 4.2_

- [x] 15. Add Cloud Run deployment to pipeline
  - Update cloudbuild.yaml with Cloud Run deployment:
    ```yaml
    - name: 'gcr.io/cloud-builders/run'
      args: ['deploy', 'catchup', 
             '--image=us-central1-docker.pkg.dev/PROJECT_ID/catchup-repo/catchup:$SHORT_SHA',
             '--region=us-central1',
             '--service-account=catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com',
             '--set-env-vars=NODE_ENV=production']
    ```
  - Validate: `gcloud builds submit --dry-run`
  - _Requirements: 4.3, 4.4_

---

## Phase 4: Cloud Run Service

- [x] 16. Create Cloud Run service
  - Deploy initial service:
    ```bash
    gcloud run deploy catchup \
      --image=us-central1-docker.pkg.dev/PROJECT_ID/catchup-repo/catchup:latest \
      --region=us-central1 \
      --memory=512Mi \
      --cpu=1 \
      --timeout=3600 \
      --service-account=catchup-cloud-run@PROJECT_ID.iam.gserviceaccount.com \
      --no-allow-unauthenticated
    ```
  - Get service URL: `gcloud run services describe catchup --region=us-central1 --format='value(status.url)'`
  - Verify service: `gcloud run services describe catchup --region=us-central1`
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 17. Configure auto-scaling
  - Update service with scaling settings:
    ```bash
    gcloud run services update catchup \
      --region=us-central1 \
      --min-instances=0 \
      --max-instances=100 \
      --cpu-throttling
    ```
  - Set concurrency:
    ```bash
    gcloud run services update catchup \
      --region=us-central1 \
      --concurrency=80
    ```
  - Verify settings: `gcloud run services describe catchup --region=us-central1`
  - _Requirements: 5.1, 5.2, 5.3, 11.1, 11.2_

- [x] 18. Configure environment and secrets
  - Update service with environment variables and secrets:
    ```bash
    gcloud run services update catchup \
      --region=us-central1 \
      --set-env-vars=NODE_ENV=production,LOG_LEVEL=info \
      --update-secrets=GOOGLE_OAUTH_SECRET=google-oauth-secret:latest,\
    DB_PASSWORD=db-password:latest,\
    API_KEY=api-key:latest,\
    ENCRYPTION_KEY=encryption-key:latest
    ```
  - Verify configuration: `gcloud run services describe catchup --region=us-central1`
  - _Requirements: 3.1, 3.2, 7.1, 7.2_

- [x] 19. Configure health check
  - Cloud Run automatically uses `/health` endpoint for health checks
  - Verify health check is working:
    ```bash
    SERVICE_URL=$(gcloud run services describe catchup --region=us-central1 --format='value(status.url)')
    curl $SERVICE_URL/health
    ```
  - Check Cloud Run metrics: `gcloud monitoring dashboards list`
  - _Requirements: 6.3, 9.2_

- [x] 20. Deploy to Cloud Run
  - Trigger deployment via Cloud Build (push to main):
    ```bash
    git push origin main
    ```
  - Monitor build: `gcloud builds log --stream`
  - Get service URL:
    ```bash
    gcloud run services describe catchup --region=us-central1 --format='value(status.url)'
    ```
  - Test health endpoint:
    ```bash
    SERVICE_URL=$(gcloud run services describe catchup --region=us-central1 --format='value(status.url)')
    curl $SERVICE_URL/health
    ```
  - Check service status: `gcloud run services describe catchup --region=us-central1`
  - _Requirements: 4.3, 4.4_

---

## Phase 5: Verification and Secrets

- [ ] 21. Verify secrets are stored and accessible
  - List all secrets:
    ```bash
    gcloud secrets list
    ```
  - Verify Cloud Run service account has access:
    ```bash
    gcloud secrets get-iam-policy google-oauth-secret
    ```
  - Check Cloud Logging for secret access:
    ```bash
    gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message=~'secret'" \
      --limit=10 --format=json
    ```
  - Verify app startup logs:
    ```bash
    gcloud run services describe catchup --region=us-central1 --format='value(status.conditions[0].message)'
    ```
  - _Requirements: 3.1, 3.2, 12.1_

- [ ] 22. Verify secrets are not logged (optional - defer if time-constrained)
  - Make test API request:
    ```bash
    SERVICE_URL=$(gcloud run services describe catchup --region=us-central1 --format='value(status.url)')
    curl -X POST $SERVICE_URL/api/test -H "Content-Type: application/json" -d '{"test": "data"}'
    ```
  - Check logs for exposed secrets:
    ```bash
    gcloud logging read "resource.type=cloud_run_revision AND (jsonPayload.message=~'token' OR jsonPayload.message=~'password' OR jsonPayload.message=~'key')" \
      --limit=50 --format=json
    ```
  - Verify no sensitive data in logs
  - _Requirements: 3.3, 12.5_

- [ ] 23. Verify database connectivity (combined with Task 5)
  - Check Cloud SQL instance status:
    ```bash
    gcloud sql instances describe catchup-db
    ```
  - Verify app can connect:
    ```bash
    gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message=~'database'" \
      --limit=10 --format=json
    ```
  - Verify migrations ran:
    ```bash
    gcloud sql connect catchup-db --user=catchup_user \
      -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
    ```
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 24. Test end-to-end deployment
  - Push code to main branch:
    ```bash
    git push origin main
    ```
  - Monitor Cloud Build:
    ```bash
    gcloud builds log --stream $(gcloud builds list --limit=1 --format='value(id)')
    ```
  - Verify build succeeded:
    ```bash
    gcloud builds list --limit=5 --format='table(id,status,createTime)'
    ```
  - Check Cloud Run deployment:
    ```bash
    gcloud run services describe catchup --region=us-central1 --format='value(status.conditions[*].message)'
    ```
  - Test service health:
    ```bash
    SERVICE_URL=$(gcloud run services describe catchup --region=us-central1 --format='value(status.url)')
    curl $SERVICE_URL/health
    ```
  - View recent logs:
    ```bash
    gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=catchup" \
      --limit=20 --format=json
    ```
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

---

## Summary

**Hackathon-focused deployment covering:**

1. GCP project setup and APIs
2. Service accounts and IAM
3. Secret management
4. Cloud SQL database
5. Docker containerization
6. Cloud Build CI/CD pipeline
7. Cloud Run service
8. Health checks and auto-scaling
9. End-to-end verification

**Total Tasks:** 24 (core only, no optional tests)

**Estimated Timeline:** Varies by developer experience

**Cost Estimate:** $5-10/month for hackathon-scale traffic

**Post-Hackathon Enhancements:**
- Monitoring dashboards and alerts
- Load testing and scaling verification
- Backup and restore procedures
- Advanced security policies
- Property-based tests for all components
