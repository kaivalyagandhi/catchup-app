# Implementation Plan - Hackathon Edition

## Overview

Simplified deployment plan focused on getting CatchUp running on Google Cloud in 2-3 days. Covers essentials only: GCP setup, containerization, database, and CI/CD. Advanced features (load testing, monitoring, rollback procedures) deferred to post-hackathon.

---

## Phase 1: GCP Setup and Infrastructure

- [-] 1. Set up GCP project and enable required APIs
  - I'll walk you through creating/selecting a GCP project
  - I'll guide you through enabling each required API
  - You'll provide screenshots or confirmation of each step
  - I'll verify all APIs are enabled before proceeding
  - _Requirements: 2.1, 3.1, 4.1_

- [ ] 2. Create service accounts and IAM roles
  - I'll guide you through creating Cloud Run service account
  - I'll walk you through granting Secret Manager and Cloud SQL access
  - I'll guide you through creating Cloud Build service account
  - I'll walk you through granting Artifact Registry and Cloud Run deploy access
  - You'll confirm each service account is created with correct permissions
  - I'll verify IAM roles are properly configured
  - _Requirements: 3.1, 3.2, 12.2_

- [ ] 3. Set up Google Secret Manager
  - I'll guide you through creating each secret (OAuth, database, API keys, encryption key)
  - I'll walk you through granting Cloud Run service account access to secrets
  - You'll provide the secret names you created
  - I'll verify all required secrets exist and are accessible
  - _Requirements: 3.1, 3.2, 12.1_

- [ ] 4. Create Cloud SQL PostgreSQL instance
  - I'll walk you through creating a db-f1-micro PostgreSQL instance
  - I'll guide you through creating a database user and password
  - I'll show you how to store credentials in Secret Manager
  - You'll provide the instance connection name and credentials
  - I'll verify the instance is created and accessible
  - _Requirements: 2.1, 2.2, 10.1_

- [ ] 5. Initialize database schema
  - I'll guide you through connecting to Cloud SQL
  - I'll walk you through running database migrations
  - You'll confirm migrations completed successfully
  - I'll verify all tables are created with correct schema
  - _Requirements: 2.2, 2.3_

---

## Phase 2: Containerization

- [ ] 6. Create Dockerfile with multi-stage build
  - Build stage: install deps, build TypeScript, run tests
  - Runtime stage: copy built app, production deps only
  - Expose port 3000, set health check
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 7. Add environment variable validation
  - Create validation function for required env vars
  - Fail fast with clear error messages
  - Call from src/index.ts on startup
  - _Requirements: 1.4_

- [ ] 8. Implement graceful shutdown
  - Add SIGTERM handler to src/index.ts
  - Gracefully close Express server, database connections, job workers
  - 30-second shutdown timeout
  - _Requirements: 1.5, 8.4_

- [ ] 9. Create health check endpoint
  - Add GET /health endpoint
  - Return { status: 'healthy', timestamp: Date }
  - Check database connectivity
  - _Requirements: 6.3_

- [ ] 10. Build and test Docker image locally
  - Build: `docker build -t catchup:latest .`
  - Run: `docker run -p 3000:3000 catchup:latest`
  - Verify app starts, health check responds
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

---

## Phase 3: CI/CD Pipeline

- [ ] 11. Create cloudbuild.yaml
  - I'll provide the cloudbuild.yaml template
  - I'll walk you through each build step
  - You'll update PROJECT_ID and other placeholders
  - I'll review your config and verify it's correct
  - _Requirements: 4.1, 4.2_

- [ ] 12. Configure Cloud Build trigger
  - I'll guide you through creating a Cloud Build trigger
  - I'll walk you through connecting your GitHub repo
  - I'll show you how to set it to run on main branch pushes
  - You'll confirm the trigger is created and connected
  - I'll verify the trigger configuration before testing
  - _Requirements: 4.1_

- [ ] 13. Add test execution to pipeline
  - I'll show you where to add test steps in cloudbuild.yaml
  - I'll walk you through configuring npm test, lint, typecheck
  - You'll confirm the steps are added correctly
  - I'll verify the pipeline will fail if tests fail
  - _Requirements: 4.2_

- [ ] 14. Add image push to Artifact Registry
  - I'll guide you through creating Artifact Registry repo
  - I'll walk you through configuring image push in cloudbuild.yaml
  - I'll show you the image naming convention
  - You'll confirm the repo is created and push step is configured
  - I'll verify the image will be tagged correctly
  - _Requirements: 4.2_

- [ ] 15. Add Cloud Run deployment to pipeline
  - I'll show you how to add Cloud Run deployment step
  - I'll walk you through configuring service account and secrets
  - I'll guide you through setting environment variables
  - You'll confirm the deployment step is configured
  - I'll verify the deployment will use correct secrets and service account
  - _Requirements: 4.3, 4.4_

---

## Phase 4: Cloud Run Service

- [ ] 16. Create Cloud Run service
  - I'll guide you through creating a Cloud Run service
  - I'll walk you through setting memory (512 MB), CPU (1 vCPU), timeout (3600s)
  - I'll show you how to select the Cloud Run service account
  - You'll confirm the service is created with correct settings
  - I'll verify the service configuration before proceeding
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 17. Configure auto-scaling
  - I'll walk you through setting min instances to 0
  - I'll guide you through setting max instances to 100
  - I'll show you how to set target CPU (70%) and concurrency (80)
  - You'll confirm auto-scaling settings are applied
  - I'll verify the scaling configuration is correct
  - _Requirements: 5.1, 5.2, 5.3, 11.1, 11.2_

- [ ] 18. Configure environment and secrets
  - I'll guide you through setting environment variables
  - I'll walk you through referencing secrets from Secret Manager
  - I'll show you the correct format for secret references
  - You'll confirm all environment variables and secrets are configured
  - I'll verify the configuration matches requirements
  - _Requirements: 3.1, 3.2, 7.1, 7.2_

- [ ] 19. Configure health check
  - I'll guide you through setting health check path to /health
  - I'll walk you through setting timeout (10s), interval (30s), failure threshold (3)
  - You'll confirm health check is configured
  - I'll verify the health check settings are correct
  - _Requirements: 6.3, 9.2_

- [ ] 20. Deploy to Cloud Run
  - I'll guide you through deploying the image
  - I'll walk you through verifying the service is accessible
  - I'll show you how to test the health check endpoint
  - You'll provide the Cloud Run service URL
  - I'll verify the app is healthy and serving traffic
  - _Requirements: 4.3, 4.4_

---

## Phase 5: Verification and Secrets

- [ ] 21. Verify secrets are stored and accessible
  - I'll guide you through checking Secret Manager
  - I'll walk you through verifying app retrieves secrets on startup
  - I'll show you how to check Cloud Logging for secret retrieval
  - You'll provide screenshots or confirmation of secret access
  - I'll verify all secrets are accessible and app starts correctly
  - _Requirements: 3.1, 3.2, 12.1_

- [ ] 22. Verify secrets are not logged
  - I'll guide you through making test API requests
  - I'll walk you through checking Cloud Logging for exposed secrets
  - I'll show you what to look for (OAuth tokens, API keys, passwords)
  - You'll confirm no secrets appear in logs
  - I'll verify logs are clean and safe
  - _Requirements: 3.3, 12.5_

- [ ] 23. Verify database connectivity
  - I'll guide you through checking app connects to Cloud SQL
  - I'll walk you through verifying migrations ran successfully
  - I'll show you how to check the database schema
  - You'll confirm database is accessible and schema is correct
  - I'll verify database connectivity is working
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 24. Test end-to-end deployment
  - I'll guide you through pushing code to main branch
  - I'll walk you through monitoring Cloud Build pipeline
  - I'll show you how to check if tests pass
  - I'll guide you through verifying image is deployed to Cloud Run
  - You'll confirm app is healthy and accessible
  - I'll verify the entire deployment pipeline works end-to-end
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
