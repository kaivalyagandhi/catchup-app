/**
 * Scheduling Preferences Repository
 *
 * Data access layer for user scheduling preferences and privacy settings.
 * Requirements: 16.7, 16.11, 8.5, 8.6, 8.8
 */

import pool from '../db/connection';
import {
  SchedulingPreferences,
  ActivityType,
  TimeRange,
  CalendarSharingSettings,
} from '../types/scheduling';

/**
 * Get user scheduling preferences
 */
export async function getPreferences(userId: string): Promise<SchedulingPreferences | null> {
  const result = await pool.query(`SELECT * FROM scheduling_preferences WHERE user_id = $1`, [
    userId,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapPreferencesRow(result.rows[0]);
}

/**
 * Save or update user scheduling preferences
 */
export async function savePreferences(data: {
  userId: string;
  preferredDays?: number[];
  preferredTimeRanges?: TimeRange[];
  preferredDurations?: number[];
  favoriteLocations?: string[];
  defaultActivityType?: ActivityType;
  applyByDefault?: boolean;
}): Promise<SchedulingPreferences> {
  const result = await pool.query(
    `INSERT INTO scheduling_preferences (
      user_id, preferred_days, preferred_time_ranges, preferred_durations,
      favorite_locations, default_activity_type, apply_by_default
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      preferred_days = COALESCE(EXCLUDED.preferred_days, scheduling_preferences.preferred_days),
      preferred_time_ranges = COALESCE(EXCLUDED.preferred_time_ranges, scheduling_preferences.preferred_time_ranges),
      preferred_durations = COALESCE(EXCLUDED.preferred_durations, scheduling_preferences.preferred_durations),
      favorite_locations = COALESCE(EXCLUDED.favorite_locations, scheduling_preferences.favorite_locations),
      default_activity_type = COALESCE(EXCLUDED.default_activity_type, scheduling_preferences.default_activity_type),
      apply_by_default = COALESCE(EXCLUDED.apply_by_default, scheduling_preferences.apply_by_default),
      updated_at = NOW()
    RETURNING *`,
    [
      data.userId,
      data.preferredDays ? JSON.stringify(data.preferredDays) : '[]',
      data.preferredTimeRanges ? JSON.stringify(data.preferredTimeRanges) : '[]',
      data.preferredDurations ? JSON.stringify(data.preferredDurations) : '[60]',
      data.favoriteLocations ? JSON.stringify(data.favoriteLocations) : '[]',
      data.defaultActivityType || null,
      data.applyByDefault ?? false,
    ]
  );

  return mapPreferencesRow(result.rows[0]);
}

/**
 * Delete user scheduling preferences
 */
export async function deletePreferences(userId: string): Promise<void> {
  await pool.query(`DELETE FROM scheduling_preferences WHERE user_id = $1`, [userId]);
}

/**
 * Add a favorite location
 */
export async function addFavoriteLocation(
  userId: string,
  location: string
): Promise<SchedulingPreferences> {
  const result = await pool.query(
    `INSERT INTO scheduling_preferences (user_id, favorite_locations)
     VALUES ($1, $2)
     ON CONFLICT (user_id) 
     DO UPDATE SET 
       favorite_locations = (
         SELECT jsonb_agg(DISTINCT elem)
         FROM (
           SELECT jsonb_array_elements(COALESCE(scheduling_preferences.favorite_locations, '[]'::jsonb)) AS elem
           UNION
           SELECT $3::jsonb
         ) sub
       ),
       updated_at = NOW()
     RETURNING *`,
    [userId, JSON.stringify([location]), JSON.stringify(location)]
  );

  return mapPreferencesRow(result.rows[0]);
}

/**
 * Remove a favorite location
 */
export async function removeFavoriteLocation(
  userId: string,
  location: string
): Promise<SchedulingPreferences | null> {
  const result = await pool.query(
    `UPDATE scheduling_preferences 
     SET favorite_locations = (
       SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
       FROM jsonb_array_elements(favorite_locations) AS elem
       WHERE elem::text != $2
     ),
     updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [userId, JSON.stringify(location)]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapPreferencesRow(result.rows[0]);
}

// ============================================
// Helper Functions
// ============================================

function mapPreferencesRow(row: any): SchedulingPreferences {
  return {
    id: row.id,
    userId: row.user_id,
    preferredDays: row.preferred_days || [],
    preferredTimeRanges: row.preferred_time_ranges || [],
    preferredDurations: row.preferred_durations || [60],
    favoriteLocations: row.favorite_locations || [],
    defaultActivityType: row.default_activity_type,
    applyByDefault: row.apply_by_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// Privacy Settings Functions
// Requirements: 8.5, 8.6, 8.8
// ============================================

/**
 * Privacy settings interface for calendar sharing
 */
export interface PrivacySettings {
  shareWithInnerCircle: boolean;
}

/**
 * Get user calendar sharing privacy settings
 * Requirements: 8.5
 */
export async function getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
  const result = await pool.query(`SELECT * FROM calendar_sharing_settings WHERE user_id = $1`, [
    userId,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapPrivacySettingsRow(result.rows[0]);
}

/**
 * Save or update user calendar sharing privacy settings
 * Requirements: 8.6, 8.8
 */
export async function savePrivacySettings(
  userId: string,
  settings: PrivacySettings
): Promise<PrivacySettings> {
  const result = await pool.query(
    `INSERT INTO calendar_sharing_settings (
      user_id, share_with_inner_circle
    ) VALUES ($1, $2)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      share_with_inner_circle = EXCLUDED.share_with_inner_circle,
      updated_at = NOW()
    RETURNING *`,
    [userId, settings.shareWithInnerCircle]
  );

  return mapPrivacySettingsRow(result.rows[0]);
}

/**
 * Delete user calendar sharing privacy settings
 */
export async function deletePrivacySettings(userId: string): Promise<void> {
  await pool.query(`DELETE FROM calendar_sharing_settings WHERE user_id = $1`, [userId]);
}

/**
 * Check if a user has sharing enabled with Inner Circle
 * Requirements: 8.7
 */
export async function isInnerCircleSharingEnabled(userId: string): Promise<boolean> {
  const settings = await getPrivacySettings(userId);
  return settings?.shareWithInnerCircle ?? false;
}

function mapPrivacySettingsRow(row: any): PrivacySettings {
  return {
    shareWithInnerCircle: row.share_with_inner_circle ?? false,
  };
}
