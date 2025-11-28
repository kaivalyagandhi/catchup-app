/**
 * Contact Service
 *
 * Business logic layer for contact operations.
 * Implements validation and orchestrates repository operations.
 */

import {
  ContactRepository,
  PostgresContactRepository,
  ContactCreateData,
  ContactUpdateData,
  ContactFilters,
} from './repository';
import { Contact, CityTimezoneData } from '../types';
import { validateContactData } from './validation';
import { TimezoneService, timezoneService as defaultTimezoneService } from './timezone-service';
import {
  getOrSetCache,
  CacheKeys,
  CacheTTL,
  invalidateContactCache,
} from '../utils/cache';

/**
 * Contact Service Interface
 */
export interface ContactService {
  createContact(userId: string, data: ContactCreateData): Promise<Contact>;
  updateContact(id: string, userId: string, data: ContactUpdateData): Promise<Contact>;
  getContact(id: string, userId: string): Promise<Contact>;
  listContacts(userId: string, filters?: ContactFilters): Promise<Contact[]>;
  deleteContact(id: string, userId: string): Promise<void>;
  archiveContact(id: string, userId: string): Promise<void>;
  inferTimezoneFromLocation(location: string): string | null;
  getCityDataset(): CityTimezoneData[];
}

/**
 * Contact Service Implementation
 */
export class ContactServiceImpl implements ContactService {
  private repository: ContactRepository;
  private timezoneService: TimezoneService;

  constructor(repository?: ContactRepository, timezoneService?: TimezoneService) {
    this.repository = repository || new PostgresContactRepository();
    this.timezoneService = timezoneService || defaultTimezoneService;
  }

  async createContact(userId: string, data: ContactCreateData): Promise<Contact> {
    // Validate input
    const validation = validateContactData({
      name: data.name,
      phone: data.phone,
      email: data.email,
      linkedIn: data.linkedIn,
      instagram: data.instagram,
      xHandle: data.xHandle,
    });

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Infer timezone from location if provided and timezone not explicitly set
    if (data.location && !data.timezone) {
      const inferredTimezone = this.timezoneService.inferTimezoneFromLocation(data.location);
      if (inferredTimezone) {
        data.timezone = inferredTimezone;
      }
    }

    // Create contact
    const contact = await this.repository.create(userId, data);

    // Invalidate contact list cache
    await invalidateContactCache(userId);

    return contact;
  }

  async updateContact(id: string, userId: string, data: ContactUpdateData): Promise<Contact> {
    // Validate input if fields are provided
    if (data.name || data.phone || data.email || data.linkedIn || data.instagram || data.xHandle) {
      const validation = validateContactData({
        name: data.name || '', // Will be validated only if updating
        phone: data.phone,
        email: data.email,
        linkedIn: data.linkedIn,
        instagram: data.instagram,
        xHandle: data.xHandle,
      });

      // Only check validation if name is being updated
      if (data.name !== undefined && !validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Handle timezone inference when location changes
    if (data.location !== undefined) {
      // If location is being updated and timezone is not explicitly provided
      if (data.timezone === undefined) {
        if (data.location) {
          // Try to infer timezone from new location
          const inferredTimezone = this.timezoneService.inferTimezoneFromLocation(data.location);
          if (inferredTimezone) {
            data.timezone = inferredTimezone;
          } else {
            // Location provided but no match found - set timezone to null
            // This will trigger manual timezone selection in the UI
            data.timezone = null as any;
          }
        } else {
          // Location cleared, clear timezone too
          data.timezone = null as any;
        }
      }
    }

    // LOCAL EDIT HANDLING - Requirements: 15.4
    // When a user edits a contact in CatchUp, changes are persisted ONLY to the local database.
    // NO API calls are made to Google Contacts.
    // Google metadata (google_resource_name, google_etag, source) is preserved for future syncs.
    // The repository layer ensures Google metadata fields are not modified during updates.
    
    // Update contact (local database only)
    const contact = await this.repository.update(id, userId, data);

    // Invalidate caches
    await invalidateContactCache(userId, id);

    return contact;
  }

  async getContact(id: string, userId: string): Promise<Contact> {
    // Try to get from cache first
    return await getOrSetCache(
      CacheKeys.CONTACT_PROFILE(id),
      async () => {
        const contact = await this.repository.findById(id, userId);
        if (!contact) {
          throw new Error('Contact not found');
        }
        return contact;
      },
      CacheTTL.CONTACT_PROFILE
    );
  }

  async listContacts(userId: string, filters?: ContactFilters): Promise<Contact[]> {
    // Only cache if no filters are applied
    if (!filters || Object.keys(filters).length === 0) {
      return await getOrSetCache(
        CacheKeys.CONTACT_LIST(userId),
        async () => await this.repository.findAll(userId, filters),
        CacheTTL.CONTACT_LIST
      );
    }

    // Don't cache filtered results
    return await this.repository.findAll(userId, filters);
  }

  async deleteContact(id: string, userId: string): Promise<void> {
    await this.repository.delete(id, userId);

    // Invalidate caches
    await invalidateContactCache(userId, id);
  }

  async archiveContact(id: string, userId: string): Promise<void> {
    await this.repository.archive(id, userId);

    // Invalidate caches
    await invalidateContactCache(userId, id);
  }

  inferTimezoneFromLocation(location: string): string | null {
    return this.timezoneService.inferTimezoneFromLocation(location);
  }

  getCityDataset(): CityTimezoneData[] {
    return this.timezoneService.getCityDataset();
  }
}

// Export singleton instance
export const contactService = new ContactServiceImpl();
