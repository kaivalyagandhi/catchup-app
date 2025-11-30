/**
 * Weekly Catchup Repository
 *
 * Data access layer for weekly catchup session operations.
 * Manages weekly contact review sessions for progressive onboarding.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import pool from '../db/connection';

/**
 * Contact review item for weekly catchup
 */
export interface ContactReviewItem {
  contactId: string;
  reviewType: 'categorize' | 'maintain' | 'prune';
  lastInteraction?: Date;
  suggestedAction?: string;
}

/**
 * Weekly catchup session record from database
 */
export interface WeeklyCatchupSessionRecord {
  id: string;
  userId: string;
  weekNumber: number;
  year: number;
  contactsToReview: ContactReviewItem[];
  reviewedContacts: string[];
  startedAt: Date;
  completedAt?: Date;
  skipped: boolean;
}

/**
 * Data for creating weekly catchup session
 */
export interface WeeklyCatchupSessionCreateData {
  userId: string;
  weekNumber: number;
  year: number;
  contactsToReview: ContactReviewItem[];
}

/**
 * Data for updating weekly catchup session
 */
export interface WeeklyCatchupSessionUpdateData {
  reviewedContacts?: string[];
  completedAt?: Date;
  skipped?: boolean;
}

/**
 * Weekly Catchup Repository Interface
 */
export interface WeeklyCatchupRepository {
  create(data: WeeklyCatchupSessionCreateData): Promise<WeeklyCatchupSessionRecord>;
  update(id: string, userId: string, data: WeeklyCatchupSessionUpdateData): Promise<WeeklyCatchupSessionRecord>;
  findById(id: string, userId: string): Promise<WeeklyCatchupSessionRecord | null>;
  findByWeek(userId: string, year: number, weekNumber: number): Promise<WeeklyCatchupSessionRecord | null>;
  findCurrentSession(userId: string): Promise<WeeklyCatchupSessionRecord | null>;
  findRecentSessions(userId: string, limit: number): Promise<WeeklyCatchupSessionRecord[]>;
  markContactReviewed(id: string, userId: string, contactId: string): Promise<void>;
  markComplete(id: string, userId: string): Promise<void>;
  markSkipped(id: string, userId: string): Promise<void>;
  getUnreviewedContacts(id: string, userId: string): Promise<ContactReviewItem[]>;
}

/**
 * PostgreSQL Weekly Catchup Repository Implementation
 */
export class PostgresWeeklyCatchupRepository implements WeeklyCatchupRepository {
  /**
   * Create new weekly catchup session
   * Requirements: 7.1
   */
  async create(data: WeeklyCatchupSessionCreateData): Promise<WeeklyCatchupSessionRecord> {
    const result = await pool.query(
      `INSERT INTO weekly_catchup_sessions (
        user_id, week_number, year, contacts_to_review
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, year, week_number)
      DO UPDATE SET
        contacts_to_review = EXCLUDED.contacts_to_review,
        started_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        data.userId,
        data.weekNumber,
        data.year,
        JSON.stringify(data.contactsToReview),
      ]
    );

    return this.mapRowToWeeklyCatchupSession(result.rows[0]);
  }

  /**
   * Update weekly catchup session
   * Requirements: 7.3, 7.4
   */
  async update(
    id: string,
    userId: string,
    data: WeeklyCatchupSessionUpdateData
  ): Promise<WeeklyCatchupSessionRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.reviewedContacts !== undefined) {
        updates.push(`reviewed_contacts = $${paramCount++}`);
        values.push(JSON.stringify(data.reviewedContacts));
      }

      if (data.completedAt !== undefined) {
        updates.push(`completed_at = $${paramCount++}`);
        values.push(data.completedAt);
      }

      if (data.skipped !== undefined) {
        updates.push(`skipped = $${paramCount++}`);
        values.push(data.skipped);
      }

      if (updates.length === 0) {
        const current = await this.findById(id, userId);
        if (!current) {
          throw new Error('Weekly catchup session not found');
        }
        await client.query('COMMIT');
        return current;
      }

      values.push(id, userId);
      const result = await client.query(
        `UPDATE weekly_catchup_sessions
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND user_id = $${paramCount++}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Weekly catchup session not found');
      }

      await client.query('COMMIT');
      return this.mapRowToWeeklyCatchupSession(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find session by ID
   * Requirements: 7.1
   */
  async findById(id: string, userId: string): Promise<WeeklyCatchupSessionRecord | null> {
    const result = await pool.query(
      'SELECT * FROM weekly_catchup_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWeeklyCatchupSession(result.rows[0]);
  }

  /**
   * Find session by week
   * Requirements: 7.1
   */
  async findByWeek(
    userId: string,
    year: number,
    weekNumber: number
  ): Promise<WeeklyCatchupSessionRecord | null> {
    const result = await pool.query(
      `SELECT * FROM weekly_catchup_sessions
       WHERE user_id = $1 AND year = $2 AND week_number = $3`,
      [userId, year, weekNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWeeklyCatchupSession(result.rows[0]);
  }

  /**
   * Find current incomplete session
   * Requirements: 7.1
   */
  async findCurrentSession(userId: string): Promise<WeeklyCatchupSessionRecord | null> {
    const result = await pool.query(
      `SELECT * FROM weekly_catchup_sessions
       WHERE user_id = $1 
         AND completed_at IS NULL 
         AND skipped = false
       ORDER BY year DESC, week_number DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWeeklyCatchupSession(result.rows[0]);
  }

  /**
   * Find recent sessions
   * Requirements: 7.1
   */
  async findRecentSessions(userId: string, limit: number = 10): Promise<WeeklyCatchupSessionRecord[]> {
    const result = await pool.query(
      `SELECT * FROM weekly_catchup_sessions
       WHERE user_id = $1
       ORDER BY year DESC, week_number DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row) => this.mapRowToWeeklyCatchupSession(row));
  }

  /**
   * Mark a contact as reviewed
   * Requirements: 7.2
   */
  async markContactReviewed(id: string, userId: string, contactId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE weekly_catchup_sessions
         SET reviewed_contacts = 
           CASE 
             WHEN reviewed_contacts @> $3::jsonb THEN reviewed_contacts
             ELSE reviewed_contacts || $3::jsonb
           END
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId, JSON.stringify([contactId])]
      );

      if (result.rows.length === 0) {
        throw new Error('Weekly catchup session not found');
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
   * Mark session as complete
   * Requirements: 7.3
   */
  async markComplete(id: string, userId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE weekly_catchup_sessions
       SET completed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Weekly catchup session not found');
    }
  }

  /**
   * Mark session as skipped
   * Requirements: 7.4
   */
  async markSkipped(id: string, userId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE weekly_catchup_sessions
       SET skipped = true
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Weekly catchup session not found');
    }
  }

  /**
   * Get unreviewed contacts from a session
   * Requirements: 7.2, 7.4
   */
  async getUnreviewedContacts(id: string, userId: string): Promise<ContactReviewItem[]> {
    const session = await this.findById(id, userId);
    if (!session) {
      throw new Error('Weekly catchup session not found');
    }

    const reviewedSet = new Set(session.reviewedContacts);
    return session.contactsToReview.filter(
      (item) => !reviewedSet.has(item.contactId)
    );
  }

  /**
   * Map database row to WeeklyCatchupSessionRecord
   */
  private mapRowToWeeklyCatchupSession(row: any): WeeklyCatchupSessionRecord {
    return {
      id: row.id,
      userId: row.user_id,
      weekNumber: row.week_number,
      year: row.year,
      contactsToReview: row.contacts_to_review || [],
      reviewedContacts: row.reviewed_contacts || [],
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      skipped: row.skipped || false,
    };
  }
}

// Default instance for backward compatibility
const defaultRepository = new PostgresWeeklyCatchupRepository();

export const create = (data: WeeklyCatchupSessionCreateData) => defaultRepository.create(data);
export const update = (id: string, userId: string, data: WeeklyCatchupSessionUpdateData) => defaultRepository.update(id, userId, data);
export const findById = (id: string, userId: string) => defaultRepository.findById(id, userId);
export const findByWeek = (userId: string, year: number, weekNumber: number) => defaultRepository.findByWeek(userId, year, weekNumber);
export const findCurrentSession = (userId: string) => defaultRepository.findCurrentSession(userId);
export const findRecentSessions = (userId: string, limit?: number) => defaultRepository.findRecentSessions(userId, limit);
export const markContactReviewed = (id: string, userId: string, contactId: string) => defaultRepository.markContactReviewed(id, userId, contactId);
export const markComplete = (id: string, userId: string) => defaultRepository.markComplete(id, userId);
export const markSkipped = (id: string, userId: string) => defaultRepository.markSkipped(id, userId);
export const getUnreviewedContacts = (id: string, userId: string) => defaultRepository.getUnreviewedContacts(id, userId);
