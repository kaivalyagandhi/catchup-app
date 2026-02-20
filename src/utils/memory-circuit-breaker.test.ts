/**
 * Memory Circuit Breaker Tests
 *
 * Requirements: Memory Optimization Phase 1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryCircuitBreaker, MemoryCircuitBreakerError } from './memory-circuit-breaker';

describe('MemoryCircuitBreaker', () => {
  let breaker: MemoryCircuitBreaker;

  beforeEach(() => {
    breaker = new MemoryCircuitBreaker({ maxHeapPercent: 90, enableLogging: false });
  });

  describe('getMemoryUsage', () => {
    it('should return current memory usage', () => {
      const usage = breaker.getMemoryUsage();

      expect(usage).toHaveProperty('heapUsed');
      expect(usage).toHaveProperty('heapTotal');
      expect(usage).toHaveProperty('heapPercent');
      expect(usage).toHaveProperty('rss');
      expect(usage).toHaveProperty('external');

      expect(usage.heapUsed).toBeGreaterThan(0);
      expect(usage.heapTotal).toBeGreaterThan(0);
      expect(usage.heapPercent).toBeGreaterThan(0);
      expect(usage.heapPercent).toBeLessThanOrEqual(100);
    });

    it('should calculate heap percent correctly', () => {
      const usage = breaker.getMemoryUsage();
      const expectedPercent = (usage.heapUsed / usage.heapTotal) * 100;

      expect(usage.heapPercent).toBeCloseTo(expectedPercent, 1);
    });
  });

  describe('checkMemory', () => {
    it('should not throw when memory is below threshold', async () => {
      const breaker = new MemoryCircuitBreaker({ maxHeapPercent: 95, enableLogging: false });

      await expect(breaker.checkMemory()).resolves.not.toThrow();
    });

    it('should throw MemoryCircuitBreakerError when threshold exceeded', async () => {
      // Allocate memory to exceed threshold
      const largeArray = new Array(10000000).fill('x'.repeat(100));

      const breaker = new MemoryCircuitBreaker({ maxHeapPercent: 10, enableLogging: false });

      await expect(breaker.checkMemory()).rejects.toThrow(MemoryCircuitBreakerError);

      // Clean up
      largeArray.length = 0;
    });

    it('should include memory usage in error', async () => {
      const largeArray = new Array(10000000).fill('x'.repeat(100));

      const breaker = new MemoryCircuitBreaker({ maxHeapPercent: 10, enableLogging: false });

      try {
        await breaker.checkMemory();
        expect.fail('Should have thrown MemoryCircuitBreakerError');
      } catch (error) {
        expect(error).toBeInstanceOf(MemoryCircuitBreakerError);
        if (error instanceof MemoryCircuitBreakerError) {
          expect(error.memoryUsage).toHaveProperty('heapUsed');
          expect(error.memoryUsage).toHaveProperty('heapPercent');
        }
      }

      // Clean up
      largeArray.length = 0;
    });
  });

  describe('execute', () => {
    it('should execute operation when memory is low', async () => {
      const breaker = new MemoryCircuitBreaker({ maxHeapPercent: 95, enableLogging: false });

      const result = await breaker.execute(async () => {
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should check memory before and after operation', async () => {
      const breaker = new MemoryCircuitBreaker({ maxHeapPercent: 95, enableLogging: false });

      let operationExecuted = false;

      await breaker.execute(async () => {
        operationExecuted = true;
        return 'done';
      });

      expect(operationExecuted).toBe(true);
    });

    it('should throw if memory exceeds threshold during operation', async () => {
      const breaker = new MemoryCircuitBreaker({ maxHeapPercent: 10, enableLogging: false });

      await expect(
        breaker.execute(async () => {
          const largeArray = new Array(10000000).fill('x'.repeat(100));
          return largeArray.length;
        })
      ).rejects.toThrow(MemoryCircuitBreakerError);
    });
  });

  describe('formatMemoryUsage', () => {
    it('should format memory usage as readable string', () => {
      const usage = breaker.getMemoryUsage();
      const formatted = breaker.formatMemoryUsage(usage);

      expect(formatted).toContain('heapUsed');
      expect(formatted).toContain('MB');
      expect(formatted).toContain('heapPercent');
      expect(formatted).toContain('%');
    });
  });
});
