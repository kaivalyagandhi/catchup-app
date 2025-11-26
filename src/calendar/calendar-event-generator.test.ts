/**
 * Calendar Event Generator Tests
 *
 * Tests for the calendar event generator functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CalendarEventGenerator, TimeOfDay } from './calendar-event-generator';
import pool from '../db/connection';

describe('CalendarEventGenerator', () => {
  let generator: CalendarEventGenerator;
  let testUserId: string;

  beforeEach(async () => {
    generator = new CalendarEventGenerator();
    
    // Create a test user with unique email
    const uniqueEmail = `test-calendar-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [uniqueEmail, 'hash', 'Test User']
    );
    testUserId = result.rows[0].id;
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM calendar_events WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('generateAvailabilitySlots', () => {
    it('should generate calendar events for a date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      const events = await generator.generateAvailabilitySlots(
        testUserId,
        startDate,
        endDate
      );

      // Should generate events for 3 days (Jan 1, 2, 3)
      // With 3 times of day (morning, afternoon, evening)
      // Total: 3 days * 3 times = 9 events
      expect(events.length).toBeGreaterThan(0);
      expect(events.length).toBeLessThanOrEqual(9);

      // Verify all events have required fields
      events.forEach(event => {
        expect(event.id).toBeDefined();
        expect(event.userId).toBe(testUserId);
        expect(event.title).toBeDefined();
        expect(event.startTime).toBeInstanceOf(Date);
        expect(event.endTime).toBeInstanceOf(Date);
        expect(event.timezone).toBeDefined();
        expect(event.isAvailable).toBe(true);
        expect(event.source).toBe('test');
      });
    });

    it('should generate events across multiple days', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-05');

      const events = await generator.generateAvailabilitySlots(
        testUserId,
        startDate,
        endDate,
        { timesOfDay: [TimeOfDay.Morning] }
      );

      // Extract unique dates from events
      const uniqueDates = new Set(
        events.map(e => e.startTime.toISOString().split('T')[0])
      );

      // Should have events on at least 2 different dates
      expect(uniqueDates.size).toBeGreaterThanOrEqual(2);
    });

    it('should include weekdays and weekends when includeWeekends is true', async () => {
      // Jan 1, 2024 is a Monday
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07'); // Through Sunday

      const events = await generator.generateAvailabilitySlots(
        testUserId,
        startDate,
        endDate,
        { includeWeekends: true, timesOfDay: [TimeOfDay.Morning] }
      );

      // Check if we have events on different days of the week
      const daysOfWeek = events.map(e => e.startTime.getDay());
      const uniqueDays = new Set(daysOfWeek);

      // Should have events on multiple days
      expect(uniqueDays.size).toBeGreaterThan(1);
    });

    it('should vary times of day', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      const events = await generator.generateAvailabilitySlots(
        testUserId,
        startDate,
        endDate,
        {
          timesOfDay: [TimeOfDay.Morning, TimeOfDay.Afternoon, TimeOfDay.Evening]
        }
      );

      // Extract unique hours from events
      const uniqueHours = new Set(events.map(e => e.startTime.getHours()));

      // Should have at least 2 different hours
      expect(uniqueHours.size).toBeGreaterThanOrEqual(2);
    });

    it('should exclude weekends when includeWeekends is false', async () => {
      // Jan 7, 2024 is a Saturday (day 6), Jan 8 is Sunday (day 0)
      const startDate = new Date('2024-01-07');
      const endDate = new Date('2024-01-08');

      const events = await generator.generateAvailabilitySlots(
        testUserId,
        startDate,
        endDate,
        { includeWeekends: false }
      );

      // Should have no events since both days are weekends
      expect(events.length).toBe(0);
    });

    it('should respect custom slot duration', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-01');
      const slotDuration = 90; // 90 minutes

      const events = await generator.generateAvailabilitySlots(
        testUserId,
        startDate,
        endDate,
        { slotDuration, timesOfDay: [TimeOfDay.Morning] }
      );

      // Check that at least one event has the correct duration
      const durations = events.map(e => 
        (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60)
      );

      expect(durations.some(d => d === slotDuration)).toBe(true);
    });
  });

  describe('getCalendarEvents', () => {
    it('should retrieve calendar events within date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      // Generate events
      await generator.generateAvailabilitySlots(
        testUserId,
        startDate,
        endDate
      );

      // Retrieve events
      const events = await generator.getCalendarEvents(
        testUserId,
        startDate,
        endDate
      );

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('deleteUserCalendarEvents', () => {
    it('should delete all calendar events for a user', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      // Generate events
      await generator.generateAvailabilitySlots(
        testUserId,
        startDate,
        endDate
      );

      // Delete events
      const deletedCount = await generator.deleteUserCalendarEvents(testUserId);

      expect(deletedCount).toBeGreaterThan(0);

      // Verify deletion
      const events = await generator.getCalendarEvents(
        testUserId,
        startDate,
        endDate
      );

      expect(events.length).toBe(0);
    });
  });
});
