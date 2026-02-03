/**
 * Job Worker
 *
 * Registers job processors with Bull queues and handles job execution.
 */

import {
  suggestionGenerationQueue,
  batchNotificationQueue,
  calendarSyncQueue,
  suggestionRegenerationQueue,
  googleContactsSyncQueue,
  tokenHealthReminderQueue,
  tokenRefreshQueue,
  webhookRenewalQueue,
  notificationReminderQueue,
  adaptiveSyncQueue,
} from './queue';
import { processSuggestionGeneration } from './processors/suggestion-generation-processor';
import { processBatchNotification } from './processors/batch-notification-processor';
import { processCalendarSync } from './processors/calendar-sync-processor';
import { processSuggestionRegeneration } from './processors/suggestion-regeneration';
import { processGoogleContactsSync } from './processors/google-contacts-sync-processor';
import { processTokenHealthReminder } from './processors/token-health-reminder-processor';
import { processTokenRefresh } from './processors/token-refresh-processor';
import { processWebhookRenewal } from './processors/webhook-renewal-processor';
import { processNotificationReminder } from './processors/notification-reminder-processor';
import { processAdaptiveSync } from './processors/adaptive-sync-processor';
import { monitorJobDuration } from './job-monitoring-service';

/**
 * Start the job worker
 *
 * Registers processors for all job queues.
 */
export function startWorker(): void {
  console.log('Starting job worker...');

  // Register suggestion generation processor
  suggestionGenerationQueue.process(async (job) => {
    console.log(`Processing suggestion generation job ${job.id}`);
    return processSuggestionGeneration(job);
  });

  // Register batch notification processor
  batchNotificationQueue.process(async (job) => {
    console.log(`Processing batch notification job ${job.id}`);
    return processBatchNotification(job);
  });

  // Register calendar sync processor
  calendarSyncQueue.process(async (job) => {
    console.log(`Processing calendar sync job ${job.id}`);
    return processCalendarSync(job);
  });

  // Register suggestion regeneration processor
  suggestionRegenerationQueue.process(async (job) => {
    console.log(`Processing suggestion regeneration job ${job.id}`);
    return processSuggestionRegeneration(job);
  });

  // Register Google Contacts sync processor
  googleContactsSyncQueue.process(async (job) => {
    console.log(`Processing Google Contacts sync job ${job.id}`);
    return processGoogleContactsSync(job);
  });

  // Register token health reminder processor
  tokenHealthReminderQueue.process(async (job) => {
    console.log(`Processing token health reminder job ${job.id}`);
    return processTokenHealthReminder(job);
  });

  // Register token refresh processor
  tokenRefreshQueue.process(async (job) => {
    const startTime = new Date();
    console.log(`Processing token refresh job ${job.id}`);
    
    try {
      const result = await processTokenRefresh(job);
      const endTime = new Date();
      monitorJobDuration('token-refresh', job.id?.toString() || 'unknown', startTime, endTime, 'completed');
      return result;
    } catch (error) {
      const endTime = new Date();
      const errorMsg = error instanceof Error ? error.message : String(error);
      monitorJobDuration('token-refresh', job.id?.toString() || 'unknown', startTime, endTime, 'failed', errorMsg);
      throw error;
    }
  });

  // Register webhook renewal processor
  webhookRenewalQueue.process(async (job) => {
    const startTime = new Date();
    console.log(`Processing webhook renewal job ${job.id}`);
    
    try {
      const result = await processWebhookRenewal(job);
      const endTime = new Date();
      monitorJobDuration('webhook-renewal', job.id?.toString() || 'unknown', startTime, endTime, 'completed');
      return result;
    } catch (error) {
      const endTime = new Date();
      const errorMsg = error instanceof Error ? error.message : String(error);
      monitorJobDuration('webhook-renewal', job.id?.toString() || 'unknown', startTime, endTime, 'failed', errorMsg);
      throw error;
    }
  });

  // Register notification reminder processor
  notificationReminderQueue.process(async (job) => {
    const startTime = new Date();
    console.log(`Processing notification reminder job ${job.id}`);
    
    try {
      const result = await processNotificationReminder(job);
      const endTime = new Date();
      monitorJobDuration('notification-reminder', job.id?.toString() || 'unknown', startTime, endTime, 'completed');
      return result;
    } catch (error) {
      const endTime = new Date();
      const errorMsg = error instanceof Error ? error.message : String(error);
      monitorJobDuration('notification-reminder', job.id?.toString() || 'unknown', startTime, endTime, 'failed', errorMsg);
      throw error;
    }
  });

  // Register adaptive sync processor
  adaptiveSyncQueue.process(async (job) => {
    const startTime = new Date();
    console.log(`Processing adaptive sync job ${job.id}`);
    
    try {
      const result = await processAdaptiveSync(job);
      const endTime = new Date();
      monitorJobDuration('adaptive-sync', job.id?.toString() || 'unknown', startTime, endTime, 'completed');
      return result;
    } catch (error) {
      const endTime = new Date();
      const errorMsg = error instanceof Error ? error.message : String(error);
      monitorJobDuration('adaptive-sync', job.id?.toString() || 'unknown', startTime, endTime, 'failed', errorMsg);
      throw error;
    }
  });

  console.log('Job worker started successfully');

  // Log queue events
  suggestionGenerationQueue.on('completed', (job, result) => {
    console.log(`Suggestion generation job ${job.id} completed:`, result);
  });

  batchNotificationQueue.on('completed', (job, result) => {
    console.log(`Batch notification job ${job.id} completed:`, result);
  });

  calendarSyncQueue.on('completed', (job, result) => {
    console.log(`Calendar sync job ${job.id} completed:`, result);
  });

  suggestionRegenerationQueue.on('completed', (job, result) => {
    console.log(`Suggestion regeneration job ${job.id} completed:`, result);
  });

  googleContactsSyncQueue.on('completed', (job, result) => {
    console.log(`Google Contacts sync job ${job.id} completed:`, result);
  });

  tokenHealthReminderQueue.on('completed', (job, result) => {
    console.log(`Token health reminder job ${job.id} completed:`, result);
  });

  tokenRefreshQueue.on('completed', (job, result) => {
    console.log(`Token refresh job ${job.id} completed:`, result);
  });

  webhookRenewalQueue.on('completed', (job, result) => {
    console.log(`Webhook renewal job ${job.id} completed:`, result);
  });

  notificationReminderQueue.on('completed', (job, result) => {
    console.log(`Notification reminder job ${job.id} completed:`, result);
  });

  adaptiveSyncQueue.on('completed', (job, result) => {
    console.log(`Adaptive sync job ${job.id} completed:`, result);
  });
}

/**
 * Stop the job worker
 *
 * Gracefully closes all queues.
 */
export async function stopWorker(): Promise<void> {
  console.log('Stopping job worker...');

  await Promise.all([
    suggestionGenerationQueue.close(),
    batchNotificationQueue.close(),
    calendarSyncQueue.close(),
    suggestionRegenerationQueue.close(),
    googleContactsSyncQueue.close(),
    tokenHealthReminderQueue.close(),
    tokenRefreshQueue.close(),
    webhookRenewalQueue.close(),
    notificationReminderQueue.close(),
    adaptiveSyncQueue.close(),
  ]);

  console.log('Job worker stopped');
}
