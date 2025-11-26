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
            // Create new tag for this user
            const tagResult = await client.query(
              `INSERT INTO tags (user_id, text, source)
               VALUES ($1, $2, $3)
               RETURNING id`,
              [userId, tagText, TagSource.MANUAL]
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

      return {
        contactsCreated: contactIds.length,
        groupsCreated: groupIds.length,
        tagsCreated: parseInt(tagsResult.rows[0].count),
        calendarEventsCreated,
        suggestionsCreated: 0,
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

    // Generate both individual and group suggestions using the enhanced matching service
    const suggestions = await generateSuggestions(userId, availableSlots);

    return {
      suggestionsCreated: suggestions.length
    };
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

      // 9. Delete all tags for this user (now that tags are user-specific)
      const tagsResult = await client.query(
        'DELETE FROM tags WHERE user_id = $1',
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
        const transcript = this.generateTranscript(template, mentionedContacts);

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
}

// Export singleton instance
export const testDataGenerator = new TestDataGeneratorImpl();
