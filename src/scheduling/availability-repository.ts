/**
 * Availability Repository
 *
 * Data access layer for availability operations.
 * Requirements: 4.10, 5.1, 5.4, 6.1
 */

import pool from '../db/connection';
import {
  InviteeAvailability,
  InitiatorAvailability,
  AvailabilitySource,
} from '../types/scheduling';

// ============================================
// Invitee Availability Operations
// ============================================

/**
 * Save or update invitee availability
 */
export async function saveAvailability(data: {
  planId: string;
  contactId?: string;
  inviteeName: string;
  timezone: string;
  availableSlots: string[];
}): Promise<InviteeAvailability> {
  const result = await pool.query(
    `INSERT INTO invitee_availability (plan_id, contact_id, invitee_name, timezone, available_slots)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (plan_id, contact_id) 
     DO UPDATE SET 
       invitee_name = EXCLUDED.invitee_name,
       timezone = EXCLUDED.timezone,
       available_slots = EXCLUDED.available_slots,
       updated_at = NOW()
     RETURNING *`,
    [
      data.planId,
      data.contactId || null,
      data.inviteeName,
      data.timezone,
      JSON.stringify(data.availableSlots),
    ]
  );

  return mapAvailabilityRow(result.rows[0]);
}

/**
 * Get all availability submissions for a plan
 */
export async function getAvailabilityForPlan(
  planId: string
): Promise<InviteeAvailability[]> {
  const result = await pool.query(
    `SELECT * FROM invitee_availability WHERE plan_id = $1 ORDER BY submitted_at`,
    [planId]
  );

  return result.rows.map(mapAvailabilityRow);
}

/**
 * Get availability for a specific invitee
 */
export async function getAvailabilityByContact(
  planId: string,
  contactId: string
): Promise<InviteeAvailability | null> {
  const result = await pool.query(
    `SELECT * FROM invitee_availability WHERE plan_id = $1 AND contact_id = $2`,
    [planId, contactId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapAvailabilityRow(result.rows[0]);
}

/**
 * Delete availability for an invitee
 */
export async function deleteAvailability(
  planId: string,
  contactId: string
): Promise<void> {
  await pool.query(
    `DELETE FROM invitee_availability WHERE plan_id = $1 AND contact_id = $2`,
    [planId, contactId]
  );
}

// ============================================
// Initiator Availability Operations
// ============================================

/**
 * Save or update initiator availability
 */
export async function saveInitiatorAvailability(data: {
  planId: string;
  userId: string;
  availableSlots: string[];
  source: AvailabilitySource;
}): Promise<InitiatorAvailability> {
  const result = await pool.query(
    `INSERT INTO initiator_availability (plan_id, user_id, available_slots, source)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (plan_id, user_id) 
     DO UPDATE SET 
       available_slots = EXCLUDED.available_slots,
       source = EXCLUDED.source,
       updated_at = NOW()
     RETURNING *`,
    [
      data.planId,
      data.userId,
      JSON.stringify(data.availableSlots),
      data.source,
    ]
  );

  return mapInitiatorAvailabilityRow(result.rows[0]);
}

/**
 * Get initiator availability for a plan
 */
export async function getInitiatorAvailability(
  planId: string,
  userId: string
): Promise<InitiatorAvailability | null> {
  const result = await pool.query(
    `SELECT * FROM initiator_availability WHERE plan_id = $1 AND user_id = $2`,
    [planId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapInitiatorAvailabilityRow(result.rows[0]);
}

/**
 * Delete initiator availability
 */
export async function deleteInitiatorAvailability(
  planId: string,
  userId: string
): Promise<void> {
  await pool.query(
    `DELETE FROM initiator_availability WHERE plan_id = $1 AND user_id = $2`,
    [planId, userId]
  );
}

// ============================================
// Helper Functions
// ============================================

function mapAvailabilityRow(row: any): InviteeAvailability {
  return {
    id: row.id,
    planId: row.plan_id,
    contactId: row.contact_id,
    inviteeName: row.invitee_name,
    timezone: row.timezone,
    availableSlots: row.available_slots || [],
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

function mapInitiatorAvailabilityRow(row: any): InitiatorAvailability {
  return {
    id: row.id,
    planId: row.plan_id,
    userId: row.user_id,
    availableSlots: row.available_slots || [],
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
