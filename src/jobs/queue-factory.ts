import { Queue, Worker, Job, QueueOptions, WorkerOptions, Processor } from 'bullmq';
import { getBullMQConnection, logConnectionInfo } from './bullmq-connection';
import { CloudTasksQueue } from './cloud-tasks-client';

/**
 * Queue Factory for BullMQ and Cloud Tasks
 * 
 * This factory creates queues and workers that share a single connection pool (BullMQ),
 * or uses Cloud Tasks (HTTP-based, serverless-native).
 * 
 * Feature flag USE_CLOUD_TASKS controls which system is used:
 * - false: BullMQ with shared connection pool (1-3 connections)
 * - true: Cloud Tasks with HTTP requests (0 connections)
 * 
 * Usage:
 * ```typescript
 * // Create a queue
 * const queue = createQueue('my-queue');
 * await queue.add('job-name', { data: 'value' });
 * 
 * // Create a worker (BullMQ only)
 * const worker = createWorker('my-queue', async (job) => {
 *   console.log('Processing job:', job.data);
 * });
 * ```
 */

// Feature flag for Cloud Tasks
const USE_CLOUD_TASKS = process.env.USE_CLOUD_TASKS === 'true';

// Track created queues and workers for cleanup
const queues: Map<string, Queue | CloudTasksQueue> = new Map();
const workers: Map<string, Worker> = new Map();

/**
 * Create a queue with shared connection (BullMQ) or Cloud Tasks
 * 
 * @param name - Queue name (must be unique)
 * @param options - Optional queue configuration (BullMQ only)
 * @returns Queue instance
 */
export function createQueue<T = any>(
  name: string,
  options?: Partial<QueueOptions>
): Queue<T> | CloudTasksQueue {
  // Check if queue already exists
  if (queues.has(name)) {
    console.log(`[Queue Factory] Reusing existing queue: ${name}`);
    return queues.get(name) as Queue<T> | CloudTasksQueue;
  }

  if (USE_CLOUD_TASKS) {
    console.log(`[Queue Factory] Creating Cloud Tasks queue: ${name}`);
    const queue = new CloudTasksQueue(name);
    queues.set(name, queue);
    return queue;
  }

  console.log(`[Queue Factory] Creating BullMQ queue: ${name}`);
  
  const queue = new Queue<T>(name, {
    connection: getBullMQConnection(),
    ...options,
  });

  // Store for cleanup
  queues.set(name, queue);

  // Log connection info on first queue creation
  if (queues.size === 1) {
    logConnectionInfo();
  }

  return queue;
}

/**
 * Create a BullMQ worker with shared connection
 * 
 * Note: Workers are only used with BullMQ. Cloud Tasks uses HTTP endpoints.
 * 
 * @param name - Queue name (must match queue)
 * @param processor - Job processing function
 * @param options - Optional worker configuration
 * @returns Worker instance
 */
export function createWorker<T = any>(
  name: string,
  processor: Processor<T>,
  options?: Partial<WorkerOptions>
): Worker<T> {
  if (USE_CLOUD_TASKS) {
    console.warn(`[Queue Factory] Workers not used with Cloud Tasks. Skipping worker creation for: ${name}`);
    // Return a dummy worker that won't actually process anything
    // This allows existing code to continue working during migration
    return null as any;
  }

  // Check if worker already exists
  if (workers.has(name)) {
    console.log(`[Queue Factory] Reusing existing worker: ${name}`);
    return workers.get(name) as Worker<T>;
  }

  console.log(`[Queue Factory] Creating worker: ${name}`);
  
  const worker = new Worker<T>(name, processor, {
    connection: getBullMQConnection(),
    concurrency: 1, // Default to 1, can be overridden
    ...options,
  });

  // Store for cleanup
  workers.set(name, worker);

  // Set up event handlers
  worker.on('completed', (job: Job<T>) => {
    console.log(`[Worker ${name}] Job ${job.id} completed`);
  });

  worker.on('failed', (job: Job<T> | undefined, error: Error) => {
    console.error(`[Worker ${name}] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error: Error) => {
    console.error(`[Worker ${name}] Worker error:`, error.message);
  });

  return worker;
}

/**
 * Get an existing queue by name
 * 
 * @param name - Queue name
 * @returns Queue instance or undefined
 */
export function getQueue<T = any>(name: string): Queue<T> | CloudTasksQueue | undefined {
  return queues.get(name) as Queue<T> | CloudTasksQueue | undefined;
}

/**
 * Get an existing worker by name
 * 
 * @param name - Worker name
 * @returns Worker instance or undefined
 */
export function getWorker<T = any>(name: string): Worker<T> | undefined {
  return workers.get(name) as Worker<T> | undefined;
}

/**
 * Close a specific queue
 * 
 * @param name - Queue name
 */
export async function closeQueue(name: string): Promise<void> {
  const queue = queues.get(name);
  if (queue) {
    console.log(`[Queue Factory] Closing queue: ${name}`);
    await queue.close();
    queues.delete(name);
  }
}

/**
 * Close a specific worker
 * 
 * @param name - Worker name
 */
export async function closeWorker(name: string): Promise<void> {
  const worker = workers.get(name);
  if (worker) {
    console.log(`[Queue Factory] Closing worker: ${name}`);
    await worker.close();
    workers.delete(name);
  }
}

/**
 * Close all queues and workers
 * 
 * Call this on application shutdown to gracefully close all connections.
 */
export async function closeAll(): Promise<void> {
  console.log('[Queue Factory] Closing all queues and workers...');

  // Close all workers first (stop processing)
  const workerPromises = Array.from(workers.entries()).map(async ([name, worker]) => {
    console.log(`[Queue Factory] Closing worker: ${name}`);
    await worker.close();
  });
  await Promise.all(workerPromises);
  workers.clear();

  // Then close all queues
  const queuePromises = Array.from(queues.entries()).map(async ([name, queue]) => {
    console.log(`[Queue Factory] Closing queue: ${name}`);
    await queue.close();
  });
  await Promise.all(queuePromises);
  queues.clear();

  console.log('[Queue Factory] All queues and workers closed');
}

/**
 * Get statistics about active queues and workers
 */
export function getStats(): {
  queueCount: number;
  workerCount: number;
  queues: string[];
  workers: string[];
} {
  return {
    queueCount: queues.size,
    workerCount: workers.size,
    queues: Array.from(queues.keys()),
    workers: Array.from(workers.keys()),
  };
}

/**
 * Health check for queue factory
 * 
 * @returns true if at least one queue or worker is active
 */
export function isHealthy(): boolean {
  return queues.size > 0 || workers.size > 0;
}

