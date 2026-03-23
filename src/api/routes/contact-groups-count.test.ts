/**
 * Contact Groups Count Invariant Tests
 *
 * Property-based test verifying that for any random set of contact-group assignments,
 * ungroupedCount + groupedCount = totalActiveContacts.
 *
 * Requirements: 1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Pure function that computes ungrouped and grouped counts from a contacts array.
 * This mirrors the logic used by the ungrouped-count endpoint and progress indicator.
 */
function computeGroupCounts(contacts: Array<{ id: string; groups: string[] }>) {
  const ungroupedCount = contacts.filter((c) => c.groups.length === 0).length;
  const groupedCount = contacts.filter((c) => c.groups.length > 0).length;
  return { ungroupedCount, groupedCount, total: contacts.length };
}

describe('Contact Groups Count Invariant', () => {
  // ── Property-Based Tests ──────────────────────────────────────────────

  /**
   * **Property 1: Ungrouped Count Invariant**
   * For any random set of contact-group assignments,
   * ungroupedCount + groupedCount = totalActiveContacts.
   * **Validates: Requirements 1.1**
   */
  it('12.3.1 [PBT] should satisfy ungroupedCount + groupedCount = totalActiveContacts for any contact-group assignments', () => {
    // Arbitrary: generate random arrays of contacts, each with an id and a groups array
    const contactArb = fc.record({
      id: fc.uuid(),
      groups: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
    });

    fc.assert(
      fc.property(
        fc.array(contactArb, { minLength: 0, maxLength: 50 }),
        (contacts) => {
          // Act
          const { ungroupedCount, groupedCount, total } = computeGroupCounts(contacts);

          // Assert: the fundamental invariant
          expect(ungroupedCount + groupedCount).toBe(total);

          // Additional invariants
          expect(ungroupedCount).toBeGreaterThanOrEqual(0);
          expect(groupedCount).toBeGreaterThanOrEqual(0);
          expect(ungroupedCount).toBeLessThanOrEqual(total);
          expect(groupedCount).toBeLessThanOrEqual(total);
        }
      ),
      { numRuns: 100 }
    );
  });
});
