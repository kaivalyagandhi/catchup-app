/**
 * Edit History Repository
 *
 * Data access layer for edit history (immutable records).
 * Handles all database interactions for edit history entries.
 *
 * Requirements: 10.1, 10.3
 */

import pool from '../db/connection';
import { EditHistoryEntry, EditType, EditSource, EditHistoryOptions } from '../types';

/**
 * Create edit history entry data
 */
export interface CreateEditHistoryData {
  userId: string;
  originalEditId: string;
  editType: EditType;
  targetContactId?: string;
  targetContactName?: string;
  targetGroupId?: string;
  targetGroupName?: string;
  field?: string;
  appliedValue: any;
  previousValue?: any;
  source: EditSource;
}

/**
 * Edit History Repository Interface
 */
export interface EditHistoryRepositoryInterface {
  create(data: CreateEditHistoryData): Promise<EditHistoryEntry>;
  findById(id: string, userId: string): Promise<EditHistoryEntry | null>;
  findByUserId(userId: string, options?: EditHistoryOptions): Promise<EditHistoryEntry[]>;
  count(userId: string): Promise<number>;
}

/**
 * PostgreSQL Edit History Repository Implementation
 * Note: No update or delete methods - edit history is immutable
 */
export class EditHistoryRepository implements EditHistoryRepositoryInterface {
  /**
   * Create a new edit history entry
   */
  async create(data: CreateEditHistoryData): Promise<EditHistoryEntry> {
    const result = await pool.query(
      `INSERT INTO edit_history (
        user_id, original_edit_id, edit_type, target_contact_id, target_contact_name,
        target_group_id, target_group_name, field, applied_value, previous_value, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        data.userId,
        data.originalEditId,
        data.editType,
        data.targetContactId || null,
        data.targetContactName || null,
        data.targetGroupId || null,
        data.targetGroupName || null,
        data.field || null,
        JSON.stringify(data.appliedValue),
        data.previousValue !== undefined ? JSON.stringify(data.previousValue) : null,
        JSON.stringify(data.source),
      ]
    );

    return this.mapRowToEditHistoryEntry(result.rows[0]);
  }

  /**
   * Find an edit history entry by ID
   */
  async findById(id: string, userId: string): Promise<EditHistoryEntry | null> {
    const result = await pool.query('SELECT * FROM edit_history WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEditHistoryEntry(result.rows[0]);
  }

  /**
   * Find all edit history entries for a user with pagination
   * Returns entries in descending order by submitted_at (newest first)
   */
  async findByUserId(userId: string, options?: EditHistoryOptions): Promise<EditHistoryEntry[]> {
    let query = 'SELECT * FROM edit_history WHERE user_id = $1';
    const values: any[] = [userId];
    let paramCount = 2;

    if (options?.dateFrom) {
      query += ` AND submitted_at >= $${paramCount++}`;
      values.push(options.dateFrom);
    }

    if (options?.dateTo) {
      query += ` AND submitted_at <= $${paramCount++}`;
      values.push(options.dateTo);
    }

    query += ' ORDER BY submitted_at DESC';

    if (options?.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(options.limit);
    }

    if (options?.offset) {
      query += ` OFFSET $${paramCount++}`;
      values.push(options.offset);
    }

    const result = await pool.query(query, values);

    return result.rows.map((row) => this.mapRowToEditHistoryEntry(row));
  }

  /**
   * Count total edit history entries for a user
   */
  async count(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM edit_history WHERE user_id = $1',
      [userId]
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Map database row to EditHistoryEntry object
   */
  private mapRowToEditHistoryEntry(row: any): EditHistoryEntry {
    return {
      id: row.id,
      userId: row.user_id,
      originalEditId: row.original_edit_id,
      editType: row.edit_type as EditType,
      targetContactId: row.target_contact_id || undefined,
      targetContactName: row.target_contact_name || undefined,
      targetGroupId: row.target_group_id || undefined,
      targetGroupName: row.target_group_name || undefined,
      field: row.field || undefined,
      appliedValue: row.applied_value,
      previousValue: row.previous_value || undefined,
      source: row.source as EditSource,
      submittedAt: new Date(row.submitted_at),
    };
  }
}
