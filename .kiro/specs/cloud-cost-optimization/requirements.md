# Cloud Cost Optimization Requirements

## Overview
Reduce GCP hosting costs from ~$110/month to ~$40-50/month while maintaining scalability for dozens to hundreds of users on the catchup.club production deployment.

## Current Cost Breakdown (Jan 1 - Feb 8, 2026)
| Service | Cost | % of Total |
|---------|------|------------|
| Cloud Memorystore (Redis) | $60.70 | 55% |
| Cloud Run | $17.26 | 16% |
| Cloud SQL | $15.86 | 14% |
| Networking | $7.47 | 7% |
| Compute Engine | $2.99 | 3% |
| Secret Manager | $1.81 | 2% |
| Cloud Build | $1.57 | 1% |
| Artifact Registry | $0.12 | <1% |

## Scaling Context
- Current: 1 user (development/testing)
- Near-term (weeks): Dozens of users
- Medium-term (months): Hundreds of users
- Architecture must scale without major refactoring

## User Stories

### 1. Replace Cloud Memorystore with Cost-Effective Redis
**As a** developer deploying CatchUp
**I want** to use a cheaper Redis provider than Cloud Memorystore
**So that** I can save ~$55/month while maintaining multi-user job queue functionality

#### Acceptance Criteria
- 1.1 Application works with Upstash Redis (serverless, pay-per-use)
- 1.2 Bull job queues continue to function correctly with TLS connections
- 1.3 Redis caching in `src/utils/cache.ts` works with Upstash
- 1.4 Connection configuration is environment-variable driven
- 1.5 Graceful error handling if Redis is temporarily unavailable
- 1.6 Documentation for setting up Upstash Redis

### 2. Optimize Cloud Run Configuration
**As a** developer deploying CatchUp
**I want** Cloud Run to scale efficiently
**So that** I minimize costs during low-traffic periods

#### Acceptance Criteria
- 2.1 Cloud Run minimum instances set to 0 (scale to zero)
- 2.2 Memory allocation kept at 512Mi (required for sync operations)
- 2.3 Max instances capped at 10 for cost control
- 2.4 Timeout reduced from 3600s to 300s
- 2.5 Application handles cold starts gracefully (target: <15 seconds)

### 3. Optimize Cloud Build Configuration
**As a** developer
**I want** to minimize Cloud Build costs
**So that** I reduce build expenses

#### Acceptance Criteria
- 3.1 Cloud Build uses smaller machine type (E2_MEDIUM instead of E2_HIGHCPU_8)
- 3.2 Build completes successfully with smaller machine
- 3.3 Build time increase is acceptable (<10 minutes)

### 4. Add HTTP Response Caching
**As a** user of CatchUp
**I want** the app to respond quickly on repeat page loads
**So that** I have a better user experience and reduce server load

#### Acceptance Criteria
- 4.1 Read-heavy API endpoints include appropriate Cache-Control headers
- 4.2 Contact list endpoint cached for 60 seconds
- 4.3 Groups and tags endpoints cached for 60 seconds
- 4.4 User preferences endpoint cached for 5 minutes
- 4.5 Cache headers use `private` directive (user-specific data)
- 4.6 Write operations invalidate relevant caches

### 5. Optimize Database Query Patterns
**As a** developer
**I want** API endpoints to make efficient database queries
**So that** request duration and CPU time are minimized

#### Acceptance Criteria
- 5.1 Independent database queries use `Promise.all()` for parallel execution
- 5.2 Dashboard/home page loads contacts, groups, and tags in parallel
- 5.3 Contact detail page loads contact, tags, and groups in parallel
- 5.4 No N+1 query patterns in list endpoints

### 6. Optimize Background Job Processing
**As a** developer
**I want** background jobs to process efficiently
**So that** memory usage is stable and predictable

#### Acceptance Criteria
- 6.1 Heavy job processors limited to 1 concurrent job (suggestion generation, contact sync)
- 6.2 Memory spikes during job processing are reduced
- 6.3 Job processing doesn't interfere with API request handling

## Technical Constraints
- Must maintain full multi-user functionality
- Must scale to hundreds of concurrent users
- Bull job queues must continue working (Redis required)
- PostgreSQL remains the primary database
- No breaking changes to existing functionality
- Memory allocation must support contact sync (1300+ contacts)

## Success Metrics
- Monthly GCP costs reduced to ~$40-50 (from $110)
- Application scales to 100+ users without architecture changes
- No degradation in user experience
- Job processing remains reliable under load
- Cold start times under 15 seconds
- No increase in error rates

## Out of Scope
- Cloud SQL migration to alternative providers (keep current setup)
- Major architectural changes
- Removing Redis entirely (needed for multi-user scaling)
