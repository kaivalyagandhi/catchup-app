/**
 * Job Scheduler
 *
 * Manages recurring job schedules using Bull's repeat functionality.
 */

import {
  suggestionGenerationQueue,
  batchNotificationQueue,
  calendarSyncQueue,
  googleContactsSyncQueue,
  tokenRefreshQueue,
  webhookRenewalQueue,
  notificationReminderQueue,
  adaptiveSyncQueue,
} from './queue';
import * as oauthRepository from '../integrations/oauth-repository';
import * as preferencesRepository from '../notifications/preferences-repository';
import {
  SuggestionGenerationJobData,
  BatchNotificationJobData,
  CalendarSyncJobData,
  GoogleContactsSyncJobData,
  TokenRefreshJobData,
  WebhookRenewalJobData,
  NotificationReminderJobData,
  AdaptiveSyncJobData,
} from './types';

/**
 * Schedule suggestion generation job
 *
 * Runs every 6 hours to generate suggestions for all users.
 * Requirements: 9.1-11.4
 */
export async function scheduleSuggestionGeneration(): Promise<void> {
  console.log('Scheduling suggestion generation job...');

  const jobData: SuggestionGenerationJobData = {
    batchSize: 50,
    offset: 0,
  };

  // Schedule to run every 6 hours
  await suggestionGenerationQueue.add(jobData, {
    repeat: {
      every: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
    },
    jobId: 'suggestion-generation-recurring',
  });

  console.log('Suggestion generation job scheduled (every 6 hours)');
}

/**
 * Schedule batch notifications for all users
 *
 * Creates individual jobs for each user based on their notification preferences.
 * Requirements: 12.1-12.5
 */
export async function scheduleBatchNotifications(): Promise<void> {
  console.log('Scheduling batch notifications...');

  // Get all users with notification preferences
  const allUserIds = await oauthRepository.getUsersWithProvider('google_calendar');

  let scheduledCount = 0;

  for (const userId of allUserIds) {
    try {
      // Get user's notification preferences
      const preferences = await preferencesRepository.getPreferences(userId);
      const prefs = preferences || preferencesRepository.getDefaultPreferences();

      // Skip if both SMS and email are disabled
      if (!prefs.smsEnabled && !prefs.emailEnabled) {
        continue;
      }

      // Parse batch time (format: HH:mm)
      const [hours, minutes] = prefs.batchTime.split(':').map(Number);

      // Create cron expression for the user's preferred time
      // Format: minute hour dayOfWeek
      const cronExpression = `${minutes} ${hours} * * ${prefs.batchDay}`;

      const jobData: BatchNotificationJobData = {
        userId,
        dayOfWeek: prefs.batchDay,
        time: prefs.batchTime,
      };

      // Schedule recurring job for this user
      await batchNotificationQueue.add(jobData, {
        repeat: {
          cron: cronExpression,
          tz: prefs.timezone || 'UTC',
        },
        jobId: `batch-notification-${userId}`,
      });

      scheduledCount++;
    } catch (error) {
      console.error(`Error scheduling batch notification for user ${userId}:`, error);
    }
  }

  console.log(`Batch notifications scheduled for ${scheduledCount} users`);
}

/**
 * Schedule calendar sync for all users
 *
 * Creates individual jobs for each user to run every 30 minutes.
 * Requirements: 7.8, 8.1
 */
export async function scheduleCalendarSync(): Promise<void> {
  console.log('Scheduling calendar sync jobs...');

  // Get all users with Google Calendar connected
  const allUserIds = await oauthRepository.getUsersWithProvider('google_calendar');

  let scheduledCount = 0;

  for (const userId of allUserIds) {
    try {
      const jobData: CalendarSyncJobData = {
        userId,
      };

      // Schedule to run every 30 minutes for this user
      await calendarSyncQueue.add(jobData, {
        repeat: {
          every: 30 * 60 * 1000, // 30 minutes in milliseconds
        },
        jobId: `calendar-sync-${userId}`,
      });

      scheduledCount++;
    } catch (error) {
      console.error(`Error scheduling calendar sync for user ${userId}:`, error);
    }
  }

  console.log(`Calendar sync scheduled for ${scheduledCount} users`);
}

/**
 * Schedule a batch notification for a specific user
 *
 * Used when a user updates their notification preferences.
 */
export async function scheduleUserBatchNotification(userId: string): Promise<void> {
  console.log(`Scheduling batch notification for user ${userId}`);

  // Remove existing job if any
  await removeUserBatchNotification(userId);

  // Get user's notification preferences
  const preferences = await preferencesRepository.getPreferences(userId);
  const prefs = preferences || preferencesRepository.getDefaultPreferences();

  // Skip if both SMS and email are disabled
  if (!prefs.smsEnabled && !prefs.emailEnabled) {
    console.log(`Skipping batch notification for user ${userId} - notifications disabled`);
    return;
  }

  // Parse batch time (format: HH:mm)
  const [hours, minutes] = prefs.batchTime.split(':').map(Number);

  // Create cron expression for the user's preferred time
  const cronExpression = `${minutes} ${hours} * * ${prefs.batchDay}`;

  const jobData: BatchNotificationJobData = {
    userId,
    dayOfWeek: prefs.batchDay,
    time: prefs.batchTime,
  };

  // Schedule recurring job for this user
  await batchNotificationQueue.add(jobData, {
    repeat: {
      cron: cronExpression,
      tz: prefs.timezone || 'UTC',
    },
    jobId: `batch-notification-${userId}`,
  });

  console.log(
    `Batch notification scheduled for user ${userId} - ${prefs.batchTime} on day ${prefs.batchDay}`
  );
}

/**
 * Remove batch notification schedule for a specific user
 */
export async function removeUserBatchNotification(userId: string): Promise<void> {
  const jobId = `batch-notification-${userId}`;
  const repeatableJobs = await batchNotificationQueue.getRepeatableJobs();

  for (const job of repeatableJobs) {
    if (job.id === jobId) {
      await batchNotificationQueue.removeRepeatableByKey(job.key);
      console.log(`Removed batch notification schedule for user ${userId}`);
    }
  }
}

/**
 * Schedule a calendar sync for a specific user
 *
 * Used when a user connects their Google Calendar.
 */
export async function scheduleUserCalendarSync(userId: string): Promise<void> {
  console.log(`Scheduling calendar sync for user ${userId}`);

  // Remove existing job if any
  await removeUserCalendarSync(userId);

  const jobData: CalendarSyncJobData = {
    userId,
  };

  // Schedule to run every 30 minutes for this user
  await calendarSyncQueue.add(jobData, {
    repeat: {
      every: 30 * 60 * 1000, // 30 minutes in milliseconds
    },
    jobId: `calendar-sync-${userId}`,
  });

  console.log(`Calendar sync scheduled for user ${userId}`);
}

/**
 * Remove calendar sync schedule for a specific user
 */
export async function removeUserCalendarSync(userId: string): Promise<void> {
  const jobId = `calendar-sync-${userId}`;
  const repeatableJobs = await calendarSyncQueue.getRepeatableJobs();

  for (const job of repeatableJobs) {
    if (job.id === jobId) {
      await calendarSyncQueue.removeRepeatableByKey(job.key);
      console.log(`Removed calendar sync schedule for user ${userId}`);
    }
  }
}

/**
 * Schedule Google Contacts sync for all users
 *
 * Creates individual jobs for each user to run once daily.
 * Requirements: 3.7
 */
export async function scheduleGoogleContactsSync(): Promise<void> {
  console.log('Scheduling Google Contacts sync jobs...');

  // Get all users with Google Contacts connected
  const allUserIds = await oauthRepository.getUsersWithProvider('google_contacts');

  let scheduledCount = 0;

  for (const userId of allUserIds) {
    try {
      const jobData: GoogleContactsSyncJobData = {
        userId,
        syncType: 'incremental',
      };

      // Schedule to run once daily at 2 AM UTC
      await googleContactsSyncQueue.add(jobData, {
        repeat: {
          cron: '0 2 * * *', // Daily at 2 AM
          tz: 'UTC',
        },
        jobId: `google-contacts-sync-${userId}`,
      });

      scheduledCount++;
    } catch (error) {
      console.error(`Error scheduling Google Contacts sync for user ${userId}:`, error);
    }
  }

  console.log(`Google Contacts sync scheduled for ${scheduledCount} users`);
}

/**
 * Schedule Google Contacts sync for a specific user
 *
 * Used when a user connects their Google Contacts.
 */
export async function scheduleUserGoogleContactsSync(userId: string): Promise<void> {
  console.log(`Scheduling Google Contacts sync for user ${userId}`);

  // Remove existing job if any
  await removeUserGoogleContactsSync(userId);

  const jobData: GoogleContactsSyncJobData = {
    userId,
    syncType: 'incremental',
  };

  // Schedule to run once daily at 2 AM UTC
  await googleContactsSyncQueue.add(jobData, {
    repeat: {
      cron: '0 2 * * *', // Daily at 2 AM
      tz: 'UTC',
    },
    jobId: `google-contacts-sync-${userId}`,
  });

  console.log(`Google Contacts sync scheduled for user ${userId}`);
}

/**
 * Remove Google Contacts sync schedule for a specific user
 */
export async function removeUserGoogleContactsSync(userId: string): Promise<void> {
  const jobId = `google-contacts-sync-${userId}`;
  const repeatableJobs = await googleContactsSyncQueue.getRepeatableJobs();

  for (const job of repeatableJobs) {
    if (job.id === jobId) {
      await googleContactsSyncQueue.removeRepeatableByKey(job.key);
      console.log(`Removed Google Contacts sync schedule for user ${userId}`);
    }
  }
}

/**
 * Schedule token refresh job
 *
 * Runs TokenHealthMonitor.refreshExpiringTokens() daily.
 * Requirements: 8.2
 */
export async function scheduleTokenRefresh(): Promise<void> {
  console.log('Scheduling token refresh job...');

  const jobData: TokenRefreshJobData = {};

  // Schedule to run daily at 3 AM UTC
  await tokenRefreshQueue.add(jobData, {
    repeat: {
      cron: '0 3 * * *', // Daily at 3 AM
      tz: 'UTC',
    },
    jobId: 'token-refresh-recurring',
  });

  console.log('Token refresh job scheduled (daily at 3 AM UTC)');
}

/**
 * Schedule webhook renewal job
 *
 * Runs CalendarWebhookManager.renewExpiringWebhooks() daily.
 * Requirements: 6.4
 */
export async function scheduleWebhookRenewal(): Promise<void> {
  console.log('Scheduling webhook renewal job...');

  const jobData: WebhookRenewalJobData = {};

  // Schedule to run daily at 4 AM UTC
  await webhookRenewalQueue.add(jobData, {
    repeat: {
      cron: '0 4 * * *', // Daily at 4 AM
      tz: 'UTC',
    },
    jobId: 'webhook-renewal-recurring',
  });

  console.log('Webhook renewal job scheduled (daily at 4 AM UTC)');
}

/**
 * Schedule notification reminder job
 *
 * Checks for unresolved token_invalid notifications >7 days and sends reminders.
 * Requirements: 4.3
 */
export async function scheduleNotificationReminder(): Promise<void> {
  console.log('Scheduling notification reminder job...');

  const jobData: NotificationReminderJobData = {};

  // Schedule to run daily at 10 AM UTC
  await notificationReminderQueue.add(jobData, {
    repeat: {
      cron: '0 10 * * *', // Daily at 10 AM
      tz: 'UTC',
    },
    jobId: 'notification-reminder-recurring',
  });

  console.log('Notification reminder job scheduled (daily at 10 AM UTC)');
}

/**
 * Schedule adaptive sync job
 *
 * Runs AdaptiveSyncScheduler.getUsersDueForSync() every 12 hours.
 * Requirements: 5.1, 5.2
 */
export async function scheduleAdaptiveSync(): Promise<void> {
  console.log('Scheduling adaptive sync jobs...');

  // Schedule contacts sync check
  const contactsJobData: AdaptiveSyncJobData = {
    integrationType: 'google_contacts',
  };

  await adaptiveSyncQueue.add(contactsJobData, {
    repeat: {
      every: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
    },
    jobId: 'adaptive-sync-contacts-recurring',
  });

  // Schedule calendar sync check
  const calendarJobData: AdaptiveSyncJobData = {
    integrationType: 'google_calendar',
  };

  await adaptiveSyncQueue.add(calendarJobData, {
    repeat: {
      every: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
    },
    jobId: 'adaptive-sync-calendar-recurring',
  });

  console.log('Adaptive sync jobs scheduled (every 12 hours for both integrations)');
}

/**
 * Initialize all scheduled jobs
 *
 * Call this on application startup to set up all recurring jobs.
 */
export async function initializeScheduler(): Promise<void> {
  console.log('Initializing job scheduler...');

  try {
    await scheduleSuggestionGeneration();
    await scheduleBatchNotifications();
    await scheduleCalendarSync();
    await scheduleGoogleContactsSync();
    await scheduleTokenRefresh();
    await scheduleWebhookRenewal();
    await scheduleNotificationReminder();
    await scheduleAdaptiveSync();

    console.log('Job scheduler initialized successfully');
  } catch (error) {
    console.error('Error initializing job scheduler:', error);
    throw error;
  }
}

/**
 * Clear all scheduled jobs
 *
 * Useful for testing or maintenance.
 */
export async function clearAllSchedules(): Promise<void> {
  console.log('Clearing all scheduled jobs...');

  const queues = [
    suggestionGenerationQueue,
    batchNotificationQueue,
    calendarSyncQueue,
    googleContactsSyncQueue,
    tokenRefreshQueue,
    webhookRenewalQueue,
    notificationReminderQueue,
    adaptiveSyncQueue,
  ];

  for (const queue of queues) {
    const repeatableJobs = await queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  console.log('All scheduled jobs cleared');
}
