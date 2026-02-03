/**
 * Scheduling Notification Repository
 *
 * Data access layer for scheduling notifications.
 * Requirements: 13.5, 13.6, 13.7
 */

import pool from '../db/connection';
import {
  SchedulingNotification,
  SchedulingNotificationType,
} from '../types/scheduling';

/**
 * Create a new notification
 */
export async function createNotification(data: {
  userId: string;
  planId: string;
  type: SchedulingNotificationType;
  message: string;
}): Promise<SchedulingNotification> {
  const result = await pool.query(
    `INSERT INTO scheduling_notifications (user_id, plan_id, type, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.userId, data.planId, data.type, data.message]
  );

  return mapNotificationRow(result.rows[0]);
}

/**
 * Get notifications for a user
 */
export async function getNotificationsByUser(
  userId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<SchedulingNotification[]> {
  let query = `
    SELECT sn.*, cp.activity_type, cp.status as plan_status
    FROM scheduling_notifications sn
    JOIN catchup_plans cp ON sn.plan_id = cp.id
    WHERE sn.user_id = $1
  `;

  const params: any[] = [userId];
  let paramIndex = 2;

  if (options?.unreadOnly) {
    query += ` AND sn.read_at IS NULL`;
  }

  query += ` ORDER BY sn.created_at DESC`;

  if (options?.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(options.limit);
    paramIndex++;
  }

  if (options?.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(options.offset);
  }

  const result = await pool.query(query, params);

  return result.rows.map(mapNotificationRow);
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  await pool.query(
    `UPDATE scheduling_notifications SET read_at = NOW() WHERE id = $1`,
    [notificationId]
  );
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await pool.query(
    `UPDATE scheduling_notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM scheduling_notifications WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );

  return parseInt(result.rows[0].count, 10);
}

/**
 * Delete notifications for a plan (when plan is deleted)
 */
export async function deleteNotificationsForPlan(planId: string): Promise<void> {
  await pool.query(
    `DELETE FROM scheduling_notifications WHERE plan_id = $1`,
    [planId]
  );
}

/**
 * Get notifications for a specific plan
 */
export async function getNotificationsForPlan(
  planId: string
): Promise<SchedulingNotification[]> {
  const result = await pool.query(
    `SELECT * FROM scheduling_notifications WHERE plan_id = $1 ORDER BY created_at DESC`,
    [planId]
  );

  return result.rows.map(mapNotificationRow);
}

// ============================================
// Helper Functions
// ============================================

function mapNotificationRow(row: any): SchedulingNotification {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    type: row.type,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
