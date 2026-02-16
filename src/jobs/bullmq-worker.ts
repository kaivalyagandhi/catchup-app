/**
 * BullMQ Job Worker
 *
 * Registers job processors with BullMQ workers using shared connection pool.
 * This replaces the Bull-based worker.ts with a more efficient implementation
 * that reduces Redis connections from 33 to 1-3.
 *
 * Key differences from Bull:
 * - Workers are separate from Queues
 * - Event handlers are on Workers, not Queues
 * - Shared connection pool across all workers
 * - Better TypeScript support
 */

import { Job } from 'bullmq';
import { createWorker, closeAll } from './queue-factory';
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
import { processWebhookHealthCheck } from './processors/webhook-health-check-processor';
import { monitorJobDuration } from './job-monitoring-service';

/**
 * Start the BullMQ job worker
 *
 * Creates workers for all job queues with shared connection pool.
 */
export function startBullMQWorker(): void {
  console.log('[BullMQ Worker] Starting job worker...');

  // ============================================================================
  // NON-CRITICAL QUEUES (Lowest Risk)
  // ============================================================================

  // Webhook Health Check Worker
  const webhookHealthCheckWorker = createWorker(
    'webhook-health-check',
    async (job: Job) => {
      const startTime = new Date();
      console.log(`[BullMQ] Processing webhook health check job ${job.id}`);

      try {
        const result = await processWebhookHealthCheck(job as any);
        const endTime = new Date();
        monitorJobDuration(
          'webhook-health-check',
          job.id || 'unknown',
          startTime,
          endTime,
          'completed'
        );
        return result;
      } catch (error) {
        const endTime = new Date();
        const errorMsg = error instanceof Error ? error.message : String(error);
        monitorJobDuration(
          'webhook-health-check',
          job.id || 'unknown',
          startTime,
          endTime,
          'failed',
          errorMsg
        );
        throw error;
      }
    },
    {
      concurrency: 1,
    }
  );

  // Notification Reminder Worker
  const notificationReminderWorker = createWorker(
    'notification-reminder',
    async (job: Job) => {
      const startTime = new Date();
      console.log(`[BullMQ] Processing notification reminder job ${job.id}`);

      try {
        const result = await processNotificationReminder(job as any);
        const endTime = new Date();
        monitorJobDuration(
          'notification-reminder',
          job.id || 'unknown',
          startTime,
          endTime,
          'completed'
        );
        return result;
      } catch (error) {
        const endTime = new Date();
        const errorMsg = error instanceof Error ? error.message : String(error);
        monitorJobDuration(
          'notification-reminder',
          job.id || 'unknown',
          startTime,
          endTime,
          'failed',
          errorMsg
        );
        throw error;
      }
    },
    {
      concurrency: 1,
    }
  );

  // Token Health Reminder Worker
  const tokenHealthReminderWorker = createWorker(
    'token-health-reminder',
    async (job: Job) => {
      console.log(`[BullMQ] Processing token health reminder job ${job.id}`);
      return processTokenHealthReminder(job as any);
    },
    {
      concurrency: 1,
    }
  );

  // ============================================================================
  // MEDIUM-RISK QUEUES
  // ============================================================================

  // Adaptive Sync Worker
  const adaptiveSyncWorker = createWorker(
    'adaptive-sync',
    async (job: Job) => {
      const startTime = new Date();
      console.log(`[BullMQ] Processing adaptive sync job ${job.id}`);

      try {
        const result = await processAdaptiveSync(job as any);
        const endTime = new Date();
        monitorJobDuration(
          'adaptive-sync',
          job.id || 'unknown',
          startTime,
          endTime,
          'completed'
        );
        return result;
      } catch (error) {
        const endTime = new Date();
        const errorMsg = error instanceof Error ? error.message : String(error);
        monitorJobDuration(
          'adaptive-sync',
          job.id || 'unknown',
          startTime,
          endTime,
          'failed',
          errorMsg
        );
        throw error;
      }
    },
    {
      concurrency: 1,
    }
  );

  // Webhook Renewal Worker
  const webhookRenewalWorker = createWorker(
    'webhook-renewal',
    async (job: Job) => {
      const startTime = new Date();
      console.log(`[BullMQ] Processing webhook renewal job ${job.id}`);

      try {
        const result = await processWebhookRenewal(job as any);
        const endTime = new Date();
        monitorJobDuration(
          'webhook-renewal',
          job.id || 'unknown',
          startTime,
          endTime,
          'completed'
        );
        return result;
      } catch (error) {
        const endTime = new Date();
        const errorMsg = error instanceof Error ? error.message : String(error);
        monitorJobDuration(
          'webhook-renewal',
          job.id || 'unknown',
          startTime,
          endTime,
          'failed',
          errorMsg
        );
        throw error;
      }
    },
    {
      concurrency: 1,
    }
  );

  // Suggestion Regeneration Worker (limit to 1 concurrent - heavy AI processing)
  const suggestionRegenerationWorker = createWorker(
    'suggestion-regeneration',
    async (job: Job) => {
      console.log(`[BullMQ] Processing suggestion regeneration job ${job.id}`);
      return processSuggestionRegeneration(job as any);
    },
    {
      concurrency: 1,
    }
  );

  // Batch Notification Worker
  const batchNotificationWorker = createWorker(
    'batch-notifications',
    async (job: Job) => {
      console.log(`[BullMQ] Processing batch notification job ${job.id}`);
      return processBatchNotification(job as any);
    },
    {
      concurrency: 1,
    }
  );

  // Suggestion Generation Worker (limit to 1 concurrent - heavy AI processing)
  const suggestionGenerationWorker = createWorker(
    'suggestion-generation',
    async (job: Job) => {
      console.log(`[BullMQ] Processing suggestion generation job ${job.id}`);
      return processSuggestionGeneration(job as any);
    },
    {
      concurrency: 1,
    }
  );

  // ============================================================================
  // CRITICAL QUEUES (Highest Risk - User-Facing)
  // ============================================================================

  // Token Refresh Worker (CRITICAL - prevents auth failures)
  const tokenRefreshWorker = createWorker(
    'token-refresh',
    async (job: Job) => {
      const startTime = new Date();
      console.log(`[BullMQ] Processing token refresh job ${job.id}`);

      try {
        const result = await processTokenRefresh(job as any);
        const endTime = new Date();
        monitorJobDuration(
          'token-refresh',
          job.id || 'unknown',
          startTime,
          endTime,
          'completed'
        );
        return result;
      } catch (error) {
        const endTime = new Date();
        const errorMsg = error instanceof Error ? error.message : String(error);
        monitorJobDuration(
          'token-refresh',
          job.id || 'unknown',
          startTime,
          endTime,
          'failed',
          errorMsg
        );
        throw error;
      }
    },
    {
      concurrency: 1,
    }
  );

  // Calendar Sync Worker (CRITICAL - user-facing, limit to 1 concurrent - heavy API calls)
  const calendarSyncWorker = createWorker(
    'calendar-sync',
    async (job: Job) => {
      console.log(`[BullMQ] Processing calendar sync job ${job.id}`);
      return processCalendarSync(job as any);
    },
    {
      concurrency: 1,
    }
  );

  // Google Contacts Sync Worker (CRITICAL - user-facing, limit to 1 concurrent - heavy API calls and memory)
  const googleContactsSyncWorker = createWorker(
    'google-contacts-sync',
    async (job: Job) => {
      console.log(`[BullMQ] Processing Google Contacts sync job ${job.id}`);
      return processGoogleContactsSync(job as any);
    },
    {
      concurrency: 1,
    }
  );

  console.log('[BullMQ Worker] All workers started successfully');
  console.log('[BullMQ Worker] Using shared connection pool (1-3 connections total)');
}

/**
 * Stop the BullMQ job worker
 *
 * Gracefully closes all workers and queues.
 */
export async function stopBullMQWorker(): Promise<void> {
  console.log('[BullMQ Worker] Stopping job worker...');
  await closeAll();
  console.log('[BullMQ Worker] Job worker stopped');
}

