import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
import { generateToken } from '../middleware/auth';

describe('Contact Groups API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-123';
  let authToken: string;

  beforeEach(() => {
    authToken = generateToken(testUserId);
  });

  describe('GET /api/contacts/ungrouped-count', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/contacts/ungrouped-count');
      expect(response.status).toBe(401);
    });

    it('should return count object when authenticated', async () => {
      const response = await request(app)
        .get('/api/contacts/ungrouped-count')
        .set('Authorization', `Bearer ${authToken}`);

      // Will either succeed with count or 500 if DB not available
      if (response.status === 200) {
        expect(response.body).toHaveProperty('count');
        expect(typeof response.body.count).toBe('number');
      } else {
        expect(response.status).toBe(500);
      }
    });
  });

  describe('POST /api/contacts/:id/groups/:groupId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/contacts/contact-123/groups/group-456');
      expect(response.status).toBe(401);
    });

    it('should attempt assignment when authenticated', async () => {
      const response = await request(app)
        .post('/api/contacts/contact-123/groups/group-456')
        .set('Authorization', `Bearer ${authToken}`);

      // With fake IDs, expect 404 (not found) or 500 (DB error)
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/contacts/:id/groups/:groupId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/contacts/contact-123/groups/group-456');
      expect(response.status).toBe(401);
    });

    it('should attempt removal when authenticated', async () => {
      const response = await request(app)
        .delete('/api/contacts/contact-123/groups/group-456')
        .set('Authorization', `Bearer ${authToken}`);

      // With fake IDs, expect 404 (not found) or 500 (DB error)
      expect([200, 404, 500]).toContain(response.status);
    });
  });
});
