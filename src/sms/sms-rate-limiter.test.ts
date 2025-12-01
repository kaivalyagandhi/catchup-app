import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  checkSMSRateLimit,
  incrementSMSCounter,
  getRemainingQuota,
  getCurrentMessageCount,
  resetSMSRateLimit,
  getSMSRateLimitStatus,
  closeSMSRateLimiter,
  SMS_RATE_LIMIT_CONFIG,
  inMemoryRateLimiter,
} from './sms-rate-limiter';

describe('SMS Rate Limiter', () => {
  const testPhoneNumber = '+15555551234';
  const testPhoneNumber2 = '+15555555678';

  beforeEach(async () => {
    // Clean up before each test
    await resetSMSRateLimit(testPhoneNumber);
    await resetSMSRateLimit(testPhoneNumber2);
  });

  afterAll(async () => {
    // Clean up and close connection
    await resetSMSRateLimit(testPhoneNumber);
    await resetSMSRateLimit(testPhoneNumber2);
    await closeSMSRateLimiter();
  });

  describe('checkSMSRateLimit', () => {
    it('should allow messages when under the limit', async () => {
      const result = await checkSMSRateLimit(testPhoneNumber);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages);
      expect(result.currentCount).toBe(0);
      expect(result.limit).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should track message count correctly', async () => {
      // Send 5 messages
      for (let i = 0; i < 5; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      const result = await checkSMSRateLimit(testPhoneNumber);

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(5);
      expect(result.remaining).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages - 5);
    });

    it('should reject messages when limit is reached', async () => {
      // Send max messages
      for (let i = 0; i < SMS_RATE_LIMIT_CONFIG.maxMessages; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      const result = await checkSMSRateLimit(testPhoneNumber);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.currentCount).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should provide retry after time when rate limited', async () => {
      // Send max messages
      for (let i = 0; i < SMS_RATE_LIMIT_CONFIG.maxMessages; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      const result = await checkSMSRateLimit(testPhoneNumber);

      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(3600); // Max 1 hour
    });

    it('should isolate rate limits per phone number', async () => {
      // Send messages from first number
      for (let i = 0; i < 10; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      // Check second number should still have full quota
      const result = await checkSMSRateLimit(testPhoneNumber2);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages);
      expect(result.currentCount).toBe(0);
    });
  });

  describe('incrementSMSCounter', () => {
    it('should increment counter correctly', async () => {
      await incrementSMSCounter(testPhoneNumber);
      const count = await getCurrentMessageCount(testPhoneNumber);

      expect(count).toBe(1);
    });

    it('should handle multiple increments', async () => {
      for (let i = 0; i < 5; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      const count = await getCurrentMessageCount(testPhoneNumber);
      expect(count).toBe(5);
    });
  });

  describe('getRemainingQuota', () => {
    it('should return full quota initially', async () => {
      const remaining = await getRemainingQuota(testPhoneNumber);

      expect(remaining).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages);
    });

    it('should return correct remaining quota after messages', async () => {
      for (let i = 0; i < 7; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      const remaining = await getRemainingQuota(testPhoneNumber);

      expect(remaining).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages - 7);
    });

    it('should return zero when limit reached', async () => {
      for (let i = 0; i < SMS_RATE_LIMIT_CONFIG.maxMessages; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      const remaining = await getRemainingQuota(testPhoneNumber);

      expect(remaining).toBe(0);
    });
  });

  describe('getCurrentMessageCount', () => {
    it('should return zero initially', async () => {
      const count = await getCurrentMessageCount(testPhoneNumber);

      expect(count).toBe(0);
    });

    it('should return correct count after messages', async () => {
      for (let i = 0; i < 3; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      const count = await getCurrentMessageCount(testPhoneNumber);

      expect(count).toBe(3);
    });
  });

  describe('resetSMSRateLimit', () => {
    it('should reset counter to zero', async () => {
      // Add some messages
      for (let i = 0; i < 10; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      // Verify count
      let count = await getCurrentMessageCount(testPhoneNumber);
      expect(count).toBe(10);

      // Reset
      await resetSMSRateLimit(testPhoneNumber);

      // Verify reset
      count = await getCurrentMessageCount(testPhoneNumber);
      expect(count).toBe(0);
    });

    it('should allow messages after reset', async () => {
      // Fill up the limit
      for (let i = 0; i < SMS_RATE_LIMIT_CONFIG.maxMessages; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      // Verify blocked
      let result = await checkSMSRateLimit(testPhoneNumber);
      expect(result.allowed).toBe(false);

      // Reset
      await resetSMSRateLimit(testPhoneNumber);

      // Verify allowed
      result = await checkSMSRateLimit(testPhoneNumber);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages);
    });
  });

  describe('getSMSRateLimitStatus', () => {
    it('should return complete status information', async () => {
      for (let i = 0; i < 5; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      const status = await getSMSRateLimitStatus(testPhoneNumber);

      expect(status.phoneNumber).toBe(testPhoneNumber);
      expect(status.currentCount).toBe(5);
      expect(status.limit).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages);
      expect(status.remaining).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages - 5);
      expect(status.resetAt).toBeInstanceOf(Date);
      expect(status.windowMs).toBe(SMS_RATE_LIMIT_CONFIG.windowMs);
    });
  });

  describe('In-Memory Rate Limiter (fallback)', () => {
    beforeEach(async () => {
      await inMemoryRateLimiter.reset(testPhoneNumber);
    });

    it('should allow messages when under the limit', async () => {
      const result = await inMemoryRateLimiter.check(testPhoneNumber);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages);
    });

    it('should track message count correctly', async () => {
      for (let i = 0; i < 5; i++) {
        await inMemoryRateLimiter.increment(testPhoneNumber);
      }

      const count = await inMemoryRateLimiter.getCount(testPhoneNumber);
      expect(count).toBe(5);
    });

    it('should reject messages when limit is reached', async () => {
      for (let i = 0; i < SMS_RATE_LIMIT_CONFIG.maxMessages; i++) {
        await inMemoryRateLimiter.increment(testPhoneNumber);
      }

      const result = await inMemoryRateLimiter.check(testPhoneNumber);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset counter', async () => {
      for (let i = 0; i < 10; i++) {
        await inMemoryRateLimiter.increment(testPhoneNumber);
      }

      await inMemoryRateLimiter.reset(testPhoneNumber);

      const count = await inMemoryRateLimiter.getCount(testPhoneNumber);
      expect(count).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent increments', async () => {
      // Simulate concurrent message processing
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(incrementSMSCounter(testPhoneNumber));
      }

      await Promise.all(promises);

      const count = await getCurrentMessageCount(testPhoneNumber);
      expect(count).toBe(10);
    });

    it('should handle checking limit without any messages', async () => {
      const result = await checkSMSRateLimit(testPhoneNumber);

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.remaining).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages);
    });

    it('should handle exactly at the limit', async () => {
      // Send exactly max messages
      for (let i = 0; i < SMS_RATE_LIMIT_CONFIG.maxMessages; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      const result = await checkSMSRateLimit(testPhoneNumber);

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(SMS_RATE_LIMIT_CONFIG.maxMessages);
      expect(result.remaining).toBe(0);
    });

    it('should handle one message over the limit', async () => {
      // Send max + 1 messages
      for (let i = 0; i < SMS_RATE_LIMIT_CONFIG.maxMessages + 1; i++) {
        await incrementSMSCounter(testPhoneNumber);
      }

      const result = await checkSMSRateLimit(testPhoneNumber);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should use correct default configuration', () => {
      expect(SMS_RATE_LIMIT_CONFIG.maxMessages).toBe(20);
      expect(SMS_RATE_LIMIT_CONFIG.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(SMS_RATE_LIMIT_CONFIG.keyPrefix).toBe('sms:ratelimit');
    });
  });
});
