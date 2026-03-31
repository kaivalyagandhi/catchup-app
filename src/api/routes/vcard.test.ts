/**
 * Tests for vCard Import/Export API Routes
 *
 * POST /api/contacts/import-vcard — Import contacts from vCard file
 * GET  /api/contacts/export-vcard — Export contacts to vCard 4.0
 *
 * Requirements: 14.4, 14.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
import { generateToken } from '../middleware/auth';

// Mock the database pool
const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockClientQuery = vi.fn();
const mockClientRelease = vi.fn();

vi.mock('../../db/connection', () => ({
  default: {
    query: (...args: any[]) => mockQuery(...args),
    connect: (...args: any[]) => mockConnect(...args),
    end: vi.fn(),
  },
}));

// Mock Cloud Tasks (imported transitively)
vi.mock('../../jobs/cloud-tasks-client', () => ({
  CloudTasksQueue: class {
    add = vi.fn().mockResolvedValue('task-id');
    close = vi.fn().mockResolvedValue(undefined);
  },
}));

describe('vCard API Routes', () => {
  const app = createServer();
  const testUserId = 'test-user-vcard-123';
  let authToken: string;

  const sampleVCard = [
    'BEGIN:VCARD',
    'VERSION:4.0',
    'FN:John Doe',
    'N:Doe;John;;;',
    'TEL;TYPE=cell:+15551234567',
    'EMAIL;TYPE=home:john@example.com',
    'END:VCARD',
  ].join('\r\n');

  beforeEach(() => {
    authToken = generateToken(testUserId);
    vi.clearAllMocks();

    // Default mock client for transactions
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── POST /api/contacts/import-vcard ─────────────────────────────────────

  describe('POST /api/contacts/import-vcard', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/contacts/import-vcard')
        .send({ fileContent: sampleVCard });

      expect(res.status).toBe(401);
    });

    it('should return 400 when fileContent is missing', async () => {
      const res = await request(app)
        .post('/api/contacts/import-vcard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing');
    });

    it('should return 400 for empty fileContent', async () => {
      const res = await request(app)
        .post('/api/contacts/import-vcard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fileContent: '' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for non-vCard content', async () => {
      const res = await request(app)
        .post('/api/contacts/import-vcard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fileContent: 'This is not a vCard file' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid vCard');
    });

    it('should import contacts from valid vCard and create new contacts', async () => {
      // Mock: no existing contacts
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Mock client transaction queries
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'new-contact-1' }] }) // INSERT contact
        .mockResolvedValueOnce(undefined); // COMMIT

      const res = await request(app)
        .post('/api/contacts/import-vcard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fileContent: sampleVCard });

      expect(res.status).toBe(200);
      expect(res.body.imported).toBe(1);
      expect(res.body.created).toBe(1);
      expect(res.body.merged).toBe(0);
      expect(res.body.errors).toHaveLength(0);
    });

    it('should merge when matching contact exists', async () => {
      // Mock: existing contact with matching phone
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'existing-1',
            name: 'John Doe',
            phone: '+15551234567',
            email: null,
            instagram: null,
            x_handle: null,
            linked_in: null,
          },
        ],
      });

      // Mock client transaction queries
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        // mergeVCardIntoContact: SELECT current contact
        .mockResolvedValueOnce({
          rows: [{ phone: '+15551234567', email: null, custom_notes: null, location: null, instagram: null, x_handle: null, linked_in: null }],
        })
        // mergeVCardIntoContact: UPDATE with missing email
        .mockResolvedValueOnce({ rowCount: 1 })
        // addSourceToContact
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce(undefined); // COMMIT

      const res = await request(app)
        .post('/api/contacts/import-vcard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fileContent: sampleVCard });

      expect(res.status).toBe(200);
      expect(res.body.imported).toBe(1);
      expect(res.body.merged).toBe(1);
      expect(res.body.created).toBe(0);
    });

    it('should report parse errors for malformed entries', async () => {
      const malformedVCard = [
        'BEGIN:VCARD',
        'VERSION:4.0',
        'TEL:+1234567890', // No FN
        'END:VCARD',
      ].join('\r\n');

      const res = await request(app)
        .post('/api/contacts/import-vcard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fileContent: malformedVCard });

      expect(res.status).toBe(200);
      expect(res.body.imported).toBe(0);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  // ─── GET /api/contacts/export-vcard ──────────────────────────────────────

  describe('GET /api/contacts/export-vcard', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/contacts/export-vcard');
      expect(res.status).toBe(401);
    });

    it('should export all contacts as vCard 4.0', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'c1',
            user_id: testUserId,
            name: 'Alice',
            phone: '+15551111111',
            email: 'alice@example.com',
            linked_in: null,
            instagram: null,
            x_handle: null,
            other_social_media: null,
            location: null,
            timezone: null,
            custom_notes: null,
            last_contact_date: null,
            frequency_preference: null,
            groups: [],
            tags: [],
            archived_at: null,
            sources: ['manual'],
            google_resource_name: null,
            google_etag: null,
            last_synced_at: null,
            dunbar_circle: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const res = await request(app)
        .get('/api/contacts/export-vcard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/vcard');
      expect(res.headers['content-disposition']).toContain('contacts.vcf');
      expect(res.text).toContain('BEGIN:VCARD');
      expect(res.text).toContain('VERSION:4.0');
      expect(res.text).toContain('FN:Alice');
      expect(res.text).toContain('END:VCARD');
    });

    it('should export specific contacts when contactIds provided', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'c1',
            user_id: testUserId,
            name: 'Bob',
            phone: null,
            email: 'bob@example.com',
            linked_in: null,
            instagram: null,
            x_handle: null,
            other_social_media: null,
            location: null,
            timezone: null,
            custom_notes: null,
            last_contact_date: null,
            frequency_preference: null,
            groups: [],
            tags: [],
            archived_at: null,
            sources: ['manual'],
            google_resource_name: null,
            google_etag: null,
            last_synced_at: null,
            dunbar_circle: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const res = await request(app)
        .get('/api/contacts/export-vcard?contactIds=c1,c2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('FN:Bob');

      // Verify the query used the contactIds filter
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ANY'),
        expect.arrayContaining([testUserId, ['c1', 'c2']]),
      );
    });

    it('should return empty vCard for user with no contacts', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/contacts/export-vcard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.text).not.toContain('BEGIN:VCARD');
    });
  });
});
