/**
 * Pending Enrichments Reminder Processor
 *
 * Creates a "pending enrichments reminder" notification 48 hours after an
 * import if unresolved pending enrichments remain.
 *
 * Requirements: 26.3
 */

import pool from '../../db/connection';
import { getNotificationService } from '../../notifications/in-app-notification-service';

export interface PendingEnrichmentsReminderJobData {
  userId: string;
  importRecordId: string;
}

export async function processPendingEnrichmentsReminder(
  job: { id: string; data: PendingEnrichmentsReminderJobData; name: string },
): Promise<{ notificationId: string | null }> {
  const { userId, importRecordId } = job.data;

  console.log(
    `[PendingEnrichmentsReminder] Checking pending enrichments for import ${importRecordId}`,
  );

  // Count unresolved pending enrichments for this import
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM pending_enrichments
     WHERE import_record_id = $1 AND user_id = $2 AND status = 'pending'`,
    [importRecordId, userId],
  );

  const pendingCount = rows[0].count;

  if (pendingCount === 0) {
    console.log('[PendingEnrichmentsReminder] No pending enrichments — skipping notification');
    return { notificationId: null };
  }

  const svc = getNotificationService(pool);
  const notification = await svc.create(
    userId,
    'pending_enrichments_reminder',
    `You have ${pendingCount} unmatched participant${pendingCount !== 1 ? 's' : ''} waiting for review`,
    `Review and link them to your contacts to complete your import.`,
    `/app/enrichments/pending`,
  );

  console.log(`[PendingEnrichmentsReminder] Created notification ${notification.id}`);
  return { notificationId: notification.id };
}
