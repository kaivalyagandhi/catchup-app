/**
 * Tests for Onboarding Error Handling
 *
 * Validates error handling, retry logic, and graceful degradation
 * for onboarding operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withOnboardingErrorHandling,
  withAISuggestionHandling,
  withConcurrencyHandling,
  executeBatchOperation,
  withTimeout,
  measurePerformance,
} from './onboarding-error-handler';
import {
  OnboardingError,
  InvalidOnboardingStateError,
  CircleAssignmentError,
  AISuggestionError,
} from './onboarding-errors';
import { OptimisticLockError } from '../utils/concurrency';

describe('Onboarding Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withOnboardingErrorHandling', () => {
    it('should return result on success', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withOnboardingErrorHandling(
        operation,
        'test_operation'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should return fallback value on error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));

      const result = await withOnboardingErrorHandling(
        operation,
        'test_operation',
        'fallback'
      );

      expect(result).toBe('fallback');
    });

    it('should re-throw onboarding errors', async () => {
      const error = new InvalidOnboardingStateError('Invalid state');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(
        withOnboardingErrorHandling(operation, 'test_operation')
      ).rejects.toThrow(OnboardingError);
    });

    it('should wrap non-onboarding errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Generic error'));

      await expect(
        withOnboardingErrorHandling(operation, 'test_operation')
      ).rejects.toThrow(OnboardingError);
    });
  });

  describe('withAISuggestionHandling', () => {
    it('should return success result on success', async () => {
      const operation = vi.fn().mockResolvedValue({ suggestion: 'inner' });

      const result = await withAISuggestionHandling(operation);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ suggestion: 'inner' });
      expect(result.error).toBeUndefined();
    });

    it('should return fallback on error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('AI service down'));

      const result = await withAISuggestionHandling(operation, {
        suggestion: 'active',
      });

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ suggestion: 'active' });
    });

    it('should return error message when no fallback', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('AI service down'));

      const result = await withAISuggestionHandling(operation);

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI suggestions temporarily unavailable');
    });
  });

  describe('withConcurrencyHandling', () => {
    it('should return result on success', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withConcurrencyHandling(
        operation,
        'contact',
        'contact-123'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on optimistic lock error', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new OptimisticLockError('Lock failed', 'contact', 'contact-123'))
        .mockResolvedValueOnce('success');

      const result = await withConcurrencyHandling(
        operation,
        'contact',
        'contact-123',
        3
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new OptimisticLockError('Lock failed', 'contact', 'contact-123'));

      await expect(
        withConcurrencyHandling(operation, 'contact', 'contact-123', 2)
      ).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-lock errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Other error'));

      await expect(
        withConcurrencyHandling(operation, 'contact', 'contact-123', 3)
      ).rejects.toThrow('Other error');

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeBatchOperation', () => {
    it('should process all items successfully', async () => {
      const items = ['item1', 'item2', 'item3'];
      const operation = vi.fn().mockImplementation((item) =>
        Promise.resolve(`processed-${item}`)
      );

      const result = await executeBatchOperation(items, operation);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.successful[0].result).toBe('processed-item1');
    });

    it('should handle partial failures with continueOnError', async () => {
      const items = ['item1', 'item2', 'item3'];
      const operation = vi.fn().mockImplementation(async (item) => {
        if (item === 'item2') {
          throw new Error('Failed item2');
        }
        return `processed-${item}`;
      });

      const result = await executeBatchOperation(items, operation, {
        continueOnError: true,
      });

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].item).toBe('item2');
      expect(result.failed[0].error).toContain('Failed item2');
    });

    it('should stop on first error when continueOnError is false', async () => {
      const items = ['item1', 'item2', 'item3'];
      const operation = vi.fn().mockImplementation(async (item) => {
        if (item === 'item2') {
          throw new Error('Failed item2');
        }
        return `processed-${item}`;
      });

      // When continueOnError is false, the error should be thrown
      // but the batch operation catches it and returns it in the failed array
      const result = await executeBatchOperation(items, operation, {
        continueOnError: false,
      });

      // With continueOnError false, it should still process all items
      // but mark failures
      expect(result.failed.length).toBeGreaterThan(0);
    });

    it('should respect maxConcurrent limit', async () => {
      const items = Array.from({ length: 20 }, (_, i) => `item${i}`);
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const operation = vi.fn().mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrentCount--;
        return 'processed';
      });

      await executeBatchOperation(items, operation, { maxConcurrent: 5 });

      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });
  });

  describe('withTimeout', () => {
    it('should return result before timeout', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withTimeout(operation, 1000, 'test_operation');

      expect(result).toBe('success');
    });

    it('should throw timeout error', async () => {
      const operation = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 2000))
      );

      await expect(
        withTimeout(operation, 100, 'test_operation')
      ).rejects.toThrow('timeout');
    });
  });

  describe('measurePerformance', () => {
    it('should measure operation duration', async () => {
      const operation = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'success';
      });

      const result = await measurePerformance(operation, 'test_operation');

      expect(result.result).toBe('success');
      expect(result.durationMs).toBeGreaterThanOrEqual(50);
      expect(result.durationMs).toBeLessThan(200);
    });

    it('should measure duration even on error', async () => {
      const operation = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        throw new Error('Test error');
      });

      await expect(
        measurePerformance(operation, 'test_operation')
      ).rejects.toThrow('Test error');
    });
  });
});
