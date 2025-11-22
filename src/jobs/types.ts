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
