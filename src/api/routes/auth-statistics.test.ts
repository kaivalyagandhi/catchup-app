/**
 * Authentication Statistics API Tests
 * 
 * Tests for authentication statistics tracking and retrieval
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
import pool from '../../db/connection';
import { generateToken, UserRole } from '../middleware/auth';
import { logAuditEvent, AuditAction } from '../../utils/audit-logger';

describe('Authentication Statistics API', () => {
  let app: any;
  let testUserId: string;
  let testUserToken: string;
  let adminUserId: string;
  let adminToken: string;

  beforeEach(async () => {
    app = createServer();

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['test-stats@example.com', 'hash', 'user']
    );
    testUserId = userResult.rows[0].id;
    testUserToken = generateToken(testUserId, UserRole.USER);

    // Create admin user
    const adminResult = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['admin-stats@example.com', 'hash', 'admin']
    );
    adminUserId = adminResult.rows[0].id;
    adminToken = generateToken(adminUserId, UserRole.ADMIN);

    // Create test audit log entries
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Google SSO successful logins
    await logAuditEvent(AuditAction.USER_LOGIN, {
      userId: testUserId,
      metadata: { authProvider: 'google', method: 'google_sso' },
      success: true,
    });
    await logAuditEvent(AuditAction.USER_LOGIN, {
      userId: testUserId,
      metadata: { authProvider: 'google', method: 'google_sso' },
      success: true,
    });

    // Email/password successful logins
    await logAuditEvent(AuditAction.USER_LOGIN, {
      userId: testUserId,
      metadata: { authProvider: 'email' },
      success: true,
    });

    // Failed Google SSO attempt
    await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
      userId: testUserId,
      metadata: { provider: 'google', method: 'google_sso' },
      success: false,
    });

    // Failed email/password attempt
    await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
      userId: testUserId,
      metadata: { authProvider: 'email' },
      success: false,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM audit_logs WHERE user_id = $1 OR user_id = $2', [
      testUserId,
      adminUserId,
    ]);
    await pool.query('DELETE FROM users WHERE id = $1 OR id = $2', [testUserId, adminUserId]);
  });

  describe('GET /api/auth/statistics', () => {
    it('should return authentication statistics for authenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/statistics')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalAuthentications');
      expect(response.body).toHaveProperty('googleSSOAuthentications');
      expect(response.body).toHaveProperty('emailPasswordAuthentications');
      expect(response.body).toHaveProperty('googleSSOPercentage');
      expect(response.body).toHaveProperty('emailPasswordPercentage');
      expect(response.body).toHaveProperty('timeRange');
      expect(response.body).toHaveProperty('breakdown');

      // Verify counts
      expect(response.body.totalAuthentications).toBeGreaterThan(0);
      expect(response.body.googleSSOAuthentications).toBeGreaterThan(0);
      expect(response.body.emailPasswordAuthentications).toBeGreaterThan(0);

      // Verify breakdown structure
      expect(response.body.breakdown).toHaveProperty('successful');
      expect(response.body.breakdown).toHaveProperty('failed');
      expect(response.body.breakdown.successful).toHaveProperty('googleSSO');
      expect(response.body.breakdown.successful).toHaveProperty('emailPassword');
      expect(response.body.breakdown.failed).toHaveProperty('googleSSO');
      expect(response.body.breakdown.failed).toHaveProperty('emailPassword');
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app).get('/api/auth/statistics').expect(401);
    });

    it('should accept custom date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/api/auth/statistics')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.timeRange.start).toBeDefined();
      expect(response.body.timeRange.end).toBeDefined();
    });

    it('should return 403 when non-admin tries to query other user statistics', async () => {
      await request(app)
        .get('/api/auth/statistics')
        .query({ userId: adminUserId })
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);
    });

    it('should allow admin to query other user statistics', async () => {
      const response = await request(app)
        .get('/api/auth/statistics')
        .query({ userId: testUserId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalAuthentications');
    });
  });

  describe('GET /api/auth/statistics/global', () => {
    it('should return global statistics for admin', async () => {
      const response = await request(app)
        .get('/api/auth/statistics/global')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalAuthentications');
      expect(response.body).toHaveProperty('googleSSOAuthentications');
      expect(response.body).toHaveProperty('emailPasswordAuthentications');
      expect(response.body).toHaveProperty('breakdown');
    });

    it('should return 403 for non-admin users', async () => {
      await request(app)
        .get('/api/auth/statistics/global')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app).get('/api/auth/statistics/global').expect(401);
    });

    it('should accept custom date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/api/auth/statistics/global')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.timeRange.start).toBeDefined();
      expect(response.body.timeRange.end).toBeDefined();
    });
  });

  describe('Statistics Calculation', () => {
    it('should correctly count Google SSO vs email/password authentications', async () => {
      const response = await request(app)
        .get('/api/auth/statistics')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      // We created 2 successful Google SSO, 1 successful email/password,
      // 1 failed Google SSO, 1 failed email/password
      expect(response.body.breakdown.successful.googleSSO).toBe(2);
      expect(response.body.breakdown.successful.emailPassword).toBe(1);
      expect(response.body.breakdown.failed.googleSSO).toBe(1);
      expect(response.body.breakdown.failed.emailPassword).toBe(1);

      expect(response.body.googleSSOAuthentications).toBe(3); // 2 successful + 1 failed
      expect(response.body.emailPasswordAuthentications).toBe(2); // 1 successful + 1 failed
      expect(response.body.totalAuthentications).toBe(5);
    });

    it('should calculate percentages correctly', async () => {
      const response = await request(app)
        .get('/api/auth/statistics')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      // 3 Google SSO out of 5 total = 60%
      // 2 email/password out of 5 total = 40%
      expect(response.body.googleSSOPercentage).toBe(60);
      expect(response.body.emailPasswordPercentage).toBe(40);
    });

    it('should handle zero authentications gracefully', async () => {
      // Create a new user with no authentication history
      const newUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['new-user@example.com', 'hash', 'user']
      );
      const newUserId = newUserResult.rows[0].id;
      const newUserToken = generateToken(newUserId, UserRole.USER);

      const response = await request(app)
        .get('/api/auth/statistics')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(response.body.totalAuthentications).toBe(0);
      expect(response.body.googleSSOAuthentications).toBe(0);
      expect(response.body.emailPasswordAuthentications).toBe(0);
      expect(response.body.googleSSOPercentage).toBe(0);
      expect(response.body.emailPasswordPercentage).toBe(0);

      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [newUserId]);
    });
  });
});
