# SMS/MMS Enrichment Performance Optimization

This document describes the performance optimizations implemented for the SMS/MMS enrichment feature to handle high-volume message processing (100+ concurrent messages).

## Overview

The SMS/MMS enrichment feature has been optimized for high-throughput processing with the following improvements:

1. **Database Query Optimization** - Proper indexes and query patterns
2. **Connection Pooling** - Reusable connections for external APIs
3. **Caching** - LRU caches for frequently accessed data
4. **Streaming** - Efficient media download without memory bloat
5. **Load Testing** - Verification of performance under load

## Database Optimizations

### Indexes Added

The following indexes have been added to optimize common query patterns:

```sql
-- Composite index for verified phone number lookups
CREATE INDEX idx_user_phone_numbers_phone_verified 
ON user_phone_numbers(phone_number, verified) 
WHERE verified = true;

-- Composite index for enrichment queries by user and status
CREATE INDEX idx_enrichment_items_user_status 
ON enrichment_items(user_id, status);

-- Index for enrichment queries ordered by creation time
CREATE INDEX idx_enrichment_items_created_at 
ON enrichment_items(created_at DESC);

-- Composite index for user + source + status queries
CREATE INDEX idx_enrichment_items_user_source_status 
ON enrichment_items(user_id, source, status);

-- Partial index for pending enrichments only
CREATE INDEX idx_enrichment_items_pending 
ON enrichment_items(user_id, created_at DESC) 
WHERE status = 'pending';
```

### Query Patterns

**Before Optimization:**
```typescript
// Sequential queries - slow
const phoneRecord = await pool.query('SELECT * FROM user_phone_numbers WHERE phone_number = $1', [phone]);
const enrichments = await pool.query('SELECT * FROM enrichment_items WHERE user_id = $1', [userId]);
```

**After Optimization:**
```typescript
// Cached lookups - fast
const userId = await getCachedUserByPhoneNumber(phone);
const enrichments = await pool.query(
  'SELECT * FROM enrichment_items WHERE user_id = $1 AND status = $2',
  [userId, 'pending']
); // Uses idx_enrichment_items_user_status
```

### Batch Operations

Enrichment items are now inserted in batches for better performance:

```typescript
// Before: Multiple individual inserts
for (const enrichment of enrichments) {
  await pool.query('INSERT INTO enrichment_items ...', [enrichment]);
}

// After: Single batch insert
await batchInsertEnrichments(enrichments);
```

## Connection Pooling

### Database Connection Pool

PostgreSQL connection pool is configured for optimal performance:

```typescript
const poolConfig = {
  min: 2,              // Minimum connections
  max: 10,             // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

### External API Connection Pools

Connection pools have been implemented for:

1. **Google Speech-to-Text API**
   - Pool size: 2-10 clients
   - Reuses clients across requests
   - Reduces connection overhead

2. **Redis**
   - Pool size: 2-10 connections
   - Shared across rate limiting operations
   - Automatic reconnection on failure

3. **Twilio API**
   - Pool size: 2-10 clients
   - Reuses HTTP connections
   - Reduces SSL handshake overhead

### Usage Example

```typescript
// Acquire client from pool
const speechClient = await connectionPoolManager.getSpeechClient();

try {
  // Use client
  const result = await speechClient.recognize(request);
} finally {
  // Release back to pool
  connectionPoolManager.releaseSpeechClient(speechClient);
}
```

## Caching Strategy

### LRU Caches

Three LRU (Least Recently Used) caches have been implemented:

1. **Phone Number Lookup Cache**
   - Max size: 1000 entries
   - TTL: 15 minutes
   - Caches phone number → user ID mappings

2. **Verification Status Cache**
   - Max size: 500 entries
   - TTL: 5 minutes
   - Caches phone number verification status

3. **Rate Limit Status Cache**
   - Max size: 1000 entries
   - TTL: 1 minute
   - Caches rate limit counters (in addition to Redis)

### Cache Invalidation

Caches are automatically invalidated when:
- Phone number verification status changes
- User unlinks phone number
- Manual cache clear via API

### Cache Statistics

Monitor cache performance via API:

```bash
GET /api/sms/performance/cache
```

Response:
```json
{
  "phoneNumberCache": {
    "size": 234,
    "max": 1000,
    "hitRate": 87.5
  },
  "metrics": {
    "cacheHits": 875,
    "cacheMisses": 125,
    "hitRate": 87.5
  }
}
```

## Media Download Optimization

### Streaming Downloads

Media files are downloaded using Node.js streams to avoid loading entire files into memory:

```typescript
// Before: Load entire file into memory
const response = await fetch(url);
const buffer = await response.arrayBuffer();

// After: Stream to disk
const fileStream = createWriteStream(tempFilePath);
await pipeline(response, fileStream);
```

### Size Validation

File size is validated during download to prevent memory exhaustion:

```typescript
response.on('data', (chunk) => {
  downloadedSize += chunk.length;
  
  if (downloadedSize > MAX_SIZE) {
    response.destroy(); // Stop download immediately
    reject(new Error('File too large'));
  }
});
```

### Temporary File Cleanup

Temporary files are automatically cleaned up:
- Immediately after processing
- Scheduled cleanup of files older than 30 days
- On application shutdown

## Load Testing

### Running Load Tests

Execute the load test script to verify performance:

```bash
# Set environment variables
export LOAD_TEST_URL=http://localhost:3000/api/sms/webhook
export TWILIO_AUTH_TOKEN=your_auth_token
export LOAD_TEST_CONCURRENT=10
export LOAD_TEST_DURATION=60

# Run load test
npm run test:load
```

### Performance Targets

The system is designed to meet these targets:

- **Response Time**: < 5 seconds average
- **P95 Response Time**: < 10 seconds
- **Success Rate**: > 95%
- **Throughput**: 100+ concurrent messages
- **Database Connections**: < 10 active connections
- **Cache Hit Rate**: > 80%

### Load Test Results

Example output:

```
=== Load Test Results ===
Total Requests: 600
Successful: 585 (97.50%)
Failed: 15 (2.50%)
Rate Limited: 12

Response Times:
  Average: 3,245ms
  Min: 1,234ms
  Max: 8,901ms
  P50: 2,987ms
  P95: 6,543ms
  P99: 8,234ms

=== Performance Assessment ===
✓ Average response time is under 5 seconds (target met)
✓ Success rate is above 95%
✓ P95 response time is under 10 seconds
```

## Monitoring

### Performance Metrics API

Monitor system performance in real-time:

```bash
# Get comprehensive stats
GET /api/sms/performance/stats

# Get cache statistics
GET /api/sms/performance/cache

# Get database pool health
GET /api/sms/performance/database

# Get connection pool stats
GET /api/sms/performance/connections

# Health check for load balancers
GET /api/sms/performance/health
```

### Key Metrics to Monitor

1. **Cache Hit Rate**: Should be > 80%
2. **Database Pool**: Waiting clients should be < 5
3. **Response Time**: Average should be < 5s
4. **Error Rate**: Should be < 5%
5. **Connection Pool Usage**: Should not exceed max

### Alerting Thresholds

Set up alerts for:
- Cache hit rate < 50%
- Database waiting clients > 5
- Average response time > 5s
- Error rate > 5%
- Connection pool exhaustion

## Performance Tuning

### Environment Variables

Tune performance via environment variables:

```bash
# Database connection pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis connection pool
REDIS_POOL_MIN=2
REDIS_POOL_MAX=10

# Rate limiting
RATE_LIMIT_MESSAGES_PER_HOUR=20

# Media download
MAX_MEDIA_SIZE_MB=5
MEDIA_DOWNLOAD_TIMEOUT_MS=30000

# Cache TTL (milliseconds)
CACHE_PHONE_LOOKUP_TTL=900000  # 15 minutes
CACHE_VERIFICATION_TTL=300000   # 5 minutes
```

### Scaling Recommendations

**For 100-500 messages/hour:**
- Database pool: 2-10 connections
- Redis pool: 2-5 connections
- Single application instance

**For 500-2000 messages/hour:**
- Database pool: 5-20 connections
- Redis pool: 5-10 connections
- 2-3 application instances with load balancer

**For 2000+ messages/hour:**
- Database pool: 10-30 connections
- Redis pool: 10-20 connections
- 3+ application instances with load balancer
- Consider read replicas for database
- Consider Redis cluster for rate limiting

## Troubleshooting

### High Response Times

**Symptoms**: Average response time > 5s

**Possible Causes**:
1. Database connection pool exhausted
2. External API latency (Google Cloud)
3. Cache hit rate too low
4. Media download timeouts

**Solutions**:
1. Increase database pool size
2. Implement request queuing
3. Increase cache TTL
4. Reduce media download timeout

### Database Connection Exhaustion

**Symptoms**: "Connection pool exhausted" errors

**Possible Causes**:
1. Too many concurrent requests
2. Long-running queries
3. Connection leaks

**Solutions**:
1. Increase `DATABASE_POOL_MAX`
2. Optimize slow queries
3. Ensure connections are released in finally blocks

### Low Cache Hit Rate

**Symptoms**: Cache hit rate < 50%

**Possible Causes**:
1. Cache TTL too short
2. Cache size too small
3. High churn in phone numbers

**Solutions**:
1. Increase cache TTL
2. Increase cache max size
3. Review cache invalidation logic

### Memory Issues

**Symptoms**: High memory usage, OOM errors

**Possible Causes**:
1. Media files loaded into memory
2. Cache size too large
3. Connection pool leaks

**Solutions**:
1. Use streaming for media downloads
2. Reduce cache max size
3. Monitor connection pool stats

## Best Practices

1. **Always use connection pools** for external APIs
2. **Cache frequently accessed data** with appropriate TTL
3. **Use streaming** for large file downloads
4. **Batch database operations** when possible
5. **Monitor performance metrics** continuously
6. **Set up alerts** for performance degradation
7. **Run load tests** before deploying to production
8. **Use prepared statements** for repeated queries
9. **Implement circuit breakers** for external API calls
10. **Clean up resources** in finally blocks

## References

- [PostgreSQL Connection Pooling](https://node-postgres.com/features/pooling)
- [LRU Cache Documentation](https://github.com/isaacs/node-lru-cache)
- [Node.js Streams](https://nodejs.org/api/stream.html)
- [Load Testing Best Practices](https://k6.io/docs/testing-guides/load-testing/)
