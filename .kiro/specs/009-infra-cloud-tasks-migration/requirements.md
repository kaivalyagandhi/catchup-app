# Cloud Tasks Migration Requirements

**Feature Name**: cloud-tasks-migration  
**Created**: 2026-02-19  
**Status**: Draft  
**Priority**: High (Production Issue - BullMQ incompatible with serverless)

---

## Problem Statement

The current job queue system uses BullMQ with TCP-based Redis connections (ioredis), which is fundamentally incompatible with serverless Cloud Run environments. This causes:

- **Production failures**: All 11 BullMQ workers failing with "Stream isn't writeable" errors
- **Zombie connections**: Containers freeze → TCP connections killed → ETIMEDOUT errors
- **Architectural mismatch**: BullMQ requires persistent connections; Cloud Run containers freeze/thaw unpredictably
- **Cost inefficiency**: Paying $2.53/month for Upstash Redis that doesn't work properly

**Root Cause**: Upstash explicitly states that TCP-based clients (ioredis/BullMQ) are incompatible with serverless due to the zombie connection problem. They recommend HTTP-based clients only.

**Solution**: Migrate to Google Cloud Tasks, which uses stateless HTTP requests designed specifically for serverless environments.

---

## Business Goals

1. **Fix Production Issues**: Eliminate all BullMQ connection failures in production
2. **Cost Savings**: Reduce queue infrastructure cost from $2.53/month to $0/month (free tier)
3. **Architectural Alignment**: Use serverless-native queue system designed for Cloud Run
4. **Reliability**: Achieve >99.9% job execution success rate
5. **Maintainability**: Simplify queue infrastructure (no connection management)

---

## User Stories

### US-1: As a system administrator, I want all background jobs to execute reliably so that users receive timely notifications and data syncs

**Acceptance Criteria**:
- 1.1: All 11 job types execute successfully in production
- 1.2: Job execution success rate >99.9%
- 1.3: No "Stream isn't writeable" or ETIMEDOUT errors in logs
- 1.4: Jobs complete within expected timeframes (no delays >5 minutes)

### US-2: As a developer, I want to enqueue jobs using a simple API so that I can easily add new background tasks

**Acceptance Criteria**:
- 2.1: Job enqueue API is similar to current BullMQ interface
- 2.2: Can schedule jobs for future execution (up to 30 days)
- 2.3: Can pass arbitrary JSON data to job handlers
- 2.4: Can configure retry behavior per job type
- 2.5: Job creation latency <100ms

### US-3: As a system administrator, I want automatic retry with exponential backoff so that transient failures don't cause permanent job loss

**Acceptance Criteria**:
- 3.1: Failed jobs automatically retry with exponential backoff
- 3.2: Configurable max attempts per job type (default: 5)
- 3.3: Configurable backoff parameters (min: 1s, max: 300s)
- 3.4: Permanent failures (4xx errors) don't retry
- 3.5: Transient failures (5xx, 429, 503) retry automatically

### US-4: As a developer, I want to prevent duplicate job execution so that idempotent operations aren't repeated unnecessarily

**Acceptance Criteria**:
- 4.1: Each job has a unique idempotency key
- 4.2: Duplicate jobs (same key) return success without re-execution
- 4.3: Idempotency keys expire after 24 hours (Cloud Tasks deduplication window)
- 4.4: Idempotency check latency <50ms

### US-5: As a system administrator, I want comprehensive monitoring and logging so that I can troubleshoot job failures

**Acceptance Criteria**:
- 5.1: All job executions logged to Cloud Logging
- 5.2: Job metrics available in Cloud Monitoring (success rate, latency, queue depth)
- 5.3: Failed jobs include error messages and stack traces
- 5.4: Can view job history for past 7 days
- 5.5: Alerts for job failure rate >1%

### US-6: As a system administrator, I want zero-downtime migration so that existing jobs continue to execute during the transition

**Acceptance Criteria**:
- 6.1: Migration can be rolled back without data loss
- 6.2: Both BullMQ and Cloud Tasks can run simultaneously during migration
- 6.3: No jobs lost during cutover
- 6.4: Cutover window <1 hour

### US-7: As a developer, I want OIDC authentication to Cloud Run endpoints so that job handlers are secure

**Acceptance Criteria**:
- 7.1: Cloud Tasks automatically generates OIDC tokens
- 7.2: Cloud Run validates OIDC tokens on all job handler requests
- 7.3: Invalid tokens return 401 Unauthorized
- 7.4: Service account has minimal required permissions (Cloud Run Invoker)

### US-8: As a system administrator, I want to reduce infrastructure costs so that we can allocate budget to features

**Acceptance Criteria**:
- 8.1: Queue infrastructure cost reduced from $2.53/month to $0/month
- 8.2: No additional GCP costs introduced (stay within free tier)
- 8.3: Annual savings: $30/year

---

## Current Job Types (11 Total)

### Critical Jobs (User-Facing)
1. **token-refresh**: Refresh expiring OAuth tokens (prevents auth failures)
2. **calendar-sync**: Sync Google Calendar events (user-facing data)
3. **google-contacts-sync**: Sync Google Contacts (user-facing data)

### Medium-Risk Jobs
4. **adaptive-sync**: Adjust sync frequencies based on data changes
5. **webhook-renewal**: Renew expiring Calendar webhooks
6. **suggestion-regeneration**: Regenerate AI suggestions (heavy AI processing)
7. **batch-notifications**: Send batched notifications to users
8. **suggestion-generation**: Generate new AI suggestions (heavy AI processing)

### Non-Critical Jobs
9. **webhook-health-check**: Monitor webhook health
10. **notification-reminder**: Send reminders for unresolved issues
11. **token-health-reminder**: Remind users about token issues

---

## Technical Requirements

### TR-1: Queue Infrastructure
- TR-1.1: Create 11 Cloud Tasks queues (one per job type) using `createQueue` API
- TR-1.2: Configure retry policies per queue (maxAttempts, minBackoff, maxBackoff, maxDoublings)
- TR-1.3: Configure rate limits per queue (maxDispatchesPerSecond: default 500, maxConcurrentDispatches: default 1000)
- TR-1.4: Use `us-central1` region (same as Cloud Run service)
- TR-1.5: Queue naming format: `{job-type}-queue` (e.g., `token-refresh-queue`)
- TR-1.6: Default retry config: maxAttempts=5, minBackoff=1s, maxBackoff=300s, maxDoublings=3

### TR-2: Job Handler Endpoint
- TR-2.1: Create `/api/jobs/:jobName` POST endpoint in Cloud Run
- TR-2.2: Validate OIDC tokens on all requests (verify audience and issuer)
- TR-2.3: Check idempotency keys before execution (Redis lookup)
- TR-2.4: Return 200 for success, 5xx for retryable errors, 4xx for permanent failures
- TR-2.5: Handle all 11 job types in single endpoint (route by jobName parameter)
- TR-2.6: Parse base64-encoded request body
- TR-2.7: Extract job data and idempotency key from request body
- TR-2.8: Set appropriate timeout (default: 10 minutes, max: 30 minutes)

### TR-3: Cloud Tasks Client
- TR-3.1: Install `@google-cloud/tasks` npm package (official Node.js client library)
- TR-3.2: Create `CloudTasksQueue` class with BullMQ-compatible interface
- TR-3.3: Support `add(jobName, data, options)` method
- TR-3.4: Support delayed job execution (scheduleTime up to 30 days)
- TR-3.5: Generate idempotency keys automatically using hash(jobName + data)
- TR-3.6: Use service account for OIDC authentication (automatic token generation)
- TR-3.7: Base64-encode task payload (required by Cloud Tasks API)
- TR-3.8: Set Content-Type header to 'application/json'

### TR-4: Idempotency System
- TR-4.1: Store idempotency keys in Upstash Redis (HTTP client)
- TR-4.2: Key format: `idempotency:{jobName}:{hash(data)}`
- TR-4.3: TTL: 24 hours (matches Cloud Tasks deduplication window)
- TR-4.4: Return cached result for duplicate requests

### TR-5: Migration Strategy
- TR-5.1: Feature flag to switch between BullMQ and Cloud Tasks
- TR-5.2: Parallel execution during migration (both systems active)
- TR-5.3: Gradual rollout (1 job type at a time)
- TR-5.4: Rollback capability without data loss

### TR-6: Monitoring & Observability
- TR-6.1: Log all job enqueues to Cloud Logging (task name, queue, schedule time)
- TR-6.2: Log all job executions (start, success, failure, duration)
- TR-6.3: Create Cloud Monitoring dashboard for job metrics:
  - Task creation rate (per queue)
  - Task execution rate (per queue)
  - Task execution latency (p50, p95, p99)
  - Task failure rate (per queue)
  - Queue depth (tasks waiting)
- TR-6.4: Alert on job failure rate >1% (per queue)
- TR-6.5: Track job execution duration (p50, p95, p99)
- TR-6.6: Use Cloud Tasks built-in metrics (available in Cloud Monitoring)
- TR-6.7: Correlate logs using trace IDs from Cloud Tasks headers

### TR-7: Error Handling
- TR-7.1: Retry transient errors (5xx, 429, 503) with exponential backoff
- TR-7.2: Don't retry permanent errors (4xx except 429)
- TR-7.3: Log all errors with full context (job data, error message, stack trace)
- TR-7.4: Send alerts for critical job failures (token-refresh, calendar-sync, google-contacts-sync)
- TR-7.5: Use Cloud Tasks retry headers for debugging:
  - `X-CloudTasks-TaskRetryCount`: Number of retries
  - `X-CloudTasks-TaskExecutionCount`: Total execution attempts
  - `X-CloudTasks-TaskPreviousResponse`: Previous HTTP response code
  - `X-CloudTasks-TaskRetryReason`: Reason for retry

### TR-8: Cloud Tasks Headers
- TR-8.1: Parse and log Cloud Tasks headers for observability:
  - `X-CloudTasks-QueueName`: Queue name
  - `X-CloudTasks-TaskName`: Task ID
  - `X-CloudTasks-TaskRetryCount`: Retry attempt number
  - `X-CloudTasks-TaskExecutionCount`: Total execution count
  - `X-CloudTasks-TaskETA`: Scheduled execution time (Unix timestamp)
- TR-8.2: Use headers for debugging and monitoring (not for authentication)
- TR-8.3: Validate that headers match expected values (queue name, task name)

---

## Non-Functional Requirements

### Performance
- NFR-1: Job enqueue latency <100ms (p95)
- NFR-2: Job execution start latency <5 seconds (p95)
- NFR-3: Idempotency check latency <50ms (p95)
- NFR-4: Support 100 jobs/minute per queue

### Reliability
- NFR-5: Job execution success rate >99.9%
- NFR-6: Zero job loss during migration
- NFR-7: Automatic retry for transient failures
- NFR-8: Graceful degradation if Cloud Tasks unavailable

### Security
- NFR-9: OIDC token authentication for all job handlers
- NFR-10: Service account with minimal permissions (Cloud Run Invoker only)
- NFR-11: No sensitive data in job payloads (use references)
- NFR-12: Audit logging for all job operations

### Maintainability
- NFR-13: BullMQ-compatible API for easy migration
- NFR-14: Comprehensive error messages and logging
- NFR-15: Self-documenting code with TypeScript types
- NFR-16: Unit tests for all queue operations

### Cost
- NFR-17: Stay within Cloud Tasks free tier (1M operations/month)
- NFR-18: Reduce queue infrastructure cost to $0/month
- NFR-19: No additional GCP costs introduced

---

## Constraints

### Technical Constraints
- C-1: Must use Cloud Tasks (no other queue systems considered)
- C-2: Must maintain BullMQ-compatible interface during migration
- C-3: Must use existing service account (402592213346-compute@developer.gserviceaccount.com)
- C-4: Must use Upstash Redis (HTTP client) for idempotency
- C-5: Must deploy to existing Cloud Run service (no new services)

### Business Constraints
- C-6: Zero-downtime migration required
- C-7: Migration must complete within 2 weeks
- C-8: No budget for additional infrastructure

### Operational Constraints
- C-9: Must maintain existing job processor logic (no changes to business logic)
- C-10: Must preserve job execution history during migration
- C-11: Must support rollback to BullMQ if issues arise

---

## Success Metrics

### Primary Metrics
1. **Job Execution Success Rate**: >99.9% (currently ~0% due to BullMQ failures)
2. **Production Error Rate**: 0 "Stream isn't writeable" errors (currently 100%)
3. **Cost Savings**: $30/year ($2.53/month → $0/month)
4. **Migration Completion**: 100% of job types migrated within 2 weeks

### Secondary Metrics
5. **Job Enqueue Latency**: <100ms p95
6. **Job Execution Start Latency**: <5 seconds p95
7. **Idempotency Check Latency**: <50ms p95
8. **Duplicate Job Prevention**: >99% of duplicates caught

---

## Out of Scope

The following are explicitly out of scope for this migration:

1. **Job Processor Logic Changes**: Business logic in job processors remains unchanged
2. **New Job Types**: Only migrate existing 11 job types
3. **Queue UI/Dashboard**: No custom UI for queue management (use Cloud Console)
4. **Advanced Scheduling**: No cron-like scheduling (use Cloud Scheduler separately)
5. **Job Prioritization**: All jobs have equal priority
6. **Dead Letter Queues**: Failed jobs logged but not moved to DLQ
7. **Job Chaining**: No support for job dependencies or workflows
8. **Rate Limiting Changes**: Keep existing rate limits per job type

---

## Dependencies

### External Dependencies
- **Google Cloud Tasks API**: Must be enabled in project
- **Cloud Run Service**: Must be deployed and accessible
- **Service Account**: Must have Cloud Run Invoker role
- **Upstash Redis**: Must be accessible via HTTP client

### Internal Dependencies
- **HTTP Redis Client**: Already implemented (`src/utils/http-redis-client.ts`)
- **Job Processors**: All 11 processors must remain unchanged
- **Environment Variables**: Must add Cloud Tasks configuration

---

## Risks & Mitigations

### High Risk
**R-1: Duplicate Job Execution** (>99.999% single execution, but duplicates possible)
- **Impact**: High - could cause duplicate notifications or data corruption
- **Mitigation**: Implement idempotency keys with Redis storage
- **Fallback**: Make all job processors idempotent

### Medium Risk
**R-2: Migration Complexity** (11 job types, production system)
- **Impact**: Medium - could cause downtime or job loss
- **Mitigation**: Gradual rollout, feature flag, parallel execution
- **Fallback**: Rollback to BullMQ if issues arise

**R-3: Vendor Lock-in** (GCP-specific)
- **Impact**: Medium - harder to migrate to other cloud providers
- **Mitigation**: Abstract queue interface (already done with queue-factory pattern)
- **Fallback**: Acceptable trade-off for native integration

### Low Risk
**R-4: Execution Order** (no guarantees)
- **Impact**: Low - jobs already designed to be order-independent
- **Mitigation**: None needed, acceptable for our use case

**R-5: Occasional Delays** (few minutes during system restarts)
- **Impact**: Low - jobs are not time-critical
- **Mitigation**: None needed, acceptable for our use case

---

## Code Examples from Official Documentation

### Installing the Client Library
```bash
npm install @google-cloud/tasks
```

### Basic Task Creation with OIDC Authentication (Official Example)
```typescript
// Imports the Google Cloud Tasks library
const {CloudTasksClient} = require('@google-cloud/tasks');

// Instantiates a client
const client = new CloudTasksClient();

async function createHttpTaskWithToken() {
  const project = 'my-project-id';
  const queue = 'my-queue';
  const location = 'us-central1';
  const url = 'https://example.com/taskhandler';
  const serviceAccountEmail = 'client@<project-id>.iam.gserviceaccount.com';
  const payload = 'Hello, World!';

  // Construct the fully qualified queue name
  const parent = client.queuePath(project, location, queue);

  const task = {
    httpRequest: {
      headers: {
        'Content-Type': 'text/plain',
      },
      httpMethod: 'POST',
      url,
      oidcToken: {
        serviceAccountEmail,
      },
    },
  };

  if (payload) {
    task.httpRequest.body = Buffer.from(payload).toString('base64');
  }

  console.log('Sending task:');
  console.log(task);
  
  // Send create task request
  const request = {parent: parent, task: task};
  const [response] = await client.createTask(request);
  const name = response.name;
  console.log(`Created task ${name}`);
}
```

### Task with OIDC Authentication for Cloud Run (Official Example)
```typescript
const MAX_SCHEDULE_LIMIT = 30 * 60 * 60 * 24; // 30 days in seconds

const createHttpTaskWithToken = async function (
  project = 'my-project-id',
  queue = 'my-queue',
  location = 'us-central1',
  url = 'https://your-service-xyz.run.app/endpoint',
  email = '<member>@<project-id>.iam.gserviceaccount.com',
  payload = 'Hello, World!',
  date = new Date()
) {
  const {v2beta3} = require('@google-cloud/tasks');
  const client = new v2beta3.CloudTasksClient();

  const parent = client.queuePath(project, location, queue);

  // Convert message to buffer and base64 encode
  const convertedPayload = JSON.stringify(payload);
  const body = Buffer.from(convertedPayload).toString('base64');

  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url,
      oidcToken: {
        serviceAccountEmail: email,
        audience: url, // IMPORTANT: Set audience to target URL
      },
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    },
  };

  const convertedDate = new Date(date);
  const currentDate = new Date();

  // Schedule time validation
  if (convertedDate < currentDate) {
    console.error('Scheduled date in the past.');
  } else if (convertedDate > currentDate) {
    const date_diff_in_seconds = (convertedDate - currentDate) / 1000;
    
    // Restrict schedule time to 30 day maximum
    if (date_diff_in_seconds > MAX_SCHEDULE_LIMIT) {
      console.error('Schedule time is over 30 day maximum.');
    }
    
    // Construct future date in Unix time
    const date_in_seconds =
      Math.min(date_diff_in_seconds, MAX_SCHEDULE_LIMIT) + Date.now() / 1000;
    
    // Add schedule time to request
    task.scheduleTime = {
      seconds: date_in_seconds,
    };
  }

  try {
    const [response] = await client.createTask({parent, task});
    console.log(`Created task ${response.name}`);
    return response.name;
  } catch (error) {
    console.error(Error(error.message));
  }
};
```

### Queue Configuration with Retry Policy (Official Format)
```json
{
  "name": "projects/PROJECT_ID/locations/LOCATION/queues/QUEUE_ID",
  "rateLimits": {
    "maxDispatchesPerSecond": 500,
    "maxBurstSize": 100,
    "maxConcurrentDispatches": 1000
  },
  "retryConfig": {
    "maxAttempts": 100,
    "minBackoff": "0.100s",
    "maxBackoff": "3600s",
    "maxDoublings": 16
  },
  "state": "RUNNING"
}
```

### RetryConfig Fields (Official Documentation)
- **maxAttempts** (integer): Number of attempts per task. -1 = unlimited attempts
- **maxRetryDuration** (string): Time limit for retrying (e.g., "3600s"). 0 = unlimited
- **minBackoff** (string): Minimum delay between retries (e.g., "1s")
- **maxBackoff** (string): Maximum delay between retries (e.g., "300s")
- **maxDoublings** (integer): Number of times retry interval doubles before linear increase

**Retry Algorithm Example**:
If minBackoff=10s, maxBackoff=300s, maxDoublings=3:
- 1st retry: 10s
- 2nd retry: 20s (doubled)
- 3rd retry: 40s (doubled)
- 4th retry: 80s (doubled)
- 5th retry: 160s (linear increase by 2^3 * 10s)
- 6th retry: 240s (linear increase)
- 7th+ retry: 300s (capped at maxBackoff)

---

## Assumptions

1. **Cloud Tasks Availability**: Cloud Tasks service is reliable and available
2. **Service Account Permissions**: Existing service account has necessary permissions
3. **Job Processor Idempotency**: Job processors can handle duplicate execution
4. **Free Tier Sufficiency**: 1M operations/month is sufficient for our usage (~50K/month)
5. **HTTP Redis Performance**: Upstash Redis HTTP client is fast enough for idempotency checks
6. **Cloud Run Stability**: Cloud Run service is stable and can handle job handler requests

---

## References

### Official Documentation
- [Cloud Tasks Documentation](https://cloud.google.com/tasks/docs)
- [Cloud Tasks Node.js Client Library](https://cloud.google.com/nodejs/docs/reference/tasks/latest)
- [Cloud Tasks Quotas](https://cloud.google.com/tasks/docs/quotas)
- [Common Pitfalls](https://cloud.google.com/tasks/docs/common-pitfalls)
- [Authentication](https://cloud.google.com/tasks/docs/authentication)
- [Cloud Run Tutorial](https://cloud.google.com/tasks/docs/tutorial-gcf)
- [Creating Queues](https://cloud.google.com/tasks/docs/creating-queues)
- [Creating HTTP Target Tasks](https://cloud.google.com/tasks/docs/creating-http-target-tasks)
- [Client Libraries](https://cloud.google.com/tasks/docs/reference/libraries)
- [RetryConfig Reference](https://cloud.google.com/tasks/docs/reference/rest/v2/projects)

### NPM Package
- [@google-cloud/tasks](https://www.npmjs.com/package/@google-cloud/tasks) - Official Node.js client library
- Installation: `npm install @google-cloud/tasks`
- Semantic Versioning: Stable library, backwards-compatible
- Node.js Support: All active and maintenance LTS versions
- **Code Examples**: 3,891 snippets available via Context7 documentation

### Internal Documentation
- [CLOUD_TASKS_RESEARCH.md](../../../CLOUD_TASKS_RESEARCH.md) - Comprehensive research findings
- [BULLMQ_SERVERLESS_FIX.md](../../../BULLMQ_SERVERLESS_FIX.md) - Why BullMQ is incompatible
- [CLOUD_TASKS_VS_QSTASH_ANALYSIS.md](../../../CLOUD_TASKS_VS_QSTASH_ANALYSIS.md) - Cost comparison
- [QUEUE_MIGRATION_ANALYSIS.md](../../../QUEUE_MIGRATION_ANALYSIS.md) - Migration analysis

### Existing Code
- `src/jobs/queue-factory.ts` - Current queue factory pattern
- `src/jobs/bullmq-queue.ts` - Current BullMQ queue definitions (11 queues)
- `src/jobs/bullmq-worker.ts` - Current BullMQ worker implementation (11 workers)
- `src/utils/http-redis-client.ts` - HTTP Redis client for idempotency

---

## Approval

**Status**: Awaiting approval  
**Reviewers**: Product Owner, Tech Lead  
**Approval Date**: TBD

---

**Next Steps**: Create design document with detailed architecture and implementation plan
