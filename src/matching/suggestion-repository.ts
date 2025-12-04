/**
 * Suggestion Repository
 *
 * Data access layer for suggestion operations.
 */

import pool from '../db/connection';
import {
  Suggestion,
  SuggestionStatus,
  TriggerType,
  TimeSlot,
  Contact,
  SharedContextScore,
} from '../types';
import { contactService } from '../contacts/service';

/**
 * Suggestion create data
 */
export interface SuggestionCreateData {
  userId: string;
  contactId?: string; // Optional for backward compatibility
  contactIds?: string[]; // Array of contact IDs for group suggestions
  type?: 'individual' | 'group';
  triggerType: TriggerType;
  proposedTimeslot: TimeSlot;
  reasoning: string;
  priority?: number;
  sharedContext?: SharedContextScore;
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
 * Note: This function returns a partial Suggestion without contacts array
 * Use mapRowToSuggestionWithContacts for complete Suggestion objects
 */
function mapRowToSuggestion(row: any): Suggestion {
  return {
    id: row.id,
    userId: row.user_id,
    contactId: row.contact_id,
    contacts: [], // Will be populated by mapRowToSuggestionWithContacts
    type: row.type as 'individual' | 'group',
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
    priority: row.priority || 0,
    sharedContext: row.shared_context || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Map database row to Suggestion object with contacts populated
 */
async function mapRowToSuggestionWithContacts(row: any): Promise<Suggestion> {
  const suggestion = mapRowToSuggestion(row);

  // Fetch contacts for this suggestion
  const contactsResult = await pool.query(
    `SELECT c.* FROM contacts c
     JOIN suggestion_contacts sc ON c.id = sc.contact_id
     WHERE sc.suggestion_id = $1`,
    [suggestion.id]
  );

  // Map contact rows to Contact objects
  suggestion.contacts = await Promise.all(
    contactsResult.rows.map(async (contactRow) => {
      return await contactService.getContact(contactRow.id, suggestion.userId);
    })
  );

  return suggestion;
}

/**
 * Create a new suggestion
 */
export async function create(data: SuggestionCreateData): Promise<Suggestion> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Determine contact IDs
    const contactIds = data.contactIds || (data.contactId ? [data.contactId] : []);
    if (contactIds.length === 0) {
      throw new Error('At least one contact ID is required');
    }

    // Determine type
    const type = data.type || (contactIds.length > 1 ? 'group' : 'individual');

    // Use first contact ID for backward compatibility
    const primaryContactId = contactIds[0];

    // Create suggestion
    const result = await client.query(
      `INSERT INTO suggestions (
        user_id, contact_id, type, trigger_type,
        proposed_timeslot_start, proposed_timeslot_end, proposed_timeslot_timezone,
        reasoning, priority, shared_context, calendar_event_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        data.userId,
        primaryContactId,
        type,
        data.triggerType,
        data.proposedTimeslot.start,
        data.proposedTimeslot.end,
        data.proposedTimeslot.timezone,
        data.reasoning,
        data.priority || 0,
        data.sharedContext ? JSON.stringify(data.sharedContext) : null,
        data.calendarEventId || null,
      ]
    );

    const suggestionId = result.rows[0].id;

    // Insert into suggestion_contacts junction table
    for (const contactId of contactIds) {
      await client.query(
        `INSERT INTO suggestion_contacts (suggestion_id, contact_id)
         VALUES ($1, $2)`,
        [suggestionId, contactId]
      );
    }

    await client.query('COMMIT');

    // Return suggestion with contacts populated
    return await mapRowToSuggestionWithContacts(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Find suggestion by ID
 */
export async function findById(id: string, userId: string): Promise<Suggestion | null> {
  const result = await pool.query('SELECT * FROM suggestions WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ]);

  return result.rows.length > 0 ? await mapRowToSuggestionWithContacts(result.rows[0]) : null;
}

/**
 * Find all suggestions for a user with optional filters
 */
export async function findAll(userId: string, filters?: SuggestionFilters): Promise<Suggestion[]> {
  let query = 'SELECT * FROM suggestions WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  if (filters?.status) {
    query += ' AND status = $' + paramIndex;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.triggerType) {
    query += ' AND trigger_type = $' + paramIndex;
    params.push(filters.triggerType);
    paramIndex++;
  }

  if (filters?.contactId) {
    query += ' AND contact_id = $' + paramIndex;
    params.push(filters.contactId);
    paramIndex++;
  }

  query += ' ORDER BY priority DESC, created_at DESC';

  const result = await pool.query(query, params);
  return await Promise.all(result.rows.map(mapRowToSuggestionWithContacts));
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
    updates.push('status = $' + paramIndex);
    params.push(data.status);
    paramIndex++;
  }

  if (data.dismissalReason !== undefined) {
    updates.push('dismissal_reason = $' + paramIndex);
    params.push(data.dismissalReason);
    paramIndex++;
  }

  if (data.snoozedUntil !== undefined) {
    updates.push('snoozed_until = $' + paramIndex);
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

  return await mapRowToSuggestionWithContacts(result.rows[0]);
}

/**
 * Delete suggestion
 */
export async function deleteSuggestion(id: string, userId: string): Promise<void> {
  await pool.query('DELETE FROM suggestions WHERE id = $1 AND user_id = $2', [id, userId]);
}
