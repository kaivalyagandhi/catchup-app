/**
 * Invite Link Repository
 *
 * Data access layer for invite link operations.
 * Requirements: 3.1, 3.8, 3.9, 3.10
 */

import pool from '../db/connection';
import { InviteLink, PlanStatus } from '../types/scheduling';

/**
 * Create a new invite link
 */
export async function createLink(data: {
  id: string;
  planId: string;
  contactId: string;
  token: string;
  expiresAt: Date;
  accessedAt: Date | null;
  submittedAt: Date | null;
}): Promise<InviteLink> {
  const result = await pool.query(
    `INSERT INTO invite_links (id, plan_id, contact_id, token, expires_at, accessed_at, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.id,
      data.planId,
      data.contactId,
      data.token,
      data.expiresAt,
      data.accessedAt,
      data.submittedAt,
    ]
  );

  return mapLinkRow(result.rows[0]);
}

/**
 * Get an invite link by token
 */
export async function getLinkByToken(token: string): Promise<InviteLink | null> {
  const result = await pool.query(
    `SELECT il.*, c.name as contact_name
     FROM invite_links il
     JOIN contacts c ON il.contact_id = c.id
     WHERE il.token = $1 AND il.invalidated_at IS NULL`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapLinkRowWithContact(result.rows[0]);
}

/**
 * Get all invite links for a plan
 */
export async function getLinksForPlan(planId: string): Promise<InviteLink[]> {
  const result = await pool.query(
    `SELECT il.*, c.name as contact_name
     FROM invite_links il
     JOIN contacts c ON il.contact_id = c.id
     WHERE il.plan_id = $1 AND il.invalidated_at IS NULL
     ORDER BY il.created_at`,
    [planId]
  );

  return result.rows.map(mapLinkRowWithContact);
}

/**
 * Track when a link is accessed (viewed)
 */
export async function trackAccess(linkId: string): Promise<void> {
  await pool.query(
    `UPDATE invite_links SET accessed_at = COALESCE(accessed_at, NOW()) WHERE id = $1`,
    [linkId]
  );
}

/**
 * Mark a link as having availability submitted
 */
export async function markSubmitted(linkId: string): Promise<void> {
  await pool.query(
    `UPDATE invite_links SET submitted_at = NOW() WHERE id = $1`,
    [linkId]
  );
}

/**
 * Invalidate a specific link (for regeneration)
 */
export async function invalidateLink(
  planId: string,
  contactId: string
): Promise<void> {
  await pool.query(
    `UPDATE invite_links SET invalidated_at = NOW() WHERE plan_id = $1 AND contact_id = $2`,
    [planId, contactId]
  );
}

/**
 * Invalidate all links for a plan (when plan is cancelled)
 */
export async function invalidateAllLinksForPlan(planId: string): Promise<void> {
  await pool.query(
    `UPDATE invite_links SET invalidated_at = NOW() WHERE plan_id = $1`,
    [planId]
  );
}

/**
 * Get plan status for link validation
 */
export async function getPlanStatus(
  planId: string
): Promise<{ status: PlanStatus }> {
  const result = await pool.query(
    `SELECT status FROM catchup_plans WHERE id = $1`,
    [planId]
  );

  if (result.rows.length === 0) {
    throw new Error('Plan not found');
  }

  return { status: result.rows[0].status };
}

/**
 * Get link by plan and contact (for checking existing links)
 */
export async function getLinkByPlanAndContact(
  planId: string,
  contactId: string
): Promise<InviteLink | null> {
  const result = await pool.query(
    `SELECT il.*, c.name as contact_name
     FROM invite_links il
     JOIN contacts c ON il.contact_id = c.id
     WHERE il.plan_id = $1 AND il.contact_id = $2 AND il.invalidated_at IS NULL`,
    [planId, contactId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapLinkRowWithContact(result.rows[0]);
}

// ============================================
// Helper Functions
// ============================================

function mapLinkRow(row: any): InviteLink {
  return {
    id: row.id,
    planId: row.plan_id,
    contactId: row.contact_id,
    token: row.token,
    expiresAt: row.expires_at,
    accessedAt: row.accessed_at,
    submittedAt: row.submitted_at,
    invalidatedAt: row.invalidated_at,
    createdAt: row.created_at,
  };
}

function mapLinkRowWithContact(row: any): InviteLink {
  return {
    ...mapLinkRow(row),
    contactName: row.contact_name,
  };
}
