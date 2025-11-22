/**
 * Validation Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateLocation,
  validateTimezone,
  validateCalendarEvent,
  validateFrequencyPreference,
  validateDateRange,
  validateTimeString,
  validateDayOfWeek,
  validateNotificationPreferences,
  sanitizeString,
  validateAndSanitizeContactData,
} from './validation';

describe('validateLocation', () => {
  it('should accept empty location', () => {
    const result = validateLocation('');
    expect(result.valid).toBe(true);
  });

  it('should accept valid location from dataset', () => {
    const result = validateLocation('New York');
    expect(result.valid).toBe(true);
  });

  it('should warn for unmatched location', () => {
    const result = validateLocation('Unknown City XYZ');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Manual timezone selection required');
  });

  it('should reject location exceeding max length', () => {
    const longLocation = 'a'.repeat(256);
    const result = validateLocation(longLocation);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('255 characters'))).toBe(true);
  });
});

describe('validateTimezone', () => {
  it('should accept empty timezone', () => {
    const result = validateTimezone('');
    expect(result.valid).toBe(true);
  });

  it('should accept valid IANA timezone', () => {
    const result = validateTimezone('America/New_York');
    expect(result.valid).toBe(true);
  });

  it('should reject invalid timezone format', () => {
    const result = validateTimezone('InvalidTimezone');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid timezone format');
  });

  it('should reject timezone exceeding max length', () => {
    const longTimezone = 'America/' + 'a'.repeat(100);
    const result = validateTimezone(longTimezone);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('100 characters'))).toBe(true);
  });
});

describe('validateCalendarEvent', () => {
  it('should accept valid event', () => {
    const result = validateCalendarEvent({
      summary: 'Meeting',
      start: new Date('2024-01-01T10:00:00Z'),
      end: new Date('2024-01-01T11:00:00Z'),
      timezone: 'America/New_York',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject event with end before start', () => {
    const result = validateCalendarEvent({
      start: new Date('2024-01-01T11:00:00Z'),
      end: new Date('2024-01-01T10:00:00Z'),
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('end time must be after start time');
  });

  it('should reject event with invalid date', () => {
    const result = validateCalendarEvent({
      start: 'invalid-date',
      end: new Date('2024-01-01T11:00:00Z'),
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid start date');
  });

  it('should reject event with invalid timezone', () => {
    const result = validateCalendarEvent({
      start: new Date('2024-01-01T10:00:00Z'),
      end: new Date('2024-01-01T11:00:00Z'),
      timezone: 'InvalidTimezone',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Invalid timezone format'))).toBe(true);
  });

  it('should reject event with summary exceeding max length', () => {
    const result = validateCalendarEvent({
      summary: 'a'.repeat(1001),
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('1000 characters');
  });
});

describe('validateFrequencyPreference', () => {
  it('should accept valid frequency options', () => {
    const validOptions = ['daily', 'weekly', 'monthly', 'yearly', 'flexible'];
    validOptions.forEach((option) => {
      const result = validateFrequencyPreference(option);
      expect(result.valid).toBe(true);
    });
  });

  it('should reject invalid frequency', () => {
    const result = validateFrequencyPreference('invalid');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid frequency preference');
  });

  it('should reject empty frequency', () => {
    const result = validateFrequencyPreference('');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('required');
  });
});

describe('validateDateRange', () => {
  it('should accept valid date range', () => {
    const result = validateDateRange(
      new Date('2024-01-01'),
      new Date('2024-01-02')
    );
    expect(result.valid).toBe(true);
  });

  it('should reject range with end before start', () => {
    const result = validateDateRange(
      new Date('2024-01-02'),
      new Date('2024-01-01')
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('End date must be after start date');
  });

  it('should reject invalid dates', () => {
    const result = validateDateRange(
      new Date('invalid'),
      new Date('2024-01-01')
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid start date');
  });
});

describe('validateTimeString', () => {
  it('should accept empty time', () => {
    const result = validateTimeString('');
    expect(result.valid).toBe(true);
  });

  it('should accept valid time format', () => {
    const validTimes = ['00:00', '09:30', '12:00', '23:59'];
    validTimes.forEach((time) => {
      const result = validateTimeString(time);
      expect(result.valid).toBe(true);
    });
  });

  it('should reject invalid time format', () => {
    const invalidTimes = ['9:00', '24:00', '12:60', 'invalid'];
    invalidTimes.forEach((time) => {
      const result = validateTimeString(time);
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateDayOfWeek', () => {
  it('should accept valid days (0-6)', () => {
    for (let day = 0; day <= 6; day++) {
      const result = validateDayOfWeek(day);
      expect(result.valid).toBe(true);
    }
  });

  it('should reject day < 0', () => {
    const result = validateDayOfWeek(-1);
    expect(result.valid).toBe(false);
  });

  it('should reject day > 6', () => {
    const result = validateDayOfWeek(7);
    expect(result.valid).toBe(false);
  });

  it('should reject non-integer', () => {
    const result = validateDayOfWeek(3.5);
    expect(result.valid).toBe(false);
  });
});

describe('validateNotificationPreferences', () => {
  it('should accept valid preferences', () => {
    const result = validateNotificationPreferences({
      smsEnabled: true,
      emailEnabled: false,
      batchDay: 0,
      batchTime: '09:00',
      timezone: 'America/New_York',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject invalid batch day', () => {
    const result = validateNotificationPreferences({
      batchDay: 7,
    });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid batch time', () => {
    const result = validateNotificationPreferences({
      batchTime: '25:00',
    });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid timezone', () => {
    const result = validateNotificationPreferences({
      timezone: 'InvalidTimezone',
    });
    expect(result.valid).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('should trim whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('should remove HTML tags', () => {
    expect(sanitizeString('hello<script>alert("xss")</script>world')).toBe(
      'helloscriptalert("xss")/scriptworld'
    );
  });

  it('should limit length', () => {
    const longString = 'a'.repeat(20000);
    const result = sanitizeString(longString);
    expect(result.length).toBe(10000);
  });

  it('should handle empty string', () => {
    expect(sanitizeString('')).toBe('');
  });
});

describe('validateAndSanitizeContactData', () => {
  it('should accept and sanitize valid contact data', () => {
    const result = validateAndSanitizeContactData({
      name: '  John Doe  ',
      email: 'john@example.com',
      phone: '+1-555-1234',
      location: 'New York',
      timezone: 'America/New_York',
    });
    expect(result.valid).toBe(true);
    expect(result.sanitized.name).toBe('John Doe');
  });

  it('should reject invalid name', () => {
    const result = validateAndSanitizeContactData({
      name: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Name is required'))).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = validateAndSanitizeContactData({
      name: 'John Doe',
      email: 'invalid-email',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Invalid email'))).toBe(true);
  });

  it('should reject invalid phone', () => {
    const result = validateAndSanitizeContactData({
      name: 'John Doe',
      phone: 'abc',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Phone number'))).toBe(true);
  });

  it('should reject custom notes exceeding max length', () => {
    const result = validateAndSanitizeContactData({
      name: 'John Doe',
      customNotes: 'a'.repeat(5001),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('5000 characters'))).toBe(true);
  });

  it('should sanitize all string fields', () => {
    const result = validateAndSanitizeContactData({
      name: '  John<script>  ',
      customNotes: '  Notes  ',
    });
    expect(result.sanitized.name).toBe('Johnscript');
    expect(result.sanitized.customNotes).toBe('Notes');
  });
});
