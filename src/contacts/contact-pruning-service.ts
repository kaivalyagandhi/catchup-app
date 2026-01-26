/**
 * Contact Pruning Service
 *
 * Manages contact archiving, removal, and reactivation.
 * Handles circle count updates after pruning operations.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { PostgresContactRepository, type DunbarCircle } from './repository';
import { PostgresCircleAssignmentRepository } from './circle-assignment-repository';
import pool from '../db/connection';

/**
 * Pruning action result
 */
export interface PruningResult {
  success: boolean;
  contactId: string;
  action: 'archived' | 'removed' | 'reactivated';
  previousCircle?: DunbarCircle;
  circleDistribution: CircleDistribution;
}

/**
 * Circle distribution after pruning
 */
export interface CircleDistribution {
  inner: number;
  close: number;
  active: number;
  casual: number;
  uncategorized: number;
  total: number;
}

/**
 * Archived contact with metadata
 */
export interface ArchivedContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  dunbarCircle?: DunbarCircle;
  frequencyPreference?: string;
  archivedAt: Date;
  lastContactDate?: Date;
}

/**
 * Contact Pruning Service Interface
 */
export interface ContactPruningService {
  archiveContact(userId: string, contactId: string): Promise<PruningResult>;
  removeContact(userId: string, contactId: string): Promise<PruningResult>;
  reactivateContact(userId: string, contactId: string): Promise<PruningResult>;
  getArchivedContacts(userId: string): Promise<ArchivedContact[]>;
  bulkArchive(userId: string, contactIds: string[]): Promise<PruningResult[]>;
  bulkRemove(userId: string, contactIds: string[]): Promise<PruningResult[]>;
}

/**
 * PostgreSQL Contact Pruning Service Implementation
 */
export class PostgresContactPruningService implements ContactPruningService {
  private contactRepo: PostgresContactRepository;
  private assignmentRepo: PostgresCircleAssignmentRepository;

  constructor(
    contactRepo?: PostgresContactRepository,
    assignmentRepo?: PostgresCircleAssignmentRepository
  ) {
    this.contactRepo = contactRepo || new PostgresContactRepository();
    this.assignmentRepo = assignmentRepo || new PostgresCircleAssignmentRepository();
  }

  /**
   * Archive a contact
   * Requirements: 12.1, 12.2 - Archive with data preservation
   */
  async archiveContact(userId: string, contactId: string): Promise<PruningResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get contact before archiving to capture circle
      const contact = await this.contactRepo.findById(contactId, userId);
      if (!contact) {
        throw new Error('Contact not found');
      }

      const previousCircle = contact.dunbarCircle;

      // Archive the contact
      await this.contactRepo.archive(contactId, userId);

      // Get updated circle distribution
      const distribution = await this.assignmentRepo.getCircleDistribution(userId);

      await client.query('COMMIT');

      return {
        success: true,
        contactId,
        action: 'archived',
        previousCircle,
        circleDistribution: distribution,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove a contact permanently
   * Requirements: 12.3 - Delete after confirmation
   */
  async removeContact(userId: string, contactId: string): Promise<PruningResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get contact before deletion to capture circle
      const contact = await this.contactRepo.findById(contactId, userId);
      if (!contact) {
        throw new Error('Contact not found');
      }

      const previousCircle = contact.dunbarCircle;

      // Delete the contact (cascades to related records)
      await this.contactRepo.delete(contactId, userId);

      // Get updated circle distribution
      const distribution = await this.assignmentRepo.getCircleDistribution(userId);

      await client.query('COMMIT');

      return {
        success: true,
        contactId,
        action: 'removed',
        previousCircle,
        circleDistribution: distribution,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reactivate an archived contact
   * Requirements: 12.5 - Restore previous circle and preferences
   */
  async reactivateContact(userId: string, contactId: string): Promise<PruningResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get contact to verify it's archived
      const contact = await this.contactRepo.findById(contactId, userId);
      if (!contact) {
        throw new Error('Contact not found');
      }

      if (!contact.archived) {
        throw new Error('Contact is not archived');
      }

      const previousCircle = contact.dunbarCircle;

      // Unarchive the contact (preserves all data)
      await this.contactRepo.unarchive(contactId, userId);

      // Get updated circle distribution
      const distribution = await this.assignmentRepo.getCircleDistribution(userId);

      await client.query('COMMIT');

      return {
        success: true,
        contactId,
        action: 'reactivated',
        previousCircle,
        circleDistribution: distribution,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all archived contacts
   * Requirements: 12.2 - List archived contacts for reactivation
   */
  async getArchivedContacts(userId: string): Promise<ArchivedContact[]> {
    const contacts = await this.contactRepo.findAll(userId, { archived: true });

    return contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      dunbarCircle: contact.dunbarCircle,
      frequencyPreference: contact.frequencyPreference,
      archivedAt: contact.updatedAt, // Use updatedAt as proxy for archivedAt
      lastContactDate: contact.lastContactDate,
    }));
  }

  /**
   * Bulk archive contacts
   * Requirements: 12.4 - Update circle counts after bulk operations
   */
  async bulkArchive(userId: string, contactIds: string[]): Promise<PruningResult[]> {
    const results: PruningResult[] = [];

    for (const contactId of contactIds) {
      try {
        const result = await this.archiveContact(userId, contactId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          contactId,
          action: 'archived',
          circleDistribution: await this.assignmentRepo.getCircleDistribution(userId),
        });
      }
    }

    return results;
  }

  /**
   * Bulk remove contacts
   * Requirements: 12.4 - Update circle counts after bulk operations
   */
  async bulkRemove(userId: string, contactIds: string[]): Promise<PruningResult[]> {
    const results: PruningResult[] = [];

    for (const contactId of contactIds) {
      try {
        const result = await this.removeContact(userId, contactId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          contactId,
          action: 'removed',
          circleDistribution: await this.assignmentRepo.getCircleDistribution(userId),
        });
      }
    }

    return results;
  }
}

// Default instance
const defaultService = new PostgresContactPruningService();

export const archiveContact = (userId: string, contactId: string) =>
  defaultService.archiveContact(userId, contactId);

export const removeContact = (userId: string, contactId: string) =>
  defaultService.removeContact(userId, contactId);

export const reactivateContact = (userId: string, contactId: string) =>
  defaultService.reactivateContact(userId, contactId);

export const getArchivedContacts = (userId: string) => defaultService.getArchivedContacts(userId);

export const bulkArchive = (userId: string, contactIds: string[]) =>
  defaultService.bulkArchive(userId, contactIds);

export const bulkRemove = (userId: string, contactIds: string[]) =>
  defaultService.bulkRemove(userId, contactIds);
