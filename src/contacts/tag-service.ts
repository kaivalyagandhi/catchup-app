/**
 * Tag Service
 *
 * Business logic layer for tag operations including semantic similarity matching.
 */

import { TagRepository, PostgresTagRepository } from './tag-repository';
import { GroupService, groupService as defaultGroupService } from './group-service';
import { Tag, TagSource, Group } from '../types';

/**
 * Tag Service Interface
 */
export interface TagService {
  addTag(contactId: string, userId: string, text: string, source: TagSource): Promise<Tag>;
  removeTag(contactId: string, tagId: string, userId: string): Promise<void>;
  updateTag(tagId: string, text: string, userId: string): Promise<Tag>;
  getContactTags(contactId: string): Promise<Tag[]>;
  deduplicateTags(contactId: string, userId: string): Promise<void>;
  promoteTagToGroup(userId: string, tagText: string): Promise<Group>;
  findOrCreateTag(text: string, source: TagSource, userId: string, similarityThreshold?: number): Promise<Tag>;
}

/**
 * Tag Service Implementation
 */
export class TagServiceImpl implements TagService {
  private repository: TagRepository;
  private groupService: GroupService;
  private readonly DEFAULT_SIMILARITY_THRESHOLD = 0.85;

  constructor(repository?: TagRepository, groupService?: GroupService) {
    this.repository = repository || new PostgresTagRepository();
    this.groupService = groupService || defaultGroupService;
  }

  async addTag(contactId: string, userId: string, text: string, source: TagSource): Promise<Tag> {
    // Validate tag text
    if (!text || text.trim() === '') {
      throw new Error('Tag text is required');
    }

    const trimmedText = text.trim();

    // Validate tag length (1-3 words)
    const words = trimmedText.split(/\s+/);
    if (words.length > 3) {
      throw new Error('Tag must be 1-3 words');
    }

    if (trimmedText.length > 100) {
      throw new Error('Tag must be 100 characters or less');
    }

    // Find or create tag (with similarity matching to prevent duplicates)
    const tag = await this.findOrCreateTag(trimmedText, source, userId);

    // Check if contact already has this tag
    const existingTags = await this.repository.findByContactId(contactId);
    const alreadyHasTag = existingTags.some((t) => t.id === tag.id);

    if (alreadyHasTag) {
      throw new Error('Contact already has this tag');
    }

    // Add tag to contact
    await this.repository.addToContact(contactId, tag.id, userId);

    return tag;
  }

  async removeTag(contactId: string, tagId: string, userId: string): Promise<void> {
    await this.repository.removeFromContact(contactId, tagId, userId);
  }

  async updateTag(tagId: string, text: string, userId: string): Promise<Tag> {
    // Validate tag text
    if (!text || text.trim() === '') {
      throw new Error('Tag text is required');
    }

    const trimmedText = text.trim();

    // Validate tag length (1-3 words)
    const words = trimmedText.split(/\s+/);
    if (words.length > 3) {
      throw new Error('Tag must be 1-3 words');
    }

    if (trimmedText.length > 100) {
      throw new Error('Tag must be 100 characters or less');
    }

    return await this.repository.update(tagId, trimmedText, userId);
  }

  async getContactTags(contactId: string): Promise<Tag[]> {
    return await this.repository.findByContactId(contactId);
  }

  async deduplicateTags(contactId: string, userId: string): Promise<void> {
    // Get all tags for the contact
    const tags = await this.repository.findByContactId(contactId);

    if (tags.length <= 1) {
      return; // Nothing to deduplicate
    }

    // Group similar tags
    const tagGroups: Tag[][] = [];
    const processed = new Set<string>();

    for (const tag of tags) {
      if (processed.has(tag.id)) {
        continue;
      }

      const similarTags = await this.repository.findSimilarTags(
        tag.text,
        this.DEFAULT_SIMILARITY_THRESHOLD
      );

      // Filter to only tags associated with this contact
      const contactSimilarTags = similarTags.filter((t) => tags.some((ct) => ct.id === t.id));

      if (contactSimilarTags.length > 1) {
        tagGroups.push(contactSimilarTags);
        contactSimilarTags.forEach((t) => processed.add(t.id));
      } else {
        processed.add(tag.id);
      }
    }

    // For each group, keep the first tag and remove the rest
    for (const group of tagGroups) {
      const [, ...removeTags] = group;

      for (const removeTag of removeTags) {
        await this.repository.removeFromContact(contactId, removeTag.id, userId);
      }
    }
  }

  async promoteTagToGroup(userId: string, tagText: string): Promise<Group> {
    return await this.groupService.promoteTagToGroup(userId, tagText);
  }

  /**
   * Find existing similar tag or create new one
   * Prefers existing tags over creating new ones when similarity threshold is met
   */
  async findOrCreateTag(
    text: string,
    source: TagSource,
    userId: string,
    similarityThreshold?: number
  ): Promise<Tag> {
    const threshold = similarityThreshold ?? this.DEFAULT_SIMILARITY_THRESHOLD;

    // Check for exact match first (case-insensitive) for this user
    const exactMatch = await this.repository.findByText(text, userId);
    if (exactMatch) {
      return exactMatch;
    }

    // Check for similar tags for this user
    const similarTags = await this.repository.findSimilarTags(text, userId, threshold);

    if (similarTags.length > 0) {
      // Return the most similar tag (first one found above threshold)
      return similarTags[0];
    }

    // No similar tag found, create new one for this user
    return await this.repository.create(text, source, userId);
  }
}

// Export singleton instance
export const tagService = new TagServiceImpl();
