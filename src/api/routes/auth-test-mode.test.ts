/**
 * Auth Routes Test Mode Integration Tests
 * 
 * Tests that email/password authentication endpoints are properly protected by test mode middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import authRouter from './auth';

describe('Auth Routes with Test Mode', () => {
  let app: Express;
  let originalTestMode: string | undefined;

  beforeEach(() => {
    // Save original TEST_MODE value
    originalTestMode = process.env.TEST_MODE;

    // Create Express app with auth routes
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
  });

  afterEach(() => {
    // Restore original TEST_MODE value
    if (originalTestMode !== undefined) {
      process.env.TEST_MODE = originalTestMode;
    } else {
      delete process.env.TEST_MODE;
    }
  });

  describe('GET /api/auth/test-mode', () => {
    it('should return enabled status when TEST_MODE is true', async () => {
      process.env.TEST_MODE = 'true';

      const response = await request(app).get('/api/auth/test-mode');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        enabled: true,
        message: 'Test mode is enabled. Both Google SSO and email/password authentication are available.',
      });
    });

    it('should return disabled status when TEST_MODE is false', async () => {
      process.env.TEST_MODE = 'false';

      const response = await request(app).get('/api/auth/test-mode');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        enabled: false,
        message: 'Test mode is disabled. Only Google SSO authentication is available.',
      });
    });

    it('should return disabled status when TEST_MODE is not set', async () => {
      delete process.env.TEST_MODE;

      const response = await request(app).get('/api/auth/test-mode');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        enabled: false,
        message: 'Test mode is disabled. Only Google SSO authentication is available.',
      });
    });
  });

  describe('POST /api/auth/register', () => {
    it('should allow registration when TEST_MODE is enabled', async () => {
      process.env.TEST_MODE = 'true';

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      // We expect it to fail with validation error (no database), but not with test mode error
      expect(response.status).not.toBe(403);
      expect(response.body.error?.code).not.toBe('TEST_MODE_DISABLED');
    });

    it('should block registration when TEST_MODE is disabled', async () => {
      process.env.TEST_MODE = 'false';

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: {
          code: 'TEST_MODE_DISABLED',
          message: 'Email/password authentication is only available in test mode. Please use Google Sign-In.',
          testMode: false,
        },
      });
    });

    it('should block registration when TEST_MODE is not set', async () => {
      delete process.env.TEST_MODE;

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: {
          code: 'TEST_MODE_DISABLED',
          message: 'Email/password authentication is only available in test mode. Please use Google Sign-In.',
          testMode: false,
        },
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should allow login when TEST_MODE is enabled', async () => {
      process.env.TEST_MODE = 'true';

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      // We expect it to fail with validation error (no database), but not with test mode error
      expect(response.status).not.toBe(403);
      expect(response.body.error?.code).not.toBe('TEST_MODE_DISABLED');
    });

    it('should block login when TEST_MODE is disabled', async () => {
      process.env.TEST_MODE = 'false';

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: {
          code: 'TEST_MODE_DISABLED',
          message: 'Email/password authentication is only available in test mode. Please use Google Sign-In.',
          testMode: false,
        },
      });
    });

    it('should block login when TEST_MODE is not set', async () => {
      delete process.env.TEST_MODE;

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: {
          code: 'TEST_MODE_DISABLED',
          message: 'Email/password authentication is only available in test mode. Please use Google Sign-In.',
          testMode: false,
        },
      });
    });
  });
});
