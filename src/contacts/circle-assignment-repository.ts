/**
 * Circle Assignment Repository
 *
 * Data access layer for circle assignment history operations.
 * Tracks all changes to contact circle assignments for audit and analysis.
 *
 * Requirements: 3.3, 12.2, 12.5
 */

import pool from '../db/connection';

/**
 * Dunbar circle types
 */
export type DunbarCircle = 'inner' | 'close' | 'active' | 'casual';

/**
 * Assignment source types
 */
export type AssignedBy = 'user' | 'ai' | 'system';

/**
 * Circle assignment record from database
 */
export interface CircleAssignmentRecord {
  id: string;
  userId: string;
  contactId: string;
  fromCircle?: DunbarCircle;
  toCircle: DunbarCircle;
  assignedBy: AssignedBy;
  confidence?: number;
  assignedAt: Date;
  reason?: string;
}

/**
 * Data for creating circle assignment
 */
export interface CircleAssignmentCreateData {
  userId: string;
  contactId: string;
  fromCircle?: DunbarCircle;
  toCircle: DunbarCircle;
  assignedBy: AssignedBy;
  confidence?: number;
  reason?: string;
}

/**
 * Circle distribution summary
 */
export interface CircleDistribution {
  inner: number;
  close: number;
  active: number;
  casual: number;
  uncategorized: number;
  total: number;
}

/**
 * Circle Assignment Repository Interface
 */
export interface CircleAssignmentRepository {
  create(data: CircleAssignmentCreateData): Promise<CircleAssignmentRecord>;
  findByContactId(contactId: string, userId: string): Promise<CircleAssignmentRecord[]>;
  findByUserId(userId: string, limit?: number): Promise<CircleAssignmentRecord[]>;
  getCircleDistribution(userId: string): Promise<CircleDistribution>;
  getContactsInCircle(userId: string, circle: DunbarCircle): Promise<string[]>;
  getRecentAssignments(userId: string, limit: number): Promise<CircleAssignmentRecord[]>;
}

/**
 * PostgreSQL Circle Assignment Repository Implementation
 */
export class PostgresCircleAssignmentRepository implements CircleAssignmentRepository {
  /**
   * Create new circle assignment record
   * Requirements: 3.3
   */
  async create(data: CircleAssignmentCreateData): Promise<CircleAssignmentRecord> {
    const result = await pool.query(
      `INSERT INTO circle_assignments (
        user_id, contact_id, from_circle, to_circle, 
        assigned_by, confidence, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.userId,
        data.contactId,
        data.fromCircle || null,
        data.toCircle,
        data.assignedBy,
        data.confidence || null,
        data.reason || null,
      ]
    );

    return this.mapRowToCircleAssignment(result.rows[0]);
  }

  /**
   * Find all assignments for a contact
   * Requirements: 3.3
   */
  async findByContactId(contactId: string, userId: string): Promise<CircleAssignmentRecord[]> {
    const result = await pool.query(
      `SELECT * FROM circle_assignments
       WHERE contact_id = $1 AND user_id = $2
       ORDER BY assigned_at DESC`,
      [contactId, userId]
    );

    return result.rows.map((row) => this.mapRowToCircleAssignment(row));
  }

  /**
   * Find all assignments for a user
   * Requirements: 3.3
   */
  async findByUserId(userId: string, limit?: number): Promise<CircleAssignmentRecord[]> {
    let query = `
      SELECT * FROM circle_assignments
      WHERE user_id = $1
      ORDER BY assigned_at DESC
    `;

    const values: any[] = [userId];

    if (limit) {
      query += ` LIMIT $2`;
      values.push(limit);
    }

    const result = await pool.query(query, values);

    return result.rows.map((row) => this.mapRowToCircleAssignment(row));
  }

  /**
   * Get circle distribution for a user
   * Requirements: 12.4
   */
  async getCircleDistribution(userId: string): Promise<CircleDistribution> {
    const result = await pool.query(
      `SELECT 
        dunbar_circle,
        COUNT(*) as count
       FROM contacts
       WHERE user_id = $1 AND archived = false
       GROUP BY dunbar_circle`,
      [userId]
    );

    const distribution: CircleDistribution = {
      inner: 0,
      close: 0,
      active: 0,
      casual: 0,
      uncategorized: 0,
      total: 0,
    };

    for (const row of result.rows) {
      const count = parseInt(row.count, 10);
      if (row.dunbar_circle === null) {
        distribution.uncategorized = count;
      } else {
        distribution[row.dunbar_circle as DunbarCircle] = count;
      }
      distribution.total += count;
    }

    return distribution;
  }

  /**
   * Get all contact IDs in a specific circle
   * Requirements: 3.3
   */
  async getContactsInCircle(userId: string, circle: DunbarCircle): Promise<string[]> {
    const result = await pool.query(
      `SELECT id FROM contacts
       WHERE user_id = $1 AND dunbar_circle = $2 AND archived = false
       ORDER BY name ASC`,
      [userId, circle]
    );

    return result.rows.map((row) => row.id);
  }

  /**
   * Get recent assignments for a user
   * Requirements: 3.3
   */
  async getRecentAssignments(
    userId: string,
    limit: number = 10
  ): Promise<CircleAssignmentRecord[]> {
    const result = await pool.query(
      `SELECT * FROM circle_assignments
       WHERE user_id = $1
       ORDER BY assigned_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row) => this.mapRowToCircleAssignment(row));
  }

  /**
   * Map database row to CircleAssignmentRecord
   */
  private mapRowToCircleAssignment(row: any): CircleAssignmentRecord {
    return {
      id: row.id,
      userId: row.user_id,
      contactId: row.contact_id,
      fromCircle: row.from_circle || undefined,
      toCircle: row.to_circle as DunbarCircle,
      assignedBy: row.assigned_by as AssignedBy,
      confidence: row.confidence ? parseFloat(row.confidence) : undefined,
      assignedAt: new Date(row.assigned_at),
      reason: row.reason || undefined,
    };
  }
}

// Default instance for backward compatibility
const defaultRepository = new PostgresCircleAssignmentRepository();

export const create = (data: CircleAssignmentCreateData) => defaultRepository.create(data);
export const findByContactId = (contactId: string, userId: string) =>
  defaultRepository.findByContactId(contactId, userId);
export const findByUserId = (userId: string, limit?: number) =>
  defaultRepository.findByUserId(userId, limit);
export const getCircleDistribution = (userId: string) =>
  defaultRepository.getCircleDistribution(userId);
export const getContactsInCircle = (userId: string, circle: DunbarCircle) =>
  defaultRepository.getContactsInCircle(userId, circle);
export const getRecentAssignments = (userId: string, limit?: number) =>
  defaultRepository.getRecentAssignments(userId, limit);
