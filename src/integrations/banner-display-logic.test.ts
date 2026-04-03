/**
 * Banner Display Logic Tests
 * 
 * Feature: 034-ui-banner-optimizations, Property 7: Banner reconnection prompt gated on revoked status
 * 
 * Tests that the reconnection banner is shown if and only if tokenStatus is 'revoked'.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shouldShowReconnectionBanner, TokenStatus, IntegrationHealth } from './banner-display-logic';

const tokenStatusArb = fc.constantFrom<TokenStatus>('valid', 'expiring_soon', 'expired', 'revoked');

const healthArb = (status: TokenStatus): fc.Arbitrary<IntegrationHealth> =>
  fc.record({
    available: fc.boolean(),
    requiresReauth: fc.boolean(),
    tokenStatus: fc.constant(status),
  });

describe('Banner Display Logic', () => {
  /**
   * Feature: 034-ui-banner-optimizations, Property 7: Banner reconnection prompt gated on revoked status
   * 
   * For any token status value in {valid, expiring_soon, expired, revoked}, the sync warning
   * banner should display a reconnection prompt if and only if the status is 'revoked'.
   * 
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */
  it('P7: reconnection banner shown iff tokenStatus is revoked', () => {
    fc.assert(
      fc.property(
        tokenStatusArb,
        tokenStatusArb,
        (contactsStatus, calendarStatus) => {
          const contactsHealth: IntegrationHealth = {
            available: contactsStatus !== 'revoked',
            requiresReauth: contactsStatus === 'revoked',
            tokenStatus: contactsStatus,
          };
          const calendarHealth: IntegrationHealth = {
            available: calendarStatus !== 'revoked',
            requiresReauth: calendarStatus === 'revoked',
            tokenStatus: calendarStatus,
          };

          const result = shouldShowReconnectionBanner(contactsHealth, calendarHealth);
          const expectedRevoked = contactsStatus === 'revoked' || calendarStatus === 'revoked';

          expect(result).toBe(expectedRevoked);
        }
      ),
      { numRuns: 100 }
    );
  });
});
