import { CloudTasksQueue } from './cloud-tasks-client';

/**
 * Queue Factory for Cloud Tasks
 * 
 * Simplified factory that only creates Cloud Tasks queues.
 * BullMQ support has been removed - Cloud Tasks is used exclusively.
 * 
 * Usage:
 * ```typescript
 * // Create a queue
 * const queue = createQueue('my-queue');
 * await queue.add('job-name', { data: 'value' });
 * ```
 */

// Track created queues for cleanup
const queues: Map<string, CloudTasksQueue> = new Map();

/**
 * Create a Cloud Tasks queue
 * 
 * @param name - Queue name (must be unique)
 * @returns CloudTasksQueue instance
 */
export function createQueue(name: string): CloudTasksQueue {
  // Check if queue already exists
  if (queues.has(name)) {
    console.log(`[Queue Factory] Reusing existing queue: ${name}`);
    return queues.get(name)!;
  }

  console.log(`[Queue Factory] Creating Cloud Tasks queue: ${name}`);
  const queue = new CloudTasksQueue(name);
  queues.set(name, queue);
  return queue;
}

/**
 * Get an existing queue by name
 * 
 * @param name - Queue name
 * @returns Queue instance or undefined
 */
export function getQueue(name: string): CloudTasksQueue | undefined {
  return queues.get(name);
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
 * Close all queues
 * 
 * Call this on application shutdown to gracefully close all connections.
 */
export async function closeAll(): Promise<void> {
  console.log('[Queue Factory] Closing all queues...');

  const queuePromises = Array.from(queues.entries()).map(async ([name, queue]) => {
    console.log(`[Queue Factory] Closing queue: ${name}`);
    await queue.close();
  });
  await Promise.all(queuePromises);
  queues.clear();

  console.log('[Queue Factory] All queues closed');
}

/**
 * Get statistics about active queues
 */
export function getStats(): {
  queueCount: number;
  queues: string[];
} {
  return {
    queueCount: queues.size,
    queues: Array.from(queues.keys()),
  };
}

/**
 * Health check for queue factory
 * 
 * @returns true if at least one queue is active
 */
export function isHealthy(): boolean {
  return queues.size > 0;
}
