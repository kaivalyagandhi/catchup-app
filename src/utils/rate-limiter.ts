import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client for rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix?: string; // Optional prefix for Redis keys
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until next request allowed
}

/**
 * Default rate limit configurations
 */
export const RateLimits = {
  // API rate limits per user
  API_PER_USER: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    keyPrefix: 'ratelimit:api:user',
  },

  // Voice upload limits
  VOICE_UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 uploads per hour
    keyPrefix: 'ratelimit:voice:user',
  },

  // Notification limits (prevent spam)
  NOTIFICATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 notifications per hour per user
    keyPrefix: 'ratelimit:notification:user',
  },

  // External API rate limits (Google Calendar)
  GOOGLE_CALENDAR_API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    keyPrefix: 'ratelimit:google:user',
  },

  // SMS rate limits (Twilio)
  SMS: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 SMS per hour per user
    keyPrefix: 'ratelimit:sms:user',
  },

  // Email rate limits
  EMAIL: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 emails per hour per user
    keyPrefix: 'ratelimit:email:user',
  },
};

/**
 * Check rate limit using sliding window algorithm
 *
 * This implementation uses Redis sorted sets to track requests
 * within a sliding time window.
 *
 * Can be disabled for development by setting DISABLE_RATE_LIMITING=true
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Bypass rate limiting if disabled (useful for local development)
  if (process.env.DISABLE_RATE_LIMITING === 'true') {
    const now = Date.now();
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now + config.windowMs),
    };
  }

  const key = `${config.keyPrefix || 'ratelimit'}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    const requestCount = await redis.zcard(key);

    // Check if limit exceeded
    if (requestCount >= config.maxRequests) {
      // Get oldest request timestamp to calculate retry after
      const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const oldestTimestamp = oldestRequest.length > 1 ? parseInt(oldestRequest[1]) : now;

      const resetAt = new Date(oldestTimestamp + config.windowMs);
      const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration on key
    await redis.expire(key, Math.ceil(config.windowMs / 1000));

    // Calculate reset time (end of current window)
    const resetAt = new Date(now + config.windowMs);

    return {
      allowed: true,
      remaining: config.maxRequests - requestCount - 1,
      resetAt,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now + config.windowMs),
    };
  }
}

/**
 * Express middleware for API rate limiting
 */
export function apiRateLimiter(config: RateLimitConfig = RateLimits.API_PER_USER) {
  return async (req: any, res: any, next: any) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    // Get user ID from request (assumes authentication middleware sets req.user)
    const userId = req.user?.id || req.ip;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await checkRateLimit(userId, config);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter || 0);
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
}

/**
 * Check voice upload rate limit
 */
export async function checkVoiceUploadLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(userId, RateLimits.VOICE_UPLOAD);
}

/**
 * Check notification rate limit
 */
export async function checkNotificationLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(userId, RateLimits.NOTIFICATION);
}

/**
 * Check SMS rate limit
 */
export async function checkSMSLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(userId, RateLimits.SMS);
}

/**
 * Check email rate limit
 */
export async function checkEmailLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(userId, RateLimits.EMAIL);
}

/**
 * External API rate limiter with exponential backoff
 */
export class ExternalAPIRateLimiter {
  private retryCount: Map<string, number> = new Map();
  private lastRetryTime: Map<string, number> = new Map();

  /**
   * Execute API call with rate limiting and exponential backoff
   */
  async execute<T>(
    identifier: string,
    apiCall: () => Promise<T>,
    config: RateLimitConfig = RateLimits.GOOGLE_CALENDAR_API
  ): Promise<T> {
    const result = await checkRateLimit(identifier, config);

    if (!result.allowed) {
      // Calculate backoff delay
      const retryCount = this.retryCount.get(identifier) || 0;
      const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30s

      console.log(`Rate limit exceeded for ${identifier}. Backing off for ${backoffMs}ms`);

      // Wait for backoff period
      await new Promise((resolve) => setTimeout(resolve, backoffMs));

      // Increment retry count
      this.retryCount.set(identifier, retryCount + 1);
      this.lastRetryTime.set(identifier, Date.now());

      // Retry the call
      return this.execute(identifier, apiCall, config);
    }

    try {
      // Reset retry count on successful call
      this.retryCount.delete(identifier);
      this.lastRetryTime.delete(identifier);

      return await apiCall();
    } catch (error: any) {
      // Check if error is rate limit related
      if (error.code === 429 || error.message?.includes('rate limit')) {
        const retryCount = this.retryCount.get(identifier) || 0;
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000);

        console.log(
          `External API rate limit hit for ${identifier}. Backing off for ${backoffMs}ms`
        );

        await new Promise((resolve) => setTimeout(resolve, backoffMs));

        this.retryCount.set(identifier, retryCount + 1);

        return this.execute(identifier, apiCall, config);
      }

      throw error;
    }
  }

  /**
   * Reset retry count for an identifier
   */
  reset(identifier: string): void {
    this.retryCount.delete(identifier);
    this.lastRetryTime.delete(identifier);
  }
}

// Export singleton instance for external API rate limiting
export const externalAPILimiter = new ExternalAPIRateLimiter();

/**
 * Close Redis connection
 */
export async function closeRateLimiter(): Promise<void> {
  await redis.quit();
}
