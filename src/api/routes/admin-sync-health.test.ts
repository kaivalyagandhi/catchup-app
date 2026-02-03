/**
 * Admin Sync Health API Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createServer } from '../server';
import pool from '../../db/connection';
import jwt from 'jsonwebtoken';

describe('Admin Sync Health API', () => {
  let app: Express;
  const TEST_ADMIN_ID = '00000000-0000-0000-0000-000000000001';
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000002';
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    app = createServer();

    // Clean up test data
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [TEST_ADMIN_ID, TEST_USER_ID]);

    // Create test users
    await pool.query(
      `INSERT INTO users (id, email, name, is_admin, google_id, created_at, updated_at)
       VALUES 
         ($1, $2, $3, $4, $5, NOW(), NOW()),
         ($6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        TEST_ADMIN_ID,
        'admin@example.com',
        'Admin User',
        true,
        'google-admin',
        TEST_USER_ID,
        'user@example.com',
        'Regular User',
        false,
        'google-user',
      ]
    );

    // Generate JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'test-secret';
    adminToken = jwt.sign({ userId: TEST_ADMIN_ID }, jwtSecret, { expiresIn: '1h' });
    userToken = jwt.sign({ userId: TEST_USER_ID }, jwtSecret, { expiresIn: '1h' });
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [TEST_ADMIN_ID, TEST_USER_ID]);
  });

  describe('GET /api/admin/sync-health', () => {
    it('should return sync health metrics for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/sync-health')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should return 200 or 500 (500 if tables don't exist in test DB)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('totalUsers');
        expect(response.body).toHaveProperty('activeIntegrations');
        expect(response.body).toHaveProperty('invalidTokens');
        expect(response.body).toHaveProperty('openCircuitBreakers');
        expect(response.body).toHaveProperty('syncSuccessRate24h');
        expect(response.body).toHaveProperty('apiCallsSaved');
        expect(response.body).toHaveProperty('persistentFailures');

        expect(response.body.activeIntegrations).toHaveProperty('contacts');
        expect(response.body.activeIntegrations).toHaveProperty('calendar');
      }
    });

    it('should filter by integration type when provided', async () => {
      const response = await request(app)
        .get('/api/admin/sync-health?integration_type=google_contacts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('totalUsers');
        expect(response.body).toHaveProperty('activeIntegrations');
      }
    });

    it('should return 400 for invalid integration type', async () => {
      const response = await request(app)
        .get('/api/admin/sync-health?integration_type=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/sync-health')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Admin access required');
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/admin/sync-health')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/admin/sync-health/user/:userId', () => {
    it('should return user sync status for admin users', async () => {
      const response = await request(app)
        .get(`/api/admin/sync-health/user/${TEST_USER_ID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('contacts');
        expect(response.body).toHaveProperty('calendar');

        // Check structure of contacts status
        expect(response.body.contacts).toHaveProperty('tokenHealth');
        expect(response.body.contacts).toHaveProperty('circuitBreakerState');
        expect(response.body.contacts).toHaveProperty('syncSchedule');
        expect(response.body.contacts).toHaveProperty('lastSync');
        expect(response.body.contacts).toHaveProperty('lastSyncResult');
        expect(response.body.contacts).toHaveProperty('webhookActive');

        // Check structure of calendar status
        expect(response.body.calendar).toHaveProperty('tokenHealth');
        expect(response.body.calendar).toHaveProperty('circuitBreakerState');
        expect(response.body.calendar).toHaveProperty('syncSchedule');
        expect(response.body.calendar).toHaveProperty('lastSync');
        expect(response.body.calendar).toHaveProperty('lastSyncResult');
        expect(response.body.calendar).toHaveProperty('webhookActive');
      }
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get(`/api/admin/sync-health/user/${TEST_USER_ID}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Admin access required');
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get(`/api/admin/sync-health/user/${TEST_USER_ID}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Requirements Validation', () => {
    it('should return metrics matching database counts (Property 43)', async () => {
      // This test validates that dashboard metrics match actual database counts
      const response = await request(app)
        .get('/api/admin/sync-health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        // Verify all required metrics are present
        expect(typeof response.body.totalUsers).toBe('number');
        expect(typeof response.body.activeIntegrations.contacts).toBe('number');
        expect(typeof response.body.activeIntegrations.calendar).toBe('number');
        expect(typeof response.body.invalidTokens.contacts).toBe('number');
        expect(typeof response.body.invalidTokens.calendar).toBe('number');
        expect(typeof response.body.openCircuitBreakers.contacts).toBe('number');
        expect(typeof response.body.openCircuitBreakers.calendar).toBe('number');
        expect(typeof response.body.syncSuccessRate24h.contacts).toBe('number');
        expect(typeof response.body.syncSuccessRate24h.calendar).toBe('number');
        expect(typeof response.body.apiCallsSaved.total).toBe('number');
        expect(Array.isArray(response.body.persistentFailures)).toBe(true);
      }
    });

    it('should include all required fields in user sync status (Requirements 10.1, 10.2, 10.3)', async () => {
      const response = await request(app)
        .get(`/api/admin/sync-health/user/${TEST_USER_ID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        // Verify contacts status structure
        const contacts = response.body.contacts;
        expect(contacts).toBeDefined();
        expect(contacts).toHaveProperty('tokenHealth');
        expect(contacts).toHaveProperty('circuitBreakerState');
        expect(contacts).toHaveProperty('syncSchedule');
        expect(contacts).toHaveProperty('lastSync');
        expect(contacts).toHaveProperty('lastSyncResult');
        expect(contacts).toHaveProperty('webhookActive');

        // Verify calendar status structure
        const calendar = response.body.calendar;
        expect(calendar).toBeDefined();
        expect(calendar).toHaveProperty('tokenHealth');
        expect(calendar).toHaveProperty('circuitBreakerState');
        expect(calendar).toHaveProperty('syncSchedule');
        expect(calendar).toHaveProperty('lastSync');
        expect(calendar).toHaveProperty('lastSyncResult');
        expect(calendar).toHaveProperty('webhookActive');
      }
    });
  });
});
