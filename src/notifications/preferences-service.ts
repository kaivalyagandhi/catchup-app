/**
 * Notification Preferences Service
 *
 * Business logic layer for managing notification preferences.
 */

import { NotificationPreferences } from '../types';
import * as preferencesRepository from './preferences-repository';

/**
 * Notification Preferences Service Interface
 */
export interface NotificationPreferencesService {
  getPreferences(userId: string): Promise<NotificationPreferences>;
  setPreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<NotificationPreferences>;
  updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences>;
}

/**
 * Notification Preferences Service Implementation
 */
export class NotificationPreferencesServiceImpl implements NotificationPreferencesService {
  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const preferences = await preferencesRepository.getPreferences(userId);

    // Return default preferences if none exist
    if (!preferences) {
      return preferencesRepository.getDefaultPreferences();
    }

    return preferences;
  }

  /**
   * Set notification preferences for a user
   */
  async setPreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<NotificationPreferences> {
    // Validate preferences
    this.validatePreferences(preferences);

    return await preferencesRepository.setPreferences(userId, preferences);
  }

  /**
   * Update notification preferences for a user (partial update)
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    // Get current preferences
    const current = await this.getPreferences(userId);

    // Merge with updates
    const updated: NotificationPreferences = {
      ...current,
      ...updates,
    };

    // Validate merged preferences
    this.validatePreferences(updated);

    return await preferencesRepository.setPreferences(userId, updated);
  }

  /**
   * Validate notification preferences
   */
  private validatePreferences(preferences: NotificationPreferences): void {
    // Validate batch day (0-6 for Sunday-Saturday)
    if (preferences.batchDay < 0 || preferences.batchDay > 6) {
      throw new Error('Batch day must be between 0 (Sunday) and 6 (Saturday)');
    }

    // Validate batch time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(preferences.batchTime)) {
      throw new Error('Batch time must be in HH:mm format (e.g., "09:00")');
    }

    // Validate timezone (basic check - should be IANA timezone)
    if (!preferences.timezone || preferences.timezone.trim().length === 0) {
      throw new Error('Timezone is required');
    }

    // At least one channel must be enabled
    if (!preferences.smsEnabled && !preferences.emailEnabled) {
      throw new Error('At least one notification channel (SMS or email) must be enabled');
    }
  }
}

// Export singleton instance
export const notificationPreferencesService = new NotificationPreferencesServiceImpl();

// Convenience functions for direct use
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  return notificationPreferencesService.getPreferences(userId);
}

export async function setNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences
): Promise<NotificationPreferences> {
  return notificationPreferencesService.setPreferences(userId, preferences);
}
