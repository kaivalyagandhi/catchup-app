/**
 * Tests for Sync-Back API Routes
 *
 * GET    /api/sync-back/pending  — Get pending sync-back operations with diff view data
 * POST   /api/sync-back/approve  — Approve selected operations (bulk approve supported)
 * POST   /api/sync-back/skip     — Skip selected operations
 * POST   /api/sync-back/:id/undo — Undo a synced operation
 *
 * Requirements: 13.2, 13.3, 13.8, 13.9
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
  CloudTasksQueue: class MockCloudTasksQueue {
    add = vi.fn().mockResolvedValue('task-id-123');
    close = vi.fn().mockResolvedValue(undefined);
  },
}));

// Mock OAuth repository
const mockGetToken = vi.fn();
vi.mock('../../integrations/oauth-repository', () => ({
  getToken: (...args: any[]) => mockGetToken(...args),
  upsertToken: vi.fn(),
  deleteToken: vi.fn(),
}));

// Mock google-contacts-config (used by sync-back service)
vi.mock('../../integrations/google-contacts-config', () => ({
  GOOGLE_CONTACTS_SCOPES: ['https://www.googleapis.com/auth/contacts.readonly'],
  getAuthorizationUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock'),
  getTokensFromCode: vi.fn(),
  getPeopleClient: vi.fn(),
  getOAuth2Client: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

describe('Sync-Back API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-sync-back-123';
  let authToken: string;

  beforeEach(() => {
    authToken = generateToken(testUserId);
    vi.clearAllMocks();

    // Set env vars for incremental auth URL generation
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CONTACTS_REDIRECT_URI = 'http://localhost:3000/api/contacts/oauth/callback';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });


  // =========================================================================
  // GET /api/sync-back/pending
  // =========================================================================

  describe('GET /api/sync-back/pending', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/sync-back/pending');
      expect(res.status).toBe(401);
    });

    it('should return empty operations when none pending', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/sync-back/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.operations).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it('should return pending operations with contact data for diff view', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'op-1',
            user_id: testUserId,
            contact_id: 'contact-1',
            field: 'name',
            previous_value: 'John',
            new_value: 'Jonathan',
            status: 'pending_review',
            google_etag: 'etag-abc',
            conflict_google_value: null,
            created_at: '2024-01-15T00:00:00Z',
            resolved_at: null,
            contact_name: 'John',
            contact_phone: '+1234567890',
            contact_email: 'john@example.com',
            contact_custom_notes: null,
          },
          {
            id: 'op-2',
            user_id: testUserId,
            contact_id: 'contact-2',
            field: 'email',
            previous_value: 'old@example.com',
            new_value: 'new@example.com',
            status: 'pending_review',
            google_etag: 'etag-def',
            conflict_google_value: null,
            created_at: '2024-01-14T00:00:00Z',
            resolved_at: null,
            contact_name: 'Jane',
            contact_phone: null,
            contact_email: 'old@example.com',
            contact_custom_notes: null,
          },
        ],
      });

      const res = await request(app)
        .get('/api/sync-back/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.operations).toHaveLength(2);

      const op1 = res.body.operations[0];
      expect(op1.id).toBe('op-1');
      expect(op1.contactName).toBe('John');
      expect(op1.field).toBe('name');
      expect(op1.previousValue).toBe('John');
      expect(op1.newValue).toBe('Jonathan');
      expect(op1.currentGoogleValue).toBe('John'); // falls back to previousValue when no conflict

      const op2 = res.body.operations[1];
      expect(op2.id).toBe('op-2');
      expect(op2.contactName).toBe('Jane');
      expect(op2.field).toBe('email');
    });

    it('should show conflict_google_value as currentGoogleValue when present', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'op-1',
            user_id: testUserId,
            contact_id: 'contact-1',
            field: 'phone',
            previous_value: '+1111111111',
            new_value: '+2222222222',
            status: 'pending_review',
            google_etag: 'etag-abc',
            conflict_google_value: '+3333333333',
            created_at: '2024-01-15T00:00:00Z',
            resolved_at: null,
            contact_name: 'Alice',
            contact_phone: '+2222222222',
            contact_email: null,
            contact_custom_notes: null,
          },
        ],
      });

      const res = await request(app)
        .get('/api/sync-back/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.operations[0].currentGoogleValue).toBe('+3333333333');
    });
  });

  // =========================================================================
  // POST /api/sync-back/approve
  // =========================================================================

  describe('POST /api/sync-back/approve', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/sync-back/approve')
        .send({ operationIds: ['op-1'] });
      expect(res.status).toBe(401);
    });

    it('should return 400 when operationIds is missing', async () => {
      const res = await request(app)
        .post('/api/sync-back/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('operationIds');
    });

    it('should return 400 when operationIds is empty array', async () => {
      const res = await request(app)
        .post('/api/sync-back/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operationIds: [] });

      expect(res.status).toBe(400);
    });

    it('should return scopeUpgradeRequired when user has read-only scope', async () => {
      // User has read-only scope
      mockGetToken.mockResolvedValueOnce({
        scope: 'https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/userinfo.email',
      });

      const res = await request(app)
        .post('/api/sync-back/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operationIds: ['op-1'] });

      expect(res.status).toBe(200);
      expect(res.body.scopeUpgradeRequired).toBe(true);
      expect(res.body.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(res.body.authUrl).toContain('include_granted_scopes=true');
      expect(res.body.authUrl).toContain(encodeURIComponent('https://www.googleapis.com/auth/contacts'));
    });

    it('should return scopeUpgradeRequired when user has no token', async () => {
      mockGetToken.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/sync-back/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operationIds: ['op-1'] });

      expect(res.status).toBe(200);
      expect(res.body.scopeUpgradeRequired).toBe(true);
      expect(res.body.authUrl).toBeDefined();
    });

    it('should approve operations when user has read-write scope', async () => {
      // User has read-write scope
      mockGetToken.mockResolvedValueOnce({
        scope: 'https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/userinfo.email',
      });

      // Mock the service's approveOperations DB calls
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      mockConnect.mockResolvedValueOnce(mockClient);

      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // UPDATE operations to approved
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { id: 'op-1', user_id: testUserId, contact_id: 'c-1', field: 'name', previous_value: 'A', new_value: 'B', status: 'approved' },
        ],
      });
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/sync-back/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operationIds: ['op-1'] });

      expect(res.status).toBe(200);
      expect(res.body.approved).toBe(true);
      expect(res.body.count).toBe(1);
    });
  });

  // =========================================================================
  // POST /api/sync-back/skip
  // =========================================================================

  describe('POST /api/sync-back/skip', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/sync-back/skip')
        .send({ operationIds: ['op-1'] });
      expect(res.status).toBe(401);
    });

    it('should return 400 when operationIds is missing', async () => {
      const res = await request(app)
        .post('/api/sync-back/skip')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('operationIds');
    });

    it('should skip operations successfully', async () => {
      // Mock the service's skipOperations DB call
      mockQuery.mockResolvedValueOnce({ rowCount: 2 });

      const res = await request(app)
        .post('/api/sync-back/skip')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operationIds: ['op-1', 'op-2'] });

      expect(res.status).toBe(200);
      expect(res.body.skipped).toBe(true);
      expect(res.body.count).toBe(2);
    });

    it('should return 500 when no eligible operations found', async () => {
      // Service throws when no eligible operations
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const res = await request(app)
        .post('/api/sync-back/skip')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operationIds: ['nonexistent'] });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('No eligible operations');
    });
  });

  // =========================================================================
  // POST /api/sync-back/:id/undo
  // =========================================================================

  describe('POST /api/sync-back/:id/undo', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).post('/api/sync-back/op-1/undo');
      expect(res.status).toBe(401);
    });

    it('should undo a synced operation', async () => {
      // Mock the service's undoOperation DB calls
      // 1. Fetch the operation
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'op-1',
            user_id: testUserId,
            contact_id: 'contact-1',
            field: 'name',
            previous_value: 'John',
            new_value: 'Jonathan',
            status: 'synced',
            google_etag: 'etag-abc',
            conflict_google_value: null,
            created_at: new Date(),
            resolved_at: null,
          },
        ],
      });
      // 2. Revert local contact field
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      // 3. Mark operation as skipped
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app)
        .post('/api/sync-back/op-1/undo')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.undone).toBe(true);
      expect(res.body.operationId).toBe('op-1');
    });

    it('should return 500 when operation not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/sync-back/nonexistent/undo')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('not found');
    });

    it('should return 500 when operation status does not allow undo', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'op-1',
            user_id: testUserId,
            contact_id: 'contact-1',
            field: 'name',
            previous_value: 'John',
            new_value: 'Jonathan',
            status: 'failed',
            google_etag: null,
            conflict_google_value: null,
            created_at: new Date(),
            resolved_at: null,
          },
        ],
      });

      const res = await request(app)
        .post('/api/sync-back/op-1/undo')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Cannot undo');
    });
  });
});
