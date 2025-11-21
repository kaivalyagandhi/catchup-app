/**
 * Suggestion Repository
 *
 * Data access layer for suggestion operations.
 */

import pool from '../db/connection';
import { Suggestion, SuggestionStatus, TriggerType, TimeSlot } from '../types';

/**
 * Suggestion create data
 */
export interface SuggestionCreateData {
  userId: string;
  contactId: string;
  triggerType: TriggerType;
  proposedTimeslot: TimeSlot;
  reasoning: string;
  calendarEventId?: string;
}

/**
 * Suggestion update data
 */
export interface SuggestionUpdateData {
  status?: SuggestionStatus;
  dismissalReason?: string;
  snoozedUntil?: Date;
}

/**
 * Suggestion filters
 */
export interface SuggestionFilters {
  status?: SuggestionStatus;
  triggerType?: TriggerType;
  contactId?: string;
}

/**
 * Map database row to Suggestion object
 */
function mapRowToSuggestion(row: any): Suggestion {
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
    dismissalReason: row.dismissal_reason,
    calendarEventId: row.calendar_event_id,
    snoozedUntil: row.snoozed_until ? new Date(row.snoozed_until) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Create a new suggestion
 */
export async function create(data: SuggestionCreateData): Promise<Suggestion> {
  const result = await pool.query(
    `INSERT INTO suggestions (
      user_id, contact_id, trigger_type,
      proposed_timeslot_start, proposed_timeslot_end, proposed_timeslot_timezone,
      reasoning, calendar_event_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.userId,
      data.contactId,
      data.triggerType,
      data.proposedTimeslot.start,
      data.proposedTimeslot.end,
      data.proposedTimeslot.timezone,
      data.reasoning,
      data.calendarEventId || null,
    ]
  );

  return mapRowToSuggestion(result.rows[0]);
}

/**
 * Find suggestion by ID
 */
export async function findById(id: string, userId: string): Promise<Suggestion | null> {
  const result = await pool.query(
    'SELECT * FROM suggestions WHERE id = $1 AND user_id = $2',
    [id, userId]
  );

  return result.rows.length > 0 ? mapRowToSuggestion(result.rows[0]) : null;
}

/**
 * Find all suggestions for a user with optional filters
 */
export async function findAll(
  userId: string,
  filters?: SuggestionFilters
): Promise<Suggestion[]> {
  let query = 'SELECT * FROM suggestions WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  if (filters?.status) {
    query += ` AND status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.triggerType) {
    query += ` AND trigger_type = $${paramIndex}`;
    params.push(filters.triggerType);
    paramIndex++;
  }

  if (filters?.contactId) {
    query += ` AND contact_id = $${paramIndex}`;
    params.push(filters.contactId);
    paramIndex++;
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return result.rows.map(mapRowToSuggestion);
}

/**
 * Update suggestion
 */
export async function update(
  id: string,
  userId: string,
  data: SuggestionUpdateData
): Promise<Suggestion> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(data.status);
    paramIndex++;
  }

  if (data.dismissalReason !== undefined) {
    updates.push(`dismissal_reason = $${paramIndex}`);
    params.push(data.dismissalReason);
    paramIndex++;
  }

  if (data.snoozedUntil !== undefined) {
    updates.push(`snoozed_until = $${paramIndex}`);
    params.push(data.snoozedUntil);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  params.push(id, userId);

  const result = await pool.query(
    `UPDATE suggestions
     SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new Error('Suggestion not found');
  }

  return mapRowToSuggestion(result.rows[0]);
}

/**
 * Delete suggestion
 */
export async function deleteSuggestion(id: string, userId: string): Promise<void> {
  await pool.query('DELETE FROM suggestions WHERE id = $1 AND user_id = $2', [id, userId]);
}
