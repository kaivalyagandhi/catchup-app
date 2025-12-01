/**
 * Tests for SMS/MMS Error Handler
 *
 * Tests error classification, retry logic, logging, and user notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SMSErrorType,
  SMSProcessingError,
  isRecoverableError,
  classifyError,
  calculateBackoffDelay,
  retryWithBackoff,
  processWithErrorHandling,
  notifyUserOfFailure,
  ErrorContext,
  DEFAULT_RETRY_CONFIG,
} from './sms-error-handler';

describe('SMS Error Handler', () => {
  describe('Error Classification', () => {
    it('should classify network timeout errors as recoverable', () => {
      const error = new Error('Connection timeout');
      error.code = 'ETIMEDOUT';
      const errorType = classifyError(error);
      expect(errorType).toBe(SMSErrorType.NETWORK_TIMEOUT);
      expect(isRecoverableError(errorType)).toBe(true);
    });

    it('should classify service unavailable errors as recoverable', () => {
      const error: any = new Error('Service temporarily unavailable');
      error.status = 503;
      const errorType = classifyError(error);
      expect(errorType).toBe(SMSErrorType.SERVICE_UNAVAILABLE);
      expect(isRecoverableError(errorType)).toBe(true);
    });

    it('should classify rate limit errors as recoverable', () => {
      const error: any = new Error('Too many requests');
      error.status = 429;
      const errorType = classifyError(error);
      expect(errorType).toBe(SMSErrorType.RATE_LIMIT_EXTERNAL);
      expect(isRecoverableError(errorType)).toBe(true);
    });

    it('should classify authentication errors as unrecoverable', () => {
      const error: any = new Error('Authentication failed');
      error.status = 401;
      const errorType = classifyError(error);
      expect(errorType).toBe(SMSErrorType.AUTHENTICATION_FAILED);
      expect(isRecoverableError(errorType)).toBe(false);
    });

    it('should classify malformed media errors as unrecoverable', () => {
      const error = new Error('Malformed media file');
      const errorType = classifyError(error);
      expect(errorType).toBe(SMSErrorType.MALFORMED_MEDIA);
      expect(isRecoverableError(errorType)).toBe(false);
    });

    it('should classify unsupported media type errors as unrecoverable', () => {
      const error = new Error('Unsupported media type');
      const errorType = classifyError(error);
      expect(errorType).toBe(SMSErrorType.UNSUPPORTED_MEDIA_TYPE);
      expect(isRecoverableError(errorType)).toBe(false);
    });

    it('should classify quota exceeded errors as unrecoverable', () => {
      const error = new Error('Quota exceeded');
      const errorType = classifyError(error);
      expect(errorType).toBe(SMSErrorType.QUOTA_EXCEEDED);
      expect(isRecoverableError(errorType)).toBe(false);
    });

    it('should classify media size exceeded errors as unrecoverable', () => {
      const error = new Error('File size exceeds limit');
      const errorType = classifyError(error);
      expect(errorType).toBe(SMSErrorType.MEDIA_SIZE_EXCEEDED);
      expect(isRecoverableError(errorType)).toBe(false);
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate correct backoff delays', () => {
      const config = DEFAULT_RETRY_CONFIG;

      // First retry: 1000ms * 2^0 = 1000ms
      expect(calculateBackoffDelay(0, config)).toBe(1000);

      // Second retry: 1000ms * 2^1 = 2000ms
      expect(calculateBackoffDelay(1, config)).toBe(2000);

      // Third retry: 1000ms * 2^2 = 4000ms
      expect(calculateBackoffDelay(2, config)).toBe(4000);
    });

    it('should cap backoff delay at maxDelayMs', () => {
      const config = DEFAULT_RETRY_CONFIG;

      // Large attempt number should be capped at 10000ms
      expect(calculateBackoffDelay(10, config)).toBe(10000);
      expect(calculateBackoffDelay(20, config)).toBe(10000);
    });
  });

  describe('Retry Logic', () => {
    let mockFn: ReturnType<typeof vi.fn>;
    let context: ErrorContext;

    beforeEach(() => {
      mockFn = vi.fn();
      context = {
        userId: 'user-123',
        phoneNumber: '+15555551234',
        messageSid: 'MM123',
        messageType: 'sms',
        contentType: 'text',
        timestamp: new Date(),
      };
    });

    it('should succeed on first attempt if no error', async () => {
      mockFn.mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, context, {
        ...DEFAULT_RETRY_CONFIG,
        maxAttempts: 3,
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry recoverable errors up to max attempts', async () => {
      const recoverableError: any = new Error('Network timeout');
      recoverableError.code = 'ETIMEDOUT';

      mockFn
        .mockRejectedValueOnce(recoverableError)
        .mockRejectedValueOnce(recoverableError)
        .mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, context, {
        ...DEFAULT_RETRY_CONFIG,
        maxAttempts: 3,
        initialDelayMs: 10, // Speed up test
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry unrecoverable errors', async () => {
      const unrecoverableError: any = new Error('Authentication failed');
      unrecoverableError.status = 401;

      mockFn.mockRejectedValue(unrecoverableError);

      await expect(
        retryWithBackoff(mockFn, context, {
          ...DEFAULT_RETRY_CONFIG,
          maxAttempts: 3,
        })
      ).rejects.toThrow(SMSProcessingError);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw after exhausting all retries', async () => {
      const recoverableError: any = new Error('Network timeout');
      recoverableError.code = 'ETIMEDOUT';

      mockFn.mockRejectedValue(recoverableError);

      await expect(
        retryWithBackoff(mockFn, context, {
          ...DEFAULT_RETRY_CONFIG,
          maxAttempts: 3,
          initialDelayMs: 10, // Speed up test
        })
      ).rejects.toThrow(SMSProcessingError);

      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('Process with Error Handling', () => {
    let mockFn: ReturnType<typeof vi.fn>;
    let context: ErrorContext;

    beforeEach(() => {
      mockFn = vi.fn();
      context = {
        userId: 'user-123',
        phoneNumber: '+15555551234',
        messageSid: 'MM123',
        messageType: 'sms',
        contentType: 'text',
        timestamp: new Date(),
      };
    });

    it('should return success result when function succeeds', async () => {
      mockFn.mockResolvedValue('success');

      const result = await processWithErrorHandling(mockFn, context, {
        ...DEFAULT_RETRY_CONFIG,
        maxAttempts: 3,
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('should return error result when all retries fail', async () => {
      const recoverableError: any = new Error('Network timeout');
      recoverableError.code = 'ETIMEDOUT';

      mockFn.mockRejectedValue(recoverableError);

      const result = await processWithErrorHandling(mockFn, context, {
        ...DEFAULT_RETRY_CONFIG,
        maxAttempts: 3,
        initialDelayMs: 10, // Speed up test
      });

      expect(result.success).toBe(false);
      expect(result.result).toBeUndefined();
      expect(result.error).toBeInstanceOf(SMSProcessingError);
      expect(result.error?.errorType).toBe(SMSErrorType.NETWORK_TIMEOUT);
    });

    it('should return error result for unrecoverable errors', async () => {
      const unrecoverableError: any = new Error('Malformed media');
      mockFn.mockRejectedValue(unrecoverableError);

      const result = await processWithErrorHandling(mockFn, context, {
        ...DEFAULT_RETRY_CONFIG,
        maxAttempts: 3,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(SMSProcessingError);
      expect(result.error?.errorType).toBe(SMSErrorType.MALFORMED_MEDIA);
      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Error Context', () => {
    it('should include all required context fields', () => {
      const context: ErrorContext = {
        userId: 'user-123',
        phoneNumber: '+15555551234',
        messageSid: 'MM123',
        messageType: 'mms',
        contentType: 'audio',
        mediaUrl: 'https://example.com/audio.ogg',
        attemptNumber: 2,
        timestamp: new Date(),
        errorDetails: { foo: 'bar' },
      };

      expect(context.userId).toBe('user-123');
      expect(context.phoneNumber).toBe('+15555551234');
      expect(context.messageSid).toBe('MM123');
      expect(context.messageType).toBe('mms');
      expect(context.contentType).toBe('audio');
      expect(context.mediaUrl).toBe('https://example.com/audio.ogg');
      expect(context.attemptNumber).toBe(2);
      expect(context.errorDetails).toEqual({ foo: 'bar' });
    });
  });

  describe('SMSProcessingError', () => {
    it('should correctly identify recoverable errors', () => {
      const context: ErrorContext = {
        userId: 'user-123',
        timestamp: new Date(),
      };

      const recoverableError = new SMSProcessingError(
        'Network timeout',
        SMSErrorType.NETWORK_TIMEOUT,
        context
      );

      expect(recoverableError.isRecoverable()).toBe(true);
    });

    it('should correctly identify unrecoverable errors', () => {
      const context: ErrorContext = {
        userId: 'user-123',
        timestamp: new Date(),
      };

      const unrecoverableError = new SMSProcessingError(
        'Authentication failed',
        SMSErrorType.AUTHENTICATION_FAILED,
        context
      );

      expect(unrecoverableError.isRecoverable()).toBe(false);
    });

    it('should preserve original error', () => {
      const context: ErrorContext = {
        userId: 'user-123',
        timestamp: new Date(),
      };

      const originalError = new Error('Original error message');
      const smsError = new SMSProcessingError(
        'Wrapped error',
        SMSErrorType.NETWORK_TIMEOUT,
        context,
        originalError
      );

      expect(smsError.originalError).toBe(originalError);
    });
  });
});
