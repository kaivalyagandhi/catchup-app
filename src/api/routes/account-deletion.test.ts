/**
 * Account Deletion API Routes Tests
 *
 * Tests for account deletion endpoints
 *
 * Requirement 10.5: Account deletion cascade
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import accountDeletionRouter from './account-deletion';
import pool from '../../db/connection';

const app = express();
app.use(express.json());
app.use('/api/account', accountDeletionRouter);

describe('Account Deletion API Routes', () => {
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
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await pool.query('DELETE FROM enrichment_items WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM user_phone_numbers WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  describe('GET /api/account/sms-data-stats', () => {
    it('should return statistics for user SMS data', async () => {
      // Create phone number and enrichments
      await pool.query(
        `INSERT INTO user_phone_numbers (user_id, phone_number, encrypted_phone_number, verified)
         VALUES ($1, $2, $3, $4)`,
        [testUserId, testPhoneNumber, 'encrypted', true]
      );

      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testUserId, 'tag', 'add', 'test-tag', 'sms', false, false]
      );

      const response = await request(app)
        .get('/api/account/sms-data-stats')
        .query({ userId: testUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats.phoneNumbers).toBe(1);
      expect(response.body.stats.enrichments).toBe(1);
      expect(response.body.stats.enrichmentsBySource.sms).toBe(1);
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app).get('/api/account/sms-data-stats');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return zero stats for user with no data', async () => {
      const response = await request(app)
        .get('/api/account/sms-data-stats')
        .query({ userId: testUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats.phoneNumbers).toBe(0);
      expect(response.body.stats.enrichments).toBe(0);
    });
  });

  describe('DELETE /api/account/sms-data', () => {
    it('should delete all SMS/MMS data for a user', async () => {
      // Create phone number and enrichments
      await pool.query(
        `INSERT INTO user_phone_numbers (user_id, phone_number, encrypted_phone_number, verified)
         VALUES ($1, $2, $3, $4)`,
        [testUserId, testPhoneNumber, 'encrypted', true]
      );

      await pool.query(
        `INSERT INTO enrichment_items (user_id, item_type, action, value, source, accepted, applied)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testUserId, 'tag', 'add', 'test-tag', 'sms', false, false]
      );

      const response = await request(app)
        .delete('/api/account/sms-data')
        .send({ userId: testUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.phoneNumbersDeleted).toBe(1);
      expect(response.body.enrichmentsDeleted).toBe(1);

      // Verify data is deleted
      const phoneCheck = await pool.query(
        'SELECT * FROM user_phone_numbers WHERE user_id = $1',
        [testUserId]
      );
      expect(phoneCheck.rows).toHaveLength(0);

      const enrichmentCheck = await pool.query(
        `SELECT * FROM enrichment_items WHERE user_id = $1 AND source IN ('sms', 'mms')`,
        [testUserId]
      );
      expect(enrichmentCheck.rows).toHaveLength(0);
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app).delete('/api/account/sms-data').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should handle deletion when user has no data', async () => {
      const response = await request(app)
        .delete('/api/account/sms-data')
        .send({ userId: testUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.phoneNumbersDeleted).toBe(0);
      expect(response.body.enrichmentsDeleted).toBe(0);
    });
  });

  describe('DELETE /api/account/phone-number', () => {
    it('should delete phone number for a user', async () => {
      // Create phone number
      await pool.query(
        `INSERT INTO user_phone_numbers (user_id, phone_number, encrypted_phone_number, verified)
         VALUES ($1, $2, $3, $4)`,
        [testUserId, testPhoneNumber, 'encrypted', true]
      );

      const response = await request(app)
        .delete('/api/account/phone-number')
        .send({ userId: testUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.phoneNumbersDeleted).toBe(1);

      // Verify phone number is deleted
      const phoneCheck = await pool.query(
        'SELECT * FROM user_phone_numbers WHERE user_id = $1',
        [testUserId]
      );
      expect(phoneCheck.rows).toHaveLength(0);
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app).delete('/api/account/phone-number').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/account/enrichments', () => {
    it('should delete SMS/MMS enrichments for a user', async () => {
      // Create enrichments
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

      const response = await request(app)
        .delete('/api/account/enrichments')
        .send({ userId: testUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.enrichmentsDeleted).toBe(1);

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

    it('should return 400 if userId is missing', async () => {
      const response = await request(app).delete('/api/account/enrichments').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });
});
