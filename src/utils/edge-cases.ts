/**
 * Edge Case Handling Utilities
 *
 * Handles various edge cases across the system including:
 * - Contacts without location (manual timezone entry)
 * - Daylight saving time transitions
 * - Cross-timezone suggestions
 * - Contacts with no interaction history
 * - Contacts with no frequency preference
 * - Calendars with no free slots
 */

import { FrequencyOption } from '../types';

/**
 * Default frequency preference when none is set
 */
export const DEFAULT_FREQUENCY_PREFERENCE: FrequencyOption = FrequencyOption.MONTHLY;

/**
 * Get frequency preference with fallback to default
 */
export function getFrequencyPreferenceOrDefault(
  preference?: FrequencyOption | null
): FrequencyOption {
  return preference || DEFAULT_FREQUENCY_PREFERENCE;
}

/**
 * Get last contact date with fallback to account creation date
 */
export function getLastContactDateOrDefault(
  lastContactDate?: Date | null,
  accountCreatedAt?: Date
): Date {
  if (lastContactDate) {
    return lastContactDate;
  }

  if (accountCreatedAt) {
    return accountCreatedAt;
  }

  // Ultimate fallback: current date
  return new Date();
}

/**
 * Handle daylight saving time transitions
 * Returns adjusted date if DST transition occurred
 */
export function handleDSTTransition(date: Date, timezone: string): Date {
  // Note: In production, use a library like date-fns-tz or luxon for proper DST handling
  // This is a simplified implementation

  try {
    // Create formatter for the timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Format the date in the target timezone
    const parts = formatter.formatToParts(date);
    const tzDate = new Date(
      parseInt(parts.find((p) => p.type === 'year')?.value || '0'),
      parseInt(parts.find((p) => p.type === 'month')?.value || '1') - 1,
      parseInt(parts.find((p) => p.type === 'day')?.value || '1'),
      parseInt(parts.find((p) => p.type === 'hour')?.value || '0'),
      parseInt(parts.find((p) => p.type === 'minute')?.value || '0'),
      parseInt(parts.find((p) => p.type === 'second')?.value || '0')
    );

    return tzDate;
  } catch (error) {
    console.warn('Error handling DST transition:', error);
    return date;
  }
}

/**
 * Format time for display in multiple timezones
 */
export interface CrossTimezoneDisplay {
  userTime: string;
  contactTime: string;
  userTimezone: string;
  contactTimezone: string;
}

export function formatCrossTimezone(
  date: Date,
  userTimezone: string,
  contactTimezone: string
): CrossTimezoneDisplay {
  const userFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const contactFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: contactTimezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    userTime: userFormatter.format(date),
    contactTime: contactFormatter.format(date),
    userTimezone,
    contactTimezone,
  };
}

/**
 * Check if two timezones are significantly different (>1 hour offset)
 */
export function hasSignificantTimezoneOffset(
  timezone1: string,
  timezone2: string,
  referenceDate: Date = new Date()
): boolean {
  try {
    // Get offset for each timezone
    const offset1 = getTimezoneOffset(referenceDate, timezone1);
    const offset2 = getTimezoneOffset(referenceDate, timezone2);

    // Check if difference is more than 1 hour
    const diffMinutes = Math.abs(offset1 - offset2);
    return diffMinutes > 60;
  } catch (error) {
    console.warn('Error checking timezone offset:', error);
    return false;
  }
}

/**
 * Get timezone offset in minutes
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const tzDate = new Date(
    parseInt(parts.find((p) => p.type === 'year')?.value || '0'),
    parseInt(parts.find((p) => p.type === 'month')?.value || '1') - 1,
    parseInt(parts.find((p) => p.type === 'day')?.value || '1'),
    parseInt(parts.find((p) => p.type === 'hour')?.value || '0'),
    parseInt(parts.find((p) => p.type === 'minute')?.value || '0'),
    parseInt(parts.find((p) => p.type === 'second')?.value || '0')
  );

  // Calculate offset in minutes
  const utcDate = new Date(date.toISOString());
  const offsetMs = tzDate.getTime() - utcDate.getTime();
  return Math.round(offsetMs / (1000 * 60));
}

/**
 * Handle empty calendar (no free slots)
 */
export interface NoFreeSlotsResult {
  hasSlots: boolean;
  message?: string;
  suggestions?: string[];
}

export function handleNoFreeSlots(
  freeSlots: any[],
  dateRange: { start: Date; end: Date }
): NoFreeSlotsResult {
  if (freeSlots.length > 0) {
    return { hasSlots: true };
  }

  const daysInRange = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    hasSlots: false,
    message: `No free time slots found in the next ${daysInRange} days.`,
    suggestions: [
      'Expand your availability parameters to include more time blocks',
      'Extend the date range for suggestion generation',
      'Review your calendar for events that could be rescheduled',
      'Consider shorter meeting durations for catchups',
    ],
  };
}

/**
 * Validate contact has minimum required data for suggestions
 */
export interface ContactValidationResult {
  valid: boolean;
  missingFields: string[];
  warnings: string[];
}

export function validateContactForSuggestions(contact: {
  name?: string;
  timezone?: string;
  location?: string;
  frequencyPreference?: FrequencyOption | null;
  lastContactDate?: Date | null;
}): ContactValidationResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (!contact.name) {
    missingFields.push('name');
  }

  if (!contact.timezone && !contact.location) {
    warnings.push('No timezone or location set. Manual timezone entry recommended.');
  }

  if (!contact.frequencyPreference) {
    warnings.push(
      `No frequency preference set. Using default: ${DEFAULT_FREQUENCY_PREFERENCE}`
    );
  }

  if (!contact.lastContactDate) {
    warnings.push('No interaction history. Using account creation date as baseline.');
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Handle contact without timezone
 */
export interface TimezonePromptResult {
  requiresManualEntry: boolean;
  message: string;
  suggestedTimezones?: string[];
}

export function handleMissingTimezone(
  location?: string | null
): TimezonePromptResult {
  if (!location) {
    return {
      requiresManualEntry: true,
      message: 'No location provided. Please manually select a timezone.',
      suggestedTimezones: [
        'America/New_York',
        'America/Los_Angeles',
        'America/Chicago',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Australia/Sydney',
      ],
    };
  }

  return {
    requiresManualEntry: true,
    message: `Location "${location}" could not be matched to timezone dataset. Please manually select a timezone.`,
    suggestedTimezones: [
      'America/New_York',
      'America/Los_Angeles',
      'America/Chicago',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Australia/Sydney',
    ],
  };
}

/**
 * Calculate days since last contact with fallback
 */
export function calculateDaysSinceLastContact(
  lastContactDate?: Date | null,
  accountCreatedAt?: Date
): number {
  const effectiveDate = getLastContactDateOrDefault(lastContactDate, accountCreatedAt);
  const now = new Date();
  const diffMs = now.getTime() - effectiveDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get frequency threshold in days
 */
export function getFrequencyThresholdDays(frequency: FrequencyOption): number {
  switch (frequency) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
    case 'yearly':
      return 365;
    case 'flexible':
      return 60; // Default to ~2 months for flexible
    default:
      return 30; // Default to monthly
  }
}

/**
 * Check if contact is due for catchup
 */
export function isContactDueForCatchup(
  lastContactDate?: Date | null,
  frequencyPreference?: FrequencyOption | null,
  accountCreatedAt?: Date
): boolean {
  const frequency = getFrequencyPreferenceOrDefault(frequencyPreference);
  const daysSince = calculateDaysSinceLastContact(lastContactDate, accountCreatedAt);
  const threshold = getFrequencyThresholdDays(frequency);

  return daysSince >= threshold;
}

/**
 * Format suggestion with cross-timezone display
 */
export function formatSuggestionWithTimezones(
  date: Date,
  userTimezone: string,
  contactTimezone: string,
  contactName: string
): string {
  const display = formatCrossTimezone(date, userTimezone, contactTimezone);

  if (hasSignificantTimezoneOffset(userTimezone, contactTimezone, date)) {
    return `Catch up with ${contactName}:\n` +
      `Your time: ${display.userTime} (${display.userTimezone})\n` +
      `Their time: ${display.contactTime} (${display.contactTimezone})`;
  }

  return `Catch up with ${contactName}: ${display.userTime}`;
}
