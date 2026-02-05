// Job data types for each queue

export interface SuggestionGenerationJobData {
  batchSize?: number; // Number of users to process in this batch
  offset?: number; // Offset for pagination
}

export interface BatchNotificationJobData {
  userId: string;
  dayOfWeek: number; // 0-6
  time: string; // HH:mm format
}

export interface CalendarSyncJobData {
  userId: string;
}

export interface GoogleContactsSyncJobData {
  userId: string;
  syncType: 'full' | 'incremental';
}

// Job result types
export interface SuggestionGenerationResult {
  usersProcessed: number;
  suggestionsGenerated: number;
  errors: string[];
}

export interface BatchNotificationResult {
  userId: string;
  notificationsSent: number;
  deliveryStatus: {
    sms: 'success' | 'failed' | 'skipped';
    email: 'success' | 'failed' | 'skipped';
  };
  errors: string[];
}

export interface CalendarSyncResult {
  userId: string;
  calendarsRefreshed: number;
  eventsProcessed: number;
  errors: string[];
}

export interface GoogleContactsSyncResult {
  userId: string;
  syncType: 'full' | 'incremental';
  contactsImported?: number;
  contactsUpdated?: number;
  contactsDeleted?: number;
  groupsImported?: number;
  duration: number;
  errors: string[];
}

export interface TokenRefreshJobData {
  // No data needed - processes all users
}

export interface TokenRefreshResult {
  refreshed: number;
  failed: number;
  errors: string[];
  highFailureRate: boolean;
}

export interface WebhookRenewalJobData {
  // No data needed - processes all users
}

export interface WebhookRenewalResult {
  renewed: number;
  failed: number;
  errors: string[];
  highFailureRate: boolean;
}

export interface NotificationReminderJobData {
  // No data needed - processes all users
}

export interface NotificationReminderResult {
  remindersSent: number;
  errors: string[];
}

export interface AdaptiveSyncJobData {
  integrationType: 'google_contacts' | 'google_calendar';
}

export interface AdaptiveSyncResult {
  usersProcessed: number;
  syncsTriggered: number;
  syncsSkipped: number;
  errors: string[];
}

export interface WebhookHealthCheckJobData {
  // No data needed - processes all webhooks
}

export interface WebhookHealthCheckResult {
  totalWebhooks: number;
  staleWebhooks: number;
  expiringWebhooks: number;
  reregistrationAttempts: number;
  reregistrationSuccesses: number;
  reregistrationFailures: number;
  alerts: string[];
  errors: string[];
}
