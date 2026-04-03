/**
 * Refresh Window Tests
 * 
 * Feature: 034-ui-banner-optimizations, Property 2: Proactive refresh within 10-minute expiry window
 * 
 * Tests that token refresh is triggered iff the token expires within 10 minutes.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shouldRefreshToken } from './refresh-window';

describe('Refresh Window', () => {
  /**
   * Feature: 034-ui-banner-optimizations, Property 2: Proactive refresh within 10-minute expiry window
   * 
   * For any token with an expiry time, calling getAccessToken should trigger a refresh when
   * the token expires within 10 minutes of the current time, and should return the existing
   * token without refreshing when the expiry is more than 10 minutes away.
   * 
   * **Validates: Requirements 2.1**
   */
  it('P2: should trigger refresh iff token expires within 10 minutes', () => {
    const now = new Date('2025-01-15T12:00:00Z');

    fc.assert(
      fc.property(
        // Generate offset in minutes from now: -60 to +60
        fc.integer({ min: -60, max: 60 }),
        (minutesFromNow) => {
          const expiresAt = new Date(now.getTime() + minutesFromNow * 60 * 1000);
          const result = shouldRefreshToken(expiresAt, now);

          if (minutesFromNow < 10) {
            // Token expires within 10 minutes (or already expired) → should refresh
            expect(result).toBe(true);
          } else {
            // Token expires more than 10 minutes from now → should not refresh
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return false when expiresAt is null or undefined', () => {
    const now = new Date();
    expect(shouldRefreshToken(null, now)).toBe(false);
    expect(shouldRefreshToken(undefined, now)).toBe(false);
  });
});
