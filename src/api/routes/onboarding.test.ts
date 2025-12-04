import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
import { generateToken } from '../middleware/auth';

describe('Onboarding API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-123';
  let authToken: string;

  beforeEach(() => {
    authToken = generateToken(testUserId);
  });

  describe('POST /api/onboarding/initialize', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/onboarding/initialize')
        .send({ trigger: 'new_user' });

      expect(response.status).toBe(401);
    });

    it('should validate trigger type', async () => {
      const response = await request(app)
        .post('/api/onboarding/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ trigger: 'invalid_trigger' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid trigger type');
    });

    it('should accept valid trigger types', async () => {
      const validTriggers = ['new_user', 'post_import', 'manage'];
      
      for (const trigger of validTriggers) {
        const response = await request(app)
          .post('/api/onboarding/initialize')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ trigger });

        // Should not return 400 for valid triggers
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('GET /api/onboarding/state', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/onboarding/state');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/onboarding/progress', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/onboarding/progress')
        .send({ step: 'welcome' });

      expect(response.status).toBe(401);
    });

    it('should validate step parameter', async () => {
      const response = await request(app)
        .put('/api/onboarding/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ step: 'invalid_step' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid step');
    });

    it('should accept valid steps', async () => {
      const validSteps = [
        'welcome',
        'import_contacts',
        'circle_assignment',
        'preference_setting',
        'group_overlay',
        'completion'
      ];

      for (const step of validSteps) {
        const response = await request(app)
          .put('/api/onboarding/progress')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ step });

        // Should not return 400 for valid steps
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('POST /api/onboarding/complete', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/onboarding/complete');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/onboarding/uncategorized', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/onboarding/uncategorized');

      expect(response.status).toBe(401);
    });
  });
});
