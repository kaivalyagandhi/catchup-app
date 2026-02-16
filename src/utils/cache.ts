import { httpRedis } from './http-redis-client';
import dotenv from 'dotenv';

dotenv.config();

// OLD CODE - Using ioredis (TCP connection)
// Kept for rollback purposes - remove after Phase 3
/*
import Redis, { RedisOptions } from 'ioredis';

function createRedisClient(): Redis {
  if (process.env.REDIS_URL) {
    console.log('[Redis Cache] Connecting using REDIS_URL connection string');
    return new Redis(process.env.REDIS_URL, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
  }

  const redisConfig: RedisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  };

  console.log('[Redis Cache] Connecting to Redis:', {
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.db,
    tls: redisConfig.tls ? 'enabled' : 'disabled',
    passwordSet: !!redisConfig.password,
  });

  return new Redis(redisConfig);
}

const redis = createRedisClient();

redis.on('error', (err) => {
  console.error('[Redis Cache] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis Cache] Connected to Redis successfully');
});

redis.on('ready', () => {
  console.log('[Redis Cache] Redis client ready');
});

redis.on('close', () => {
  console.log('[Redis Cache] Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('[Redis Cache] Reconnecting to Redis...');
});
*/

// NEW CODE - Using HTTP Redis (no persistent connection)
console.log('[Redis Cache] Using HTTP Redis client (0 connections)');

/**
 * Cache key prefixes for different data types
 */
export const CacheKeys = {
  CONTACT_LIST: (userId: string) => `contact:list:${userId}`,
  CONTACT_PROFILE: (contactId: string) => `contact:profile:${contactId}`,
  CALENDAR_FREE_SLOTS: (userId: string, date: string) => `calendar:slots:${userId}:${date}`,
  SUGGESTION_LIST: (userId: string) => `suggestion:list:${userId}`,
  USER_PREFERENCES: (userId: string) => `user:prefs:${userId}`,
};

/**
 * Cache TTL values in seconds
 */
export const CacheTTL = {
  CONTACT_LIST: 5 * 60, // 5 minutes
  CONTACT_PROFILE: 5 * 60, // 5 minutes
  CALENDAR_FREE_SLOTS: 60 * 60, // 1 hour
  SUGGESTION_LIST: 0, // No TTL, invalidate on status change
  USER_PREFERENCES: 10 * 60, // 10 minutes
};

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    return await httpRedis.get<T>(key);
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function setCache(key: string, value: any, ttl?: number): Promise<void> {
  try {
    await httpRedis.set(key, value, ttl);
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }
}

/**
 * Delete value from cache
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await httpRedis.del(key);
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
  }
}

/**
 * Delete multiple keys matching a pattern
 * 
 * WARNING: This uses SCAN instead of KEYS to avoid blocking Redis.
 * KEYS is O(N) and blocks the server, SCAN is O(1) per call and doesn't block.
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    await httpRedis.deletePattern(pattern);
  } catch (error) {
    console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
  }
}

/**
 * Check if key exists in cache
 */
export async function existsCache(key: string): Promise<boolean> {
  try {
    return await httpRedis.exists(key);
  } catch (error) {
    console.error(`Cache exists error for key ${key}:`, error);
    return false;
  }
}

/**
 * Get or set cache with a loader function
 */
export async function getOrSetCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Load data
  const data = await loader();

  // Store in cache
  await setCache(key, data, ttl);

  return data;
}

/**
 * Invalidate contact-related caches
 */
export async function invalidateContactCache(userId: string, contactId?: string): Promise<void> {
  await deleteCache(CacheKeys.CONTACT_LIST(userId));
  if (contactId) {
    await deleteCache(CacheKeys.CONTACT_PROFILE(contactId));
  }
}

/**
 * Invalidate suggestion cache for a user
 */
export async function invalidateSuggestionCache(userId: string): Promise<void> {
  await deleteCache(CacheKeys.SUGGESTION_LIST(userId));
}

/**
 * Invalidate calendar cache for a user
 */
export async function invalidateCalendarCache(userId: string): Promise<void> {
  await deleteCachePattern(CacheKeys.CALENDAR_FREE_SLOTS(userId, '*'));
}

/**
 * Close Redis connection
 * Note: HTTP Redis doesn't maintain persistent connections, so this is a no-op
 */
export async function closeCache(): Promise<void> {
  console.log('HTTP Redis client closed (no persistent connection)');
}

// Export httpRedis for backward compatibility
export default httpRedis;
