import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * HTTP Redis Client using Upstash REST API
 * 
 * This client uses HTTP requests instead of TCP connections, which:
 * - Reduces connection count to 0 (no persistent connections)
 * - Reduces command usage by ~30-40% (no connection overhead)
 * - Works perfectly in serverless environments
 * - Has slightly higher latency (~50-100ms) but acceptable for cache/rate-limiting
 * 
 * Use this for:
 * - Cache operations (get, set, del)
 * - Rate limiting (zadd, zcard, zremrangebyscore)
 * - Any non-queue operations
 * 
 * Do NOT use this for:
 * - Job queues (use BullMQ with ioredis instead)
 * - Pub/sub (requires persistent connection)
 * - Blocking operations (BLPOP, BRPOP, etc.)
 */
class HttpRedisClient {
  private client: Redis;

  constructor() {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!restUrl || !restToken) {
      console.warn('[HTTP Redis] Upstash credentials not found - cache operations will be no-ops');
      console.warn('[HTTP Redis] Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for caching');
      // Create a dummy client that will fail gracefully
      this.client = null as any;
      return;
    }

    this.client = new Redis({
      url: restUrl,
      token: restToken,
      // Automatic retry with exponential backoff
      retry: {
        retries: 3,
        backoff: (retryCount: number) => Math.min(1000 * Math.pow(2, retryCount), 10000),
      },
    });

    console.log('[HTTP Redis] Client initialized with REST API');
  }

  /**
   * Get value from Redis
   * @returns Parsed JSON value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) {
      return null; // No-op if client not initialized
    }
    try {
      const value = await this.client.get<string>(key);
      if (!value) {
        return null;
      }
      // Upstash automatically handles JSON parsing if the value is JSON
      // But we need to handle both JSON and plain strings
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          // If parsing fails, return as-is (might be a plain string)
          return value as unknown as T;
        }
      }
      return value as T;
    } catch (error) {
      console.error(`[HTTP Redis] Get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in Redis with optional TTL
   * @param key Redis key
   * @param value Value to store (will be JSON stringified)
   * @param ttlSeconds Optional TTL in seconds
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client) {
      return; // No-op if client not initialized
    }
    try {
      const serialized = JSON.stringify(value);
      
      if (ttlSeconds && ttlSeconds > 0) {
        // Use EX option for TTL in seconds
        await this.client.set(key, serialized, { ex: ttlSeconds });
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error(`[HTTP Redis] Set error for key ${key}:`, error);
      // Don't throw - cache failures should not break the app
    }
  }

  /**
   * Delete key from Redis
   */
  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`[HTTP Redis] Delete error for key ${key}:`, error);
      // Don't throw - cache failures should not break the app
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[HTTP Redis] Exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   * Uses SCAN to avoid blocking Redis
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      let cursor: string | number = 0;
      const keysToDelete: string[] = [];

      do {
        // SCAN returns [cursor, keys]
        const result: [string | number, string[]] = await this.client.scan(cursor, {
          match: pattern,
          count: 100,
        });

        cursor = result[0];
        const keys = result[1];

        keysToDelete.push(...keys);

        // Delete in batches to avoid memory issues
        if (keysToDelete.length >= 100) {
          if (keysToDelete.length > 0) {
            await this.client.del(...keysToDelete);
          }
          keysToDelete.length = 0; // Clear array
        }
      } while (cursor !== 0 && cursor !== '0');

      // Delete remaining keys
      if (keysToDelete.length > 0) {
        await this.client.del(...keysToDelete);
      }
    } catch (error) {
      console.error(`[HTTP Redis] Delete pattern error for pattern ${pattern}:`, error);
      // Don't throw - cache failures should not break the app
    }
  }

  /**
   * Add member to sorted set with score
   * Used for rate limiting with timestamps
   */
  async zadd(key: string, score: number, member: string): Promise<void> {
    if (!this.client) return;
    try {
      // Upstash REST API uses object format: { score, member }
      await this.client.zadd(key, { score, member });
    } catch (error) {
      console.error(`[HTTP Redis] ZADD error for key ${key}:`, error);
      // Don't throw - rate limiting failures should not break the app
    }
  }

  /**
   * Get cardinality (count) of sorted set
   */
  async zcard(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      const count = await this.client.zcard(key);
      return count;
    } catch (error) {
      console.error(`[HTTP Redis] ZCARD error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Remove members from sorted set by score range
   * Used for rate limiting to remove old entries
   */
  async zremrangebyscore(key: string, min: number, max: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.zremrangebyscore(key, min, max);
    } catch (error) {
      console.error(`[HTTP Redis] ZREMRANGEBYSCORE error for key ${key}:`, error);
      // Don't throw - rate limiting failures should not break the app
    }
  }

  /**
   * Get range of members from sorted set with scores
   * Used for rate limiting to get oldest entry
   */
  async zrange(key: string, start: number, stop: number, withScores: boolean = false): Promise<string[]> {
    if (!this.client) return [];
    try {
      if (withScores) {
        // Returns array of [member, score, member, score, ...]
        const result = await this.client.zrange(key, start, stop, { withScores: true });
        return result.map(String);
      } else {
        const result = await this.client.zrange(key, start, stop);
        return result.map(String);
      }
    } catch (error) {
      console.error(`[HTTP Redis] ZRANGE error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      console.error(`[HTTP Redis] EXPIRE error for key ${key}:`, error);
      // Don't throw - cache failures should not break the app
    }
  }

  /**
   * Ping Redis to check connection
   */
  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('[HTTP Redis] Ping error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const httpRedis = new HttpRedisClient();

// Export class for testing
export { HttpRedisClient };
