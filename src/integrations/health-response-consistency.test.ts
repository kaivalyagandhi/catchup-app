/**
 * Health Response Consistency Tests
 * 
 * Feature: 034-ui-banner-optimizations, Property 11: Health endpoint response reflects post-refresh token state
 * 
 * Tests that available/requiresReauth/tokenStatus fields are consistent.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeHealthResponse, TokenStatus } from './health-response-consistency';

describe('Health Response Consistency', () => {
  /**
   * Feature: 034-ui-banner-optimizations, Property 11: Health endpoint response reflects post-refresh token state
   * 
   * For any call to the comprehensive-health endpoint, the response tokenStatus field should be
   * one of {valid, expiring_soon, expired, revoked}, and the available and requiresReauth fields
   * should be consistent: available === true and requiresReauth === false when tokenStatus is
   * valid or expiring_soon, and available === false and requiresReauth === true when tokenStatus is revoked.
   * 
   * **Validates: Requirements 6.2, 6.3, 6.4**
   */
  it('P11: available/requiresReauth should be consistent with tokenStatus', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<TokenStatus>('valid', 'expiring_soon', 'expired', 'revoked'),
        (tokenStatus) => {
          const result = computeHealthResponse(tokenStatus);

          // tokenStatus should be preserved
          expect(result.tokenStatus).toBe(tokenStatus);

          if (tokenStatus === 'valid' || tokenStatus === 'expiring_soon') {
            expect(result.available).toBe(true);
            expect(result.requiresReauth).toBe(false);
          } else if (tokenStatus === 'revoked') {
            expect(result.available).toBe(false);
            expect(result.requiresReauth).toBe(true);
          } else if (tokenStatus === 'expired') {
            // expired with refresh token is recoverable
            expect(result.available).toBe(true);
            expect(result.requiresReauth).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
