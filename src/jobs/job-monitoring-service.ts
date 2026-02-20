/**
 * Job Monitoring Service
 *
 * DEPRECATED: This service monitored Bull/BullMQ queues.
 * With Cloud Tasks, monitoring is done via GCP Console.
 * 
 * TODO: Remove this file after verifying no dependencies.
 * See BULL_CLEANUP_TASK.md for details.
 *
 * Requirements: 10.4
 */

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

// DEPRECATED: All functions below are stubs
// Cloud Tasks monitoring is done via GCP Console

export async function getAllQueueMetrics(): Promise<JobMetrics[]> {
  console.warn('getAllQueueMetrics is deprecated - use GCP Console for Cloud Tasks monitoring');
  return [];
}

export async function getQueueMetrics(queueName: string): Promise<JobMetrics | null> {
  console.warn('getQueueMetrics is deprecated - use GCP Console for Cloud Tasks monitoring');
  return null;
}

export async function checkQueueBacklog(): Promise<{ hasBacklog: boolean; alerts: string[] }> {
  console.warn('checkQueueBacklog is deprecated - use GCP Console for Cloud Tasks monitoring');
  return { hasBacklog: false, alerts: [] };
}

export async function checkFailureRate(queueName: string): Promise<{ failureRate: number; isHigh: boolean }> {
  console.warn('checkFailureRate is deprecated - use GCP Console for Cloud Tasks monitoring');
  return { failureRate: 0, isHigh: false };
}

export async function getFailedJobs(queueName: string, limit: number): Promise<any[]> {
  console.warn('getFailedJobs is deprecated - use GCP Console for Cloud Tasks monitoring');
  return [];
}

export async function retryFailedJobs(queueName: string): Promise<number> {
  console.warn('retryFailedJobs is deprecated - use GCP Console for Cloud Tasks monitoring');
  return 0;
}

export async function cleanupCompletedJobs(olderThanMs: number): Promise<number> {
  console.warn('cleanupCompletedJobs is deprecated - use GCP Console for Cloud Tasks monitoring');
  return 0;
}

export async function getMonitoringReport(): Promise<any> {
  console.warn('getMonitoringReport is deprecated - use GCP Console for Cloud Tasks monitoring');
  return {
    timestamp: new Date(),
    queues: [],
    summary: {
      totalQueues: 0,
      totalWaiting: 0,
      totalActive: 0,
      totalCompleted: 0,
      totalFailed: 0,
    },
    alerts: ['Job monitoring is deprecated - use GCP Console for Cloud Tasks'],
  };
}
