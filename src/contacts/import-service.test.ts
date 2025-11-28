/**
 * Import Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportServiceImpl } from './import-service';
import { ContactRepository } from './repository';
import { Contact } from '../types';

// Mock googleapis
vi.mock('googleapis', () => {
  const mockOAuth2 = vi.fn(function() {
    return {
      setCredentials: vi.fn(),
    };
  });

  return {
    google: {
      auth: {
        OAuth2: mockOAuth2,
      },
      people: vi.fn(),
    },
  };
});

describe('ImportService', () => {
  let service: ImportServiceImpl;
  let mockRepository: ContactRepository;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByGoogleResourceName: vi.fn(),
      delete: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
    };

    service = new ImportServiceImpl(mockRepository);
  });

  describe('updateContact - smart updates', () => {
    it('should preserve CatchUp-specific fields during sync', async () => {
      const userId = 'user-1';
      const contactId = 'contact-1';

      // Mock existing contact with CatchUp-specific fields
      const existingContact: Contact = {
        id: contactId,
        userId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        instagram: '@johndoe',
        xHandle: '@johndoe',
        otherSocialMedia: { facebook: 'johndoe' },
        timezone: 'America/New_York',
        frequencyPreference: 'weekly',
        customNotes: 'Met at conference 2024',
        lastContactDate: new Date('2024-01-15'),
        source: 'google',
        googleResourceName: 'people/c123',
        googleEtag: 'etag123',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(existingContact);

      // Mock updated contact from Google with new data
      const updatedContact: Contact = {
        ...existingContact,
        name: 'John Updated Doe',
        email: 'john.new@example.com',
        phone: '+9876543210',
        location: 'San Francisco',
        customNotes: 'Met at conference 2024\n\nSoftware Engineer at Tech Corp',
        googleEtag: 'etag456',
        lastSyncedAt: new Date(),
      };

      vi.mocked(mockRepository.update).mockResolvedValue(updatedContact);

      // Perform update with new Google data
      const googleData = {
        name: 'John Updated Doe',
        email: 'john.new@example.com',
        phone: '+9876543210',
        organization: 'Software Engineer at Tech Corp',
        address: 'San Francisco',
        source: 'google' as const,
        googleResourceName: 'people/c123',
        googleEtag: 'etag456',
        lastSyncedAt: new Date(),
      };

      const result = await service.updateContact(contactId, userId, googleData);

      // Verify update was called with correct data
      expect(mockRepository.update).toHaveBeenCalledWith(contactId, userId, expect.objectContaining({
        // Google-sourced fields should be updated
        name: 'John Updated Doe',
        email: 'john.new@example.com',
        phone: '+9876543210',
        location: 'San Francisco',
        source: 'google',
        googleResourceName: 'people/c123',
        googleEtag: 'etag456',
        // CatchUp-specific fields should NOT be in the update
        // (they are preserved by not being included in the update)
      }));

      // Verify the update call does NOT include CatchUp-specific fields
      const updateCall = vi.mocked(mockRepository.update).mock.calls[0][2];
      expect(updateCall).not.toHaveProperty('instagram');
      expect(updateCall).not.toHaveProperty('xHandle');
      expect(updateCall).not.toHaveProperty('otherSocialMedia');
      expect(updateCall).not.toHaveProperty('timezone');
      expect(updateCall).not.toHaveProperty('frequencyPreference');
      expect(updateCall).not.toHaveProperty('lastContactDate');
    });

    it('should merge custom notes intelligently', async () => {
      const userId = 'user-1';
      const contactId = 'contact-1';

      // Mock existing contact with user-added notes
      const existingContact: Contact = {
        id: contactId,
        userId,
        name: 'Jane Smith',
        email: 'jane@example.com',
        customNotes: 'Met at conference 2024. Interested in AI.',
        source: 'google',
        googleResourceName: 'people/c456',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(existingContact);
      vi.mocked(mockRepository.update).mockResolvedValue(existingContact);

      // Update with Google organization data
      const googleData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        organization: 'Senior Engineer at Acme Corp',
        source: 'google' as const,
        googleResourceName: 'people/c456',
        googleEtag: 'etag789',
        lastSyncedAt: new Date(),
      };

      await service.updateContact(contactId, userId, googleData);

      // Verify custom notes were merged (user notes preserved + Google org appended)
      expect(mockRepository.update).toHaveBeenCalledWith(contactId, userId, expect.objectContaining({
        customNotes: 'Met at conference 2024. Interested in AI.\n\nSenior Engineer at Acme Corp',
      }));
    });

    it('should replace Google-style notes with new Google data', async () => {
      const userId = 'user-1';
      const contactId = 'contact-1';

      // Mock existing contact with Google-style notes (contains "at")
      const existingContact: Contact = {
        id: contactId,
        userId,
        name: 'Bob Johnson',
        email: 'bob@example.com',
        customNotes: 'Engineer at Old Corp',
        source: 'google',
        googleResourceName: 'people/c789',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(existingContact);
      vi.mocked(mockRepository.update).mockResolvedValue(existingContact);

      // Update with new Google organization data
      const googleData = {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        organization: 'Senior Engineer at New Corp',
        source: 'google' as const,
        googleResourceName: 'people/c789',
        googleEtag: 'etag999',
        lastSyncedAt: new Date(),
      };

      await service.updateContact(contactId, userId, googleData);

      // Verify old Google-style notes were replaced
      expect(mockRepository.update).toHaveBeenCalledWith(contactId, userId, expect.objectContaining({
        customNotes: 'Senior Engineer at New Corp',
      }));
    });

    it('should preserve user notes when no Google organization data', async () => {
      const userId = 'user-1';
      const contactId = 'contact-1';

      // Mock existing contact with user notes
      const existingContact: Contact = {
        id: contactId,
        userId,
        name: 'Alice Brown',
        email: 'alice@example.com',
        customNotes: 'Friend from college. Loves hiking.',
        source: 'google',
        googleResourceName: 'people/c999',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(existingContact);
      vi.mocked(mockRepository.update).mockResolvedValue(existingContact);

      // Update without Google organization data
      const googleData = {
        name: 'Alice Brown',
        email: 'alice@example.com',
        source: 'google' as const,
        googleResourceName: 'people/c999',
        googleEtag: 'etag111',
        lastSyncedAt: new Date(),
      };

      await service.updateContact(contactId, userId, googleData);

      // Verify user notes were preserved
      expect(mockRepository.update).toHaveBeenCalledWith(contactId, userId, expect.objectContaining({
        customNotes: 'Friend from college. Loves hiking.',
      }));
    });
  });

  describe('importFromGoogleContacts', () => {
    it('should extract name, phone, and email from Google contacts', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';

      // Mock no existing contacts
      vi.mocked(mockRepository.findByGoogleResourceName).mockResolvedValue(null);
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // Mock Google People API response
      const mockPeople = {
        people: {
          connections: {
            list: vi.fn().mockResolvedValue({
              data: {
                connections: [
                  {
                    resourceName: 'people/c123',
                    etag: 'etag123',
                    names: [{ displayName: 'John Doe' }],
                    emailAddresses: [{ value: 'john@example.com' }],
                    phoneNumbers: [{ value: '+1234567890' }],
                  },
                ],
              },
            }),
          },
        },
      };

      const { google } = await import('googleapis');
      vi.mocked(google.people).mockReturnValue(mockPeople as any);

      // Mock repository create
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: 'contact-1',
        userId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        source: 'google',
        googleResourceName: 'people/c123',
        googleEtag: 'etag123',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.importFromGoogleContacts(userId, accessToken);

      expect(result.imported).toHaveLength(1);
      expect(result.imported[0].name).toBe('John Doe');
      expect(result.imported[0].email).toBe('john@example.com');
      expect(result.imported[0].phone).toBe('+1234567890');
      expect(result.imported[0].source).toBe('google');
      expect(result.duplicates).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should deduplicate contacts based on email', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';

      // Mock existing contacts with matching email
      const existingContact: Contact = {
        id: 'existing-1',
        userId,
        name: 'John Existing',
        email: 'john@example.com',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock no match by resource name, but match by email
      vi.mocked(mockRepository.findByGoogleResourceName).mockResolvedValue(null);
      vi.mocked(mockRepository.findAll).mockResolvedValue([existingContact]);
      vi.mocked(mockRepository.findById).mockResolvedValue(existingContact);

      // Mock update to return updated contact
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...existingContact,
        name: 'John Doe',
        phone: '+1234567890',
        source: 'google',
        googleResourceName: 'people/c123',
        googleEtag: 'etag123',
      });

      // Mock Google People API response with duplicate email
      const mockPeople = {
        people: {
          connections: {
            list: vi.fn().mockResolvedValue({
              data: {
                connections: [
                  {
                    resourceName: 'people/c123',
                    etag: 'etag123',
                    names: [{ displayName: 'John Doe' }],
                    emailAddresses: [{ value: 'john@example.com' }],
                    phoneNumbers: [{ value: '+1234567890' }],
                  },
                ],
              },
            }),
          },
        },
      };

      const { google } = await import('googleapis');
      vi.mocked(google.people).mockReturnValue(mockPeople as any);

      const result = await service.importFromGoogleContacts(userId, accessToken);

      // Should update existing contact, not create duplicate
      expect(result.imported).toHaveLength(1);
      expect(result.imported[0].email).toBe('john@example.com');
      expect(mockRepository.update).toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(result.errors).toHaveLength(0);
    });

    it('should deduplicate contacts based on phone number', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';

      // Mock existing contacts with matching phone
      const existingContact: Contact = {
        id: 'existing-1',
        userId,
        name: 'John Existing',
        phone: '+1234567890',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock no match by resource name or email, but match by phone
      vi.mocked(mockRepository.findByGoogleResourceName).mockResolvedValue(null);
      vi.mocked(mockRepository.findAll).mockResolvedValue([existingContact]);
      vi.mocked(mockRepository.findById).mockResolvedValue(existingContact);

      // Mock update to return updated contact
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...existingContact,
        name: 'John Doe',
        email: 'different@example.com',
        phone: '(123) 456-7890',
        source: 'google',
        googleResourceName: 'people/c123',
        googleEtag: 'etag123',
      });

      // Mock Google People API response with duplicate phone (different format)
      const mockPeople = {
        people: {
          connections: {
            list: vi.fn().mockResolvedValue({
              data: {
                connections: [
                  {
                    resourceName: 'people/c123',
                    etag: 'etag123',
                    names: [{ displayName: 'John Doe' }],
                    emailAddresses: [{ value: 'different@example.com' }],
                    phoneNumbers: [{ value: '(123) 456-7890' }], // Different format, same number
                  },
                ],
              },
            }),
          },
        },
      };

      const { google } = await import('googleapis');
      vi.mocked(google.people).mockReturnValue(mockPeople as any);

      const result = await service.importFromGoogleContacts(userId, accessToken);

      // Should update existing contact, not create duplicate
      expect(result.imported).toHaveLength(1);
      expect(mockRepository.update).toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(result.errors).toHaveLength(0);
    });

    it('should handle contacts without names by skipping them', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';

      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // Mock Google People API response with contact without name
      const mockPeople = {
        people: {
          connections: {
            list: vi.fn().mockResolvedValue({
              data: {
                connections: [
                  {
                    emailAddresses: [{ value: 'noname@example.com' }],
                    phoneNumbers: [{ value: '+1234567890' }],
                  },
                ],
              },
            }),
          },
        },
      };

      const { google } = await import('googleapis');
      vi.mocked(google.people).mockReturnValue(mockPeople as any);

      const result = await service.importFromGoogleContacts(userId, accessToken);

      expect(result.imported).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should extract LinkedIn URLs from contact URLs', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';

      vi.mocked(mockRepository.findByGoogleResourceName).mockResolvedValue(null);
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // Mock Google People API response with LinkedIn URL
      const mockPeople = {
        people: {
          connections: {
            list: vi.fn().mockResolvedValue({
              data: {
                connections: [
                  {
                    resourceName: 'people/c123',
                    etag: 'etag123',
                    names: [{ displayName: 'John Doe' }],
                    emailAddresses: [{ value: 'john@example.com' }],
                    urls: [{ value: 'https://www.linkedin.com/in/johndoe' }],
                  },
                ],
              },
            }),
          },
        },
      };

      const { google } = await import('googleapis');
      vi.mocked(google.people).mockReturnValue(mockPeople as any);

      vi.mocked(mockRepository.create).mockResolvedValue({
        id: 'contact-1',
        userId,
        name: 'John Doe',
        email: 'john@example.com',
        linkedIn: 'https://www.linkedin.com/in/johndoe',
        source: 'google',
        googleResourceName: 'people/c123',
        googleEtag: 'etag123',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.importFromGoogleContacts(userId, accessToken);

      expect(result.imported).toHaveLength(1);
      expect(mockRepository.create).toHaveBeenCalledWith(userId, expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com',
        phone: undefined,
        linkedIn: 'https://www.linkedin.com/in/johndoe',
        customNotes: undefined,
        source: 'google',
        googleResourceName: 'people/c123',
        googleEtag: 'etag123',
      }));
    });
  });
});
