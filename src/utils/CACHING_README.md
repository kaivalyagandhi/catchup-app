# Caching Implementation

This document describes the caching strategy implemented for the CatchUp application.

## Overview

The application uses Redis for distributed caching to improve performance and reduce database load. Caching is implemented for:

- Contact lists and profiles (TTL: 5 minutes)
- Calendar free slots (TTL: 1 hour)
- Suggestion lists (invalidated on status change)

## Setup

### Prerequisites

1. Install Redis:
   ```bash
   # macOS
   brew install redis
   
   # Ubuntu/Debian
   sudo apt-get install redis-server
   
   # Or use Docker
   docker run -d -p 6379:6379 redis:latest
   ```

2. Start Redis:
   ```bash
   # macOS
   brew services start redis
   
   # Ubuntu/Debian
   sudo systemctl start redis-server
   
   # Or manually
   redis-server
   ```

3. Configure environment variables in `.env`:
   ```
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0
   ```

## Cache Keys

The application uses the following cache key patterns:

- `contact:list:{userId}` - List of contacts for a user
- `contact:profile:{contactId}` - Individual contact profile
- `calendar:slots:{userId}:{dateRange}` - Free time slots for a user
- `suggestion:list:{userId}` - Pending suggestions for a user
- `user:prefs:{userId}` - User preferences

## TTL Values

- **Contact List**: 5 minutes (300 seconds)
- **Contact Profile**: 5 minutes (300 seconds)
- **Calendar Free Slots**: 1 hour (3600 seconds)
- **Suggestion List**: No TTL (invalidated on status change)
- **User Preferences**: 10 minutes (600 seconds)

## Cache Invalidation

The application automatically invalidates caches when data changes:

### Contact Changes
- Creating a contact → Invalidates contact list cache
- Updating a contact → Invalidates contact list and profile caches
- Deleting a contact → Invalidates contact list and profile caches
- Archiving a contact → Invalidates contact list and profile caches

### Calendar Changes
- Refreshing calendar data → Invalidates all calendar slot caches for the user
- Updating availability parameters → Invalidates calendar slot caches

### Suggestion Changes
- Accepting a suggestion → Invalidates suggestion list cache
- Dismissing a suggestion → Invalidates suggestion list cache
- Snoozing a suggestion → Invalidates suggestion list cache

## Usage

### Basic Cache Operations

```typescript
import { getCache, setCache, deleteCache } from './utils/cache';

// Get from cache
const data = await getCache<MyType>('my:key');

// Set in cache with TTL
await setCache('my:key', data, 300); // 5 minutes

// Delete from cache
await deleteCache('my:key');
```

### Get or Set Pattern

```typescript
import { getOrSetCache, CacheKeys, CacheTTL } from './utils/cache';

// Try cache first, load if not found
const contacts = await getOrSetCache(
  CacheKeys.CONTACT_LIST(userId),
  async () => await repository.findAll(userId),
  CacheTTL.CONTACT_LIST
);
```

### Cache Invalidation

```typescript
import { invalidateContactCache, invalidateSuggestionCache } from './utils/cache';

// Invalidate contact caches
await invalidateContactCache(userId, contactId);

// Invalidate suggestion cache
await invalidateSuggestionCache(userId);
```

## Testing

To run cache tests, ensure Redis is running:

```bash
# Start Redis
redis-server

# Run tests
npm test -- src/utils/cache.test.ts
```

## Error Handling

The cache implementation includes error handling:

- Connection errors are logged but don't block operations
- Failed cache operations fall back to database queries
- Retry logic with exponential backoff for transient failures

## Performance Considerations

### Cache Hit Rates

Monitor cache hit rates to ensure caching is effective:

```bash
# Connect to Redis CLI
redis-cli

# Get cache statistics
INFO stats
```

### Memory Usage

Monitor Redis memory usage:

```bash
# Check memory usage
redis-cli INFO memory

# Set max memory limit in redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Connection Pooling

The application uses ioredis with connection pooling:

- Automatic reconnection on connection loss
- Max 3 retries per request
- Exponential backoff for retries

## Production Considerations

### High Availability

For production, consider:

1. **Redis Sentinel** for automatic failover
2. **Redis Cluster** for horizontal scaling
3. **Redis persistence** (RDB + AOF) for data durability

### Monitoring

Monitor these metrics:

- Cache hit/miss ratio
- Memory usage
- Connection count
- Command latency
- Eviction count

### Security

- Use Redis AUTH with strong passwords
- Enable TLS for encrypted connections
- Restrict Redis to internal network
- Use firewall rules to limit access

## Troubleshooting

### Connection Refused

If you see "ECONNREFUSED" errors:

1. Check if Redis is running: `redis-cli ping`
2. Verify Redis host/port in `.env`
3. Check firewall rules

### Memory Issues

If Redis runs out of memory:

1. Increase `maxmemory` limit
2. Review TTL values (reduce if too long)
3. Enable eviction policy (LRU recommended)

### Slow Performance

If cache operations are slow:

1. Check Redis latency: `redis-cli --latency`
2. Review network connectivity
3. Consider Redis Cluster for scaling
