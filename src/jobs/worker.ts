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
} from './queue';
import { processSuggestionGeneration } from './processors/suggestion-generation-processor';
import { processBatchNotification } from './processors/batch-notification-processor';
import { processCalendarSync } from './processors/calendar-sync-processor';
import { processSuggestionRegeneration } from './processors/suggestion-regeneration';
import { processGoogleContactsSync } from './processors/google-contacts-sync-processor';

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
  ]);

  console.log('Job worker stopped');
}
