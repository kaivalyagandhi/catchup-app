/**
 * Contact Import Service
 *
 * Handles importing contacts from external sources like Google Contacts.
 * Implements deduplication logic and OAuth integration.
 * Enhanced with Google metadata support for sync tracking.
 */

import { google } from 'googleapis';
import {
  ContactRepository,
  PostgresContactRepository,
  ContactCreateData,
  ContactUpdateData,
} from './repository';
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

export interface GooglePerson {
  resourceName: string;
  etag: string;
  names?: Array<{ displayName: string; givenName?: string; familyName?: string }>;
  emailAddresses?: Array<{ value: string; metadata?: { primary?: boolean } }>;
  phoneNumbers?: Array<{ value: string; metadata?: { primary?: boolean } }>;
  organizations?: Array<{ name?: string; title?: string }>;
  urls?: Array<{ value: string; type?: string }>;
  addresses?: Array<{ formattedValue?: string; city?: string }>;
  memberships?: Array<{ contactGroupMembership?: { contactGroupResourceName: string } }>;
  metadata?: { deleted?: boolean };
}

export interface ContactData {
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  linkedinUrl?: string;
  address?: string;
  source: 'manual' | 'google' | 'calendar' | 'voice_note';
  googleResourceName?: string;
  googleEtag?: string;
  lastSyncedAt?: Date;
}

export interface ImportService {
  importFromGoogleContacts(userId: string, accessToken: string): Promise<ImportResult>;
  importContact(userId: string, person: GooglePerson): Promise<Contact>;
  findByGoogleResourceName(userId: string, resourceName: string): Promise<Contact | null>;
  updateContact(contactId: string, userId: string, data: ContactData): Promise<Contact>;
  handleDeletedContact(userId: string, resourceName: string): Promise<void>;
  extractContactData(person: GooglePerson): ContactData;
}

/**
 * Import Service Implementation
 * Enhanced with Google metadata support for sync tracking
 */
export class ImportServiceImpl implements ImportService {
  private repository: ContactRepository;

  constructor(repository?: ContactRepository) {
    this.repository = repository || new PostgresContactRepository();
  }

  /**
   * Import a single contact from Google Person object
   * Implements deduplication and metadata tracking
   * Requirements: 2.3, 2.4, 2.6, 2.7
   */
  async importContact(userId: string, person: GooglePerson): Promise<Contact> {
    // Extract contact data from Google Person object
    const contactData = this.extractContactData(person);

    // Check if contact already exists by Google resource name
    let existingContact = await this.findByGoogleResourceName(userId, person.resourceName);

    if (existingContact) {
      // Update existing contact
      return this.updateContact(existingContact.id, userId, contactData);
    }

    // Fallback deduplication by email
    if (contactData.email) {
      const allContacts = await this.repository.findAll(userId);
      existingContact =
        allContacts.find(
          (c) => c.email && c.email.toLowerCase().trim() === contactData.email!.toLowerCase().trim()
        ) || null;

      if (existingContact) {
        return this.updateContact(existingContact.id, userId, contactData);
      }
    }

    // Fallback deduplication by phone
    if (contactData.phone) {
      const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
      const allContacts = await this.repository.findAll(userId);
      existingContact =
        allContacts.find(
          (c) => c.phone && normalizePhone(c.phone) === normalizePhone(contactData.phone!)
        ) || null;

      if (existingContact) {
        return this.updateContact(existingContact.id, userId, contactData);
      }
    }

    // Create new contact
    const createData: ContactCreateData = {
      name: contactData.name,
      phone: contactData.phone,
      email: contactData.email,
      linkedIn: contactData.linkedinUrl,
      customNotes: contactData.organization,
      location: contactData.address,
      source: 'google',
      googleResourceName: contactData.googleResourceName,
      googleEtag: contactData.googleEtag,
      lastSyncedAt: contactData.lastSyncedAt,
    };

    return this.repository.create(userId, createData);
  }

  /**
   * Find contact by Google resource name
   * Requirements: 2.6, 13.1
   */
  async findByGoogleResourceName(userId: string, resourceName: string): Promise<Contact | null> {
    return this.repository.findByGoogleResourceName(userId, resourceName);
  }

  /**
   * Update existing contact with new data from Google
   * Implements smart updates that preserve manually added CatchUp-specific fields
   * Requirements: 2.7, 3.4, 13.4, 13.5
   */
  async updateContact(contactId: string, userId: string, data: ContactData): Promise<Contact> {
    // Fetch existing contact to preserve CatchUp-specific fields
    const existingContact = await this.repository.findById(contactId, userId);

    if (!existingContact) {
      throw new Error('Contact not found');
    }

    // Build update data with smart field preservation
    const updateData: ContactUpdateData = {
      // Always update Google-sourced fields
      name: data.name,
      phone: data.phone,
      email: data.email,
      linkedIn: data.linkedinUrl,
      location: data.address,

      // Update Google metadata
      source: 'google',
      googleResourceName: data.googleResourceName,
      googleEtag: data.googleEtag,
      lastSyncedAt: data.lastSyncedAt,

      // Preserve CatchUp-specific fields that don't come from Google
      // These fields are NOT updated during sync:
      // - instagram (CatchUp-specific)
      // - xHandle (CatchUp-specific)
      // - otherSocialMedia (CatchUp-specific)
      // - timezone (CatchUp-specific, user preference)
      // - frequencyPreference (CatchUp-specific, user preference)
      // - lastContactDate (CatchUp-specific, interaction tracking)

      // Handle customNotes specially: merge Google organization data with existing notes
      customNotes: this.mergeCustomNotes(existingContact.customNotes, data.organization),
    };

    return this.repository.update(contactId, userId, updateData);
  }

  /**
   * Merge custom notes intelligently
   * Preserves user-added notes while updating Google organization data
   * Requirements: 3.4, 13.5
   */
  private mergeCustomNotes(
    existingNotes: string | undefined,
    googleOrganization: string | undefined
  ): string | undefined {
    // If no existing notes, just use Google organization data
    if (!existingNotes) {
      return googleOrganization;
    }

    // If no Google organization data, preserve existing notes
    if (!googleOrganization) {
      return existingNotes;
    }

    // Check if existing notes already contain the Google organization data
    if (existingNotes.includes(googleOrganization)) {
      return existingNotes;
    }

    // Check if existing notes look like they came from Google (simple pattern: "Title at Company")
    // This is a heuristic: if the notes match the pattern "word(s) at word(s)" and nothing else,
    // it's likely Google-generated
    const googleStylePattern = /^[\w\s]+ at [\w\s]+$/;
    if (googleStylePattern.test(existingNotes.trim())) {
      // Replace with new Google data
      return googleOrganization;
    }

    // Otherwise, preserve user-added notes and append Google data
    return `${existingNotes}\n\n${googleOrganization}`;
  }

  /**
   * Handle deleted contact from Google
   * Archives the contact when metadata.deleted=true
   * Requirements: 3.3
   */
  async handleDeletedContact(userId: string, resourceName: string): Promise<void> {
    const contact = await this.findByGoogleResourceName(userId, resourceName);
    if (contact) {
      await this.repository.archive(contact.id, userId);
    }
  }

  /**
   * Extract contact data from Google Person object
   * Requirements: 2.3
   */
  extractContactData(person: GooglePerson): ContactData {
    const contactData: ContactData = {
      name: '',
      source: 'google',
      googleResourceName: person.resourceName,
      googleEtag: person.etag,
      lastSyncedAt: new Date(),
    };

    // Extract name
    if (person.names && person.names.length > 0) {
      const name = person.names[0];
      contactData.name =
        name.displayName || `${name.givenName || ''} ${name.familyName || ''}`.trim();
    }

    // Extract email (primary first)
    if (person.emailAddresses && person.emailAddresses.length > 0) {
      const primaryEmail = person.emailAddresses.find((e) => e.metadata?.primary);
      contactData.email = primaryEmail?.value || person.emailAddresses[0].value;
    }

    // Extract phone (primary first)
    if (person.phoneNumbers && person.phoneNumbers.length > 0) {
      const primaryPhone = person.phoneNumbers.find((p) => p.metadata?.primary);
      contactData.phone = primaryPhone?.value || person.phoneNumbers[0].value;
    }

    // Extract LinkedIn from URLs
    if (person.urls && person.urls.length > 0) {
      const linkedInUrl = person.urls.find((u) => u.value?.toLowerCase().includes('linkedin.com'));
      if (linkedInUrl) {
        contactData.linkedinUrl = linkedInUrl.value;
      }
    }

    // Extract organization/company
    if (person.organizations && person.organizations.length > 0) {
      const org = person.organizations[0];
      if (org.name || org.title) {
        contactData.organization = `${org.title || ''} at ${org.name || ''}`.trim();
      }
    }

    // Extract address for location
    if (person.addresses && person.addresses.length > 0) {
      const address = person.addresses[0];
      contactData.address = address.city || address.formattedValue;
    }

    return contactData;
  }

  /**
   * Import contacts from Google Contacts
   * Extracts name, phone, email, and other available fields
   * Deduplicates based on Google resource name, email, and phone number
   * Enhanced with metadata tracking
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
        personFields:
          'names,emailAddresses,phoneNumbers,organizations,urls,addresses,memberships,metadata',
      });

      const connections = response.data.connections || [];

      for (const person of connections) {
        try {
          // Skip if no name
          if (!person.names || person.names.length === 0) {
            continue;
          }

          // Handle deleted contacts
          if (person.metadata?.deleted) {
            await this.handleDeletedContact(userId, person.resourceName!);
            continue;
          }

          // Import or update contact
          const contact = await this.importContact(userId, person as GooglePerson);
          imported.push(contact);
        } catch (error) {
          const contactData = this.extractContactData(person as GooglePerson);
          errors.push({
            contact: {
              name: contactData.name,
              email: contactData.email,
              phone: contactData.phone,
            },
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
}

// Export singleton instance
export const importService = new ImportServiceImpl();
