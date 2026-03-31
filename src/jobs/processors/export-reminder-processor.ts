/**
 * Export Reminder Processor
 *
 * Creates an "export reminder" in-app notification 24 hours after the user
 * clicked "My export isn't ready yet" in the import wizard (Req 5 AC 4).
 *
 * Requirements: 26.3
 */

import pool from '../../db/connection';
import { getNotificationService } from '../../notifications/in-app-notification-service';
import type { ChatPlatform } from '../../chat-import/parser';

export interface ExportReminderJobData {
  userId: string;
  platform: ChatPlatform;
}

export async function processExportReminder(
  job: { id: string; data: ExportReminderJobData; name: string },
): Promise<{ notificationId: string }> {
  const { userId, platform } = job.data;

  const platformLabel = platform.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  console.log(`[ExportReminder] Creating reminder for user ${userId}, platform ${platform}`);

  const svc = getNotificationService(pool);
  const notification = await svc.create(
    userId,
    'export_reminder',
    `Your ${platformLabel} data export should be ready`,
    `Continue your import — your ${platformLabel} data download should be available now.`,
    `/app/import?platform=${platform}`,
  );

  console.log(`[ExportReminder] Created notification ${notification.id}`);
  return { notificationId: notification.id };
}
