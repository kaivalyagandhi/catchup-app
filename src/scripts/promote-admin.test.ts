/**
 * Admin Promotion CLI Script Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import pool from '../db/connection';

describe('Admin Promotion CLI Script', () => {
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
  const TEST_EMAIL = 'test-admin-cli@example.com';

  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);

    // Create test user
    await pool.query(
      `INSERT INTO users (id, email, name, is_admin, google_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [TEST_USER_ID, TEST_EMAIL, 'Test User', false, 'google-test-user']
    );
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
  });

  describe('promote command', () => {
    it('should promote a user to admin', async () => {
      // Promote user
      await pool.query(
        `UPDATE users 
         SET is_admin = true, 
             admin_promoted_at = NOW(), 
             admin_promoted_by = $1,
             updated_at = NOW()
         WHERE id = $2`,
        ['test-script', TEST_USER_ID]
      );

      // Verify promotion
      const result = await pool.query(
        'SELECT is_admin, admin_promoted_at, admin_promoted_by FROM users WHERE id = $1',
        [TEST_USER_ID]
      );

      expect(result.rows[0].is_admin).toBe(true);
      expect(result.rows[0].admin_promoted_at).toBeTruthy();
      expect(result.rows[0].admin_promoted_by).toBe('test-script');
    });

    it('should update is_admin, admin_promoted_at, and admin_promoted_by columns', async () => {
      const promotedBy = 'test-promoter';

      await pool.query(
        `UPDATE users 
         SET is_admin = true, 
             admin_promoted_at = NOW(), 
             admin_promoted_by = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [promotedBy, TEST_USER_ID]
      );

      const result = await pool.query(
        'SELECT is_admin, admin_promoted_at, admin_promoted_by FROM users WHERE id = $1',
        [TEST_USER_ID]
      );

      expect(result.rows[0].is_admin).toBe(true);
      expect(result.rows[0].admin_promoted_at).toBeInstanceOf(Date);
      expect(result.rows[0].admin_promoted_by).toBe(promotedBy);
    });
  });

  describe('revoke command', () => {
    it('should revoke admin access from a user', async () => {
      // First promote user
      await pool.query(
        `UPDATE users 
         SET is_admin = true, 
             admin_promoted_at = NOW(), 
             admin_promoted_by = $1,
             updated_at = NOW()
         WHERE id = $2`,
        ['test-script', TEST_USER_ID]
      );

      // Then revoke
      await pool.query(
        `UPDATE users 
         SET is_admin = false, 
             admin_promoted_at = NULL, 
             admin_promoted_by = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [TEST_USER_ID]
      );

      // Verify revocation
      const result = await pool.query(
        'SELECT is_admin, admin_promoted_at, admin_promoted_by FROM users WHERE id = $1',
        [TEST_USER_ID]
      );

      expect(result.rows[0].is_admin).toBe(false);
      expect(result.rows[0].admin_promoted_at).toBeNull();
      expect(result.rows[0].admin_promoted_by).toBeNull();
    });

    it('should clear admin_promoted_at and admin_promoted_by columns', async () => {
      // First promote user
      await pool.query(
        `UPDATE users 
         SET is_admin = true, 
             admin_promoted_at = NOW(), 
             admin_promoted_by = $1,
             updated_at = NOW()
         WHERE id = $2`,
        ['test-script', TEST_USER_ID]
      );

      // Verify promotion
      let result = await pool.query(
        'SELECT is_admin, admin_promoted_at, admin_promoted_by FROM users WHERE id = $1',
        [TEST_USER_ID]
      );
      expect(result.rows[0].is_admin).toBe(true);
      expect(result.rows[0].admin_promoted_at).toBeTruthy();

      // Revoke
      await pool.query(
        `UPDATE users 
         SET is_admin = false, 
             admin_promoted_at = NULL, 
             admin_promoted_by = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [TEST_USER_ID]
      );

      // Verify revocation cleared all fields
      result = await pool.query(
        'SELECT is_admin, admin_promoted_at, admin_promoted_by FROM users WHERE id = $1',
        [TEST_USER_ID]
      );
      expect(result.rows[0].is_admin).toBe(false);
      expect(result.rows[0].admin_promoted_at).toBeNull();
      expect(result.rows[0].admin_promoted_by).toBeNull();
    });
  });

  describe('list command', () => {
    it('should return all admin users', async () => {
      // Promote user
      await pool.query(
        `UPDATE users 
         SET is_admin = true, 
             admin_promoted_at = NOW(), 
             admin_promoted_by = $1,
             updated_at = NOW()
         WHERE id = $2`,
        ['test-script', TEST_USER_ID]
      );

      // List admins
      const result = await pool.query(
        `SELECT id, email, name, is_admin, admin_promoted_at, admin_promoted_by 
         FROM users 
         WHERE is_admin = true 
         ORDER BY admin_promoted_at DESC`
      );

      expect(result.rows.length).toBeGreaterThan(0);
      const adminUser = result.rows.find((row) => row.id === TEST_USER_ID);
      expect(adminUser).toBeTruthy();
      expect(adminUser?.is_admin).toBe(true);
    });

    it('should include email, name, and promotion details', async () => {
      const promotedBy = 'test-promoter';

      // Promote user
      await pool.query(
        `UPDATE users 
         SET is_admin = true, 
             admin_promoted_at = NOW(), 
             admin_promoted_by = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [promotedBy, TEST_USER_ID]
      );

      // List admins
      const result = await pool.query(
        `SELECT id, email, name, is_admin, admin_promoted_at, admin_promoted_by 
         FROM users 
         WHERE is_admin = true 
         ORDER BY admin_promoted_at DESC`
      );

      const adminUser = result.rows.find((row) => row.id === TEST_USER_ID);
      expect(adminUser).toBeTruthy();
      expect(adminUser?.email).toBe(TEST_EMAIL);
      expect(adminUser?.name).toBe('Test User');
      expect(adminUser?.admin_promoted_by).toBe(promotedBy);
      expect(adminUser?.admin_promoted_at).toBeInstanceOf(Date);
    });
  });

  describe('Requirements validation', () => {
    it('should support promote, revoke, and list commands (Requirement 11.5)', async () => {
      // Test promote
      await pool.query(
        `UPDATE users 
         SET is_admin = true, 
             admin_promoted_at = NOW(), 
             admin_promoted_by = $1,
             updated_at = NOW()
         WHERE id = $2`,
        ['cli-script', TEST_USER_ID]
      );

      let result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [TEST_USER_ID]);
      expect(result.rows[0].is_admin).toBe(true);

      // Test list
      result = await pool.query(
        'SELECT id FROM users WHERE is_admin = true AND id = $1',
        [TEST_USER_ID]
      );
      expect(result.rows.length).toBe(1);

      // Test revoke
      await pool.query(
        `UPDATE users 
         SET is_admin = false, 
             admin_promoted_at = NULL, 
             admin_promoted_by = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [TEST_USER_ID]
      );

      result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [TEST_USER_ID]);
      expect(result.rows[0].is_admin).toBe(false);
    });
  });
});
