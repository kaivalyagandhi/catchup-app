/**
 * Google Contacts Client Tests
 * 
 * Tests for read-only safeguards in the Google Contacts API client.
 * Requirements: 15.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleContactsClient } from './google-contacts-client';

// Mock the getPeopleClient function
vi.mock('./google-contacts-config', () => ({
  getPeopleClient: vi.fn(() => ({
    people: {
      connections: {
        list: vi.fn(),
      },
      get: vi.fn(),
    },
    contactGroups: {
      list: vi.fn(),
      get: vi.fn(),
    },
  })),
}));

describe('GoogleContactsClient - Read-Only Safeguards', () => {
  let client: GoogleContactsClient;

  beforeEach(() => {
    // Create client with mock credentials
    client = new GoogleContactsClient({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'Bearer',
      expiry_date: Date.now() + 3600000,
    });
  });

  describe('Write Operations - Should Throw Errors', () => {
    it('should throw error when attempting to create a contact', async () => {
      await expect(client.createContact()).rejects.toThrow(
        'SECURITY ERROR: Creating contacts in Google Contacts is not supported'
      );
    });

    it('should throw error when attempting to update a contact', async () => {
      await expect(client.updateContact()).rejects.toThrow(
        'SECURITY ERROR: Updating contacts in Google Contacts is not supported'
      );
    });

    it('should throw error when attempting to delete a contact', async () => {
      await expect(client.deleteContact()).rejects.toThrow(
        'SECURITY ERROR: Deleting contacts in Google Contacts is not supported'
      );
    });

    it('should throw error when attempting to create a contact group', async () => {
      await expect(client.createContactGroup()).rejects.toThrow(
        'SECURITY ERROR: Creating contact groups in Google Contacts is not supported'
      );
    });

    it('should throw error when attempting to update a contact group', async () => {
      await expect(client.updateContactGroup()).rejects.toThrow(
        'SECURITY ERROR: Updating contact groups in Google Contacts is not supported'
      );
    });

    it('should throw error when attempting to delete a contact group', async () => {
      await expect(client.deleteContactGroup()).rejects.toThrow(
        'SECURITY ERROR: Deleting contact groups in Google Contacts is not supported'
      );
    });

    it('should throw error when attempting batch create contacts', async () => {
      await expect(client.batchCreateContacts()).rejects.toThrow(
        'SECURITY ERROR: Batch creating contacts in Google Contacts is not supported'
      );
    });

    it('should throw error when attempting batch update contacts', async () => {
      await expect(client.batchUpdateContacts()).rejects.toThrow(
        'SECURITY ERROR: Batch updating contacts in Google Contacts is not supported'
      );
    });

    it('should throw error when attempting batch delete contacts', async () => {
      await expect(client.batchDeleteContacts()).rejects.toThrow(
        'SECURITY ERROR: Batch deleting contacts in Google Contacts is not supported'
      );
    });
  });

  describe('Error Messages', () => {
    it('should include "read-only mode" in error messages', async () => {
      try {
        await client.createContact();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('read-only mode');
        expect((error as Error).message).toContain('never modifies Google Contacts data');
      }
    });

    it('should include "SECURITY ERROR" prefix in error messages', async () => {
      try {
        await client.updateContact();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/^SECURITY ERROR:/);
      }
    });
  });
});
