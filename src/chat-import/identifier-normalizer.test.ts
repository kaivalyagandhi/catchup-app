/**
 * Tests for identifier normalizer
 *
 * Validates: Requirements 6.4
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeIdentifier,
  normalizePhone,
  normalizeEmail,
  normalizeUsername,
} from './identifier-normalizer';

describe('normalizePhone', () => {
  it('should strip formatting and keep E.164', () => {
    expect(normalizePhone('+1 (555) 123-4567')).toBe('+15551234567');
  });

  it('should handle already-clean E.164', () => {
    expect(normalizePhone('+15551234567')).toBe('+15551234567');
  });

  it('should convert 00 prefix to +', () => {
    expect(normalizePhone('00441234567890')).toBe('+441234567890');
  });

  it('should assume US +1 for 10-digit numbers', () => {
    expect(normalizePhone('5551234567')).toBe('+15551234567');
  });

  it('should handle 11-digit US numbers starting with 1', () => {
    expect(normalizePhone('15551234567')).toBe('+15551234567');
  });

  it('should handle numbers with spaces and dashes', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
  });

  it('should handle parenthesized area codes', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
  });

  it('should prefix + for other digit lengths', () => {
    // 9 digits — not 10, so won't assume US +1
    expect(normalizePhone('491234567')).toBe('+491234567');
  });

  it('should return raw input when no digits present', () => {
    expect(normalizePhone('no-digits')).toBe('no-digits');
  });
});

describe('normalizeEmail', () => {
  it('should lowercase the entire email', () => {
    expect(normalizeEmail('John.Doe@Example.COM')).toBe('john.doe@example.com');
  });

  it('should trim whitespace', () => {
    expect(normalizeEmail('  user@test.com  ')).toBe('user@test.com');
  });
});

describe('normalizeUsername', () => {
  it('should lowercase usernames', () => {
    expect(normalizeUsername('JohnDoe')).toBe('johndoe');
  });

  it('should strip leading @', () => {
    expect(normalizeUsername('@JohnDoe')).toBe('johndoe');
  });

  it('should trim whitespace', () => {
    expect(normalizeUsername('  john_doe  ')).toBe('john_doe');
  });
});

describe('normalizeIdentifier', () => {
  it('should detect and normalize email', () => {
    const result = normalizeIdentifier('User@Example.COM');
    expect(result).toEqual({ identifier: 'user@example.com', identifierType: 'email' });
  });

  it('should detect and normalize phone with +', () => {
    const result = normalizeIdentifier('+1 (555) 123-4567');
    expect(result).toEqual({ identifier: '+15551234567', identifierType: 'phone' });
  });

  it('should detect and normalize phone without +', () => {
    const result = normalizeIdentifier('(555) 123-4567');
    expect(result).toEqual({ identifier: '+15551234567', identifierType: 'phone' });
  });

  it('should detect and normalize @username', () => {
    const result = normalizeIdentifier('@JohnDoe');
    expect(result).toEqual({ identifier: 'johndoe', identifierType: 'username' });
  });

  it('should detect username-like single tokens', () => {
    const result = normalizeIdentifier('john_doe');
    expect(result).toEqual({ identifier: 'john_doe', identifierType: 'username' });
  });

  it('should fall back to display_name for multi-word strings', () => {
    const result = normalizeIdentifier('John Doe');
    expect(result).toEqual({ identifier: 'John Doe', identifierType: 'display_name' });
  });

  it('should fall back to display_name for single character', () => {
    const result = normalizeIdentifier('J');
    expect(result).toEqual({ identifier: 'J', identifierType: 'display_name' });
  });
});
