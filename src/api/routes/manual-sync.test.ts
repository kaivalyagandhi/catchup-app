/**
 * Manual Sync Routes Tests
 *
 * Tests for manual sync API endpoint functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
import pool from '../../db/connection';
import jwt from 'jsonwebtoken';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Manual Sync Routes', () => {
  let authToken: string;

  beforeEach(async () => {
    // Create test user
    const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    await pool.query(
      `INSERT INTO users (id, email, name, auth_method, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, auth_method = EXCLUDED.auth_method`,
      [TEST_USER_ID, uniqueEmail, 'Test User', 'google']
    );

    // Generate auth token
    authToken = jwt.sign({ userId: TEST_USER_ID }, JWT_SECRET, { expiresIn: '1h' });
  });

  afterEach(async () => {
    // Cleanup
    await pool.query('DELETE FROM sync_metrics WHERE user_id = $1', [TEST_USER_ID]);
    await pool.query('DELETE FROM oauth_tokens WHERE user_id = $1', [TEST_USER_ID]);
    await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
  });

  describe('POST /api/sync/manual', () => {
    it('should return 401 when not authenticated', async () => {
      const app = createServer();
      const response = await request(app)
        .post('/api/sync/manual')
        .send({ integration_type: 'contacts' });

      expect(response.status).toBe(401);
    });

    it('should return 400 when integration_type is missing', async () => {
      const app = createServer();
      const response = await request(app)
        .post('/api/sync/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid integration_type');
    });

    it('should return 400 when integration_type is invalid', async () => {
      const app = createServer();
      const response = await request(app)
        .post('/api/sync/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ integration_type: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid integration_type');
    });

    it('should return 401 when user has not connected the integration', async () => {
      const app = createServer();
      const response = await request(app)
        .post('/api/sync/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ integration_type: 'contacts' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Not connected');
      expect(response.body.reAuthUrl).toBeDefined();
      expect(response.body.requiresReAuth).toBe(true);
    });

    it('should return 429 when rate limit is exceeded', async () => {
      // Insert OAuth token for user
      const { encryptToken } = await import('../../utils/encryption');
      await pool.query(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 hour')`,
        [TEST_USER_ID, 'google_contacts', encryptToken('test-access-token'), encryptToken('test-refresh-token')]
      );

      const app = createServer();

      // First request should succeed (or fail with sync error, but not rate limit)
      const response1 = await request(app)
        .post('/api/sync/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ integration_type: 'contacts' });

      // Second request within 1 minute should be rate limited
      const response2 = await request(app)
        .post('/api/sync/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ integration_type: 'contacts' });

      expect(response2.status).toBe(429);
      expect(response2.body.error).toBe('Too many requests');
      expect(response2.body.retryAfter).toBeDefined();
    });

    it('should allow separate rate limits for contacts and calendar', async () => {
      // Insert OAuth tokens for both integrations
      const { encryptToken } = await import('../../utils/encryption');
      await pool.query(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 hour')`,
        [TEST_USER_ID, 'google_contacts', encryptToken('test-access-token'), encryptToken('test-refresh-token')]
      );
      await pool.query(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 hour')`,
        [TEST_USER_ID, 'google_calendar', encryptToken('test-access-token'), encryptToken('test-refresh-token')]
      );

      const app = createServer();

      // Request contacts sync
      const response1 = await request(app)
        .post('/api/sync/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ integration_type: 'contacts' });

      // Request calendar sync immediately after - should not be rate limited
      const response2 = await request(app)
        .post('/api/sync/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ integration_type: 'calendar' });

      // Calendar sync should not be rate limited (different integration)
      expect(response2.status).not.toBe(429);
    });
  });
});
