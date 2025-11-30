import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
import { generateToken } from '../middleware/auth';

describe('AI Suggestions API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-123';
  let authToken: string;

  beforeEach(() => {
    authToken = generateToken(testUserId);
  });

  describe('POST /api/ai/suggest-circle', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/suggest-circle')
        .send({ contactId: 'contact-123' });

      expect(response.status).toBe(401);
    });

    it('should validate contactId', async () => {
      const response = await request(app)
        .post('/api/ai/suggest-circle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('contactId is required');
    });
  });

  describe('POST /api/ai/batch-suggest', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/batch-suggest')
        .send({ contactIds: [] });

      expect(response.status).toBe(401);
    });

    it('should validate contactIds array', async () => {
      const response = await request(app)
        .post('/api/ai/batch-suggest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('contactIds array is required');
    });

    it('should reject empty contactIds array', async () => {
      const response = await request(app)
        .post('/api/ai/batch-suggest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot be empty');
    });

    it('should enforce batch size limit', async () => {
      const largeArray = Array(101).fill('contact-id');
      const response = await request(app)
        .post('/api/ai/batch-suggest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: largeArray });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot exceed');
    });
  });

  describe('POST /api/ai/record-override', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/record-override')
        .send({
          contactId: 'contact-123',
          suggestedCircle: 'inner',
          actualCircle: 'close'
        });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/ai/record-override')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactId: 'contact-123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('suggestedCircle is required');
    });

    it('should validate circle values', async () => {
      const response = await request(app)
        .post('/api/ai/record-override')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactId: 'contact-123',
          suggestedCircle: 'invalid',
          actualCircle: 'close'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid suggestedCircle');
    });
  });

  describe('POST /api/ai/improve-model', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/improve-model');

      expect(response.status).toBe(401);
    });
  });
});
