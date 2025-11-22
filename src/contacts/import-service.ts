/**
 * Contact Import Service
 *
 * Handles importing contacts from external sources like Google Contacts.
 * Implements deduplication logic and OAuth integration.
 */

import { google } from 'googleapis';
import { ContactRepository, PostgresContactRepository, ContactCreateData } from './repository';
import { Contact } from '../types';

export interface ImportedContact {
  name: string;
  phone?: string;
  email?: string;
  otherFields?: Record<string, any>;
}

export interface ImportResult {
  imported: Contact[];
  duplicates: ImportedContact[];
  errors: Array<{ contact: ImportedContact; error: string }>;
}

export interface ImportService {
  importFromGoogleContacts(userId: string, accessToken: string): Promise<ImportResult>;
}

/**
 * Import Service Implementation
 */
export class ImportServiceImpl implements ImportService {
  private repository: ContactRepository;

  constructor(repository?: ContactRepository) {
    this.repository = repository || new PostgresContactRepository();
  }

  /**
   * Import contacts from Google Contacts
   * Extracts name, phone, email, and other available fields
   * Deduplicates based on email and phone number
   */
  async importFromGoogleContacts(userId: string, accessToken: string): Promise<ImportResult> {
    const imported: Contact[] = [];
    const duplicates: ImportedContact[] = [];
    const errors: Array<{ contact: ImportedContact; error: string }> = [];

    try {
      // Set up Google People API client
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const people = google.people({ version: 'v1', auth });

      // Fetch all contacts
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        personFields: 'names,emailAddresses,phoneNumbers,organizations,urls,addresses,biographies',
      });

      const connections = response.data.connections || [];

      // Get existing contacts for deduplication
      const existingContacts = await this.repository.findAll(userId);

      for (const person of connections) {
        try {
          const importedContact = this.extractContactData(person);

          // Skip if no name
          if (!importedContact.name) {
            continue;
          }

          // Check for duplicates based on email and phone
          const isDuplicate = this.isDuplicateContact(importedContact, existingContacts);

          if (isDuplicate) {
            duplicates.push(importedContact);
            continue;
          }

          // Create contact
          const contactData: ContactCreateData = {
            name: importedContact.name,
            phone: importedContact.phone,
            email: importedContact.email,
            linkedIn: importedContact.otherFields?.linkedIn,
            customNotes: importedContact.otherFields?.notes,
          };

          const contact = await this.repository.create(userId, contactData);
          imported.push(contact);
        } catch (error) {
          const importedContact = this.extractContactData(person);
          errors.push({
            contact: importedContact,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return { imported, duplicates, errors };
    } catch (error) {
      throw new Error(
        `Failed to import from Google Contacts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract contact data from Google People API person object
   */
  private extractContactData(person: any): ImportedContact {
    const contact: ImportedContact = {
      name: '',
      otherFields: {},
    };

    // Extract name
    if (person.names && person.names.length > 0) {
      const name = person.names[0];
      contact.name = name.displayName || `${name.givenName || ''} ${name.familyName || ''}`.trim();
    }

    // Extract email (primary first)
    if (person.emailAddresses && person.emailAddresses.length > 0) {
      const primaryEmail = person.emailAddresses.find((e: any) => e.metadata?.primary);
      contact.email = primaryEmail?.value || person.emailAddresses[0].value;
    }

    // Extract phone (primary first)
    if (person.phoneNumbers && person.phoneNumbers.length > 0) {
      const primaryPhone = person.phoneNumbers.find((p: any) => p.metadata?.primary);
      contact.phone = primaryPhone?.value || person.phoneNumbers[0].value;
    }

    // Extract LinkedIn from URLs
    if (person.urls && person.urls.length > 0) {
      const linkedInUrl = person.urls.find((u: any) =>
        u.value?.toLowerCase().includes('linkedin.com')
      );
      if (linkedInUrl) {
        contact.otherFields!.linkedIn = linkedInUrl.value;
      }
    }

    // Extract organization/company
    if (person.organizations && person.organizations.length > 0) {
      const org = person.organizations[0];
      if (org.name || org.title) {
        contact.otherFields!.notes = `${org.title || ''} at ${org.name || ''}`.trim();
      }
    }

    // Extract biography/notes
    if (person.biographies && person.biographies.length > 0) {
      const bio = person.biographies[0].value;
      if (bio) {
        contact.otherFields!.notes = contact.otherFields!.notes
          ? `${contact.otherFields!.notes}\n${bio}`
          : bio;
      }
    }

    // Extract address for location
    if (person.addresses && person.addresses.length > 0) {
      const address = person.addresses[0];
      if (address.city) {
        contact.otherFields!.location = address.city;
      }
    }

    return contact;
  }

  /**
   * Check if contact is a duplicate based on email and phone number
   */
  private isDuplicateContact(
    importedContact: ImportedContact,
    existingContacts: Contact[]
  ): boolean {
    return existingContacts.some((existing) => {
      // Match by email
      if (importedContact.email && existing.email) {
        if (
          importedContact.email.toLowerCase().trim() === existing.email.toLowerCase().trim()
        ) {
          return true;
        }
      }

      // Match by phone (normalize by removing non-digits)
      if (importedContact.phone && existing.phone) {
        const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
        if (normalizePhone(importedContact.phone) === normalizePhone(existing.phone)) {
          return true;
        }
      }

      return false;
    });
  }
}

// Export singleton instance
export const importService = new ImportServiceImpl();
