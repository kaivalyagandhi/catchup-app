/**
 * Calendar Events Repository
 *
 * Handles database operations for cached calendar events
 */

import pool from '../db/connection';
import { CalendarEvent } from '../types';

export interface CalendarEventRow {
  id: string;
  user_id: string;
  google_event_id: string;
  calendar_id: string;
  summary: string | null;
  description: string | null;
  start_time: Date;
  end_time: Date;
  timezone: string;
  is_all_day: boolean;
  is_busy: boolean;
  location: string | null;
  synced_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert database row to CalendarEvent interface
 */
function rowToCalendarEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    userId: row.user_id,
    googleEventId: row.google_event_id,
    calendarId: row.calendar_id,
    summary: row.summary || 'No title',
    description: row.description || undefined,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
    isAllDay: row.is_all_day,
    isBusy: row.is_busy,
    location: row.location || undefined,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get last sync time for a user's calendar events
 */
export async function getLastSyncTime(userId: string): Promise<Date | null> {
  const result = await pool.query<{ last_calendar_sync: Date | null }>(
    'SELECT last_calendar_sync FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0 || !result.rows[0].last_calendar_sync) {
    return null;
  }

  return result.rows[0].last_calendar_sync;
}

/**
 * Update last sync time for a user
 */
export async function updateLastSyncTime(userId: string): Promise<void> {
  await pool.query('UPDATE users SET last_calendar_sync = CURRENT_TIMESTAMP WHERE id = $1', [
    userId,
  ]);
}

/**
 * Check if calendar events need refresh (not synced today)
 */
export async function needsRefresh(userId: string): Promise<boolean> {
  const lastSync = await getLastSyncTime(userId);

  if (!lastSync) {
    return true; // Never synced
  }

  // Check if last sync was today (in user's timezone, but using UTC for simplicity)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastSyncDate = new Date(lastSync);
  lastSyncDate.setHours(0, 0, 0, 0);

  return lastSyncDate < today;
}

/**
 * Get cached calendar events for a user within a date range
 */
export async function getCachedEvents(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<CalendarEvent[]> {
  const result = await pool.query<CalendarEventRow>(
    `SELECT * FROM calendar_events 
     WHERE user_id = $1 
       AND start_time < $3 
       AND end_time > $2
     ORDER BY start_time ASC`,
    [userId, startTime, endTime]
  );

  return result.rows.map(rowToCalendarEvent);
}

/**
 * Upsert calendar events (bulk insert/update)
 */
export async function upsertEvents(
  userId: string,
  events: Array<{
    googleEventId: string;
    calendarId: string;
    summary: string | null;
    description: string | null;
    startTime: Date;
    endTime: Date;
    timezone: string;
    isAllDay: boolean;
    isBusy: boolean;
    location: string | null;
  }>
): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Upsert each event
    for (const event of events) {
      await client.query(
        `INSERT INTO calendar_events (
          user_id, google_event_id, calendar_id, summary, description,
          start_time, end_time, timezone, is_all_day, is_busy, location, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, google_event_id)
        DO UPDATE SET
          calendar_id = EXCLUDED.calendar_id,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          timezone = EXCLUDED.timezone,
          is_all_day = EXCLUDED.is_all_day,
          is_busy = EXCLUDED.is_busy,
          location = EXCLUDED.location,
          synced_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          event.googleEventId,
          event.calendarId,
          event.summary,
          event.description,
          event.startTime,
          event.endTime,
          event.timezone,
          event.isAllDay,
          event.isBusy,
          event.location,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete old calendar events (older than 30 days in the past)
 */
export async function deleteOldEvents(userId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await pool.query(
    'DELETE FROM calendar_events WHERE user_id = $1 AND end_time < $2',
    [userId, thirtyDaysAgo]
  );

  return result.rowCount || 0;
}

/**
 * Clear all cached events for a user
 */
export async function clearUserEvents(userId: string): Promise<void> {
  await pool.query('DELETE FROM calendar_events WHERE user_id = $1', [userId]);
}
