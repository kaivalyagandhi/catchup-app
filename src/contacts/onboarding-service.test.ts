/**
 * Onboarding Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OnboardingServiceImpl } from './onboarding-service';
import { ImportService } from './import-service';
import { ContactRepository } from './repository';
import { Contact } from '../types';

describe('OnboardingService', () => {
  let service: OnboardingServiceImpl;
  let mockImportService: ImportService;
  let mockRepository: ContactRepository;

  beforeEach(() => {
    mockImportService = {
      importFromGoogleContacts: vi.fn(),
    };

    mockRepository = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      delete: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
    };

    service = new OnboardingServiceImpl(mockImportService, mockRepository);
  });

  describe('previewGoogleContactsImport', () => {
    it('should return imported contacts with counts', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';

      const mockContact: Contact = {
        id: 'contact-1',
        userId,
        name: 'John Doe',
        email: 'john@example.com',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockImportService.importFromGoogleContacts).mockResolvedValue({
        imported: [mockContact],
        duplicates: [{ name: 'Jane Doe', email: 'jane@example.com' }],
        errors: [],
      });

      const result = await service.previewGoogleContactsImport(userId, accessToken);

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].name).toBe('John Doe');
      expect(result.duplicateCount).toBe(1);
      expect(result.errorCount).toBe(0);
    });

    it('should handle import errors', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';

      vi.mocked(mockImportService.importFromGoogleContacts).mockResolvedValue({
        imported: [],
        duplicates: [],
        errors: [
          { contact: { name: 'Error Contact' }, error: 'Validation failed' },
          { contact: { name: 'Another Error' }, error: 'Network error' },
        ],
      });

      const result = await service.previewGoogleContactsImport(userId, accessToken);

      expect(result.contacts).toHaveLength(0);
      expect(result.duplicateCount).toBe(0);
      expect(result.errorCount).toBe(2);
    });
  });

  describe('applyArchivalSelections', () => {
    it('should archive contacts marked as not relevant', async () => {
      const userId = 'user-1';
      const selections = [
        { contactId: 'contact-1', archive: true },
        { contactId: 'contact-2', archive: false },
        { contactId: 'contact-3', archive: true },
      ];

      await service.applyArchivalSelections(userId, selections);

      expect(mockRepository.archive).toHaveBeenCalledTimes(2);
      expect(mockRepository.archive).toHaveBeenCalledWith('contact-1', userId);
      expect(mockRepository.archive).toHaveBeenCalledWith('contact-3', userId);
      expect(mockRepository.archive).not.toHaveBeenCalledWith('contact-2', userId);
    });

    it('should handle empty selections', async () => {
      const userId = 'user-1';
      const selections: any[] = [];

      await service.applyArchivalSelections(userId, selections);

      expect(mockRepository.archive).not.toHaveBeenCalled();
    });

    it('should archive all contacts if all are marked', async () => {
      const userId = 'user-1';
      const selections = [
        { contactId: 'contact-1', archive: true },
        { contactId: 'contact-2', archive: true },
      ];

      await service.applyArchivalSelections(userId, selections);

      expect(mockRepository.archive).toHaveBeenCalledTimes(2);
    });
  });

  describe('restoreArchivedContact', () => {
    it('should unarchive a contact and return it', async () => {
      const userId = 'user-1';
      const contactId = 'contact-1';

      const mockContact: Contact = {
        id: contactId,
        userId,
        name: 'John Doe',
        email: 'john@example.com',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockContact);

      const result = await service.restoreArchivedContact(userId, contactId);

      expect(mockRepository.unarchive).toHaveBeenCalledWith(contactId, userId);
      expect(result).toEqual(mockContact);
      expect(result.archived).toBe(false);
    });

    it('should throw error if contact not found', async () => {
      const userId = 'user-1';
      const contactId = 'nonexistent';

      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.restoreArchivedContact(userId, contactId)).rejects.toThrow(
        'Contact not found'
      );
    });
  });
});
