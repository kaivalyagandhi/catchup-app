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
      delete: vi.fn(),
      archive: vi.fn(),
    };

    service = new ImportServiceImpl(mockRepository);
  });

  describe('importFromGoogleContacts', () => {
    it('should extract name, phone, and email from Google contacts', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';

      // Mock existing contacts (empty)
      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // Mock Google People API response
      const mockPeople = {
        people: {
          connections: {
            list: vi.fn().mockResolvedValue({
              data: {
                connections: [
                  {
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

      vi.mocked(mockRepository.findAll).mockResolvedValue([existingContact]);

      // Mock Google People API response with duplicate email
      const mockPeople = {
        people: {
          connections: {
            list: vi.fn().mockResolvedValue({
              data: {
                connections: [
                  {
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

      expect(result.imported).toHaveLength(0);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].email).toBe('john@example.com');
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

      vi.mocked(mockRepository.findAll).mockResolvedValue([existingContact]);

      // Mock Google People API response with duplicate phone (different format)
      const mockPeople = {
        people: {
          connections: {
            list: vi.fn().mockResolvedValue({
              data: {
                connections: [
                  {
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

      expect(result.imported).toHaveLength(0);
      expect(result.duplicates).toHaveLength(1);
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

      vi.mocked(mockRepository.findAll).mockResolvedValue([]);

      // Mock Google People API response with LinkedIn URL
      const mockPeople = {
        people: {
          connections: {
            list: vi.fn().mockResolvedValue({
              data: {
                connections: [
                  {
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
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.importFromGoogleContacts(userId, accessToken);

      expect(result.imported).toHaveLength(1);
      expect(mockRepository.create).toHaveBeenCalledWith(userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phone: undefined,
        linkedIn: 'https://www.linkedin.com/in/johndoe',
        customNotes: undefined,
      });
    });
  });
});
