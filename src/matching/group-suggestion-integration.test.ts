/**
 * Group Suggestion Integration Tests
 *
 * Tests for the enhanced suggestion service with group support.
 * Requirements: 8.1, 8.2, 9.1, 9.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import pool from '../db/connection';
import { contactService } from '../contacts/service';
import { groupMatchingService, ContactGroup } from './group-matching-service';
import {
  generateGroupSuggestion,
  balanceSuggestions,
  generateSuggestions,
} from './suggestion-service';
import { Contact, FrequencyOption, TimeSlot, Suggestion } from '../types';

describe('Group Suggestion Integration', () => {
  let userId: string;
  let testContacts: Contact[] = [];

  beforeEach(async () => {
    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [`test-group-${Date.now()}@example.com`, 'hash']
    );
    userId = userResult.rows[0].id;

    // Create test contacts with shared context
    const contact1 = await contactService.createContact(userId, {
      name: 'Alice',
      frequencyPreference: FrequencyOption.MONTHLY,
      lastContactDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
    });

    const contact2 = await contactService.createContact(userId, {
      name: 'Bob',
      frequencyPreference: FrequencyOption.MONTHLY,
      lastContactDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
    });

    const contact3 = await contactService.createContact(userId, {
      name: 'Charlie',
      frequencyPreference: FrequencyOption.MONTHLY,
      lastContactDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
    });

    testContacts = [contact1, contact2, contact3];
  });

  afterEach(async () => {
    // Clean up
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  describe('generateGroupSuggestion', () => {
    it('should create group suggestion for valid contact group', async () => {
      const contactGroup: ContactGroup = {
        contacts: [testContacts[0], testContacts[1]],
        sharedContext: {
          score: 60,
          factors: {
            commonGroups: ['Friends'],
            sharedTags: ['hiking'],
            coMentionedInVoiceNotes: 2,
            overlappingInterests: ['hiking'],
          },
        },
        suggestedDuration: 60,
      };

      const timeslot: TimeSlot = {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 25 * 60 * 60 * 1000),
        timezone: 'America/Los_Angeles',
      };

      const suggestion = await generateGroupSuggestion(userId, contactGroup, timeslot);

      expect(suggestion).not.toBeNull();
      expect(suggestion!.type).toBe('group');
      expect(suggestion!.contacts).toHaveLength(2);
      expect(suggestion!.sharedContext).toBeDefined();
      expect(suggestion!.sharedContext!.score).toBe(60);
    });

    it('should return null for group with less than 2 contacts', async () => {
      const contactGroup: ContactGroup = {
        contacts: [testContacts[0]],
        sharedContext: {
          score: 60,
          factors: {
            commonGroups: [],
            sharedTags: [],
            coMentionedInVoiceNotes: 0,
            overlappingInterests: [],
          },
        },
        suggestedDuration: 60,
      };

      const timeslot: TimeSlot = {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 25 * 60 * 60 * 1000),
        timezone: 'America/Los_Angeles',
      };

      const suggestion = await generateGroupSuggestion(userId, contactGroup, timeslot);

      expect(suggestion).toBeNull();
    });

    it('should return null if any contact does not meet frequency threshold', async () => {
      // Create a contact with recent interaction
      const recentContact = await contactService.createContact(userId, {
        name: 'Recent',
        frequencyPreference: FrequencyOption.MONTHLY,
        lastContactDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      });

      const contactGroup: ContactGroup = {
        contacts: [testContacts[0], recentContact],
        sharedContext: {
          score: 60,
          factors: {
            commonGroups: [],
            sharedTags: [],
            coMentionedInVoiceNotes: 0,
            overlappingInterests: [],
          },
        },
        suggestedDuration: 60,
      };

      const timeslot: TimeSlot = {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 25 * 60 * 60 * 1000),
        timezone: 'America/Los_Angeles',
      };

      const suggestion = await generateGroupSuggestion(userId, contactGroup, timeslot);

      expect(suggestion).toBeNull();
    });
  });

  describe('balanceSuggestions', () => {
    it('should ensure contact uniqueness across suggestions', async () => {
      // Create individual suggestions
      const individual1: Suggestion = {
        id: '1',
        userId,
        contactId: testContacts[0].id,
        contacts: [testContacts[0]],
        type: 'individual',
        triggerType: 'timebound' as any,
        proposedTimeslot: {
          start: new Date(),
          end: new Date(),
          timezone: 'America/Los_Angeles',
        },
        reasoning: 'Test',
        status: 'pending' as any,
        priority: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const individual2: Suggestion = {
        ...individual1,
        id: '2',
        contactId: testContacts[1].id,
        contacts: [testContacts[1]],
        priority: 90,
      };

      // Create group suggestion with overlapping contacts (both testContacts[0] and testContacts[1])
      const group1: Suggestion = {
        ...individual1,
        id: '3',
        contactId: testContacts[0].id,
        contacts: [testContacts[0], testContacts[1]],
        type: 'group',
        priority: 95,
      };

      const balanced = balanceSuggestions([individual1, individual2], [group1]);

      // Should only include individual1 (highest priority = 100)
      // group1 (priority 95) is excluded because testContacts[0] is already in individual1
      // individual2 (priority 90) is excluded because testContacts[1] is already in group1
      // But wait - group1 is excluded first, so individual2 should be included
      // Actually: individual1 (100) is included first, then group1 (95) is excluded due to overlap,
      // then individual2 (90) is included
      expect(balanced).toHaveLength(2);
      expect(balanced[0].id).toBe('1'); // Highest priority
      expect(balanced[1].id).toBe('2'); // Second highest without overlap
    });

    it('should sort by priority', async () => {
      const low: Suggestion = {
        id: '1',
        userId,
        contactId: testContacts[0].id,
        contacts: [testContacts[0]],
        type: 'individual',
        triggerType: 'timebound' as any,
        proposedTimeslot: {
          start: new Date(),
          end: new Date(),
          timezone: 'America/Los_Angeles',
        },
        reasoning: 'Test',
        status: 'pending' as any,
        priority: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const high: Suggestion = {
        ...low,
        id: '2',
        contactId: testContacts[1].id,
        contacts: [testContacts[1]],
        priority: 100,
      };

      const balanced = balanceSuggestions([low], [high]);

      expect(balanced[0].id).toBe('2'); // High priority first
      expect(balanced[1].id).toBe('1');
    });

    it('should include both individual and group suggestions when no overlap', async () => {
      const individual: Suggestion = {
        id: '1',
        userId,
        contactId: testContacts[0].id,
        contacts: [testContacts[0]],
        type: 'individual',
        triggerType: 'timebound' as any,
        proposedTimeslot: {
          start: new Date(),
          end: new Date(),
          timezone: 'America/Los_Angeles',
        },
        reasoning: 'Test',
        status: 'pending' as any,
        priority: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const group: Suggestion = {
        ...individual,
        id: '2',
        contactId: testContacts[1].id,
        contacts: [testContacts[1], testContacts[2]],
        type: 'group',
        priority: 90,
      };

      const balanced = balanceSuggestions([individual], [group]);

      expect(balanced).toHaveLength(2);
      expect(balanced.some((s) => s.type === 'individual')).toBe(true);
      expect(balanced.some((s) => s.type === 'group')).toBe(true);
    });
  });
});
