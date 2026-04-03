/**
 * Health Response Consistency Logic
 * 
 * Pure function for computing health response fields from token status.
 * Extracted from GracefulDegradationService for testability.
 * 
 * Feature: 034-ui-banner-optimizations
 */

export type TokenStatus = 'valid' | 'expiring_soon' | 'expired' | 'revoked';

export interface HealthResponseFields {
  available: boolean;
  requiresReauth: boolean;
  tokenStatus: TokenStatus;
}

/**
 * Compute health response fields from a token status.
 * - valid/expiring_soon → available: true, requiresReauth: false
 * - revoked → available: false, requiresReauth: true
 * - expired → available: true, requiresReauth: false (can be auto-refreshed)
 */
export function computeHealthResponse(tokenStatus: TokenStatus): HealthResponseFields {
  if (tokenStatus === 'revoked') {
    return { available: false, requiresReauth: true, tokenStatus };
  }
  // valid, expiring_soon, expired are all recoverable
  return { available: true, requiresReauth: false, tokenStatus };
}
