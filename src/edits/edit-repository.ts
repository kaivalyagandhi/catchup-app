/**
 * Edit Repository
 *
 * Data access layer for pending edits using repository pattern.
 * Handles all database interactions for pending edits.
 *
 * Requirements: 1.3, 4.2, 7.5
 */

import pool from '../db/connection';
import {
  PendingEdit,
  PendingEditStatus,
  EditType,
  EditSource,
  DisambiguationCandidate,
} from '../types';

/**
 * Create pending edit data
 */
export interface CreatePendingEditData {
  userId: string;
  sessionId: string;
  editType: EditType;
  targetContactId?: string;
  targetContactName?: string;
  targetGroupId?: string;
  targetGroupName?: string;
  field?: string;
  proposedValue: any;
  confidenceScore: number;
  source: EditSource;
  status?: PendingEditStatus;
  disambiguationCandidates?: DisambiguationCandidate[];
}

/**
 * Update pending edit data
 */
export interface UpdatePendingEditData {
  targetContactId?: string;
  targetContactName?: string;
  targetGroupId?: string;
  targetGroupName?: string;
  field?: string;
  proposedValue?: any;
  status?: PendingEditStatus;
  disambiguationCandidates?: DisambiguationCandidate[];
}

/**
 * Edit Repository Interface
 */
export interface EditRepositoryInterface {
  create(data: CreatePendingEditData): Promise<PendingEdit>;
  update(id: string, userId: string, data: UpdatePendingEditData): Promise<PendingEdit>;
  delete(id: string, userId: string): Promise<void>;
  findById(id: string, userId: string): Promise<PendingEdit | null>;
  findByUserId(userId: string): Promise<PendingEdit[]>;
  findBySessionId(sessionId: string, userId: string): Promise<PendingEdit[]>;
  deleteBySessionId(sessionId: string, userId: string): Promise<number>;
}

/**
 * PostgreSQL Edit Repository Implementation
 */
export class EditRepository implements EditRepositoryInterface {
  /**
   * Create a new pending edit
   */
  async create(data: CreatePendingEditData): Promise<PendingEdit> {
    const result = await pool.query(
      `INSERT INTO pending_edits (
        user_id, session_id, edit_type, target_contact_id, target_contact_name,
        target_group_id, target_group_name, field, proposed_value,
        confidence_score, source, status, disambiguation_candidates
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.userId,
        data.sessionId,
        data.editType,
        data.targetContactId || null,
        data.targetContactName || null,
        data.targetGroupId || null,
        data.targetGroupName || null,
        data.field || null,
        JSON.stringify(data.proposedValue),
        data.confidenceScore,
        JSON.stringify(data.source),
        data.status || 'pending',
        data.disambiguationCandidates ? JSON.stringify(data.disambiguationCandidates) : null,
      ]
    );

    return this.mapRowToPendingEdit(result.rows[0]);
  }

  /**
   * Update a pending edit
   */
  async update(id: string, userId: string, data: UpdatePendingEditData): Promise<PendingEdit> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.targetContactId !== undefined) {
      updates.push(`target_contact_id = $${paramCount++}`);
      values.push(data.targetContactId || null);
    }
    if (data.targetContactName !== undefined) {
      updates.push(`target_contact_name = $${paramCount++}`);
      values.push(data.targetContactName || null);
    }
    if (data.targetGroupId !== undefined) {
      updates.push(`target_group_id = $${paramCount++}`);
      values.push(data.targetGroupId || null);
    }
    if (data.targetGroupName !== undefined) {
      updates.push(`target_group_name = $${paramCount++}`);
      values.push(data.targetGroupName || null);
    }
    if (data.field !== undefined) {
      updates.push(`field = $${paramCount++}`);
      values.push(data.field || null);
    }
    if (data.proposedValue !== undefined) {
      updates.push(`proposed_value = $${paramCount++}`);
      values.push(JSON.stringify(data.proposedValue));
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.disambiguationCandidates !== undefined) {
      updates.push(`disambiguation_candidates = $${paramCount++}`);
      values.push(data.disambiguationCandidates ? JSON.stringify(data.disambiguationCandidates) : null);
    }

    if (updates.length === 0) {
      const edit = await this.findById(id, userId);
      if (!edit) {
        throw new Error('Pending edit not found');
      }
      return edit;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, userId);

    const result = await pool.query(
      `UPDATE pending_edits SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Pending edit not found');
    }

    return this.mapRowToPendingEdit(result.rows[0]);
  }

  /**
   * Delete a pending edit
   */
  async delete(id: string, userId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM pending_edits WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Pending edit not found');
    }
  }

  /**
   * Find a pending edit by ID
   */
  async findById(id: string, userId: string): Promise<PendingEdit | null> {
    const result = await pool.query(
      'SELECT * FROM pending_edits WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPendingEdit(result.rows[0]);
  }

  /**
   * Find all pending edits for a user
   */
  async findByUserId(userId: string): Promise<PendingEdit[]> {
    const result = await pool.query(
      'SELECT * FROM pending_edits WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map((row) => this.mapRowToPendingEdit(row));
  }

  /**
   * Find all pending edits for a session
   */
  async findBySessionId(sessionId: string, userId: string): Promise<PendingEdit[]> {
    const result = await pool.query(
      'SELECT * FROM pending_edits WHERE session_id = $1 AND user_id = $2 ORDER BY created_at DESC',
      [sessionId, userId]
    );

    return result.rows.map((row) => this.mapRowToPendingEdit(row));
  }

  /**
   * Delete all pending edits for a session
   * Returns the number of deleted edits
   */
  async deleteBySessionId(sessionId: string, userId: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM pending_edits WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    return result.rowCount || 0;
  }

  /**
   * Map database row to PendingEdit object
   */
  private mapRowToPendingEdit(row: any): PendingEdit {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      editType: row.edit_type as EditType,
      targetContactId: row.target_contact_id || undefined,
      targetContactName: row.target_contact_name || undefined,
      targetGroupId: row.target_group_id || undefined,
      targetGroupName: row.target_group_name || undefined,
      field: row.field || undefined,
      proposedValue: row.proposed_value,
      confidenceScore: parseFloat(row.confidence_score),
      source: row.source as EditSource,
      status: row.status as PendingEditStatus,
      disambiguationCandidates: row.disambiguation_candidates || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
