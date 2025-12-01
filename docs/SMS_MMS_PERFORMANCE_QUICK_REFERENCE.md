# SMS/MMS Performance Optimization - Quick Reference

## Quick Start

### 1. Apply Database Indexes
```bash
npm run db:migrate
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
# Add to .env
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
REDIS_POOL_MIN=2
REDIS_POOL_MAX=10
```

### 4. Run Load Test
```bash
export LOAD_TEST_URL=http://localhost:3000/api/sms/webhook
export TWILIO_AUTH_TOKEN=your_token
npm run test:load
```

## Performance Monitoring

### Check System Health
```bash
curl http://localhost:3000/api/sms/performance/health
```

### View Cache Statistics
```bash
curl http://localhost:3000/api/sms/performance/cache
```

### View All Performance Metrics
```bash
curl http://localhost:3000/api/sms/performance/stats
```

## Key Performance Indicators

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Avg Response Time | < 5s | > 5s |
| P95 Response Time | < 10s | > 10s |
| Success Rate | > 95% | < 95% |
| Cache Hit Rate | > 80% | < 50% |
| DB Waiting Clients | < 5 | > 5 |

## Troubleshooting

### High Response Times
```bash
# Check database pool
curl http://localhost:3000/api/sms/performance/database

# Check cache hit rate
curl http://localhost:3000/api/sms/performance/cache

# Increase pool size in .env
DATABASE_POOL_MAX=20
```

### Low Cache Hit Rate
```bash
# Check cache stats
curl http://localhost:3000/api/sms/performance/cache

# Increase cache TTL in code
CACHE_PHONE_LOOKUP_TTL=1800000  # 30 minutes
```

### Connection Pool Exhaustion
```bash
# Check connection pools
curl http://localhost:3000/api/sms/performance/connections

# Increase pool sizes
REDIS_POOL_MAX=20
DATABASE_POOL_MAX=20
```

## Scaling Guidelines

### 100-500 messages/hour
- Single instance
- Default configuration
- Monitor metrics

### 500-2000 messages/hour
- 2-3 instances
- Increase pool sizes to 20
- Add load balancer

### 2000+ messages/hour
- 3+ instances
- Pool sizes 30+
- Redis cluster
- Database read replicas

## Performance Optimizations Applied

✓ Database indexes for common queries
✓ LRU caching for phone lookups
✓ Connection pooling for external APIs
✓ Streaming media downloads
✓ Batch database operations
✓ Real-time performance monitoring

## Load Test Results Template

```
=== Load Test Results ===
Total Requests: 600
Successful: 585 (97.50%)
Failed: 15 (2.50%)

Response Times:
  Average: 3,245ms ✓
  P95: 6,543ms ✓
  P99: 8,234ms ✓

✓ All performance targets met
```

## Common Commands

```bash
# Run load test
npm run test:load

# Apply migrations
npm run db:migrate

# Check health
curl localhost:3000/api/sms/performance/health

# Reset metrics
curl -X POST localhost:3000/api/sms/performance/reset

# View cache stats
curl localhost:3000/api/sms/performance/cache
```

## Configuration Reference

```bash
# Database
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_POOL_MIN=2
REDIS_POOL_MAX=10

# Load Testing
LOAD_TEST_CONCURRENT=10
LOAD_TEST_DURATION=60
LOAD_TEST_DELAY=1000
```

## For More Details

See: `docs/SMS_MMS_PERFORMANCE_OPTIMIZATION.md`
