/**
 * Notification API Routes
 *
 * GET  /api/notifications              — paginated notification list (newest first)
 * GET  /api/notifications/unread-count  — unread count for badge
 * POST /api/notifications/:id/read     — mark single notification as read
 * POST /api/notifications/mark-all-read — mark all as read
 *
 * Requirements: 26.1, 26.2, 26.5, 26.6
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import pool from '../../db/connection';
import { getNotificationService } from '../../notifications/in-app-notification-service';

const router = Router();

/**
 * GET /
 *
 * Returns a paginated list of notifications sorted by created_at descending.
 * Query params: limit (default 20, max 100), offset (default 0).
 *
 * Requirements: 26.1, 26.2
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

      const svc = getNotificationService(pool);
      const notifications = await svc.getAll(userId, limit, offset);

      res.json({ notifications, limit, offset });
    } catch (error) {
      console.error('[Notifications] List error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  },
);

/**
 * GET /unread-count
 *
 * Returns the number of unread notifications for the authenticated user.
 *
 * Requirements: 26.1
 */
router.get(
  '/unread-count',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const svc = getNotificationService(pool);
      const count = await svc.getUnreadCount(userId);

      res.json({ unreadCount: count });
    } catch (error) {
      console.error('[Notifications] Unread count error:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  },
);

/**
 * POST /:id/read
 *
 * Marks a single notification as read.
 *
 * Requirements: 26.5
 */
router.post(
  '/:id/read',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const svc = getNotificationService(pool);

      try {
        await svc.markAsRead(userId, id);
      } catch (err: any) {
        if (err.message === 'Notification not found') {
          res.status(404).json({ error: 'Notification not found' });
          return;
        }
        throw err;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[Notifications] Mark as read error:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  },
);

/**
 * POST /mark-all-read
 *
 * Marks all notifications as read for the authenticated user.
 *
 * Requirements: 26.6
 */
router.post(
  '/mark-all-read',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const svc = getNotificationService(pool);
      await svc.markAllAsRead(userId);

      res.json({ success: true });
    } catch (error) {
      console.error('[Notifications] Mark all as read error:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  },
);

export default router;
