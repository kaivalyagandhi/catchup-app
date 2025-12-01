/**
 * Real-time Notification Service
 *
 * Handles immediate notification delivery for event-tied suggestions.
 */

import { Suggestion, Contact } from '../types';
import { SMSService, smsService as defaultSMSService } from './sms-service';
import { EmailService, emailService as defaultEmailService } from './email-service';
import { generateNotificationContent } from './content-service';
import * as contactRepository from '../contacts/repository';
import * as preferencesRepository from './preferences-repository';

export interface RealtimeNotificationResult {
  suggestionId: string;
  smsDelivered: boolean;
  emailDelivered: boolean;
  publishedToFeed: boolean;
  error?: string;
}

/**
 * Real-time Notification Service
 */
export class RealtimeNotificationService {
  private smsService: SMSService;
  private emailService: EmailService;

  constructor(smsService?: SMSService, emailService?: EmailService) {
    this.smsService = smsService || defaultSMSService;
    this.emailService = emailService || defaultEmailService;
  }

  /**
   * Send real-time notification for a suggestion
   */
  async sendRealtimeNotification(
    userId: string,
    suggestion: Suggestion
  ): Promise<RealtimeNotificationResult> {
    const result: RealtimeNotificationResult = {
      suggestionId: suggestion.id,
      smsDelivered: false,
      emailDelivered: false,
      publishedToFeed: false,
    };

    try {
      // Get user's notification preferences
      const preferences = await preferencesRepository.getPreferences(userId);
      const prefs = preferences || preferencesRepository.getDefaultPreferences();

      // Get contact details
      const contact = await contactRepository.findById(suggestion.contactId, userId);
      if (!contact) {
        throw new Error(`Contact ${suggestion.contactId} not found`);
      }

      // Generate notification content
      const content = generateNotificationContent(suggestion, contact);

      // Send SMS if enabled and contact has phone
      if (prefs.smsEnabled && contact.phone) {
        const smsResult = await this.smsService.sendSMS(contact.phone, content.sms);
        result.smsDelivered = smsResult.success;

        if (!smsResult.success) {
          console.error(`Failed to send SMS for suggestion ${suggestion.id}:`, smsResult.error);
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
        result.emailDelivered = emailResult.success;

        if (!emailResult.success) {
          console.error(`Failed to send email for suggestion ${suggestion.id}:`, emailResult.error);
        }
      }

      // Publish to in-app feed
      // Note: This would integrate with a feed service/repository
      // For now, we'll mark it as published since suggestions are already in the database
      result.publishedToFeed = true;

      console.log(`Real-time notification sent for suggestion ${suggestion.id}:`, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error sending real-time notification for suggestion ${suggestion.id}:`, error);

      result.error = errorMessage;
      return result;
    }
  }

  /**
   * Send real-time notifications for multiple suggestions
   */
  async sendBulkRealtimeNotifications(
    userId: string,
    suggestions: Suggestion[]
  ): Promise<RealtimeNotificationResult[]> {
    const results: RealtimeNotificationResult[] = [];

    for (const suggestion of suggestions) {
      const result = await this.sendRealtimeNotification(userId, suggestion);
      results.push(result);
    }

    return results;
  }
}

// Export singleton instance (lazy initialization to avoid errors in tests)
let _realtimeNotificationService: RealtimeNotificationService | null = null;

export const realtimeNotificationService = {
  get instance(): RealtimeNotificationService {
    if (!_realtimeNotificationService) {
      _realtimeNotificationService = new RealtimeNotificationService();
    }
    return _realtimeNotificationService;
  },
  sendRealtimeNotification(userId: string, suggestion: Suggestion) {
    return this.instance.sendRealtimeNotification(userId, suggestion);
  },
  sendBulkRealtimeNotifications(userId: string, suggestions: Suggestion[]) {
    return this.instance.sendBulkRealtimeNotifications(userId, suggestions);
  },
};
