/**
 * Pure utility functions for suggestion card actions.
 * Extracted from public/js/home-dashboard.js for testability.
 *
 * @module suggestion-actions
 */

export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
}

export interface Suggestion {
  id: string;
  contacts?: Contact[];
  [key: string]: unknown;
}

export interface ContactChannel {
  type: 'sms' | 'email' | 'none';
  value: string;
  contactName: string;
}

export const SNOOZE_DURATIONS = [
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
  { label: '2 weeks', hours: 336 },
] as const;

/**
 * Resolve the preferred contact channel for a suggestion.
 * Prefers phone (SMS) over email; falls back to 'none'.
 */
export function resolveContactChannel(suggestion: Suggestion): ContactChannel {
  const contacts = suggestion.contacts || [];
  const contact = contacts[0];
  if (!contact) {
    return { type: 'none', value: '', contactName: 'Unknown' };
  }
  const contactName = contact.name || 'Unknown';
  if (contact.phone) {
    return { type: 'sms', value: contact.phone, contactName };
  }
  if (contact.email) {
    return { type: 'email', value: contact.email, contactName };
  }
  return { type: 'none', value: '', contactName };
}

/**
 * Return the appropriate toast message for a dismissal feedback preset.
 */
export function getDismissalToastMessage(preset: string): string {
  if (preset === 'dont_suggest_contact') {
    return "Got it, we won't suggest this contact again";
  }
  return "Got it, we'll adjust future suggestions";
}

/**
 * Render the inline snooze picker HTML.
 */
export function renderSnoozePicker(suggestionId: string): string {
  const buttonsHtml = SNOOZE_DURATIONS.map(
    (d) =>
      `<button class="snooze-picker__option" onclick="handleSnoozeSelect('${suggestionId}', ${d.hours}, '${d.label}')">${d.label}</button>`
  ).join('');

  return `
    <div class="snooze-picker" role="group" aria-label="Snooze duration options">
      <p class="snooze-picker__prompt">Snooze for how long?</p>
      <div class="snooze-picker__options">
        ${buttonsHtml}
      </div>
      <button class="snooze-picker__cancel" onclick="cancelSnooze('${suggestionId}')">Cancel</button>
    </div>
  `;
}
