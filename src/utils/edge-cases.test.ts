/**
 * Edge Case Handling Tests
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FREQUENCY_PREFERENCE,
  getFrequencyPreferenceOrDefault,
  getLastContactDateOrDefault,
  formatCrossTimezone,
  hasSignificantTimezoneOffset,
  handleNoFreeSlots,
  validateContactForSuggestions,
  handleMissingTimezone,
  calculateDaysSinceLastContact,
  getFrequencyThresholdDays,
  isContactDueForCatchup,
  formatSuggestionWithTimezones,
} from './edge-cases';

describe('getFrequencyPreferenceOrDefault', () => {
  it('should return provided preference', () => {
    expect(getFrequencyPreferenceOrDefault('weekly')).toBe('weekly');
    expect(getFrequencyPreferenceOrDefault('daily')).toBe('daily');
  });

  it('should return default when preference is null', () => {
    expect(getFrequencyPreferenceOrDefault(null)).toBe(DEFAULT_FREQUENCY_PREFERENCE);
  });

  it('should return default when preference is undefined', () => {
    expect(getFrequencyPreferenceOrDefault(undefined)).toBe(DEFAULT_FREQUENCY_PREFERENCE);
  });
});

describe('getLastContactDateOrDefault', () => {
  it('should return last contact date when provided', () => {
    const date = new Date('2024-01-01');
    expect(getLastContactDateOrDefault(date)).toEqual(date);
  });

  it('should return account creation date when no last contact', () => {
    const accountDate = new Date('2023-01-01');
    expect(getLastContactDateOrDefault(null, accountDate)).toEqual(accountDate);
  });

  it('should return current date when neither provided', () => {
    const result = getLastContactDateOrDefault(null, undefined);
    const now = new Date();
    // Check it's within 1 second of now
    expect(Math.abs(result.getTime() - now.getTime())).toBeLessThan(1000);
  });
});

describe('formatCrossTimezone', () => {
  it('should format time in both timezones', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    const result = formatCrossTimezone(date, 'America/New_York', 'Europe/London');

    expect(result.userTimezone).toBe('America/New_York');
    expect(result.contactTimezone).toBe('Europe/London');
    expect(result.userTime).toBeTruthy();
    expect(result.contactTime).toBeTruthy();
  });

  it('should handle same timezone', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    const result = formatCrossTimezone(date, 'America/New_York', 'America/New_York');

    expect(result.userTime).toBe(result.contactTime);
  });
});

describe('hasSignificantTimezoneOffset', () => {
  it('should detect significant offset between NY and London', () => {
    const result = hasSignificantTimezoneOffset(
      'America/New_York',
      'Europe/London',
      new Date('2024-01-01')
    );
    expect(result).toBe(true);
  });

  it('should detect no significant offset for same timezone', () => {
    const result = hasSignificantTimezoneOffset(
      'America/New_York',
      'America/New_York',
      new Date('2024-01-01')
    );
    expect(result).toBe(false);
  });

  it('should detect no significant offset for similar timezones', () => {
    const result = hasSignificantTimezoneOffset(
      'America/New_York',
      'America/Detroit',
      new Date('2024-01-01')
    );
    expect(result).toBe(false);
  });
});

describe('handleNoFreeSlots', () => {
  it('should return hasSlots true when slots exist', () => {
    const result = handleNoFreeSlots(
      [{ start: new Date(), end: new Date() }],
      { start: new Date(), end: new Date() }
    );
    expect(result.hasSlots).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('should return helpful message when no slots', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-08');
    const result = handleNoFreeSlots([], { start, end });

    expect(result.hasSlots).toBe(false);
    expect(result.message).toContain('No free time slots');
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions!.length).toBeGreaterThan(0);
  });

  it('should include suggestions for expanding availability', () => {
    const result = handleNoFreeSlots([], {
      start: new Date(),
      end: new Date(),
    });

    expect(result.suggestions).toContain(
      'Expand your availability parameters to include more time blocks'
    );
  });
});

describe('validateContactForSuggestions', () => {
  it('should validate complete contact', () => {
    const result = validateContactForSuggestions({
      name: 'John Doe',
      timezone: 'America/New_York',
      frequencyPreference: 'weekly',
      lastContactDate: new Date(),
    });

    expect(result.valid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn about missing timezone', () => {
    const result = validateContactForSuggestions({
      name: 'John Doe',
      frequencyPreference: 'weekly',
      lastContactDate: new Date(),
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('timezone'))).toBe(true);
  });

  it('should warn about missing frequency preference', () => {
    const result = validateContactForSuggestions({
      name: 'John Doe',
      timezone: 'America/New_York',
      lastContactDate: new Date(),
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('frequency'))).toBe(true);
  });

  it('should warn about missing interaction history', () => {
    const result = validateContactForSuggestions({
      name: 'John Doe',
      timezone: 'America/New_York',
      frequencyPreference: 'weekly',
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('interaction history'))).toBe(true);
  });

  it('should mark invalid when name missing', () => {
    const result = validateContactForSuggestions({
      timezone: 'America/New_York',
    });

    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('name');
  });
});

describe('handleMissingTimezone', () => {
  it('should prompt for manual entry with no location', () => {
    const result = handleMissingTimezone();

    expect(result.requiresManualEntry).toBe(true);
    expect(result.message).toContain('manually select');
    expect(result.suggestedTimezones).toBeDefined();
    expect(result.suggestedTimezones!.length).toBeGreaterThan(0);
  });

  it('should prompt for manual entry with unmatched location', () => {
    const result = handleMissingTimezone('Unknown City');

    expect(result.requiresManualEntry).toBe(true);
    expect(result.message).toContain('Unknown City');
    expect(result.message).toContain('manually select');
  });

  it('should include common timezone suggestions', () => {
    const result = handleMissingTimezone();

    expect(result.suggestedTimezones).toContain('America/New_York');
    expect(result.suggestedTimezones).toContain('Europe/London');
    expect(result.suggestedTimezones).toContain('Asia/Tokyo');
  });
});

describe('calculateDaysSinceLastContact', () => {
  it('should calculate days from last contact date', () => {
    const lastContact = new Date();
    lastContact.setDate(lastContact.getDate() - 10);

    const result = calculateDaysSinceLastContact(lastContact);
    expect(result).toBe(10);
  });

  it('should use account creation date when no last contact', () => {
    const accountDate = new Date();
    accountDate.setDate(accountDate.getDate() - 30);

    const result = calculateDaysSinceLastContact(null, accountDate);
    expect(result).toBe(30);
  });

  it('should handle current date fallback', () => {
    const result = calculateDaysSinceLastContact(null, undefined);
    expect(result).toBe(0);
  });
});

describe('getFrequencyThresholdDays', () => {
  it('should return correct thresholds', () => {
    expect(getFrequencyThresholdDays('daily')).toBe(1);
    expect(getFrequencyThresholdDays('weekly')).toBe(7);
    expect(getFrequencyThresholdDays('monthly')).toBe(30);
    expect(getFrequencyThresholdDays('yearly')).toBe(365);
    expect(getFrequencyThresholdDays('flexible')).toBe(60);
  });
});

describe('isContactDueForCatchup', () => {
  it('should return true when threshold exceeded', () => {
    const lastContact = new Date();
    lastContact.setDate(lastContact.getDate() - 10);

    const result = isContactDueForCatchup(lastContact, 'weekly');
    expect(result).toBe(true);
  });

  it('should return false when threshold not exceeded', () => {
    const lastContact = new Date();
    lastContact.setDate(lastContact.getDate() - 3);

    const result = isContactDueForCatchup(lastContact, 'weekly');
    expect(result).toBe(false);
  });

  it('should use default frequency when not provided', () => {
    const lastContact = new Date();
    lastContact.setDate(lastContact.getDate() - 35);

    const result = isContactDueForCatchup(lastContact, null);
    expect(result).toBe(true); // Default is monthly (30 days)
  });

  it('should use account creation date when no last contact', () => {
    const accountDate = new Date();
    accountDate.setDate(accountDate.getDate() - 35);

    const result = isContactDueForCatchup(null, 'monthly', accountDate);
    expect(result).toBe(true);
  });
});

describe('formatSuggestionWithTimezones', () => {
  it('should format with both timezones when significantly different', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    const result = formatSuggestionWithTimezones(
      date,
      'America/New_York',
      'Asia/Tokyo',
      'John Doe'
    );

    expect(result).toContain('John Doe');
    expect(result).toContain('Your time:');
    expect(result).toContain('Their time:');
  });

  it('should format with single time when same timezone', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    const result = formatSuggestionWithTimezones(
      date,
      'America/New_York',
      'America/New_York',
      'John Doe'
    );

    expect(result).toContain('John Doe');
    expect(result).not.toContain('Your time:');
    expect(result).not.toContain('Their time:');
  });
});
