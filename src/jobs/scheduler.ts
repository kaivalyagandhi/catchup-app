/**
 * Job Scheduler
 *
 * DEPRECATED: This service scheduled recurring Bull/BullMQ jobs.
 * With Cloud Tasks, recurring jobs are handled by Cloud Scheduler.
 * 
 * TODO: Remove this file after verifying no dependencies.
 * See BULL_CLEANUP_TASK.md for details.
 */

// DEPRECATED: All scheduling functions below are stubs
// Cloud Scheduler is used for recurring jobs with Cloud Tasks

/**
 * Schedule suggestion generation job
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function scheduleSuggestionGeneration(): Promise<void> {
  console.warn('scheduleSuggestionGeneration is deprecated - use Cloud Scheduler');
}

/**
 * Schedule batch notifications for all users
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function scheduleBatchNotifications(): Promise<void> {
  console.warn('scheduleBatchNotifications is deprecated - use Cloud Scheduler');
}

/**
 * Schedule user-specific calendar sync
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function scheduleUserCalendarSync(userId: string): Promise<void> {
  console.warn('scheduleUserCalendarSync is deprecated - use Cloud Scheduler');
}

/**
 * Remove user calendar sync schedule
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function removeUserCalendarSync(userId: string): Promise<void> {
  console.warn('removeUserCalendarSync is deprecated - use Cloud Scheduler');
}

/**
 * Schedule user-specific Google Contacts sync
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function scheduleUserGoogleContactsSync(userId: string): Promise<void> {
  console.warn('scheduleUserGoogleContactsSync is deprecated - use Cloud Scheduler');
}

/**
 * Remove user Google Contacts sync schedule
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function removeUserGoogleContactsSync(userId: string): Promise<void> {
  console.warn('removeUserGoogleContactsSync is deprecated - use Cloud Scheduler');
}

/**
 * Schedule token refresh job
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function scheduleTokenRefresh(): Promise<void> {
  console.warn('scheduleTokenRefresh is deprecated - use Cloud Scheduler');
}

/**
 * Schedule webhook renewal job
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function scheduleWebhookRenewal(): Promise<void> {
  console.warn('scheduleWebhookRenewal is deprecated - use Cloud Scheduler');
}

/**
 * Schedule notification reminder job
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function scheduleNotificationReminder(): Promise<void> {
  console.warn('scheduleNotificationReminder is deprecated - use Cloud Scheduler');
}

/**
 * Schedule adaptive sync job
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function scheduleAdaptiveSync(): Promise<void> {
  console.warn('scheduleAdaptiveSync is deprecated - use Cloud Scheduler');
}

/**
 * Schedule webhook health check job
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function scheduleWebhookHealthCheck(): Promise<void> {
  console.warn('scheduleWebhookHealthCheck is deprecated - use Cloud Scheduler');
}

/**
 * Initialize all scheduled jobs
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function initializeScheduler(): Promise<void> {
  console.warn('initializeScheduler is deprecated - use Cloud Scheduler');
}

/**
 * Stop all scheduled jobs
 *
 * DEPRECATED: Use Cloud Scheduler instead
 */
export async function stopAllScheduledJobs(): Promise<void> {
  console.warn('stopAllScheduledJobs is deprecated - use Cloud Scheduler');
}
