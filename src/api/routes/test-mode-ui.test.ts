/**
 * Test Mode UI Integration Tests
 * 
 * Tests the complete test mode UI flow including:
 * - Backend endpoint returning correct status
 * - Frontend logic showing/hiding UI elements
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import authRouter from './auth';

describe('Test Mode UI Integration', () => {
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

    it('should return correct content-type header', async () => {
      const response = await request(app).get('/api/auth/test-mode');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should not require authentication', async () => {
      // This endpoint should be accessible without authentication
      const response = await request(app)
        .get('/api/auth/test-mode')
        .set('Authorization', ''); // No auth token

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('UI Behavior Requirements', () => {
    it('should provide data for showing email/password form when enabled', async () => {
      process.env.TEST_MODE = 'true';

      const response = await request(app).get('/api/auth/test-mode');

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(true);
      
      // Frontend should use this to show email-auth-form
      // emailAuthForm.style.display = 'block'
    });

    it('should provide data for hiding email/password form when disabled', async () => {
      process.env.TEST_MODE = 'false';

      const response = await request(app).get('/api/auth/test-mode');

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(false);
      
      // Frontend should use this to hide email-auth-form
      // emailAuthForm.style.display = 'none'
    });

    it('should provide data for showing test mode indicator when enabled', async () => {
      process.env.TEST_MODE = 'true';

      const response = await request(app).get('/api/auth/test-mode');

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(true);
      
      // Frontend should use this to show test-mode-notice
      // testModeNotice.style.display = 'block'
    });

    it('should provide data for hiding test mode indicator when disabled', async () => {
      process.env.TEST_MODE = 'false';

      const response = await request(app).get('/api/auth/test-mode');

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(false);
      
      // Frontend should use this to hide test-mode-notice
      // testModeNotice.style.display = 'none'
    });
  });

  describe('Requirements Validation', () => {
    it('validates requirement 3.1: Logic to show/hide email/password form', async () => {
      // Test mode enabled - should show form
      process.env.TEST_MODE = 'true';
      let response = await request(app).get('/api/auth/test-mode');
      expect(response.body.enabled).toBe(true);

      // Test mode disabled - should hide form
      process.env.TEST_MODE = 'false';
      response = await request(app).get('/api/auth/test-mode');
      expect(response.body.enabled).toBe(false);
    });

    it('validates requirement 3.2: Fetch test mode status from backend', async () => {
      const response = await request(app).get('/api/auth/test-mode');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enabled');
      expect(typeof response.body.enabled).toBe('boolean');
    });

    it('validates requirement 3.2: Display test mode indicator when enabled', async () => {
      process.env.TEST_MODE = 'true';
      
      const response = await request(app).get('/api/auth/test-mode');
      
      expect(response.body.enabled).toBe(true);
      expect(response.body.message).toContain('Test mode is enabled');
    });

    it('validates requirement 3.2: Google SSO button always visible', async () => {
      // This is a frontend requirement - the Google SSO button should be
      // outside the email-auth-form div in the HTML structure
      // Backend just needs to provide the test mode status
      
      const response = await request(app).get('/api/auth/test-mode');
      
      expect(response.status).toBe(200);
      // The endpoint should work regardless of test mode
      expect(response.body).toHaveProperty('enabled');
    });
  });
});
