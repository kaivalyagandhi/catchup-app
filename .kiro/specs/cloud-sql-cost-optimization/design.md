# Design Document: Cloud SQL Cost Optimization

## Overview

This design addresses the remaining cost optimization items for Cloud SQL. The current Cloud SQL instance (`db-f1-micro`) costs ~$15.86/month. Previous optimizations (instance tier, HA, storage auto-increase) are already complete. This design covers connection pool optimization, batch upserts, serverless alternatives evaluation, and GCP configuration.

## Architecture

### Current Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Cloud Run     │────▶│  pg Pool (min=2, │────▶│   Cloud SQL     │
│   (scale-to-0)  │     │  max=10, 30s)    │     │  db-f1-micro    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Optimized Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Cloud Run     │────▶│  pg Pool (min=0, │────▶│   Cloud SQL     │
│   (scale-to-0)  │     │  max=5, 10s)     │     │  db-f1-micro    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                      │
         │                      ▼
         │              ┌──────────────────┐
         │              │  Batch Upsert    │
         │              │  (100 rows/batch)│
         │              └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Upstash Redis │
│   (completed)  │
└─────────────────┘
```

## Components and Interfaces

### 1. Connection Pool Configuration

**File:** `src/db/connection.ts`

Changes to connection pool configuration:

| Parameter | Current | New | Rationale |
|-----------|---------|-----|-----------|
| min | 2 | 0 | Scale-to-zero compatibility |
| max | 10 | 5 | Single-user workload |
| idleTimeoutMillis | 30000 | 10000 | Faster connection release |
| connectionTimeoutMillis | 5000 | 5000 | Unchanged (already optimal) |

**Environment Variables (`.env.example`):**
```env
DATABASE_POOL_MIN=0
DATABASE_POOL_MAX=5
```

**Logging Enhancements:**
- Log connection acquisition time on cold start
- Log connection release for debugging
- Retry logic with exponential backoff on connection failure

### 2. Batch Calendar Event Upserts

**File:** `src/calendar/calendar-events-repository.ts`

Current implementation (one-at-a-time):
```typescript
for (const event of events) {
  await client.query(
    `INSERT INTO calendar_events ... ON CONFLICT ...`,
    [/* 11 params per event */]
  );
}
```

Optimized implementation (batch):
```typescript
// Process in batches of 100
const batchSize = 100;
for (let i = 0; i < events.length; i += batchSize) {
  const batch = events.slice(i, i + batchSize);
  
  // Build multi-row VALUES clause
  const values = batch.map((event, idx) => {
    const offset = idx * 11;
    return `($${offset+1}, $${offset+2}, ...$${offset+11}, CURRENT_TIMESTAMP)`;
  }).join(', ');
  
  // Single INSERT with ON CONFLICT
  await client.query(
    `INSERT INTO calendar_events (...) VALUES ${values}
     ON CONFLICT (user_id, google_event_id)
     DO UPDATE SET
       calendar_id = EXCLUDED.calendar_id,
       ...
     WHERE calendar_id IS DISTINCT FROM EXCLUDED.calendar_id
       OR summary IS DISTINCT FROM EXCLUDED.summary
       ...`,
    flatParams
  );
}
```

**Key Features:**
- Multi-row VALUES clause (up to 100 rows)
- Conditional updates using `IS DISTINCT FROM` to skip unchanged rows
- Transactional consistency maintained

### 3. Serverless PostgreSQL Alternatives

**Evaluation Criteria:**
- Cost at 1, 50, 200 users
- Connection compatibility (pg Pool)
- Migration complexity
- Cold start latency
- Free tier availability

| Provider | Free Tier | 1 User | 50 Users | 200 Users | Notes |
|----------|-----------|--------|----------|-----------|-------|
| Cloud SQL (current) | N/A | $15.86 | $15.86 | $15.86 | Flat rate |
| Neon | 0.5 GB | $0 | $13 | $39 | Pay-per-compute |
| Supabase | 500 MB, 2 conn | $0 | $25 | $75 | Pay-per-storage |
| Self-hosted on Cloud Run | N/A | $8-12 | $8-12 | $15-20 | Requires management |

**Recommendation:** Cloud SQL remains most cost-effective for current usage. Neon is viable for future migration if user count grows significantly.

### 4. GCP Configuration Changes

**Backups (PENDING):**
- Enable automated backups with 7-day retention
- Estimated cost: ~$2-3/month for 10 GB

**Other Settings:**
- Maintenance window: Sunday 02:00-06:00 UTC
- Query insights: Disabled (reduce overhead)
- Private IP only: Already configured
- PITR: Disabled (not needed for <50 users)
- `log_min_duration_statement`: 1000 (log queries >1s)

## Data Models

### Connection Pool Config

```typescript
interface PoolConfig {
  min: number;           // 0 (scale-to-zero)
  max: number;           // 5 (single-user)
  idleTimeoutMillis: number;  // 10000 (10s)
  connectionTimeoutMillis: number; // 5000 (5s)
}
```

### Batch Upsert Parameters

```typescript
interface BatchUpsertConfig {
  batchSize: number;     // 100 rows per statement
  useConditionalUpdate: boolean;  // IS DISTINCT FROM
  logSkippedWrites: boolean;      // debug logging
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Connection pool min configuration

*For any* application startup, the connection pool SHALL be configured with min=0 to support scale-to-zero behavior.

**Validates: Requirements 2.1**

### Property 2: Connection pool max configuration

*For any* application startup, the connection pool SHALL be configured with max=5 for single-user workloads.

**Validates: Requirements 2.2**

### Property 3: Connection pool idle timeout

*For any* application startup, the connection pool SHALL be configured with idleTimeoutMillis=10000 (10 seconds).

**Validates: Requirements 2.3**

### Property 4: Batch size configuration

*For any* batch upsert operation, the system SHALL process events in batches of 100 rows per SQL statement.

**Validates: Requirements 3.2**

### Property 5: Batch upsert transactional guarantee

*For any* batch upsert operation, all events in a batch SHALL either succeed or fail together within a transaction.

**Validates: Requirements 3.4**

### Property 6: Batch upsert round-trip

*For any* array of valid calendar events, upserting via batch upsert then reading back SHALL produce equivalent results to the original one-at-a-time upsert.

**Validates: Requirements 3.7**

### Property 7: Connection retry with backoff

*For any* failed initial connection attempt, the system SHALL retry once with exponential backoff before returning an error.

**Validates: Requirements 2.7**

## Error Handling

### Connection Pool Errors

- **Cold start failure:** Retry once with exponential backoff (initial delay: 100ms, max delay: 2s)
- **Pool exhaustion:** Return 503 Service Unavailable with clear error message
- **Connection timeout:** Log warning, return error to caller

### Batch Upsert Errors

- **Partial batch failure:** Rollback entire transaction, return error to caller
- **Parameter limit exceeded:** Ensure batch size stays below PostgreSQL limit (32767 parameters)
- **Invalid data:** Validate all events before batch, skip invalid with logging

## Testing Strategy

### Unit Tests

1. **Connection pool configuration validation**
   - Verify min=0, max=5, idleTimeoutMillis=10000
   - Test environment variable overrides

2. **Batch upsert SQL generation**
   - Verify multi-row VALUES clause generation
   - Verify parameter ordering
   - Verify WHERE clause for conditional updates

3. **Error handling**
   - Test retry logic with mock failures
   - Test transaction rollback on error

### Property-Based Tests

Using fast-check (minimum 100 iterations):

1. **Batch upsert round-trip** (Property 6)
   - Generate random calendar event arrays
   - Upsert via batch, read back, compare
   - Tag: `Feature: cloud-sql-cost-optimization, Property 6: Batch upsert round-trip`

2. **Connection pool configuration** (Properties 1-3)
   - Verify pool config matches requirements
   - Tag: `Feature: cloud-sql-cost-optimization, Property 1-3: Connection pool config`

### Integration Tests

1. **End-to-end calendar sync**
   - Sync 500 events, verify all persisted correctly
   - Measure query time improvement

2. **Connection pool behavior**
   - Test scale-to-zero behavior
   - Verify connections released after idle timeout

## Cost Projections

### Current Costs (April 2025)

| Item | Cost |
|------|------|
| Cloud SQL db-f1-micro | ~$10/month |
| Storage (10 GB SSD) | ~$3/month |
| Egress networking | ~$2-3/month |
| **Total** | **~$15-16/month** |

### After Optimizations

| Item | Cost | Change |
|------|------|--------|
| Cloud SQL db-f1-micro | ~$10/month | - |
| Storage | ~$3/month | - |
| Backups (7-day) | ~$2-3/month | +$2-3 |
| Connection pool optimization | ~$0 | Reduced CPU |
| Batch upserts | ~$0 | Reduced CPU |
| **Total** | **~$17-19/month** | +$2-3 |

### Serverless Alternatives (Future)

| Users | Cloud SQL | Neon | Supabase |
|-------|-----------|------|----------|
| 1 | $16 | $0 | $0 |
| 50 | $16 | $13 | $25 |
| 200 | $16 | $39 | $75 |

**Break-even:** Cloud SQL remains most cost-effective up to ~200 users.

## Implementation Tasks

1. Update `src/db/connection.ts` with new pool config
2. Update `.env.example` with new pool settings
3. Implement batch upsert in `calendar-events-repository.ts`
4. Add connection logging for cold start debugging
5. Enable Cloud SQL automated backups (GCP console)
6. Document serverless alternatives in `docs/deployment/COST_OPTIMIZATION.md`
7. Add monitoring alerts for Cloud SQL
8. Write unit and property tests