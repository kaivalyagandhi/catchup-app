/**
 * Google SSO Error Handler Tests
 *
 * Tests for comprehensive error handling in Google SSO authentication
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import {
  GoogleSSOErrorHandler,
  ErrorSeverity,
  getGoogleSSOErrorHandler,
  googleSSOErrorHandler,
} from './google-sso-error-handler';
import { GoogleSSOError, GoogleSSOErrorCode } from './google-sso-service';

describe('GoogleSSOErrorHandler', () => {
  let handler: GoogleSSOErrorHandler;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Reset environment
    process.env.NODE_ENV = 'test';
    
    handler = new GoogleSSOErrorHandler();

    // Mock request
    mockReq = {
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      } as any,
    };

    // Mock response
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    // Suppress console output during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  describe('formatErrorResponse', () => {
    it('should format GoogleSSOError correctly', () => {
      const error = new GoogleSSOError(
        'Technical error message',
        GoogleSSOErrorCode.INVALID_TOKEN,
        'User-friendly message',
        401
      );

      const response = handler.formatErrorResponse(error);

      expect(response.error.code).toBe(GoogleSSOErrorCode.INVALID_TOKEN);
      expect(response.error.message).toBe('User-friendly message');
      expect(response.error.details).toBeUndefined(); // Not in test mode
    });

    it('should include details in development mode', () => {
      process.env.NODE_ENV = 'development';
      handler = new GoogleSSOErrorHandler();

      const error = new GoogleSSOError(
        'Technical error message',
        GoogleSSOErrorCode.INVALID_TOKEN,
        'User-friendly message',
        401
      );

      const response = handler.formatErrorResponse(error);

      expect(response.error.details).toBeDefined();
      expect(response.error.details.technicalMessage).toBe('Technical error message');
    });

    it('should handle non-GoogleSSOError errors', () => {
      const error = new Error('Generic error');

      const response = handler.formatErrorResponse(error);

      expect(response.error.code).toBe('INTERNAL_ERROR');
      expect(response.error.message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should include stack trace in development mode for generic errors', () => {
      process.env.NODE_ENV = 'development';
      handler = new GoogleSSOErrorHandler();

      const error = new Error('Generic error');

      const response = handler.formatErrorResponse(error);

      expect(response.error.details).toBeDefined();
      expect(response.error.details.stack).toBeDefined();
    });
  });

  describe('logError', () => {
    it('should create log entry with all fields', () => {
      const error = new GoogleSSOError(
        'Technical message',
        GoogleSSOErrorCode.INVALID_CODE,
        'User message',
        400
      );

      const context = { endpoint: '/callback' };
      const logEntry = handler.logError(error, mockReq as Request, context);

      expect(logEntry.timestamp).toBeInstanceOf(Date);
      expect(logEntry.errorCode).toBe(GoogleSSOErrorCode.INVALID_CODE);
      expect(logEntry.message).toBe('Technical message');
      expect(logEntry.userMessage).toBe('User message');
      expect(logEntry.statusCode).toBe(400);
      expect(logEntry.ipAddress).toBe('127.0.0.1');
      expect(logEntry.userAgent).toBe('test-agent');
      expect(logEntry.context).toEqual(context);
    });

    it('should log CRITICAL errors with console.error', () => {
      const error = new GoogleSSOError(
        'State mismatch',
        GoogleSSOErrorCode.STATE_MISMATCH,
        'Security validation failed',
        400
      );

      handler.logError(error, mockReq as Request);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[CRITICAL]'),
        expect.any(Object)
      );
    });

    it('should log HIGH errors with console.error', () => {
      const error = new GoogleSSOError(
        'User creation failed',
        GoogleSSOErrorCode.USER_CREATION_FAILED,
        'Failed to create account',
        500
      );

      handler.logError(error, mockReq as Request);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[HIGH]'),
        expect.any(Object)
      );
    });

    it('should log MEDIUM errors with console.warn', () => {
      const error = new GoogleSSOError(
        'Token exchange failed',
        GoogleSSOErrorCode.TOKEN_EXCHANGE_FAILED,
        'Failed to complete authentication',
        500
      );

      handler.logError(error, mockReq as Request);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[MEDIUM]'),
        expect.any(Object)
      );
    });

    it('should log LOW errors with console.info', () => {
      const error = new GoogleSSOError(
        'Invalid code',
        GoogleSSOErrorCode.INVALID_CODE,
        'Invalid authentication code',
        400
      );

      handler.logError(error, mockReq as Request);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[LOW]'),
        expect.any(Object)
      );
    });

    it('should extract user ID from authenticated request', () => {
      const reqWithUser = {
        ...mockReq,
        userId: 'user-123',
      };

      const error = new GoogleSSOError(
        'Error',
        GoogleSSOErrorCode.INVALID_TOKEN,
        'Invalid token',
        401
      );

      const logEntry = handler.logError(error, reqWithUser as Request);

      expect(logEntry.userId).toBe('user-123');
    });

    it('should handle missing request gracefully', () => {
      const error = new GoogleSSOError(
        'Error',
        GoogleSSOErrorCode.INVALID_TOKEN,
        'Invalid token',
        401
      );

      const logEntry = handler.logError(error);

      expect(logEntry.ipAddress).toBeUndefined();
      expect(logEntry.userAgent).toBeUndefined();
    });
  });

  describe('isRetryableError', () => {
    it('should identify TOKEN_EXCHANGE_FAILED as retryable', () => {
      const error = new GoogleSSOError(
        'Token exchange failed',
        GoogleSSOErrorCode.TOKEN_EXCHANGE_FAILED,
        'Failed to complete authentication',
        500
      );

      expect(handler.isRetryableError(error)).toBe(true);
    });

    it('should identify TOKEN_EXPIRED as retryable', () => {
      const error = new GoogleSSOError(
        'Token expired',
        GoogleSSOErrorCode.TOKEN_EXPIRED,
        'Authentication session expired',
        401
      );

      expect(handler.isRetryableError(error)).toBe(true);
    });

    it('should identify STATE_MISMATCH as not retryable', () => {
      const error = new GoogleSSOError(
        'State mismatch',
        GoogleSSOErrorCode.STATE_MISMATCH,
        'Security validation failed',
        400
      );

      expect(handler.isRetryableError(error)).toBe(false);
    });

    it('should return false for non-GoogleSSOError', () => {
      const error = new Error('Generic error');

      expect(handler.isRetryableError(error)).toBe(false);
    });
  });

  describe('isSecurityEvent', () => {
    it('should identify STATE_MISMATCH as security event', () => {
      const error = new GoogleSSOError(
        'State mismatch',
        GoogleSSOErrorCode.STATE_MISMATCH,
        'Security validation failed',
        400
      );

      expect(handler.isSecurityEvent(error)).toBe(true);
    });

    it('should identify SIGNATURE_VERIFICATION_FAILED as security event', () => {
      const error = new GoogleSSOError(
        'Signature verification failed',
        GoogleSSOErrorCode.SIGNATURE_VERIFICATION_FAILED,
        'Token signature verification failed',
        401
      );

      expect(handler.isSecurityEvent(error)).toBe(true);
    });

    it('should identify INVALID_TOKEN as security event', () => {
      const error = new GoogleSSOError(
        'Invalid token',
        GoogleSSOErrorCode.INVALID_TOKEN,
        'Invalid authentication token',
        401
      );

      expect(handler.isSecurityEvent(error)).toBe(true);
    });

    it('should not identify INVALID_CODE as security event', () => {
      const error = new GoogleSSOError(
        'Invalid code',
        GoogleSSOErrorCode.INVALID_CODE,
        'Invalid authentication code',
        400
      );

      expect(handler.isSecurityEvent(error)).toBe(false);
    });

    it('should return false for non-GoogleSSOError', () => {
      const error = new Error('Generic error');

      expect(handler.isSecurityEvent(error)).toBe(false);
    });
  });

  describe('getErrorMessageWithGuidance', () => {
    it('should add retry guidance for retryable errors', () => {
      const error = new GoogleSSOError(
        'Token exchange failed',
        GoogleSSOErrorCode.TOKEN_EXCHANGE_FAILED,
        'Failed to complete authentication. Please try again.',
        500
      );

      const message = handler.getErrorMessageWithGuidance(error);

      expect(message).toContain('Failed to complete authentication');
      expect(message).toContain('If the problem persists');
    });

    it('should add security guidance for security events', () => {
      const error = new GoogleSSOError(
        'State mismatch',
        GoogleSSOErrorCode.STATE_MISMATCH,
        'Security validation failed. Please try again.',
        400
      );

      const message = handler.getErrorMessageWithGuidance(error);

      expect(message).toContain('Security validation failed');
      expect(message).toContain('For your security');
    });

    it('should return basic message for non-retryable, non-security errors', () => {
      const error = new GoogleSSOError(
        'Email conflict',
        GoogleSSOErrorCode.EMAIL_CONFLICT,
        'An account with this email already exists.',
        400
      );

      const message = handler.getErrorMessageWithGuidance(error);

      expect(message).toBe('An account with this email already exists.');
    });

    it('should handle non-GoogleSSOError', () => {
      const error = new Error('Generic error');

      const message = handler.getErrorMessageWithGuidance(error);

      expect(message).toContain('unexpected error');
    });
  });

  describe('createError', () => {
    it('should create error and log it', () => {
      const error = handler.createError(
        'Technical message',
        GoogleSSOErrorCode.INVALID_TOKEN,
        'User message',
        401,
        mockReq as Request,
        { endpoint: '/callback' }
      );

      expect(error).toBeInstanceOf(GoogleSSOError);
      expect(error.code).toBe(GoogleSSOErrorCode.INVALID_TOKEN);
      expect(error.message).toBe('Technical message');
      expect(error.userMessage).toBe('User message');
      expect(error.statusCode).toBe(401);
      expect(console.warn).toHaveBeenCalled(); // MEDIUM severity
    });
  });

  describe('middleware', () => {
    it('should handle GoogleSSOError', () => {
      const error = new GoogleSSOError(
        'Technical message',
        GoogleSSOErrorCode.INVALID_TOKEN,
        'User message',
        401
      );

      const middleware = handler.middleware();
      const next = vi.fn();

      middleware(error, mockReq as Request, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: GoogleSSOErrorCode.INVALID_TOKEN,
            message: 'User message',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass non-GoogleSSOError to next middleware', () => {
      const error = new Error('Generic error');

      const middleware = handler.middleware();
      const next = vi.fn();

      middleware(error, mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('singleton', () => {
    it('should return same instance from getGoogleSSOErrorHandler', () => {
      const instance1 = getGoogleSSOErrorHandler();
      const instance2 = getGoogleSSOErrorHandler();

      expect(instance1).toBe(instance2);
    });

    it('should provide convenience functions', () => {
      const error = new GoogleSSOError(
        'Technical message',
        GoogleSSOErrorCode.INVALID_TOKEN,
        'User message',
        401
      );

      const formatted = googleSSOErrorHandler.formatError(error);
      expect(formatted.error.code).toBe(GoogleSSOErrorCode.INVALID_TOKEN);

      const isRetryable = googleSSOErrorHandler.isRetryable(error);
      expect(isRetryable).toBe(false);

      const isSecurityEvent = googleSSOErrorHandler.isSecurityEvent(error);
      expect(isSecurityEvent).toBe(true);

      const messageWithGuidance = googleSSOErrorHandler.getMessageWithGuidance(error);
      expect(messageWithGuidance).toContain('User message');
    });
  });

  describe('IP address extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const req = {
        ...mockReq,
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      };

      const error = new GoogleSSOError(
        'Error',
        GoogleSSOErrorCode.INVALID_TOKEN,
        'Invalid token',
        401
      );

      const logEntry = handler.logError(error, req as Request);

      expect(logEntry.ipAddress).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const req = {
        ...mockReq,
        headers: {
          'x-real-ip': '192.168.1.1',
        },
      };

      const error = new GoogleSSOError(
        'Error',
        GoogleSSOErrorCode.INVALID_TOKEN,
        'Invalid token',
        401
      );

      const logEntry = handler.logError(error, req as Request);

      expect(logEntry.ipAddress).toBe('192.168.1.1');
    });

    it('should fall back to socket.remoteAddress', () => {
      const error = new GoogleSSOError(
        'Error',
        GoogleSSOErrorCode.INVALID_TOKEN,
        'Invalid token',
        401
      );

      const logEntry = handler.logError(error, mockReq as Request);

      expect(logEntry.ipAddress).toBe('127.0.0.1');
    });
  });
});
