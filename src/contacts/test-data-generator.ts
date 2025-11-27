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
  getStatus(userId: string): Promise<StatusResult>;
  generateByType(userId: string, dataType: string): Promise<GenerateByTypeResult>;
  removeByType(userId: string, dataType: string): Promise<RemoveByTypeResult>;
}

export interface StatusResult {
  contacts: { test: number; real: number };
  calendarEvents: { test: number; real: number };
  suggestions: { test: number; real: number };
  groupSuggestions: { test: number; real: number };
  voiceNotes: { test: number; real: number };
}

export interface GenerateByTypeResult {
  itemsCreated: number;
  message: string;
}

export interface RemoveByTypeResult {
  itemsDeleted: number;
  message: string;
}

export interface SeedOptions {
  contactCount?: number;
  includeCalendarEvents?: boolean;
  includeSuggestions?: boolean;
  includeVoiceNotes?: boolean;
}

export interface SeedResult {
  contactsCreated: number;
  groupsCreated: number;
  tagsCreated: number;
  calendarEventsCreated: number;
  suggestionsCreated: number;
  voiceNotesCreated: number;
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
  voiceNotesDeleted: number;
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
    'Gym Buddies', 'Book Club', 'Running Group', 'Tech Meetup',
    'Work Friends', 'College Buddies', 'Hiking Group', 'Startup Founders',
    'Basketball Team', 'Music Lovers', 'Photography Club', 'Gaming Squad'
  ];

  private readonly frequencyOptions: FrequencyOption[] = [
    FrequencyOption.DAILY,
    FrequencyOption.WEEKLY,
    FrequencyOption.MONTHLY,
    FrequencyOption.YEARLY,
    FrequencyOption.FLEXIBLE
  ];

  // Sample voice note transcriptions with realistic content
  private readonly voiceNoteTemplates = [
    {
      template: "Had a great coffee chat with {name} today. We talked about {interest1} and {interest2}. They mentioned they're working on a new project related to {interest1}. Should catch up again soon!",
      interests: ['tech', 'startup', 'design', 'coding']
    },
    {
      template: "Ran into {name} at the {location}. We discussed {interest1} and made plans to go {activity} next week. They're really into {interest2} these days.",
      interests: ['hiking', 'running', 'cycling', 'fitness'],
      locations: ['gym', 'park', 'coffee shop', 'trail']
    },
    {
      template: "Called {name} to catch up. They're planning a trip to {destination} and asked for recommendations. We also talked about {interest1} and {interest2}.",
      interests: ['travel', 'photography', 'food', 'art'],
      destinations: ['Japan', 'Italy', 'Peru', 'Iceland', 'New Zealand']
    },
    {
      template: "Met {name} and {name2} for dinner. Great conversation about {interest1}. {name} is thinking about starting a {interest2} group. Count me in!",
      interests: ['books', 'movies', 'music', 'cooking', 'gaming']
    },
    {
      template: "Played {sport} with {name} today. They've really improved! We grabbed lunch after and talked about {interest1}. Need to schedule another game soon.",
      interests: ['basketball', 'tennis', 'golf', 'swimming'],
      sports: ['basketball', 'tennis', 'golf', 'volleyball']
    },
    {
      template: "Video call with {name} about {interest1}. They shared some great insights on {interest2}. Planning to collaborate on a project together.",
      interests: ['tech', 'design', 'startup', 'photography', 'art']
    },
    {
      template: "Bumped into {name} at {location}. We chatted about {interest1} and they recommended a great {recommendation}. Should definitely check it out!",
      interests: ['books', 'movies', 'music', 'food', 'art'],
      locations: ['bookstore', 'gallery', 'concert', 'restaurant'],
      recommendations: ['book', 'restaurant', 'podcast', 'album', 'exhibition']
    },
    {
      template: "Went {activity} with {name} and {name2}. Beautiful day! We talked about organizing a group trip. {name} suggested {destination}.",
      interests: ['hiking', 'cycling', 'climbing', 'skiing'],
      activities: ['hiking', 'cycling', 'climbing', 'skiing'],
      destinations: ['Yosemite', 'the Alps', 'Patagonia', 'Colorado']
    }
  ];

  /**
   * Seed test data including contacts, groups, tags, and optionally calendar events and suggestions
   */
  async seedTestData(userId: string, options: SeedOptions = {}): Promise<SeedResult> {
    const {
      contactCount = 10,
      includeCalendarEvents = false,
      includeSuggestions = false,
      includeVoiceNotes = false
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

      // Generate contacts with intentional shared groups and tags
      const contactIds: string[] = [];
      const usedEmails = new Set<string>();
      
      // Define shared tag clusters to ensure multiple contacts share tags
      const tagClusters = [
        ['tech', 'startup', 'coding'],
        ['hiking', 'running', 'fitness'],
        ['coffee', 'food', 'cooking'],
        ['music', 'art', 'photography'],
        ['basketball', 'tennis', 'sports'],
        ['books', 'movies', 'gaming']
      ];
      
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

        // Generate varied last contact dates (between 30 and 180 days ago)
        // This ensures contacts are more likely to meet frequency thresholds
        const daysAgo = Math.floor(Math.random() * 150) + 30;
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

        // Assign tags from 1-2 clusters to create shared context
        // This ensures multiple contacts will share the same tags
        const numClusters = Math.floor(Math.random() * 2) + 1; // 1-2 clusters
        const selectedClusters = this.randomElements(tagClusters, numClusters);
        const selectedTags: string[] = [];
        
        for (const cluster of selectedClusters) {
          // Pick 2-3 tags from each cluster
          const tagsFromCluster = this.randomElements(cluster, Math.floor(Math.random() * 2) + 2);
          selectedTags.push(...tagsFromCluster);
        }
        
        for (const tagText of selectedTags) {
          // Check if tag already exists for this user
          const existingTag = await client.query(
            `SELECT id FROM tags WHERE user_id = $1 AND LOWER(text) = LOWER($2)`,
            [userId, tagText]
          );
          
          let tagId: string;
          if (existingTag.rows.length > 0) {
            tagId = existingTag.rows[0].id;
          } else {
            // Create new tag
            const tagResult = await client.query(
              `INSERT INTO tags (text, source, user_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id, LOWER(text)) DO NOTHING
               RETURNING id`,
              [tagText, TagSource.MANUAL, userId]
            );
            
            if (tagResult.rows.length > 0) {
              tagId = tagResult.rows[0].id;
            } else {
              // If insert failed due to conflict, fetch the existing tag for this user
              const fetchResult = await client.query(
                `SELECT id FROM tags WHERE user_id = $1 AND LOWER(text) = LOWER($2)`,
                [userId, tagText]
              );
              tagId = fetchResult.rows[0].id;
            }
          }
          
          // Associate tag with contact
          await client.query(
            `INSERT INTO contact_tags (contact_id, tag_id)
             VALUES ($1, $2)
             ON CONFLICT (contact_id, tag_id) DO NOTHING`,
            [contactId, tagId]
          );
        }

        // Assign contacts to groups with intentional overlap
        // Create clusters of contacts that share groups
        // First 30% of contacts -> Group 1 & 2 (e.g., "Work Friends", "Tech Meetup")
        // Next 30% -> Group 2 & 3 (e.g., "Tech Meetup", "College Buddies")
        // Next 30% -> Group 3 & 4 (e.g., "College Buddies", "Hiking Group")
        // Last 10% -> Random groups
        
        let selectedGroups: string[] = [];
        const contactPosition = i / contactCount;
        
        if (contactPosition < 0.3 && groupIds.length >= 2) {
          // First cluster: Groups 0 and 1
          selectedGroups = [groupIds[0], groupIds[1]];
        } else if (contactPosition < 0.6 && groupIds.length >= 3) {
          // Second cluster: Groups 1 and 2
          selectedGroups = [groupIds[1], groupIds[2]];
        } else if (contactPosition < 0.9 && groupIds.length >= 4) {
          // Third cluster: Groups 2 and 3
          selectedGroups = [groupIds[2], groupIds[3]];
        } else {
          // Random groups for variety
          const numGroups = Math.floor(Math.random() * 2) + 1; // 1-2 groups
          selectedGroups = this.randomElements(groupIds, Math.min(numGroups, groupIds.length));
        }
        
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

      // Invalidate contact cache after creating contacts
      const { invalidateContactCache } = await import('../utils/cache');
      await invalidateContactCache(userId);

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

      // Generate voice notes if requested (outside transaction)
      let voiceNotesCreated = 0;
      if (includeVoiceNotes && contactIds.length > 0) {
        voiceNotesCreated = await this.generateVoiceNotes(userId, contactIds);
      }

      // Generate suggestions if requested (outside transaction)
      let suggestionsCreated = 0;
      if (includeSuggestions && contactIds.length > 0) {
        const suggestionResult = await this.generateSuggestions(userId, { daysAhead: 7 });
        suggestionsCreated = suggestionResult.suggestionsCreated;
      }

      return {
        contactsCreated: contactIds.length,
        groupsCreated: groupIds.length,
        tagsCreated: parseInt(tagsResult.rows[0].count),
        calendarEventsCreated,
        suggestionsCreated,
        voiceNotesCreated
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate suggestions for existing contacts (including group suggestions)
   */
  async generateSuggestions(userId: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    const { daysAhead = 7 } = options;

    // First, verify that contacts exist for this user
    const contactsResult = await pool.query(
      'SELECT COUNT(*) as count FROM contacts WHERE user_id = $1',
      [userId]
    );
    
    const contactCount = parseInt(contactsResult.rows[0].count);
    if (contactCount === 0) {
      // No contacts to generate suggestions for
      return { suggestionsCreated: 0 };
    }

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

    // Note: We no longer generate fake calendar events here since users can connect
    // their real Google Calendar. If no calendar events exist, we'll use empty slots.
    // This prevents conflicts with actual calendar events.
    if (availableSlots.length === 0) {
      // Create generic available slots without storing them in the database
      // This allows suggestions to be created even without calendar data
      const generatedSlots = [];
      for (let i = 0; i < daysAhead; i++) {
        const slotDate = new Date(startDate);
        slotDate.setDate(slotDate.getDate() + i);
        
        // Morning slot
        const morningStart = new Date(slotDate);
        morningStart.setHours(9, 0, 0, 0);
        const morningEnd = new Date(morningStart);
        morningEnd.setHours(10, 0, 0, 0);
        generatedSlots.push({ start: morningStart, end: morningEnd, timezone: 'UTC' });
        
        // Afternoon slot
        const afternoonStart = new Date(slotDate);
        afternoonStart.setHours(14, 0, 0, 0);
        const afternoonEnd = new Date(afternoonStart);
        afternoonEnd.setHours(15, 0, 0, 0);
        generatedSlots.push({ start: afternoonStart, end: afternoonEnd, timezone: 'UTC' });
      }
      
      availableSlots.push(...generatedSlots);
    }

    // Import the suggestion service dynamically to avoid circular dependencies
    const { generateSuggestions } = await import('../matching/suggestion-service');

    try {
      // Verify contacts exist before generating suggestions
      const contactCheck = await pool.query(
        'SELECT COUNT(*) as count FROM contacts WHERE user_id = $1',
        [userId]
      );
      const contactCount = parseInt(contactCheck.rows[0].count);
      
      if (contactCount === 0) {
        console.warn('No contacts found for suggestion generation');
        return { suggestionsCreated: 0 };
      }

      console.log(`Generating suggestions for ${contactCount} contacts`);

      // Generate both individual and group suggestions using the enhanced matching service
      const suggestions = await generateSuggestions(userId, availableSlots);

      console.log(`Generated ${suggestions.length} suggestions`);

      // Mark suggestions as test data by prepending "Test: " to reasoning
      if (suggestions.length > 0) {
        const suggestionIds = suggestions.map(s => s.id);
        await pool.query(
          `UPDATE suggestions 
           SET reasoning = 'Test: ' || reasoning 
           WHERE id = ANY($1)`,
          [suggestionIds]
        );
      }

      return {
        suggestionsCreated: suggestions.length
      };
    } catch (error: any) {
      // If suggestion generation fails due to missing contacts, return 0
      if (error.message && error.message.includes('foreign key')) {
        console.warn('Suggestion generation failed: foreign key constraint violation', error.message);
        return { suggestionsCreated: 0 };
      }
      console.error('Suggestion generation error:', error);
      return { suggestionsCreated: 0 };
    }
  }

  /**
   * Clear all test data for a user
   * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
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

    // Check if voice_notes table exists
    let voiceNotesExists = true;
    try {
      await pool.query('SELECT 1 FROM voice_notes LIMIT 1');
    } catch (error: any) {
      if (error.code === '42P01') { // undefined_table
        voiceNotesExists = false;
      }
    }

    // Check if enrichment_items table exists
    let enrichmentItemsExists = true;
    try {
      await pool.query('SELECT 1 FROM enrichment_items LIMIT 1');
    } catch (error: any) {
      if (error.code === '42P01') { // undefined_table
        enrichmentItemsExists = false;
      }
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete in proper order to maintain referential integrity
      
      // 1. Delete enrichment items first (references voice_notes and contacts)
      // Requirement 12.5: Maintain referential integrity during deletion
      if (enrichmentItemsExists) {
        await client.query(
          `DELETE FROM enrichment_items
           WHERE voice_note_id IN (SELECT id FROM voice_notes WHERE user_id = $1)`,
          [userId]
        );
      }

      // 2. Delete voice notes and associations (if table exists)
      // Requirements 12.1, 12.2: Remove all test voice notes and associations
      let voiceNotesDeleted = 0;
      if (voiceNotesExists) {
        // voice_note_contacts will cascade delete due to ON DELETE CASCADE
        const voiceNotesResult = await client.query(
          'DELETE FROM voice_notes WHERE user_id = $1',
          [userId]
        );
        voiceNotesDeleted = voiceNotesResult.rowCount || 0;
      }

      // 3. Delete suggestions (both individual and group types)
      // Requirements 12.3: Remove all group suggestions (type='group')
      // suggestion_contacts will cascade delete due to ON DELETE CASCADE
      const suggestionsResult = await client.query(
        'DELETE FROM suggestions WHERE user_id = $1',
        [userId]
      );

      // 4. Delete calendar events (if table exists)
      // Requirement 12.4: Remove all calendar events
      let calendarEventsDeleted = 0;
      if (calendarEventsExists) {
        const calendarEventsResult = await client.query(
          'DELETE FROM calendar_events WHERE user_id = $1',
          [userId]
        );
        calendarEventsDeleted = calendarEventsResult.rowCount || 0;
      }

      // 5. Delete contact_tags associations (will cascade from contacts deletion, but being explicit)
      await client.query(
        `DELETE FROM contact_tags
         WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)`,
        [userId]
      );

      // 6. Delete contact_groups associations
      await client.query(
        `DELETE FROM contact_groups
         WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)`,
        [userId]
      );

      // 7. Delete contacts
      const contactsResult = await client.query(
        'DELETE FROM contacts WHERE user_id = $1',
        [userId]
      );

      // 8. Delete groups (only if they have no other contacts)
      const groupsResult = await client.query(
        `DELETE FROM groups
         WHERE user_id = $1
         AND id NOT IN (SELECT DISTINCT group_id FROM contact_groups)`,
        [userId]
      );

      // 9. Delete orphaned tags (tags with no contact associations)
      // Only delete tags for this user to avoid affecting other users' data
      const tagsResult = await client.query(
        `DELETE FROM tags 
         WHERE user_id = $1
         AND id NOT IN (
          SELECT DISTINCT tag_id FROM contact_tags
        )`,
        [userId]
      );
      const tagsDeleted = tagsResult.rowCount || 0;

      await client.query('COMMIT');

      return {
        contactsDeleted: contactsResult.rowCount || 0,
        groupsDeleted: groupsResult.rowCount || 0,
        tagsDeleted,
        calendarEventsDeleted,
        suggestionsDeleted: suggestionsResult.rowCount || 0,
        voiceNotesDeleted
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate group suggestions based on contacts with strong shared context
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   * Property 17: Group suggestion contact membership
   * Property 18: Group suggestion shared context
   */
  async generateGroupSuggestions(userId: string): Promise<number> {
    // Import group matching service
    const { groupMatchingService } = await import('../matching/group-matching-service');
    
    // Get all contacts for the user with their tags and groups
    const contactsResult = await pool.query(
      `SELECT c.*, 
              array_agg(DISTINCT jsonb_build_object('id', t.id, 'text', t.text, 'source', t.source, 'createdAt', t.created_at)) FILTER (WHERE t.id IS NOT NULL) as tags,
              array_agg(DISTINCT g.id) FILTER (WHERE g.id IS NOT NULL) as group_ids
       FROM contacts c
       LEFT JOIN contact_tags ct ON c.id = ct.contact_id
       LEFT JOIN tags t ON ct.tag_id = t.id
       LEFT JOIN contact_groups cg ON c.id = cg.contact_id
       LEFT JOIN groups g ON cg.group_id = g.id
       WHERE c.user_id = $1
       GROUP BY c.id`,
      [userId]
    );

    if (contactsResult.rows.length < 2) {
      // Need at least 2 contacts to create group suggestions
      return 0;
    }

    // Convert database rows to Contact objects
    const contacts = contactsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      location: row.location,
      timezone: row.timezone,
      frequencyPreference: row.frequency_preference,
      lastContactDate: row.last_contact_date,
      customNotes: row.custom_notes,
      archived: row.archived,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: (row.tags || []).filter((t: any) => t && t.id),
      groups: row.group_ids || []
    }));

    // Find potential groups with strong shared context
    const potentialGroups = await groupMatchingService.findPotentialGroups(contacts);

    if (potentialGroups.length === 0) {
      return 0;
    }

    // Get available time slots for suggestions
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const calendarEvents = await pool.query(
      `SELECT * FROM calendar_events 
       WHERE user_id = $1 
       AND start_time >= $2 
       AND end_time <= $3
       AND is_available = true
       ORDER BY start_time
       LIMIT 5`,
      [userId, startDate, endDate]
    );

    // If no calendar events, create generic time slots
    let timeSlots: Array<{ start: Date; end: Date; timezone: string }> = [];
    
    if (calendarEvents.rows.length > 0) {
      timeSlots = calendarEvents.rows.map(event => ({
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        timezone: event.timezone
      }));
    } else {
      // Create generic slots for the next 7 days
      for (let i = 0; i < 7; i++) {
        const slotDate = new Date(startDate);
        slotDate.setDate(slotDate.getDate() + i);
        
        // Afternoon slot
        const slotStart = new Date(slotDate);
        slotStart.setHours(14, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(15, 30, 0, 0);
        
        timeSlots.push({
          start: slotStart,
          end: slotEnd,
          timezone: 'UTC'
        });
      }
    }

    // Create group suggestions
    let createdCount = 0;
    const { generateGroupSuggestion } = await import('../matching/suggestion-service');

    for (const group of potentialGroups) {
      // Use first available time slot
      if (timeSlots.length === 0) break;
      
      const timeSlot = timeSlots[0];

      try {
        const suggestion = await generateGroupSuggestion(
          userId,
          group,
          timeSlot
        );

        if (suggestion) {
          createdCount++;
        }
      } catch (error) {
        // Log error but continue with next group
        console.error('Error creating group suggestion:', error);
      }
    }

    return createdCount;
  }

  /**
   * Generate realistic voice notes with contact associations
   * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
   */
  private async generateVoiceNotes(userId: string, contactIds: string[]): Promise<number> {
    const client = await pool.connect();
    
    try {
      // Get contact details for generating realistic transcriptions
      const contactsResult = await client.query(
        `SELECT c.id, c.name, array_agg(DISTINCT t.text) as tags
         FROM contacts c
         LEFT JOIN contact_tags ct ON c.id = ct.contact_id
         LEFT JOIN tags t ON ct.tag_id = t.id
         WHERE c.id = ANY($1)
         GROUP BY c.id, c.name`,
        [contactIds]
      );

      const contacts = contactsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        tags: row.tags.filter((t: string | null) => t !== null)
      }));

      // Generate 5-10 voice notes
      const voiceNoteCount = Math.floor(Math.random() * 6) + 5;
      let createdCount = 0;

      for (let i = 0; i < voiceNoteCount; i++) {
        // Vary recording timestamps across multiple days (7-60 days ago)
        const daysAgo = Math.floor(Math.random() * 54) + 7;
        const recordingTimestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        // Decide if this is a co-mention (30% chance)
        const isCoMention = Math.random() < 0.3 && contacts.length >= 2;
        const mentionedContacts = isCoMention 
          ? this.randomElements(contacts, Math.min(2, contacts.length))
          : [this.randomElement(contacts)];

        // Generate transcript based on template
        const template = this.randomElement(this.voiceNoteTemplates);
        let transcript = this.generateTranscript(template, mentionedContacts);
        
        // Mark as test data by prepending "Test: " to transcript
        transcript = `Test: ${transcript}`;

        // Extract entities from the mentioned contacts
        const extractedEntities: Record<string, any> = {};
        
        for (const contact of mentionedContacts) {
          // Get interests from contact tags
          const interests = contact.tags.length > 0 
            ? this.randomElements(contact.tags, Math.min(2, contact.tags.length))
            : this.randomElements(template.interests, 2);

          extractedEntities[contact.id] = {
            fields: {
              name: contact.name
            },
            tags: interests,
            groups: [],
            lastContactDate: recordingTimestamp
          };
        }

        // Create voice note
        const voiceNoteResult = await client.query(
          `INSERT INTO voice_notes (
            user_id, transcript, recording_timestamp, status, extracted_entities
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id`,
          [
            userId,
            transcript,
            recordingTimestamp,
            'ready',
            JSON.stringify(extractedEntities)
          ]
        );

        const voiceNoteId = voiceNoteResult.rows[0].id;

        // Associate contacts with voice note
        for (const contact of mentionedContacts) {
          await client.query(
            `INSERT INTO voice_note_contacts (voice_note_id, contact_id)
             VALUES ($1, $2)
             ON CONFLICT (voice_note_id, contact_id) DO NOTHING`,
            [voiceNoteId, contact.id]
          );
        }

        createdCount++;
      }

      return createdCount;
    } finally {
      client.release();
    }
  }

  /**
   * Generate a realistic transcript from a template
   */
  private generateTranscript(
    template: any,
    contacts: Array<{ id: string; name: string; tags: string[] }>
  ): string {
    let transcript = template.template;

    // Replace {name} placeholders
    const nameMatches = transcript.match(/\{name\d*\}/g) || [];
    nameMatches.forEach((match: string, index: number) => {
      const contact = contacts[index] || contacts[0];
      transcript = transcript.replace(match, contact.name);
    });

    // Replace {interest} placeholders
    const interestMatches = transcript.match(/\{interest\d+\}/g) || [];
    interestMatches.forEach((match: string) => {
      const interest = this.randomElement(template.interests);
      transcript = transcript.replace(match, interest);
    });

    // Replace {location} placeholders
    if (template.locations && transcript.includes('{location}')) {
      const location = this.randomElement(template.locations);
      transcript = transcript.replace('{location}', location);
    }

    // Replace {destination} placeholders
    if (template.destinations && transcript.includes('{destination}')) {
      const destination = this.randomElement(template.destinations);
      transcript = transcript.replace('{destination}', destination);
    }

    // Replace {activity} placeholders
    if (template.activities && transcript.includes('{activity}')) {
      const activity = this.randomElement(template.activities);
      transcript = transcript.replace('{activity}', activity);
    }

    // Replace {sport} placeholders
    if (template.sports && transcript.includes('{sport}')) {
      const sport = this.randomElement(template.sports);
      transcript = transcript.replace('{sport}', sport);
    }

    // Replace {recommendation} placeholders
    if (template.recommendations && transcript.includes('{recommendation}')) {
      const recommendation = this.randomElement(template.recommendations);
      transcript = transcript.replace('{recommendation}', recommendation);
    }

    return transcript;
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

  /**
   * Get status counts for all test data types
   * Property 1, 2, 3: Status panel displays all data types and counts match database
   */
  async getStatus(userId: string): Promise<StatusResult> {
    const client = await pool.connect();
    
    try {
      // Check which tables exist
      let calendarEventsExists = true;
      let voiceNotesExists = true;
      
      try {
        await client.query('SELECT 1 FROM calendar_events LIMIT 1');
      } catch (error: any) {
        if (error.code === '42P01') calendarEventsExists = false;
      }
      
      try {
        await client.query('SELECT 1 FROM voice_notes LIMIT 1');
      } catch (error: any) {
        if (error.code === '42P01') voiceNotesExists = false;
      }

      // Count contacts
      const contactsResult = await client.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN custom_notes ILIKE '%Test contact%' THEN 1 END) as test_count
         FROM contacts WHERE user_id = $1`,
        [userId]
      );
      
      // Handle case where no rows are returned
      if (contactsResult.rows.length === 0) {
        return {
          contacts: { test: 0, real: 0 },
          calendarEvents: { test: 0, real: 0 },
          suggestions: { test: 0, real: 0 },
          groupSuggestions: { test: 0, real: 0 },
          voiceNotes: { test: 0, real: 0 }
        };
      }
      const contactsTotal = parseInt(contactsResult.rows[0].total);
      const contactsTest = parseInt(contactsResult.rows[0].test_count);

      // Count calendar events
      let calendarEventsTotal = 0;
      let calendarEventsTest = 0;
      if (calendarEventsExists) {
        const calendarResult = await client.query(
          `SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN source = 'test' THEN 1 END) as test_count
           FROM calendar_events WHERE user_id = $1`,
          [userId]
        );
        calendarEventsTotal = parseInt(calendarResult.rows[0].total);
        calendarEventsTest = parseInt(calendarResult.rows[0].test_count);
      }

      // Count suggestions
      const suggestionsResult = await client.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN reasoning ILIKE '%Test%' THEN 1 END) as test_count
         FROM suggestions WHERE user_id = $1`,
        [userId]
      );
      const suggestionsTotal = parseInt(suggestionsResult.rows[0].total);
      const suggestionsTest = parseInt(suggestionsResult.rows[0].test_count);

      // Count group suggestions (type='group')
      const groupSuggestionsResult = await client.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN reasoning ILIKE '%Test%' AND type = 'group' THEN 1 END) as test_count
         FROM suggestions WHERE user_id = $1 AND type = 'group'`,
        [userId]
      );
      const groupSuggestionsTotal = parseInt(groupSuggestionsResult.rows[0].total);
      const groupSuggestionsTest = parseInt(groupSuggestionsResult.rows[0].test_count);

      // Count voice notes
      let voiceNotesTotal = 0;
      let voiceNotesTest = 0;
      if (voiceNotesExists) {
        const voiceNotesResult = await client.query(
          `SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN transcript ILIKE '%Test%' THEN 1 END) as test_count
           FROM voice_notes WHERE user_id = $1`,
          [userId]
        );
        voiceNotesTotal = parseInt(voiceNotesResult.rows[0].total);
        voiceNotesTest = parseInt(voiceNotesResult.rows[0].test_count);
      }

      return {
        contacts: { test: contactsTest, real: contactsTotal - contactsTest },
        calendarEvents: { test: calendarEventsTest, real: calendarEventsTotal - calendarEventsTest },
        suggestions: { test: suggestionsTest, real: suggestionsTotal - suggestionsTest },
        groupSuggestions: { test: groupSuggestionsTest, real: groupSuggestionsTotal - groupSuggestionsTest },
        voiceNotes: { test: voiceNotesTest, real: voiceNotesTotal - voiceNotesTest }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Generate specific type of test data
   * Property 5-25: Generate specific data types with validation
   */
  async generateByType(userId: string, dataType: string): Promise<GenerateByTypeResult> {
    switch (dataType) {
      case 'contacts':
        const contactResult = await this.seedTestData(userId, { contactCount: 10 });
        return {
          itemsCreated: contactResult.contactsCreated,
          message: `Generated ${contactResult.contactsCreated} test contacts`
        };
      
      case 'calendarEvents':
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14);
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
        return {
          itemsCreated: calendarEvents.length,
          message: `Generated ${calendarEvents.length} test calendar events`
        };
      
      case 'suggestions':
        const suggestionResult = await this.generateSuggestions(userId, { daysAhead: 7 });
        return {
          itemsCreated: suggestionResult.suggestionsCreated,
          message: `Generated ${suggestionResult.suggestionsCreated} test suggestions`
        };
      
      case 'groupSuggestions':
        // Generate group suggestions based on existing contacts
        const existingContactsResult = await pool.query(
          'SELECT id FROM contacts WHERE user_id = $1 LIMIT 20',
          [userId]
        );
        
        if (existingContactsResult.rows.length < 2) {
          // Generate contacts first if not enough exist
          await this.seedTestData(userId, { contactCount: 10 });
        }
        
        const groupSuggestionsCount = await this.generateGroupSuggestions(userId);
        return {
          itemsCreated: groupSuggestionsCount,
          message: `Generated ${groupSuggestionsCount} test group suggestions`
        };
      
      case 'voiceNotes':
        // Get existing contacts to associate with voice notes
        const contactsResult = await pool.query(
          'SELECT id FROM contacts WHERE user_id = $1 LIMIT 10',
          [userId]
        );
        const contactIds = contactsResult.rows.map(row => row.id);
        
        if (contactIds.length === 0) {
          // Generate contacts first
          await this.seedTestData(userId, { contactCount: 5 });
          const newContactsResult = await pool.query(
            'SELECT id FROM contacts WHERE user_id = $1 LIMIT 10',
            [userId]
          );
          contactIds.push(...newContactsResult.rows.map(row => row.id));
        }
        
        const voiceNotesCount = await this.generateVoiceNotes(userId, contactIds);
        return {
          itemsCreated: voiceNotesCount,
          message: `Generated ${voiceNotesCount} test voice notes`
        };
      
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  /**
   * Remove specific type of test data
   * Property 26-28: Remove test data while preserving real data
   */
  async removeByType(userId: string, dataType: string): Promise<RemoveByTypeResult> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      let itemsDeleted = 0;

      switch (dataType) {
        case 'contacts':
          // Delete test contacts (marked with 'Test contact' in custom_notes)
          const contactsResult = await client.query(
            `DELETE FROM contacts 
             WHERE user_id = $1 AND custom_notes LIKE '%Test contact%'`,
            [userId]
          );
          itemsDeleted = contactsResult.rowCount || 0;
          break;
        
        case 'calendarEvents':
          // Delete test calendar events
          const calendarResult = await client.query(
            `DELETE FROM calendar_events 
             WHERE user_id = $1 AND source = 'test'`,
            [userId]
          );
          itemsDeleted = calendarResult.rowCount || 0;
          break;
        
        case 'suggestions':
          // Delete test suggestions (excluding group suggestions)
          const suggestionsResult = await client.query(
            `DELETE FROM suggestions 
             WHERE user_id = $1 AND reasoning ILIKE '%Test%' AND type != 'group'`,
            [userId]
          );
          itemsDeleted = suggestionsResult.rowCount || 0;
          break;
        
        case 'groupSuggestions':
          // Delete test group suggestions
          const groupSuggestionsResult = await client.query(
            `DELETE FROM suggestions 
             WHERE user_id = $1 AND reasoning ILIKE '%Test%' AND type = 'group'`,
            [userId]
          );
          itemsDeleted = groupSuggestionsResult.rowCount || 0;
          break;
        
        case 'voiceNotes':
          // Delete test voice notes
          const voiceNotesResult = await client.query(
            `DELETE FROM voice_notes 
             WHERE user_id = $1 AND transcript ILIKE '%Test%'`,
            [userId]
          );
          itemsDeleted = voiceNotesResult.rowCount || 0;
          break;
        
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      await client.query('COMMIT');

      return {
        itemsDeleted,
        message: `Removed ${itemsDeleted} test ${dataType}`
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const testDataGenerator = new TestDataGeneratorImpl();
