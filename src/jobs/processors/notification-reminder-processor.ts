/**
 * Notification Reminder Processor
 *
 * Checks for unresolved token_invalid notifications older than 7 days
 * and sends reminder notifications.
 *
 * Requirements: 4.3
 */

import { Job } from 'bull';
import { TokenHealthNotificationService } from '../../integrations/token-health-notification-service';

export interface NotificationReminderJobData {
  // No data needed - processes all users
}

export interface NotificationReminderResult {
  remindersSent: number;
  errors: string[];
}

/**
 * Process notification reminder job
 *
 * Sends reminders for unresolved token_invalid notifications older than 7 days.
 */
export async function processNotificationReminder(
  job: Job<NotificationReminderJobData>
): Promise<NotificationReminderResult> {
  console.log(`[Notification Reminder] Starting notification reminder job ${job.id}`);

  const notificationService = new TokenHealthNotificationService();
  const errors: string[] = [];
  let remindersSent = 0;

  try {
    // Get notifications needing reminders
    const notifications = await notificationService.getNotificationsNeedingReminders();
    console.log(`[Notification Reminder] Found ${notifications.length} notifications needing reminders`);

    // Send reminder for each notification
    for (const notification of notifications) {
      try {
        // Mark reminder as sent
        await notificationService.markReminderSent(notification.id);
        remindersSent++;

        console.log(
          `[Notification Reminder] Sent reminder for user ${notification.userId}, integration ${notification.integrationType}`
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[Notification Reminder] Error sending reminder for notification ${notification.id}:`,
          errorMsg
        );
        errors.push(`Notification ${notification.id}: ${errorMsg}`);
      }
    }

    console.log(`[Notification Reminder] Completed: ${remindersSent} reminders sent`);

    return {
      remindersSent,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Notification Reminder] Job failed:`, errorMsg);
    errors.push(errorMsg);

    throw error; // Re-throw to mark job as failed
  }
}
