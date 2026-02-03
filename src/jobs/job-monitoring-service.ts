/**
 * Job Monitoring Service
 *
 * Tracks job execution duration, failures, and queue backlog.
 * Provides alerting for job failures and performance issues.
 *
 * Requirements: 10.4
 */

import {
  tokenRefreshQueue,
  webhookRenewalQueue,
  notificationReminderQueue,
  adaptiveSyncQueue,
  googleContactsSyncQueue,
  calendarSyncQueue,
} from './queue';
import { Queue } from 'bull';

export interface JobMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface JobExecutionMetrics {
  queueName: string;
  jobId: string;
  duration: number;
  status: 'completed' | 'failed';
  timestamp: Date;
  error?: string;
}

const JOB_DURATION_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const QUEUE_BACKLOG_THRESHOLD = 1000;
const FAILURE_RATE_THRESHOLD = 0.1; // 10%

/**
 * Get metrics for all queues
 */
export async function getAllQueueMetrics(): Promise<JobMetrics[]> {
  const queues: Queue[] = [
    tokenRefreshQueue,
    webhookRenewalQueue,
    notificationReminderQueue,
    adaptiveSyncQueue,
    googleContactsSyncQueue,
    calendarSyncQueue,
  ];

  const metrics: JobMetrics[] = [];

  for (const queue of queues) {
    const counts = await queue.getJobCounts();

    metrics.push({
      queueName: queue.name,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    });
  }

  return metrics;
}

/**
 * Get metrics for a specific queue
 */
export async function getQueueMetrics(queueName: string): Promise<JobMetrics | null> {
  const allMetrics = await getAllQueueMetrics();
  return allMetrics.find((m) => m.queueName === queueName) || null;
}

/**
 * Check for queue backlog and alert if threshold exceeded
 */
export async function checkQueueBacklog(): Promise<{
  alerts: string[];
  metrics: JobMetrics[];
}> {
  const metrics = await getAllQueueMetrics();
  const alerts: string[] = [];

  for (const metric of metrics) {
    const backlog = metric.waiting + metric.delayed;

    if (backlog > QUEUE_BACKLOG_THRESHOLD) {
      const alert = `ALERT: Queue ${metric.queueName} has high backlog: ${backlog} jobs (threshold: ${QUEUE_BACKLOG_THRESHOLD})`;
      console.error(alert);
      alerts.push(alert);
    }
  }

  return { alerts, metrics };
}

/**
 * Check failure rate for a queue
 */
export async function checkFailureRate(queueName: string): Promise<{
  failureRate: number;
  alert: string | null;
}> {
  const metrics = await getQueueMetrics(queueName);

  if (!metrics) {
    return { failureRate: 0, alert: null };
  }

  const total = metrics.completed + metrics.failed;
  const failureRate = total > 0 ? metrics.failed / total : 0;

  let alert: string | null = null;

  if (failureRate > FAILURE_RATE_THRESHOLD && total > 10) {
    alert = `ALERT: Queue ${queueName} has high failure rate: ${(failureRate * 100).toFixed(1)}% (${metrics.failed}/${total})`;
    console.error(alert);
  }

  return { failureRate, alert };
}

/**
 * Monitor job execution duration
 */
export function monitorJobDuration(
  queueName: string,
  jobId: string,
  startTime: Date,
  endTime: Date,
  status: 'completed' | 'failed',
  error?: string
): JobExecutionMetrics {
  const duration = endTime.getTime() - startTime.getTime();

  const metrics: JobExecutionMetrics = {
    queueName,
    jobId,
    duration,
    status,
    timestamp: endTime,
    error,
  };

  // Alert on slow jobs
  if (duration > JOB_DURATION_THRESHOLD_MS) {
    console.warn(
      `WARNING: Job ${jobId} in queue ${queueName} took ${(duration / 1000).toFixed(1)}s (threshold: ${JOB_DURATION_THRESHOLD_MS / 1000}s)`
    );
  }

  return metrics;
}

/**
 * Get failed jobs for a queue
 */
export async function getFailedJobs(queueName: string, limit: number = 10) {
  const queues: Record<string, Queue> = {
    'token-refresh': tokenRefreshQueue,
    'webhook-renewal': webhookRenewalQueue,
    'notification-reminder': notificationReminderQueue,
    'adaptive-sync': adaptiveSyncQueue,
    'google-contacts-sync': googleContactsSyncQueue,
    'calendar-sync': calendarSyncQueue,
  };

  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  const failedJobs = await queue.getFailed(0, limit - 1);

  return failedJobs.map((job) => ({
    id: job.id,
    data: job.data,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
    timestamp: job.timestamp,
    attemptsMade: job.attemptsMade,
  }));
}

/**
 * Retry all failed jobs in a queue
 */
export async function retryFailedJobs(queueName: string): Promise<number> {
  const queues: Record<string, Queue> = {
    'token-refresh': tokenRefreshQueue,
    'webhook-renewal': webhookRenewalQueue,
    'notification-reminder': notificationReminderQueue,
    'adaptive-sync': adaptiveSyncQueue,
    'google-contacts-sync': googleContactsSyncQueue,
    'calendar-sync': calendarSyncQueue,
  };

  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  const failedJobs = await queue.getFailed();
  let retriedCount = 0;

  for (const job of failedJobs) {
    try {
      await job.retry();
      retriedCount++;
    } catch (error) {
      console.error(`Failed to retry job ${job.id}:`, error);
    }
  }

  console.log(`Retried ${retriedCount} failed jobs in queue ${queueName}`);
  return retriedCount;
}

/**
 * Clean up old completed jobs
 */
export async function cleanupCompletedJobs(olderThanMs: number = 24 * 60 * 60 * 1000) {
  const queues: Queue[] = [
    tokenRefreshQueue,
    webhookRenewalQueue,
    notificationReminderQueue,
    adaptiveSyncQueue,
    googleContactsSyncQueue,
    calendarSyncQueue,
  ];

  let totalCleaned = 0;

  for (const queue of queues) {
    try {
      await queue.clean(olderThanMs, 'completed');
      console.log(`Cleaned completed jobs older than ${olderThanMs}ms from queue ${queue.name}`);
      totalCleaned++;
    } catch (error) {
      console.error(`Failed to clean queue ${queue.name}:`, error);
    }
  }

  return totalCleaned;
}

/**
 * Get comprehensive monitoring report
 */
export async function getMonitoringReport(): Promise<{
  metrics: JobMetrics[];
  backlogAlerts: string[];
  failureRateAlerts: string[];
  timestamp: Date;
}> {
  const metrics = await getAllQueueMetrics();
  const { alerts: backlogAlerts } = await checkQueueBacklog();
  const failureRateAlerts: string[] = [];

  for (const metric of metrics) {
    const { alert } = await checkFailureRate(metric.queueName);
    if (alert) {
      failureRateAlerts.push(alert);
    }
  }

  return {
    metrics,
    backlogAlerts,
    failureRateAlerts,
    timestamp: new Date(),
  };
}
