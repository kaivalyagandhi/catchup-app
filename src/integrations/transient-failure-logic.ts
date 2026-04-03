/**
 * Transient Failure Logic
 * 
 * Pure functions extracted from TokenHealthMonitor.refreshExpiringTokens()
 * for testability. Handles transient failure state transitions.
 * 
 * Feature: 034-ui-banner-optimizations
 */

export type TokenStatus = 'valid' | 'expiring_soon' | 'expired' | 'revoked';

export interface TransientFailureResult {
  newStatus: TokenStatus;
  consecutiveFailures: number;
  escalatedToRevoked: boolean;
}

/**
 * Compute the result of a transient failure on a token.
 * - Status is preserved unless consecutive_failures reaches 3 (escalate to revoked)
 * - consecutive_failures is always incremented by 1
 */
export function applyTransientFailure(
  currentStatus: TokenStatus,
  currentConsecutiveFailures: number
): TransientFailureResult {
  const newFailures = currentConsecutiveFailures + 1;

  if (newFailures >= 3) {
    return {
      newStatus: 'revoked',
      consecutiveFailures: newFailures,
      escalatedToRevoked: true,
    };
  }

  return {
    newStatus: currentStatus,
    consecutiveFailures: newFailures,
    escalatedToRevoked: false,
  };
}
