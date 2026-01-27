/**
 * User Preferences Service
 *
 * Business logic layer for managing user preferences including timezone settings.
 */

import pool from '../db/connection';
import { timezoneService } from '../calendar/timezone-service';

/**
 * User Preferences Interface
 */
export interface UserPreferences {
  userId: string;
  timezone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User Preferences Service Interface
 */
export interface IUserPreferencesService {
  getTimezone(userId: string): Promise<string>;
  setTimezone(userId: string, timezone: string): Promise<void>;
  getPreferences(userId: string): Promise<UserPreferences | null>;
  updatePreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences>;
}

/**
 * User Preferences Service Implementation
 */
export class UserPreferencesService implements IUserPreferencesService {
  /**
   * Get timezone preference for a user
   * 
   * @param userId - User ID
   * @returns IANA timezone identifier (defaults to 'UTC' if not set)
   */
  async getTimezone(userId: string): Promise<string> {
    try {
      const result = await pool.query(
        'SELECT timezone FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error(`User not found: ${userId}`);
      }

      return result.rows[0].timezone || 'UTC';
    } catch (error) {
      console.error('Error getting user timezone:', error);
      throw error;
    }
  }

  /**
   * Set timezone preference for a user
   * 
   * @param userId - User ID
   * @param timezone - IANA timezone identifier
   * @throws Error if timezone is invalid
   */
  async setTimezone(userId: string, timezone: string): Promise<void> {
    // Validate timezone is valid IANA identifier
    if (!this.isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    try {
      const result = await pool.query(
        'UPDATE users SET timezone = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        [timezone, userId]
      );

      if (result.rowCount === 0) {
        throw new Error(`User not found: ${userId}`);
      }
    } catch (error) {
      console.error('Error setting user timezone:', error);
      throw error;
    }
  }

  /**
   * Get all preferences for a user
   * 
   * @param userId - User ID
   * @returns User preferences or null if user not found
   */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const result = await pool.query(
        'SELECT id as "userId", timezone, created_at as "createdAt", updated_at as "updatedAt" FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user preferences (partial update)
   * 
   * @param userId - User ID
   * @param updates - Partial preferences to update
   * @returns Updated preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    // Validate timezone if provided
    if (updates.timezone && !this.isValidTimezone(updates.timezone)) {
      throw new Error(`Invalid timezone: ${updates.timezone}`);
    }

    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.timezone !== undefined) {
        updateFields.push(`timezone = $${paramIndex++}`);
        values.push(updates.timezone);
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = NOW()`);

      // Add userId as the last parameter
      values.push(userId);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id as "userId", timezone, created_at as "createdAt", updated_at as "updatedAt"
      `;

      const result = await pool.query(query, values);

      if (result.rowCount === 0) {
        throw new Error(`User not found: ${userId}`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Validate if a string is a valid IANA timezone identifier
   * 
   * @param timezone - Timezone string to validate
   * @returns true if valid, false otherwise
   */
  private isValidTimezone(timezone: string): boolean {
    return timezoneService.isValidTimezone(timezone);
  }

  /**
   * Auto-detect timezone from browser (to be called from frontend)
   * This is a helper method that returns the browser's detected timezone
   * 
   * @returns Browser's timezone identifier
   */
  static detectBrowserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }
}

// Export singleton instance
export const userPreferencesService = new UserPreferencesService();

// Convenience functions for direct use
export async function getUserTimezone(userId: string): Promise<string> {
  return userPreferencesService.getTimezone(userId);
}

export async function setUserTimezone(userId: string, timezone: string): Promise<void> {
  return userPreferencesService.setTimezone(userId, timezone);
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  return userPreferencesService.getPreferences(userId);
}

export async function updateUserPreferences(
  userId: string,
  updates: Partial<UserPreferences>
): Promise<UserPreferences> {
  return userPreferencesService.updatePreferences(userId, updates);
}
