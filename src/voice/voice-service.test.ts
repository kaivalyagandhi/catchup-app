/**
 * Voice Service Tests
 *
 * Basic tests for voice processing functionality
 */

import { describe, it, expect } from 'vitest';
import {
  generateEnrichmentConfirmation,
  preferExistingTags,
} from './voice-service';
import { Contact, ExtractedEntities, Tag, TagSource } from '../types';

describe('Voice Service', () => {
  describe('generateEnrichmentConfirmation', () => {
    it('should generate enrichment proposal with field updates', () => {
      const entities: ExtractedEntities = {
        fields: {
          phone: '+1234567890',
          email: 'test@example.com',
        },
        tags: [],
        groups: [],
      };

      const contact: Contact = {
        id: 'contact-1',
        userId: 'user-1',
        name: 'John Doe',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const proposal = generateEnrichmentConfirmation(entities, contact, []);

      expect(proposal.contactId).toBe('contact-1');
      expect(proposal.requiresContactSelection).toBe(false);
      expect(proposal.items).toHaveLength(2);
      expect(proposal.items[0].type).toBe('field');
      expect(proposal.items[0].field).toBe('phone');
      expect(proposal.items[0].value).toBe('+1234567890');
      expect(proposal.items[0].accepted).toBe(true);
    });

    it('should generate enrichment proposal with tags', () => {
      const entities: ExtractedEntities = {
        fields: {},
        tags: ['hiking', 'photography', 'coffee'],
        groups: [],
      };

      const contact: Contact = {
        id: 'contact-1',
        userId: 'user-1',
        name: 'Jane Smith',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const proposal = generateEnrichmentConfirmation(entities, contact, []);

      expect(proposal.items).toHaveLength(3);
      expect(proposal.items.every((item) => item.type === 'tag')).toBe(true);
      expect(proposal.items.map((item) => item.value)).toEqual([
        'hiking',
        'photography',
        'coffee',
      ]);
    });

    it('should generate enrichment proposal with groups', () => {
      const entities: ExtractedEntities = {
        fields: {},
        tags: [],
        groups: ['College Friends', 'Running Club'],
      };

      const contact: Contact = {
        id: 'contact-1',
        userId: 'user-1',
        name: 'Bob Johnson',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const proposal = generateEnrichmentConfirmation(entities, contact, []);

      expect(proposal.items).toHaveLength(2);
      expect(proposal.items.every((item) => item.type === 'group')).toBe(true);
      expect(proposal.items.map((item) => item.value)).toEqual([
        'College Friends',
        'Running Club',
      ]);
    });

    it('should require contact selection when contact is null', () => {
      const entities: ExtractedEntities = {
        fields: { phone: '+1234567890' },
        tags: ['hiking'],
        groups: [],
      };

      const userContacts: Contact[] = [
        {
          id: 'contact-1',
          userId: 'user-1',
          name: 'John Doe',
          groups: [],
          tags: [],
          archived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const proposal = generateEnrichmentConfirmation(entities, null, userContacts);

      expect(proposal.contactId).toBeNull();
      expect(proposal.requiresContactSelection).toBe(true);
      expect(proposal.items.length).toBeGreaterThan(0);
    });

    it('should include last contact date in proposal', () => {
      const lastContactDate = new Date('2024-01-15');
      const entities: ExtractedEntities = {
        fields: {},
        tags: [],
        groups: [],
        lastContactDate,
      };

      const contact: Contact = {
        id: 'contact-1',
        userId: 'user-1',
        name: 'Alice Brown',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const proposal = generateEnrichmentConfirmation(entities, contact, []);

      expect(proposal.items).toHaveLength(1);
      expect(proposal.items[0].type).toBe('lastContactDate');
      expect(proposal.items[0].value).toEqual(lastContactDate);
    });
  });

  describe('preferExistingTags', () => {
    it('should prefer exact matching existing tags', async () => {
      const newTags = ['hiking', 'photography'];
      const existingTags: Tag[] = [
        {
          id: 'tag-1',
          text: 'hiking',
          source: TagSource.MANUAL,
          createdAt: new Date(),
        },
        {
          id: 'tag-2',
          text: 'cooking',
          source: TagSource.MANUAL,
          createdAt: new Date(),
        },
      ];

      const result = await preferExistingTags(newTags, existingTags);

      expect(result).toContain('hiking');
      expect(result).toContain('photography');
      expect(result).toHaveLength(2);
    });

    it('should be case-insensitive for exact matches', async () => {
      const newTags = ['HIKING', 'Photography'];
      const existingTags: Tag[] = [
        {
          id: 'tag-1',
          text: 'hiking',
          source: TagSource.MANUAL,
          createdAt: new Date(),
        },
        {
          id: 'tag-2',
          text: 'photography',
          source: TagSource.MANUAL,
          createdAt: new Date(),
        },
      ];

      const result = await preferExistingTags(newTags, existingTags);

      expect(result).toContain('hiking');
      expect(result).toContain('photography');
    });
  });
});
