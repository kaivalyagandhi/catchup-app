/**
 * Calendar Repository
 *
 * Handles database operations for Google Calendar data
 */

import pool from '../db/connection';
import { GoogleCalendar } from '../types';

export interface GoogleCalendarRow {
  id: string;
  user_id: string;
  calendar_id: string;
  name: string;
  description: string | null;
  selected: boolean;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert database row to GoogleCalendar interface
 */
function rowToGoogleCalendar(row: GoogleCalendarRow): GoogleCalendar {
  return {
    id: row.id,
    userId: row.user_id,
    calendarId: row.calendar_id,
    name: row.name,
    description: row.description || undefined,
    selected: row.selected,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all calendars for a user
 */
export async function getUserCalendars(userId: string): Promise<GoogleCalendar[]> {
  // Optimized: Use column projection instead of SELECT *
  const result = await pool.query<GoogleCalendarRow>(
    `SELECT 
      id, user_id, calendar_id, name, description,
      selected, is_primary, created_at, updated_at
    FROM google_calendars 
    WHERE user_id = $1 
    ORDER BY is_primary DESC, name ASC`,
    [userId]
  );

  return result.rows.map(rowToGoogleCalendar);
}

/**
 * Get selected calendars for a user
 */
export async function getSelectedCalendars(userId: string): Promise<GoogleCalendar[]> {
  // Optimized: Use column projection instead of SELECT *
  const result = await pool.query<GoogleCalendarRow>(
    `SELECT 
      id, user_id, calendar_id, name, description,
      selected, is_primary, created_at, updated_at
    FROM google_calendars 
    WHERE user_id = $1 AND selected = true 
    ORDER BY is_primary DESC, name ASC`,
    [userId]
  );

  return result.rows.map(rowToGoogleCalendar);
}

/**
 * Upsert a calendar (insert or update if exists)
 */
export async function upsertCalendar(
  userId: string,
  calendarId: string,
  name: string,
  description: string | null,
  isPrimary: boolean
): Promise<GoogleCalendar> {
  const result = await pool.query<GoogleCalendarRow>(
    `INSERT INTO google_calendars (user_id, calendar_id, name, description, is_primary, selected)
     VALUES ($1, $2, $3, $4, $5, false)
     ON CONFLICT (user_id, calendar_id)
     DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       is_primary = EXCLUDED.is_primary,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, calendarId, name, description, isPrimary]
  );

  return rowToGoogleCalendar(result.rows[0]);
}

/**
 * Update calendar selection status
 */
export async function updateCalendarSelection(
  userId: string,
  calendarId: string,
  selected: boolean
): Promise<GoogleCalendar | null> {
  const result = await pool.query<GoogleCalendarRow>(
    `UPDATE google_calendars
     SET selected = $3, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND calendar_id = $2
     RETURNING *`,
    [userId, calendarId, selected]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return rowToGoogleCalendar(result.rows[0]);
}

/**
 * Set selected calendars for a user (bulk update)
 */
export async function setSelectedCalendars(
  userId: string,
  calendarIds: string[]
): Promise<GoogleCalendar[]> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // First, deselect all calendars for the user
    await client.query(
      'UPDATE google_calendars SET selected = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );

    // Then, select the specified calendars
    if (calendarIds.length > 0) {
      await client.query(
        `UPDATE google_calendars
         SET selected = true, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND calendar_id = ANY($2)`,
        [userId, calendarIds]
      );
    }

    await client.query('COMMIT');

    // Return all calendars for the user
    const result = await client.query<GoogleCalendarRow>(
      `SELECT 
        id, user_id, calendar_id, name, description,
        selected, is_primary, created_at, updated_at
      FROM google_calendars 
      WHERE user_id = $1 
      ORDER BY is_primary DESC, name ASC`,
      [userId]
    );

    return result.rows.map(rowToGoogleCalendar);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete all calendars for a user
 */
export async function deleteUserCalendars(userId: string): Promise<void> {
  await pool.query('DELETE FROM google_calendars WHERE user_id = $1', [userId]);
}
