/**
 * Account Deletion Service Tests
 *
 * Tests for cascade deletion of SMS/MMS-related data
 *
 * Requirement 10.5: Account deletion cascade
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccountDeletionService } from './account-deletion-service';
import pool from '../db/connection';
import { MediaDownloader } from './media-downloader';

describe('AccountDeletionService', () => {
  let service: AccountDeletionService;
  let mockMediaDownloader: MediaDownloader;
  let testUserId: string;
  let testPhoneNumber: string;

  beforeEach(async () => {
    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`,
      [`test-${Date.now()}@example.com`, 'Test User']
    );
    testUserId = userResult.rows[0].id;

    testPhoneNumber = `+1555${Math.floor(Math.random() * 10000000)}`;

    // Create mock media downloader
    mockMediaDownloader = {
      cleanupTempFiles: vi.fn().mockResolvedValue(0),
    } as any;

    service = new AccountDeletionService(mockMediaDownloader);

  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await pool.query('DELETE FROM enrichment_items WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM user_phone_numbers WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  describe('deleteUserSMSData', () => {
    it('should delete phone numbers for a user', async () => {
      // Create phone number
      await pool.query(
        `INSERT INTO user_phone_numbers (user_id, phone_number, encrypted_phone_number, verified)
         VALUES ($1, $2, $3, $4)`,
        [testUserId, testPhoneNumber, 'encrypted', true]
      );

      // Delete SMS data
      const result = await service.deleteUserSMSData(testUserId);

      expect(result.success).toBe(true);
      expect(result.phoneNumbersDeleted).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify phone number is deleted
      const phoneCheck = await pool.query(
        'SELECT * FROM user_phone_numbers WHERE user_id = $1',
        [testUserId]
      );
      expect(phoneCheck.rows).toHaveLength(0);
    });

    it('should delete SMS enrichments for a user', async () => {
      // Create SMS enrichment
      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testUserId, 'tag', 'add', 'test-tag', 'sms', false, false]
      );

      // Delete SMS data
      const result = await service.deleteUserSMSData(testUserId);

      expect(result.success).toBe(true);
      expect(result.enrichmentsDeleted).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify enrichment is deleted
      const enrichmentCheck = await pool.query(
        `SELECT * FROM enrichment_items WHERE user_id = $1 AND source = 'sms'`,
        [testUserId]
      );
      expect(enrichmentCheck.rows).toHaveLength(0);
    });

    it('should delete MMS enrichments for a user', async () => {
      // Create MMS enrichment
      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, source_metadata, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          testUserId,
          'tag',
          'add',
          'test-tag',
          'mms',
          JSON.stringify({ mediaType: 'audio/ogg' }),
          false,
          false,
        ]
      );

      // Delete SMS data
      const result = await service.deleteUserSMSData(testUserId);

      expect(result.success).toBe(true);
      expect(result.enrichmentsDeleted).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify enrichment is deleted
      const enrichmentCheck = await pool.query(
        `SELECT * FROM enrichment_items WHERE user_id = $1 AND source = 'mms'`,
        [testUserId]
      );
      expect(enrichmentCheck.rows).toHaveLength(0);
    });

    it('should not delete web enrichments', async () => {
      // Create web enrichment
      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testUserId, 'tag', 'add', 'test-tag', 'web', false, false]
      );

      // Delete SMS data
      const result = await service.deleteUserSMSData(testUserId);

      expect(result.success).toBe(true);
      expect(result.enrichmentsDeleted).toBe(0);

      // Verify web enrichment still exists
      const enrichmentCheck = await pool.query(
        `SELECT * FROM enrichment_items WHERE user_id = $1 AND source = 'web'`,
        [testUserId]
      );
      expect(enrichmentCheck.rows).toHaveLength(1);
    });

    it('should delete multiple phone numbers and enrichments', async () => {
      // Create phone number
      await pool.query(
        `INSERT INTO user_phone_numbers (user_id, phone_number, encrypted_phone_number, verified)
         VALUES ($1, $2, $3, $4)`,
        [testUserId, testPhoneNumber, 'encrypted', true]
      );

      // Create multiple enrichments
      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testUserId, 'tag', 'add', 'tag1', 'sms', false, false]
      );
      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testUserId, 'tag', 'add', 'tag2', 'mms', false, false]
      );

      // Delete SMS data
      const result = await service.deleteUserSMSData(testUserId);

      expect(result.success).toBe(true);
      expect(result.phoneNumbersDeleted).toBe(1);
      expect(result.enrichmentsDeleted).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should complete successfully even when temp directory does not exist', async () => {
      // Delete SMS data (temp directory likely doesn't exist in test environment)
      const result = await service.deleteUserSMSData(testUserId);

      // Verify operation completed successfully
      expect(result.success).toBe(true);
      expect(result.tempFilesDeleted).toBe(0); // No files deleted since directory doesn't exist
      expect(result.errors).toHaveLength(0);
    });

    it('should handle case when user has no SMS/MMS data', async () => {
      // Delete SMS data for user with no data
      const result = await service.deleteUserSMSData(testUserId);

      expect(result.success).toBe(true);
      expect(result.phoneNumbersDeleted).toBe(0);
      expect(result.enrichmentsDeleted).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('deleteUserEnrichments', () => {
    it('should delete only SMS/MMS enrichments', async () => {
      // Create SMS and web enrichments
      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testUserId, 'tag', 'add', 'sms-tag', 'sms', false, false]
      );
      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testUserId, 'tag', 'add', 'web-tag', 'web', false, false]
      );

      // Delete enrichments
      const deletedCount = await service.deleteUserEnrichments(testUserId);

      expect(deletedCount).toBe(1);

      // Verify only SMS enrichment is deleted
      const smsCheck = await pool.query(
        `SELECT * FROM enrichment_items WHERE user_id = $1 AND source = 'sms'`,
        [testUserId]
      );
      expect(smsCheck.rows).toHaveLength(0);

      const webCheck = await pool.query(
        `SELECT * FROM enrichment_items WHERE user_id = $1 AND source = 'web'`,
        [testUserId]
      );
      expect(webCheck.rows).toHaveLength(1);
    });
  });

  describe('deleteUserPhoneNumber', () => {
    it('should delete phone number for a user', async () => {
      // Create phone number
      await pool.query(
        `INSERT INTO user_phone_numbers (user_id, phone_number, encrypted_phone_number, verified)
         VALUES ($1, $2, $3, $4)`,
        [testUserId, testPhoneNumber, 'encrypted', true]
      );

      // Delete phone number
      const deletedCount = await service.deleteUserPhoneNumber(testUserId);

      expect(deletedCount).toBe(1);

      // Verify phone number is deleted
      const phoneCheck = await pool.query(
        'SELECT * FROM user_phone_numbers WHERE user_id = $1',
        [testUserId]
      );
      expect(phoneCheck.rows).toHaveLength(0);
    });

    it('should return 0 when user has no phone number', async () => {
      // Delete phone number for user with no phone
      const deletedCount = await service.deleteUserPhoneNumber(testUserId);

      expect(deletedCount).toBe(0);
    });
  });

  describe('getUserSMSDataStats', () => {
    it('should return correct statistics', async () => {
      // Create phone number
      await pool.query(
        `INSERT INTO user_phone_numbers (user_id, phone_number, encrypted_phone_number, verified)
         VALUES ($1, $2, $3, $4)`,
        [testUserId, testPhoneNumber, 'encrypted', true]
      );

      // Create enrichments
      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testUserId, 'tag', 'add', 'sms-tag', 'sms', false, false]
      );
      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testUserId, 'tag', 'add', 'mms-tag', 'mms', false, false]
      );
      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testUserId, 'tag', 'add', 'web-tag', 'web', false, false]
      );

      // Get stats
      const stats = await service.getUserSMSDataStats(testUserId);

      expect(stats.phoneNumbers).toBe(1);
      expect(stats.enrichments).toBe(2);
      expect(stats.enrichmentsBySource.sms).toBe(1);
      expect(stats.enrichmentsBySource.mms).toBe(1);
    });

    it('should return zero stats for user with no data', async () => {
      // Get stats for user with no data
      const stats = await service.getUserSMSDataStats(testUserId);

      expect(stats.phoneNumbers).toBe(0);
      expect(stats.enrichments).toBe(0);
      expect(stats.enrichmentsBySource.sms).toBe(0);
      expect(stats.enrichmentsBySource.mms).toBe(0);
    });
  });
});
