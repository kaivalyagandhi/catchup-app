/**
 * Banner Offset Calculation Tests
 * 
 * Feature: 034-ui-banner-optimizations, Property 1: Header control offset accounts for banner height
 * 
 * Tests that header controls are positioned correctly relative to the sync warning banner.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateHeaderOffset } from './banner-offset';

describe('Banner Offset Calculation', () => {
  /**
   * Feature: 034-ui-banner-optimizations, Property 1: Header control offset accounts for banner height
   * 
   * For any banner height (including 0 when hidden), the computed top position of header controls
   * should be max(bannerHeight + 8, 20) when the banner is visible, and exactly 20 when hidden.
   * 
   * **Validates: Requirements 1.3, 1.4, 1.5**
   */
  it('P1: offset should be >= bannerHeight + 8 when visible, exactly 20 when hidden', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 0, max: 500 }),
        (bannerVisible, bannerHeight) => {
          const offset = calculateHeaderOffset(bannerVisible, bannerHeight);

          if (bannerVisible && bannerHeight > 0) {
            // When visible, offset must be at least bannerHeight + 8
            expect(offset).toBeGreaterThanOrEqual(bannerHeight + 8);
            // And at least 20
            expect(offset).toBeGreaterThanOrEqual(20);
            // Exactly max(bannerHeight + 8, 20)
            expect(offset).toBe(Math.max(bannerHeight + 8, 20));
          } else {
            // When hidden (or zero height), offset is exactly 20
            expect(offset).toBe(20);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
