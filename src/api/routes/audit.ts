/**
 * Audit Log Routes
 *
 * Provides access to audit logs for security and compliance
 */

import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest, UserRole } from '../middleware/auth';
import { getUserAuditLogs, getAllAuditLogs, AuditAction } from '../../utils/audit-logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/audit/me
 * Get audit logs for the authenticated user
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const actions = req.query.actions
      ? ((req.query.actions as string).split(',') as AuditAction[])
      : undefined;

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;

    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const logs = await getUserAuditLogs(userId, {
      limit,
      offset,
      actions,
      startDate,
      endDate,
    });

    res.json({
      logs,
      pagination: {
        limit,
        offset,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/audit/users/:userId
 * Get audit logs for a specific user (admin only)
 */
router.get(
  '/users/:userId',
  authorize(UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.userId;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const actions = req.query.actions
        ? ((req.query.actions as string).split(',') as AuditAction[])
        : undefined;

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;

      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const logs = await getUserAuditLogs(userId, {
        limit,
        offset,
        actions,
        startDate,
        endDate,
      });

      res.json({
        logs,
        pagination: {
          limit,
          offset,
          count: logs.length,
        },
      });
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

/**
 * GET /api/audit/all
 * Get all audit logs (admin only)
 */
router.get('/all', authorize(UserRole.ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const actions = req.query.actions
      ? ((req.query.actions as string).split(',') as AuditAction[])
      : undefined;

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;

    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const logs = await getAllAuditLogs({
      limit,
      offset,
      actions,
      startDate,
      endDate,
    });

    res.json({
      logs,
      pagination: {
        limit,
        offset,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error('Error fetching all audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
