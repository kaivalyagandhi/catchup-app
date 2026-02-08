import Redis, { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client configuration
// Supports both local Redis and Upstash (serverless Redis with TLS)
const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  // TLS support for Upstash and other cloud Redis providers
  // Set REDIS_TLS=true for Upstash connections
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

// Create Redis client
const redis = new Redis(redisConfig);

// Handle Redis errors
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

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
    const value = await redis.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
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
    const serialized = JSON.stringify(value);
    if (ttl && ttl > 0) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }
}

/**
 * Delete value from cache
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
  }
}

/**
 * Check if key exists in cache
 */
export async function existsCache(key: string): Promise<boolean> {
  try {
    const exists = await redis.exists(key);
    return exists === 1;
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
 */
export async function closeCache(): Promise<void> {
  await redis.quit();
  console.log('Redis connection closed');
}

export default redis;
