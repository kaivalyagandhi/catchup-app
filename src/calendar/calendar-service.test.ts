/**
 * Calendar Service Tests
 *
 * Tests for calendar listing and selection functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import pool from '../db/connection';
import * as calendarService from './calendar-service';
import * as calendarRepository from './calendar-repository';
import { GoogleCalendar } from '../types';

// Test user ID
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Helper to create a test calendar in the database
 */
async function createTestCalendar(
  userId: string,
  calendarId: string,
  name: string,
  isPrimary: boolean = false,
  selected: boolean = false
): Promise<GoogleCalendar> {
  const result = await pool.query<any>(
    `INSERT INTO google_calendars (user_id, calendar_id, name, description, is_primary, selected)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, calendarId, name, null, isPrimary, selected]
  );

  return {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    calendarId: result.rows[0].calendar_id,
    name: result.rows[0].name,
    description: result.rows[0].description || undefined,
    selected: result.rows[0].selected,
    isPrimary: result.rows[0].is_primary,
    createdAt: result.rows[0].created_at,
    updatedAt: result.rows[0].updated_at,
  };
}

/**
 * Create test user
 */
async function createTestUser(): Promise<void> {
  const uniqueEmail = `test-calendar-service-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  await pool.query(
    `INSERT INTO users (id, email, name, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
    [TEST_USER_ID, uniqueEmail, 'Test User']
  );
}

/**
 * Clean up test data
 */
async function cleanupTestData(): Promise<void> {
  await pool.query('DELETE FROM google_calendars WHERE user_id = $1', [TEST_USER_ID]);
  await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
}

describe('Calendar Service - Calendar Listing and Selection', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('listUserCalendars', () => {
    it('should return empty array when user has no calendars', async () => {
      const calendars = await calendarService.listUserCalendars(TEST_USER_ID);
      expect(calendars).toEqual([]);
    });

    it('should return all calendars for a user', async () => {
      // Create test calendars
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Calendar 1', true);
      await createTestCalendar(TEST_USER_ID, 'cal2', 'Calendar 2');
      await createTestCalendar(TEST_USER_ID, 'cal3', 'Calendar 3');

      const calendars = await calendarService.listUserCalendars(TEST_USER_ID);

      expect(calendars).toHaveLength(3);
      expect(calendars[0].calendarId).toBe('cal1'); // Primary first
      expect(calendars[0].isPrimary).toBe(true);
    });

    it('should order calendars by primary first, then by name', async () => {
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Zebra Calendar');
      await createTestCalendar(TEST_USER_ID, 'cal2', 'Apple Calendar', true);
      await createTestCalendar(TEST_USER_ID, 'cal3', 'Banana Calendar');

      const calendars = await calendarService.listUserCalendars(TEST_USER_ID);

      expect(calendars).toHaveLength(3);
      expect(calendars[0].name).toBe('Apple Calendar'); // Primary first
      expect(calendars[1].name).toBe('Banana Calendar'); // Then alphabetical
      expect(calendars[2].name).toBe('Zebra Calendar');
    });
  });

  describe('getSelectedCalendars', () => {
    it('should return empty array when no calendars are selected', async () => {
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Calendar 1');
      await createTestCalendar(TEST_USER_ID, 'cal2', 'Calendar 2');

      const selected = await calendarService.getSelectedCalendars(TEST_USER_ID);
      expect(selected).toEqual([]);
    });

    it('should return only selected calendars', async () => {
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Calendar 1', false, true);
      await createTestCalendar(TEST_USER_ID, 'cal2', 'Calendar 2', false, false);
      await createTestCalendar(TEST_USER_ID, 'cal3', 'Calendar 3', false, true);

      const selected = await calendarService.getSelectedCalendars(TEST_USER_ID);

      expect(selected).toHaveLength(2);
      expect(selected.map((c) => c.calendarId).sort()).toEqual(['cal1', 'cal3']);
    });
  });

  describe('setSelectedCalendars', () => {
    it('should select specified calendars and deselect others', async () => {
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Calendar 1', false, true);
      await createTestCalendar(TEST_USER_ID, 'cal2', 'Calendar 2', false, true);
      await createTestCalendar(TEST_USER_ID, 'cal3', 'Calendar 3', false, false);

      // Select cal2 and cal3, deselect cal1
      await calendarService.setSelectedCalendars(TEST_USER_ID, ['cal2', 'cal3']);

      const selected = await calendarService.getSelectedCalendars(TEST_USER_ID);
      expect(selected).toHaveLength(2);
      expect(selected.map((c) => c.calendarId).sort()).toEqual(['cal2', 'cal3']);
    });

    it('should deselect all calendars when empty array is provided', async () => {
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Calendar 1', false, true);
      await createTestCalendar(TEST_USER_ID, 'cal2', 'Calendar 2', false, true);

      await calendarService.setSelectedCalendars(TEST_USER_ID, []);

      const selected = await calendarService.getSelectedCalendars(TEST_USER_ID);
      expect(selected).toEqual([]);
    });

    it('should throw error when invalid calendar ID is provided', async () => {
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Calendar 1');

      await expect(
        calendarService.setSelectedCalendars(TEST_USER_ID, ['cal1', 'invalid-id'])
      ).rejects.toThrow('Invalid calendar IDs: invalid-id');
    });

    it('should handle selecting all calendars', async () => {
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Calendar 1');
      await createTestCalendar(TEST_USER_ID, 'cal2', 'Calendar 2');
      await createTestCalendar(TEST_USER_ID, 'cal3', 'Calendar 3');

      await calendarService.setSelectedCalendars(TEST_USER_ID, ['cal1', 'cal2', 'cal3']);

      const selected = await calendarService.getSelectedCalendars(TEST_USER_ID);
      expect(selected).toHaveLength(3);
    });
  });

  describe('updateCalendarSelection', () => {
    it('should update selection status for a single calendar', async () => {
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Calendar 1', false, false);

      const updated = await calendarService.updateCalendarSelection(TEST_USER_ID, 'cal1', true);

      expect(updated).not.toBeNull();
      expect(updated?.selected).toBe(true);
      expect(updated?.calendarId).toBe('cal1');
    });

    it('should return null when calendar does not exist', async () => {
      const result = await calendarService.updateCalendarSelection(
        TEST_USER_ID,
        'nonexistent',
        true
      );

      expect(result).toBeNull();
    });

    it('should toggle selection status', async () => {
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Calendar 1', false, true);

      // Deselect
      let updated = await calendarService.updateCalendarSelection(TEST_USER_ID, 'cal1', false);
      expect(updated?.selected).toBe(false);

      // Select again
      updated = await calendarService.updateCalendarSelection(TEST_USER_ID, 'cal1', true);
      expect(updated?.selected).toBe(true);
    });
  });

  describe('upsertCalendar', () => {
    it('should insert new calendar', async () => {
      const calendar = await calendarRepository.upsertCalendar(
        TEST_USER_ID,
        'new-cal',
        'New Calendar',
        'Description',
        false
      );

      expect(calendar.calendarId).toBe('new-cal');
      expect(calendar.name).toBe('New Calendar');
      expect(calendar.description).toBe('Description');
      expect(calendar.selected).toBe(false);
    });

    it('should update existing calendar', async () => {
      // Insert
      await calendarRepository.upsertCalendar(
        TEST_USER_ID,
        'cal1',
        'Original Name',
        'Original Description',
        false
      );

      // Update
      const updated = await calendarRepository.upsertCalendar(
        TEST_USER_ID,
        'cal1',
        'Updated Name',
        'Updated Description',
        true
      );

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated Description');
      expect(updated.isPrimary).toBe(true);

      // Verify only one calendar exists
      const calendars = await calendarService.listUserCalendars(TEST_USER_ID);
      expect(calendars).toHaveLength(1);
    });

    it('should preserve selection status on update', async () => {
      // Insert and select
      await calendarRepository.upsertCalendar(TEST_USER_ID, 'cal1', 'Calendar 1', null, false);
      await calendarService.updateCalendarSelection(TEST_USER_ID, 'cal1', true);

      // Update calendar metadata
      await calendarRepository.upsertCalendar(
        TEST_USER_ID,
        'cal1',
        'Updated Calendar 1',
        null,
        false
      );

      // Selection should be preserved (this is the current behavior - selected is not updated on conflict)
      const calendars = await calendarService.listUserCalendars(TEST_USER_ID);
      expect(calendars[0].selected).toBe(true);
    });
  });

  describe('Requirements validation', () => {
    it('should support multi-calendar selection (Requirement 7.3)', async () => {
      // Create multiple calendars
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Work Calendar');
      await createTestCalendar(TEST_USER_ID, 'cal2', 'Personal Calendar');
      await createTestCalendar(TEST_USER_ID, 'cal3', 'Family Calendar');

      // Select multiple calendars
      await calendarService.setSelectedCalendars(TEST_USER_ID, ['cal1', 'cal3']);

      const selected = await calendarService.getSelectedCalendars(TEST_USER_ID);
      expect(selected).toHaveLength(2);
      expect(selected.map((c) => c.calendarId).sort()).toEqual(['cal1', 'cal3']);
    });

    it('should allow editing calendar selection (Requirement 7.4)', async () => {
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Calendar 1');
      await createTestCalendar(TEST_USER_ID, 'cal2', 'Calendar 2');
      await createTestCalendar(TEST_USER_ID, 'cal3', 'Calendar 3');

      // Initial selection
      await calendarService.setSelectedCalendars(TEST_USER_ID, ['cal1', 'cal2']);
      let selected = await calendarService.getSelectedCalendars(TEST_USER_ID);
      expect(selected).toHaveLength(2);

      // Edit selection
      await calendarService.setSelectedCalendars(TEST_USER_ID, ['cal2', 'cal3']);
      selected = await calendarService.getSelectedCalendars(TEST_USER_ID);
      expect(selected).toHaveLength(2);
      expect(selected.map((c) => c.calendarId).sort()).toEqual(['cal2', 'cal3']);
    });

    it('should display all calendars from Google account (Requirement 7.2)', async () => {
      // Simulate syncing calendars from Google
      await createTestCalendar(TEST_USER_ID, 'primary@gmail.com', 'Primary Calendar', true);
      await createTestCalendar(TEST_USER_ID, 'work@company.com', 'Work Calendar');
      await createTestCalendar(TEST_USER_ID, 'shared@gmail.com', 'Shared Calendar');

      const calendars = await calendarService.listUserCalendars(TEST_USER_ID);

      expect(calendars).toHaveLength(3);
      expect(calendars[0].isPrimary).toBe(true);
    });
  });
});

describe('Calendar Service - Free Time Slot Detection', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('getFreeTimeSlots', () => {
    it('should throw error when no calendars are selected', async () => {
      // Create calendars but don't select any
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Calendar 1');

      const dateRange = {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T17:00:00Z'),
      };

      // Mock access token (won't be used since we'll fail before API call)
      await expect(
        calendarService.getFreeTimeSlots(TEST_USER_ID, 'mock-token', dateRange)
      ).rejects.toThrow('No calendars selected for availability detection');
    });

    it('should identify free slots when there are no events', async () => {
      // This test would require mocking the Google Calendar API
      // For now, we'll skip it and note that integration tests are needed
      // TODO: Add integration test with mocked Google Calendar API
    });

    it('should identify free slots between events', async () => {
      // This test would require mocking the Google Calendar API
      // TODO: Add integration test with mocked Google Calendar API
    });

    it('should respect minimum slot duration', async () => {
      // This test would require mocking the Google Calendar API
      // TODO: Add integration test with mocked Google Calendar API
    });

    it('should handle overlapping events correctly', async () => {
      // This test would require mocking the Google Calendar API
      // TODO: Add integration test with mocked Google Calendar API
    });

    it('should filter out all-day events', async () => {
      // This test would require mocking the Google Calendar API
      // TODO: Add integration test with mocked Google Calendar API
    });
  });

  describe('refreshCalendarData', () => {
    it('should sync calendars and return fresh free time slots', async () => {
      // This test would require mocking the Google Calendar API
      // TODO: Add integration test with mocked Google Calendar API
    });
  });

  describe('Requirements validation - Free Time Slots', () => {
    it('should scan selected calendars for free time slots (Requirement 7.5)', async () => {
      // Create and select calendars
      await createTestCalendar(TEST_USER_ID, 'cal1', 'Work Calendar', false, true);
      await createTestCalendar(TEST_USER_ID, 'cal2', 'Personal Calendar', false, true);

      // This test would require mocking the Google Calendar API to verify
      // that events are fetched from selected calendars only
      // TODO: Add integration test with mocked Google Calendar API
    });

    it('should refresh availability predictions when calendar data changes (Requirement 7.8)', async () => {
      // This test would require mocking the Google Calendar API
      // TODO: Add integration test with mocked Google Calendar API
    });
  });
});
