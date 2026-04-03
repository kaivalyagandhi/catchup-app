/**
 * Transient Failure Logic Tests
 * 
 * Feature: 034-ui-banner-optimizations, Property 6: Transient refresh failure preserves token status
 * 
 * Tests that transient failures preserve the current token status and increment consecutive_failures.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { applyTransientFailure, TokenStatus } from './transient-failure-logic';

describe('Transient Failure Logic', () => {
  /**
   * Feature: 034-ui-banner-optimizations, Property 6: Transient refresh failure preserves token status
   * 
   * For any token refresh that fails with a transient error, the token health status should
   * remain unchanged from its pre-refresh value, and the consecutive_failures counter should
   * increment by 1.
   * 
   * **Validates: Requirements 2.5, 5.3**
   */
  it('P6: transient failure should preserve status and increment consecutive_failures', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<TokenStatus>('valid', 'expiring_soon', 'expired'),
        fc.integer({ min: 0, max: 1 }), // Only test below 3-strike threshold
        (initialStatus, currentFailures) => {
          const result = applyTransientFailure(initialStatus, currentFailures);

          // Status should be preserved (not escalated since failures < 3)
          expect(result.newStatus).toBe(initialStatus);
          // consecutive_failures should increment by 1
          expect(result.consecutiveFailures).toBe(currentFailures + 1);
          // Should not be escalated
          expect(result.escalatedToRevoked).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
