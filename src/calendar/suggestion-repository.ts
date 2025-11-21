/**
 * Suggestion Repository
 *
 * Database operations for suggestions.
 * This is a minimal implementation to support calendar feed generation.
 */

import { Pool } from 'pg';
import { Suggestion, SuggestionStatus, TriggerType } from '../types';
import { getPool } from '../db/connection';

/**
 * Convert database row to Suggestion object
 */
function rowToSuggestion(row: any): Suggestion {
  return {
    id: row.id,
    userId: row.user_id,
    contactId: row.contact_id,
    triggerType: row.trigger_type as TriggerType,
    proposedTimeslot: {
      start: new Date(row.proposed_timeslot_start),
      end: new Date(row.proposed_timeslot_end),
      timezone: row.proposed_timeslot_timezone,
    },
    reasoning: row.reasoning,
    status: row.status as SuggestionStatus,
    dismissalReason: row.dismissal_reason || undefined,
    calendarEventId: row.calendar_event_id || undefined,
    snoozedUntil: row.snoozed_until ? new Date(row.snoozed_until) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get all suggestions for a user
 */
export async function getUserSuggestions(
  userId: string,
  statuses?: SuggestionStatus[]
): Promise<Suggestion[]> {
  const pool = getPool();
  
  let query = 'SELECT * FROM suggestions WHERE user_id = $1';
  const params: any[] = [userId];
  
  if (statuses && statuses.length > 0) {
    query += ' AND status = ANY($2)';
    params.push(statuses);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const result = await pool.query(query, params);
  return result.rows.map(rowToSuggestion);
}

/**
 * Get a single suggestion by ID
 */
export async function getSuggestionById(suggestionId: string): Promise<Suggestion | null> {
  const pool = getPool();
  
  const result = await pool.query(
    'SELECT * FROM suggestions WHERE id = $1',
    [suggestionId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return rowToSuggestion(result.rows[0]);
}
