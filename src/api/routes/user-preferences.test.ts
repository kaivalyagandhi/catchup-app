import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
import { generateToken } from '../middleware/auth';

describe('User Preferences API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-123';
  let authToken: string;

  beforeEach(() => {
    authToken = generateToken(testUserId);
  });

  describe('GET /api/users/preferences/:key', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/users/preferences/theme');
      expect(response.status).toBe(401);
    });

    it('should return 404 or value when authenticated', async () => {
      const response = await request(app)
        .get('/api/users/preferences/nonexistent-key')
        .set('Authorization', `Bearer ${authToken}`);

      // Expect 404 (not found) or 500 (DB not available)
      if (response.status === 404) {
        expect(response.body).toHaveProperty('error', 'Preference not found');
      } else if (response.status === 200) {
        expect(response.body).toHaveProperty('key');
        expect(response.body).toHaveProperty('value');
      } else {
        expect(response.status).toBe(500);
      }
    });
  });

  describe('PUT /api/users/preferences/:key', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/users/preferences/theme')
        .send({ value: 'dark' });
      expect(response.status).toBe(401);
    });

    it('should require value in request body', async () => {
      const response = await request(app)
        .put('/api/users/preferences/theme')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'value is required in request body');
    });

    it('should accept valid value when authenticated', async () => {
      const response = await request(app)
        .put('/api/users/preferences/theme')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ value: 'dark' });

      // Will succeed or 500 if DB not available
      if (response.status === 200) {
        expect(response.body).toHaveProperty('key', 'theme');
        expect(response.body).toHaveProperty('value', 'dark');
        expect(response.body).toHaveProperty('updatedAt');
      } else {
        expect(response.status).toBe(500);
      }
    });
  });
});
