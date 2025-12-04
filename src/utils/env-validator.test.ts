/**
 * Tests for Environment Variable Validator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateEnvironmentVariables,
  logValidationStatus,
} from './env-validator';

describe('Environment Variable Validator', () => {
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

  describe('validateEnvironmentVariables', () => {
    it('should return valid when all required variables are set correctly', () => {
      // Database
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';

      // Google OAuth
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

      // Security
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      // Redis
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when DATABASE_HOST is missing', () => {
      delete process.env.DATABASE_HOST;
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Missing required environment variable: DATABASE_HOST'
      );
    });

    it('should return error when DATABASE_PORT is invalid', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = 'invalid';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('DATABASE_PORT must be a valid port'))).toBe(
        true
      );
    });

    it('should return error when DATABASE_PORT is out of range', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '99999';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('DATABASE_PORT must be a valid port'))).toBe(
        true
      );
    });

    it('should return warning when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('NODE_ENV not set'))).toBe(true);
    });

    it('should return error when GOOGLE_CLIENT_ID is missing', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      delete process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Missing required environment variable: GOOGLE_CLIENT_ID'
      );
    });

    it('should return error when JWT_SECRET is missing', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      delete process.env.JWT_SECRET;
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing JWT_SECRET'))).toBe(true);
    });

    it('should return error when ENCRYPTION_KEY is missing', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      delete process.env.ENCRYPTION_KEY;
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing ENCRYPTION_KEY'))).toBe(true);
    });

    it('should return error when REDIS_HOST is missing', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      delete process.env.REDIS_HOST;
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Missing required environment variable: REDIS_HOST'
      );
    });

    it('should return error when REDIS_PORT is invalid', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = 'invalid';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('REDIS_PORT must be a valid port'))).toBe(
        true
      );
    });

    it('should return warning when GOOGLE_CLOUD_API_KEY and GOOGLE_APPLICATION_CREDENTIALS are missing', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      delete process.env.GOOGLE_CLOUD_API_KEY;

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('Voice transcription features will not work'))).toBe(
        true
      );
    });

    it('should return warning when GOOGLE_GEMINI_API_KEY is missing', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      delete process.env.GOOGLE_GEMINI_API_KEY;

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('AI-powered features'))).toBe(true);
    });

    it('should return warning when Twilio configuration is incomplete', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      delete process.env.TWILIO_ACCOUNT_SID;

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('SMS notification features'))).toBe(true);
    });

    it('should return warning when SendGrid configuration is incomplete', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      delete process.env.SENDGRID_API_KEY;

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('Email notification features'))).toBe(true);
    });

    it('should return error when environment variable is empty string', () => {
      process.env.DATABASE_HOST = '   ';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Environment variable DATABASE_HOST is empty');
    });

    it('should return warning when GOOGLE_REDIRECT_URI uses http in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://example.com/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('uses http protocol in production'))).toBe(
        true
      );
    });

    it('should return error when GOOGLE_REDIRECT_URI points to localhost in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'https://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('points to localhost in production'))).toBe(
        true
      );
    });
  });

  describe('logValidationStatus', () => {
    it('should not throw when logging valid configuration', () => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_NAME = 'catchup_db';
      process.env.DATABASE_USER = 'postgres';
      process.env.DATABASE_PASSWORD = 'password';
      process.env.GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-abcdefghijklmnopqrstuvwxyz';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';

      const result = validateEnvironmentVariables();

      expect(() => logValidationStatus(result)).not.toThrow();
    });

    it('should not throw when logging invalid configuration', () => {
      delete process.env.DATABASE_HOST;

      const result = validateEnvironmentVariables();

      expect(() => logValidationStatus(result)).not.toThrow();
    });
  });
});
