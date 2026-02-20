import { httpRedis } from './http-redis-client';
import dotenv from 'dotenv';
import {
  contactCache,
  calendarEventCache,
  suggestionCache,
  userPreferencesCache,
  getCacheStats as getLRUCacheStats,
  logCacheStats,
} from './lru-cache';

dotenv.config();

console.log('[Redis Cache] Using HTTP Redis client (0 connections)');
console.log('[LRU Cache] In-memory LRU caches initialized');

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
 * Get appropriate LRU cache for a key
 */
function getLRUCache(key: string) {
  if (key.startsWith('contact:')) {
    return contactCache;
  } else if (key.startsWith('calendar:')) {
    return calendarEventCache;
  } else if (key.startsWith('suggestion:')) {
    return suggestionCache;
  } else if (key.startsWith('user:prefs:')) {
    return userPreferencesCache;
  }
  return null;
}

/**
 * Get value from cache (two-tier: LRU → Redis)
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    // Try LRU cache first (in-memory, fast)
    const lruCache = getLRUCache(key);
    if (lruCache) {
      const lruValue = lruCache.get(key);
      if (lruValue !== undefined) {
        return lruValue as T;
      }
    }

    // Fall back to Redis
    const redisValue = await httpRedis.get<T>(key);
    
    // If found in Redis, populate LRU cache
    if (redisValue !== null && lruCache) {
      lruCache.set(key, redisValue);
    }
    
    return redisValue;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache with TTL (two-tier: LRU + Redis)
 */
export async function setCache(key: string, value: any, ttl?: number): Promise<void> {
  try {
    // Set in LRU cache (in-memory)
    const lruCache = getLRUCache(key);
    if (lruCache) {
      lruCache.set(key, value, ttl ? { ttl: ttl * 1000 } : undefined);
    }

    // Set in Redis (persistent)
    await httpRedis.set(key, value, ttl);
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }
}

/**
 * Delete value from cache (two-tier: LRU + Redis)
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    // Delete from LRU cache
    const lruCache = getLRUCache(key);
    if (lruCache) {
      lruCache.delete(key);
    }

    // Delete from Redis
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
 * Invalidate contact-related caches (two-tier: LRU + Redis)
 */
export async function invalidateContactCache(userId: string, contactId?: string): Promise<void> {
  // Clear from LRU cache
  contactCache.delete(CacheKeys.CONTACT_LIST(userId));
  if (contactId) {
    contactCache.delete(CacheKeys.CONTACT_PROFILE(contactId));
  }

  // Clear from Redis
  await deleteCache(CacheKeys.CONTACT_LIST(userId));
  if (contactId) {
    await deleteCache(CacheKeys.CONTACT_PROFILE(contactId));
  }
}

/**
 * Invalidate suggestion cache for a user (two-tier: LRU + Redis)
 */
export async function invalidateSuggestionCache(userId: string): Promise<void> {
  // Clear from LRU cache
  suggestionCache.delete(CacheKeys.SUGGESTION_LIST(userId));

  // Clear from Redis
  await deleteCache(CacheKeys.SUGGESTION_LIST(userId));
}

/**
 * Invalidate calendar cache for a user (two-tier: LRU + Redis)
 */
export async function invalidateCalendarCache(userId: string): Promise<void> {
  // Clear from LRU cache (need to iterate and delete matching keys)
  const keysToDelete: string[] = [];
  calendarEventCache.forEach((_, key) => {
    if (key.startsWith(CacheKeys.CALENDAR_FREE_SLOTS(userId, ''))) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => calendarEventCache.delete(key));

  // Clear from Redis
  await deleteCachePattern(CacheKeys.CALENDAR_FREE_SLOTS(userId, '*'));
}

/**
 * Get cache statistics (LRU + Redis)
 */
export function getCacheStats() {
  return {
    lru: getLRUCacheStats(),
    redis: {
      type: 'HTTP Redis',
      connections: 0,
      note: 'HTTP-based, no persistent connections',
    },
  };
}

/**
 * Log cache statistics
 */
export function logCacheStatistics(): void {
  logCacheStats(); // Log LRU cache stats
  console.log('[Cache] Two-tier caching: LRU (in-memory) → Redis (persistent)');
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
