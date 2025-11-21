/**
 * Notification Preferences Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationPreferencesServiceImpl } from './preferences-service';
import { NotificationPreferences } from '../types';

// Mock the repository
vi.mock('./preferences-repository');

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationPreferencesServiceImpl();
  });

  describe('getPreferences', () => {
    it('should return user preferences if they exist', async () => {
      const mockPreferences: NotificationPreferences = {
        smsEnabled: true,
        emailEnabled: false,
        batchDay: 0,
        batchTime: '09:00',
        timezone: 'America/New_York',
      };

      const preferencesRepository = await import('./preferences-repository');
      vi.mocked(preferencesRepository.getPreferences).mockResolvedValue(mockPreferences);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual(mockPreferences);
      expect(preferencesRepository.getPreferences).toHaveBeenCalledWith('user-1');
    });

    it('should return default preferences if none exist', async () => {
      const defaultPreferences: NotificationPreferences = {
        smsEnabled: true,
        emailEnabled: false,
        batchDay: 0,
        batchTime: '09:00',
        timezone: 'America/New_York',
      };

      const preferencesRepository = await import('./preferences-repository');
      vi.mocked(preferencesRepository.getPreferences).mockResolvedValue(null);
      vi.mocked(preferencesRepository.getDefaultPreferences).mockReturnValue(defaultPreferences);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual(defaultPreferences);
    });
  });

  describe('setPreferences', () => {
    it('should set valid preferences', async () => {
      const preferences: NotificationPreferences = {
        smsEnabled: true,
        emailEnabled: true,
        batchDay: 0,
        batchTime: '09:00',
        timezone: 'America/New_York',
      };

      const preferencesRepository = await import('./preferences-repository');
      vi.mocked(preferencesRepository.setPreferences).mockResolvedValue(preferences);

      const result = await service.setPreferences('user-1', preferences);

      expect(result).toEqual(preferences);
      expect(preferencesRepository.setPreferences).toHaveBeenCalledWith('user-1', preferences);
    });

    it('should reject invalid batch day', async () => {
      const preferences: NotificationPreferences = {
        smsEnabled: true,
        emailEnabled: false,
        batchDay: 7, // Invalid
        batchTime: '09:00',
        timezone: 'America/New_York',
      };

      await expect(service.setPreferences('user-1', preferences)).rejects.toThrow(
        'Batch day must be between 0 (Sunday) and 6 (Saturday)'
      );
    });

    it('should reject invalid batch time format', async () => {
      const preferences: NotificationPreferences = {
        smsEnabled: true,
        emailEnabled: false,
        batchDay: 0,
        batchTime: '9:00', // Invalid format (should be 09:00)
        timezone: 'America/New_York',
      };

      await expect(service.setPreferences('user-1', preferences)).rejects.toThrow(
        'Batch time must be in HH:mm format'
      );
    });

    it('should reject empty timezone', async () => {
      const preferences: NotificationPreferences = {
        smsEnabled: true,
        emailEnabled: false,
        batchDay: 0,
        batchTime: '09:00',
        timezone: '',
      };

      await expect(service.setPreferences('user-1', preferences)).rejects.toThrow(
        'Timezone is required'
      );
    });

    it('should reject when both channels are disabled', async () => {
      const preferences: NotificationPreferences = {
        smsEnabled: false,
        emailEnabled: false,
        batchDay: 0,
        batchTime: '09:00',
        timezone: 'America/New_York',
      };

      await expect(service.setPreferences('user-1', preferences)).rejects.toThrow(
        'At least one notification channel (SMS or email) must be enabled'
      );
    });
  });

  describe('updatePreferences', () => {
    it('should update partial preferences', async () => {
      const currentPreferences: NotificationPreferences = {
        smsEnabled: true,
        emailEnabled: false,
        batchDay: 0,
        batchTime: '09:00',
        timezone: 'America/New_York',
      };

      const updates = {
        emailEnabled: true,
        batchTime: '10:00',
      };

      const expectedResult: NotificationPreferences = {
        ...currentPreferences,
        ...updates,
      };

      const preferencesRepository = await import('./preferences-repository');
      vi.mocked(preferencesRepository.getPreferences).mockResolvedValue(currentPreferences);
      vi.mocked(preferencesRepository.setPreferences).mockResolvedValue(expectedResult);

      const result = await service.updatePreferences('user-1', updates);

      expect(result).toEqual(expectedResult);
      expect(preferencesRepository.setPreferences).toHaveBeenCalledWith('user-1', expectedResult);
    });

    it('should validate merged preferences', async () => {
      const currentPreferences: NotificationPreferences = {
        smsEnabled: true,
        emailEnabled: false,
        batchDay: 0,
        batchTime: '09:00',
        timezone: 'America/New_York',
      };

      const updates = {
        smsEnabled: false, // This would disable both channels
      };

      const preferencesRepository = await import('./preferences-repository');
      vi.mocked(preferencesRepository.getPreferences).mockResolvedValue(currentPreferences);

      await expect(service.updatePreferences('user-1', updates)).rejects.toThrow(
        'At least one notification channel (SMS or email) must be enabled'
      );
    });
  });
});
