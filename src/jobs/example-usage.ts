/**
 * Job System Example Usage
 *
 * This file demonstrates how to use the background job system.
 */

import {
  startWorker,
  stopWorker,
  initializeScheduler,
  scheduleUserBatchNotification,
  scheduleUserCalendarSync,
  suggestionGenerationQueue,
  batchNotificationQueue,
  calendarSyncQueue,
} from './index';

/**
 * Example 1: Starting the job worker on application startup
 */
async function startApplication() {
  console.log('Starting CatchUp application...');

  // Start the job worker to process jobs
  startWorker();

  // Initialize all scheduled jobs
  await initializeScheduler();

  console.log('Application started successfully');
}

/**
 * Example 2: Scheduling user-specific jobs when a user connects Google Calendar
 */
async function onUserConnectsCalendar(userId: string) {
  console.log(`User ${userId} connected Google Calendar`);

  // Schedule calendar sync for this user (runs every 30 minutes)
  await scheduleUserCalendarSync(userId);

  console.log(`Calendar sync scheduled for user ${userId}`);
}

/**
 * Example 3: Scheduling batch notifications when a user updates preferences
 */
async function onUserUpdatesNotificationPreferences(userId: string) {
  console.log(`User ${userId} updated notification preferences`);

  // Schedule batch notifications based on new preferences
  await scheduleUserBatchNotification(userId);

  console.log(`Batch notifications scheduled for user ${userId}`);
}

/**
 * Example 4: Manually triggering suggestion generation
 */
async function triggerSuggestionGeneration() {
  console.log('Manually triggering suggestion generation...');

  // Add a job to the queue
  const job = await suggestionGenerationQueue.add({
    batchSize: 50,
    offset: 0,
  });

  console.log(`Suggestion generation job ${job.id} added to queue`);
}

/**
 * Example 5: Manually triggering batch notification for a user
 */
async function triggerBatchNotificationForUser(userId: string) {
  console.log(`Manually triggering batch notification for user ${userId}`);

  // Add a job to the queue
  const job = await batchNotificationQueue.add({
    userId,
    dayOfWeek: 0, // Sunday
    time: '09:00',
  });

  console.log(`Batch notification job ${job.id} added to queue`);
}

/**
 * Example 6: Manually triggering calendar sync for a user
 */
async function triggerCalendarSyncForUser(userId: string) {
  console.log(`Manually triggering calendar sync for user ${userId}`);

  // Add a job to the queue
  const job = await calendarSyncQueue.add({
    userId,
  });

  console.log(`Calendar sync job ${job.id} added to queue`);
}

/**
 * Example 7: Graceful shutdown
 */
async function shutdownApplication() {
  console.log('Shutting down application...');

  // Stop the job worker
  await stopWorker();

  console.log('Application shut down successfully');
}

/**
 * Example 8: Monitoring job completion
 */
function setupJobMonitoring() {
  // Listen for suggestion generation completion
  suggestionGenerationQueue.on('completed', (job, result) => {
    console.log(`Suggestion generation completed:`, result);
  });

  // Listen for batch notification completion
  batchNotificationQueue.on('completed', (job, result) => {
    console.log(`Batch notification completed:`, result);
  });

  // Listen for calendar sync completion
  calendarSyncQueue.on('completed', (job, result) => {
    console.log(`Calendar sync completed:`, result);
  });

  // Listen for failures
  suggestionGenerationQueue.on('failed', (job, error) => {
    console.error(`Suggestion generation failed:`, error);
  });

  batchNotificationQueue.on('failed', (job, error) => {
    console.error(`Batch notification failed:`, error);
  });

  calendarSyncQueue.on('failed', (job, error) => {
    console.error(`Calendar sync failed:`, error);
  });
}

// Export examples for documentation
export {
  startApplication,
  onUserConnectsCalendar,
  onUserUpdatesNotificationPreferences,
  triggerSuggestionGeneration,
  triggerBatchNotificationForUser,
  triggerCalendarSyncForUser,
  shutdownApplication,
  setupJobMonitoring,
};
