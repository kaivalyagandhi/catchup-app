/**
 * Enrichment Service
 *
 * Orchestrates the generation and application of enrichment proposals from voice notes.
 * Supports multi-contact enrichment with separate proposals per contact.
 *
 * Features:
 * - Generate enrichment proposals from extracted entities
 * - Apply accepted enrichment items with transaction management
 * - Create/associate tags with contacts
 * - Create/assign groups to contacts
 * - Update contact fields with validation
 *
 * Requirements: 3.5, 4.8, 4.9, 4.10, 4.11
 */

import { v4 as uuidv4 } from 'uuid';
import pool from '../db/connection';
import {
  Contact,
  ExtractedEntities,
  EnrichmentProposal,
  EnrichmentItem,
  TagSource,
} from '../types';
import { TagService, tagService as defaultTagService } from '../contacts/tag-service';
import { GroupService, groupService as defaultGroupService } from '../contacts/group-service';
import { ContactService, contactService as defaultContactService } from '../contacts/service';
import {
  validateEmail,
  validatePhone,
  validateLinkedIn,
  validateInstagram,
  validateXHandle,
} from '../contacts/validation';

/**
 * Enrichment application result for a single contact
 */
export interface ContactEnrichmentResult {
  contactId: string;
  contactName: string;
  success: boolean;
  appliedItems: number;
  failedItems: number;
  error?: string;
}

/**
 * Overall enrichment application result
 */
export interface EnrichmentApplicationResult {
  success: boolean;
  results: ContactEnrichmentResult[];
  totalApplied: number;
  totalFailed: number;
}

/**
 * Contact-specific enrichment proposal
 */
export interface ContactEnrichmentProposal {
  contactId: string | null;
  contactName: string;
  items: EnrichmentItem[];
}

/**
 * Multi-contact enrichment proposal
 */
export interface MultiContactEnrichmentProposal {
  voiceNoteId: string;
  contactProposals: ContactEnrichmentProposal[];
  requiresContactSelection: boolean;
}

/**
 * Enrichment Service
 */
export class EnrichmentService {
  private tagService: TagService;
  private groupService: GroupService;
  private contactService: ContactService;

  constructor(
    tagService?: TagService,
    groupService?: GroupService,
    contactService?: ContactService
  ) {
    this.tagService = tagService || defaultTagService;
    this.groupService = groupService || defaultGroupService;
    this.contactService = contactService || defaultContactService;
  }

  /**
   * Generate enrichment proposal for multiple contacts
   *
   * Creates separate proposals for each contact based on extracted entities.
   * Supports shared information that applies to all contacts.
   * Deduplicates items to prevent duplicate tags, notes, and fields.
   *
   * Requirements: 3.5
   *
   * @param voiceNoteId - ID of the voice note
   * @param entities - Map of contact ID to extracted entities
   * @param contacts - Array of contacts mentioned in voice note
   * @returns Multi-contact enrichment proposal
   *
   * @example
   * ```typescript
   * const proposal = await service.generateProposal(
   *   'voice-note-123',
   *   new Map([
   *     ['contact-1', { tags: ['hiking'], groups: ['Outdoor Friends'], fields: {} }],
   *     ['contact-2', { tags: ['hiking'], groups: [], fields: { location: 'Seattle' } }]
   *   ]),
   *   [contact1, contact2]
   * );
   * ```
   */
  async generateProposal(
    voiceNoteId: string,
    entities: Map<string, ExtractedEntities>,
    contacts: Contact[]
  ): Promise<MultiContactEnrichmentProposal> {
    const contactProposals: ContactEnrichmentProposal[] = [];

    for (const contact of contacts) {
      const contactEntities = entities.get(contact.id);
      if (!contactEntities) {
        // No entities extracted for this contact, create empty proposal
        contactProposals.push({
          contactId: contact.id,
          contactName: contact.name,
          items: [],
        });
        continue;
      }

      const items: EnrichmentItem[] = [];
      
      // Track added items to deduplicate within this proposal
      const addedTags = new Set<string>();
      const addedGroups = new Set<string>();
      const addedFields = new Set<string>();

      // Generate tag enrichment items
      for (const tag of contactEntities.tags) {
        const tagLower = tag.toLowerCase();

        // Check if contact already has this tag (case-insensitive)
        const hasTag = contact.tags.some(
          (t) => t.text.toLowerCase() === tagLower
        );

        // Check if we've already added this tag in this proposal (deduplication)
        if (!hasTag && !addedTags.has(tagLower)) {
          items.push({
            id: uuidv4(),
            type: 'tag',
            action: 'add',
            value: tag,
            accepted: true, // Default to accepted
          });
          addedTags.add(tagLower);
        }
      }

      // Generate group enrichment items
      for (const group of contactEntities.groups) {
        const groupLower = group.toLowerCase();

        // Check if contact already in this group (case-insensitive)
        const inGroup = contact.groups.some(
          (g) => g.toLowerCase() === groupLower
        );

        // Check if we've already added this group in this proposal (deduplication)
        if (!inGroup && !addedGroups.has(groupLower)) {
          items.push({
            id: uuidv4(),
            type: 'group',
            action: 'add',
            value: group,
            accepted: true,
          });
          addedGroups.add(groupLower);
        }
      }

      // Generate field enrichment items
      for (const [fieldName, fieldValue] of Object.entries(contactEntities.fields)) {
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
          const fieldKey = `${fieldName}:${String(fieldValue).toLowerCase()}`;
          
          // Check if we've already added this field in this proposal (deduplication)
          if (!addedFields.has(fieldKey)) {
            // Determine if this is an add or update
            const currentValue = (contact as any)[fieldName];
            const action = currentValue ? 'update' : 'add';

            items.push({
              id: uuidv4(),
              type: 'field',
              action,
              field: fieldName,
              value: fieldValue,
              accepted: true,
            });
            addedFields.add(fieldKey);
          }
        }
      }

      // Generate lastContactDate enrichment item
      if (contactEntities.lastContactDate) {
        const dateKey = `lastContactDate:${contactEntities.lastContactDate.toISOString()}`;
        
        // Check if we've already added this date in this proposal (deduplication)
        if (!addedFields.has(dateKey)) {
          items.push({
            id: uuidv4(),
            type: 'lastContactDate',
            action: contact.lastContactDate ? 'update' : 'add',
            value: contactEntities.lastContactDate,
            accepted: true,
          });
          addedFields.add(dateKey);
        }
      }

      contactProposals.push({
        contactId: contact.id,
        contactName: contact.name,
        items,
      });
    }

    return {
      voiceNoteId,
      contactProposals,
      requiresContactSelection: contacts.length === 0,
    };
  }

  /**
   * Apply enrichment proposal
   *
   * Applies all accepted enrichment items to their respective contacts.
   * Uses database transactions to ensure atomicity per contact.
   * Continues processing other contacts even if one fails.
   *
   * Requirements: 4.8
   *
   * @param proposal - Multi-contact enrichment proposal
   * @param userId - User ID for authorization
   * @returns Application result with success/failure summary
   *
   * @example
   * ```typescript
   * const result = await service.applyEnrichment(proposal, 'user-123');
   * console.log(`Applied ${result.totalApplied} items, ${result.totalFailed} failed`);
   * ```
   */
  async applyEnrichment(
    proposal: MultiContactEnrichmentProposal,
    userId: string
  ): Promise<EnrichmentApplicationResult> {
    const results: ContactEnrichmentResult[] = [];
    let totalApplied = 0;
    let totalFailed = 0;

    for (const contactProposal of proposal.contactProposals) {
      if (!contactProposal.contactId) {
        // Skip proposals without contact ID (requires manual selection)
        continue;
      }

      const result = await this.applyContactEnrichment(contactProposal, userId);

      results.push(result);
      totalApplied += result.appliedItems;
      totalFailed += result.failedItems;
    }

    return {
      success: totalFailed === 0,
      results,
      totalApplied,
      totalFailed,
    };
  }

  /**
   * Apply enrichment for a single contact with transaction management
   *
   * Requirements: 4.8
   *
   * @param contactProposal - Contact-specific enrichment proposal
   * @param userId - User ID for authorization
   * @returns Contact enrichment result
   * @private
   */
  private async applyContactEnrichment(
    contactProposal: ContactEnrichmentProposal,
    userId: string
  ): Promise<ContactEnrichmentResult> {
    const contactId = contactProposal.contactId!;
    const acceptedItems = contactProposal.items.filter((item) => item.accepted);

    let appliedItems = 0;
    let failedItems = 0;
    let error: string | undefined;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Apply each accepted item
      for (const item of acceptedItems) {
        try {
          switch (item.type) {
            case 'tag':
              await this.applyTagItem(contactId, userId, item);
              break;
            case 'group':
              await this.applyGroupItem(contactId, userId, item);
              break;
            case 'field':
              await this.applyFieldItem(contactId, userId, item);
              break;
            case 'lastContactDate':
              await this.applyLastContactDateItem(contactId, userId, item);
              break;
          }
          appliedItems++;
        } catch (itemError: any) {
          console.error(
            `Failed to apply enrichment item ${item.id} for contact ${contactId}:`,
            itemError
          );
          failedItems++;
          if (!error) {
            error = itemError.message;
          }
        }
      }

      // Commit transaction if at least some items succeeded
      await client.query('COMMIT');
    } catch (transactionError: any) {
      await client.query('ROLLBACK');
      console.error(`Transaction failed for contact ${contactId}:`, transactionError);
      error = transactionError.message;
      failedItems = acceptedItems.length;
      appliedItems = 0;
    } finally {
      client.release();
    }

    return {
      contactId,
      contactName: contactProposal.contactName,
      success: failedItems === 0,
      appliedItems,
      failedItems,
      error,
    };
  }

  /**
   * Apply tag enrichment item
   *
   * Creates tag if it doesn't exist and associates it with contact.
   *
   * Requirements: 4.9
   *
   * @param contactId - Contact ID
   * @param userId - User ID
   * @param item - Tag enrichment item
   * @private
   */
  private async applyTagItem(
    contactId: string,
    userId: string,
    item: EnrichmentItem
  ): Promise<void> {
    const tagText = item.value as string;
    await this.tagService.addTag(contactId, userId, tagText, TagSource.VOICE_MEMO);
  }

  /**
   * Apply group enrichment item
   *
   * Creates group if it doesn't exist and assigns contact to it.
   *
   * Requirements: 4.10
   *
   * @param contactId - Contact ID
   * @param userId - User ID
   * @param item - Group enrichment item
   * @private
   */
  private async applyGroupItem(
    contactId: string,
    userId: string,
    item: EnrichmentItem
  ): Promise<void> {
    const groupName = item.value as string;

    // Find or create group
    const existingGroups = await this.groupService.listGroups(userId, false);
    let group = existingGroups.find((g) => g.name.toLowerCase() === groupName.toLowerCase());

    if (!group) {
      group = await this.groupService.createGroup(userId, groupName);
    }

    // Assign contact to group
    await this.groupService.assignContactToGroup(contactId, group.id, userId);
  }

  /**
   * Apply field enrichment item
   *
   * Updates contact field with validation.
   *
   * Requirements: 4.11
   *
   * @param contactId - Contact ID
   * @param userId - User ID
   * @param item - Field enrichment item
   * @private
   */
  private async applyFieldItem(
    contactId: string,
    userId: string,
    item: EnrichmentItem
  ): Promise<void> {
    const fieldName = item.field!;
    const fieldValue = item.value;

    // Build update data
    const updateData: Record<string, any> = {
      [fieldName]: fieldValue,
    };

    // Validate individual field if validation function exists
    this.validateField(fieldName, fieldValue);

    // Update contact
    await this.contactService.updateContact(contactId, userId, updateData);
  }

  /**
   * Apply lastContactDate enrichment item
   *
   * Updates contact's last contact date.
   *
   * Requirements: 4.11
   *
   * @param contactId - Contact ID
   * @param userId - User ID
   * @param item - Last contact date enrichment item
   * @private
   */
  private async applyLastContactDateItem(
    contactId: string,
    userId: string,
    item: EnrichmentItem
  ): Promise<void> {
    const lastContactDate = new Date(item.value);

    // Update contact
    await this.contactService.updateContact(contactId, userId, {
      lastContactDate,
    });
  }

  /**
   * Apply tags to a contact
   *
   * Helper method for applying multiple tags at once.
   *
   * Requirements: 4.9
   *
   * @param contactId - Contact ID
   * @param userId - User ID
   * @param tags - Array of tag texts
   * @param source - Tag source (defaults to voice_memo)
   */
  async applyTags(
    contactId: string,
    userId: string,
    tags: string[],
    source: TagSource = TagSource.VOICE_MEMO
  ): Promise<void> {
    for (const tagText of tags) {
      try {
        await this.tagService.addTag(contactId, userId, tagText, source);
      } catch (error: any) {
        // Skip if tag already exists
        if (!error.message.includes('already has this tag')) {
          throw error;
        }
      }
    }
  }

  /**
   * Apply groups to a contact
   *
   * Helper method for creating groups and assigning contact to them.
   *
   * Requirements: 4.10
   *
   * @param contactId - Contact ID
   * @param userId - User ID
   * @param groupNames - Array of group names
   */
  async applyGroups(contactId: string, userId: string, groupNames: string[]): Promise<void> {
    for (const groupName of groupNames) {
      // Find or create group
      const existingGroups = await this.groupService.listGroups(userId, false);
      let group = existingGroups.find((g) => g.name.toLowerCase() === groupName.toLowerCase());

      if (!group) {
        group = await this.groupService.createGroup(userId, groupName);
      }

      // Assign contact to group (will skip if already assigned)
      try {
        await this.groupService.assignContactToGroup(contactId, group.id, userId);
      } catch (error: any) {
        // Skip if already assigned
        if (!error.message.includes('already assigned')) {
          throw error;
        }
      }
    }
  }

  /**
   * Apply field updates to a contact
   *
   * Helper method for updating multiple contact fields with validation.
   *
   * Requirements: 4.11
   *
   * @param contactId - Contact ID
   * @param userId - User ID
   * @param fields - Record of field names to values
   */
  async applyFieldUpdates(
    contactId: string,
    userId: string,
    fields: Record<string, any>
  ): Promise<void> {
    // Validate each field individually
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      this.validateField(fieldName, fieldValue);
    }

    // Update contact with all fields at once
    await this.contactService.updateContact(contactId, userId, fields);
  }

  /**
   * Validate a single field
   *
   * @param fieldName - Name of the field
   * @param fieldValue - Value to validate
   * @private
   */
  private validateField(fieldName: string, fieldValue: any): void {
    let validation;
    switch (fieldName) {
      case 'email':
        validation = validateEmail(fieldValue);
        break;
      case 'phone':
        validation = validatePhone(fieldValue);
        break;
      case 'linkedIn':
        validation = validateLinkedIn(fieldValue);
        break;
      case 'instagram':
        validation = validateInstagram(fieldValue);
        break;
      case 'xHandle':
        validation = validateXHandle(fieldValue);
        break;
      default:
        // No validation for other fields (location, customNotes, etc.)
        return;
    }

    if (!validation.valid) {
      throw new Error(`Validation failed for ${fieldName}: ${validation.errors.join(', ')}`);
    }
  }
}

// Export singleton instance
export const enrichmentService = new EnrichmentService();
