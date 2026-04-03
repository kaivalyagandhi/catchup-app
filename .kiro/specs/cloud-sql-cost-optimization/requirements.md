# Requirements Document

## Introduction

Cloud SQL is currently the second-largest GCP cost at ~$15.86/month (14% of total). The previous cost optimization spec (010-infra-cloud-cost-optimization) explicitly put Cloud SQL out of scope. Now that Redis has been migrated to Upstash and Cloud Run is optimized, Cloud SQL is one of the largest remaining costs.

**Current State (April 2025):**
- Instance: `db-f1-micro` (already optimal - ~$10/month)
- Storage: 10 GB SSD (auto-increase disabled)
- HA: Disabled (zonal)
- PITR: Disabled
- Backups: **Disabled** (needs to be enabled)

This spec targets reducing Cloud SQL costs through configuration optimization, query efficiency improvements (connection pool, batch upserts), and evaluation of serverless PostgreSQL alternatives.

## Glossary

- **Cloud_SQL_Instance**: The Google Cloud SQL managed PostgreSQL instance (`catchup-db`) running in `us-central1`
- **Connection_Pool**: The `pg` Pool in `src/db/connection.ts` managing database connections with configurable min/max/idle settings
- **Calendar_Event_Upsert**: The process in `calendar-events-repository.ts` that inserts or updates calendar events one-at-a-time in a loop within a transaction
- **Batch_Upsert**: A database operation that inserts or updates multiple rows in a single SQL statement using multi-row VALUES clauses
- **Serverless_PostgreSQL**: A PostgreSQL provider that charges per-query or per-compute-second rather than per-instance-hour (e.g., Neon, Supabase)
- **Instance_Tier**: The Cloud SQL machine type (e.g., `db-f1-micro`, `db-g1-small`) that determines CPU, memory, and cost
- **High_Availability**: Cloud SQL configuration that maintains a standby replica for automatic failover, doubling instance cost
- **Automated_Backups**: Cloud SQL feature that creates daily backups with configurable retention period and associated storage costs
- **Storage_Auto_Increase**: Cloud SQL setting that automatically grows disk size when usage exceeds a threshold, potentially over-provisioning storage
- **Cold_Start_Connection**: The first database connection established after Cloud Run scales from zero instances
- **Dead_Tuples**: PostgreSQL rows that are no longer visible to transactions but still occupy disk space, created by UPDATE and DELETE operations; cleaned up by autovacuum
- **IS_DISTINCT_FROM**: PostgreSQL comparison operator that treats NULL as a known value (NULL IS DISTINCT FROM NULL returns FALSE, unlike NULL = NULL)
- **EXCLUDED**: PostgreSQL pseudo-table in ON CONFLICT statements that references the proposed insertion values
- **WAL_Write_Ahead_Log**: PostgreSQL transaction log that ensures durability; PITR relies on WAL archiving which adds storage costs

## Requirements

### Requirement 1: Audit and Right-Size Cloud SQL Instance

**User Story:** As a developer managing GCP costs, I want the Cloud SQL instance configured with the smallest viable tier, so that I pay only for the compute resources the application actually needs.

#### Acceptance Criteria

1. **DONE** - Cloud SQL already uses `db-f1-micro` tier (shared vCPU, 614 MB RAM) at ~$10/month.
2. IF the `db-f1-micro` tier causes query timeouts exceeding 5 seconds under normal application load, THEN the instance SHALL be upgraded to `db-g1-small` tier (1 vCPU, 1.7 GB RAM) as the fallback.
3. **DONE** - High Availability is already disabled (zonal configuration).
4. **OPTIONAL** - HDD storage instead of SSD would save ~$1.70/month but current 10GB SSD performs well.
5. **DONE** - Storage auto-increase has been disabled by user.
6. **PENDING** - Automated backups are currently disabled - should enable 7-day retention for data safety. This is critical for disaster recovery.
7. IF the Cloud_SQL_Instance tier change causes query timeouts exceeding 5 seconds, THEN THE Cloud_SQL_Instance SHALL be reverted to the previous tier within 1 hour.
8. THE Cloud_SQL_Instance SHALL have the `cloudsql.iam_authentication` flag set to `off` unless Google Cloud SQL IAM authentication is explicitly required, to reduce connection overhead.

### Requirement 2: Optimize Connection Pool for Scale-to-Zero

**User Story:** As a developer, I want the database connection pool tuned for Cloud Run's scale-to-zero behavior, so that idle connections do not consume Cloud SQL resources unnecessarily.

#### Acceptance Criteria

1. THE Connection_Pool SHALL use a minimum connection count of 0 (instead of the current value of 2) to avoid holding idle connections when the Cloud Run instance is about to scale down.
2. THE Connection_Pool SHALL use a maximum connection count of 5 (reduced from 10) for single-user workloads, configurable via the `DATABASE_POOL_MAX` environment variable.
3. THE Connection_Pool SHALL use an idle timeout of 10 seconds (reduced from 30 seconds) to release unused connections promptly after request completion.
4. THE Connection_Pool SHALL set `connectionTimeoutMillis` to 5000 (5 seconds) for faster failure detection on cold starts.
5. THE Connection_Pool SHALL NOT use persistent connections (CONN_MAX_AGE equivalent) to prevent stale connections when Cloud Run scales to zero.
6. WHEN a Cold_Start_Connection is established, THE Connection_Pool SHALL connect within 5 seconds and log the connection establishment time.
7. IF the Connection_Pool fails to establish a connection within 5 seconds, THEN THE Connection_Pool SHALL retry once with exponential backoff before returning an error to the caller.
8. THE Connection_Pool SHALL emit a log message when connections are acquired and released for debugging connection pool behavior.

### Requirement 3: Batch Calendar Event Upserts

**User Story:** As a developer, I want calendar event syncs to use batch database operations, so that sync operations complete faster and consume fewer Cloud SQL CPU cycles.

#### Acceptance Criteria

1. WHEN syncing calendar events, THE Calendar_Event_Upsert SHALL use a single multi-row INSERT statement with an ON CONFLICT clause instead of executing individual INSERT statements in a loop.
2. THE Batch_Upsert SHALL process calendar events in batches of up to 100 rows per SQL statement (PostgreSQL default limit is 32767 parameters, 11 columns × ~3000 rows = 33000, so 100 is safe).
3. THE Batch_Upsert SHALL use the `EXCLUDED` pseudo-table to reference values in the ON CONFLICT UPDATE clause, avoiding repeated parameter binding.
4. THE Batch_Upsert SHALL maintain the existing transactional guarantee (all events in a sync batch succeed or all fail).
5. THE Batch_Upsert SHALL include a WHERE clause to skip updates when all column values are identical to the existing row (using `WHERE column_name IS DISTINCT FROM EXCLUDED.column_name`), reducing unnecessary writes and WAL growth.
6. WHEN a batch of 100 calendar events is upserted, THE Batch_Upsert SHALL complete in fewer SQL round-trips than the current one-at-a-time approach (target: 1-2 round-trips instead of 100).
7. FOR ALL valid calendar event arrays, upserting via Batch_Upsert then reading back SHALL produce equivalent results to the current one-at-a-time upsert (round-trip property).

### Requirement 4: Evaluate and Document Serverless PostgreSQL Alternatives

**User Story:** As a developer planning for cost efficiency, I want a documented evaluation of serverless PostgreSQL providers, so that I can make an informed decision about migrating away from Cloud SQL.

#### Acceptance Criteria

1. THE evaluation document SHALL compare at least three alternatives: Neon (serverless PostgreSQL), Supabase (managed PostgreSQL), and self-hosted PostgreSQL on Cloud Run.
2. THE evaluation document SHALL include cost projections for each alternative at three usage tiers: 1 user, 50 users, and 200 users.
3. THE evaluation document SHALL assess connection compatibility with the existing `pg` Pool driver, noting that Neon and Supabase use TCP connections (not Unix sockets like Cloud SQL).
4. THE evaluation document SHALL assess data migration complexity, including schema compatibility and downtime requirements.
5. THE evaluation document SHALL include a recommendation with a break-even analysis showing at which user count Cloud SQL becomes more cost-effective than the recommended alternative.
6. THE evaluation document SHALL note that Neon offers a free tier with 0.5 GB storage and 1 project, suitable for development but limited for production.
7. THE evaluation document SHALL note that Supabase provides a free tier with 500 MB database and 2 concurrent connections, which may be insufficient for production.
8. THE evaluation document SHALL assess cold start latency impact on application response times for each alternative.
9. WHEN a serverless alternative offers a free tier that covers the current workload, THE evaluation document SHALL flag the alternative as a candidate for immediate migration.

### Requirement 5: Reduce Unnecessary Database Writes

**User Story:** As a developer, I want to minimize redundant database write operations, so that Cloud SQL CPU usage and I/O costs are reduced.

#### Acceptance Criteria

1. WHEN syncing calendar events, THE Calendar_Event_Upsert SHALL skip updating rows where all column values are identical to the existing row (conditional upsert using WHERE clause with `IS DISTINCT FROM`).
2. WHEN the cleanup function deletes calendar events older than 30 days, THE cleanup function SHALL execute as a single DELETE statement with a date filter (current behavior confirmed, no change needed).
3. THE application SHALL avoid writing unchanged data during contact sync operations by comparing incoming data with cached values before issuing UPDATE statements.
4. THE application SHALL use `ON CONFLICT DO NOTHING` for inserts that may frequently conflict, rather than `ON CONFLICT DO UPDATE`, to avoid transaction rollbacks and dead tuple accumulation.
5. WHEN a database write is skipped due to no changes detected, THE application SHALL log the skip at debug level for observability.
6. THE application SHALL ensure autovacuum is enabled on Cloud SQL (default) to clean up dead tuples from frequent upserts.

### Requirement 6: Monitor and Alert on Cloud SQL Costs

**User Story:** As a developer, I want visibility into Cloud SQL resource usage, so that I can detect cost anomalies and validate optimization effectiveness.

#### Acceptance Criteria

1. THE Cloud_SQL_Instance SHALL have Cloud Monitoring alerts configured for CPU utilization exceeding 80% sustained over 15 minutes.
2. THE Cloud_SQL_Instance SHALL have Cloud Monitoring alerts configured for storage usage exceeding 80% of provisioned capacity.
3. THE Cloud_SQL_Instance SHALL have Cloud Monitoring alerts configured for active connection count exceeding 20 connections.
4. THE Cloud_SQL_Instance SHALL have Cloud Monitoring alerts configured for database disk queue depth exceeding 1000, indicating I/O bottlenecks.
5. THE application SHALL log database query execution time for queries exceeding 1 second at warn level.
6. THE application SHALL expose a `/health` endpoint that includes database connection status and latency for load balancer health checks.
7. WHEN a GCP billing alert for Cloud SQL exceeds $12/month (75% of current cost), THE monitoring configuration SHALL send a notification to the project owner.

### Requirement 7: Optimize Cloud SQL Maintenance and Networking

**User Story:** As a developer, I want Cloud SQL maintenance and networking configured for minimal cost, so that I avoid paying for unnecessary features.

#### Acceptance Criteria

1. THE Cloud_SQL_Instance SHALL have the maintenance window set to a low-traffic period (Sunday 02:00-06:00 UTC).
2. THE Cloud_SQL_Instance SHALL have the maintenance release channel set to "Production" (default) to receive stable, tested updates.
3. THE Cloud_SQL_Instance SHALL have query insights disabled if not actively used for debugging, to reduce monitoring overhead.
4. THE Cloud_SQL_Instance SHALL use Private IP connectivity only (no Public IP) to eliminate public IP costs and reduce networking charges.
5. THE Cloud_SQL_Instance SHALL have point-in-time recovery (PITR) disabled for deployments serving fewer than 50 users, to reduce WAL storage costs.
6. IF PITR is disabled, THEN THE Automated_Backups SHALL remain enabled as the primary recovery mechanism.
7. THE Cloud_SQL_Instance SHALL be configured with the `max_connections` flag set to a value appropriate for the instance tier (default is usually sufficient, but should not exceed 100 for db-g1-small).
8. THE Cloud_SQL_Instance SHALL have the `log_min_duration_statement` flag set to 1000 (1 second) to log slow queries without excessive logging overhead.

### Requirement 8: Evaluate Cloud SQL Managed Connection Pooling

**User Story:** As a developer, I want to evaluate Cloud SQL's built-in connection pooling, so that I can reduce connection overhead and improve scalability.

#### Acceptance Criteria

1. THE evaluation SHALL assess Cloud SQL Managed Connection Pooling (currently in Preview) as an alternative to application-level pooling.
2. THE evaluation SHALL note that managed pooling can absorb sudden connection spikes without requiring application-level pool size increases.
3. THE evaluation SHALL assess whether managed pooling is compatible with the existing pg Pool configuration in `src/db/connection.ts`.
4. IF managed pooling is enabled, THE application SHALL use fewer application-level connections (DATABASE_POOL_MAX=2) to avoid double-pooling.
5. THE evaluation SHALL be documented in the design document with a recommendation on whether to enable managed pooling.
