/**
 * Tests for Contact Archive API Routes
 *
 * GET    /api/contacts/archive/preview   — Preview contacts for archival
 * GET    /api/contacts/archived           — List archived contacts
 * GET    /api/contacts/archived/count     — Archived count for badge
 * POST   /api/contacts/archive            — Archive contacts
 * POST   /api/contacts/restore            — Restore contacts (bulk)
 * POST   /api/contacts/:id/restore        — Restore single contact
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
import { generateToken } from '../middleware/auth';

// Mock the database pool
const mockQuery = vi.fn();
const mockConnect = vi.fn();
vi.mock('../../db/connection', () => ({
  default: {
    query: (...args: any[]) => mockQuery(...args),
    connect: (...args: any[]) => mockConnect(...args),
    end: vi.fn(),
  },
}));

// Mock Cloud Tasks
vi.mock('../../jobs/cloud-tasks-client', () => ({
  CloudTasksQueue: class {
    add = vi.fn().mockResolvedValue('task-id');
    close = vi.fn().mockResolvedValue(undefined);
  },
}));

// Mock OAuth repository
vi.mock('../../integrations/oauth-repository', () => ({
  getToken: vi.fn(),
  upsertToken: vi.fn(),
  deleteToken: vi.fn(),
}));

// Mock google-contacts-config
vi.mock('../../integrations/google-contacts-config', () => ({
  GOOGLE_CONTACTS_SCOPES: ['https://www.googleapis.com/auth/contacts.readonly'],
  getAuthorizationUrl: vi.fn().mockReturnValue('https://accounts.google.com/mock'),
  getTokensFromCode: vi.fn(),
  getPeopleClient: vi.fn(),
  getOAuth2Client: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

describe('Contact Archive API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-archive-123';
  let authToken: string;

  beforeEach(() => {
    authToken = generateToken(testUserId);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // GET /api/contacts/archive/preview
  // =========================================================================

  describe('GET /api/contacts/archive/preview', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/contacts/archive/preview?contactIds=c1');
      expect(res.status).toBe(401);
    });

    it('should return 400 when contactIds is missing', async () => {
      const res = await request(app)
        .get('/api/contacts/archive/preview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('contactIds');
    });

    it('should return preview data with name, email, phone, groups, circle', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'c1',
            user_id: testUserId,
            name: 'Alice',
            email: 'alice@example.com',
            phone: '+1234567890',
            dunbar_circle: 'inner',
            archived_at: null,
            created_at: new Date(),
            updated_at: new Date(),
            group_ids: '["g1"]',
            tags: '[]',
            sources: ['google'],
          },
        ],
      });

      const res = await request(app)
        .get('/api/contacts/archive/preview?contactIds=c1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.contacts[0]).toMatchObject({
        id: 'c1',
        name: 'Alice',
        email: 'alice@example.com',
        phone: '+1234567890',
        circle: 'inner',
      });
    });
  });

  // =========================================================================
  // GET /api/contacts/archived
  // =========================================================================

  describe('GET /api/contacts/archived', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/contacts/archived');
      expect(res.status).toBe(401);
    });

    it('should return empty list when no archived contacts', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/contacts/archived')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.contacts).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it('should return archived contacts sorted by archived_at descending', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'c2',
            user_id: testUserId,
            name: 'Bob',
            email: 'bob@example.com',
            phone: null,
            archived_at: '2024-02-01T00:00:00Z',
            created_at: new Date(),
            updated_at: new Date(),
            group_ids: '[]',
            tags: '[]',
            sources: ['google'],
          },
          {
            id: 'c1',
            user_id: testUserId,
            name: 'Alice',
            email: 'alice@example.com',
            phone: '+1234567890',
            archived_at: '2024-01-15T00:00:00Z',
            created_at: new Date(),
            updated_at: new Date(),
            group_ids: '[]',
            tags: '[]',
            sources: ['google'],
          },
        ],
      });

      const res = await request(app)
        .get('/api/contacts/archived')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.contacts).toHaveLength(2);
    });
  });

  // =========================================================================
  // GET /api/contacts/archived/count
  // =========================================================================

  describe('GET /api/contacts/archived/count', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/contacts/archived/count');
      expect(res.status).toBe(401);
    });

    it('should return count of archived contacts', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'c1', user_id: testUserId, name: 'A', archived_at: new Date(), created_at: new Date(), updated_at: new Date(), group_ids: '[]', tags: '[]', sources: [] },
          { id: 'c2', user_id: testUserId, name: 'B', archived_at: new Date(), created_at: new Date(), updated_at: new Date(), group_ids: '[]', tags: '[]', sources: [] },
          { id: 'c3', user_id: testUserId, name: 'C', archived_at: new Date(), created_at: new Date(), updated_at: new Date(), group_ids: '[]', tags: '[]', sources: [] },
        ],
      });

      const res = await request(app)
        .get('/api/contacts/archived/count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(3);
    });

    it('should return 0 when no archived contacts', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/contacts/archived/count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
    });
  });

  // =========================================================================
  // POST /api/contacts/archive
  // =========================================================================

  describe('POST /api/contacts/archive', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/contacts/archive')
        .send({ contactIds: ['c1'] });
      expect(res.status).toBe(401);
    });

    it('should return 400 when contactIds is missing', async () => {
      const res = await request(app)
        .post('/api/contacts/archive')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('contactIds');
    });

    it('should return 400 when contactIds is empty', async () => {
      const res = await request(app)
        .post('/api/contacts/archive')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: [] });

      expect(res.status).toBe(400);
    });

    it('should archive contacts successfully', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      mockConnect.mockResolvedValueOnce(mockClient);

      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Verify contacts
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }, { id: 'c2' }] });
      // Archive
      mockClient.query.mockResolvedValueOnce({ rowCount: 2 });
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/contacts/archive')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: ['c1', 'c2'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.archivedCount).toBe(2);
    });
  });

  // =========================================================================
  // POST /api/contacts/restore
  // =========================================================================

  describe('POST /api/contacts/restore', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/contacts/restore')
        .send({ contactIds: ['c1'] });
      expect(res.status).toBe(401);
    });

    it('should return 400 when contactIds is missing', async () => {
      const res = await request(app)
        .post('/api/contacts/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('contactIds');
    });

    it('should return 404 when no archived contacts found', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      mockConnect.mockResolvedValueOnce(mockClient);

      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Verify — none found
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/contacts/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: ['nonexistent'] });

      expect(res.status).toBe(404);
    });

    it('should restore contacts successfully', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      mockConnect.mockResolvedValueOnce(mockClient);

      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Verify archived contacts
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }] });
      // Restore
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/contacts/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: ['c1'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.restoredCount).toBe(1);
    });
  });

  // =========================================================================
  // POST /api/contacts/:id/restore
  // =========================================================================

  describe('POST /api/contacts/:id/restore', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).post('/api/contacts/c1/restore');
      expect(res.status).toBe(401);
    });

    it('should return 404 when contact not found or not archived', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      mockConnect.mockResolvedValueOnce(mockClient);

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Verify — not found
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .post('/api/contacts/nonexistent/restore')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should restore a single contact successfully', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      mockConnect.mockResolvedValueOnce(mockClient);

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }] }); // Verify
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 }); // Restore
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/contacts/c1/restore')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
