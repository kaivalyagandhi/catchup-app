/**
 * Admin Middleware
 *
 * Handles admin role verification and access control for admin-only endpoints
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import pool from '../../db/connection';
import { logAuditEvent, AuditAction } from '../../utils/audit-logger';

/**
 * Admin middleware
 * Verifies JWT token validity and checks is_admin flag in users table
 * Returns 403 Forbidden for non-admins
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const endpoint = req.path;
  const method = req.method;
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    // Check if user is authenticated (JWT token validated by authenticate middleware)
    if (!req.userId) {
      await logAuditEvent(AuditAction.ADMIN_ACCESS, {
        resourceType: 'admin_endpoint',
        resourceId: endpoint,
        ipAddress,
        userAgent,
        metadata: { method, endpoint },
        success: false,
        errorMessage: 'No authentication token provided',
      });

      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Query database to check is_admin flag
    const result = await pool.query<{ is_admin: boolean }>(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      await logAuditEvent(AuditAction.ADMIN_ACCESS, {
        userId: req.userId,
        resourceType: 'admin_endpoint',
        resourceId: endpoint,
        ipAddress,
        userAgent,
        metadata: { method, endpoint },
        success: false,
        errorMessage: 'User not found',
      });

      res.status(401).json({ error: 'User not found' });
      return;
    }

    const isAdmin = result.rows[0].is_admin;

    if (!isAdmin) {
      // Log failed access attempt
      await logAuditEvent(AuditAction.ADMIN_ACCESS, {
        userId: req.userId,
        resourceType: 'admin_endpoint',
        resourceId: endpoint,
        ipAddress,
        userAgent,
        metadata: { method, endpoint },
        success: false,
        errorMessage: 'User is not an admin',
      });

      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    // Log successful access
    await logAuditEvent(AuditAction.ADMIN_ACCESS, {
      userId: req.userId,
      resourceType: 'admin_endpoint',
      resourceId: endpoint,
      ipAddress,
      userAgent,
      metadata: { method, endpoint },
      success: true,
    });

    // User is admin, proceed to next middleware/route handler
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);

    // Log error
    await logAuditEvent(AuditAction.ADMIN_ACCESS, {
      userId: req.userId,
      resourceType: 'admin_endpoint',
      resourceId: endpoint,
      ipAddress,
      userAgent,
      metadata: { method, endpoint },
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({ error: 'Internal server error' });
  }
}
