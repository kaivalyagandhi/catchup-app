/**
 * Settings API Tests
 *
 * Tests for timezone search and settings logic.
 * Requirements: 25.4
 */

import { describe, it, expect } from 'vitest';
import { searchTimezones } from './settings';

describe('Settings — Timezone Search', () => {
  it('should return results when searching by city name', () => {
    const results = searchTimezones('New York');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].city).toBe('New York');
    expect(results[0].timezone).toBe('America/New_York');
  });

  it('should return results when searching by timezone identifier', () => {
    const results = searchTimezones('America/Los_Angeles');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].timezone).toBe('America/Los_Angeles');
  });

  it('should be case-insensitive', () => {
    const results = searchTimezones('tokyo');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].city).toBe('Tokyo');
  });

  it('should search by alias', () => {
    const results = searchTimezones('GMT');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.city === 'London')).toBe(true);
  });

  it('should search by country code', () => {
    const results = searchTimezones('JP');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.city === 'Tokyo')).toBe(true);
  });

  it('should return empty array for non-matching query', () => {
    const results = searchTimezones('xyznonexistent');
    expect(results.length).toBe(0);
  });

  it('should return default results for empty query', () => {
    const results = searchTimezones('');
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('should find UTC', () => {
    const results = searchTimezones('UTC');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.timezone === 'UTC')).toBe(true);
  });

  it('should find partial matches', () => {
    const results = searchTimezones('Lon');
    expect(results.some((r) => r.city === 'London')).toBe(true);
  });

  it('should find by Pacific alias', () => {
    const results = searchTimezones('Pacific');
    expect(results.some((r) => r.city === 'Los Angeles')).toBe(true);
  });
});
