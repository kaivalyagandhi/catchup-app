/**
 * Notifications Module
 *
 * Exports all notification-related services and types.
 */

// SMS Service
export { SMSService, SMSDeliveryResult, TwilioSMSService, smsService } from './sms-service';

// Email Service
export {
  EmailService,
  EmailDeliveryResult,
  EmailMessage,
  SendGridEmailService,
  emailService,
} from './email-service';

// Content Service
export {
  NotificationContent,
  generateNotificationText,
  generateDraftMessage,
  generateNotificationContent,
} from './content-service';

// Batch Notification Service
export {
  BatchNotificationJob,
  BatchNotificationResult,
  BatchNotificationService,
  batchNotificationService,
} from './batch-service';

// Real-time Notification Service
export {
  RealtimeNotificationResult,
  RealtimeNotificationService,
  realtimeNotificationService,
} from './realtime-service';

// Reply Processing Service
export {
  ReplyAction,
  ReplyMetadata,
  ReplyProcessingResult,
  ReplyProcessingService,
  replyProcessingService,
} from './reply-service';

// Preferences Service
export {
  NotificationPreferencesService,
  NotificationPreferencesServiceImpl,
  notificationPreferencesService,
} from './preferences-service';

// Preferences Repository
export { getPreferences, setPreferences, getDefaultPreferences } from './preferences-repository';
