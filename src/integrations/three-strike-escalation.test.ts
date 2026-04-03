/**
 * Three-Strike Escalation Tests
 * 
 * Feature: 034-ui-banner-optimizations, Property 10: Three consecutive transient failures escalate to revoked
 * 
 * Tests that after exactly 3 consecutive transient failures, the token is escalated to revoked.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { applyTransientFailure, TokenStatus } from './transient-failure-logic';

describe('Three-Strike Escalation', () => {
  /**
   * Feature: 034-ui-banner-optimizations, Property 10: Three consecutive transient failures escalate to revoked
   * 
   * For any token, if consecutive_failures reaches 3 due to transient errors, the token status
   * should be set to 'revoked'. If consecutive_failures is less than 3, the status should remain unchanged.
   * 
   * **Validates: Requirements 5.5**
   */
  it('P10: should escalate to revoked after exactly 3 consecutive transient failures', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<TokenStatus>('valid', 'expiring_soon', 'expired'),
        fc.integer({ min: 1, max: 5 }), // sequence length
        (initialStatus, sequenceLength) => {
          let status: TokenStatus = initialStatus;
          let failures = 0;

          for (let i = 0; i < sequenceLength; i++) {
            const result = applyTransientFailure(status, failures);
            status = result.newStatus;
            failures = result.consecutiveFailures;
          }

          if (sequenceLength >= 3) {
            // After 3+ failures, should be revoked
            expect(status).toBe('revoked');
            expect(failures).toBe(sequenceLength);
          } else {
            // Before 3 failures, status should be preserved
            expect(status).toBe(initialStatus);
            expect(failures).toBe(sequenceLength);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
