/**
 * Setup Flow Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SetupFlowServiceImpl } from './setup-flow-service';
import { OnboardingService } from './onboarding-service';
import { CalendarFriendService } from './calendar-friend-service';
import { AvailabilityParams, NotificationPreferences, DateRange } from '../types';

// Mock calendar service
vi.mock('../calendar/calendar-service', () => ({
  syncCalendarsFromGoogle: vi.fn(),
  setSelectedCalendars: vi.fn(),
}));

// Mock availability service
vi.mock('../calendar/availability-service', () => ({
  setAvailabilityParams: vi.fn(),
}));

// Mock notification preferences service
vi.mock('../notifications/preferences-service', () => ({
  setNotificationPreferences: vi.fn(),
}));

describe('SetupFlowService', () => {
  let service: SetupFlowServiceImpl;
  let mockOnboardingService: OnboardingService;
  let mockCalendarFriendService: CalendarFriendService;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    mockOnboardingService = {
      previewGoogleContactsImport: vi.fn(),
      applyArchivalSelections: vi.fn(),
      restoreArchivedContact: vi.fn(),
    };

    mockCalendarFriendService = {
      identifyFrequentContacts: vi.fn(),
    };

    service = new SetupFlowServiceImpl(mockOnboardingService, mockCalendarFriendService);
  });

  describe('initializeSetupFlow', () => {
    it('should create initial setup flow state', () => {
      const userId = 'user-1';
      const state = service.initializeSetupFlow(userId);

      expect(state.userId).toBe(userId);
      expect(state.currentStep).toBe('contact_import');
      expect(state.steps).toHaveLength(5);
      expect(state.contactImportCompleted).toBe(false);
      expect(state.calendarConnectionCompleted).toBe(false);
      expect(state.availabilityParamsCompleted).toBe(false);
      expect(state.notificationPrefsCompleted).toBe(false);
    });

    it('should have all steps in correct order', () => {
      const userId = 'user-1';
      const state = service.initializeSetupFlow(userId);

      expect(state.steps[0].step).toBe('contact_import');
      expect(state.steps[1].step).toBe('calendar_connection');
      expect(state.steps[2].step).toBe('availability_params');
      expect(state.steps[3].step).toBe('notification_prefs');
      expect(state.steps[4].step).toBe('complete');
    });
  });

  describe('importContacts', () => {
    it('should import contacts from Google', async () => {
      const userId = 'user-1';
      const options = {
        method: 'google' as const,
        accessToken: 'mock-token',
      };

      const mockPreview = {
        contacts: [],
        duplicateCount: 0,
        errorCount: 0,
      };

      vi.mocked(mockOnboardingService.previewGoogleContactsImport).mockResolvedValue(mockPreview);

      const result = await service.importContacts(userId, options);

      expect(result).toEqual(mockPreview);
      expect(mockOnboardingService.previewGoogleContactsImport).toHaveBeenCalledWith(
        userId,
        'mock-token'
      );
    });

    it('should throw error if Google import without access token', async () => {
      const userId = 'user-1';
      const options = {
        method: 'google' as const,
      };

      await expect(service.importContacts(userId, options)).rejects.toThrow(
        'Access token required for Google Contacts import'
      );
    });

    it('should return empty preview for manual entry', async () => {
      const userId = 'user-1';
      const options = {
        method: 'manual' as const,
      };

      const result = await service.importContacts(userId, options);

      expect(result.contacts).toHaveLength(0);
      expect(result.duplicateCount).toBe(0);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('applyContactArchival', () => {
    it('should apply archival selections', async () => {
      const userId = 'user-1';
      const selections = [
        { contactId: 'contact-1', archive: true },
        { contactId: 'contact-2', archive: false },
      ];

      await service.applyContactArchival(userId, selections);

      expect(mockOnboardingService.applyArchivalSelections).toHaveBeenCalledWith(
        userId,
        selections
      );
    });
  });

  describe('connectCalendar', () => {
    it('should sync calendars and set selected calendars', async () => {
      const userId = 'user-1';
      const options = {
        accessToken: 'mock-token',
        selectedCalendarIds: ['cal-1', 'cal-2'],
      };

      const calendarService = await import('../calendar/calendar-service');

      await service.connectCalendar(userId, options);

      expect(calendarService.syncCalendarsFromGoogle).toHaveBeenCalledWith(
        userId,
        'mock-token',
        undefined
      );
      expect(calendarService.setSelectedCalendars).toHaveBeenCalledWith(userId, [
        'cal-1',
        'cal-2',
      ]);
    });

    it('should sync calendars without setting selection if not provided', async () => {
      const userId = 'user-1';
      const options = {
        accessToken: 'mock-token',
      };

      const calendarService = await import('../calendar/calendar-service');

      await service.connectCalendar(userId, options);

      expect(calendarService.syncCalendarsFromGoogle).toHaveBeenCalledWith(
        userId,
        'mock-token',
        undefined
      );
      expect(calendarService.setSelectedCalendars).not.toHaveBeenCalled();
    });
  });

  describe('suggestFriendsFromCalendar', () => {
    it('should identify frequent contacts from calendar', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';
      const dateRange: DateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
        timezone: 'UTC',
      };

      const mockContacts = [
        { email: 'john@example.com', name: 'John Doe', frequency: 5 },
      ];

      vi.mocked(mockCalendarFriendService.identifyFrequentContacts).mockResolvedValue(
        mockContacts
      );

      const result = await service.suggestFriendsFromCalendar(userId, accessToken, dateRange);

      expect(result).toEqual(mockContacts);
      expect(mockCalendarFriendService.identifyFrequentContacts).toHaveBeenCalledWith(
        userId,
        accessToken,
        dateRange,
        undefined
      );
    });
  });

  describe('configureAvailability', () => {
    it('should set availability parameters', async () => {
      const userId = 'user-1';
      const params: AvailabilityParams = {
        manualTimeBlocks: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        ],
      };

      const availabilityService = await import('../calendar/availability-service');

      await service.configureAvailability(userId, params);

      expect(availabilityService.setAvailabilityParams).toHaveBeenCalledWith(userId, params);
    });
  });

  describe('configureNotifications', () => {
    it('should set notification preferences', async () => {
      const userId = 'user-1';
      const prefs: NotificationPreferences = {
        smsEnabled: true,
        emailEnabled: false,
        batchDay: 0,
        batchTime: '09:00',
        timezone: 'America/New_York',
      };

      const notificationPreferencesService = await import(
        '../notifications/preferences-service'
      );

      await service.configureNotifications(userId, prefs);

      expect(notificationPreferencesService.setNotificationPreferences).toHaveBeenCalledWith(
        userId,
        prefs
      );
    });
  });

  describe('completeSetup', () => {
    it('should complete setup without errors', async () => {
      const userId = 'user-1';

      await expect(service.completeSetup(userId)).resolves.not.toThrow();
    });
  });
});
