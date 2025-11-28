/**
 * Google Contacts API Client (Read-Only)
 * 
 * Wrapper around Google People API that enforces read-only operations.
 * This client ONLY allows GET requests to ensure one-way sync from Google to CatchUp.
 * 
 * Requirements: 15.3
 */

import { people_v1 } from 'googleapis';
import { getPeopleClient } from './google-contacts-config';
import type { Credentials } from 'google-auth-library';

/**
 * Allowed HTTP methods for Google Contacts API
 * Only GET is permitted to ensure read-only access
 */
type AllowedMethod = 'GET';

/**
 * Google Contacts Client with read-only safeguards
 */
export class GoogleContactsClient {
  private client: people_v1.People;

  constructor(credentials: Credentials) {
    this.client = getPeopleClient(credentials);
  }

  /**
   * Validate that the request method is read-only (GET)
   * 
   * Requirements: 15.3
   */
  private validateReadOnlyOperation(method: string): void {
    const allowedMethods: AllowedMethod[] = ['GET'];
    
    if (!allowedMethods.includes(method as AllowedMethod)) {
      throw new Error(
        `SECURITY ERROR: Write operation attempted on Google Contacts API. ` +
        `Method '${method}' is not allowed. Only GET requests are permitted. ` +
        `CatchUp never modifies Google Contacts data.`
      );
    }
  }

  /**
   * List contacts (connections) - READ ONLY
   * 
   * This is the primary method for syncing contacts from Google.
   */
  async listConnections(params: {
    resourceName: string;
    pageSize?: number;
    pageToken?: string;
    syncToken?: string;
    requestSyncToken?: boolean;
    personFields?: string;
  }): Promise<people_v1.Schema$ListConnectionsResponse> {
    this.validateReadOnlyOperation('GET');
    
    const response = await this.client.people.connections.list(params);
    return response.data;
  }

  /**
   * Get a single contact by resource name - READ ONLY
   */
  async getContact(params: {
    resourceName: string;
    personFields?: string;
  }): Promise<people_v1.Schema$Person> {
    this.validateReadOnlyOperation('GET');
    
    const response = await this.client.people.get(params);
    return response.data;
  }

  /**
   * List contact groups - READ ONLY
   */
  async listContactGroups(params?: {
    pageSize?: number;
    pageToken?: string;
    syncToken?: string;
  }): Promise<people_v1.Schema$ListContactGroupsResponse> {
    this.validateReadOnlyOperation('GET');
    
    const response = await this.client.contactGroups.list(params);
    return response.data;
  }

  /**
   * Get a single contact group - READ ONLY
   */
  async getContactGroup(params: {
    resourceName: string;
    maxMembers?: number;
  }): Promise<people_v1.Schema$ContactGroup> {
    this.validateReadOnlyOperation('GET');
    
    const response = await this.client.contactGroups.get(params);
    return response.data;
  }

  /**
   * WRITE OPERATIONS - EXPLICITLY DISABLED
   * 
   * These methods throw errors to prevent accidental writes to Google Contacts.
   * Requirements: 15.3
   */

  /**
   * @throws {Error} Creating contacts in Google is not supported
   */
  async createContact(): Promise<never> {
    throw new Error(
      'SECURITY ERROR: Creating contacts in Google Contacts is not supported. ' +
      'CatchUp operates in read-only mode and never modifies Google Contacts data.'
    );
  }

  /**
   * @throws {Error} Updating contacts in Google is not supported
   */
  async updateContact(): Promise<never> {
    throw new Error(
      'SECURITY ERROR: Updating contacts in Google Contacts is not supported. ' +
      'CatchUp operates in read-only mode and never modifies Google Contacts data.'
    );
  }

  /**
   * @throws {Error} Deleting contacts in Google is not supported
   */
  async deleteContact(): Promise<never> {
    throw new Error(
      'SECURITY ERROR: Deleting contacts in Google Contacts is not supported. ' +
      'CatchUp operates in read-only mode and never modifies Google Contacts data.'
    );
  }

  /**
   * @throws {Error} Creating contact groups in Google is not supported
   */
  async createContactGroup(): Promise<never> {
    throw new Error(
      'SECURITY ERROR: Creating contact groups in Google Contacts is not supported. ' +
      'CatchUp operates in read-only mode and never modifies Google Contacts data.'
    );
  }

  /**
   * @throws {Error} Updating contact groups in Google is not supported
   */
  async updateContactGroup(): Promise<never> {
    throw new Error(
      'SECURITY ERROR: Updating contact groups in Google Contacts is not supported. ' +
      'CatchUp operates in read-only mode and never modifies Google Contacts data.'
    );
  }

  /**
   * @throws {Error} Deleting contact groups in Google is not supported
   */
  async deleteContactGroup(): Promise<never> {
    throw new Error(
      'SECURITY ERROR: Deleting contact groups in Google Contacts is not supported. ' +
      'CatchUp operates in read-only mode and never modifies Google Contacts data.'
    );
  }

  /**
   * @throws {Error} Batch operations in Google are not supported
   */
  async batchCreateContacts(): Promise<never> {
    throw new Error(
      'SECURITY ERROR: Batch creating contacts in Google Contacts is not supported. ' +
      'CatchUp operates in read-only mode and never modifies Google Contacts data.'
    );
  }

  /**
   * @throws {Error} Batch operations in Google are not supported
   */
  async batchUpdateContacts(): Promise<never> {
    throw new Error(
      'SECURITY ERROR: Batch updating contacts in Google Contacts is not supported. ' +
      'CatchUp operates in read-only mode and never modifies Google Contacts data.'
    );
  }

  /**
   * @throws {Error} Batch operations in Google are not supported
   */
  async batchDeleteContacts(): Promise<never> {
    throw new Error(
      'SECURITY ERROR: Batch deleting contacts in Google Contacts is not supported. ' +
      'CatchUp operates in read-only mode and never modifies Google Contacts data.'
    );
  }
}
