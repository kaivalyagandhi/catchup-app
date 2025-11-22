/**
 * Concurrency Control Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OptimisticLockError,
  ConcurrentUpdateError,
  IdempotencyKeyManager,
  generateNotificationIdempotencyKey,
  executeWithIdempotency,
  retryOnLockConflict,
  generateLockId,
} from './concurrency';

describe('OptimisticLockError', () => {
  it('should create error with details', () => {
    const error = new OptimisticLockError(
      'Version mismatch',
      'contacts',
      '123',
      1,
      2
    );

    expect(error.name).toBe('OptimisticLockError');
    expect(error.message).toBe('Version mismatch');
    expect(error.entityType).toBe('contacts');
    expect(error.entityId).toBe('123');
    expect(error.expectedVersion).toBe(1);
    expect(error.actualVersion).toBe(2);
  });
});

describe('ConcurrentUpdateError', () => {
  it('should create error with details', () => {
    const error = new ConcurrentUpdateError('Conflict', 'suggestions', '456');

    expect(error.name).toBe('ConcurrentUpdateError');
    expect(error.message).toBe('Conflict');
    expect(error.entityType).toBe('suggestions');
    expect(error.entityId).toBe('456');
  });
});

describe('IdempotencyKeyManager', () => {
  let manager: IdempotencyKeyManager;

  beforeEach(() => {
    manager = new IdempotencyKeyManager();
  });

  it('should return exists false for new key', async () => {
    const result = await manager.checkKey('test-key');
    expect(result.exists).toBe(false);
  });

  it('should store and retrieve key', async () => {
    await manager.storeKey('test-key', { data: 'result' });

    const result = await manager.checkKey('test-key');
    expect(result.exists).toBe(true);
    expect(result.result).toEqual({ data: 'result' });
  });

  it('should handle multiple keys', async () => {
    await manager.storeKey('key1', 'result1');
    await manager.storeKey('key2', 'result2');

    const result1 = await manager.checkKey('key1');
    const result2 = await manager.checkKey('key2');

    expect(result1.result).toBe('result1');
    expect(result2.result).toBe('result2');
  });

  it('should clean up expired keys', async () => {
    // Store a key
    await manager.storeKey('test-key', 'result');

    // Manually set timestamp to expired
    const keys = (manager as any).keys;
    const entry = keys.get('test-key');
    entry.timestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

    // Cleanup should remove it
    manager.cleanup();

    const result = await manager.checkKey('test-key');
    expect(result.exists).toBe(false);
  });
});

describe('generateNotificationIdempotencyKey', () => {
  it('should generate unique key for notification', () => {
    const key = generateNotificationIdempotencyKey('user1', 'suggestion1', 'sms');
    expect(key).toBe('notification:user1:suggestion1:sms');
  });

  it('should generate different keys for different channels', () => {
    const smsKey = generateNotificationIdempotencyKey('user1', 'suggestion1', 'sms');
    const emailKey = generateNotificationIdempotencyKey('user1', 'suggestion1', 'email');

    expect(smsKey).not.toBe(emailKey);
  });
});

describe('executeWithIdempotency', () => {
  it('should execute operation on first call', async () => {
    const operation = vi.fn().mockResolvedValue('result');

    const result = await executeWithIdempotency('test-key-unique-1', operation);

    expect(result).toBe('result');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should return cached result on second call', async () => {
    const operation = vi.fn().mockResolvedValue('result');
    const uniqueKey = `test-key-${Date.now()}`;

    const result1 = await executeWithIdempotency(uniqueKey, operation);
    const result2 = await executeWithIdempotency(uniqueKey, operation);

    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(operation).toHaveBeenCalledTimes(1); // Only called once
  });

  it('should execute different operations for different keys', async () => {
    const operation1 = vi.fn().mockResolvedValue('result1');
    const operation2 = vi.fn().mockResolvedValue('result2');
    const key1 = `key1-${Date.now()}`;
    const key2 = `key2-${Date.now()}`;

    const result1 = await executeWithIdempotency(key1, operation1);
    const result2 = await executeWithIdempotency(key2, operation2);

    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
    expect(operation1).toHaveBeenCalledTimes(1);
    expect(operation2).toHaveBeenCalledTimes(1);
  });
});

describe('retryOnLockConflict', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const promise = retryOnLockConflict(operation);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on OptimisticLockError', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new OptimisticLockError('Lock error', 'contacts', '123', 1, 2)
      )
      .mockResolvedValue('success');

    const promise = retryOnLockConflict(operation, 3, 10);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should retry on ConcurrentUpdateError', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new ConcurrentUpdateError('Conflict', 'suggestions', '456')
      )
      .mockResolvedValue('success');

    const promise = retryOnLockConflict(operation, 3, 10);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-lock errors', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Other error'));

    const promise = retryOnLockConflict(operation);

    await expect(promise).rejects.toThrow('Other error');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should fail after max retries', async () => {
    const error = new OptimisticLockError('Lock error', 'contacts', '123', 1, 2);
    const operation = vi.fn().mockRejectedValue(error);

    await vi.runAllTimersAsync();

    await expect(retryOnLockConflict(operation, 2, 10)).rejects.toThrow('Lock error');
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should use exponential backoff', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new OptimisticLockError('Lock error', 'contacts', '123', 1, 2)
      )
      .mockRejectedValueOnce(
        new OptimisticLockError('Lock error', 'contacts', '123', 1, 2)
      )
      .mockResolvedValue('success');

    const promise = retryOnLockConflict(operation, 3, 100);

    // First retry after 100ms
    await vi.advanceTimersByTimeAsync(100);
    // Second retry after 200ms
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});

describe('generateLockId', () => {
  it('should generate consistent lock ID for same key', () => {
    const id1 = generateLockId('test-key');
    const id2 = generateLockId('test-key');

    expect(id1).toBe(id2);
  });

  it('should generate different IDs for different keys', () => {
    const id1 = generateLockId('key1');
    const id2 = generateLockId('key2');

    expect(id1).not.toBe(id2);
  });

  it('should generate positive integers', () => {
    const id = generateLockId('test-key');

    expect(id).toBeGreaterThan(0);
    expect(Number.isInteger(id)).toBe(true);
  });
});
