/**
 * Onboarding Service
 *
 * Handles the initial setup flow including contact import with archival.
 * Provides functionality to display imported contacts with checkboxes
 * and archive contacts marked as not relevant.
 */

import { ImportService, ImportServiceImpl, ImportResult } from './import-service';
import { ContactRepository, PostgresContactRepository } from './repository';
import { Contact } from '../types';

export interface ImportPreview {
  contacts: Contact[];
  duplicateCount: number;
  errorCount: number;
}

export interface ArchivalSelection {
  contactId: string;
  archive: boolean;
}

export interface OnboardingService {
  previewGoogleContactsImport(userId: string, accessToken: string): Promise<ImportPreview>;
  applyArchivalSelections(userId: string, selections: ArchivalSelection[]): Promise<void>;
  restoreArchivedContact(userId: string, contactId: string): Promise<Contact>;
}

/**
 * Onboarding Service Implementation
 */
export class OnboardingServiceImpl implements OnboardingService {
  private importService: ImportService;
  private repository: ContactRepository;

  constructor(importService?: ImportService, repository?: ContactRepository) {
    this.importService = importService || new ImportServiceImpl();
    this.repository = repository || new PostgresContactRepository();
  }

  /**
   * Preview Google Contacts import
   * Returns all imported contacts for user review
   */
  async previewGoogleContactsImport(
    userId: string,
    accessToken: string
  ): Promise<ImportPreview> {
    const result: ImportResult = await this.importService.importFromGoogleContacts(
      userId,
      accessToken
    );

    return {
      contacts: result.imported,
      duplicateCount: result.duplicates.length,
      errorCount: result.errors.length,
    };
  }

  /**
   * Apply archival selections to imported contacts
   * Archives contacts marked as not relevant while preserving records
   * Maintains restoration capability
   */
  async applyArchivalSelections(
    userId: string,
    selections: ArchivalSelection[]
  ): Promise<void> {
    for (const selection of selections) {
      if (selection.archive) {
        // Archive the contact while preserving the record
        await this.repository.archive(selection.contactId, userId);
      }
    }
  }

  /**
   * Restore an archived contact
   * Allows users to change their mind about archived contacts
   */
  async restoreArchivedContact(userId: string, contactId: string): Promise<Contact> {
    // Unarchive the contact
    await this.repository.unarchive(contactId, userId);

    // Fetch and return the updated contact
    const contact = await this.repository.findById(contactId, userId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    return contact;
  }
}

// Export singleton instance
export const onboardingService = new OnboardingServiceImpl();
