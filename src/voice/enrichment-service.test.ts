/**
 * Enrichment Service Tests
 *
 * Unit tests for the EnrichmentService class.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnrichmentService } from './enrichment-service';
import { Contact, ExtractedEntities, TagSource } from '../types';

describe('EnrichmentService', () => {
  let service: EnrichmentService;
  let mockTagService: any;
  let mockGroupService: any;
  let mockContactService: any;

  beforeEach(() => {
    // Create mock services
    mockTagService = {
      addTag: vi.fn(),
    };

    mockGroupService = {
      listGroups: vi.fn().mockResolvedValue([]),
      createGroup: vi.fn().mockResolvedValue({ id: 'group-1', name: 'Test Group' }),
      assignContactToGroup: vi.fn(),
    };

    mockContactService = {
      updateContact: vi.fn(),
    };

    service = new EnrichmentService(mockTagService, mockGroupService, mockContactService);
  });

  describe('generateProposal', () => {
    it('should generate enrichment proposals for multiple contacts', async () => {
      const contact1: Contact = {
        id: 'contact-1',
        userId: 'user-1',
        name: 'John Doe',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const contact2: Contact = {
        id: 'contact-2',
        userId: 'user-1',
        name: 'Jane Smith',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const entities = new Map<string, ExtractedEntities>([
        [
          'contact-1',
          {
            fields: { location: 'Seattle' },
            tags: ['hiking', 'photography'],
            groups: ['Outdoor Friends'],
            lastContactDate: new Date('2024-01-15'),
          },
        ],
        [
          'contact-2',
          {
            fields: { email: 'jane@example.com' },
            tags: ['hiking'],
            groups: [],
            lastContactDate: undefined,
          },
        ],
      ]);

      const proposal = await service.generateProposal('voice-note-1', entities, [
        contact1,
        contact2,
      ]);

      expect(proposal.voiceNoteId).toBe('voice-note-1');
      expect(proposal.contactProposals).toHaveLength(2);
      expect(proposal.requiresContactSelection).toBe(false);

      // Check contact 1 proposal
      const contact1Proposal = proposal.contactProposals[0];
      expect(contact1Proposal.contactId).toBe('contact-1');
      expect(contact1Proposal.contactName).toBe('John Doe');
      expect(contact1Proposal.items).toHaveLength(5); // 2 tags + 1 group + 1 field + 1 date

      // Check contact 2 proposal
      const contact2Proposal = proposal.contactProposals[1];
      expect(contact2Proposal.contactId).toBe('contact-2');
      expect(contact2Proposal.contactName).toBe('Jane Smith');
      expect(contact2Proposal.items).toHaveLength(2); // 1 tag + 1 field
    });

    it('should not duplicate existing tags', async () => {
      const contact: Contact = {
        id: 'contact-1',
        userId: 'user-1',
        name: 'John Doe',
        groups: [],
        tags: [{ id: 'tag-1', text: 'hiking', source: TagSource.MANUAL, createdAt: new Date() }],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const entities = new Map<string, ExtractedEntities>([
        [
          'contact-1',
          {
            fields: {},
            tags: ['hiking', 'photography'], // hiking already exists
            groups: [],
            lastContactDate: undefined,
          },
        ],
      ]);

      const proposal = await service.generateProposal('voice-note-1', entities, [contact]);

      const items = proposal.contactProposals[0].items;
      const tagItems = items.filter((item) => item.type === 'tag');
      expect(tagItems).toHaveLength(1); // Only photography should be added
      expect(tagItems[0].value).toBe('photography');
    });

    it('should not duplicate existing groups', async () => {
      const contact: Contact = {
        id: 'contact-1',
        userId: 'user-1',
        name: 'John Doe',
        groups: ['Outdoor Friends'],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const entities = new Map<string, ExtractedEntities>([
        [
          'contact-1',
          {
            fields: {},
            tags: [],
            groups: ['Outdoor Friends', 'Work Friends'], // Outdoor Friends already exists
            lastContactDate: undefined,
          },
        ],
      ]);

      const proposal = await service.generateProposal('voice-note-1', entities, [contact]);

      const items = proposal.contactProposals[0].items;
      const groupItems = items.filter((item) => item.type === 'group');
      expect(groupItems).toHaveLength(1); // Only Work Friends should be added
      expect(groupItems[0].value).toBe('Work Friends');
    });

    it('should handle empty entities', async () => {
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

      const entities = new Map<string, ExtractedEntities>([
        [
          'contact-1',
          {
            fields: {},
            tags: [],
            groups: [],
            lastContactDate: undefined,
          },
        ],
      ]);

      const proposal = await service.generateProposal('voice-note-1', entities, [contact]);

      expect(proposal.contactProposals[0].items).toHaveLength(0);
    });
  });

  describe('applyTags', () => {
    it('should apply multiple tags to a contact', async () => {
      await service.applyTags('contact-1', 'user-1', ['hiking', 'photography']);

      expect(mockTagService.addTag).toHaveBeenCalledTimes(2);
      expect(mockTagService.addTag).toHaveBeenCalledWith(
        'contact-1',
        'user-1',
        'hiking',
        TagSource.VOICE_MEMO
      );
      expect(mockTagService.addTag).toHaveBeenCalledWith(
        'contact-1',
        'user-1',
        'photography',
        TagSource.VOICE_MEMO
      );
    });

    it('should skip tags that already exist', async () => {
      mockTagService.addTag.mockRejectedValueOnce(
        new Error('Contact already has this tag')
      );

      await service.applyTags('contact-1', 'user-1', ['hiking', 'photography']);

      expect(mockTagService.addTag).toHaveBeenCalledTimes(2);
      // Should not throw error
    });
  });

  describe('applyGroups', () => {
    it('should create group if it does not exist', async () => {
      mockGroupService.listGroups.mockResolvedValue([]);

      await service.applyGroups('contact-1', 'user-1', ['Outdoor Friends']);

      expect(mockGroupService.createGroup).toHaveBeenCalledWith('user-1', 'Outdoor Friends');
      expect(mockGroupService.assignContactToGroup).toHaveBeenCalledWith(
        'contact-1',
        'group-1',
        'user-1'
      );
    });

    it('should use existing group if it exists', async () => {
      mockGroupService.listGroups.mockResolvedValue([
        { id: 'existing-group', name: 'Outdoor Friends' },
      ]);

      await service.applyGroups('contact-1', 'user-1', ['Outdoor Friends']);

      expect(mockGroupService.createGroup).not.toHaveBeenCalled();
      expect(mockGroupService.assignContactToGroup).toHaveBeenCalledWith(
        'contact-1',
        'existing-group',
        'user-1'
      );
    });

    it('should handle case-insensitive group matching', async () => {
      mockGroupService.listGroups.mockResolvedValue([
        { id: 'existing-group', name: 'outdoor friends' },
      ]);

      await service.applyGroups('contact-1', 'user-1', ['Outdoor Friends']);

      expect(mockGroupService.createGroup).not.toHaveBeenCalled();
      expect(mockGroupService.assignContactToGroup).toHaveBeenCalledWith(
        'contact-1',
        'existing-group',
        'user-1'
      );
    });
  });

  describe('applyFieldUpdates', () => {
    it('should update contact fields', async () => {
      const fields = {
        location: 'Seattle',
        customNotes: 'Met at conference',
      };

      await service.applyFieldUpdates('contact-1', 'user-1', fields);

      expect(mockContactService.updateContact).toHaveBeenCalledWith(
        'contact-1',
        'user-1',
        fields
      );
    });

    it('should validate email field', async () => {
      const fields = {
        email: 'invalid-email',
      };

      await expect(
        service.applyFieldUpdates('contact-1', 'user-1', fields)
      ).rejects.toThrow('Validation failed for email');
    });

    it('should validate phone field', async () => {
      const fields = {
        phone: 'abc',
      };

      await expect(
        service.applyFieldUpdates('contact-1', 'user-1', fields)
      ).rejects.toThrow('Validation failed for phone');
    });
  });
});
