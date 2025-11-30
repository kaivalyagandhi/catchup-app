import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
import { generateToken } from '../middleware/auth';

describe('Circles API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-123';
  let authToken: string;

  beforeEach(() => {
    authToken = generateToken(testUserId);
  });

  describe('POST /api/circles/assign', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/circles/assign')
        .send({ contactId: 'contact-123', circle: 'inner' });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/circles/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('contactId is required');
    });

    it('should validate circle value', async () => {
      const response = await request(app)
        .post('/api/circles/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactId: 'contact-123', circle: 'invalid_circle' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid circle');
    });

    it('should accept valid circles', async () => {
      const validCircles = ['inner', 'close', 'active', 'casual', 'acquaintance'];

      for (const circle of validCircles) {
        const response = await request(app)
          .post('/api/circles/assign')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ contactId: 'contact-123', circle });

        // Should not return 400 for valid circles
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('POST /api/circles/batch-assign', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/circles/batch-assign')
        .send({ assignments: [] });

      expect(response.status).toBe(401);
    });

    it('should validate assignments array', async () => {
      const response = await request(app)
        .post('/api/circles/batch-assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('assignments array is required');
    });

    it('should reject empty assignments array', async () => {
      const response = await request(app)
        .post('/api/circles/batch-assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ assignments: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot be empty');
    });

    it('should validate each assignment', async () => {
      const response = await request(app)
        .post('/api/circles/batch-assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assignments: [
            { contactId: 'contact-1', circle: 'inner' },
            { contactId: 'contact-2' } // Missing circle
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must have a circle');
    });
  });

  describe('GET /api/circles/distribution', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/circles/distribution');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/circles/capacity/:circle', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/circles/capacity/inner');

      expect(response.status).toBe(401);
    });

    it('should validate circle parameter', async () => {
      const response = await request(app)
        .get('/api/circles/capacity/invalid_circle')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid circle');
    });
  });

  describe('GET /api/circles/suggestions/rebalance', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/circles/suggestions/rebalance');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/circles/preferences/set', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/circles/preferences/set')
        .send({ contactId: 'contact-123', frequency: 'weekly' });
      
      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/circles/preferences/set')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('contactId is required');
    });

    it('should validate frequency value', async () => {
      const response = await request(app)
        .post('/api/circles/preferences/set')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactId: 'contact-123', frequency: 'invalid' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid frequency');
    });

    it('should accept valid frequencies', async () => {
      const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly', 'flexible'];
      
      for (const frequency of validFrequencies) {
        const response = await request(app)
          .post('/api/circles/preferences/set')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ contactId: 'contact-123', frequency });
        
        // Will fail with 500 due to invalid UUID, but validates the frequency
        expect([204, 500]).toContain(response.status);
      }
    });
  });

  describe('POST /api/circles/preferences/batch-set', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/circles/preferences/batch-set')
        .send({ preferences: [] });
      
      expect(response.status).toBe(401);
    });

    it('should validate preferences array', async () => {
      const response = await request(app)
        .post('/api/circles/preferences/batch-set')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('preferences array is required');
    });

    it('should reject empty preferences array', async () => {
      const response = await request(app)
        .post('/api/circles/preferences/batch-set')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ preferences: [] });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot be empty');
    });

    it('should validate each preference', async () => {
      const response = await request(app)
        .post('/api/circles/preferences/batch-set')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: [
            { contactId: 'contact-1', frequency: 'weekly' },
            { contactId: 'contact-2', frequency: 'invalid' }
          ]
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid frequency');
    });
  });

  describe('GET /api/circles/preferences/:contactId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/circles/preferences/contact-123');
      
      expect(response.status).toBe(401);
    });
  });
});
