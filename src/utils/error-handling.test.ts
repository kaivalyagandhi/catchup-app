/**
 * Error Handling Utilities Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorType,
  classifyError,
  isRetryable,
  calculateBackoffDelay,
  retryWithBackoff,
  handleGoogleCalendarError,
  handleNotificationDelivery,
  handleTranscription,
  handleNLPOperation,
  handleDatabaseOperation,
  CircuitBreaker,
  DEFAULT_RETRY_CONFIG,
} from './error-handling';

describe('classifyError', () => {
  it('should classify network errors', () => {
    expect(classifyError({ code: 'ECONNREFUSED' })).toBe(ErrorType.NETWORK);
    expect(classifyError({ code: 'ENOTFOUND' })).toBe(ErrorType.NETWORK);
    expect(classifyError({ code: 'ETIMEDOUT' })).toBe(ErrorType.NETWORK);
  });

  it('should classify authentication errors', () => {
    expect(classifyError({ status: 401 })).toBe(ErrorType.AUTHENTICATION);
    expect(classifyError({ statusCode: 403 })).toBe(ErrorType.AUTHENTICATION);
  });

  it('should classify rate limit errors', () => {
    expect(classifyError({ status: 429 })).toBe(ErrorType.RATE_LIMIT);
  });

  it('should classify validation errors', () => {
    expect(classifyError({ status: 400 })).toBe(ErrorType.VALIDATION);
    expect(classifyError({ status: 422 })).toBe(ErrorType.VALIDATION);
  });

  it('should classify not found errors', () => {
    expect(classifyError({ status: 404 })).toBe(ErrorType.NOT_FOUND);
  });

  it('should classify server errors', () => {
    expect(classifyError({ status: 500 })).toBe(ErrorType.SERVER_ERROR);
    expect(classifyError({ status: 503 })).toBe(ErrorType.SERVER_ERROR);
  });

  it('should classify unknown errors', () => {
    expect(classifyError({ message: 'Unknown error' })).toBe(ErrorType.UNKNOWN);
  });
});

describe('isRetryable', () => {
  it('should identify retryable errors', () => {
    expect(isRetryable({ code: 'ECONNREFUSED' })).toBe(true);
    expect(isRetryable({ status: 429 })).toBe(true);
    expect(isRetryable({ status: 503 })).toBe(true);
  });

  it('should identify non-retryable errors', () => {
    expect(isRetryable({ status: 401 })).toBe(false);
    expect(isRetryable({ status: 400 })).toBe(false);
    expect(isRetryable({ status: 404 })).toBe(false);
  });
});

describe('calculateBackoffDelay', () => {
  it('should calculate exponential backoff', () => {
    expect(calculateBackoffDelay(0)).toBe(1000);
    expect(calculateBackoffDelay(1)).toBe(2000);
    expect(calculateBackoffDelay(2)).toBe(4000);
    expect(calculateBackoffDelay(3)).toBe(8000);
  });

  it('should respect max delay', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, maxDelayMs: 5000 };
    expect(calculateBackoffDelay(10, config)).toBe(5000);
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const promise = retryWithBackoff(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, {
      ...DEFAULT_RETRY_CONFIG,
      initialDelayMs: 100,
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 401 });

    const promise = retryWithBackoff(fn);

    await expect(promise).rejects.toEqual({ status: 401 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should fail after max retries', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 503 });

    const promise = retryWithBackoff(fn, {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 2,
      initialDelayMs: 100,
    });

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toEqual({ status: 503 });
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should call onRetry callback', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue('success');

    const onRetry = vi.fn();

    const promise = retryWithBackoff(
      fn,
      {
        ...DEFAULT_RETRY_CONFIG,
        initialDelayMs: 100,
      },
      onRetry
    );

    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledWith(1, { status: 503 });
  });
});

describe('handleGoogleCalendarError', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on success', async () => {
    const fn = vi.fn().mockResolvedValue('calendar data');

    const promise = handleGoogleCalendarError(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('calendar data');
  });

  it('should return fallback value on error', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 503 });

    const promise = handleGoogleCalendarError(fn, 'fallback data');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('fallback data');
  });

  it('should throw wrapped error without fallback', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 503 });

    const promise = handleGoogleCalendarError(fn);
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Google Calendar operation failed');
  });
});

describe('handleNotificationDelivery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return success result', async () => {
    const fn = vi.fn().mockResolvedValue('delivered');

    const promise = handleNotificationDelivery(fn, 'sms');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.result).toBe('delivered');
  });

  it('should return error on failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Delivery failed'));

    const promise = handleNotificationDelivery(fn, 'email');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to deliver email');
  });
});

describe('handleTranscription', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return transcript on success', async () => {
    const fn = vi.fn().mockResolvedValue('transcribed text');

    const promise = handleTranscription(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.transcript).toBe('transcribed text');
  });

  it('should return error with manual entry message', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Transcription failed'));

    const promise = handleTranscription(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('Please enter text manually');
  });
});

describe('handleNLPOperation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on success', async () => {
    const fn = vi.fn().mockResolvedValue({ entities: ['test'] });

    const promise = handleNLPOperation(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ entities: ['test'] });
  });

  it('should return fallback value on error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('NLP failed'));

    const promise = handleNLPOperation(fn, { entities: [] });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ entities: [] });
  });

  it('should return error without fallback', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('NLP failed'));

    const promise = handleNLPOperation(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('Please provide information manually');
  });
});

describe('handleDatabaseOperation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on success', async () => {
    const fn = vi.fn().mockResolvedValue({ id: 1 });

    const promise = handleDatabaseOperation(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ id: 1 });
  });

  it('should throw wrapped error on failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('DB error'));

    const promise = handleDatabaseOperation(fn);
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Database operation failed');
  });
});

describe('CircuitBreaker', () => {
  it('should allow execution when closed', async () => {
    const breaker = new CircuitBreaker(3, 1000);
    const fn = vi.fn().mockResolvedValue('success');

    const result = await breaker.execute(fn);

    expect(result).toBe('success');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should open after threshold failures', async () => {
    const breaker = new CircuitBreaker(3, 1000);
    const fn = vi.fn().mockRejectedValue(new Error('failure'));

    // Fail 3 times to reach threshold
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow('failure');
    }

    expect(breaker.getState()).toBe('OPEN');

    // Next call should fail immediately
    await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is OPEN');
  });

  it('should transition to half-open after timeout', async () => {
    vi.useFakeTimers();

    const breaker = new CircuitBreaker(2, 1000);
    const fn = vi.fn().mockRejectedValue(new Error('failure'));

    // Open the circuit
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.getState()).toBe('OPEN');

    // Advance time past reset timeout
    vi.advanceTimersByTime(1100);

    // Should transition to half-open and allow execution
    fn.mockResolvedValue('success');
    const result = await breaker.execute(fn);

    expect(result).toBe('success');
    expect(breaker.getState()).toBe('CLOSED');

    vi.useRealTimers();
  });

  it('should reset circuit', async () => {
    const breaker = new CircuitBreaker(2, 1000);
    const fn = vi.fn().mockRejectedValue(new Error('failure'));

    // Open the circuit
    await expect(breaker.execute(fn)).rejects.toThrow();
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.getState()).toBe('OPEN');

    // Reset
    breaker.reset();
    expect(breaker.getState()).toBe('CLOSED');

    // Should allow execution again
    fn.mockResolvedValue('success');
    const result = await breaker.execute(fn);
    expect(result).toBe('success');
  });
});
