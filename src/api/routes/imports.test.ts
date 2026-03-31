/**
 * Tests for Import API Routes
 *
 * POST   /api/imports/upload
 * GET    /api/imports/:jobId/status
 * GET    /api/imports/history
 * DELETE /api/imports/:importId
 * POST   /api/imports/:importId/reimport
 * GET    /api/imports/:importId/matches
 * POST   /api/imports/matches/:matchId/confirm
 * POST   /api/imports/matches/:matchId/reject
 * POST   /api/imports/matches/:matchId/skip
 *
 * Requirements: 5.5, 5.6, 5.7, 5.8, 7.2, 7.5, 7.6, 7.7, 11.1, 11.2, 11.3, 11.5, 11.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
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

describe('Import API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-upload-123';
  let authToken: string;

  beforeEach(() => {
    authToken = generateToken(testUserId);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // POST /upload
  // =========================================================================

  describe('POST /api/imports/upload', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/imports/upload')
        .attach('file', Buffer.from('hello'), 'chat.txt');

      expect(res.status).toBe(401);
    });

    it('should return 400 when no file is provided', async () => {
      const res = await request(app)
        .post('/api/imports/upload')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No file provided. Please upload a chat export file.');
    });

    it('should return 400 for unrecognized file format', async () => {
      const buf = Buffer.from('This is just a random text file with no chat patterns.');
      mockQuery.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .post('/api/imports/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'random.txt');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('UNRECOGNIZED_FORMAT');
    });

    it('should return 429 when user has 3 active imports', async () => {
      const whatsappContent = '[1/2/23, 10:00:00 AM] Alice: Hello\n[1/2/23, 10:01:00 AM] Bob: Hi\n';
      const buf = Buffer.from(whatsappContent);

      mockQuery.mockResolvedValueOnce({ rows: [{ count: 3 }] });

      const res = await request(app)
        .post('/api/imports/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'chat.txt');

      expect(res.status).toBe(429);
      expect(res.body.error).toBe('IMPORT_LIMIT_EXCEEDED');
    });

    it('should return 409 for duplicate file hash', async () => {
      const whatsappContent = '[1/2/23, 10:00:00 AM] Alice: Hello\n';
      const buf = Buffer.from(whatsappContent);

      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-import-id' }] });

      const res = await request(app)
        .post('/api/imports/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'chat.txt');

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('DUPLICATE_FILE');
    });

    it('should return 201 with jobId for a valid WhatsApp upload', async () => {
      const whatsappContent = '[1/2/23, 10:00:00 AM] Alice: Hello\n[1/2/23, 10:01:00 AM] Bob: Hi\n';
      const buf = Buffer.from(whatsappContent);

      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'new-import-id-abc' }] });

      const res = await request(app)
        .post('/api/imports/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'chat.txt');

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        jobId: 'new-import-id-abc',
        status: 'processing',
      });
    });

    it('should detect Instagram JSON format', async () => {
      const instagramJson = JSON.stringify({
        participants: [{ name: 'Alice' }],
        messages: [{ sender_name: 'Alice', content: 'Hi', timestamp_ms: 1700000000000 }],
      });
      const buf = Buffer.from(instagramJson);

      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'ig-import-id' }] });

      const res = await request(app)
        .post('/api/imports/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'messages.json');

      expect(res.status).toBe(201);
      expect(res.body.jobId).toBe('ig-import-id');
    });

    it('should detect Google Messages XML format', async () => {
      const smsXml = '<?xml version="1.0" encoding="UTF-8"?>\n<smses count="2"><sms address="+1234" body="Hi" date="1700000000000" type="1" /></smses>';
      const buf = Buffer.from(smsXml);

      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'sms-import-id' }] });

      const res = await request(app)
        .post('/api/imports/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'sms-backup.xml');

      expect(res.status).toBe(201);
      expect(res.body.jobId).toBe('sms-import-id');
    });

    it('should detect iMessage CSV format', async () => {
      const csv = 'Date,Sender,Text\n2023-01-02,Alice,Hello\n2023-01-02,Bob,Hi\n';
      const buf = Buffer.from(csv);

      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'imsg-import-id' }] });

      const res = await request(app)
        .post('/api/imports/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'imessage.csv');

      expect(res.status).toBe(201);
      expect(res.body.jobId).toBe('imsg-import-id');
    });

    it('should pass correct platform and file hash to the database', async () => {
      const whatsappContent = '[1/2/23, 10:00:00 AM] Alice: Hello\n';
      const buf = Buffer.from(whatsappContent);

      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'check-params-id' }] });

      await request(app)
        .post('/api/imports/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'chat.txt');

      const insertCall = mockQuery.mock.calls[2];
      expect(insertCall[0]).toContain('INSERT INTO import_records');
      expect(insertCall[1][0]).toBe(testUserId);
      expect(insertCall[1][1]).toBe('whatsapp');
      expect(insertCall[1][2]).toBe('chat.txt');
      expect(insertCall[1][3]).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // =========================================================================
  // GET /:jobId/status
  // =========================================================================

  describe('GET /api/imports/:jobId/status', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/imports/some-job-id/status');
      expect(res.status).toBe(401);
    });

    it('should return 404 when import not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/imports/nonexistent-id/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Import not found');
    });

    it('should return status for a processing import', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          status: 'processing',
          failed_phase: null,
          error_message: null,
          total_participants: 0,
          auto_matched: 0,
          likely_matched: 0,
          unmatched: 0,
        }],
      });

      const res = await request(app)
        .get('/api/imports/job-123/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'processing',
        phase: 'parsing',
        percentage: 25,
        autoMatched: 0,
        likelyMatched: 0,
        unmatched: 0,
        totalParticipants: 0,
        failedPhase: null,
        errorMessage: null,
      });
    });

    it('should return status for a complete import', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          status: 'complete',
          failed_phase: null,
          error_message: null,
          total_participants: 15,
          auto_matched: 10,
          likely_matched: 3,
          unmatched: 2,
        }],
      });

      const res = await request(app)
        .get('/api/imports/job-456/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('complete');
      expect(res.body.phase).toBe('complete');
      expect(res.body.percentage).toBe(100);
      expect(res.body.totalParticipants).toBe(15);
      expect(res.body.autoMatched).toBe(10);
    });

    it('should return status for a failed import with error details', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          status: 'failed',
          failed_phase: 'parsing',
          error_message: 'Invalid file format',
          total_participants: 0,
          auto_matched: 0,
          likely_matched: 0,
          unmatched: 0,
        }],
      });

      const res = await request(app)
        .get('/api/imports/job-789/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('failed');
      expect(res.body.phase).toBe('failed');
      expect(res.body.percentage).toBe(0);
      expect(res.body.failedPhase).toBe('parsing');
      expect(res.body.errorMessage).toBe('Invalid file format');
    });

    it('should return correct phase for enriching status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          status: 'enriching',
          failed_phase: null,
          error_message: null,
          total_participants: 10,
          auto_matched: 5,
          likely_matched: 3,
          unmatched: 2,
        }],
      });

      const res = await request(app)
        .get('/api/imports/job-enrich/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.phase).toBe('enriching');
      expect(res.body.percentage).toBe(75);
    });

    it('should return correct phase for parsed status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          status: 'parsed',
          failed_phase: null,
          error_message: null,
          total_participants: 8,
          auto_matched: 4,
          likely_matched: 2,
          unmatched: 2,
        }],
      });

      const res = await request(app)
        .get('/api/imports/job-parsed/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.phase).toBe('matching');
      expect(res.body.percentage).toBe(50);
    });
  });


  // =========================================================================
  // GET /history
  // =========================================================================

  describe('GET /api/imports/history', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/imports/history');
      expect(res.status).toBe(401);
    });

    it('should return empty array when no imports exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/imports/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return import records sorted by date descending', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 86400000);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'import-2',
            platform: 'instagram',
            file_name: 'messages.json',
            file_hash: 'hash2',
            status: 'complete',
            total_participants: 20,
            auto_matched: 15,
            likely_matched: 3,
            unmatched: 2,
            enrichment_records_created: 15,
            created_at: now.toISOString(),
            completed_at: now.toISOString(),
          },
          {
            id: 'import-1',
            platform: 'whatsapp',
            file_name: 'chat.txt',
            file_hash: 'hash1',
            status: 'complete',
            total_participants: 10,
            auto_matched: 8,
            likely_matched: 1,
            unmatched: 1,
            enrichment_records_created: 8,
            created_at: earlier.toISOString(),
            completed_at: earlier.toISOString(),
          },
        ],
      });

      const res = await request(app)
        .get('/api/imports/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe('import-2');
      expect(res.body[1].id).toBe('import-1');
      expect(res.body[0].platform).toBe('instagram');
      expect(res.body[0].fileName).toBe('messages.json');
      expect(res.body[0].totalParticipants).toBe(20);
      expect(res.body[0].autoMatched).toBe(15);
      expect(res.body[0].enrichmentRecordsCreated).toBe(15);
    });

    it('should query with the correct userId and ORDER BY', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/imports/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('ORDER BY created_at DESC');
      expect(params).toEqual([testUserId]);
    });
  });

  // =========================================================================
  // DELETE /:importId
  // =========================================================================

  describe('DELETE /api/imports/:importId', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      mockConnect.mockResolvedValue(mockClient);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).delete('/api/imports/some-import-id');
      expect(res.status).toBe(401);
    });

    it('should return 404 when import not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/imports/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Import not found');
    });

    it('should delete import and cascade to related records', async () => {
      // Verify ownership
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'import-to-delete' }] });
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Find affected contacts
      mockClient.query.mockResolvedValueOnce({ rows: [{ contact_id: 'contact-1' }] });
      // Delete enrichment_records
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Delete pending_enrichments
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Delete interaction_summaries
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Delete import_record
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Recalculate lastContactDate — MAX query
      mockClient.query.mockResolvedValueOnce({ rows: [{ max_date: '2024-01-15T00:00:00Z' }] });
      // Update contact
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/imports/import-to-delete')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });

      // Verify the cascade deletes were called
      const calls = mockClient.query.mock.calls;
      expect(calls[1][0]).toBe('BEGIN');
      // enrichment_records delete
      expect(calls[3][0]).toContain('DELETE FROM enrichment_records');
      // pending_enrichments delete
      expect(calls[4][0]).toContain('DELETE FROM pending_enrichments');
      // interaction_summaries delete
      expect(calls[5][0]).toContain('DELETE FROM interaction_summaries');
      // import_records delete
      expect(calls[6][0]).toContain('DELETE FROM import_records');
      // lastContactDate recalculation
      expect(calls[7][0]).toContain('MAX(last_message_date)');
      expect(calls[8][0]).toContain('UPDATE contacts SET last_contact_date');
    });

    it('should set lastContactDate to null when no remaining enrichment records', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'import-del' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ contact_id: 'contact-2' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // delete enrichment_records
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // delete pending_enrichments
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // delete interaction_summaries
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // delete import_records
      // No remaining enrichment records — max_date is null
      mockClient.query.mockResolvedValueOnce({ rows: [{ max_date: null }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // update contact
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .delete('/api/imports/import-del')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });

      // Verify null was passed for lastContactDate
      const updateCall = mockClient.query.mock.calls[8];
      expect(updateCall[1][0]).toBeNull();
    });

    it('should handle import with no affected contacts', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'import-no-contacts' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // no affected contacts
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // delete enrichment_records
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // delete pending_enrichments
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // delete interaction_summaries
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // delete import_records
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .delete('/api/imports/import-no-contacts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });
    });
  });

  // =========================================================================
  // POST /:importId/reimport
  // =========================================================================

  describe('POST /api/imports/:importId/reimport', () => {
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
        .post('/api/imports/some-id/reimport')
        .attach('file', Buffer.from('hello'), 'chat.txt');

      expect(res.status).toBe(401);
    });

    it('should return 400 when no file is provided', async () => {
      const res = await request(app)
        .post('/api/imports/some-id/reimport')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No file provided. Please upload a chat export file.');
    });

    it('should return 404 when import not found', async () => {
      const whatsappContent = '[1/2/23, 10:00:00 AM] Alice: Hello\n';
      const buf = Buffer.from(whatsappContent);

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/imports/nonexistent-id/reimport')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'chat.txt');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Import not found');
    });

    it('should return 400 for unrecognized file format', async () => {
      const buf = Buffer.from('This is just random text with no chat patterns.');

      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'import-1', platform: 'whatsapp' }] });

      const res = await request(app)
        .post('/api/imports/import-1/reimport')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'random.txt');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('UNRECOGNIZED_FORMAT');
    });

    it('should reimport successfully with a new file', async () => {
      const whatsappContent = '[1/2/23, 10:00:00 AM] Alice: Hello\n[1/2/23, 10:01:00 AM] Bob: Hi\n';
      const buf = Buffer.from(whatsappContent);

      // Verify ownership
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'import-reimport', platform: 'whatsapp' }] });
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Find affected contacts
      mockClient.query.mockResolvedValueOnce({ rows: [{ contact_id: 'contact-1' }] });
      // Delete enrichment_records
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Delete pending_enrichments
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Delete interaction_summaries
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Update import_record
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Recalculate lastContactDate
      mockClient.query.mockResolvedValueOnce({ rows: [{ max_date: null }] });
      // Update contact
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/imports/import-reimport/reimport')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'chat.txt');

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        jobId: 'import-reimport',
        status: 'processing',
      });

      // Verify the import_record was updated (not a new insert)
      const updateCall = mockClient.query.mock.calls[6];
      expect(updateCall[0]).toContain('UPDATE import_records');
      expect(updateCall[0]).toContain("status = 'processing'");
    });

    it('should delete old data before processing new file', async () => {
      const whatsappContent = '[1/2/23, 10:00:00 AM] Alice: Hello\n';
      const buf = Buffer.from(whatsappContent);

      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'import-old', platform: 'whatsapp' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // affected contacts (none)
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // delete enrichment_records
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // delete pending_enrichments
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // delete interaction_summaries
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // update import_record
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .post('/api/imports/import-old/reimport')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', buf, 'chat.txt');

      expect(res.status).toBe(201);

      const calls = mockClient.query.mock.calls;
      // Verify cascade deletes happened
      expect(calls[3][0]).toContain('DELETE FROM enrichment_records');
      expect(calls[4][0]).toContain('DELETE FROM pending_enrichments');
      expect(calls[5][0]).toContain('DELETE FROM interaction_summaries');
    });
  });

  // =========================================================================
  // GET /:importId/matches
  // =========================================================================

  describe('GET /api/imports/:importId/matches', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/imports/some-import-id/matches');
      expect(res.status).toBe(401);
    });

    it('should return 404 when import not found', async () => {
      // Ownership check
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/imports/nonexistent-id/matches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Import not found');
    });

    it('should return empty array when no pending matches', async () => {
      // Ownership check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'import-1' }] });
      // Matches query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/imports/import-1/matches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return likely matches with suggested contact name', async () => {
      // Ownership check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'import-1' }] });
      // Matches query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'pe-1',
            participant_identifier: '+1234567890',
            participant_display_name: 'Mike S',
            platform: 'whatsapp',
            match_tier: 'likely',
            suggested_contact_id: 'contact-1',
            suggested_contact_name: 'Michael Smith',
            confidence: '0.620',
            match_reason: 'Name similarity: Mike S → Michael Smith',
            message_count: 42,
            first_message_date: '2023-01-01T00:00:00Z',
            last_message_date: '2024-01-15T00:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .get('/api/imports/import-1/matches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toEqual({
        id: 'pe-1',
        participantIdentifier: '+1234567890',
        participantDisplayName: 'Mike S',
        platform: 'whatsapp',
        matchTier: 'likely',
        suggestedContactId: 'contact-1',
        suggestedContactName: 'Michael Smith',
        confidence: 0.62,
        matchReason: 'Name similarity: Mike S → Michael Smith',
        messageCount: 42,
        firstMessageDate: '2023-01-01T00:00:00Z',
        lastMessageDate: '2024-01-15T00:00:00Z',
      });
    });

    it('should include unmatched with smart_suggestion match_reason', async () => {
      // Ownership check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'import-1' }] });
      // Matches query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'pe-2',
            participant_identifier: 'jane_doe',
            participant_display_name: 'Jane Doe',
            platform: 'instagram',
            match_tier: 'unmatched',
            suggested_contact_id: null,
            suggested_contact_name: null,
            confidence: '0.100',
            match_reason: 'smart_suggestion',
            message_count: 150,
            first_message_date: '2023-06-01T00:00:00Z',
            last_message_date: '2024-02-01T00:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .get('/api/imports/import-1/matches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].matchTier).toBe('unmatched');
      expect(res.body[0].matchReason).toBe('smart_suggestion');
      expect(res.body[0].suggestedContactId).toBeNull();
    });

    it('should query with correct filters for likely and smart_suggestion', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'import-1' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/imports/import-1/matches')
        .set('Authorization', `Bearer ${authToken}`);

      const matchesCall = mockQuery.mock.calls[1];
      expect(matchesCall[0]).toContain("pe.status = 'pending'");
      expect(matchesCall[0]).toContain("pe.match_tier = 'likely'");
      expect(matchesCall[0]).toContain("pe.match_reason = 'smart_suggestion'");
      expect(matchesCall[1]).toEqual(['import-1', testUserId]);
    });
  });

  // =========================================================================
  // POST /matches/:matchId/confirm
  // =========================================================================

  describe('POST /api/imports/matches/:matchId/confirm', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      mockConnect.mockResolvedValue(mockClient);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).post('/api/imports/matches/some-id/confirm');
      expect(res.status).toBe(401);
    });

    it('should return 404 when match not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/imports/matches/nonexistent-id/confirm')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Match not found');
    });

    it('should return 400 when match already resolved', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-1', user_id: testUserId, status: 'linked',
          import_record_id: 'imp-1', interaction_summary_id: 'is-1',
          suggested_contact_id: 'c-1', platform: 'whatsapp',
          message_count: 10, first_message_date: null, last_message_date: null,
        }],
      });

      const res = await request(app)
        .post('/api/imports/matches/pe-1/confirm')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Match has already been resolved');
    });

    it('should return 400 when no suggested contact', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-1', user_id: testUserId, status: 'pending',
          import_record_id: 'imp-1', interaction_summary_id: 'is-1',
          suggested_contact_id: null, platform: 'whatsapp',
          message_count: 10, first_message_date: null, last_message_date: null,
        }],
      });

      const res = await request(app)
        .post('/api/imports/matches/pe-1/confirm')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No suggested contact to confirm');
    });

    it('should confirm match, create enrichment_record, and update contact lastContactDate', async () => {
      const lastMsgDate = '2024-06-15T00:00:00Z';

      // Fetch pending_enrichment
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-1', user_id: testUserId, status: 'pending',
          import_record_id: 'imp-1', interaction_summary_id: 'is-1',
          suggested_contact_id: 'contact-1', platform: 'whatsapp',
          message_count: 42, first_message_date: '2023-01-01T00:00:00Z',
          last_message_date: lastMsgDate,
        }],
      });
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // INSERT enrichment_record
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'er-new-1' }] });
      // UPDATE pending_enrichment status
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // UPDATE contact lastContactDate
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/imports/matches/pe-1/confirm')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ confirmed: true, enrichmentRecordId: 'er-new-1' });

      // Verify enrichment_record insert
      const insertCall = mockClient.query.mock.calls[2];
      expect(insertCall[0]).toContain('INSERT INTO enrichment_records');
      expect(insertCall[1]).toContain('contact-1');
      expect(insertCall[1]).toContain(testUserId);
      expect(insertCall[1]).toContain('whatsapp');
      expect(insertCall[1]).toContain(42);

      // Verify pending_enrichment status update
      const updatePeCall = mockClient.query.mock.calls[3];
      expect(updatePeCall[0]).toContain("status = 'linked'");

      // Verify contact lastContactDate update
      const updateContactCall = mockClient.query.mock.calls[4];
      expect(updateContactCall[0]).toContain('UPDATE contacts');
      expect(updateContactCall[0]).toContain('last_contact_date');
      expect(updateContactCall[1]).toContain(lastMsgDate);
      expect(updateContactCall[1]).toContain('contact-1');
    });

    it('should skip lastContactDate update when no last_message_date', async () => {
      // Fetch pending_enrichment (no last_message_date)
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'pe-2', user_id: testUserId, status: 'pending',
          import_record_id: 'imp-1', interaction_summary_id: 'is-2',
          suggested_contact_id: 'contact-2', platform: 'instagram',
          message_count: 5, first_message_date: null, last_message_date: null,
        }],
      });
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // INSERT enrichment_record
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'er-new-2' }] });
      // UPDATE pending_enrichment status
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // COMMIT (no contact update since last_message_date is null)
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/imports/matches/pe-2/confirm')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ confirmed: true, enrichmentRecordId: 'er-new-2' });

      // Should be 5 calls: fetch PE, BEGIN, INSERT, UPDATE PE, COMMIT (no contact update)
      expect(mockClient.query).toHaveBeenCalledTimes(5);
    });
  });

  // =========================================================================
  // POST /matches/:matchId/reject
  // =========================================================================

  describe('POST /api/imports/matches/:matchId/reject', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).post('/api/imports/matches/some-id/reject');
      expect(res.status).toBe(401);
    });

    it('should return 404 when match not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/imports/matches/nonexistent-id/reject')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Match not found');
    });

    it('should return 400 when match already resolved', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pe-1', status: 'dismissed' }] });

      const res = await request(app)
        .post('/api/imports/matches/pe-1/reject')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Match has already been resolved');
    });

    it('should reject match and set status to dismissed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pe-1', status: 'pending' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/imports/matches/pe-1/reject')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ rejected: true });

      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain("status = 'dismissed'");
      expect(updateCall[0]).toContain('resolved_at = NOW()');
    });
  });

  // =========================================================================
  // POST /matches/:matchId/skip
  // =========================================================================

  describe('POST /api/imports/matches/:matchId/skip', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).post('/api/imports/matches/some-id/skip');
      expect(res.status).toBe(401);
    });

    it('should return 404 when match not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/imports/matches/nonexistent-id/skip')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Match not found');
    });

    it('should return 400 when match already resolved', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pe-1', status: 'linked' }] });

      const res = await request(app)
        .post('/api/imports/matches/pe-1/skip')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Match has already been resolved');
    });

    it('should skip match and keep status as pending', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pe-1', status: 'pending' }] });

      const res = await request(app)
        .post('/api/imports/matches/pe-1/skip')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ skipped: true });

      // Should only have the SELECT query, no UPDATE
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });
});
