/**
 * Edit Service
 *
 * Core service for managing pending edits and edit history.
 * Handles edit lifecycle: creation, update, submission, and dismissal.
 *
 * Requirements: 7.5, 7.6, 7.7, 8.1, 8.4
 */

import {
  PendingEdit,
  EditHistoryEntry,
  EditType,
  EditSource,
  DisambiguationCandidate,
  EditHistoryOptions,
  Contact,
  TagSource,
} from '../types';
import { EditRepository, CreatePendingEditData, UpdatePendingEditData } from './edit-repository';
import { EditHistoryRepository, CreateEditHistoryData } from './edit-history-repository';
import { PostgresContactRepository } from '../contacts/repository';
import { PostgresGroupRepository } from '../contacts/group-repository';
import { PostgresTagRepository } from '../contacts/tag-repository';

/**
 * Parameters for creating a pending edit
 */
export interface CreateEditParams {
  userId: string;
  sessionId: string;
  editType: EditType;
  targetContactId?: string;
  targetContactName?: string;
  targetGroupId?: string;
  targetGroupName?: string;
  field?: string;
  proposedValue: any;
  confidenceScore: number;
  source: EditSource;
}

/**
 * Parameters for updating a pending edit
 */
export interface EditUpdates {
  targetContactId?: string;
  targetContactName?: string;
  targetGroupId?: string;
  targetGroupName?: string;
  proposedValue?: any;
}

/**
 * Edit Service Interface
 */
export interface EditServiceInterface {
  createPendingEdit(params: CreateEditParams): Promise<PendingEdit>;
  updatePendingEdit(editId: string, userId: string, updates: EditUpdates): Promise<PendingEdit>;
  submitEdit(editId: string, userId: string): Promise<EditHistoryEntry>;
  dismissEdit(editId: string, userId: string): Promise<void>;
  dismissSessionEdits(sessionId: string, userId: string): Promise<void>;
  getPendingEdits(userId: string): Promise<PendingEdit[]>;
  getPendingEdit(editId: string, userId: string): Promise<PendingEdit | null>;
  getEditHistory(userId: string, options?: EditHistoryOptions): Promise<EditHistoryEntry[]>;
  resolveDisambiguation(editId: string, userId: string, contactId: string): Promise<PendingEdit>;
}

const DISAMBIGUATION_THRESHOLD = 0.7;

/**
 * Edit Service Implementation
 */
export class EditService implements EditServiceInterface {
  private editRepository: EditRepository;
  private historyRepository: EditHistoryRepository;
  private contactRepository: PostgresContactRepository;
  private groupRepository: PostgresGroupRepository;
  private tagRepository: PostgresTagRepository;

  constructor(
    editRepository?: EditRepository,
    historyRepository?: EditHistoryRepository,
    contactRepository?: PostgresContactRepository,
    groupRepository?: PostgresGroupRepository,
    tagRepository?: PostgresTagRepository
  ) {
    this.editRepository = editRepository || new EditRepository();
    this.historyRepository = historyRepository || new EditHistoryRepository();
    this.contactRepository = contactRepository || new PostgresContactRepository();
    this.groupRepository = groupRepository || new PostgresGroupRepository();
    this.tagRepository = tagRepository || new PostgresTagRepository();
  }

  /**
   * Create a pending edit from extraction
   * Requirements: 8.1, 8.2
   */
  async createPendingEdit(params: CreateEditParams): Promise<PendingEdit> {
    const data: CreatePendingEditData = {
      userId: params.userId,
      sessionId: params.sessionId,
      editType: params.editType,
      targetContactId: params.targetContactId,
      targetContactName: params.targetContactName,
      targetGroupId: params.targetGroupId,
      targetGroupName: params.targetGroupName,
      field: params.field,
      proposedValue: params.proposedValue,
      confidenceScore: params.confidenceScore,
      source: params.source,
      status: 'pending',
    };

    // Check if disambiguation is needed
    if (params.confidenceScore < DISAMBIGUATION_THRESHOLD && !params.targetContactId) {
      data.status = 'needs_disambiguation';
      // Disambiguation candidates would be populated by the caller or fuzzy matcher
    }

    return this.editRepository.create(data);
  }

  /**
   * Update a pending edit
   * Requirements: 7.5
   */
  async updatePendingEdit(editId: string, userId: string, updates: EditUpdates): Promise<PendingEdit> {
    const updateData: UpdatePendingEditData = {};

    if (updates.targetContactId !== undefined) {
      updateData.targetContactId = updates.targetContactId;
    }
    if (updates.targetContactName !== undefined) {
      updateData.targetContactName = updates.targetContactName;
    }
    if (updates.targetGroupId !== undefined) {
      updateData.targetGroupId = updates.targetGroupId;
    }
    if (updates.targetGroupName !== undefined) {
      updateData.targetGroupName = updates.targetGroupName;
    }
    if (updates.proposedValue !== undefined) {
      updateData.proposedValue = updates.proposedValue;
    }

    return this.editRepository.update(editId, userId, updateData);
  }

  /**
   * Submit edit (apply and move to history)
   * Requirements: 7.6, 10.1
   */
  async submitEdit(editId: string, userId: string): Promise<EditHistoryEntry> {
    const edit = await this.editRepository.findById(editId, userId);
    if (!edit) {
      throw new Error('Pending edit not found');
    }

    // Apply the edit and capture previous value
    const previousValue = await this.applyEdit(edit);

    // Create history entry
    const historyData: CreateEditHistoryData = {
      userId: edit.userId,
      originalEditId: edit.id,
      editType: edit.editType,
      targetContactId: edit.targetContactId,
      targetContactName: edit.targetContactName,
      targetGroupId: edit.targetGroupId,
      targetGroupName: edit.targetGroupName,
      field: edit.field,
      appliedValue: edit.proposedValue,
      previousValue,
      source: edit.source,
    };

    const historyEntry = await this.historyRepository.create(historyData);

    // Delete the pending edit
    await this.editRepository.delete(editId, userId);

    return historyEntry;
  }

  /**
   * Dismiss edit (remove without applying)
   * Requirements: 7.7
   */
  async dismissEdit(editId: string, userId: string): Promise<void> {
    await this.editRepository.delete(editId, userId);
  }

  /**
   * Dismiss all edits for a session
   */
  async dismissSessionEdits(sessionId: string, userId: string): Promise<void> {
    await this.editRepository.deleteBySessionId(sessionId, userId);
  }

  /**
   * Get all pending edits for a user
   */
  async getPendingEdits(userId: string): Promise<PendingEdit[]> {
    return this.editRepository.findByUserId(userId);
  }

  /**
   * Get a single pending edit
   */
  async getPendingEdit(editId: string, userId: string): Promise<PendingEdit | null> {
    return this.editRepository.findById(editId, userId);
  }

  /**
   * Get edit history for a user
   */
  async getEditHistory(userId: string, options?: EditHistoryOptions): Promise<EditHistoryEntry[]> {
    return this.historyRepository.findByUserId(userId, options);
  }

  /**
   * Resolve disambiguation by selecting a contact
   * Requirements: 8.4
   */
  async resolveDisambiguation(editId: string, userId: string, contactId: string): Promise<PendingEdit> {
    const edit = await this.editRepository.findById(editId, userId);
    if (!edit) {
      throw new Error('Pending edit not found');
    }

    // Get contact name
    const contact = await this.contactRepository.findById(contactId, userId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    return this.editRepository.update(editId, userId, {
      targetContactId: contactId,
      targetContactName: contact.name,
      status: 'pending',
      disambiguationCandidates: undefined,
    });
  }

  /**
   * Apply an edit to the target contact/group
   * Returns the previous value for history tracking
   */
  private async applyEdit(edit: PendingEdit): Promise<any> {
    let previousValue: any = undefined;

    switch (edit.editType) {
      case 'create_contact':
        await this.contactRepository.create(edit.userId, {
          name: edit.proposedValue.name || edit.targetContactName || 'New Contact',
          ...edit.proposedValue,
        });
        break;

      case 'update_contact_field':
        if (edit.targetContactId && edit.field) {
          const contact = await this.contactRepository.findById(edit.targetContactId, edit.userId);
          if (contact) {
            previousValue = (contact as any)[edit.field];
            await this.contactRepository.update(edit.targetContactId, edit.userId, {
              [edit.field]: edit.proposedValue,
            });
          }
        }
        break;

      case 'add_tag':
        if (edit.targetContactId) {
          const tagText = typeof edit.proposedValue === 'string' 
            ? edit.proposedValue 
            : edit.proposedValue.text;
          // Create or find the tag, then add to contact
          const tag = await this.tagRepository.create(tagText, TagSource.VOICE_MEMO, edit.userId);
          await this.tagRepository.addToContact(edit.targetContactId, tag.id, edit.userId);
        }
        break;

      case 'remove_tag':
        if (edit.targetContactId) {
          const tagText = typeof edit.proposedValue === 'string'
            ? edit.proposedValue
            : edit.proposedValue.text;
          // Find and remove the tag
          const contact = await this.contactRepository.findById(edit.targetContactId, edit.userId);
          if (contact) {
            const existingTag = contact.tags.find(t => t.text === tagText);
            if (existingTag) {
              previousValue = existingTag;
              await this.tagRepository.removeFromContact(edit.targetContactId, existingTag.id, edit.userId);
            }
          }
        }
        break;

      case 'add_to_group':
        if (edit.targetContactId && edit.targetGroupId) {
          await this.groupRepository.assignContact(
            edit.targetContactId,
            edit.targetGroupId,
            edit.userId
          );
        }
        break;

      case 'remove_from_group':
        if (edit.targetContactId && edit.targetGroupId) {
          previousValue = { groupId: edit.targetGroupId };
          await this.groupRepository.removeContact(
            edit.targetContactId,
            edit.targetGroupId,
            edit.userId
          );
        }
        break;

      case 'create_group':
        const groupName = edit.proposedValue?.name || edit.targetGroupName || 'New Group';
        await this.groupRepository.create(edit.userId, groupName);
        break;
    }

    return previousValue;
  }
}
