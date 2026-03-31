/**
 * Google Sync-Back Service Tests
 *
 * Tests for the sync-back service that manages pushing local CatchUp edits
 * back to Google Contacts with user review and approval.
 *
 * Requirements: 13.1, 13.4, 13.5, 13.6, 13.7, 13.8
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  GoogleSyncBackServiceImpl,
  mapFieldToColumn,
  type SyncBackOperation,
} from './google-sync-back-service';

// Mock the database pool
vi.mock('../db/connection', () => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  return {
    default: {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(mockClient),
      __mockClient: mockClient,
    },
  };
});

// Mock Cloud Tasks (not used directly — injected via constructor)
vi.mock('../jobs/cloud-tasks-client', () => ({
  CloudTasksQueue: vi.fn(),
}));

import pool from '../db/connection';

const mockPool = pool as any;
const mockClient = mockPool.__mockClient;

describe('GoogleSyncBackServiceImpl', () => {
  let service: GoogleSyncBackServiceImpl;
  let mockEnqueueJob: ReturnType<typeof vi.fn>;
  let mockFetchGoogleContact: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEnqueueJob = vi.fn().mockResolvedValue(undefined);
    mockFetchGoogleContact = vi.fn();

    service = new GoogleSyncBackServiceImpl({
      enqueueJob: mockEnqueueJob as any,
      fetchGoogleContact: mockFetchGoogleContact as any,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSyncBackOperation', () => {
    const userId = 'user-1';
    const contactId = 'contact-1';

    it('should create a pending_review operation for a valid field edit', async () => {
      // Contact exists and is Google-synced
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: contactId, google_resource_name: 'people/c123' }],
        })
        // google_etag lookup
        .mockResolvedValueOnce({
          rows: [{ google_etag: 'etag-abc' }],
        })
        // INSERT returning the new operation
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'op-1',
              user_id: userId,
              contact_id: contactId,
              field: 'name',
              previous_value: 'Old Name',
              new_value: 'New Name',
              status: 'pending_review',
              google_etag: 'etag-abc',
              conflict_google_value: null,
              created_at: new Date('2024-01-01'),
              resolved_at: null,
            },
          ],
        });

      const result = await service.createSyncBackOperation(
        userId,
        contactId,
        'name',
        'Old Name',
        'New Name'
      );

      expect(result.id).toBe('op-1');
      expect(result.status).toBe('pending_review');
      expect(result.field).toBe('name');
      expect(result.previousValue).toBe('Old Name');
      expect(result.newValue).toBe('New Name');
      expect(result.googleEtag).toBe('etag-abc');
    });

    it('should reject unsupported fields', async () => {
      await expect(
        service.createSyncBackOperation(userId, contactId, 'location', 'old', 'new')
      ).rejects.toThrow("Field 'location' is not eligible for sync-back");
    });

    it('should reject if contact not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.createSyncBackOperation(userId, contactId, 'name', 'old', 'new')
      ).rejects.toThrow('Contact not found or does not belong to user');
    });

    it('should reject if contact has no googleResourceName', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: contactId, google_resource_name: null }],
      });

      await expect(
        service.createSyncBackOperation(userId, contactId, 'email', 'old', 'new')
      ).rejects.toThrow('Contact is not synced with Google Contacts');
    });

    it('should handle all syncable fields', async () => {
      for (const field of ['name', 'phone', 'email', 'customNotes']) {
        vi.clearAllMocks();
        mockPool.query
          .mockResolvedValueOnce({
            rows: [{ id: contactId, google_resource_name: 'people/c123' }],
          })
          .mockResolvedValueOnce({ rows: [{ google_etag: null }] })
          .mockResolvedValueOnce({
            rows: [
              {
                id: `op-${field}`,
                user_id: userId,
                contact_id: contactId,
                field,
                previous_value: null,
                new_value: 'val',
                status: 'pending_review',
                google_etag: null,
                conflict_google_value: null,
                created_at: new Date(),
                resolved_at: null,
              },
            ],
          });

        const result = await service.createSyncBackOperation(userId, contactId, field, null, 'val');
        expect(result.field).toBe(field);
        expect(result.status).toBe('pending_review');
      }
    });
  });

  describe('getPendingOperations', () => {
    it('should return all pending_review operations for a user', async () => {
      const rows = [
        {
          id: 'op-1',
          user_id: 'user-1',
          contact_id: 'c-1',
          field: 'name',
          previous_value: 'A',
          new_value: 'B',
          status: 'pending_review',
          google_etag: null,
          conflict_google_value: null,
          created_at: new Date('2024-01-02'),
          resolved_at: null,
        },
        {
          id: 'op-2',
          user_id: 'user-1',
          contact_id: 'c-2',
          field: 'email',
          previous_value: 'a@b.com',
          new_value: 'c@d.com',
          status: 'pending_review',
          google_etag: 'etag-1',
          conflict_google_value: null,
          created_at: new Date('2024-01-01'),
          resolved_at: null,
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows });

      const result = await service.getPendingOperations('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('op-1');
      expect(result[1].id).toBe('op-2');
    });

    it('should return empty array when no pending operations', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getPendingOperations('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('approveOperations', () => {
    it('should mark operations as approved and enqueue jobs', async () => {
      const approvedRows = [
        {
          id: 'op-1',
          user_id: 'user-1',
          contact_id: 'c-1',
          field: 'name',
          previous_value: 'A',
          new_value: 'B',
          status: 'approved',
          google_etag: null,
          conflict_google_value: null,
          created_at: new Date(),
          resolved_at: null,
        },
      ];

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: approvedRows }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      await service.approveOperations('user-1', ['op-1']);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockEnqueueJob).toHaveBeenCalledWith('op-1', 'user-1');
    });

    it('should do nothing for empty operationIds', async () => {
      await service.approveOperations('user-1', []);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should throw if no eligible operations found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // UPDATE returns nothing

      await expect(service.approveOperations('user-1', ['op-bad'])).rejects.toThrow(
        'No eligible operations found to approve'
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should mark operation as failed if enqueue fails', async () => {
      const approvedRows = [
        {
          id: 'op-1',
          user_id: 'user-1',
          contact_id: 'c-1',
          field: 'name',
          previous_value: 'A',
          new_value: 'B',
          status: 'approved',
          google_etag: null,
          conflict_google_value: null,
          created_at: new Date(),
          resolved_at: null,
        },
      ];

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: approvedRows }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      mockEnqueueJob.mockRejectedValueOnce(new Error('Cloud Tasks unavailable'));
      mockPool.query.mockResolvedValueOnce(undefined); // fallback status update to 'failed'

      await service.approveOperations('user-1', ['op-1']);

      // Should have tried to mark as failed
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'failed'"),
        ['op-1']
      );
    });
  });

  describe('skipOperations', () => {
    it('should mark operations as skipped', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 2 });

      await service.skipOperations('user-1', ['op-1', 'op-2']);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'skipped'"),
        [['op-1', 'op-2'], 'user-1']
      );
    });

    it('should do nothing for empty operationIds', async () => {
      await service.skipOperations('user-1', []);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should throw if no eligible operations found', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      await expect(service.skipOperations('user-1', ['op-bad'])).rejects.toThrow(
        'No eligible operations found to skip'
      );
    });
  });

  describe('undoOperation', () => {
    it('should revert local contact field and mark as skipped', async () => {
      mockPool.query
        // Fetch the operation
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'op-1',
              user_id: 'user-1',
              contact_id: 'c-1',
              field: 'name',
              previous_value: 'Original Name',
              new_value: 'Changed Name',
              status: 'synced',
              google_etag: null,
              conflict_google_value: null,
              created_at: new Date(),
              resolved_at: null,
            },
          ],
        })
        // Update contacts table
        .mockResolvedValueOnce(undefined)
        // Update sync_back_operations status
        .mockResolvedValueOnce(undefined);

      await service.undoOperation('user-1', 'op-1');

      // Should revert the contact's name
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE contacts SET name'),
        ['Original Name', 'c-1', 'user-1']
      );

      // Should mark operation as skipped
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'skipped'"),
        ['op-1']
      );
    });

    it('should throw if operation not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.undoOperation('user-1', 'op-bad')).rejects.toThrow(
        'Operation not found or does not belong to user'
      );
    });

    it('should throw if operation status is not undoable', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'op-1',
            user_id: 'user-1',
            contact_id: 'c-1',
            field: 'name',
            previous_value: 'A',
            new_value: 'B',
            status: 'failed',
            google_etag: null,
            conflict_google_value: null,
            created_at: new Date(),
            resolved_at: null,
          },
        ],
      });

      await expect(service.undoOperation('user-1', 'op-1')).rejects.toThrow(
        "Cannot undo operation with status 'failed'"
      );
    });

    it('should handle undo for customNotes field', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'op-1',
              user_id: 'user-1',
              contact_id: 'c-1',
              field: 'customNotes',
              previous_value: 'Old notes',
              new_value: 'New notes',
              status: 'pending_review',
              google_etag: null,
              conflict_google_value: null,
              created_at: new Date(),
              resolved_at: null,
            },
          ],
        })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      await service.undoOperation('user-1', 'op-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE contacts SET custom_notes'),
        ['Old notes', 'c-1', 'user-1']
      );
    });
  });

  describe('handleConflict', () => {
    it('should fetch latest from Google and set status to conflict', async () => {
      // Fetch operation + contact join
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'op-1',
              user_id: 'user-1',
              contact_id: 'c-1',
              field: 'email',
              previous_value: 'old@test.com',
              new_value: 'new@test.com',
              status: 'syncing',
              google_etag: 'old-etag',
              conflict_google_value: null,
              created_at: new Date(),
              resolved_at: null,
              google_resource_name: 'people/c123',
            },
          ],
        })
        // UPDATE with conflict info
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'op-1',
              user_id: 'user-1',
              contact_id: 'c-1',
              field: 'email',
              previous_value: 'old@test.com',
              new_value: 'new@test.com',
              status: 'conflict',
              google_etag: 'new-etag',
              conflict_google_value: 'google@test.com',
              created_at: new Date(),
              resolved_at: null,
            },
          ],
        });

      mockFetchGoogleContact.mockResolvedValueOnce({
        etag: 'new-etag',
        fieldValues: {
          name: 'Google Name',
          phone: null,
          email: 'google@test.com',
          customNotes: null,
        },
      });

      const result = await service.handleConflict('user-1', 'op-1');

      expect(result.status).toBe('conflict');
      expect(result.googleEtag).toBe('new-etag');
      expect(result.conflictGoogleValue).toBe('google@test.com');
      expect(mockFetchGoogleContact).toHaveBeenCalledWith('user-1', 'people/c123');
    });

    it('should throw if operation not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.handleConflict('user-1', 'op-bad')).rejects.toThrow(
        'Operation not found or does not belong to user'
      );
    });

    it('should throw if contact has no Google resource name', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'op-1',
            user_id: 'user-1',
            contact_id: 'c-1',
            field: 'name',
            previous_value: 'A',
            new_value: 'B',
            status: 'syncing',
            google_etag: null,
            conflict_google_value: null,
            created_at: new Date(),
            resolved_at: null,
            google_resource_name: null,
          },
        ],
      });

      await expect(service.handleConflict('user-1', 'op-1')).rejects.toThrow(
        'Contact has no Google resource name'
      );
    });

    it('should throw if Google fetch fails', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'op-1',
            user_id: 'user-1',
            contact_id: 'c-1',
            field: 'name',
            previous_value: 'A',
            new_value: 'B',
            status: 'syncing',
            google_etag: null,
            conflict_google_value: null,
            created_at: new Date(),
            resolved_at: null,
            google_resource_name: 'people/c123',
          },
        ],
      });

      mockFetchGoogleContact.mockResolvedValueOnce(null);

      await expect(service.handleConflict('user-1', 'op-1')).rejects.toThrow(
        'Failed to fetch contact from Google'
      );
    });
  });
});

describe('mapFieldToColumn', () => {
  it('should map name to name', () => {
    expect(mapFieldToColumn('name')).toBe('name');
  });

  it('should map phone to phone', () => {
    expect(mapFieldToColumn('phone')).toBe('phone');
  });

  it('should map email to email', () => {
    expect(mapFieldToColumn('email')).toBe('email');
  });

  it('should map customNotes to custom_notes', () => {
    expect(mapFieldToColumn('customNotes')).toBe('custom_notes');
  });

  it('should throw for unknown fields', () => {
    expect(() => mapFieldToColumn('address')).toThrow('Unknown sync-back field: address');
  });
});
