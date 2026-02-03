/**
 * Admin Middleware Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAdmin } from './admin';
import { AuthenticatedRequest } from './auth';
import pool from '../../db/connection';
import * as auditLogger from '../../utils/audit-logger';

// Mock audit logger
vi.mock('../../utils/audit-logger', () => ({
  logAuditEvent: vi.fn(),
  AuditAction: {
    ADMIN_ACCESS: 'admin_access',
  },
}));

describe('Admin Middleware', () => {
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
  const TEST_ADMIN_ID = '00000000-0000-0000-0000-000000000002';

  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [TEST_USER_ID, TEST_ADMIN_ID]);

    // Create test users
    await pool.query(
      `INSERT INTO users (id, email, name, is_admin, google_id, created_at, updated_at)
       VALUES 
         ($1, $2, $3, $4, $5, NOW(), NOW()),
         ($6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        TEST_USER_ID,
        'regular-user@example.com',
        'Regular User',
        false,
        'google-regular-user',
        TEST_ADMIN_ID,
        'admin-user@example.com',
        'Admin User',
        true,
        'google-admin-user',
      ]
    );

    // Clear mock calls
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [TEST_USER_ID, TEST_ADMIN_ID]);
  });

  describe('requireAdmin', () => {
    it('should allow access for admin users', async () => {
      const req = {
        userId: TEST_ADMIN_ID,
        path: '/admin/sync-health',
        method: 'GET',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
      } as unknown as AuthenticatedRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        auditLogger.AuditAction.ADMIN_ACCESS,
        expect.objectContaining({
          userId: TEST_ADMIN_ID,
          success: true,
        })
      );
    });

    it('should return 403 for non-admin users', async () => {
      const req = {
        userId: TEST_USER_ID,
        path: '/admin/sync-health',
        method: 'GET',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
      } as unknown as AuthenticatedRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      await requireAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden: Admin access required',
      });
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        auditLogger.AuditAction.ADMIN_ACCESS,
        expect.objectContaining({
          userId: TEST_USER_ID,
          success: false,
          errorMessage: 'User is not an admin',
        })
      );
    });

    it('should return 401 when no userId is present', async () => {
      const req = {
        path: '/admin/sync-health',
        method: 'GET',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
      } as unknown as AuthenticatedRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      await requireAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        auditLogger.AuditAction.ADMIN_ACCESS,
        expect.objectContaining({
          success: false,
          errorMessage: 'No authentication token provided',
        })
      );
    });

    it('should return 401 when user does not exist', async () => {
      const nonExistentUserId = '99999999-9999-9999-9999-999999999999';

      const req = {
        userId: nonExistentUserId,
        path: '/admin/sync-health',
        method: 'GET',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
      } as unknown as AuthenticatedRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      await requireAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        auditLogger.AuditAction.ADMIN_ACCESS,
        expect.objectContaining({
          userId: nonExistentUserId,
          success: false,
          errorMessage: 'User not found',
        })
      );
    });

    it('should log all access attempts with endpoint and method', async () => {
      const req = {
        userId: TEST_ADMIN_ID,
        path: '/admin/sync-health',
        method: 'GET',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
      } as unknown as AuthenticatedRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      await requireAdmin(req, res, next);

      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        auditLogger.AuditAction.ADMIN_ACCESS,
        expect.objectContaining({
          resourceType: 'admin_endpoint',
          resourceId: '/admin/sync-health',
          metadata: expect.objectContaining({
            method: 'GET',
            endpoint: '/admin/sync-health',
          }),
        })
      );
    });

    it('should include IP address and user agent in audit logs', async () => {
      const req = {
        userId: TEST_ADMIN_ID,
        path: '/admin/sync-health',
        method: 'GET',
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: '192.168.1.100',
      } as unknown as AuthenticatedRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      await requireAdmin(req, res, next);

      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        auditLogger.AuditAction.ADMIN_ACCESS,
        expect.objectContaining({
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        })
      );
    });
  });

  describe('Property-Based Tests', () => {
    it('should verify JWT token validity before checking admin flag (Property 46)', async () => {
      // Test that authentication is required first
      const req = {
        // No userId - simulates missing or invalid JWT
        path: '/admin/sync-health',
        method: 'GET',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
      } as unknown as AuthenticatedRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      await requireAdmin(req, res, next);

      // Should fail with 401 before checking is_admin
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should log all access attempts regardless of outcome (Property 47)', async () => {
      // Test successful access
      const adminReq = {
        userId: TEST_ADMIN_ID,
        path: '/admin/sync-health',
        method: 'GET',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
      } as unknown as AuthenticatedRequest;

      const res1 = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await requireAdmin(adminReq, res1, vi.fn());

      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        auditLogger.AuditAction.ADMIN_ACCESS,
        expect.objectContaining({
          userId: TEST_ADMIN_ID,
          success: true,
        })
      );

      vi.clearAllMocks();

      // Test failed access
      const userReq = {
        userId: TEST_USER_ID,
        path: '/admin/sync-health',
        method: 'GET',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
      } as unknown as AuthenticatedRequest;

      const res2 = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await requireAdmin(userReq, res2, vi.fn());

      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        auditLogger.AuditAction.ADMIN_ACCESS,
        expect.objectContaining({
          userId: TEST_USER_ID,
          success: false,
        })
      );
    });
  });
});
