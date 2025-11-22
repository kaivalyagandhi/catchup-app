# Database Optimization Guide

This document describes the database optimization strategies implemented for the CatchUp application.

## Connection Pooling

Connection pooling is already configured in `src/db/connection.ts`:

```typescript
const poolConfig: PoolConfig = {
  min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
  max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

### Configuration

Set these environment variables in `.env`:

```
DATABASE_POOL_MIN=2    # Minimum connections in pool
DATABASE_POOL_MAX=10   # Maximum connections in pool
```

### Recommendations

- **Development**: min=2, max=10
- **Production (small)**: min=5, max=20
- **Production (large)**: min=10, max=50

Formula: `max_connections = (core_count * 2) + effective_spindle_count`

## Indexes

### Single-Column Indexes

Already implemented in migrations 001-003:

- `contacts`: user_id, created_at, archived, last_contact_date
- `groups`: user_id, archived
- `suggestions`: user_id, contact_id, status, trigger_type, created_at, snoozed_until
- `interaction_logs`: user_id, contact_id, date, created_at, suggestion_id
- `voice_notes`: user_id, contact_id, processed, created_at
- `google_calendars`: user_id, selected, calendar_id
- `tags`: text, source
- `oauth_tokens`: user_id, provider, expires_at

### Composite Indexes

Added in migration 004:

- `contacts(user_id, archived)` - Filter active contacts
- `contacts(user_id, last_contact_date)` - Find contacts due for catchup
- `contacts(user_id, archived, last_contact_date)` - Active contacts sorted by last contact
- `suggestions(user_id, status)` - Filter suggestions by status
- `suggestions(user_id, status, created_at DESC)` - Suggestion feed with sorting
- `suggestions(status, snoozed_until)` - Find snoozed suggestions to resurface (partial index)
- `interaction_logs(user_id, date DESC)` - User interaction history
- `interaction_logs(contact_id, date DESC)` - Contact interaction history
- `groups(user_id, archived)` - Filter active groups
- `google_calendars(user_id, selected)` - Find selected calendars (partial index)
- `voice_notes(user_id, processed)` - Find unprocessed voice notes (partial index)

### Partial Indexes

Partial indexes are used for frequently queried subsets:

```sql
-- Only index snoozed suggestions
CREATE INDEX idx_suggestions_status_snoozed_until 
ON suggestions(status, snoozed_until) 
WHERE status = 'snoozed';

-- Only index selected calendars
CREATE INDEX idx_google_calendars_user_selected 
ON google_calendars(user_id, selected) 
WHERE selected = true;

-- Only index unprocessed voice notes
CREATE INDEX idx_voice_notes_user_processed 
ON voice_notes(user_id, processed) 
WHERE processed = false;
```

Benefits:
- Smaller index size
- Faster index scans
- Reduced maintenance overhead

## Query Optimization

### Use EXPLAIN ANALYZE

Before optimizing, analyze query performance:

```sql
EXPLAIN ANALYZE
SELECT * FROM contacts 
WHERE user_id = 'uuid' AND archived = false 
ORDER BY last_contact_date DESC;
```

Look for:
- Sequential scans (bad) vs Index scans (good)
- High cost estimates
- Long execution times

### Common Query Patterns

#### 1. List Active Contacts

```sql
-- Optimized with idx_contacts_user_archived
SELECT * FROM contacts 
WHERE user_id = $1 AND archived = false 
ORDER BY created_at DESC;
```

#### 2. Find Contacts Due for Catchup

```sql
-- Optimized with idx_contacts_user_last_contact
SELECT c.* FROM contacts c
WHERE c.user_id = $1 
  AND c.archived = false
  AND (c.last_contact_date IS NULL 
       OR c.last_contact_date < NOW() - INTERVAL '30 days')
ORDER BY c.last_contact_date ASC NULLS FIRST;
```

#### 3. Get Pending Suggestions

```sql
-- Optimized with idx_suggestions_user_status_created
SELECT * FROM suggestions 
WHERE user_id = $1 AND status = 'pending' 
ORDER BY created_at DESC;
```

#### 4. Find Snoozed Suggestions to Resurface

```sql
-- Optimized with idx_suggestions_status_snoozed_until (partial index)
SELECT * FROM suggestions 
WHERE status = 'snoozed' 
  AND snoozed_until <= NOW();
```

#### 5. Get Contact Interaction History

```sql
-- Optimized with idx_interaction_logs_contact_date
SELECT * FROM interaction_logs 
WHERE contact_id = $1 
ORDER BY date DESC 
LIMIT 10;
```

### Avoid N+1 Queries

Use JOINs or batch queries instead of multiple single queries:

```sql
-- Bad: N+1 queries
SELECT * FROM contacts WHERE user_id = $1;
-- Then for each contact:
SELECT * FROM tags WHERE contact_id = $2;

-- Good: Single query with JOIN
SELECT c.*, array_agg(t.*) as tags
FROM contacts c
LEFT JOIN contact_tags ct ON c.id = ct.contact_id
LEFT JOIN tags t ON ct.tag_id = t.id
WHERE c.user_id = $1
GROUP BY c.id;
```

## Read Replicas

For production deployments with high read load:

### Setup

1. Configure PostgreSQL replication
2. Create read-only connection pool
3. Route read queries to replicas

### Implementation

```typescript
// src/db/connection.ts
const readPool = new Pool({
  host: process.env.DATABASE_READ_HOST || process.env.DATABASE_HOST,
  // ... other config
});

export const writePool = pool; // Primary
export const readPool = readPool; // Replica
```

### Usage

```typescript
// Write operations use primary
await writePool.query('INSERT INTO contacts ...');

// Read operations use replica
await readPool.query('SELECT * FROM contacts ...');
```

### Considerations

- Replication lag (typically < 100ms)
- Read-after-write consistency
- Failover handling

## Monitoring

### Key Metrics

Monitor these PostgreSQL metrics:

1. **Connection Pool**
   - Active connections
   - Idle connections
   - Waiting connections

2. **Query Performance**
   - Slow queries (> 1s)
   - Query execution time
   - Index usage

3. **Database Size**
   - Table sizes
   - Index sizes
   - Growth rate

4. **Cache Hit Ratio**
   - Should be > 99%
   - If lower, increase `shared_buffers`

### Monitoring Queries

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;

-- Table sizes
SELECT tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Cache hit ratio
SELECT 
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

## Maintenance

### Regular Tasks

1. **VACUUM** - Reclaim storage and update statistics
   ```sql
   VACUUM ANALYZE;
   ```

2. **REINDEX** - Rebuild indexes to remove bloat
   ```sql
   REINDEX TABLE contacts;
   ```

3. **Update Statistics** - Help query planner
   ```sql
   ANALYZE contacts;
   ```

### Automated Maintenance

Configure `postgresql.conf`:

```
# Autovacuum settings
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min

# Statistics collection
track_activities = on
track_counts = on
track_io_timing = on
```

## Performance Tuning

### PostgreSQL Configuration

Key settings in `postgresql.conf`:

```
# Memory
shared_buffers = 256MB          # 25% of RAM
effective_cache_size = 1GB      # 50-75% of RAM
work_mem = 16MB                 # Per operation
maintenance_work_mem = 128MB    # For VACUUM, CREATE INDEX

# Connections
max_connections = 100

# Query Planning
random_page_cost = 1.1          # For SSD
effective_io_concurrency = 200  # For SSD

# Write-Ahead Log
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

### Application-Level Optimization

1. **Use Prepared Statements**
   ```typescript
   // Reuse query plans
   const query = 'SELECT * FROM contacts WHERE user_id = $1';
   await pool.query(query, [userId]);
   ```

2. **Batch Operations**
   ```typescript
   // Instead of multiple INSERTs
   const values = contacts.map((c, i) => 
     `($${i*3+1}, $${i*3+2}, $${i*3+3})`
   ).join(',');
   await pool.query(
     `INSERT INTO contacts (user_id, name, email) VALUES ${values}`,
     contacts.flatMap(c => [c.userId, c.name, c.email])
   );
   ```

3. **Limit Result Sets**
   ```typescript
   // Always use LIMIT for large tables
   await pool.query(
     'SELECT * FROM contacts WHERE user_id = $1 LIMIT 100',
     [userId]
   );
   ```

4. **Use Transactions**
   ```typescript
   const client = await pool.connect();
   try {
     await client.query('BEGIN');
     await client.query('INSERT INTO contacts ...');
     await client.query('INSERT INTO tags ...');
     await client.query('COMMIT');
   } catch (e) {
     await client.query('ROLLBACK');
     throw e;
   } finally {
     client.release();
   }
   ```

## Troubleshooting

### Slow Queries

1. Check if indexes are being used:
   ```sql
   EXPLAIN ANALYZE SELECT ...;
   ```

2. Look for sequential scans on large tables
3. Check if statistics are up to date:
   ```sql
   ANALYZE table_name;
   ```

### High Connection Count

1. Check for connection leaks
2. Ensure connections are released after use
3. Reduce pool size if needed
4. Use connection pooler (PgBouncer)

### High Memory Usage

1. Reduce `work_mem` if queries use too much memory
2. Reduce `shared_buffers` if system memory is low
3. Check for memory leaks in application

### Lock Contention

1. Keep transactions short
2. Avoid long-running queries
3. Use appropriate isolation levels
4. Monitor locks:
   ```sql
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

## Best Practices

1. **Always use indexes** for WHERE, JOIN, and ORDER BY clauses
2. **Use connection pooling** to reuse connections
3. **Monitor query performance** regularly
4. **Keep statistics up to date** with ANALYZE
5. **Use transactions** for multiple related operations
6. **Batch operations** when possible
7. **Limit result sets** to avoid loading too much data
8. **Use prepared statements** for repeated queries
9. **Partition large tables** if they grow beyond 10M rows
10. **Regular maintenance** with VACUUM and REINDEX

## Migration Checklist

When adding new migrations:

- [ ] Add indexes for foreign keys
- [ ] Add indexes for frequently queried columns
- [ ] Consider composite indexes for common query patterns
- [ ] Use partial indexes for filtered queries
- [ ] Add comments to explain index purpose
- [ ] Run ANALYZE after creating indexes
- [ ] Test query performance with EXPLAIN ANALYZE
