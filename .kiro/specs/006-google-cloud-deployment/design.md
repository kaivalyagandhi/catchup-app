# Design Document

## Overview

This design document describes the architecture for deploying CatchUp to Google Cloud Platform in a scalable, cost-effective, and maintainable manner. The deployment uses Google Cloud's managed services to minimize operational overhead while maintaining production-readiness for a hackathon-scale application.

**Key Design Principles:**
- **Simplicity first**: Use managed services to reduce operational complexity
- **Cost-conscious**: Leverage free tiers and auto-scaling to minimize expenses
- **Production-ready**: Implement security, monitoring, and reliability best practices
- **Hackathon-friendly**: Fast to set up and easy to update

## Architecture

### High-Level Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Cloud Run (Serverless)                  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  CatchUp Application Container                │  │   │
│  │  │  - Express.js API Server                      │  │   │
│  │  │  - Background Job Workers (Bull + Redis)      │  │   │
│  │  │  - Health Check Endpoint                      │  │   │
│  │  │  - Graceful Shutdown Handler                  │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  Auto-scales: 0-100 instances based on traffic      │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Cloud SQL (Managed PostgreSQL)               │   │
│  │  - Single db-f1-micro instance                       │   │
│  │  - Automated daily backups (7-day retention)         │   │
│  │  - Cloud SQL Auth proxy for secure connections      │   │
│  │  - Connection pooling (max 20 connections)           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Google Secret Manager                        │   │
│  │  - Google OAuth credentials                          │   │
│  │  - Database credentials                              │   │
│  │  - API keys (Twilio, SendGrid, etc.)                │   │
│  │  - Encryption keys for sensitive data                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Cloud Build (CI/CD Pipeline)                 │   │
│  │  - Triggered on push to main branch                  │   │
│  │  - Builds Docker image                               │   │
│  │  - Runs tests                                        │   │
│  │  - Pushes to Artifact Registry                       │   │
│  │  - Deploys to Cloud Run                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Cloud Logging & Monitoring                   │   │
│  │  - Application logs (errors, events)                 │   │
│  │  - Cloud Run metrics (CPU, memory, requests)         │   │
│  │  - Database metrics (connections, queries)           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Environments

**Production Environment:**
- Cloud Run service: `catchup-api-prod`
- Cloud SQL instance: `catchup-db-prod`
- Secrets: Production credentials in Secret Manager
- Auto-scaling: 1-100 instances

**Development Environment (Optional):**
- Local Docker container for testing
- Local PostgreSQL for development
- Feature branches for testing before production

## Components and Interfaces

### 1. Docker Container

**Responsibility:** Package the application with all dependencies for consistent deployment

**Key Features:**
- Multi-stage build to minimize image size
- Node.js 18+ runtime
- Production dependencies only (dev dependencies excluded)
- Health check endpoint at `/health`
- Graceful shutdown on SIGTERM
- Environment variable validation on startup

**Dockerfile Structure:**
```
Stage 1: Build stage
- Install dependencies
- Build TypeScript
- Run tests

Stage 2: Runtime stage
- Copy built application
- Copy production dependencies
- Set up health check
- Expose port 3000
```

### 2. Cloud Run Service

**Responsibility:** Run the containerized application with automatic scaling

**Configuration:**
- **Memory:** 512 MB per instance
- **CPU:** 1 vCPU per instance
- **Timeout:** 3600 seconds (1 hour for long-running jobs)
- **Concurrency:** 80 requests per instance
- **Min instances:** 0 (scale to zero when idle)
- **Max instances:** 100 (configurable based on load)
- **Auto-scaling:** Based on CPU and request count

**Environment Variables:**
- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_HOST=<Cloud SQL proxy>`
- `DATABASE_NAME=catchup_db`
- `DATABASE_USER=<from Secret Manager>`
- `DATABASE_PASSWORD=<from Secret Manager>`
- All API keys and secrets from Secret Manager

### 3. Cloud SQL Database

**Responsibility:** Provide managed PostgreSQL database with automatic backups

**Configuration:**
- **Instance type:** db-f1-micro (1 shared vCPU, 0.6 GB RAM)
- **Storage:** 10 GB (auto-expandable)
- **Backups:** Automated daily at 3 AM UTC, 7-day retention
- **Connection limit:** 20 concurrent connections
- **SSL:** Required for all connections
- **Auth proxy:** Cloud SQL Auth proxy for secure connections

**Database Schema:**
- Initialized via migrations on first deployment
- Migrations run automatically before application starts
- All tables created with proper indexes and constraints

### 4. Google Secret Manager

**Responsibility:** Securely store and manage sensitive credentials

**Secrets Stored:**
- `google-oauth-client-id`
- `google-oauth-client-secret`
- `database-password`
- `twilio-account-sid`
- `twilio-auth-token`
- `sendgrid-api-key`
- `google-cloud-speech-key`
- `google-gemini-api-key`
- `encryption-key` (for encrypting OAuth tokens in database)

**Access Control:**
- Cloud Run service account has read-only access
- Secrets are never logged or exposed in environment
- Audit logging tracks all secret access

### 5. Cloud Build Pipeline

**Responsibility:** Automate building, testing, and deploying code changes

**Pipeline Steps:**
1. **Trigger:** On push to main branch
2. **Build:** Build Docker image with multi-stage build
3. **Test:** Run unit tests and property-based tests
4. **Push:** Push image to Artifact Registry
5. **Deploy:** Deploy to Cloud Run with traffic shifting
6. **Verify:** Run health checks to verify deployment

**Configuration:**
- Build timeout: 30 minutes
- Automatic rollback on deployment failure
- Notifications on build/deployment status

### 6. Artifact Registry

**Responsibility:** Store Docker images for deployment

**Configuration:**
- Repository: `catchup-docker`
- Location: `us-central1`
- Image naming: `us-central1-docker.pkg.dev/PROJECT_ID/catchup-docker/catchup:TAG`
- Retention: Keep last 10 images, delete older ones

### 7. Cloud Logging

**Responsibility:** Centralize application logs for debugging and monitoring

**Log Types:**
- **Application logs:** Errors, warnings, important events
- **Request logs:** HTTP requests, response codes, latency
- **Database logs:** Connection events, query errors
- **Deployment logs:** Build and deployment events

**Log Retention:** 30 days (configurable)

## Data Models

### Application Configuration

```typescript
interface DeploymentConfig {
  environment: 'development' | 'production';
  gcp: {
    projectId: string;
    region: string;
    cloudRunService: string;
    cloudSqlInstance: string;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string; // from Secret Manager
    maxConnections: number;
  };
  secrets: {
    googleOAuthClientId: string;
    googleOAuthClientSecret: string;
    encryptionKey: string;
    // ... other API keys
  };
  scaling: {
    minInstances: number;
    maxInstances: number;
    targetCpuUtilization: number;
    targetRequestCount: number;
  };
}
```

### Deployment State

```typescript
interface DeploymentState {
  version: string;
  timestamp: Date;
  status: 'deploying' | 'active' | 'failed' | 'rolling-back';
  instances: {
    running: number;
    pending: number;
    failed: number;
  };
  health: {
    healthy: boolean;
    lastCheck: Date;
    errors: string[];
  };
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Docker Image Contains Application Code
*For any* Docker build, the resulting image should contain the compiled application code and all production dependencies.
**Validates: Requirements 1.1, 1.2**

### Property 2: Docker Image Size Optimization
*For any* Docker image built with multi-stage build, the final image size should be smaller than a single-stage build by at least 30%.
**Validates: Requirements 1.3**

### Property 3: Environment Variable Validation
*For any* application startup, if required environment variables are missing, the application should fail immediately with a clear error message before attempting to start the server.
**Validates: Requirements 1.4**

### Property 4: Graceful Shutdown Completion
*For any* running application, when it receives a SIGTERM signal, the Express server should close gracefully. Cloud Run will force-kill after 60 seconds if needed.
**Validates: Requirements 1.5**

### Property 5: Database Migration Execution
*For any* deployment, all pending database migrations should be executed during initial setup. Migrations are run manually once before first deployment.
**Validates: Requirements 2.2**

### Property 6: Database Connection Cleanup
*For any* application shutdown, all database connections should be closed and the connection pool should be empty.
**Validates: Requirements 2.5**

### Property 7: Secret Retrieval from Secret Manager
*For any* application startup, all required secrets should be successfully retrieved from Google Secret Manager and available as environment variables.
**Validates: Requirements 3.1, 3.2**

### Property 8: No Secrets in Logs
*For any* log entry, no API keys, passwords, or other sensitive values should appear in the log output.
**Validates: Requirements 3.3**

### Property 9: CI/CD Pipeline Trigger
*For any* code push to the main branch, the Cloud Build pipeline should be automatically triggered within 30 seconds.
**Validates: Requirements 4.1**

### Property 10: Pipeline Test Execution
*For any* deployment pipeline run, all tests should be executed and must pass before the image is pushed to Artifact Registry.
**Validates: Requirements 4.2**

### Property 11: Conditional Deployment on Test Success
*For any* deployment pipeline, the image should only be deployed to Cloud Run if all tests pass.
**Validates: Requirements 4.3**

### Property 12: Health Check Verification Before Success
*For any* deployment, the deployment should not be marked as successful until the health check endpoint returns a 200 status code.
**Validates: Requirements 4.4**

### Property 13: Auto-Scaling on Increased Traffic
*For any* sustained increase in request rate above the target threshold, Cloud Run should create additional instances within 2 minutes.
**Validates: Requirements 5.1**

### Property 14: Auto-Scaling Down on Decreased Traffic
*For any* sustained decrease in request rate below the target threshold, Cloud Run should remove excess instances within 10 minutes.
**Validates: Requirements 5.2**

### Property 15: Unhealthy Instance Replacement
*For any* instance that fails health checks, Cloud Run should remove it and create a replacement instance within 5 minutes.
**Validates: Requirements 5.3**

### Property 16: Response Latency Under Load
*For any* request to the application under normal load, the 95th percentile response time should be less than 2 seconds.
**Validates: Requirements 5.4**

### Property 17: Error Logging
*For any* error that occurs in the application, it should be logged to Cloud Logging with the error message and stack trace.
**Validates: Requirements 6.1, 6.2**

### Property 18: Health Check Endpoint Availability
*For any* request to the `/health` endpoint, it should return a 200 status code with a JSON response indicating the application status. Cloud Run uses default health check settings (10s timeout, 30s interval, 3 failures).
**Validates: Requirements 6.3**

### Property 19: Startup and Shutdown Logging
*For any* application startup, a log entry should be created. *For any* application shutdown, a log entry should be created.
**Validates: Requirements 6.5**

### Property 20: Environment-Specific Configuration
*For any* deployment, the application should use environment-specific configuration values (secrets, database host, etc.) based on the deployment environment.
**Validates: Requirements 7.1, 7.2**

### Property 21: Configuration Validation
*For any* deployment, if required configuration values are missing, the deployment should fail with a clear error message.
**Validates: Requirements 7.4**

### Property 22: Local Docker Development
*For any* developer running the application locally with Docker, the application should start successfully and be accessible at `http://localhost:3000`.
**Validates: Requirements 7.5**

## Error Handling

### Deployment Errors

**Docker Build Failure:**
- Log the build error with details
- Prevent deployment to Cloud Run

**Test Failure:**
- Log test failures with details
- Prevent image push to Artifact Registry

**Deployment Failure:**
- Log deployment error
- Manual rollback via Cloud Run console

### Runtime Errors

**Database Connection Failure:**
- Log connection errors
- Return 503 if unable to connect

**Secret Retrieval Failure:**
- Fail fast on startup
- Log the error with details
- Prevent application from starting

**Health Check Failure:**
- Log the failure
- Cloud Run will automatically restart the instance

## Testing Strategy

### Manual Verification (Hackathon-Focused)

For a hackathon deployment, focus on critical path verification:

- **Docker image verification:** Build locally and verify it runs
- **Configuration validation:** Test with missing environment variables
- **Health check verification:** Test the `/health` endpoint manually
- **Deployment verification:** Verify the app is accessible after deployment
- **Database connectivity:** Verify migrations ran and data is accessible

### CI/CD Pipeline Testing

The Cloud Build pipeline includes:

- **Unit tests:** Run `npm test` to verify application logic
- **Linting:** Run `npm run lint` to check code quality
- **Type checking:** Run `npm run typecheck` to verify TypeScript types

### Deployment Verification

After deployment to Cloud Run:

- Verify the health check endpoint responds with 200 status
- Verify the application is accessible at the Cloud Run URL
- Verify database connectivity by checking Cloud Logging
- Verify secrets are loaded correctly by checking startup logs

### Optional Verification (Post-Hackathon)

- Verify secrets are not logged (skip if time-constrained)
- Test graceful shutdown behavior
- Verify configuration validation failure scenarios

## Deployment Checklist (Hackathon Edition)

Before deploying to production:

- [ ] All tests pass locally
- [ ] Docker image builds successfully
- [ ] Environment variables are configured
- [ ] Secrets are stored in Secret Manager
- [ ] Cloud SQL instance is created and migrations are run manually
- [ ] Cloud Build pipeline is configured
- [ ] Cloud Run service is configured with correct scaling parameters
- [ ] Health check endpoint is working
- [ ] App is accessible and serving traffic
- [ ] Database connectivity verified via logs

**Post-Hackathon Enhancements:**
- [ ] Monitoring and logging dashboards
- [ ] Backup configuration and restore procedures
- [ ] Advanced security policies
- [ ] Load testing and scaling verification

## Future Enhancements (Post-Hackathon)

Post-hackathon improvements:

- **Automated migrations:** Automate database migrations in application startup
- **Graceful shutdown:** Add database connection cleanup and job worker shutdown
- **Automated rollback:** Implement automatic rollback on deployment failure
- **Advanced monitoring:** Add metrics and alerting dashboards
- **Database backups:** Configure automated backups and restore procedures
- **Multi-region deployment:** Deploy to multiple regions for high availability
- **Load testing:** Implement load testing in CI/CD pipeline
- **Custom domain:** Map custom domain to Cloud Run service
- **API rate limiting:** Implement rate limiting middleware
- **Secret rotation:** Implement automated secret rotation policies
