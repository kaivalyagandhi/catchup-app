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
*For any* running application, when it receives a SIGTERM signal, all in-flight requests should complete before the process exits, and all database connections should be closed.
**Validates: Requirements 1.5**

### Property 5: Database Migration Execution
*For any* deployment, all pending database migrations should be executed before the application starts serving requests.
**Validates: Requirements 2.2**

### Property 6: Connection Retry with Backoff
*For any* failed database connection attempt, the application should retry with exponential backoff (1s, 2s, 4s, 8s, 16s) before giving up.
**Validates: Requirements 2.4**

### Property 7: Database Connection Cleanup
*For any* application shutdown, all database connections should be closed and the connection pool should be empty.
**Validates: Requirements 2.5**

### Property 8: Secret Retrieval from Secret Manager
*For any* application startup, all required secrets should be successfully retrieved from Google Secret Manager and available as environment variables.
**Validates: Requirements 3.1, 3.2**

### Property 9: No Secrets in Logs
*For any* log entry, no OAuth tokens, API keys, passwords, or other sensitive values should appear in the log output.
**Validates: Requirements 3.3**

### Property 10: Secret Rotation Without Redeployment
*For any* secret updated in Secret Manager, the application should use the new value on the next request without requiring redeployment.
**Validates: Requirements 3.4**

### Property 11: Secret Access Audit Logging
*For any* secret accessed by the application, an audit log entry should be created in Cloud Logging with timestamp and service account information.
**Validates: Requirements 3.5**

### Property 12: CI/CD Pipeline Trigger
*For any* code push to the main branch, the Cloud Build pipeline should be automatically triggered within 30 seconds.
**Validates: Requirements 4.1**

### Property 13: Pipeline Test Execution
*For any* deployment pipeline run, all tests should be executed and must pass before the image is pushed to Artifact Registry.
**Validates: Requirements 4.2**

### Property 14: Conditional Deployment on Test Success
*For any* deployment pipeline, the image should only be deployed to Cloud Run if all tests pass.
**Validates: Requirements 4.3**

### Property 15: Health Check Verification Before Success
*For any* deployment, the deployment should not be marked as successful until the health check endpoint returns a 200 status code.
**Validates: Requirements 4.4**

### Property 16: Automatic Rollback on Deployment Failure
*For any* failed deployment, the system should automatically roll back to the previous version and the previous version should be serving traffic within 5 minutes.
**Validates: Requirements 4.5**

### Property 17: Auto-Scaling on Increased Traffic
*For any* sustained increase in request rate above the target threshold, Cloud Run should create additional instances within 2 minutes.
**Validates: Requirements 5.1**

### Property 18: Auto-Scaling Down on Decreased Traffic
*For any* sustained decrease in request rate below the target threshold, Cloud Run should remove excess instances within 10 minutes.
**Validates: Requirements 5.2**

### Property 19: Unhealthy Instance Replacement
*For any* instance that fails health checks, Cloud Run should remove it and create a replacement instance within 5 minutes.
**Validates: Requirements 5.3**

### Property 20: Response Latency Under Load
*For any* request to the application under normal load, the 95th percentile response time should be less than 2 seconds.
**Validates: Requirements 5.4**

### Property 21: Connection Pool Health Under Load
*For any* sustained high load, the database connection pool should maintain at least 1 available connection and not exceed the maximum pool size.
**Validates: Requirements 5.5**

### Property 22: Error Logging
*For any* error that occurs in the application, it should be logged to Cloud Logging with the error message and stack trace.
**Validates: Requirements 6.1, 6.2**

### Property 23: Health Check Endpoint Availability
*For any* request to the `/health` endpoint, it should return a 200 status code with a JSON response indicating the application status.
**Validates: Requirements 6.3**

### Property 24: Startup and Shutdown Logging
*For any* application startup, a log entry should be created. *For any* application shutdown, a log entry should be created.
**Validates: Requirements 6.5**

### Property 25: Environment-Specific Configuration
*For any* deployment, the application should use environment-specific configuration values (secrets, database host, etc.) based on the deployment environment.
**Validates: Requirements 7.1, 7.2**

### Property 26: Configuration Validation
*For any* deployment, if required configuration values are missing, the deployment should fail with a clear error message.
**Validates: Requirements 7.4**

### Property 27: Local Docker Development
*For any* developer running the application locally with Docker, the application should start successfully and be accessible at `http://localhost:3000`.
**Validates: Requirements 7.5**

### Property 28: Background Job Processing
*For any* background job queued in the system, it should be processed by a worker within 5 minutes.
**Validates: Requirements 8.2**

### Property 29: Job Failure Logging
*For any* background job that fails, the failure should be logged with the job ID, error message, and retry count.
**Validates: Requirements 8.3**

### Property 30: Graceful Job Completion on Shutdown
*For any* Cloud Run instance receiving a SIGTERM signal, all in-flight background jobs should complete before the instance terminates.
**Validates: Requirements 8.4**

### Property 31: Job Distribution Across Instances
*For any* background jobs queued when multiple Cloud Run instances are running, the jobs should be distributed across instances.
**Validates: Requirements 8.5**

### Property 32: Traffic Shifting on Deployment
*For any* new deployment to Cloud Run, traffic should gradually shift from old instances to new instances over 5 minutes.
**Validates: Requirements 9.1**

### Property 33: Health Check Gating
*For any* new instance starting, it should not receive traffic until it passes health checks.
**Validates: Requirements 9.2**

### Property 34: Connection Draining on Replacement
*For any* instance being replaced, existing connections should be allowed to complete before the instance terminates.
**Validates: Requirements 9.3**

### Property 35: Automatic Rollback on Deployment Failure
*For any* deployment that fails, the system should automatically roll back to the previous version.
**Validates: Requirements 9.4**

### Property 36: Post-Deployment Health Verification
*For any* completed deployment, all instances should be healthy and serving traffic.
**Validates: Requirements 9.5**

### Property 37: Automated Backup Configuration
*For any* Cloud SQL instance, automated daily backups should be configured and running.
**Validates: Requirements 10.1**

### Property 38: Backup Retention Policy
*For any* backup created, it should be retained for at least 7 days.
**Validates: Requirements 10.2**

### Property 39: Restore Capability
*For any* backup within the retention period, the database should be restorable to that point in time.
**Validates: Requirements 10.3**

### Property 40: Restored Data Accessibility
*For any* restored database, all data should be accessible and queries should return correct results.
**Validates: Requirements 10.4**

### Property 41: Backup Encryption
*For any* backup stored, it should be encrypted at rest using Cloud SQL's default encryption.
**Validates: Requirements 10.5**

### Property 42: Auto-Scaling Under Load
*For any* sustained traffic increase, Cloud Run should create additional instances up to the configured maximum.
**Validates: Requirements 11.1**

### Property 43: Connection Pool Queuing
*For any* request when the connection pool is at capacity, the request should be queued and processed when a connection becomes available.
**Validates: Requirements 11.2**

### Property 44: Operation Prioritization
*For any* system under heavy load, authentication and data retrieval operations should be prioritized over background jobs.
**Validates: Requirements 11.3**

### Property 45: Graceful Degradation
*For any* request when the system is overloaded, a 503 Service Unavailable response should be returned with retry information.
**Validates: Requirements 11.4**

### Property 46: Scale-Down on Reduced Traffic
*For any* sustained traffic decrease, Cloud Run should remove excess instances to reduce costs.
**Validates: Requirements 11.5**

### Property 47: OAuth Credentials in Secret Manager
*For any* deployment, Google OAuth credentials should be stored in Secret Manager and not in code or environment files.
**Validates: Requirements 12.1**

### Property 48: Service Account Minimal Permissions
*For any* Cloud Run service account, it should have only the minimum required permissions to access Secret Manager.
**Validates: Requirements 12.2**

### Property 49: OAuth Token Signature Validation
*For any* user authentication via Google OAuth, the ID token signature should be validated using Google's public keys.
**Validates: Requirements 12.3**

### Property 50: OAuth Token Encryption
*For any* OAuth token stored in the database, it should be encrypted at rest using a key managed by Google Cloud KMS.
**Validates: Requirements 12.4**

### Property 51: No Secrets in Application Logs
*For any* log entry, OAuth tokens, user credentials, and other sensitive authentication data should never appear.
**Validates: Requirements 12.5**

### Property 52: OAuth Token Cleanup on Disconnect
*For any* user who disconnects their Google account, the stored OAuth token should be deleted from the database.
**Validates: Requirements 12.6**

## Error Handling

### Deployment Errors

**Docker Build Failure:**
- Log the build error with details
- Notify the team via Cloud Build notifications
- Prevent deployment to Cloud Run

**Test Failure:**
- Log test failures with details
- Prevent image push to Artifact Registry
- Prevent deployment to Cloud Run

**Deployment Failure:**
- Log deployment error
- Automatically roll back to previous version
- Notify the team
- Keep previous version running

### Runtime Errors

**Database Connection Failure:**
- Retry with exponential backoff
- Log connection errors
- Return 503 if unable to connect after retries

**Secret Retrieval Failure:**
- Fail fast on startup
- Log the error with details
- Prevent application from starting

**Health Check Failure:**
- Log the failure
- Cloud Run will automatically restart the instance
- If persistent, instance will be removed and replaced

### Graceful Degradation

**Under Heavy Load:**
- Queue requests if connection pool is full
- Return 503 if unable to queue
- Prioritize critical operations

**During Deployment:**
- Gradually shift traffic to new instances
- Keep old instances running until new instances are healthy
- Automatically roll back if new instances fail health checks

## Testing Strategy

### Unit Testing

Unit tests verify specific examples and edge cases:

- **Docker image tests:** Verify image contains required files and dependencies
- **Configuration validation tests:** Verify environment variables are validated
- **Graceful shutdown tests:** Verify connections are closed on shutdown
- **Secret retrieval tests:** Verify secrets are retrieved from Secret Manager
- **Health check tests:** Verify health check endpoint returns correct status

### Property-Based Testing

Property-based tests verify universal properties across all inputs:

- **Auto-scaling properties:** Verify instances are created/removed based on load
- **Connection pool properties:** Verify connection pool maintains health under load
- **Deployment properties:** Verify traffic shifting and rollback work correctly
- **Backup properties:** Verify backups are created and can be restored
- **Security properties:** Verify secrets are not logged and tokens are encrypted

### Integration Testing

Integration tests verify components work together:

- **End-to-end deployment:** Deploy to Cloud Run and verify application is accessible
- **Database migration:** Verify migrations run on deployment
- **CI/CD pipeline:** Verify pipeline builds, tests, and deploys correctly
- **Backup and restore:** Verify backups can be created and restored

### Testing Framework

- **Unit tests:** Vitest with fast-check for property-based testing
- **Integration tests:** Supertest for HTTP testing
- **Deployment tests:** Cloud Build with custom test scripts
- **Load testing:** Custom scripts to simulate traffic spikes

### Test Configuration

- **Minimum iterations:** 100 iterations per property-based test
- **Test timeout:** 30 seconds per test
- **Coverage target:** >80% for core deployment logic
- **CI/CD integration:** All tests must pass before deployment

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass locally
- [ ] Docker image builds successfully
- [ ] Environment variables are configured
- [ ] Secrets are stored in Secret Manager
- [ ] Cloud SQL instance is created and migrations are run
- [ ] Cloud Build pipeline is configured
- [ ] Cloud Run service is configured with correct scaling parameters
- [ ] Health check endpoint is working
- [ ] Monitoring and logging are configured
- [ ] Backup configuration is verified
- [ ] Team is notified of deployment

## Future Enhancements

Post-hackathon improvements:

- **Multi-region deployment:** Deploy to multiple regions for high availability
- **Advanced monitoring:** Add metrics and alerting for performance and errors
- **Load testing:** Implement automated load testing in CI/CD pipeline
- **Canary deployments:** Implement traffic splitting for safer deployments
- **Database replication:** Add read replicas for scaling read-heavy workloads
- **CDN integration:** Add Cloud CDN for caching static assets
- **Custom domain:** Map custom domain to Cloud Run service
- **API rate limiting:** Implement rate limiting middleware
- **Request tracing:** Add distributed tracing with Cloud Trace
