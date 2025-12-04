/**
 * Tests for Google SSO Configuration Validator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateGoogleSSOConfig,
  getGoogleSSOConfig,
  logConfigurationStatus,
} from './google-sso-config-validator';

describe('Google SSO Configuration Validator', () => {
  // Store original environment variables
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('validateGoogleSSOConfig', () => {
    it('should return valid when all required variables are set correctly', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when GOOGLE_CLIENT_ID is missing', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Missing required environment variable: GOOGLE_CLIENT_ID'
      );
    });

    it('should return error when GOOGLE_CLIENT_SECRET is missing', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      delete process.env.GOOGLE_CLIENT_SECRET;
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Missing required environment variable: GOOGLE_CLIENT_SECRET'
      );
    });

    it('should return error when GOOGLE_REDIRECT_URI is missing', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      delete process.env.GOOGLE_REDIRECT_URI;

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Missing required environment variable: GOOGLE_REDIRECT_URI'
      );
    });

    it('should return error when environment variable is empty string', () => {
      process.env.GOOGLE_CLIENT_ID = '   ';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Environment variable GOOGLE_CLIENT_ID is empty');
    });

    it('should return warning when client ID does not match expected format', () => {
      process.env.GOOGLE_CLIENT_ID = 'invalid-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('does not match expected format'))).toBe(
        true
      );
    });

    it('should return warning when client secret is too short', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'short';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('appears to be too short'))).toBe(true);
    });

    it('should return error when redirect URI is not a valid URL', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'not-a-valid-url';

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('not a valid URL'))).toBe(true);
    });

    it('should return error when redirect URI uses invalid protocol', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'ftp://localhost:3000/callback';

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('must use http or https protocol'))).toBe(
        true
      );
    });

    it('should return warning when using http in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://example.com/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('uses http protocol in production'))).toBe(
        true
      );
    });

    it('should return error when using localhost in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'https://localhost:3000/api/auth/google/callback';

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('points to localhost in production'))).toBe(
        true
      );
    });

    it('should return warning when redirect URI path does not contain callback', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/redirect';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('does not contain "/callback"'))).toBe(
        true
      );
    });

    it('should return error when JWT_SECRET is missing', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      delete process.env.JWT_SECRET;

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing JWT_SECRET'))).toBe(true);
    });

    it('should return warning when JWT_SECRET is too short', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'short';
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('JWT_SECRET is shorter'))).toBe(true);
    });

    it('should return error when ENCRYPTION_KEY is missing', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      delete process.env.ENCRYPTION_KEY;

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing ENCRYPTION_KEY'))).toBe(true);
    });

    it('should return warning when ENCRYPTION_KEY is too short', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'short';

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('ENCRYPTION_KEY is shorter'))).toBe(true);
    });

    it('should return warning when TEST_MODE is enabled in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.TEST_MODE = 'true';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'https://example.com/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      const result = validateGoogleSSOConfig();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('TEST_MODE is enabled in production'))).toBe(
        true
      );
    });
  });

  describe('getGoogleSSOConfig', () => {
    it('should return configuration object when valid', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.TEST_MODE = 'true';

      const config = getGoogleSSOConfig();

      expect(config.clientId).toBe('123456789.apps.googleusercontent.com');
      expect(config.clientSecret).toBe('GOCSPX-abcdefghijklmnopqrstuvwxyz');
      expect(config.redirectUri).toBe('http://localhost:3000/api/auth/google/callback');
      expect(config.testMode).toBe(true);
    });

    it('should throw error when configuration is invalid', () => {
      delete process.env.GOOGLE_CLIENT_ID;

      expect(() => getGoogleSSOConfig()).toThrow('Invalid Google SSO configuration');
    });

    it('should set testMode to false when TEST_MODE is not set', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      delete process.env.TEST_MODE;

      const config = getGoogleSSOConfig();

      expect(config.testMode).toBe(false);
    });
  });

  describe('logConfigurationStatus', () => {
    it('should not throw when logging valid configuration', () => {
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      const result = validateGoogleSSOConfig();

      expect(() => logConfigurationStatus(result)).not.toThrow();
    });

    it('should not throw when logging invalid configuration', () => {
      delete process.env.GOOGLE_CLIENT_ID;

      const result = validateGoogleSSOConfig();

      expect(() => logConfigurationStatus(result)).not.toThrow();
    });
  });
});
