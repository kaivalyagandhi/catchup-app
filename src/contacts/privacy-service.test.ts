/**
 * Privacy Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrivacyService } from './privacy-service';
import pool from '../db/connection';
import { randomUUID } from 'crypto';

describe('PrivacyService', () => {
  let privacyService: PrivacyService;
  let testUserId: string;
  let testEmail: string;

  beforeEach(() => {
    privacyService = new PrivacyService();
    testUserId = randomUUID();
    testEmail = `test-${Date.now()}-${Math.random()}@example.com`;
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await pool.query('DELETE FROM contacts WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM onboarding_state WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('exportUserData', () => {
    it('should export all user data', async () => {
      // Create test user
      await pool.query(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        [testUserId, testEmail, 'Test User']
      );

      // Create test contact
      await pool.query(
        `INSERT INTO contacts (user_id, name, email) VALUES ($1, $2, $3)`,
        [testUserId, 'Test Contact', 'contact@example.com']
      );

      const exportData = await privacyService.exportUserData({
        userId: testUserId,
        includeContacts: true
      });

      expect(exportData).toBeDefined();
      expect(exportData.userId).toBe(testUserId);
      expect(exportData.exportDate).toBeInstanceOf(Date);
      expect(exportData.contacts).toBeDefined();
      expect(exportData.contacts!.length).toBeGreaterThan(0);
    });

    it('should respect export options', async () => {
      // Create test user
      await pool.query(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        [testUserId, testEmail, 'Test User']
      );

      const exportData = await privacyService.exportUserData({
        userId: testUserId,
        includeContacts: false,
        includeInteractions: false
      });

      expect(exportData.contacts).toBeUndefined();
      expect(exportData.interactions).toBeUndefined();
    });

    it('should handle empty data gracefully', async () => {
      // Create test user with no data
      await pool.query(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        [testUserId, testEmail, 'Test User']
      );

      const exportData = await privacyService.exportUserData({
        userId: testUserId
      });

      expect(exportData).toBeDefined();
      expect(exportData.contacts).toBeDefined();
      expect(exportData.contacts!.length).toBe(0);
    });
  });

  describe('deleteAccount', () => {
    it('should delete all user data', async () => {
      // Create test user
      await pool.query(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        [testUserId, testEmail, 'Test User']
      );

      // Create test contact
      await pool.query(
        `INSERT INTO contacts (user_id, name, email) VALUES ($1, $2, $3)`,
        [testUserId, 'Test Contact', 'contact@example.com']
      );

      const result = await privacyService.deleteAccount(testUserId);

      expect(result.success).toBe(true);
      expect(result.deletedRecords.contacts).toBeGreaterThan(0);

      // Verify user is deleted
      const userCheck = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [testUserId]
      );
      expect(userCheck.rows.length).toBe(0);

      // Verify contacts are deleted
      const contactsCheck = await pool.query(
        'SELECT * FROM contacts WHERE user_id = $1',
        [testUserId]
      );
      expect(contactsCheck.rows.length).toBe(0);
    });

    it('should be atomic - rollback on error', async () => {
      // Create test user
      await pool.query(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        [testUserId, testEmail, 'Test User']
      );

      // Mock a database error during deletion
      const originalQuery = pool.query;
      let queryCount = 0;
      pool.query = vi.fn(async (...args) => {
        queryCount++;
        // Fail after a few queries to test rollback
        if (queryCount > 5) {
          throw new Error('Simulated database error');
        }
        return originalQuery.apply(pool, args);
      }) as any;

      try {
        await privacyService.deleteAccount(testUserId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Restore original query function
      pool.query = originalQuery;

      // Verify user still exists (rollback worked)
      const userCheck = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [testUserId]
      );
      expect(userCheck.rows.length).toBe(1);
    });
  });

  describe('verifyDataIsolation', () => {
    it('should verify contact ownership', async () => {
      // Create test user
      await pool.query(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        [testUserId, testEmail, 'Test User']
      );

      // Create test contact
      const contactResult = await pool.query(
        `INSERT INTO contacts (user_id, name, email) 
         VALUES ($1, $2, $3) RETURNING id`,
        [testUserId, 'Test Contact', 'contact@example.com']
      );
      const contactId = contactResult.rows[0].id;

      const isOwner = await privacyService.verifyDataIsolation(
        testUserId,
        contactId,
        'contact'
      );

      expect(isOwner).toBe(true);
    });

    it('should reject non-owner access', async () => {
      // Create test user
      await pool.query(
        'INSERT INTO users (id, email, name) VALUES ($1, $2, $3)',
        [testUserId, testEmail, 'Test User']
      );

      // Create test contact
      const contactResult = await pool.query(
        `INSERT INTO contacts (user_id, name, email) 
         VALUES ($1, $2, $3) RETURNING id`,
        [testUserId, 'Test Contact', 'contact@example.com']
      );
      const contactId = contactResult.rows[0].id;

      const isOwner = await privacyService.verifyDataIsolation(
        'different-user-id',
        contactId,
        'contact'
      );

      expect(isOwner).toBe(false);
    });

    it('should handle non-existent resources', async () => {
      const nonExistentId = randomUUID();
      const isOwner = await privacyService.verifyDataIsolation(
        testUserId,
        nonExistentId,
        'contact'
      );

      expect(isOwner).toBe(false);
    });

    it('should throw error for unknown resource type', async () => {
      await expect(
        privacyService.verifyDataIsolation(
          testUserId,
          'some-id',
          'unknown_type' as any
        )
      ).rejects.toThrow('Unknown resource type');
    });
  });

  describe('getPrivacyNotice', () => {
    it('should return privacy notice text', () => {
      const notice = privacyService.getPrivacyNotice();

      expect(notice).toBeDefined();
      expect(notice.length).toBeGreaterThan(0);
      expect(notice).toContain('CatchUp Privacy Notice');
      expect(notice).toContain('Your Data, Your Control');
      expect(notice).toContain('What We Store');
      expect(notice).toContain('Your Rights');
    });

    it('should include current date', () => {
      const notice = privacyService.getPrivacyNotice();
      const currentYear = new Date().getFullYear().toString();

      expect(notice).toContain(currentYear);
    });
  });
});
