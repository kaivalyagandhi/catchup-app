/**
 * Contacts Enrichment Columns Tests
 *
 * Tests for health indicator computation and relative time formatting.
 * Requirements: 4.1, 4.2
 */

import { describe, it, expect } from 'vitest';
import { computeHealthIndicator, formatRelativeTime } from './contacts-enrichment-columns';

describe('computeHealthIndicator', () => {
  const now = new Date('2024-06-15T12:00:00Z');

  it('should return gray when no frequency preference', () => {
    expect(computeHealthIndicator(new Date('2024-06-10'), null, now)).toBe('gray');
  });

  it('should return gray when no last interaction date', () => {
    expect(computeHealthIndicator(null, 'weekly', now)).toBe('gray');
  });

  it('should return gray when both are null', () => {
    expect(computeHealthIndicator(null, null, now)).toBe('gray');
  });

  it('should return green when within frequency window (weekly, 3 days ago)', () => {
    const threeDaysAgo = new Date('2024-06-12T12:00:00Z');
    expect(computeHealthIndicator(threeDaysAgo, 'weekly', now)).toBe('green');
  });

  it('should return yellow when within 1.5× window (weekly, 9 days ago)', () => {
    const nineDaysAgo = new Date('2024-06-06T12:00:00Z');
    expect(computeHealthIndicator(nineDaysAgo, 'weekly', now)).toBe('yellow');
  });

  it('should return red when beyond 1.5× window (weekly, 15 days ago)', () => {
    const fifteenDaysAgo = new Date('2024-05-31T12:00:00Z');
    expect(computeHealthIndicator(fifteenDaysAgo, 'weekly', now)).toBe('red');
  });

  it('should return green for monthly contact within 30 days', () => {
    const twentyDaysAgo = new Date('2024-05-26T12:00:00Z');
    expect(computeHealthIndicator(twentyDaysAgo, 'monthly', now)).toBe('green');
  });

  it('should return yellow for monthly contact at 40 days', () => {
    const fortyDaysAgo = new Date('2024-05-06T12:00:00Z');
    expect(computeHealthIndicator(fortyDaysAgo, 'monthly', now)).toBe('yellow');
  });

  it('should return red for monthly contact at 50 days', () => {
    const fiftyDaysAgo = new Date('2024-04-26T12:00:00Z');
    expect(computeHealthIndicator(fiftyDaysAgo, 'monthly', now)).toBe('red');
  });

  it('should return gray for unknown frequency preference', () => {
    expect(computeHealthIndicator(new Date('2024-06-10'), 'unknown_freq', now)).toBe('gray');
  });

  it('should be deterministic for same inputs', () => {
    const date = new Date('2024-06-10');
    const result1 = computeHealthIndicator(date, 'weekly', now);
    const result2 = computeHealthIndicator(date, 'weekly', now);
    expect(result1).toBe(result2);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2024-06-15T12:00:00Z');

  it('should return "No data" for null date', () => {
    expect(formatRelativeTime(null, now)).toBe('No data');
  });

  it('should return "Today" for same day', () => {
    expect(formatRelativeTime(new Date('2024-06-15T08:00:00Z'), now)).toBe('Today');
  });

  it('should return "1 day ago" for yesterday', () => {
    expect(formatRelativeTime(new Date('2024-06-14T12:00:00Z'), now)).toBe('1 day ago');
  });

  it('should return days ago for less than a week', () => {
    expect(formatRelativeTime(new Date('2024-06-12T12:00:00Z'), now)).toBe('3 days ago');
  });

  it('should return weeks ago for 2-4 weeks', () => {
    expect(formatRelativeTime(new Date('2024-05-29T12:00:00Z'), now)).toBe('2 weeks ago');
  });

  it('should return months ago for 2-11 months', () => {
    expect(formatRelativeTime(new Date('2024-03-15T12:00:00Z'), now)).toBe('3 months ago');
  });

  it('should return years ago for 2+ years', () => {
    expect(formatRelativeTime(new Date('2022-01-15T12:00:00Z'), now)).toBe('2 years ago');
  });

  it('should return a non-empty string for any valid date', () => {
    const result = formatRelativeTime(new Date('2020-01-01'), now);
    expect(result.length).toBeGreaterThan(0);
  });
});
