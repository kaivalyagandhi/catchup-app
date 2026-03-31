/**
 * Notification Cleanup Processor
 *
 * Auto-deletes in-app notifications older than 30 days.
 *
 * Requirements: 26.7
 */

import pool from '../../db/connection';
import { getNotificationService } from '../../notifications/in-app-notification-service';

const NOTIFICATION_MAX_AGE_DAYS = 30;

export async function processNotificationCleanup(
  _job: { id: string; data: any; name: string },
): Promise<{ deletedCount: number }> {
  console.log('[NotificationCleanup] Starting cleanup of notifications older than 30 days');

  const svc = getNotificationService(pool);
  const deletedCount = await svc.deleteOlderThan(NOTIFICATION_MAX_AGE_DAYS);

  console.log(`[NotificationCleanup] Deleted ${deletedCount} old notifications`);
  return { deletedCount };
}
