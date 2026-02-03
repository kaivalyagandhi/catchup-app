/**
 * Token Refresh Processor
 *
 * Runs TokenHealthMonitor.refreshExpiringTokens() daily to proactively
 * refresh tokens before they expire.
 *
 * Requirements: 8.2
 */

import { Job } from 'bull';
import { TokenHealthMonitor } from '../../integrations/token-health-monitor';

export interface TokenRefreshJobData {
  // No data needed - processes all users
}

export interface TokenRefreshResult {
  refreshed: number;
  failed: number;
  errors: string[];
  highFailureRate: boolean;
}

const FAILURE_RATE_THRESHOLD = 0.1; // 10% failure rate triggers alert

/**
 * Process token refresh job
 *
 * Refreshes all tokens expiring within 48 hours.
 */
export async function processTokenRefresh(
  job: Job<TokenRefreshJobData>
): Promise<TokenRefreshResult> {
  console.log(`[Token Refresh] Starting token refresh job ${job.id}`);

  const tokenHealthMonitor = TokenHealthMonitor.getInstance();
  const errors: string[] = [];

  try {
    // Refresh all expiring tokens
    const result = await tokenHealthMonitor.refreshExpiringTokens();

    console.log(
      `[Token Refresh] Completed: ${result.refreshed} refreshed, ${result.failed} failed`
    );

    // Calculate failure rate
    const total = result.refreshed + result.failed;
    const failureRate = total > 0 ? result.failed / total : 0;
    const highFailureRate = failureRate > FAILURE_RATE_THRESHOLD;

    if (highFailureRate) {
      const errorMsg = `High token refresh failure rate: ${(failureRate * 100).toFixed(1)}% (${result.failed}/${total})`;
      console.error(`[Token Refresh] ALERT: ${errorMsg}`);
      errors.push(errorMsg);
    }

    return {
      refreshed: result.refreshed,
      failed: result.failed,
      errors,
      highFailureRate,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Token Refresh] Job failed:`, errorMsg);
    errors.push(errorMsg);

    throw error; // Re-throw to mark job as failed
  }
}
