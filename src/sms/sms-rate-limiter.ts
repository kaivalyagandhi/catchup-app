import { httpRedis } from '../utils/http-redis-client';
import dotenv from 'dotenv';

dotenv.config();

// OLD CODE - Using ioredis (TCP connection)
// Kept for rollback purposes - remove after Phase 3
/*
import Redis from 'ioredis';

function createRedisClient(): Redis {
  if (process.env.REDIS_URL) {
    console.log('[SMS Rate Limiter] Connecting using REDIS_URL connection string');
    return new Redis(process.env.REDIS_URL, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
  }

  console.log('[SMS Rate Limiter] Connecting using object configuration');
  return new Redis({
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
  });
}

const redis = createRedisClient();

redis.on('error', (err) => {
  console.error('SMS Rate Limiter Redis connection error:', err);
});
*/

// NEW CODE - Using HTTP Redis (no persistent connection)
console.log('[SMS Rate Limiter] Using HTTP Redis client (0 connections)');

/**
 * SMS Rate Limit Configuration
 * Requirements: 8.1, 8.2, 8.4
 */
export const SMS_RATE_LIMIT_CONFIG = {
  maxMessages: parseInt(process.env.RATE_LIMIT_MESSAGES_PER_HOUR || '20', 10),
  windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
  keyPrefix: 'sms:ratelimit',
};

/**
 * SMS Rate Limit Result
 */
export interface SMSRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until next message allowed
  currentCount: number;
  limit: number;
}

/**
 * Check if a phone number has exceeded the SMS rate limit
 *
 * Uses Redis sorted sets to track messages within a sliding time window.
 * Requirements: 8.1 - Limit processing to 20 messages per hour per phone number
 * Requirements: 8.2 - Reject additional messages until time window resets
 *
 * @param phoneNumber - The phone number to check (e.g., "+15555551234")
 * @returns Rate limit result with allowed status and remaining quota
 */
export async function checkSMSRateLimit(phoneNumber: string): Promise<SMSRateLimitResult> {
  const key = `${SMS_RATE_LIMIT_CONFIG.keyPrefix}:${phoneNumber}`;
  const now = Date.now();
  const windowStart = now - SMS_RATE_LIMIT_CONFIG.windowMs;

  try {
    // Remove old entries outside the current time window
    await httpRedis.zremrangebyscore(key, 0, windowStart);

    // Count messages in current window
    const messageCount = await httpRedis.zcard(key);

    // Check if limit exceeded
    if (messageCount >= SMS_RATE_LIMIT_CONFIG.maxMessages) {
      // Get oldest message timestamp to calculate when the window resets
      const oldestMessage = await httpRedis.zrange(key, 0, 0, true);
      const oldestTimestamp = oldestMessage.length > 1 ? parseInt(oldestMessage[1]) : now;

      const resetAt = new Date(oldestTimestamp + SMS_RATE_LIMIT_CONFIG.windowMs);
      const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
        currentCount: messageCount,
        limit: SMS_RATE_LIMIT_CONFIG.maxMessages,
      };
    }

    // Calculate reset time (when the oldest message will expire)
    const oldestMessage = await httpRedis.zrange(key, 0, 0, true);
    const oldestTimestamp = oldestMessage.length > 1 ? parseInt(oldestMessage[1]) : now;
    const resetAt = new Date(oldestTimestamp + SMS_RATE_LIMIT_CONFIG.windowMs);

    return {
      allowed: true,
      remaining: SMS_RATE_LIMIT_CONFIG.maxMessages - messageCount,
      resetAt,
      currentCount: messageCount,
      limit: SMS_RATE_LIMIT_CONFIG.maxMessages,
    };
  } catch (error) {
    console.error('SMS rate limit check error:', error);
    // On error, allow the message (fail open) to avoid blocking legitimate traffic
    return {
      allowed: true,
      remaining: SMS_RATE_LIMIT_CONFIG.maxMessages,
      resetAt: new Date(now + SMS_RATE_LIMIT_CONFIG.windowMs),
      currentCount: 0,
      limit: SMS_RATE_LIMIT_CONFIG.maxMessages,
    };
  }
}

/**
 * Increment the message counter for a phone number
 *
 * Should be called after successfully processing a message.
 * Requirements: 8.1 - Track message count per phone number
 *
 * @param phoneNumber - The phone number to increment
 */
export async function incrementSMSCounter(phoneNumber: string): Promise<void> {
  const key = `${SMS_RATE_LIMIT_CONFIG.keyPrefix}:${phoneNumber}`;
  const now = Date.now();

  try {
    // Add current message with timestamp
    await httpRedis.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration on key (cleanup after window expires)
    // Add extra time to ensure we don't lose data prematurely
    const expirationSeconds = Math.ceil(SMS_RATE_LIMIT_CONFIG.windowMs / 1000) + 60;
    await httpRedis.expire(key, expirationSeconds);
  } catch (error) {
    console.error('SMS counter increment error:', error);
    // Don't throw - we don't want to fail message processing due to rate limit tracking errors
  }
}

/**
 * Get the remaining quota for a phone number
 *
 * Requirements: 8.1 - Provide quota information
 *
 * @param phoneNumber - The phone number to check
 * @returns Number of messages remaining in current window
 */
export async function getRemainingQuota(phoneNumber: string): Promise<number> {
  const result = await checkSMSRateLimit(phoneNumber);
  return result.remaining;
}

/**
 * Get the current message count for a phone number
 *
 * @param phoneNumber - The phone number to check
 * @returns Current number of messages in the time window
 */
export async function getCurrentMessageCount(phoneNumber: string): Promise<number> {
  const key = `${SMS_RATE_LIMIT_CONFIG.keyPrefix}:${phoneNumber}`;
  const now = Date.now();
  const windowStart = now - SMS_RATE_LIMIT_CONFIG.windowMs;

  try {
    // Remove old entries
    await httpRedis.zremrangebyscore(key, 0, windowStart);

    // Count messages in current window
    const count = await httpRedis.zcard(key);
    return count;
  } catch (error) {
    console.error('Get message count error:', error);
    return 0;
  }
}

/**
 * Reset the rate limit for a phone number (admin function)
 *
 * Requirements: 8.4 - Time window reset functionality
 *
 * @param phoneNumber - The phone number to reset
 */
export async function resetSMSRateLimit(phoneNumber: string): Promise<void> {
  const key = `${SMS_RATE_LIMIT_CONFIG.keyPrefix}:${phoneNumber}`;

  try {
    await httpRedis.del(key);
  } catch (error) {
    console.error('SMS rate limit reset error:', error);
    throw error;
  }
}

/**
 * Get rate limit status for a phone number (for monitoring/debugging)
 *
 * @param phoneNumber - The phone number to check
 * @returns Detailed rate limit status
 */
export async function getSMSRateLimitStatus(phoneNumber: string): Promise<{
  phoneNumber: string;
  currentCount: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  windowMs: number;
}> {
  const result = await checkSMSRateLimit(phoneNumber);

  return {
    phoneNumber,
    currentCount: result.currentCount,
    limit: result.limit,
    remaining: result.remaining,
    resetAt: result.resetAt,
    windowMs: SMS_RATE_LIMIT_CONFIG.windowMs,
  };
}

/**
 * Close Redis connection (for cleanup)
 * Note: HTTP Redis doesn't maintain persistent connections, so this is a no-op
 */
export async function closeSMSRateLimiter(): Promise<void> {
  console.log('HTTP Redis SMS rate limiter closed (no persistent connection)');
}

/**
 * In-memory fallback rate limiter (used when Redis is unavailable)
 *
 * This is a simple in-memory implementation that provides basic rate limiting
 * when Redis is not available. It's not suitable for production with multiple
 * server instances, but provides a fallback for development and testing.
 */
class InMemoryRateLimiter {
  private counters: Map<string, Array<{ timestamp: number; id: string }>> = new Map();

  async check(phoneNumber: string): Promise<SMSRateLimitResult> {
    const now = Date.now();
    const windowStart = now - SMS_RATE_LIMIT_CONFIG.windowMs;

    // Get or create counter for this phone number
    let messages = this.counters.get(phoneNumber) || [];

    // Remove old messages outside the window
    messages = messages.filter((msg) => msg.timestamp > windowStart);
    this.counters.set(phoneNumber, messages);

    const messageCount = messages.length;

    if (messageCount >= SMS_RATE_LIMIT_CONFIG.maxMessages) {
      const oldestTimestamp = messages[0]?.timestamp || now;
      const resetAt = new Date(oldestTimestamp + SMS_RATE_LIMIT_CONFIG.windowMs);
      const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
        currentCount: messageCount,
        limit: SMS_RATE_LIMIT_CONFIG.maxMessages,
      };
    }

    const oldestTimestamp = messages[0]?.timestamp || now;
    const resetAt = new Date(oldestTimestamp + SMS_RATE_LIMIT_CONFIG.windowMs);

    return {
      allowed: true,
      remaining: SMS_RATE_LIMIT_CONFIG.maxMessages - messageCount,
      resetAt,
      currentCount: messageCount,
      limit: SMS_RATE_LIMIT_CONFIG.maxMessages,
    };
  }

  async increment(phoneNumber: string): Promise<void> {
    const now = Date.now();
    const messages = this.counters.get(phoneNumber) || [];

    messages.push({
      timestamp: now,
      id: `${now}-${Math.random()}`,
    });

    this.counters.set(phoneNumber, messages);
  }

  async reset(phoneNumber: string): Promise<void> {
    this.counters.delete(phoneNumber);
  }

  async getCount(phoneNumber: string): Promise<number> {
    const now = Date.now();
    const windowStart = now - SMS_RATE_LIMIT_CONFIG.windowMs;

    let messages = this.counters.get(phoneNumber) || [];
    messages = messages.filter((msg) => msg.timestamp > windowStart);

    return messages.length;
  }
}

// Export in-memory fallback instance
export const inMemoryRateLimiter = new InMemoryRateLimiter();
