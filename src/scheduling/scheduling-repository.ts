/**
 * Scheduling Repository
 *
 * Data access layer for catchup plan operations.
 * Requirements: 2.14, 9.6, 9.7, 10.1, 12.1, 12.2
 */

import pool from '../db/connection';
import {
  CatchupPlan,
  PlanInvitee,
  PlanStatus,
  AttendanceType,
  ActivityType,
  PlanFilters,
  FinalizePlanData,
} from '../types/scheduling';

// ============================================
// Plan Operations
// ============================================

/**
 * Create a new catchup plan
 */
export async function createPlan(data: {
  id: string;
  userId: string;
  activityType?: ActivityType;
  duration: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  location?: string;
  status: PlanStatus;
}): Promise<CatchupPlan> {
  const result = await pool.query(
    `INSERT INTO catchup_plans (
      id, user_id, activity_type, duration, date_range_start, date_range_end, location, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.id,
      data.userId,
      data.activityType || null,
      data.duration,
      data.dateRangeStart,
      data.dateRangeEnd,
      data.location || null,
      data.status,
    ]
  );

  return mapPlanRow(result.rows[0]);
}

/**
 * Get a plan by ID
 */
export async function getPlanById(planId: string): Promise<CatchupPlan | null> {
  const result = await pool.query(
    `SELECT p.*, 
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'planId', pi.plan_id,
            'contactId', pi.contact_id,
            'contactName', c.name,
            'attendanceType', pi.attendance_type,
            'hasResponded', pi.has_responded,
            'createdAt', pi.created_at
          )
        ) FILTER (WHERE pi.id IS NOT NULL), '[]'
      ) as invitees
    FROM catchup_plans p
    LEFT JOIN plan_invitees pi ON p.id = pi.plan_id
    LEFT JOIN contacts c ON pi.contact_id = c.id
    WHERE p.id = $1 AND p.archived_at IS NULL
    GROUP BY p.id`,
    [planId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapPlanRowWithInvitees(result.rows[0]);
}

/**
 * Get plans for a user with optional filters
 * Requirements: 10.10 - Support filtering by archived status
 */
export async function getPlansByUser(
  userId: string,
  filters?: PlanFilters & { includeArchived?: boolean }
): Promise<CatchupPlan[]> {
  let query = `
    SELECT p.*, 
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'planId', pi.plan_id,
            'contactId', pi.contact_id,
            'contactName', c.name,
            'attendanceType', pi.attendance_type,
            'hasResponded', pi.has_responded,
            'createdAt', pi.created_at
          )
        ) FILTER (WHERE pi.id IS NOT NULL), '[]'
      ) as invitees
    FROM catchup_plans p
    LEFT JOIN plan_invitees pi ON p.id = pi.plan_id
    LEFT JOIN contacts c ON pi.contact_id = c.id
    WHERE p.user_id = $1
  `;

  const params: any[] = [userId];
  let paramIndex = 2;

  // Handle archived filter - by default exclude archived plans
  if (!filters?.includeArchived) {
    query += ` AND p.archived_at IS NULL`;
  }

  if (filters?.status) {
    query += ` AND p.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

  const result = await pool.query(query, params);

  let plans = result.rows.map(mapPlanRowWithInvitees);

  // Filter by type (individual vs group) in memory
  if (filters?.type) {
    plans = plans.filter((plan) => {
      const isGroup = plan.invitees.length > 1;
      return filters.type === 'group' ? isGroup : !isGroup;
    });
  }

  return plans;
}

/**
 * Get archived plans for a user (past/completed plans)
 * Requirements: 10.10 - Show archived plans in Past filter
 */
export async function getArchivedPlansByUser(userId: string): Promise<CatchupPlan[]> {
  const query = `
    SELECT p.*, 
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'planId', pi.plan_id,
            'contactId', pi.contact_id,
            'contactName', c.name,
            'attendanceType', pi.attendance_type,
            'hasResponded', pi.has_responded,
            'createdAt', pi.created_at
          )
        ) FILTER (WHERE pi.id IS NOT NULL), '[]'
      ) as invitees
    FROM catchup_plans p
    LEFT JOIN plan_invitees pi ON p.id = pi.plan_id
    LEFT JOIN contacts c ON pi.contact_id = c.id
    WHERE p.user_id = $1 AND p.archived_at IS NOT NULL
    GROUP BY p.id 
    ORDER BY p.archived_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows.map(mapPlanRowWithInvitees);
}

/**
 * Auto-archive plans that have been completed/scheduled for more than 7 days
 * Requirements: 10.10 - Auto-archive completed plans after 7 days
 */
export async function autoArchiveOldPlans(): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await pool.query(
    `UPDATE catchup_plans 
     SET archived_at = NOW(), updated_at = NOW()
     WHERE archived_at IS NULL 
       AND (
         (status = 'completed') 
         OR (status = 'scheduled' AND finalized_time < $1)
       )
     RETURNING id`,
    [sevenDaysAgo.toISOString()]
  );

  return result.rowCount || 0;
}

/**
 * Manually archive a plan
 * Requirements: 10.10 - Allow manual archiving
 */
export async function manualArchivePlan(planId: string): Promise<void> {
  await pool.query(
    `UPDATE catchup_plans SET archived_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [planId]
  );
}

/**
 * Unarchive a plan (restore from archive)
 */
export async function unarchivePlan(planId: string): Promise<void> {
  await pool.query(
    `UPDATE catchup_plans SET archived_at = NULL, updated_at = NOW() WHERE id = $1`,
    [planId]
  );
}


/**
 * Update plan status
 */
export async function updatePlanStatus(
  planId: string,
  status: PlanStatus
): Promise<void> {
  await pool.query(
    `UPDATE catchup_plans SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, planId]
  );
}

/**
 * Update plan details
 */
export async function updatePlan(
  planId: string,
  updates: {
    activityType?: ActivityType;
    duration?: number;
    dateRangeStart?: string;
    dateRangeEnd?: string;
    location?: string;
    notes?: string;
  }
): Promise<CatchupPlan> {
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.activityType !== undefined) {
    setClauses.push(`activity_type = $${paramIndex}`);
    params.push(updates.activityType);
    paramIndex++;
  }
  if (updates.duration !== undefined) {
    setClauses.push(`duration = $${paramIndex}`);
    params.push(updates.duration);
    paramIndex++;
  }
  if (updates.dateRangeStart !== undefined) {
    setClauses.push(`date_range_start = $${paramIndex}`);
    params.push(updates.dateRangeStart);
    paramIndex++;
  }
  if (updates.dateRangeEnd !== undefined) {
    setClauses.push(`date_range_end = $${paramIndex}`);
    params.push(updates.dateRangeEnd);
    paramIndex++;
  }
  if (updates.location !== undefined) {
    setClauses.push(`location = $${paramIndex}`);
    params.push(updates.location);
    paramIndex++;
  }
  if (updates.notes !== undefined) {
    setClauses.push(`notes = $${paramIndex}`);
    params.push(updates.notes);
    paramIndex++;
  }

  params.push(planId);

  await pool.query(
    `UPDATE catchup_plans SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    params
  );

  const plan = await getPlanById(planId);
  if (!plan) {
    throw new Error('Plan not found after update');
  }
  return plan;
}

/**
 * Finalize a plan with selected time
 */
export async function finalizePlan(
  planId: string,
  data: FinalizePlanData & { status: PlanStatus }
): Promise<CatchupPlan> {
  await pool.query(
    `UPDATE catchup_plans 
     SET finalized_time = $1, location = COALESCE($2, location), notes = $3, status = $4, updated_at = NOW()
     WHERE id = $5`,
    [data.finalizedTime, data.location, data.notes || null, data.status, planId]
  );

  const plan = await getPlanById(planId);
  if (!plan) {
    throw new Error('Plan not found after finalization');
  }
  return plan;
}

/**
 * Soft delete (archive) a plan
 */
export async function archivePlan(planId: string): Promise<void> {
  await pool.query(
    `UPDATE catchup_plans SET archived_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [planId]
  );
}

// ============================================
// Invitee Operations
// ============================================

/**
 * Add an invitee to a plan
 */
export async function addInvitee(data: {
  planId: string;
  contactId: string;
  attendanceType: AttendanceType;
}): Promise<PlanInvitee> {
  // Insert the invitee
  await pool.query(
    `INSERT INTO plan_invitees (plan_id, contact_id, attendance_type)
     VALUES ($1, $2, $3)`,
    [data.planId, data.contactId, data.attendanceType]
  );

  // Fetch with contact name
  const inviteeResult = await pool.query(
    `SELECT pi.*, c.name as contact_name
     FROM plan_invitees pi
     JOIN contacts c ON pi.contact_id = c.id
     WHERE pi.plan_id = $1 AND pi.contact_id = $2`,
    [data.planId, data.contactId]
  );

  return mapInviteeRow(inviteeResult.rows[0]);
}

/**
 * Get all invitees for a plan
 */
export async function getInviteesByPlan(planId: string): Promise<PlanInvitee[]> {
  const result = await pool.query(
    `SELECT pi.*, c.name as contact_name
     FROM plan_invitees pi
     JOIN contacts c ON pi.contact_id = c.id
     WHERE pi.plan_id = $1
     ORDER BY pi.created_at`,
    [planId]
  );

  return result.rows.map(mapInviteeRow);
}

/**
 * Update invitee response status
 */
export async function markInviteeResponded(
  planId: string,
  contactId: string
): Promise<void> {
  await pool.query(
    `UPDATE plan_invitees SET has_responded = TRUE WHERE plan_id = $1 AND contact_id = $2`,
    [planId, contactId]
  );
}

/**
 * Remove an invitee from a plan
 */
export async function removeInvitee(
  planId: string,
  contactId: string
): Promise<void> {
  await pool.query(
    `DELETE FROM plan_invitees WHERE plan_id = $1 AND contact_id = $2`,
    [planId, contactId]
  );
}

/**
 * Update an invitee's attendance type
 */
export async function updateInviteeAttendance(
  planId: string,
  contactId: string,
  attendanceType: AttendanceType
): Promise<void> {
  await pool.query(
    `UPDATE plan_invitees SET attendance_type = $1 WHERE plan_id = $2 AND contact_id = $3`,
    [attendanceType, planId, contactId]
  );
}

/**
 * Check if all must-attend invitees have responded
 */
export async function checkAllMustAttendResponded(planId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT COUNT(*) as pending
     FROM plan_invitees
     WHERE plan_id = $1 AND attendance_type = 'must_attend' AND has_responded = FALSE`,
    [planId]
  );

  return parseInt(result.rows[0].pending, 10) === 0;
}

/**
 * Get pending invitees (those who haven't responded)
 * Requirements: 12.5 - Track which invitees haven't responded
 */
export async function getPendingInvitees(planId: string): Promise<PlanInvitee[]> {
  const result = await pool.query(
    `SELECT pi.*, c.name as contact_name
     FROM plan_invitees pi
     JOIN contacts c ON pi.contact_id = c.id
     WHERE pi.plan_id = $1 AND pi.has_responded = FALSE
     ORDER BY pi.created_at`,
    [planId]
  );

  return result.rows.map(mapInviteeRow);
}

/**
 * Update last reminder sent time for a plan
 * Requirements: 12.5 - Track last reminder sent time to prevent spam
 */
export async function updateLastReminderSent(planId: string): Promise<void> {
  await pool.query(
    `UPDATE catchup_plans SET last_reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [planId]
  );
}

/**
 * Get last reminder sent time for a plan
 * Requirements: 12.5 - Track last reminder sent time to prevent spam
 */
export async function getLastReminderSent(planId: string): Promise<Date | null> {
  const result = await pool.query(
    `SELECT last_reminder_sent_at FROM catchup_plans WHERE id = $1`,
    [planId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].last_reminder_sent_at;
}

// ============================================
// Helper Functions
// ============================================

function mapPlanRow(row: any): CatchupPlan {
  return {
    id: row.id,
    userId: row.user_id,
    activityType: row.activity_type,
    duration: row.duration,
    dateRangeStart: row.date_range_start,
    dateRangeEnd: row.date_range_end,
    location: row.location,
    notes: row.notes,
    status: row.status,
    finalizedTime: row.finalized_time,
    invitees: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapPlanRowWithInvitees(row: any): CatchupPlan {
  const plan = mapPlanRow(row);
  plan.invitees = (row.invitees || []).map((inv: any) => ({
    id: inv.id,
    planId: inv.planId,
    contactId: inv.contactId,
    contactName: inv.contactName,
    attendanceType: inv.attendanceType,
    hasResponded: inv.hasResponded,
    createdAt: new Date(inv.createdAt),
  }));
  return plan;
}

function mapInviteeRow(row: any): PlanInvitee {
  return {
    id: row.id,
    planId: row.plan_id,
    contactId: row.contact_id,
    contactName: row.contact_name,
    attendanceType: row.attendance_type,
    hasResponded: row.has_responded,
    createdAt: row.created_at,
  };
}
