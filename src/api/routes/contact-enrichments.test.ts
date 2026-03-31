/**
 * Tests for Contact Enrichment API Routes
 *
 * GET    /api/contacts/:id/enrichments              — Get enrichment records for a contact
 * DELETE /api/contacts/:id/enrichments/:enrichmentId — Delete an enrichment record
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
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

describe('Contact Enrichment API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-contact-enrich-123';
  let authToken: string;

  beforeEach(() => {
    authToken = generateToken(testUserId);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });


  // =========================================================================
  // GET /:id/enrichments
  // =========================================================================

  describe('GET /api/contacts/:id/enrichments', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/contacts/some-id/enrichments');
      expect(res.status).toBe(401);
    });

    it('should return 404 when contact not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // contact lookup

      const res = await request(app)
        .get('/api/contacts/nonexistent/enrichments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Contact not found');
    });

    it('should return empty enrichment data when no records exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'contact-1' }] }); // contact exists
      mockQuery.mockResolvedValueOnce({ rows: [] }); // no enrichment records

      const res = await request(app)
        .get('/api/contacts/contact-1/enrichments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        contactId: 'contact-1',
        totalMessageCount: 0,
        lastInteractionDate: null,
        platforms: [],
        records: [],
      });
    });

    it('should return aggregated enrichment data for a single platform', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'contact-1' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'er-1',
            contact_id: 'contact-1',
            user_id: testUserId,
            import_record_id: 'ir-1',
            interaction_summary_id: 'is-1',
            platform: 'whatsapp',
            message_count: 50,
            first_message_date: '2023-01-01T00:00:00Z',
            last_message_date: '2024-01-15T00:00:00Z',
            avg_messages_per_month: '4.17',
            topics: '["travel","food"]',
            sentiment: 'positive',
            raw_data_reference: 'abc123',
            imported_at: '2024-02-01T00:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .get('/api/contacts/contact-1/enrichments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.contactId).toBe('contact-1');
      expect(res.body.totalMessageCount).toBe(50);
      expect(res.body.lastInteractionDate).toBe('2024-01-15T00:00:00.000Z');
      expect(res.body.platforms).toHaveLength(1);
      expect(res.body.platforms[0].platform).toBe('whatsapp');
      expect(res.body.platforms[0].messageCount).toBe(50);
      expect(res.body.platforms[0].topics).toEqual(['travel', 'food']);
      expect(res.body.platforms[0].sentiment).toBe('positive');
      expect(res.body.records).toHaveLength(1);
      expect(res.body.records[0].id).toBe('er-1');
      expect(res.body.records[0].avgMessagesPerMonth).toBe(4.17);
    });

    it('should aggregate enrichment data across multiple platforms', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'contact-1' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'er-1',
            contact_id: 'contact-1',
            user_id: testUserId,
            import_record_id: 'ir-1',
            interaction_summary_id: 'is-1',
            platform: 'whatsapp',
            message_count: 50,
            first_message_date: '2023-01-01T00:00:00Z',
            last_message_date: '2024-01-15T00:00:00Z',
            avg_messages_per_month: '4.17',
            topics: '["travel"]',
            sentiment: 'positive',
            raw_data_reference: 'abc123',
            imported_at: '2024-02-01T00:00:00Z',
          },
          {
            id: 'er-2',
            contact_id: 'contact-1',
            user_id: testUserId,
            import_record_id: 'ir-2',
            interaction_summary_id: 'is-2',
            platform: 'instagram',
            message_count: 30,
            first_message_date: '2023-06-01T00:00:00Z',
            last_message_date: '2024-02-01T00:00:00Z',
            avg_messages_per_month: '3.75',
            topics: '["music","travel"]',
            sentiment: 'neutral',
            raw_data_reference: 'def456',
            imported_at: '2024-02-15T00:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .get('/api/contacts/contact-1/enrichments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalMessageCount).toBe(80);
      expect(res.body.lastInteractionDate).toBe('2024-02-01T00:00:00.000Z');
      expect(res.body.platforms).toHaveLength(2);

      const whatsapp = res.body.platforms.find((p: any) => p.platform === 'whatsapp');
      const instagram = res.body.platforms.find((p: any) => p.platform === 'instagram');

      expect(whatsapp.messageCount).toBe(50);
      expect(instagram.messageCount).toBe(30);
      expect(instagram.topics).toContain('music');
      expect(instagram.topics).toContain('travel');
      expect(res.body.records).toHaveLength(2);
    });

    it('should aggregate multiple records from the same platform', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'contact-1' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'er-1',
            contact_id: 'contact-1',
            user_id: testUserId,
            import_record_id: 'ir-1',
            interaction_summary_id: 'is-1',
            platform: 'whatsapp',
            message_count: 50,
            first_message_date: '2023-01-01T00:00:00Z',
            last_message_date: '2023-12-01T00:00:00Z',
            avg_messages_per_month: '4.17',
            topics: '["travel"]',
            sentiment: 'positive',
            raw_data_reference: 'abc123',
            imported_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'er-2',
            contact_id: 'contact-1',
            user_id: testUserId,
            import_record_id: 'ir-2',
            interaction_summary_id: 'is-2',
            platform: 'whatsapp',
            message_count: 20,
            first_message_date: '2024-01-01T00:00:00Z',
            last_message_date: '2024-03-01T00:00:00Z',
            avg_messages_per_month: '10.00',
            topics: '["food"]',
            sentiment: 'neutral',
            raw_data_reference: 'def456',
            imported_at: '2024-03-15T00:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .get('/api/contacts/contact-1/enrichments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalMessageCount).toBe(70);
      expect(res.body.platforms).toHaveLength(1);

      const whatsapp = res.body.platforms[0];
      expect(whatsapp.messageCount).toBe(70);
      expect(whatsapp.firstMessageDate).toBe('2023-01-01T00:00:00.000Z');
      expect(whatsapp.lastMessageDate).toBe('2024-03-01T00:00:00.000Z');
      expect(whatsapp.topics).toContain('travel');
      expect(whatsapp.topics).toContain('food');
    });

    it('should handle records with null dates gracefully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'contact-1' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'er-1',
            contact_id: 'contact-1',
            user_id: testUserId,
            import_record_id: 'ir-1',
            interaction_summary_id: 'is-1',
            platform: 'whatsapp',
            message_count: 10,
            first_message_date: null,
            last_message_date: null,
            avg_messages_per_month: null,
            topics: '[]',
            sentiment: null,
            raw_data_reference: null,
            imported_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const res = await request(app)
        .get('/api/contacts/contact-1/enrichments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalMessageCount).toBe(10);
      expect(res.body.lastInteractionDate).toBeNull();
      expect(res.body.platforms[0].firstMessageDate).toBeNull();
      expect(res.body.platforms[0].lastMessageDate).toBeNull();
      expect(res.body.records[0].avgMessagesPerMonth).toBe(0);
    });
  });


  // =========================================================================
  // DELETE /:id/enrichments/:enrichmentId
  // =========================================================================

  describe('DELETE /api/contacts/:id/enrichments/:enrichmentId', () => {
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
        .delete('/api/contacts/contact-1/enrichments/er-1');

      expect(res.status).toBe(401);
    });

    it('should return 404 when contact not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // contact lookup

      const res = await request(app)
        .delete('/api/contacts/nonexistent/enrichments/er-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Contact not found');
    });

    it('should return 404 when enrichment record not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'contact-1' }] }); // contact exists
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // enrichment not found

      const res = await request(app)
        .delete('/api/contacts/contact-1/enrichments/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Enrichment record not found');
    });

    it('should delete enrichment record and recalculate lastContactDate', async () => {
      // Contact exists
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'contact-1' }] });
      // Enrichment exists
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'er-1' }] });
      // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // DELETE enrichment
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // MAX(last_message_date) from remaining records
      mockClient.query.mockResolvedValueOnce({
        rows: [{ max_date: '2023-12-01T00:00:00Z' }],
      });
      // UPDATE contact lastContactDate
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/contacts/contact-1/enrichments/er-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });

      // Verify DELETE was called
      const deleteCall = mockClient.query.mock.calls[3];
      expect(deleteCall[0]).toContain('DELETE FROM enrichment_records');
      expect(deleteCall[1]).toEqual(['er-1']);

      // Verify lastContactDate was updated to the remaining max
      const updateCall = mockClient.query.mock.calls[5];
      expect(updateCall[0]).toContain('UPDATE contacts SET last_contact_date');
      expect(updateCall[1][0]).toBe('2023-12-01T00:00:00Z');
      expect(updateCall[1][1]).toBe('contact-1');
    });

    it('should set lastContactDate to null when no remaining enrichment records', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'contact-1' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'er-1' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // DELETE
      // No remaining records — MAX returns null
      mockClient.query.mockResolvedValueOnce({ rows: [{ max_date: null }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // UPDATE
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request(app)
        .delete('/api/contacts/contact-1/enrichments/er-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });

      // Verify lastContactDate set to null
      const updateCall = mockClient.query.mock.calls[5];
      expect(updateCall[1][0]).toBeNull();
    });
  });
});
