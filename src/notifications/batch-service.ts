/**
 * Batch Notification Service
 *
 * DEPRECATED: This service used Bull queues for batch notifications.
 * With Cloud Tasks, batch notifications are handled by batch-notification-processor.
 * 
 * TODO: Remove this file after verifying no dependencies.
 * See BULL_CLEANUP_TASK.md for details.
 */

// DEPRECATED: Bull import removed
// import Bull from 'bull';

import { Suggestion, Contact, SuggestionStatus } from '../types';
import { SMSService, smsService as defaultSMSService } from './sms-service';
import { EmailService, emailService as defaultEmailService } from './email-service';
import { generateNotificationContent } from './content-service';
import * as suggestionRepository from '../matching/suggestion-repository';
import * as contactRepository from '../contacts/repository';
import * as preferencesRepository from './preferences-repository';

export interface BatchNotificationJob {
  userId: string;
}

export interface BatchNotificationResult {
  userId: string;
  suggestionsSent: number;
  smsSuccess: number;
  smsFailed: number;
  emailSuccess: number;
  emailFailed: number;
}

/**
 * Batch Notification Service
 * 
 * DEPRECATED: Use batch-notification-processor with Cloud Tasks instead
 */
export class BatchNotificationService {
  // DEPRECATED: Queue removed
  // private queue: Bull.Queue<BatchNotificationJob>;
  private smsService: SMSService;
  private emailService: EmailService;

  constructor(redisUrl?: string, smsService?: SMSService, emailService?: EmailService) {
    console.warn('BatchNotificationService is deprecated - use Cloud Tasks batch-notification-processor');
    
    this.smsService = smsService || defaultSMSService;
    this.emailService = emailService || defaultEmailService;
  }

  /**
   * Schedule batch notification for a user
   * 
   * DEPRECATED: Use Cloud Tasks instead
   */
  async scheduleBatchNotification(userId: string, delay?: number): Promise<void> {
    console.warn('scheduleBatchNotification is deprecated - use Cloud Tasks');
  }

  /**
   * Send batch notification immediately
   */
  async sendBatchNotification(userId: string): Promise<BatchNotificationResult> {
    // This method still works for direct calls (not via queue)
    return await this.processJob({ data: { userId } } as any);
  }

  /**
   * Process batch notification job
   */
  private async processJob(job: { data: BatchNotificationJob }): Promise<BatchNotificationResult> {
    const { userId } = job.data;

    console.log(`Processing batch notification for user ${userId}`);

    const result: BatchNotificationResult = {
      userId,
      suggestionsSent: 0,
      smsSuccess: 0,
      smsFailed: 0,
      emailSuccess: 0,
      emailFailed: 0,
    };

    try {
      // Get user's notification preferences
      const preferences = await preferencesRepository.getPreferences(userId);
      const prefs = preferences || preferencesRepository.getDefaultPreferences();

      // Get pending suggestions without calendar events
      const allSuggestions = await suggestionRepository.findAll(userId, {
        status: SuggestionStatus.PENDING,
      });

      // Filter out suggestions with calendar events (those get real-time notifications)
      const suggestions = allSuggestions.filter((s) => !s.calendarEventId);

      if (suggestions.length === 0) {
        console.log(`No pending suggestions for user ${userId}`);
        return result;
      }

      console.log(`Found ${suggestions.length} pending suggestions for user ${userId}`);

      // Get user's contact information for reply-to
      // For now, we'll send notifications for each suggestion
      for (const suggestion of suggestions) {
        result.suggestionsSent++;

        // Get contact details
        const contact = await contactRepository.findById(suggestion.contactId, userId);
        if (!contact) {
          console.error(
            `Contact ${suggestion.contactId} not found for suggestion ${suggestion.id}`
          );
          continue;
        }

        // Generate notification content
        const content = generateNotificationContent(suggestion, contact);

        // Send SMS if enabled and contact has phone
        if (prefs.smsEnabled && contact.phone) {
          const smsResult = await this.smsService.sendSMS(contact.phone, content.sms);
          if (smsResult.success) {
            result.smsSuccess++;
          } else {
            result.smsFailed++;
          }
        }

        // Send email if enabled and contact has email
        if (prefs.emailEnabled && contact.email) {
          const emailResult = await this.emailService.sendEmail({
            to: contact.email,
            subject: content.email.subject,
            text: content.email.text,
            html: content.email.html,
          });
          if (emailResult.success) {
            result.emailSuccess++;
          } else {
            result.emailFailed++;
          }
        }
      }

      console.log(`Batch notification complete for user ${userId}:`, result);
      return result;
    } catch (error) {
      console.error(`Error processing batch notification for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Close the queue (for cleanup)
   * 
   * DEPRECATED: No-op with Cloud Tasks
   */
  async close(): Promise<void> {
    console.warn('BatchNotificationService.close() is deprecated');
  }
}

// Export singleton instance (lazy initialization to avoid errors in tests)
let _batchNotificationService: BatchNotificationService | null = null;

export const batchNotificationService = {
  get instance(): BatchNotificationService {
    if (!_batchNotificationService) {
      _batchNotificationService = new BatchNotificationService();
    }
    return _batchNotificationService;
  },
  scheduleBatchNotification(userId: string, delay?: number) {
    return this.instance.scheduleBatchNotification(userId, delay);
  },
  sendBatchNotification(userId: string) {
    return this.instance.sendBatchNotification(userId);
  },
  close() {
    return this.instance.close();
  },
};
