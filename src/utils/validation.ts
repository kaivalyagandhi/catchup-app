/**
 * Comprehensive Validation Utilities
 *
 * Provides validation for all input types across the system including
 * contact data, location/timezone data, and calendar data.
 */

import { timezoneService } from '../contacts/timezone-service';
import {
  validateEmail,
  validatePhone,
  validateLinkedIn,
  validateInstagram,
  validateXHandle,
  validateName,
  ValidationResult,
} from '../contacts/validation';

/**
 * Validate location string
 * Checks if location can be matched to timezone dataset
 */
export function validateLocation(location: string): ValidationResult {
  const errors: string[] = [];

  if (!location || location.trim() === '') {
    return { valid: true, errors: [] }; // Empty is valid (optional field)
  }

  if (location.length > 255) {
    errors.push('Location must be 255 characters or less');
  }

  // Check if location can be matched to a timezone
  const timezone = timezoneService.inferTimezoneFromLocation(location);
  if (!timezone) {
    // This is a warning, not an error - user can manually select timezone
    errors.push(
      'Location could not be matched to timezone dataset. Manual timezone selection required.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate timezone identifier (IANA format)
 */
export function validateTimezone(timezone: string): ValidationResult {
  const errors: string[] = [];

  if (!timezone || timezone.trim() === '') {
    return { valid: true, errors: [] }; // Empty is valid (optional field)
  }

  // Basic IANA timezone format check (e.g., "America/New_York")
  const timezoneRegex = /^[A-Za-z]+\/[A-Za-z_]+$/;

  if (!timezoneRegex.test(timezone)) {
    errors.push('Invalid timezone format. Expected IANA format (e.g., "America/New_York")');
  }

  if (timezone.length > 100) {
    errors.push('Timezone must be 100 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate calendar event data
 */
export interface CalendarEventData {
  id?: string;
  summary?: string;
  start?: Date | string;
  end?: Date | string;
  timezone?: string;
}

export function validateCalendarEvent(event: CalendarEventData): ValidationResult {
  const errors: string[] = [];

  // Validate start and end times
  if (event.start && event.end) {
    const startDate = typeof event.start === 'string' ? new Date(event.start) : event.start;
    const endDate = typeof event.end === 'string' ? new Date(event.end) : event.end;

    if (isNaN(startDate.getTime())) {
      errors.push('Invalid start date format');
    }

    if (isNaN(endDate.getTime())) {
      errors.push('Invalid end date format');
    }

    if (startDate.getTime() >= endDate.getTime()) {
      errors.push('Event end time must be after start time');
    }
  }

  // Validate timezone if provided
  if (event.timezone) {
    const timezoneResult = validateTimezone(event.timezone);
    errors.push(...timezoneResult.errors);
  }

  // Validate summary length
  if (event.summary && event.summary.length > 1000) {
    errors.push('Event summary must be 1000 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate frequency preference
 */
export type FrequencyOption =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'flexible'
  | 'na';

export function validateFrequencyPreference(frequency: string): ValidationResult {
  const errors: string[] = [];
  const validOptions: FrequencyOption[] = [
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'yearly',
    'flexible',
    'na',
  ];

  if (!frequency || frequency.trim() === '') {
    errors.push('Frequency preference is required');
  } else if (!validOptions.includes(frequency.toLowerCase() as FrequencyOption)) {
    errors.push(`Invalid frequency preference. Must be one of: ${validOptions.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate date range
 */
export function validateDateRange(start: Date, end: Date): ValidationResult {
  const errors: string[] = [];

  if (isNaN(start.getTime())) {
    errors.push('Invalid start date');
  }

  if (isNaN(end.getTime())) {
    errors.push('Invalid end date');
  }

  if (start.getTime() >= end.getTime()) {
    errors.push('End date must be after start date');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate time string (HH:mm format)
 */
export function validateTimeString(time: string): ValidationResult {
  const errors: string[] = [];

  if (!time || time.trim() === '') {
    return { valid: true, errors: [] }; // Empty is valid (optional field)
  }

  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeRegex.test(time)) {
    errors.push('Invalid time format. Expected HH:mm (e.g., "09:00")');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate day of week (0-6)
 */
export function validateDayOfWeek(day: number): ValidationResult {
  const errors: string[] = [];

  if (day < 0 || day > 6) {
    errors.push('Day of week must be between 0 (Sunday) and 6 (Saturday)');
  }

  if (!Number.isInteger(day)) {
    errors.push('Day of week must be an integer');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate notification preferences
 */
export interface NotificationPreferencesData {
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  batchDay?: number;
  batchTime?: string;
  timezone?: string;
}

export function validateNotificationPreferences(
  prefs: NotificationPreferencesData
): ValidationResult {
  const errors: string[] = [];

  if (prefs.batchDay !== undefined) {
    const dayResult = validateDayOfWeek(prefs.batchDay);
    errors.push(...dayResult.errors);
  }

  if (prefs.batchTime) {
    const timeResult = validateTimeString(prefs.batchTime);
    errors.push(...timeResult.errors);
  }

  if (prefs.timezone) {
    const timezoneResult = validateTimezone(prefs.timezone);
    errors.push(...timezoneResult.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize string input (remove dangerous characters, trim whitespace)
 */
export function sanitizeString(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 10000); // Limit length to prevent DoS
}

/**
 * Validate and sanitize contact data
 */
export interface ContactInputData {
  name: string;
  phone?: string;
  email?: string;
  linkedIn?: string;
  instagram?: string;
  xHandle?: string;
  location?: string;
  timezone?: string;
  customNotes?: string;
}

export function validateAndSanitizeContactData(data: ContactInputData): {
  valid: boolean;
  errors: string[];
  sanitized: ContactInputData;
} {
  const errors: string[] = [];

  // Sanitize all string fields
  const sanitized: ContactInputData = {
    name: sanitizeString(data.name),
    phone: data.phone ? sanitizeString(data.phone) : undefined,
    email: data.email ? sanitizeString(data.email) : undefined,
    linkedIn: data.linkedIn ? sanitizeString(data.linkedIn) : undefined,
    instagram: data.instagram ? sanitizeString(data.instagram) : undefined,
    xHandle: data.xHandle ? sanitizeString(data.xHandle) : undefined,
    location: data.location ? sanitizeString(data.location) : undefined,
    timezone: data.timezone ? sanitizeString(data.timezone) : undefined,
    customNotes: data.customNotes ? sanitizeString(data.customNotes) : undefined,
  };

  // Validate name
  const nameResult = validateName(sanitized.name);
  errors.push(...nameResult.errors);

  // Validate optional fields
  if (sanitized.phone) {
    const phoneResult = validatePhone(sanitized.phone);
    errors.push(...phoneResult.errors);
  }

  if (sanitized.email) {
    const emailResult = validateEmail(sanitized.email);
    errors.push(...emailResult.errors);
  }

  if (sanitized.linkedIn) {
    const linkedInResult = validateLinkedIn(sanitized.linkedIn);
    errors.push(...linkedInResult.errors);
  }

  if (sanitized.instagram) {
    const instagramResult = validateInstagram(sanitized.instagram);
    errors.push(...instagramResult.errors);
  }

  if (sanitized.xHandle) {
    const xHandleResult = validateXHandle(sanitized.xHandle);
    errors.push(...xHandleResult.errors);
  }

  if (sanitized.location) {
    const locationResult = validateLocation(sanitized.location);
    // Location validation warnings are not blocking
    // User can proceed with manual timezone selection
  }

  if (sanitized.timezone) {
    const timezoneResult = validateTimezone(sanitized.timezone);
    errors.push(...timezoneResult.errors);
  }

  if (sanitized.customNotes && sanitized.customNotes.length > 5000) {
    errors.push('Custom notes must be 5000 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

// Re-export contact validation functions for convenience
export {
  validateEmail,
  validatePhone,
  validateLinkedIn,
  validateInstagram,
  validateXHandle,
  validateName,
  ValidationResult,
};
