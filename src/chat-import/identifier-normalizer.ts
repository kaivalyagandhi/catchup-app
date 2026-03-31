/**
 * Identifier Normalizer
 *
 * Normalizes participant identifiers from chat exports into canonical forms:
 *  - Phone numbers → E.164 format (+1234567890)
 *  - Email addresses → lowercase
 *  - Usernames → lowercase
 *
 * Requirements: 6.4
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type IdentifierType = 'phone' | 'email' | 'username' | 'display_name';

export interface NormalizedIdentifier {
  identifier: string;
  identifierType: IdentifierType;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Detect the type of an identifier string and normalize it.
 */
export function normalizeIdentifier(raw: string): NormalizedIdentifier {
  const trimmed = raw.trim();

  if (isEmail(trimmed)) {
    return { identifier: normalizeEmail(trimmed), identifierType: 'email' };
  }

  if (isPhoneNumber(trimmed)) {
    return { identifier: normalizePhone(trimmed), identifierType: 'phone' };
  }

  if (isUsername(trimmed)) {
    return { identifier: normalizeUsername(trimmed), identifierType: 'username' };
  }

  // Fallback: treat as display name (leave casing intact, just trim)
  return { identifier: trimmed, identifierType: 'display_name' };
}

/**
 * Normalize a phone number string to E.164 format.
 * Returns the normalized string, or the cleaned digits prefixed with '+'
 * if a full E.164 conversion isn't possible.
 *
 * Handles common formats:
 *  +1 (555) 123-4567  →  +15551234567
 *  00441234567890      →  +441234567890
 *  (555) 123-4567      →  +15551234567  (assumes US +1 when no country code)
 */
export function normalizePhone(raw: string): string {
  // Strip everything except digits and leading +
  let cleaned = raw.trim();

  // Replace leading 00 with + (international dialing prefix)
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  const hasPlus = cleaned.startsWith('+');
  const digits = cleaned.replace(/\D/g, '');

  if (digits.length === 0) {
    return raw.trim();
  }

  // Already has country code indicator
  if (hasPlus) {
    return '+' + digits;
  }

  // 10-digit number without country code → assume US/Canada (+1)
  if (digits.length === 10) {
    return '+1' + digits;
  }

  // 11 digits starting with 1 → likely US with leading 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }

  // Otherwise prefix with + and hope for the best
  return '+' + digits;
}

/**
 * Normalize an email address to lowercase.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Normalize a username/handle to lowercase, stripping a leading @ if present.
 */
export function normalizeUsername(raw: string): string {
  let cleaned = raw.trim().toLowerCase();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

// ─── Detection helpers ───────────────────────────────────────────────────────

/** Simple email check: contains @ with text on both sides and a dot in the domain */
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Looks like a phone number: starts with +, 00, or is mostly digits
 * with optional separators (spaces, dashes, parens, dots).
 */
function isPhoneNumber(value: string): boolean {
  // Must have at least 7 digits to be a plausible phone number
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) return false;

  // Starts with + or 00 → very likely phone
  if (value.startsWith('+') || value.startsWith('00')) return true;

  // Mostly digits with allowed separators
  const stripped = value.replace(/[\s\-().+]/g, '');
  return /^\d+$/.test(stripped);
}

/**
 * Looks like a username/handle: starts with @ or is a single word
 * containing only alphanumeric, underscores, or dots (common social handle chars).
 */
function isUsername(value: string): boolean {
  if (value.startsWith('@')) return true;
  // Single token with handle-like characters, no spaces
  return /^[a-zA-Z0-9_.]{2,}$/.test(value) && !value.includes(' ');
}
