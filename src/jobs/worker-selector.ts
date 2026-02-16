/**
 * Worker Selector
 *
 * Allows switching between Bull and BullMQ workers via environment variable.
 * This enables gradual migration and easy rollback if needed.
 *
 * Set USE_BULLMQ=true to use BullMQ (Phase 2)
 * Set USE_BULLMQ=false or leave unset to use Bull (current)
 */

/**
 * Start the appropriate worker based on configuration
 */
export async function startWorker(): Promise<void> {
  const useBullMQ = process.env.USE_BULLMQ === 'true';

  if (useBullMQ) {
    console.log('[Worker Selector] Using BullMQ worker (Phase 2)');
    const { startBullMQWorker } = await import('./bullmq-worker');
    startBullMQWorker();
  } else {
    console.log('[Worker Selector] Using Bull worker (current)');
    const { startWorker: startBullWorker } = await import('./worker');
    startBullWorker();
  }
}

/**
 * Stop the appropriate worker
 */
export async function stopWorker(): Promise<void> {
  const useBullMQ = process.env.USE_BULLMQ === 'true';

  if (useBullMQ) {
    console.log('[Worker Selector] Stopping BullMQ worker');
    const { stopBullMQWorker } = await import('./bullmq-worker');
    await stopBullMQWorker();
  } else {
    console.log('[Worker Selector] Stopping Bull worker');
    const { stopWorker: stopBullWorker } = await import('./worker');
    await stopBullWorker();
  }
}

