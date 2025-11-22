/**
 * Setup Flow Service
 *
 * Orchestrates the initial onboarding process for new users.
 * Guides users through contact import, calendar connection,
 * availability configuration, and notification preferences.
 */

import { OnboardingService, OnboardingServiceImpl, ImportPreview, ArchivalSelection } from './onboarding-service';
import { CalendarFriendService, CalendarFriendServiceImpl, FrequentContact } from './calendar-friend-service';
import { AvailabilityParams, NotificationPreferences, DateRange } from '../types';
import * as calendarService from '../calendar/calendar-service';
import * as availabilityService from '../calendar/availability-service';
import * as notificationPreferencesService from '../notifications/preferences-service';

export interface SetupFlowStep {
  step: 'contact_import' | 'calendar_connection' | 'availability_params' | 'notification_prefs' | 'complete';
  completed: boolean;
  data?: any;
}

export interface SetupFlowState {
  userId: string;
  currentStep: SetupFlowStep['step'];
  steps: SetupFlowStep[];
  contactImportCompleted: boolean;
  calendarConnectionCompleted: boolean;
  availabilityParamsCompleted: boolean;
  notificationPrefsCompleted: boolean;
}

export interface ContactImportOptions {
  method: 'google' | 'manual';
  accessToken?: string;
  refreshToken?: string;
}

export interface CalendarConnectionOptions {
  accessToken: string;
  refreshToken?: string;
  selectedCalendarIds?: string[];
}

export interface SetupFlowService {
  initializeSetupFlow(userId: string): SetupFlowState;
  
  // Step 1: Contact Import
  importContacts(
    userId: string,
    options: ContactImportOptions
  ): Promise<ImportPreview>;
  
  applyContactArchival(
    userId: string,
    selections: ArchivalSelection[]
  ): Promise<void>;
  
  // Step 2: Calendar Connection
  connectCalendar(
    userId: string,
    options: CalendarConnectionOptions
  ): Promise<void>;
  
  suggestFriendsFromCalendar(
    userId: string,
    accessToken: string,
    dateRange: DateRange,
    refreshToken?: string
  ): Promise<FrequentContact[]>;
  
  // Step 3: Availability Parameters
  configureAvailability(
    userId: string,
    params: AvailabilityParams
  ): Promise<void>;
  
  // Step 4: Notification Preferences
  configureNotifications(
    userId: string,
    prefs: NotificationPreferences
  ): Promise<void>;
  
  // Complete setup
  completeSetup(userId: string): Promise<void>;
}

/**
 * Setup Flow Service Implementation
 */
export class SetupFlowServiceImpl implements SetupFlowService {
  private onboardingService: OnboardingService;
  private calendarFriendService: CalendarFriendService;

  constructor(
    onboardingService?: OnboardingService,
    calendarFriendService?: CalendarFriendService
  ) {
    this.onboardingService = onboardingService || new OnboardingServiceImpl();
    this.calendarFriendService = calendarFriendService || new CalendarFriendServiceImpl();
  }

  /**
   * Initialize setup flow for a new user
   * Requirements: 18.1, 18.6, 18.7, 18.8
   */
  initializeSetupFlow(userId: string): SetupFlowState {
    return {
      userId,
      currentStep: 'contact_import',
      steps: [
        { step: 'contact_import', completed: false },
        { step: 'calendar_connection', completed: false },
        { step: 'availability_params', completed: false },
        { step: 'notification_prefs', completed: false },
        { step: 'complete', completed: false },
      ],
      contactImportCompleted: false,
      calendarConnectionCompleted: false,
      availabilityParamsCompleted: false,
      notificationPrefsCompleted: false,
    };
  }

  /**
   * Import contacts from Google or allow manual entry
   * Requirements: 18.1, 19.1, 19.2, 19.3
   */
  async importContacts(
    userId: string,
    options: ContactImportOptions
  ): Promise<ImportPreview> {
    if (options.method === 'google') {
      if (!options.accessToken) {
        throw new Error('Access token required for Google Contacts import');
      }

      return await this.onboardingService.previewGoogleContactsImport(
        userId,
        options.accessToken
      );
    } else {
      // Manual entry - return empty preview
      return {
        contacts: [],
        duplicateCount: 0,
        errorCount: 0,
      };
    }
  }

  /**
   * Apply archival selections to imported contacts
   * Requirements: 18.2, 18.3, 18.4, 18.5
   */
  async applyContactArchival(
    userId: string,
    selections: ArchivalSelection[]
  ): Promise<void> {
    await this.onboardingService.applyArchivalSelections(userId, selections);
  }

  /**
   * Connect Google Calendar and select calendars
   * Requirements: 18.6
   */
  async connectCalendar(
    userId: string,
    options: CalendarConnectionOptions
  ): Promise<void> {
    // Sync calendars from Google
    await calendarService.syncCalendarsFromGoogle(
      userId,
      options.accessToken,
      options.refreshToken
    );

    // If calendar IDs are provided, set them as selected
    if (options.selectedCalendarIds && options.selectedCalendarIds.length > 0) {
      await calendarService.setSelectedCalendars(userId, options.selectedCalendarIds);
    }
  }

  /**
   * Suggest friends based on calendar event frequency
   * Requirements: 19.6
   */
  async suggestFriendsFromCalendar(
    userId: string,
    accessToken: string,
    dateRange: DateRange,
    refreshToken?: string
  ): Promise<FrequentContact[]> {
    return await this.calendarFriendService.identifyFrequentContacts(
      userId,
      accessToken,
      dateRange,
      refreshToken
    );
  }

  /**
   * Configure availability parameters
   * Requirements: 18.7, 20.1, 20.2, 20.3, 20.4
   */
  async configureAvailability(
    userId: string,
    params: AvailabilityParams
  ): Promise<void> {
    await availabilityService.setAvailabilityParams(userId, params);
  }

  /**
   * Configure notification preferences
   * Requirements: 18.8, 12.2, 12.3
   */
  async configureNotifications(
    userId: string,
    prefs: NotificationPreferences
  ): Promise<void> {
    await notificationPreferencesService.setNotificationPreferences(userId, prefs);
  }

  /**
   * Complete the setup flow
   * Marks the onboarding as complete
   */
  async completeSetup(userId: string): Promise<void> {
    // In a real implementation, we might store a flag in the database
    // indicating that the user has completed onboarding
    console.log(`Setup completed for user ${userId}`);
  }
}

// Export singleton instance
export const setupFlowService = new SetupFlowServiceImpl();
