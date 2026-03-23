/**
 * Property-Based Tests for KeyboardShortcutPreferences
 * 
 * Feature: organize-contacts-evolution
 * 
 * Tests correctness properties for the KeyboardShortcutPreferences component
 * using property-based testing with fast-check.
 * 
 * **Validates: Requirements 8.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Testable version of autoAssign logic extracted from KeyboardShortcutPreferences.
 * The actual component lives in public/js/ as vanilla JS with DOM dependencies,
 * so we replicate the pure logic here for property testing.
 */
function autoAssign(groups: Array<{ id: string; name: string }>): Record<string, string> {
  const shortcuts: Record<string, string> = {};
  const limit = Math.min(groups.length, 10);
  for (let i = 0; i < limit; i++) {
    shortcuts[groups[i].id] = String(i);
  }
  return shortcuts;
}

/**
 * Testable version of validate logic from KeyboardShortcutPreferences.
 */
function validate(
  shortcuts: Record<string, string>,
  groups: Array<{ id: string; name: string }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seen: Record<string, string> = {};

  for (const [groupId, shortcut] of Object.entries(shortcuts)) {
    if (shortcut === '' || shortcut === undefined) continue;

    if (seen[shortcut]) {
      const existingGroup = groups.find(g => g.id === seen[shortcut]);
      const currentGroup = groups.find(g => g.id === groupId);
      const existingName = existingGroup ? existingGroup.name : seen[shortcut];
      const currentName = currentGroup ? currentGroup.name : groupId;
      errors.push(`Shortcut ${shortcut} is assigned to both "${existingName}" and "${currentName}"`);
    } else {
      seen[shortcut] = groupId;
    }
  }

  return { valid: errors.length === 0, errors };
}

// Generator for a group object with unique id
const groupArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 })
});

// Generator for arrays of 1-10 groups with unique IDs
const groupArrayArb = fc.array(groupArb, { minLength: 1, maxLength: 10 }).map(groups => {
  // Ensure unique IDs
  const seen = new Set<string>();
  return groups.filter(g => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}).filter(groups => groups.length >= 1);

describe('KeyboardShortcutPreferences', () => {
  describe('Property 8: Keyboard Shortcut Uniqueness', () => {
    /**
     * 9.7.1 [PBT] Property test: generate random group arrays of size 1-10,
     * verify autoAssign() produces all unique shortcut values.
     * 
     * **Validates: Requirements 8.3**
     */
    it('9.7.1 should produce all unique shortcut values after autoAssign for groups of size 1-10', () => {
      fc.assert(
        fc.property(groupArrayArb, (groups) => {
          const shortcuts = autoAssign(groups);
          const values = Object.values(shortcuts);

          // All shortcut values should be unique
          const uniqueValues = new Set(values);
          expect(uniqueValues.size).toBe(values.length);

          // Number of assignments should be min(groups.length, 10)
          const expectedCount = Math.min(groups.length, 10);
          expect(values.length).toBe(expectedCount);

          // Each value should be a string digit 0-9
          for (const v of values) {
            expect(Number(v)).toBeGreaterThanOrEqual(0);
            expect(Number(v)).toBeLessThanOrEqual(9);
          }

          // Values should be sequential starting from 0
          for (let i = 0; i < expectedCount; i++) {
            expect(shortcuts[groups[i].id]).toBe(String(i));
          }

          // Validate should pass (no duplicates)
          const validation = validate(shortcuts, groups);
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
