/**
 * Token Health Reminder Processor
 * 
 * Processes reminders for unresolved token health notifications.
 * Requirements: 4.3
 */

import { Job } from 'bull';
import { tokenHealthNotificationService } from '../../integrations/token-health-notification-service';

export interface TokenHealthReminderJob {
  // No specific data needed - processes all notifications needing reminders
}

export interface TokenHealthReminderResult {
  remindersSent: number;
  errors: Array<{ userId: string; integrationType: string; error: string }>;
}

/**
 * Process token health reminder job
 * Checks for unresolved notifications older than 7 days and sends reminders
 */
export async function processTokenHealthReminder(
  job: Job<TokenHealthReminderJob>
): Promise<TokenHealthReminderResult> {
  console.log(`[TokenHealthReminder] Starting reminder check job ${job.id}`);

  const result: TokenHealthReminderResult = {
    remindersSent: 0,
    errors: [],
  };

  try {
    // Get all notifications needing reminders
    const notifications = await tokenHealthNotificationService.getNotificationsNeedingReminders();

    console.log(`[TokenHealthReminder] Found ${notifications.length} notifications needing reminders`);

    // Process each notification
    for (const notification of notifications) {
      try {
        // In a real implementation, this would send an email or SMS
        // For now, we just mark the reminder as sent
        console.log(
          `[TokenHealthReminder] Sending reminder for user ${notification.userId}, ` +
          `integration ${notification.integrationType}`
        );

        // Mark reminder as sent
        await tokenHealthNotificationService.markReminderSent(notification.id);

        result.remindersSent++;

        // TODO: Integrate with email/SMS service to actually send the reminder
        // await emailService.send({
        //   to: userEmail,
        //   subject: 'Reminder: Reconnect Your Google Account',
        //   body: notification.message + '\n\n' + notification.reAuthLink
        // });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `[TokenHealthReminder] Error sending reminder for user ${notification.userId}:`,
          errorMessage
        );

        result.errors.push({
          userId: notification.userId,
          integrationType: notification.integrationType,
          error: errorMessage,
        });
      }
    }

    console.log(
      `[TokenHealthReminder] Completed: ${result.remindersSent} reminders sent, ` +
      `${result.errors.length} errors`
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[TokenHealthReminder] Job failed:`, errorMessage);
    throw error;
  }
}
