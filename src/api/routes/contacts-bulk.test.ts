/**
 * Tests for Bulk Contact Operations API Routes
 *
 * POST /api/contacts/bulk — Bulk operations (archive, add_tag, assign_group, assign_circle)
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8
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

describe('Bulk Contact Operations API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-bulk-123';
  let authToken: string;

  const createMockClient = () => {
    const client = {
      query: vi.fn(),
      release: vi.fn(),
    };
    mockConnect.mockResolvedValueOnce(client);
    return client;
  };

  beforeEach(() => {
    authToken = generateToken(testUserId);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  it('should return 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/contacts/bulk')
      .send({ contactIds: ['c1'], operation: 'archive' });
    expect(res.status).toBe(401);
  });

  // =========================================================================
  // Validation
  // =========================================================================

  describe('Validation', () => {
    it('should return 400 when contactIds is missing', async () => {
      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operation: 'archive' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('contactIds');
    });

    it('should return 400 when contactIds is empty', async () => {
      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: [], operation: 'archive' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when operation is invalid', async () => {
      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: ['c1'], operation: 'delete_all' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid operation');
    });

    it('should enforce 200-contact limit per request (Req 16.8)', async () => {
      const tooManyIds = Array.from({ length: 201 }, (_, i) => `c${i}`);

      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: tooManyIds, operation: 'archive' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('200');
    });

    it('should accept exactly 200 contacts', async () => {
      const exactlyMax = Array.from({ length: 200 }, (_, i) => `c${i}`);
      const client = createMockClient();

      // BEGIN
      client.query.mockResolvedValueOnce({ rows: [] });
      // Verify contacts — all found
      client.query.mockResolvedValueOnce({
        rows: exactlyMax.map((id) => ({ id })),
      });
      // Archive
      client.query.mockResolvedValueOnce({ rowCount: 200 });
      // COMMIT
      client.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: exactlyMax, operation: 'archive' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when add_tag is missing params.tag', async () => {
      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: ['c1'], operation: 'add_tag' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('tag');
    });

    it('should return 400 when assign_group is missing params.groupId', async () => {
      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: ['c1'], operation: 'assign_group' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('groupId');
    });

    it('should return 400 when assign_circle has invalid circle value', async () => {
      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: ['c1'], operation: 'assign_circle', params: { circle: 'unknown' } });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('circle');
    });
  });

  // =========================================================================
  // Bulk Archive (Req 16.3)
  // =========================================================================

  describe('Bulk Archive', () => {
    it('should archive contacts in a single transaction', async () => {
      const client = createMockClient();

      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }, { id: 'c2' }] }); // Verify
      client.query.mockResolvedValueOnce({ rowCount: 2 }); // Archive UPDATE
      client.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: ['c1', 'c2'], operation: 'archive' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.operation).toBe('archive');
      expect(res.body.affectedCount).toBe(2);
    });

    it('should return error when some contacts not found (Req 16.7)', async () => {
      const client = createMockClient();

      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      // Only c1 found, c2 missing
      client.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }] }); // Verify
      client.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: ['c1', 'c2'], operation: 'archive' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.failedContactIds).toContain('c2');
    });
  });

  // =========================================================================
  // Bulk Add Tag (Req 16.4)
  // =========================================================================

  describe('Bulk Add Tag', () => {
    it('should add tag to all contacts in a single transaction', async () => {
      const client = createMockClient();

      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }, { id: 'c2' }] }); // Verify contacts
      client.query.mockResolvedValueOnce({ rows: [{ id: 'tag-1' }] }); // INSERT tag
      client.query.mockResolvedValueOnce({ rowCount: 2 }); // INSERT contact_tags
      client.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactIds: ['c1', 'c2'],
          operation: 'add_tag',
          params: { tag: 'VIP' },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.operation).toBe('add_tag');
      expect(res.body.affectedCount).toBe(2);
    });
  });

  // =========================================================================
  // Bulk Assign Group (Req 16.5)
  // =========================================================================

  describe('Bulk Assign Group', () => {
    it('should assign group to all contacts in a single transaction', async () => {
      const client = createMockClient();

      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }, { id: 'c2' }] }); // Verify contacts
      client.query.mockResolvedValueOnce({ rows: [{ id: 'g1' }] }); // Verify group
      client.query.mockResolvedValueOnce({ rowCount: 2 }); // INSERT contact_groups
      client.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactIds: ['c1', 'c2'],
          operation: 'assign_group',
          params: { groupId: 'g1' },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.operation).toBe('assign_group');
      expect(res.body.affectedCount).toBe(2);
    });

    it('should return 400 when group not found', async () => {
      const client = createMockClient();

      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }] }); // Verify contacts
      client.query.mockResolvedValueOnce({ rows: [] }); // Verify group — not found
      client.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactIds: ['c1'],
          operation: 'assign_group',
          params: { groupId: 'nonexistent' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Group not found');
    });
  });

  // =========================================================================
  // Bulk Assign Circle (Req 16.6)
  // =========================================================================

  describe('Bulk Assign Circle', () => {
    it('should assign circle to all contacts in a single transaction', async () => {
      const client = createMockClient();

      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }, { id: 'c2' }] }); // Verify contacts
      client.query.mockResolvedValueOnce({ rowCount: 2 }); // UPDATE circle
      client.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactIds: ['c1', 'c2'],
          operation: 'assign_circle',
          params: { circle: 'inner' },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.operation).toBe('assign_circle');
      expect(res.body.affectedCount).toBe(2);
    });

    it('should accept all valid circle values', async () => {
      for (const circle of ['inner', 'close', 'active', 'casual']) {
        const client = createMockClient();

        client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
        client.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }] }); // Verify
        client.query.mockResolvedValueOnce({ rowCount: 1 }); // UPDATE
        client.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

        const res = await request(app)
          .post('/api/contacts/bulk')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            contactIds: ['c1'],
            operation: 'assign_circle',
            params: { circle },
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });
  });

  // =========================================================================
  // Transaction Rollback (Req 16.7)
  // =========================================================================

  describe('Transaction Rollback', () => {
    it('should rollback entire transaction on database error', async () => {
      const client = createMockClient();

      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [{ id: 'c1' }] }); // Verify
      client.query.mockRejectedValueOnce(new Error('DB constraint violation')); // Archive fails
      client.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const res = await request(app)
        .post('/api/contacts/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactIds: ['c1'], operation: 'archive' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('rolled back');
    });
  });
});
