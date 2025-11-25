/**
 * Duplicate Prevention Tests
 * 
 * Tests for group and tag duplicate prevention logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroupServiceImpl } from './group-service';
import { TagServiceImpl } from './tag-service';
import { GroupRepository } from './group-repository';
import { TagRepository } from './tag-repository';
import { Group, Tag } from '../types';

describe('Group Duplicate Prevention', () => {
  let groupService: GroupServiceImpl;
  let mockRepository: GroupRepository;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      archive: vi.fn(),
      assignContact: vi.fn(),
      removeContact: vi.fn(),
      bulkAssignContacts: vi.fn(),
      bulkRemoveContacts: vi.fn(),
      createDefaultGroups: vi.fn(),
      getGroupWithContactCount: vi.fn(),
      listGroupsWithContactCounts: vi.fn(),
      getGroupContacts: vi.fn(),
    };

    groupService = new GroupServiceImpl(mockRepository);
  });

  it('should prevent creating duplicate group names (case-insensitive)', async () => {
    const userId = 'user-123';
    const existingGroups: Group[] = [
      {
        id: 'group-1',
        userId,
        name: 'Close Friends',
        isDefault: true,
        isPromotedFromTag: false,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(mockRepository.findAll).mockResolvedValue(existingGroups);

    await expect(groupService.createGroup(userId, 'close friends')).rejects.toThrow(
      'A group with this name already exists'
    );
    await expect(groupService.createGroup(userId, 'CLOSE FRIENDS')).rejects.toThrow(
      'A group with this name already exists'
    );
  });

  it('should allow creating group with unique name', async () => {
    const userId = 'user-123';
    const existingGroups: Group[] = [
      {
        id: 'group-1',
        userId,
        name: 'Close Friends',
        isDefault: true,
        isPromotedFromTag: false,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const newGroup: Group = {
      id: 'group-2',
      userId,
      name: 'Work Friends',
      isDefault: false,
      isPromotedFromTag: false,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(mockRepository.findAll).mockResolvedValue(existingGroups);
    vi.mocked(mockRepository.create).mockResolvedValue(newGroup);

    const result = await groupService.createGroup(userId, 'Work Friends');
    expect(result).toEqual(newGroup);
  });

  it('should prevent updating group to duplicate name', async () => {
    const userId = 'user-123';
    const existingGroups: Group[] = [
      {
        id: 'group-1',
        userId,
        name: 'Close Friends',
        isDefault: true,
        isPromotedFromTag: false,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'group-2',
        userId,
        name: 'Work Friends',
        isDefault: false,
        isPromotedFromTag: false,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(mockRepository.findAll).mockResolvedValue(existingGroups);

    await expect(groupService.updateGroup('group-2', userId, 'Close Friends')).rejects.toThrow(
      'A group with this name already exists'
    );
  });

  it('should allow updating group to same name (case change)', async () => {
    const userId = 'user-123';
    const existingGroups: Group[] = [
      {
        id: 'group-1',
        userId,
        name: 'work friends',
        isDefault: false,
        isPromotedFromTag: false,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const updatedGroup: Group = {
      ...existingGroups[0],
      name: 'Work Friends',
    };

    vi.mocked(mockRepository.findAll).mockResolvedValue(existingGroups);
    vi.mocked(mockRepository.update).mockResolvedValue(updatedGroup);

    const result = await groupService.updateGroup('group-1', userId, 'Work Friends');
    expect(result.name).toBe('Work Friends');
  });

  it('should prevent promoting tag to group with duplicate name', async () => {
    const userId = 'user-123';
    const existingGroups: Group[] = [
      {
        id: 'group-1',
        userId,
        name: 'hiking',
        isDefault: false,
        isPromotedFromTag: true,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(mockRepository.findAll).mockResolvedValue(existingGroups);

    await expect(groupService.promoteTagToGroup(userId, 'Hiking')).rejects.toThrow(
      'A group with this name already exists'
    );
  });
});

describe('Tag Duplicate Prevention', () => {
  let tagService: TagServiceImpl;
  let mockRepository: TagRepository;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findByContactId: vi.fn(),
      findByText: vi.fn(),
      findSimilarTags: vi.fn(),
      delete: vi.fn(),
      deleteTag: vi.fn(),
      addToContact: vi.fn(),
      removeFromContact: vi.fn(),
      getTagWithContactCount: vi.fn(),
      listTagsWithContactCounts: vi.fn(),
      getTagContacts: vi.fn(),
      bulkAddToContacts: vi.fn(),
    };

    tagService = new TagServiceImpl(mockRepository);
  });

  it('should prevent adding duplicate tag to contact', async () => {
    const contactId = 'contact-123';
    const userId = 'user-123';
    const existingTags: Tag[] = [
      {
        id: 'tag-1',
        text: 'hiking',
        source: 'manual',
        createdAt: new Date(),
      },
    ];

    const hikingTag: Tag = {
      id: 'tag-1',
      text: 'hiking',
      source: 'manual',
      createdAt: new Date(),
    };

    vi.mocked(mockRepository.findByContactId).mockResolvedValue(existingTags);
    vi.mocked(mockRepository.findByText).mockResolvedValue(hikingTag);

    await expect(tagService.addTag(contactId, userId, 'hiking', 'manual')).rejects.toThrow(
      'Contact already has this tag'
    );
  });

  it('should use semantic matching to prevent near-duplicate tags', async () => {
    const contactId = 'contact-123';
    const userId = 'user-123';
    const existingContactTags: Tag[] = [];

    const hikingTag: Tag = {
      id: 'tag-1',
      text: 'hiking',
      source: 'manual',
      createdAt: new Date(),
    };

    // Simulate finding similar tag
    vi.mocked(mockRepository.findByContactId).mockResolvedValue(existingContactTags);
    vi.mocked(mockRepository.findByText).mockResolvedValue(null);
    vi.mocked(mockRepository.findSimilarTags).mockResolvedValue([hikingTag]);
    vi.mocked(mockRepository.addToContact).mockResolvedValue();

    // Should reuse existing similar tag instead of creating new one
    const result = await tagService.addTag(contactId, userId, 'hike', 'manual');
    expect(result.id).toBe('tag-1');
    expect(result.text).toBe('hiking');
  });

  it('should validate tag word count (1-3 words)', async () => {
    const contactId = 'contact-123';
    const userId = 'user-123';

    await expect(
      tagService.addTag(contactId, userId, 'this is way too many words', 'manual')
    ).rejects.toThrow('Tag must be 1-3 words');
  });

  it('should validate tag length (max 100 chars)', async () => {
    const contactId = 'contact-123';
    const userId = 'user-123';
    const longText = 'a'.repeat(101);

    await expect(tagService.addTag(contactId, userId, longText, 'manual')).rejects.toThrow(
      'Tag must be 100 characters or less'
    );
  });
});
