/**
 * Interaction Repository
 *
 * Data access layer for interaction log operations.
 */

import pool from '../db/connection';
import { InteractionLog, InteractionType } from '../types';

/**
 * Interaction Log Data for creation
 */
export interface InteractionLogData {
  userId: string;
  contactId: string;
  date: Date;
  type: InteractionType;
  notes?: string;
  suggestionId?: string;
}

/**
 * Interaction Repository Interface
 */
export interface InteractionRepository {
  create(data: InteractionLogData): Promise<InteractionLog>;
  findByContactId(contactId: string, userId: string): Promise<InteractionLog[]>;
  findById(id: string, userId: string): Promise<InteractionLog | null>;
}

/**
 * PostgreSQL Interaction Repository Implementation
 */
export class PostgresInteractionRepository implements InteractionRepository {
  async create(data: InteractionLogData): Promise<InteractionLog> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify contact belongs to user
      const contactCheck = await client.query(
        'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
        [data.contactId, data.userId]
      );
      if (contactCheck.rows.length === 0) {
        throw new Error('Contact not found');
      }

      // Create interaction log
      const result = await client.query(
        `INSERT INTO interaction_logs (user_id, contact_id, date, type, notes, suggestion_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.userId,
          data.contactId,
          data.date,
          data.type,
          data.notes || null,
          data.suggestionId || null,
        ]
      );

      // Update contact's last_contact_date
      await client.query(
        `UPDATE contacts
         SET last_contact_date = $1
         WHERE id = $2 AND user_id = $3`,
        [data.date, data.contactId, data.userId]
      );

      await client.query('COMMIT');

      return this.mapRowToInteractionLog(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByContactId(contactId: string, userId: string): Promise<InteractionLog[]> {
    const result = await pool.query(
      `SELECT * FROM interaction_logs
       WHERE contact_id = $1 AND user_id = $2
       ORDER BY date DESC`,
      [contactId, userId]
    );

    return result.rows.map((row) => this.mapRowToInteractionLog(row));
  }

  async findById(id: string, userId: string): Promise<InteractionLog | null> {
    const result = await pool.query(
      'SELECT * FROM interaction_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToInteractionLog(result.rows[0]);
  }

  private mapRowToInteractionLog(row: any): InteractionLog {
    return {
      id: row.id,
      userId: row.user_id,
      contactId: row.contact_id,
      date: new Date(row.date),
      type: row.type as InteractionType,
      notes: row.notes || undefined,
      suggestionId: row.suggestion_id || undefined,
      createdAt: new Date(row.created_at),
    };
  }
}

// Default instance for backward compatibility
const defaultRepository = new PostgresInteractionRepository();

export const create = (data: InteractionLogData) => defaultRepository.create(data);
export const findByContactId = (contactId: string, userId: string) => defaultRepository.findByContactId(contactId, userId);
export const findById = (id: string, userId: string) => defaultRepository.findById(id, userId);
