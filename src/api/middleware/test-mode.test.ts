/**
 * Test Mode Middleware Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  isTestModeEnabled,
  enforceTestMode,
  addTestModeIndicator,
  getTestModeStatus,
} from './test-mode';

describe('Test Mode Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let originalTestMode: string | undefined;

  beforeEach(() => {
    // Save original TEST_MODE value
    originalTestMode = process.env.TEST_MODE;

    // Create mock request, response, and next function
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    // Restore original TEST_MODE value
    if (originalTestMode !== undefined) {
      process.env.TEST_MODE = originalTestMode;
    } else {
      delete process.env.TEST_MODE;
    }
  });

  describe('isTestModeEnabled', () => {
    it('should return true when TEST_MODE is "true"', () => {
      process.env.TEST_MODE = 'true';
      expect(isTestModeEnabled()).toBe(true);
    });

    it('should return false when TEST_MODE is "false"', () => {
      process.env.TEST_MODE = 'false';
      expect(isTestModeEnabled()).toBe(false);
    });

    it('should return false when TEST_MODE is not set', () => {
      delete process.env.TEST_MODE;
      expect(isTestModeEnabled()).toBe(false);
    });

    it('should return false when TEST_MODE is any other value', () => {
      process.env.TEST_MODE = 'yes';
      expect(isTestModeEnabled()).toBe(false);

      process.env.TEST_MODE = '1';
      expect(isTestModeEnabled()).toBe(false);

      process.env.TEST_MODE = 'TRUE';
      expect(isTestModeEnabled()).toBe(false);
    });
  });

  describe('enforceTestMode', () => {
    it('should call next() when test mode is enabled', () => {
      process.env.TEST_MODE = 'true';

      enforceTestMode(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should block request when test mode is disabled', () => {
      process.env.TEST_MODE = 'false';

      enforceTestMode(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'TEST_MODE_DISABLED',
          message: 'Email/password authentication is only available in test mode. Please use Google Sign-In.',
          testMode: false,
        },
      });
    });

    it('should block request when TEST_MODE is not set', () => {
      delete process.env.TEST_MODE;

      enforceTestMode(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'TEST_MODE_DISABLED',
          message: 'Email/password authentication is only available in test mode. Please use Google Sign-In.',
          testMode: false,
        },
      });
    });
  });

  describe('addTestModeIndicator', () => {
    it('should add testMode: true to response when test mode is enabled', () => {
      process.env.TEST_MODE = 'true';
      
      const originalJsonSpy = vi.fn();
      mockRes.json = originalJsonSpy;

      addTestModeIndicator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Call the modified json method
      const jsonMethod = mockRes.json as any;
      jsonMethod({ message: 'test' });

      expect(originalJsonSpy).toHaveBeenCalledWith({
        message: 'test',
        testMode: true,
      });
    });

    it('should add testMode: false to response when test mode is disabled', () => {
      process.env.TEST_MODE = 'false';
      
      const originalJsonSpy = vi.fn();
      mockRes.json = originalJsonSpy;

      addTestModeIndicator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Call the modified json method
      const jsonMethod = mockRes.json as any;
      jsonMethod({ message: 'test' });

      expect(originalJsonSpy).toHaveBeenCalledWith({
        message: 'test',
        testMode: false,
      });
    });

    it('should preserve existing response data', () => {
      process.env.TEST_MODE = 'true';
      
      const originalJsonSpy = vi.fn();
      mockRes.json = originalJsonSpy;

      addTestModeIndicator(mockReq as Request, mockRes as Response, mockNext);

      const jsonMethod = mockRes.json as any;
      jsonMethod({
        user: { id: '123', email: 'test@example.com' },
        token: 'abc123',
      });

      expect(originalJsonSpy).toHaveBeenCalledWith({
        user: { id: '123', email: 'test@example.com' },
        token: 'abc123',
        testMode: true,
      });
    });
  });

  describe('getTestModeStatus', () => {
    it('should return enabled status when test mode is enabled', () => {
      process.env.TEST_MODE = 'true';

      const status = getTestModeStatus();

      expect(status).toEqual({
        enabled: true,
        message: 'Test mode is enabled. Both Google SSO and email/password authentication are available.',
      });
    });

    it('should return disabled status when test mode is disabled', () => {
      process.env.TEST_MODE = 'false';

      const status = getTestModeStatus();

      expect(status).toEqual({
        enabled: false,
        message: 'Test mode is disabled. Only Google SSO authentication is available.',
      });
    });

    it('should return disabled status when TEST_MODE is not set', () => {
      delete process.env.TEST_MODE;

      const status = getTestModeStatus();

      expect(status).toEqual({
        enabled: false,
        message: 'Test mode is disabled. Only Google SSO authentication is available.',
      });
    });
  });
});
