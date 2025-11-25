/**
 * Test Data Generator Service
 *
 * Generates realistic test data for contacts, groups, tags, and calendar events.
 * Provides methods to seed, generate suggestions, and clear test data.
 */

import pool from '../db/connection';
import { FrequencyOption, TagSource } from '../types';
import cityTimezones from './city-timezones.json';
import { calendarEventGenerator, TimeOfDay } from '../calendar/calendar-event-generator';

/**
 * Test Data Generator Interface
 */
export interface TestDataGenerator {
  seedTestData(userId: string, options?: SeedOptions): Promise<SeedResult>;
  generateSuggestions(userId: string, options?: GenerateOptions): Promise<GenerateResult>;
  clearTestData(userId: string): Promise<ClearResult>;
}

export interface SeedOptions {
  contactCount?: number;
  includeCalendarEvents?: boolean;
  includeSuggestions?: boolean;
}

export interface SeedResult {
  contactsCreated: number;
  groupsCreated: number;
  tagsCreated: number;
  calendarEventsCreated: number;
  suggestionsCreated: number;
}

export interface GenerateOptions {
  daysAhead?: number;
  slotsPerDay?: number;
}

export interface GenerateResult {
  suggestionsCreated: number;
}

export interface ClearResult {
  contactsDeleted: number;
  groupsDeleted: number;
  tagsDeleted: number;
  calendarEventsDeleted: number;
  suggestionsDeleted: number;
}

/**
 * Test Data Generator Implementation
 */
export class TestDataGeneratorImpl implements TestDataGenerator {
  // Sample data for generating realistic test contacts
  private readonly firstNames = [
    'Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry',
    'Iris', 'Jack', 'Kate', 'Liam', 'Maya', 'Noah', 'Olivia', 'Peter',
    'Quinn', 'Rachel', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xavier',
    'Yara', 'Zoe'
  ];

  private readonly lastNames = [
    'Anderson', 'Brown', 'Chen', 'Davis', 'Evans', 'Garcia', 'Harris',
    'Johnson', 'Kim', 'Lee', 'Martinez', 'Miller', 'Nguyen', 'Patel',
    'Rodriguez', 'Smith', 'Taylor', 'Wilson', 'Young', 'Zhang'
  ];

  private readonly tagOptions = [
    'tech', 'hiking', 'coffee', 'startup', 'basketball', 'music',
    'design', 'yoga', 'photography', 'gaming', 'cooking', 'running',
    'books', 'travel', 'art', 'fitness', 'movies', 'cycling', 'food',
    'tennis', 'golf', 'swimming', 'skiing', 'climbing', 'dancing'
  ];

  private readonly groupNames = [
    'Close Friends', 'College Friends', 'Work Colleagues', 'Family',
    'Gym Buddies', 'Book Club', 'Running Group', 'Tech Meetup'
  ];

  private readonly frequencyOptions: FrequencyOption[] = [
    FrequencyOption.DAILY,
    FrequencyOption.WEEKLY,
    FrequencyOption.MONTHLY,
    FrequencyOption.YEARLY,
    FrequencyOption.FLEXIBLE
  ];

  /**
   * Seed test data including contacts, groups, tags, and optionally calendar events and suggestions
   */
  async seedTestData(userId: string, options: SeedOptions = {}): Promise<SeedResult> {
    const {
      contactCount = 10,
      includeCalendarEvents = false,
      includeSuggestions = false
    } = options;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create groups first
      const groupIds: string[] = [];
      for (const groupName of this.groupNames) {
        const groupResult = await client.query(
          `INSERT INTO groups (user_id, name, is_default)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [userId, groupName, false]
        );
        
        if (groupResult.rows.length > 0) {
          groupIds.push(groupResult.rows[0].id);
        }
      }

      // Generate contacts
      const contactIds: string[] = [];
      const usedEmails = new Set<string>();
      
      for (let i = 0; i < contactCount; i++) {
        const firstName = this.randomElement(this.firstNames);
        const lastName = this.randomElement(this.lastNames);
        const name = `${firstName} ${lastName}`;
        
        // Generate unique email
        let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
        let emailSuffix = 1;
        while (usedEmails.has(email)) {
          email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailSuffix}@example.com`;
          emailSuffix++;
        }
        usedEmails.add(email);

        // Select random location from city dataset
        const cityData = this.randomElement(cityTimezones);
        const location = `${cityData.city}, ${cityData.country}`;
        const timezone = cityData.timezone;

        // Generate varied last contact dates (between 1 and 90 days ago)
        const daysAgo = Math.floor(Math.random() * 90) + 1;
        const lastContactDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        // Random frequency preference
        const frequencyPreference = this.randomElement(this.frequencyOptions);

        // Create contact
        const contactResult = await client.query(
          `INSERT INTO contacts (
            user_id, name, email, location, timezone,
            frequency_preference, last_contact_date, custom_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id`,
          [
            userId,
            name,
            email,
            location,
            timezone,
            frequencyPreference,
            lastContactDate,
            `Test contact - Last contacted ${daysAgo} days ago`
          ]
        );

        const contactId = contactResult.rows[0].id;
        contactIds.push(contactId);

        // Add 2-4 random tags to each contact
        const numTags = Math.floor(Math.random() * 3) + 2; // 2-4 tags
        const selectedTags = this.randomElements(this.tagOptions, numTags);
        
        for (const tagText of selectedTags) {
          // Check if tag already exists
          const existingTag = await client.query(
            `SELECT id FROM tags WHERE LOWER(text) = LOWER($1)`,
            [tagText]
          );
          
          let tagId: string;
          if (existingTag.rows.length > 0) {
            tagId = existingTag.rows[0].id;
          } else {
            // Create new tag
            const tagResult = await client.query(
              `INSERT INTO tags (text, source)
               VALUES ($1, $2)
               RETURNING id`,
              [tagText, TagSource.MANUAL]
            );
            tagId = tagResult.rows[0].id;
          }
          
          // Associate tag with contact
          await client.query(
            `INSERT INTO contact_tags (contact_id, tag_id)
             VALUES ($1, $2)
             ON CONFLICT (contact_id, tag_id) DO NOTHING`,
            [contactId, tagId]
          );
        }

        // Assign contact to 1-2 random groups
        const numGroups = Math.floor(Math.random() * 2) + 1; // 1-2 groups
        const selectedGroups = this.randomElements(groupIds, Math.min(numGroups, groupIds.length));
        
        for (const groupId of selectedGroups) {
          await client.query(
            `INSERT INTO contact_groups (contact_id, group_id)
             VALUES ($1, $2)
             ON CONFLICT (contact_id, group_id) DO NOTHING`,
            [contactId, groupId]
          );
        }
      }

      // Count created entities
      const tagsResult = await client.query(
        `SELECT COUNT(DISTINCT ct.tag_id) as count
         FROM contact_tags ct
         INNER JOIN contacts c ON ct.contact_id = c.id
         WHERE c.user_id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      // Generate calendar events if requested (outside transaction)
      let calendarEventsCreated = 0;
      if (includeCalendarEvents) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14); // Next 14 days

        const calendarEvents = await calendarEventGenerator.generateAvailabilitySlots(
          userId,
          startDate,
          endDate,
          {
            includeWeekends: true,
            timesOfDay: [TimeOfDay.Morning, TimeOfDay.Afternoon, TimeOfDay.Evening],
            slotDuration: 60
          }
        );
        calendarEventsCreated = calendarEvents.length;
      }

      return {
        contactsCreated: contactIds.length,
        groupsCreated: groupIds.length,
        tagsCreated: parseInt(tagsResult.rows[0].count),
        calendarEventsCreated,
        suggestionsCreated: 0
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate suggestions for existing contacts
   */
  async generateSuggestions(userId: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    const { daysAhead = 7 } = options;

    // Get calendar events for the user
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const calendarEvents = await calendarEventGenerator.getCalendarEvents(
      userId,
      startDate,
      endDate
    );

    // Convert calendar events to time slots
    const availableSlots = calendarEvents
      .filter(event => event.isAvailable)
      .map(event => ({
        start: event.startTime,
        end: event.endTime,
        timezone: event.timezone
      }));

    // If no calendar events exist, generate some first
    if (availableSlots.length === 0) {
      const generatedEvents = await calendarEventGenerator.generateAvailabilitySlots(
        userId,
        startDate,
        endDate,
        {
          includeWeekends: true,
          timesOfDay: [TimeOfDay.Morning, TimeOfDay.Afternoon, TimeOfDay.Evening],
          slotDuration: 60
        }
      );

      // Convert generated events to time slots
      availableSlots.push(
        ...generatedEvents.map(event => ({
          start: event.startTime,
          end: event.endTime,
          timezone: event.timezone
        }))
      );
    }

    // Import the suggestion service dynamically to avoid circular dependencies
    const { generateTimeboundSuggestions } = await import('../matching/suggestion-service');

    // Generate suggestions using the matching service
    const suggestions = await generateTimeboundSuggestions(userId, availableSlots);

    return {
      suggestionsCreated: suggestions.length
    };
  }

  /**
   * Clear all test data for a user
   */
  async clearTestData(userId: string): Promise<ClearResult> {
    // Check if calendar_events table exists first (outside transaction)
    let calendarEventsExists = true;
    try {
      await pool.query('SELECT 1 FROM calendar_events LIMIT 1');
    } catch (error: any) {
      if (error.code === '42P01') { // undefined_table
        calendarEventsExists = false;
      }
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete suggestions
      const suggestionsResult = await client.query(
        'DELETE FROM suggestions WHERE user_id = $1',
        [userId]
      );

      // Delete calendar events (if table exists)
      let calendarEventsDeleted = 0;
      if (calendarEventsExists) {
        const calendarEventsResult = await client.query(
          'DELETE FROM calendar_events WHERE user_id = $1',
          [userId]
        );
        calendarEventsDeleted = calendarEventsResult.rowCount || 0;
      }

      // Get contact IDs before deletion for counting tags
      const contactsForTags = await client.query(
        'SELECT id FROM contacts WHERE user_id = $1',
        [userId]
      );
      const contactIds = contactsForTags.rows.map(row => row.id);

      // Count tags before deletion
      let tagsCount = 0;
      if (contactIds.length > 0) {
        const tagsResult = await client.query(
          `SELECT COUNT(DISTINCT tag_id) as count
           FROM contact_tags
           WHERE contact_id = ANY($1)`,
          [contactIds]
        );
        tagsCount = parseInt(tagsResult.rows[0].count);
      }

      // Delete contact_tags associations (will cascade from contacts deletion, but being explicit)
      await client.query(
        `DELETE FROM contact_tags
         WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)`,
        [userId]
      );

      // Delete contact_groups associations
      await client.query(
        `DELETE FROM contact_groups
         WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)`,
        [userId]
      );

      // Delete contacts
      const contactsResult = await client.query(
        'DELETE FROM contacts WHERE user_id = $1',
        [userId]
      );

      // Delete groups (only if they have no other contacts)
      const groupsResult = await client.query(
        `DELETE FROM groups
         WHERE user_id = $1
         AND id NOT IN (SELECT DISTINCT group_id FROM contact_groups)`,
        [userId]
      );

      // Delete orphaned tags (tags not associated with any contact)
      await client.query(
        `DELETE FROM tags
         WHERE id NOT IN (SELECT DISTINCT tag_id FROM contact_tags)`
      );

      await client.query('COMMIT');

      return {
        contactsDeleted: contactsResult.rowCount || 0,
        groupsDeleted: groupsResult.rowCount || 0,
        tagsDeleted: tagsCount,
        calendarEventsDeleted,
        suggestionsDeleted: suggestionsResult.rowCount || 0
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Get a random element from an array
   */
  private randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Helper: Get multiple random elements from an array
   */
  private randomElements<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, array.length));
  }
}

// Export singleton instance
export const testDataGenerator = new TestDataGeneratorImpl();
