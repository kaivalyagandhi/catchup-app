/**
 * Idempotency Manager
 * 
 * Prevents duplicate job execution using Upstash Redis (HTTP client).
 * Stores idempotency keys with 24-hour TTL to match Cloud Tasks deduplication window.
 */

import { httpRedis } from '../utils/http-redis-client';
import { createHash } from 'crypto';

export class IdempotencyManager {
  private static readonly TTL = 86400; // 24 hours (matches Cloud Tasks deduplication window)
  private static readonly KEY_PREFIX = 'idempotency:';

  /**
   * Generate idempotency key from job name and data
   */
  static generateKey(jobName: string, data: any): string {
    const hash = createHash('sha256');
    hash.update(jobName);
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Check if job has already been processed
   */
  static async isProcessed(idempotencyKey: string): Promise<boolean> {
    try {
      const key = `${this.KEY_PREFIX}${idempotencyKey}`;
      const value = await httpRedis.get(key);
      return value !== null;
    } catch (error) {
      console.error('[Idempotency] Error checking key:', error);
      // Fail open: allow execution if Redis is down
      return false;
    }
  }

  /**
   * Mark job as processed
   */
  static async markProcessed(idempotencyKey: string): Promise<void> {
    try {
      const key = `${this.KEY_PREFIX}${idempotencyKey}`;
      await httpRedis.set(key, '1', this.TTL);
      console.log(`[Idempotency] Marked as processed: ${idempotencyKey}`);
    } catch (error) {
      console.error('[Idempotency] Error marking key:', error);
      // Non-critical: log error but don't fail job
    }
  }

  /**
   * Get cached result for duplicate request
   */
  static async getCachedResult(idempotencyKey: string): Promise<any | null> {
    try {
      const key = `${this.KEY_PREFIX}${idempotencyKey}:result`;
      const result = await httpRedis.get(key);
      return result ? JSON.parse(result as string) : null;
    } catch (error) {
      console.error('[Idempotency] Error getting cached result:', error);
      return null;
    }
  }

  /**
   * Cache result for duplicate requests
   */
  static async cacheResult(idempotencyKey: string, result: any): Promise<void> {
    try {
      const key = `${this.KEY_PREFIX}${idempotencyKey}:result`;
      await httpRedis.set(key, JSON.stringify(result), this.TTL);
    } catch (error) {
      console.error('[Idempotency] Error caching result:', error);
      // Non-critical: log error but don't fail job
    }
  }

  /**
   * Clear idempotency key (for testing)
   */
  static async clear(idempotencyKey: string): Promise<void> {
    try {
      const key = `${this.KEY_PREFIX}${idempotencyKey}`;
      const resultKey = `${this.KEY_PREFIX}${idempotencyKey}:result`;
      await httpRedis.del(key);
      await httpRedis.del(resultKey);
    } catch (error) {
      console.error('[Idempotency] Error clearing key:', error);
    }
  }
}
