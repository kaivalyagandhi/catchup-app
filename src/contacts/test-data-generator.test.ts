/**
 * Test Data Generator Tests
 *
 * Tests for the test data generator service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestDataGeneratorImpl } from './test-data-generator';
import pool from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

describe('TestDataGenerator', () => {
  let generator: TestDataGeneratorImpl;
  let testUserId: string;

  beforeEach(async () => {
    generator = new TestDataGeneratorImpl();
    testUserId = uuidv4();

    // Create test user
    await pool.query(
      'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
      [testUserId, `test-${Date.now()}@example.com`, 'test-hash']
    );
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM contacts WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM groups WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM suggestions WHERE user_id = $1', [testUserId]);
    
    // Try to delete calendar events if table exists
    try {
      await pool.query('DELETE FROM calendar_events WHERE user_id = $1', [testUserId]);
    } catch (error: any) {
      // Ignore if table doesn't exist
      if (error.code !== '42P01') throw error;
    }
    
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    
    // Clean up orphaned tags
    await pool.query(
      'DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM contact_tags)'
    );
  });

  describe('seedTestData', () => {
    it('should create test contacts with default count', async () => {
      const result = await generator.seedTestData(testUserId);

      expect(result.contactsCreated).toBe(10);
      expect(result.groupsCreated).toBeGreaterThan(0);
      expect(result.tagsCreated).toBeGreaterThan(0);

      // Verify contacts were created in database
      const contactsResult = await pool.query(
        'SELECT * FROM contacts WHERE user_id = $1',
        [testUserId]
      );
      expect(contactsResult.rows.length).toBe(10);
    });

    it('should create specified number of contacts', async () => {
      const result = await generator.seedTestData(testUserId, { contactCount: 5 });

      expect(result.contactsCreated).toBe(5);

      const contactsResult = await pool.query(
        'SELECT * FROM contacts WHERE user_id = $1',
        [testUserId]
      );
      expect(contactsResult.rows.length).toBe(5);
    });

    it('should assign tags to contacts', async () => {
      await generator.seedTestData(testUserId, { contactCount: 3 });

      // Verify tags were created and associated
      const tagsResult = await pool.query(
        `SELECT COUNT(DISTINCT ct.tag_id) as count
         FROM contact_tags ct
         INNER JOIN contacts c ON ct.contact_id = c.id
         WHERE c.user_id = $1`,
        [testUserId]
      );

      expect(parseInt(tagsResult.rows[0].count)).toBeGreaterThan(0);
    });

    it('should assign contacts to groups', async () => {
      await generator.seedTestData(testUserId, { contactCount: 3 });

      // Verify contacts were assigned to groups
      const groupAssignmentsResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM contact_groups cg
         INNER JOIN contacts c ON cg.contact_id = c.id
         WHERE c.user_id = $1`,
        [testUserId]
      );

      expect(parseInt(groupAssignmentsResult.rows[0].count)).toBeGreaterThan(0);
    });

    it('should create contacts with varied last contact dates', async () => {
      await generator.seedTestData(testUserId, { contactCount: 5 });

      const contactsResult = await pool.query(
        'SELECT last_contact_date FROM contacts WHERE user_id = $1',
        [testUserId]
      );

      const dates = contactsResult.rows.map(row => row.last_contact_date);
      const uniqueDates = new Set(dates.map(d => d?.getTime()));

      // Should have at least 2 different dates (variance)
      expect(uniqueDates.size).toBeGreaterThanOrEqual(2);
    });

    it('should infer timezones from locations', async () => {
      await generator.seedTestData(testUserId, { contactCount: 3 });

      const contactsResult = await pool.query(
        'SELECT location, timezone FROM contacts WHERE user_id = $1',
        [testUserId]
      );

      // All contacts should have both location and timezone
      for (const row of contactsResult.rows) {
        expect(row.location).toBeTruthy();
        expect(row.timezone).toBeTruthy();
      }
    });

    it('should rollback on error', async () => {
      // Force an error by using a non-existent user ID (valid UUID format)
      const nonExistentUserId = uuidv4();

      await expect(
        generator.seedTestData(nonExistentUserId)
      ).rejects.toThrow();

      // Verify no contacts were created
      const contactsResult = await pool.query(
        'SELECT * FROM contacts WHERE user_id = $1',
        [nonExistentUserId]
      );
      expect(contactsResult.rows.length).toBe(0);
    });
  });

  describe('clearTestData', () => {
    it('should delete all test data for a user', async () => {
      // First seed some data
      await generator.seedTestData(testUserId, { contactCount: 5 });

      // Verify data exists
      const contactsBefore = await pool.query(
        'SELECT * FROM contacts WHERE user_id = $1',
        [testUserId]
      );
      expect(contactsBefore.rows.length).toBe(5);

      // Clear the data
      const result = await generator.clearTestData(testUserId);

      expect(result.contactsDeleted).toBe(5);
      expect(result.groupsDeleted).toBeGreaterThan(0);
      expect(result.tagsDeleted).toBeGreaterThan(0);

      // Verify data was deleted
      const contactsAfter = await pool.query(
        'SELECT * FROM contacts WHERE user_id = $1',
        [testUserId]
      );
      expect(contactsAfter.rows.length).toBe(0);
    });

    it('should not delete data for other users', async () => {
      // Create another test user
      const otherUserId = uuidv4();
      await pool.query(
        'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
        [otherUserId, `other-${Date.now()}@example.com`, 'test-hash']
      );

      try {
        // Seed data for both users
        await generator.seedTestData(testUserId, { contactCount: 3 });
        await generator.seedTestData(otherUserId, { contactCount: 3 });

        // Clear data for first user only
        await generator.clearTestData(testUserId);

        // Verify first user's data is gone
        const user1Contacts = await pool.query(
          'SELECT * FROM contacts WHERE user_id = $1',
          [testUserId]
        );
        expect(user1Contacts.rows.length).toBe(0);

        // Verify second user's data still exists
        const user2Contacts = await pool.query(
          'SELECT * FROM contacts WHERE user_id = $1',
          [otherUserId]
        );
        expect(user2Contacts.rows.length).toBe(3);
      } finally {
        // Clean up other user
        await pool.query('DELETE FROM contacts WHERE user_id = $1', [otherUserId]);
        await pool.query('DELETE FROM groups WHERE user_id = $1', [otherUserId]);
        await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
      }
    });

    it('should handle clearing when no data exists', async () => {
      const result = await generator.clearTestData(testUserId);

      expect(result.contactsDeleted).toBe(0);
      expect(result.groupsDeleted).toBe(0);
      expect(result.tagsDeleted).toBe(0);
    });
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions using calendar events', async () => {
      // First seed contacts
      await generator.seedTestData(testUserId, { contactCount: 5 });

      // Generate suggestions (will create calendar events if none exist)
      const result = await generator.generateSuggestions(testUserId, { daysAhead: 7 });

      // Should have created some suggestions
      expect(result.suggestionsCreated).toBeGreaterThanOrEqual(0);

      // Verify calendar events were created
      const calendarEventsResult = await pool.query(
        'SELECT * FROM calendar_events WHERE user_id = $1',
        [testUserId]
      );
      expect(calendarEventsResult.rows.length).toBeGreaterThan(0);
    });

    it('should use existing calendar events when available', async () => {
      // First seed contacts and calendar events
      await generator.seedTestData(testUserId, { 
        contactCount: 5,
        includeCalendarEvents: true 
      });

      // Count calendar events before generating suggestions
      const eventsBefore = await pool.query(
        'SELECT COUNT(*) as count FROM calendar_events WHERE user_id = $1',
        [testUserId]
      );
      const eventsCountBefore = parseInt(eventsBefore.rows[0].count);

      // Generate suggestions
      const result = await generator.generateSuggestions(testUserId, { daysAhead: 7 });

      // Count calendar events after
      const eventsAfter = await pool.query(
        'SELECT COUNT(*) as count FROM calendar_events WHERE user_id = $1',
        [testUserId]
      );
      const eventsCountAfter = parseInt(eventsAfter.rows[0].count);

      // Should use existing events (count should be the same)
      expect(eventsCountAfter).toBe(eventsCountBefore);
      expect(result.suggestionsCreated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('seedTestData with calendar events', () => {
    it('should create calendar events when includeCalendarEvents is true', async () => {
      const result = await generator.seedTestData(testUserId, {
        contactCount: 5,
        includeCalendarEvents: true
      });

      expect(result.calendarEventsCreated).toBeGreaterThan(0);

      // Verify calendar events were created in database
      const eventsResult = await pool.query(
        'SELECT * FROM calendar_events WHERE user_id = $1',
        [testUserId]
      );
      expect(eventsResult.rows.length).toBe(result.calendarEventsCreated);
    });

    it('should not create calendar events when includeCalendarEvents is false', async () => {
      const result = await generator.seedTestData(testUserId, {
        contactCount: 5,
        includeCalendarEvents: false
      });

      expect(result.calendarEventsCreated).toBe(0);

      // Verify no calendar events were created
      const eventsResult = await pool.query(
        'SELECT * FROM calendar_events WHERE user_id = $1',
        [testUserId]
      );
      expect(eventsResult.rows.length).toBe(0);
    });
  });
});
