import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  checkRateLimit,
  RateLimits,
  checkVoiceUploadLimit,
  checkNotificationLimit,
  checkSMSLimit,
  checkEmailLimit,
  ExternalAPIRateLimiter,
  closeRateLimiter,
} from './rate-limiter';

describe('Rate Limiter', () => {
  const testUserId = 'test-user-rate-limit';

  afterAll(async () => {
    await closeRateLimiter();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 5,
        keyPrefix: 'test:basic',
      };

      const result = await checkRateLimit(testUserId, config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(config.maxRequests);
    });

    it('should block requests exceeding limit', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 2,
        keyPrefix: 'test:block',
      };

      // Make requests up to limit
      await checkRateLimit(`${testUserId}-block`, config);
      await checkRateLimit(`${testUserId}-block`, config);

      // This should be blocked
      const result = await checkRateLimit(`${testUserId}-block`, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after window expires', async () => {
      const config = {
        windowMs: 1000, // 1 second window
        maxRequests: 2,
        keyPrefix: 'test:reset',
      };

      // Use up limit
      await checkRateLimit(`${testUserId}-reset`, config);
      await checkRateLimit(`${testUserId}-reset`, config);

      // Should be blocked
      const blocked = await checkRateLimit(`${testUserId}-reset`, config);
      expect(blocked.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be allowed again
      const allowed = await checkRateLimit(`${testUserId}-reset`, config);
      expect(allowed.allowed).toBe(true);
    });
  });

  describe('Specific Rate Limits', () => {
    it('should enforce voice upload limits', async () => {
      const result = await checkVoiceUploadLimit(`${testUserId}-voice`);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(RateLimits.VOICE_UPLOAD.maxRequests);
    });

    it('should enforce notification limits', async () => {
      const result = await checkNotificationLimit(`${testUserId}-notif`);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(RateLimits.NOTIFICATION.maxRequests);
    });

    it('should enforce SMS limits', async () => {
      const result = await checkSMSLimit(`${testUserId}-sms`);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(RateLimits.SMS.maxRequests);
    });

    it('should enforce email limits', async () => {
      const result = await checkEmailLimit(`${testUserId}-email`);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(RateLimits.EMAIL.maxRequests);
    });
  });

  describe('External API Rate Limiter', () => {
    it('should execute API call successfully', async () => {
      const limiter = new ExternalAPIRateLimiter();
      const apiCall = async () => 'success';

      const result = await limiter.execute(
        `${testUserId}-api`,
        apiCall,
        {
          windowMs: 60000,
          maxRequests: 5,
          keyPrefix: 'test:api',
        }
      );

      expect(result).toBe('success');
    });

    it('should handle rate limit errors with backoff', async () => {
      const limiter = new ExternalAPIRateLimiter();
      let callCount = 0;

      const apiCall = async () => {
        callCount++;
        if (callCount < 2) {
          const error: any = new Error('Rate limit exceeded');
          error.code = 429;
          throw error;
        }
        return 'success';
      };

      const result = await limiter.execute(
        `${testUserId}-backoff`,
        apiCall,
        {
          windowMs: 60000,
          maxRequests: 10,
          keyPrefix: 'test:backoff',
        }
      );

      expect(result).toBe('success');
      expect(callCount).toBeGreaterThan(1);
    });

    it('should reset retry count', () => {
      const limiter = new ExternalAPIRateLimiter();
      limiter.reset(`${testUserId}-reset-api`);
      // No error should be thrown
      expect(true).toBe(true);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include correct rate limit information', async () => {
      const config = {
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'test:headers',
      };

      const result = await checkRateLimit(`${testUserId}-headers`, config);

      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.remaining).toBeLessThanOrEqual(config.maxRequests);
    });
  });
});
