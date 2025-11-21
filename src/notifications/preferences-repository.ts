/**
 * Notification Preferences Repository
 *
 * Data access layer for notification preferences.
 */

import pool from '../db/connection';
import { NotificationPreferences } from '../types';

/**
 * Map database row to NotificationPreferences object
 */
function mapRowToPreferences(row: any): NotificationPreferences {
  return {
    smsEnabled: row.sms_enabled,
    emailEnabled: row.email_enabled,
    batchDay: row.batch_day,
    batchTime: row.batch_time,
    timezone: row.timezone,
  };
}

/**
 * Get notification preferences for a user
 */
export async function getPreferences(userId: string): Promise<NotificationPreferences | null> {
  const result = await pool.query(
    'SELECT * FROM notification_preferences WHERE user_id = $1',
    [userId]
  );

  return result.rows.length > 0 ? mapRowToPreferences(result.rows[0]) : null;
}

/**
 * Set notification preferences for a user
 */
export async function setPreferences(
  userId: string,
  preferences: NotificationPreferences
): Promise<NotificationPreferences> {
  const result = await pool.query(
    `INSERT INTO notification_preferences (
      user_id, sms_enabled, email_enabled, batch_day, batch_time, timezone
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id) DO UPDATE SET
      sms_enabled = EXCLUDED.sms_enabled,
      email_enabled = EXCLUDED.email_enabled,
      batch_day = EXCLUDED.batch_day,
      batch_time = EXCLUDED.batch_time,
      timezone = EXCLUDED.timezone,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      userId,
      preferences.smsEnabled,
      preferences.emailEnabled,
      preferences.batchDay,
      preferences.batchTime,
      preferences.timezone,
    ]
  );

  return mapRowToPreferences(result.rows[0]);
}

/**
 * Get default notification preferences
 */
export function getDefaultPreferences(): NotificationPreferences {
  return {
    smsEnabled: true,
    emailEnabled: false,
    batchDay: 0, // Sunday
    batchTime: '09:00',
    timezone: 'America/New_York',
  };
}
