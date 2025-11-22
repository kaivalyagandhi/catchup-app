/**
 * Batch Notification Job Processor
 *
 * Scheduled job that sends batch notifications to users based on their preferences.
 * Sends notifications for all pending suggestions without calendar events.
 *
 * Requirements: 12.1-12.5
 */

import Bull from 'bull';
import {
  BatchNotificationJobData,
  BatchNotificationResult,
} from '../types';
import * as preferencesRepository from '../../notifications/preferences-repository';
import * as suggestionRepository from '../../matching/suggestion-repository';
import { contactService } from '../../contacts/service';
import { smsService } from '../../notifications/sms-service';
import { emailService } from '../../notifications/email-service';
import { generateNotificationContent } from '../../notifications/content-service';
import { SuggestionStatus } from '../../types';

/**
 * Process batch notification job
 *
 * Sends batch notifications by:
 * 1. Getting user's notification preferences
 * 2. Finding pending suggestions without calendar events
 * 3. Sending notifications via SMS and/or email
 * 4. Tracking delivery status
 */
export async function processBatchNotification(
  job: Bull.Job<BatchNotificationJobData>
): Promise<BatchNotificationResult> {
  const { userId } = job.data;

  console.log(`Processing batch notification for user ${userId}`);

  const result: BatchNotificationResult = {
    userId,
    notificationsSent: 0,
    deliveryStatus: {
      sms: 'skipped',
      email: 'skipped',
    },
    errors: [],
  };

  try {
    // Get user's notification preferences
    const preferences = await preferencesRepository.getPreferences(userId);
    const prefs = preferences || preferencesRepository.getDefaultPreferences();

    console.log(
      `User preferences - SMS: ${prefs.smsEnabled}, Email: ${prefs.emailEnabled}`
    );

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

    console.log(
      `Found ${suggestions.length} pending suggestions for user ${userId}`
    );

    // Track SMS and email results
    let smsSuccessCount = 0;
    let smsFailCount = 0;
    let emailSuccessCount = 0;
    let emailFailCount = 0;

    // Send notifications for each suggestion
    for (const suggestion of suggestions) {
      try {
        // Get contact details
        const contact = await contactService.getContact(
          suggestion.contactId,
          userId
        );
        if (!contact) {
          result.errors.push(
            `Contact ${suggestion.contactId} not found for suggestion ${suggestion.id}`
          );
          continue;
        }

        // Generate notification content
        const content = generateNotificationContent(suggestion, contact);

        // Send SMS if enabled and contact has phone
        if (prefs.smsEnabled && contact.phone) {
          try {
            const smsResult = await smsService.sendSMS(
              contact.phone,
              content.sms
            );
            if (smsResult.success) {
              smsSuccessCount++;
            } else {
              smsFailCount++;
              result.errors.push(
                `SMS failed for suggestion ${suggestion.id}: ${smsResult.error}`
              );
            }
          } catch (error) {
            smsFailCount++;
            result.errors.push(
              `SMS error for suggestion ${suggestion.id}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }

        // Send email if enabled and contact has email
        if (prefs.emailEnabled && contact.email) {
          try {
            const emailResult = await emailService.sendEmail({
              to: contact.email,
              subject: content.email.subject,
              text: content.email.text,
              html: content.email.html,
            });
            if (emailResult.success) {
              emailSuccessCount++;
            } else {
              emailFailCount++;
              result.errors.push(
                `Email failed for suggestion ${suggestion.id}: ${emailResult.error}`
              );
            }
          } catch (error) {
            emailFailCount++;
            result.errors.push(
              `Email error for suggestion ${suggestion.id}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }

        result.notificationsSent++;
      } catch (error) {
        result.errors.push(
          `Error processing suggestion ${suggestion.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Set delivery status
    if (prefs.smsEnabled) {
      result.deliveryStatus.sms =
        smsFailCount === 0 && smsSuccessCount > 0 ? 'success' : 'failed';
    }
    if (prefs.emailEnabled) {
      result.deliveryStatus.email =
        emailFailCount === 0 && emailSuccessCount > 0 ? 'success' : 'failed';
    }

    console.log(
      `Batch notification complete for user ${userId} - sent: ${result.notificationsSent}, SMS: ${smsSuccessCount}/${smsSuccessCount + smsFailCount}, Email: ${emailSuccessCount}/${emailSuccessCount + emailFailCount}`
    );

    return result;
  } catch (error) {
    const errorMessage = `Fatal error in batch notification for user ${userId}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(errorMessage);
    result.errors.push(errorMessage);
    throw error;
  }
}
