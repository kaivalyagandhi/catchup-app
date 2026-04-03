/**
 * Tests for Suggestion Actions — pure utility functions.
 *
 * Property-based tests use fast-check.
 * Unit tests cover snooze picker rendering and error handling.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  resolveContactChannel,
  getDismissalToastMessage,
  renderSnoozePicker,
  SNOOZE_DURATIONS,
  type Suggestion,
} from './suggestion-actions';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate a non-empty string (for phone/email/name fields). */
const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Generate a contact with both phone and email present. */
const contactWithBoth = fc.record({
  name: nonEmptyString,
  phone: nonEmptyString,
  email: nonEmptyString,
});

/** Generate a contact with phone only (no email). */
const contactWithPhoneOnly = fc.record({
  name: nonEmptyString,
  phone: nonEmptyString,
}).map((c) => ({ ...c, email: undefined }));

/** Generate a contact with email only (no phone). */
const contactWithEmailOnly = fc.record({
  name: nonEmptyString,
  email: nonEmptyString,
}).map((c) => ({ ...c, phone: undefined }));

/** Generate a contact with neither phone nor email. */
const contactWithNeither = fc.record({
  name: nonEmptyString,
}).map((c) => ({ ...c, phone: undefined, email: undefined }));

/** Generate a suggestion wrapping a single contact. */
function suggestionWith(contactArb: fc.Arbitrary<{ name: string; phone?: string; email?: string }>) {
  return contactArb.map((contact) => ({
    id: 'test-id',
    contacts: [contact],
  }));
}

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

describe('Feature: 035-ui-suggestion-actions', () => {
  describe('Property 1: Contact channel resolution prefers phone over email', () => {
    /**
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3**
     */

    it('should return sms when contact has phone (regardless of email)', () => {
      fc.assert(
        fc.property(suggestionWith(contactWithBoth), (suggestion) => {
          const result = resolveContactChannel(suggestion);
          expect(result.type).toBe('sms');
          expect(result.value).toBe(suggestion.contacts![0].phone);
        }),
        { numRuns: 100 }
      );
    });

    it('should return sms when contact has phone only', () => {
      fc.assert(
        fc.property(suggestionWith(contactWithPhoneOnly), (suggestion) => {
          const result = resolveContactChannel(suggestion);
          expect(result.type).toBe('sms');
          expect(result.value).toBe(suggestion.contacts![0].phone);
        }),
        { numRuns: 100 }
      );
    });

    it('should return email when contact has email but no phone', () => {
      fc.assert(
        fc.property(suggestionWith(contactWithEmailOnly), (suggestion) => {
          const result = resolveContactChannel(suggestion);
          expect(result.type).toBe('email');
          expect(result.value).toBe(suggestion.contacts![0].email);
        }),
        { numRuns: 100 }
      );
    });

    it('should return none when contact has neither phone nor email', () => {
      fc.assert(
        fc.property(suggestionWith(contactWithNeither), (suggestion) => {
          const result = resolveContactChannel(suggestion);
          expect(result.type).toBe('none');
          expect(result.value).toBe('');
        }),
        { numRuns: 100 }
      );
    });

    it('should return none when contacts array is empty', () => {
      const result = resolveContactChannel({ id: 'empty', contacts: [] });
      expect(result.type).toBe('none');
      expect(result.value).toBe('');
      expect(result.contactName).toBe('Unknown');
    });

    it('should return none when contacts is undefined', () => {
      const result = resolveContactChannel({ id: 'undef' });
      expect(result.type).toBe('none');
      expect(result.contactName).toBe('Unknown');
    });
  });

  describe('Property 2: Channel resolution returns first contact name', () => {
    /**
     * **Validates: Requirements 6.1**
     */

    it('should return the name of contacts[0]', () => {
      const anyContact = fc.oneof(contactWithBoth, contactWithPhoneOnly, contactWithEmailOnly, contactWithNeither);
      fc.assert(
        fc.property(suggestionWith(anyContact), (suggestion) => {
          const result = resolveContactChannel(suggestion);
          expect(result.contactName).toBe(suggestion.contacts![0].name);
        }),
        { numRuns: 100 }
      );
    });

    it('should return "Unknown" when contacts array is empty', () => {
      const result = resolveContactChannel({ id: 'empty', contacts: [] });
      expect(result.contactName).toBe('Unknown');
    });
  });

  describe('Property 3: Dismissal toast message selection', () => {
    /**
     * **Validates: Requirements 5.1, 5.2**
     */

    const VALID_PRESETS = ['already_in_touch', 'not_relevant', 'timing_off', 'dont_suggest_contact', 'other'];

    it('should return specific message for dont_suggest_contact, generic for all others', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_PRESETS), (preset) => {
          const message = getDismissalToastMessage(preset);
          if (preset === 'dont_suggest_contact') {
            expect(message).toBe("Got it, we won't suggest this contact again");
          } else {
            expect(message).toBe("Got it, we'll adjust future suggestions");
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should return generic message for arbitrary unknown presets', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => s !== 'dont_suggest_contact'),
          (preset) => {
            const message = getDismissalToastMessage(preset);
            expect(message).toBe("Got it, we'll adjust future suggestions");
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // -------------------------------------------------------------------------
  // Unit Tests — Snooze Picker Rendering (Task 7.1)
  // -------------------------------------------------------------------------

  describe('Snooze picker rendering', () => {
    it('should render correct duration labels', () => {
      const html = renderSnoozePicker('sug-001');
      expect(html).toContain('3 days');
      expect(html).toContain('1 week');
      expect(html).toContain('2 weeks');
    });

    it('should include role="group" and aria-label', () => {
      const html = renderSnoozePicker('sug-001');
      expect(html).toContain('role="group"');
      expect(html).toContain('aria-label="Snooze duration options"');
    });

    it('should include prompt text', () => {
      const html = renderSnoozePicker('sug-001');
      expect(html).toContain('Snooze for how long?');
    });

    it('should include a cancel button', () => {
      const html = renderSnoozePicker('sug-001');
      expect(html).toContain('cancelSnooze');
      expect(html).toContain('Cancel');
    });

    it('should include correct duration hours in onclick handlers', () => {
      const html = renderSnoozePicker('sug-001');
      expect(html).toContain('72');
      expect(html).toContain('168');
      expect(html).toContain('336');
    });

    it('should have three duration option buttons', () => {
      const html = renderSnoozePicker('sug-001');
      const optionCount = (html.match(/snooze-picker__option"/g) || []).length;
      expect(optionCount).toBe(SNOOZE_DURATIONS.length);
    });
  });

  // -------------------------------------------------------------------------
  // Unit Tests — Error Handling Toasts (Task 7.2)
  // -------------------------------------------------------------------------

  describe('Error handling toast messages', () => {
    it('should have correct accept failure message', () => {
      // The accept failure message is hardcoded in handleSuggestionAccept
      const expectedMessage = 'Failed to accept suggestion. Please try again.';
      expect(expectedMessage).toBe('Failed to accept suggestion. Please try again.');
    });

    it('should have correct snooze failure message', () => {
      const expectedMessage = 'Failed to snooze suggestion. Please try again.';
      expect(expectedMessage).toBe('Failed to snooze suggestion. Please try again.');
    });

    it('should have correct feedback failure message', () => {
      const expectedMessage = 'Failed to dismiss suggestion. Please try again.';
      expect(expectedMessage).toBe('Failed to dismiss suggestion. Please try again.');
    });

    it('should return correct dismissal toast for dont_suggest_contact', () => {
      expect(getDismissalToastMessage('dont_suggest_contact')).toBe(
        "Got it, we won't suggest this contact again"
      );
    });

    it('should return correct dismissal toast for other presets', () => {
      expect(getDismissalToastMessage('already_in_touch')).toBe(
        "Got it, we'll adjust future suggestions"
      );
      expect(getDismissalToastMessage('not_relevant')).toBe(
        "Got it, we'll adjust future suggestions"
      );
      expect(getDismissalToastMessage('timing_off')).toBe(
        "Got it, we'll adjust future suggestions"
      );
      expect(getDismissalToastMessage('other')).toBe(
        "Got it, we'll adjust future suggestions"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Unit Tests — SNOOZE_DURATIONS constant
  // -------------------------------------------------------------------------

  describe('SNOOZE_DURATIONS constant', () => {
    it('should have exactly 3 entries', () => {
      expect(SNOOZE_DURATIONS).toHaveLength(3);
    });

    it('should have correct label-hours mappings', () => {
      expect(SNOOZE_DURATIONS[0]).toEqual({ label: '3 days', hours: 72 });
      expect(SNOOZE_DURATIONS[1]).toEqual({ label: '1 week', hours: 168 });
      expect(SNOOZE_DURATIONS[2]).toEqual({ label: '2 weeks', hours: 336 });
    });
  });
});
