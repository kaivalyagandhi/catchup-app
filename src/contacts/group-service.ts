/**
 * Group Service
 *
 * Business logic layer for group operations.
 */

import { GroupRepository, PostgresGroupRepository } from './group-repository';
import { Group } from '../types';

/**
 * Group Service Interface
 */
export interface GroupService {
  createGroup(userId: string, name: string): Promise<Group>;
  updateGroup(id: string, userId: string, name: string): Promise<Group>;
  archiveGroup(id: string, userId: string): Promise<void>;
  getGroup(id: string, userId: string): Promise<Group>;
  listGroups(userId: string, includeArchived?: boolean): Promise<Group[]>;
  assignContactToGroup(contactId: string, groupId: string, userId: string): Promise<void>;
  removeContactFromGroup(contactId: string, groupId: string, userId: string): Promise<void>;
  bulkAssignContactsToGroup(contactIds: string[], groupId: string, userId: string): Promise<void>;
  bulkRemoveContactsFromGroup(contactIds: string[], groupId: string, userId: string): Promise<void>;
  createDefaultGroups(userId: string): Promise<Group[]>;
  promoteTagToGroup(userId: string, tagText: string): Promise<Group>;
}

/**
 * Group Service Implementation
 */
export class GroupServiceImpl implements GroupService {
  private repository: GroupRepository;

  constructor(repository?: GroupRepository) {
    this.repository = repository || new PostgresGroupRepository();
  }

  async createGroup(userId: string, name: string): Promise<Group> {
    if (!name || name.trim() === '') {
      throw new Error('Group name is required');
    }

    if (name.length > 255) {
      throw new Error('Group name must be 255 characters or less');
    }

    const trimmedName = name.trim();

    // Check for duplicate group name (case-insensitive)
    const existingGroups = await this.repository.findAll(userId, false);
    const duplicate = existingGroups.find(
      (g) => g.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      throw new Error('A group with this name already exists');
    }

    return await this.repository.create(userId, trimmedName);
  }

  async updateGroup(id: string, userId: string, name: string): Promise<Group> {
    if (!name || name.trim() === '') {
      throw new Error('Group name is required');
    }

    if (name.length > 255) {
      throw new Error('Group name must be 255 characters or less');
    }

    const trimmedName = name.trim();

    // Check for duplicate group name (case-insensitive), excluding current group
    const existingGroups = await this.repository.findAll(userId, false);
    const duplicate = existingGroups.find(
      (g) => g.id !== id && g.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      throw new Error('A group with this name already exists');
    }

    return await this.repository.update(id, userId, trimmedName);
  }

  async archiveGroup(id: string, userId: string): Promise<void> {
    await this.repository.archive(id, userId);
  }

  async getGroup(id: string, userId: string): Promise<Group> {
    const group = await this.repository.findById(id, userId);

    if (!group) {
      throw new Error('Group not found');
    }

    return group;
  }

  async listGroups(userId: string, includeArchived: boolean = false): Promise<Group[]> {
    return await this.repository.findAll(userId, includeArchived);
  }

  async assignContactToGroup(contactId: string, groupId: string, userId: string): Promise<void> {
    await this.repository.assignContact(contactId, groupId, userId);
  }

  async removeContactFromGroup(contactId: string, groupId: string, userId: string): Promise<void> {
    await this.repository.removeContact(contactId, groupId, userId);
  }

  async bulkAssignContactsToGroup(
    contactIds: string[],
    groupId: string,
    userId: string
  ): Promise<void> {
    if (contactIds.length === 0) {
      return;
    }

    await this.repository.bulkAssignContacts(contactIds, groupId, userId);
  }

  async bulkRemoveContactsFromGroup(
    contactIds: string[],
    groupId: string,
    userId: string
  ): Promise<void> {
    if (contactIds.length === 0) {
      return;
    }

    await this.repository.bulkRemoveContacts(contactIds, groupId, userId);
  }

  async createDefaultGroups(userId: string): Promise<Group[]> {
    return await this.repository.createDefaultGroups(userId);
  }

  async promoteTagToGroup(userId: string, tagText: string): Promise<Group> {
    if (!tagText || tagText.trim() === '') {
      throw new Error('Tag text is required');
    }

    const trimmedText = tagText.trim();

    // Check for duplicate group name (case-insensitive)
    const existingGroups = await this.repository.findAll(userId, false);
    const duplicate = existingGroups.find(
      (g) => g.name.toLowerCase() === trimmedText.toLowerCase()
    );

    if (duplicate) {
      throw new Error('A group with this name already exists');
    }

    // Create a new group marked as promoted from tag
    return await this.repository.create(userId, trimmedText, false, true);
  }
}

// Export singleton instance
export const groupService = new GroupServiceImpl();
