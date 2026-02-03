/**
 * Scheduling Notifications API Routes
 *
 * API endpoints for scheduling notifications.
 * Requirements: 13.5, 13.6, 13.7
 */

import { Router, Request, Response } from 'express';
import * as schedulingNotificationService from '../../scheduling/scheduling-notification-service';

const router = Router();

/**
 * GET /api/scheduling/notifications - Get user notifications
 */
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { userId, unreadOnly, limit, offset } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const notifications = await schedulingNotificationService.getNotificationsByUser(
      userId as string,
      {
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      }
    );

    res.json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

/**
 * POST /api/scheduling/notifications/:id/read - Mark notification as read
 */
router.post('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await schedulingNotificationService.markAsRead(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * POST /api/scheduling/notifications/read-all - Mark all notifications as read
 */
router.post('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await schedulingNotificationService.markAllAsRead(userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

/**
 * GET /api/scheduling/notifications/unread-count - Get unread notification count
 */
router.get('/notifications/unread-count', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const count = await schedulingNotificationService.getUnreadCount(userId as string);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
