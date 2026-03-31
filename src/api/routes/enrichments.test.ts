/**
 * Tests for Enrichment API Routes
 *
 * GET  /api/enrichments/pending
 * POST /api/enrichments/pending/:id/link
 * POST /api/enrichments/pending/:id/create-contact
 * POST /api/enrichments/pending/:id/dismiss
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
import { generateToken } from '../middleware/auth';

// Mock the database pool
const mockQuery = vi.fn();
const mockConnect = vi.fn();
vi.mock('../../db/connection', () => {
  return {
    default: {
      query: (...args: any[]) => mockQuery(...args),
      connect: (...args: any[]) => mockConnect(...args),
      end: vi.fn(),
    },
  };
});

// Mock Cloud Tasks
vi.mock('../../jobs/cloud-tasks-client', () => ({
  CloudTasksQueue: class MockCloudTasksQueue {
    add = vi.fn().mockResolvedValue('task-id-123');
    close = vi.fn().mockResolvedValue(undefined);
  },
}));

describe('Enrichment API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-enrichment-123';
  let authToken: string;

  beforeEach(() => {
    authToken = generateToken(testUserId);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });


  // =========================================================================
  // GET /pending
  // =========================================================================

  describe('GET /api/enrichments/pending', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/enrichments/pending');
      expect(res.status).toBe(401);
    });

    it('should return empty imports array when no pending enrichments', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/enrichments/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ imports: [] });
    });

    it('should return pending enrichments grouped by import', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'pe-1',
            import_record_id: 'import-1',
            participant_identifier: '+1234567890',
            participant_display_name: 'Alice',
            platform: 'whatsapp',
            match_tier: 'unmatched',
            suggested_contact_id: null,
            confidence: null,
            match_reason: null,
            status: 'pending',
            message_count: 50,
            first_message_date: '2023-01-01T00:00:00Z',
            last_message_date: '2024-01-15T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            import_platform: 'whatsapp',
            import_date: '2024-01-01T00:00:00Z',
          },
          {
            id: 'pe-2',
            import_record_id: 'import-1',
            participant_identifier: 'bob_user',
            participant_display_name: 'Bob',
            platform: 'whatsapp',
            match_tier: 'unmatched',
            suggested_contact_id: null,
            confidence: null,
            match_reason: null,
            status: 'pending',
            message_count: 30,
            first_message_date: '2023-06-01T00:00:00Z',
            last_message_date: '2024-01-10T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            import_platform: 'whatsapp',
            import_date: '2024-01-01T00:00:00Z',
          },
          {
            id: 'pe-3',
            import_record_id: 'import-2',
            participant_identifier: 'charlie_ig',
            participant_display_name: 'Charlie',
            platform: 'instagram',
            match_tier: 'unmatched',
            suggested_contact_id: null,
            confidence: null,
            match_reason: null,
            status: 'pending',
            message_count: 20,
            first_message_date: '2023-03-01T00:00:00Z',
            last_message_date: '2024-02-01T00:00:00Z',
            created_at: '2024-02-01T00:00:00Z',
            import_platform: 'instagram',
            import_date: '2024-02-01T00:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .get('/api/enrichments/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.imports).toHaveLength(2);

      // First group: import-1 (whatsapp)
      const group1 = res.body.imports[0];
      expect(group1.importId).toBe('import-1');
      expect(group1.platform).toBe('whatsapp');
      expect(group1.items).toHaveLength(2);
      expect(group1.items[0].id).toBe('pe-1');
      expect(group1.items[0].messageCount).toBe(50);
      expect(group1.items[1].id).toBe('pe-2');
      expect(group1.items[1].messageCount).toBe(30);

      // Second group: import-2 (instagram)
      const group2 = res.body.imports[1];
      expect(group2.importId).toBe('import-2');
      expect(group2.platform).toBe('instagram');
      expect(group2.items).toHaveLength(1);
      expect(group2.items[0].id).toBe('pe-3');
    });

    it('should query with correct userId and status filter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/enrichments/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("pe.status = 'pending'");
      expect(sql).toContain('pe.message_count DESC');
      expect(params).toEqual([testUserId]);
    });
  });


  // =========================================================================
  // POST /pending/:id/link
  // =========================================================================

  describe('POST /api/enrichments/pending/:id/link', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      mockConnect.mockResolvedValue(mockClient);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/enrichments/pending/some-id/link')
        .send({ contactId: 'contact-1' });

      expect(res.status).toBe(401);
    });

    it('should return 400 when contactId is missing', async () => {
      const res = await request(app)
        .post('/api/enrichments/pending/some-id/link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('contactId is required');
    });

    it('should return 404 when pending enrichment not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/enrichments/pending/nonexistent-id/link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactId: 'contact-1' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Pending enrichment not found');
    });

    it('should return 400 when pending enrichment already resolved', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-1', user_id: testUserId, import_record_id: 'ir-1',
          interaction_summary_id: 'is-1', platform: 'whatsapp',
          message_count: 10, first_message_date: null, last_message_date: null,
          status: 'linked', avg_messages_per_month: 5, topics: '[]', sentiment: null,
        }],
      });

      const res = await request(app)
        .post('/api/enrichments/pending/pe-1/link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactId: 'contact-1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Pending enrichment has already been resolved');
    });

    it('should return 404 when contact not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-1', user_id: testUserId, import_record_id: 'ir-1',
          interaction_summary_id: 'is-1', platform: 'whatsapp',
          message_count: 10, first_message_date: null, last_message_date: null,
          status: 'pending', avg_messages_per_month: 5, topics: '[]', sentiment: null,
        }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/enrichments/pending/pe-1/link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactId: 'nonexistent-contact' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Contact not found');
    });

    it('should link pending enrichment to contact successfully', async () => {
      // Fetch pending enrichment
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-1', user_id: testUserId, import_record_id: 'ir-1',
          interaction_summary_id: 'is-1', platform: 'whatsapp',
          message_count: 42, first_message_date: '2023-01-01T00:00:00Z',
          last_message_date: '2024-01-15T00:00:00Z',
          status: 'pending', avg_messages_per_month: 3.5, topics: '["travel","food"]', sentiment: 'positive',
        }],
      });
      // Fetch contact
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'contact-1', sources: ['google'] }],
      });
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Insert enrichment_record
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'er-new-1' }] });
      // Update pending_enrichment status
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Add chat_import to sources
      mockClient.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'contact-1' }] });
      // Update lastContactDate
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/enrichments/pending/pe-1/link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactId: 'contact-1' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ linked: true, enrichmentRecordId: 'er-new-1' });

      // Verify enrichment_record was created
      const insertCall = mockClient.query.mock.calls[3];
      expect(insertCall[0]).toContain('INSERT INTO enrichment_records');
      expect(insertCall[1][0]).toBe('contact-1'); // contact_id
      expect(insertCall[1][4]).toBe('whatsapp');  // platform

      // Verify sources updated
      const sourcesCall = mockClient.query.mock.calls[5];
      expect(sourcesCall[0]).toContain('array_append');
    });

    it('should not add chat_import to sources if already present', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-1', user_id: testUserId, import_record_id: 'ir-1',
          interaction_summary_id: 'is-1', platform: 'whatsapp',
          message_count: 10, first_message_date: null, last_message_date: null,
          status: 'pending', avg_messages_per_month: 0, topics: '[]', sentiment: null,
        }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'contact-1', sources: ['google', 'chat_import'] }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'er-2' }] }); // Insert enrichment
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Update PE status
      mockClient.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // addSourceToContact (no-op, already present)
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/enrichments/pending/pe-1/link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contactId: 'contact-1' });

      expect(res.status).toBe(200);
      expect(res.body.linked).toBe(true);

      // Verify the addSourceToContact SQL was called but with NOT ANY preventing duplicates
      const allCalls = mockClient.query.mock.calls;
      const sourcesUpdateCalls = allCalls.filter((c: any) =>
        typeof c[0] === 'string' && c[0].includes('array_append')
      );
      expect(sourcesUpdateCalls).toHaveLength(1);
      // The SQL uses NOT ($2 = ANY(...)) so no duplicate is added
      expect(sourcesUpdateCalls[0][0]).toContain('NOT');
    });
  });


  // =========================================================================
  // POST /pending/:id/create-contact
  // =========================================================================

  describe('POST /api/enrichments/pending/:id/create-contact', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      mockConnect.mockResolvedValue(mockClient);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/enrichments/pending/some-id/create-contact');

      expect(res.status).toBe(401);
    });

    it('should return 404 when pending enrichment not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/enrichments/pending/nonexistent-id/create-contact')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Pending enrichment not found');
    });

    it('should return 400 when pending enrichment already resolved', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-1', user_id: testUserId, import_record_id: 'ir-1',
          interaction_summary_id: 'is-1', participant_identifier: '+1234567890',
          participant_display_name: 'Alice', platform: 'whatsapp',
          message_count: 10, first_message_date: null, last_message_date: null,
          status: 'created', identifier_type: 'phone',
          avg_messages_per_month: 0, topics: '[]', sentiment: null,
        }],
      });

      const res = await request(app)
        .post('/api/enrichments/pending/pe-1/create-contact')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Pending enrichment has already been resolved');
    });

    it('should create contact with phone identifier', async () => {
      // Fetch pending enrichment
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-1', user_id: testUserId, import_record_id: 'ir-1',
          interaction_summary_id: 'is-1', participant_identifier: '+1234567890',
          participant_display_name: 'Alice Smith', platform: 'whatsapp',
          message_count: 42, first_message_date: '2023-01-01T00:00:00Z',
          last_message_date: '2024-01-15T00:00:00Z',
          status: 'pending', identifier_type: 'phone',
          avg_messages_per_month: 3.5, topics: '["travel"]', sentiment: 'positive',
        }],
      });
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Insert contact
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'new-contact-1' }] });
      // Insert enrichment_record
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'er-new-1' }] });
      // Update PE status
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/enrichments/pending/pe-1/create-contact')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        created: true,
        contactId: 'new-contact-1',
        enrichmentRecordId: 'er-new-1',
      });

      // Verify contact was created with correct fields
      const insertContactCall = mockClient.query.mock.calls[2];
      expect(insertContactCall[0]).toContain('INSERT INTO contacts');
      const params = insertContactCall[1];
      expect(params[0]).toBe(testUserId);       // user_id
      expect(params[1]).toBe('Alice Smith');     // name
      expect(params[2]).toBe('+1234567890');     // phone
      expect(params[3]).toBeNull();              // email
      expect(params[4]).toBeNull();              // instagram
      expect(params[5]).toBeNull();              // x_handle
      expect(params[7]).toEqual(['chat_import']); // sources
    });

    it('should create contact with email identifier', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-2', user_id: testUserId, import_record_id: 'ir-1',
          interaction_summary_id: 'is-2', participant_identifier: 'bob@example.com',
          participant_display_name: 'Bob', platform: 'facebook',
          message_count: 20, first_message_date: '2023-06-01T00:00:00Z',
          last_message_date: '2024-02-01T00:00:00Z',
          status: 'pending', identifier_type: 'email',
          avg_messages_per_month: 2, topics: '[]', sentiment: null,
        }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'new-contact-2' }] }); // Insert contact
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'er-new-2' }] }); // Insert enrichment
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Update PE
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/enrichments/pending/pe-2/create-contact')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(true);

      const params = mockClient.query.mock.calls[2][1];
      expect(params[1]).toBe('Bob');              // name
      expect(params[2]).toBeNull();               // phone
      expect(params[3]).toBe('bob@example.com');  // email
    });

    it('should create contact with instagram username', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-3', user_id: testUserId, import_record_id: 'ir-1',
          interaction_summary_id: 'is-3', participant_identifier: 'charlie_ig',
          participant_display_name: 'Charlie', platform: 'instagram',
          message_count: 15, first_message_date: '2023-03-01T00:00:00Z',
          last_message_date: '2024-01-01T00:00:00Z',
          status: 'pending', identifier_type: 'username',
          avg_messages_per_month: 1.5, topics: '[]', sentiment: null,
        }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'new-contact-3' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'er-new-3' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/enrichments/pending/pe-3/create-contact')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(201);

      const params = mockClient.query.mock.calls[2][1];
      expect(params[1]).toBe('Charlie');     // name
      expect(params[2]).toBeNull();          // phone
      expect(params[3]).toBeNull();          // email
      expect(params[4]).toBe('charlie_ig');  // instagram
      expect(params[5]).toBeNull();          // x_handle
    });

    it('should create contact with twitter username as x_handle', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-4', user_id: testUserId, import_record_id: 'ir-1',
          interaction_summary_id: 'is-4', participant_identifier: 'dave_tw',
          participant_display_name: 'Dave', platform: 'twitter',
          message_count: 8, first_message_date: '2023-09-01T00:00:00Z',
          last_message_date: '2024-01-20T00:00:00Z',
          status: 'pending', identifier_type: 'username',
          avg_messages_per_month: 1, topics: '[]', sentiment: null,
        }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'new-contact-4' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'er-new-4' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/enrichments/pending/pe-4/create-contact')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(201);

      const params = mockClient.query.mock.calls[2][1];
      expect(params[1]).toBe('Dave');      // name
      expect(params[4]).toBeNull();        // instagram
      expect(params[5]).toBe('dave_tw');   // x_handle
    });

    it('should use participant_identifier as name when display_name is null', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-5', user_id: testUserId, import_record_id: 'ir-1',
          interaction_summary_id: 'is-5', participant_identifier: '+9876543210',
          participant_display_name: null, platform: 'whatsapp',
          message_count: 5, first_message_date: '2023-01-01T00:00:00Z',
          last_message_date: '2024-01-01T00:00:00Z',
          status: 'pending', identifier_type: 'phone',
          avg_messages_per_month: 0.5, topics: '[]', sentiment: null,
        }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'new-contact-5' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'er-new-5' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/enrichments/pending/pe-5/create-contact')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(201);

      const params = mockClient.query.mock.calls[2][1];
      expect(params[1]).toBe('+9876543210'); // name falls back to identifier
    });
  });


  // =========================================================================
  // POST /pending/:id/dismiss
  // =========================================================================

  describe('POST /api/enrichments/pending/:id/dismiss', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/enrichments/pending/some-id/dismiss');

      expect(res.status).toBe(401);
    });

    it('should return 404 when pending enrichment not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/enrichments/pending/nonexistent-id/dismiss')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Pending enrichment not found');
    });

    it('should return 400 when pending enrichment already resolved', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'pe-1', status: 'dismissed' }],
      });

      const res = await request(app)
        .post('/api/enrichments/pending/pe-1/dismiss')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Pending enrichment has already been resolved');
    });

    it('should dismiss pending enrichment successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'pe-1', status: 'pending' }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE

      const res = await request(app)
        .post('/api/enrichments/pending/pe-1/dismiss')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ dismissed: true });

      // Verify the update query
      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain("status = 'dismissed'");
      expect(updateCall[0]).toContain('resolved_at = NOW()');
    });
  });
});
