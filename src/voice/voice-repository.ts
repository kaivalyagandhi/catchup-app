/**
 * Voice Note Repository
 *
 * Data access layer for voice note operations using repository pattern.
 * Handles all database interactions for voice notes, multi-contact associations,
 * and enrichment items.
 *
 * Requirements: 13.1-13.8, 2.2, 2.6
 */

import pool from '../db/connection';
import { VoiceNote, VoiceNoteStatus, VoiceNoteFilters, ExtractedEntities, Contact } from '../types';
import { getContactsByIds } from '../contacts/repository';

/**
 * Voice Note Create Data
 */
export interface VoiceNoteCreateData {
  userId: string;
  transcript: string;
  recordingTimestamp?: Date;
  status?: VoiceNoteStatus;
  extractedEntities?: Record<string, ExtractedEntities>;
  enrichmentData?: any;
}

/**
 * Voice Note Update Data
 */
export interface VoiceNoteUpdateData {
  transcript?: string;
  status?: VoiceNoteStatus;
  extractedEntities?: Record<string, ExtractedEntities>;
  enrichmentData?: any;
}

/**
 * Voice Note Repository Interface
 */
export interface VoiceNoteRepositoryInterface {
  create(data: VoiceNoteCreateData): Promise<VoiceNote>;
  update(id: string, userId: string, data: VoiceNoteUpdateData): Promise<VoiceNote>;
  getById(id: string, userId: string): Promise<VoiceNote | null>;
  listByUserId(userId: string, filters?: VoiceNoteFilters): Promise<VoiceNote[]>;
  delete(id: string, userId: string): Promise<void>;
  associateContacts(voiceNoteId: string, userId: string, contactIds: string[]): Promise<void>;
  getAssociatedContacts(voiceNoteId: string, userId: string): Promise<Contact[]>;
  removeContactAssociation(voiceNoteId: string, userId: string, contactId: string): Promise<void>;
}

/**
 * PostgreSQL Voice Note Repository Implementation
 */
export class VoiceNoteRepository implements VoiceNoteRepositoryInterface {
  /**
   * Create a new voice note
   * Requirements: 13.1, 13.2
   */
  async create(data: VoiceNoteCreateData): Promise<VoiceNote> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO voice_notes (
          user_id, transcript, recording_timestamp, status, extracted_entities, enrichment_data
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          data.userId,
          data.transcript,
          data.recordingTimestamp || new Date(),
          data.status || 'transcribing',
          data.extractedEntities ? JSON.stringify(data.extractedEntities) : null,
          data.enrichmentData ? JSON.stringify(data.enrichmentData) : null,
        ]
      );

      await client.query('COMMIT');

      return this.mapRowToVoiceNote(result.rows[0], []);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a voice note
   * Requirements: 13.5
   */
  async update(id: string, userId: string, data: VoiceNoteUpdateData): Promise<VoiceNote> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.transcript !== undefined) {
        updates.push(`transcript = $${paramCount++}`);
        values.push(data.transcript);
      }
      if (data.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(data.status);
      }
      if (data.extractedEntities !== undefined) {
        updates.push(`extracted_entities = $${paramCount++}`);
        values.push(data.extractedEntities ? JSON.stringify(data.extractedEntities) : null);
      }
      if (data.enrichmentData !== undefined) {
        updates.push(`enrichment_data = $${paramCount++}`);
        values.push(data.enrichmentData ? JSON.stringify(data.enrichmentData) : null);
      }

      if (updates.length === 0) {
        // No updates, just return current voice note
        const voiceNote = await this.getById(id, userId);
        if (!voiceNote) {
          throw new Error('Voice note not found');
        }
        return voiceNote;
      }

      // Add updated_at timestamp
      updates.push(`updated_at = NOW()`);

      values.push(id, userId);
      const result = await client.query(
        `UPDATE voice_notes SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND user_id = $${paramCount++}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Voice note not found');
      }

      // Get associated contacts
      const contacts = await this.getAssociatedContacts(id, userId);

      await client.query('COMMIT');

      return this.mapRowToVoiceNote(result.rows[0], contacts);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a voice note by ID with associated contacts
   * Requirements: 13.4
   */
  async getById(id: string, userId: string): Promise<VoiceNote | null> {
    const result = await pool.query(
      `SELECT * FROM voice_notes
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Get associated contacts
    const contacts = await this.getAssociatedContacts(id, userId);

    return this.mapRowToVoiceNote(result.rows[0], contacts);
  }

  /**
   * List voice notes for a user with optional filters
   * Requirements: 13.4, 13.6, 13.7, 13.8
   */
  async listByUserId(userId: string, filters?: VoiceNoteFilters): Promise<VoiceNote[]> {
    let query = `
      SELECT DISTINCT vn.*
      FROM voice_notes vn
      LEFT JOIN voice_note_contacts vnc ON vn.id = vnc.voice_note_id
      WHERE vn.user_id = $1
    `;

    const values: any[] = [userId];
    let paramCount = 2;

    // Apply filters
    if (filters?.contactIds && filters.contactIds.length > 0) {
      query += ` AND vnc.contact_id = ANY($${paramCount++})`;
      values.push(filters.contactIds);
    }

    if (filters?.status) {
      query += ` AND vn.status = $${paramCount++}`;
      values.push(filters.status);
    }

    if (filters?.dateFrom) {
      query += ` AND vn.recording_timestamp >= $${paramCount++}`;
      values.push(filters.dateFrom);
    }

    if (filters?.dateTo) {
      query += ` AND vn.recording_timestamp <= $${paramCount++}`;
      values.push(filters.dateTo);
    }

    if (filters?.searchText) {
      query += ` AND vn.transcript ILIKE $${paramCount++}`;
      values.push(`%${filters.searchText}%`);
    }

    query += ` ORDER BY vn.recording_timestamp DESC`;

    const result = await pool.query(query, values);

    // Get contacts for each voice note
    const voiceNotes = await Promise.all(
      result.rows.map(async (row) => {
        const contacts = await this.getAssociatedContacts(row.id, userId);
        return this.mapRowToVoiceNote(row, contacts);
      })
    );

    return voiceNotes;
  }

  /**
   * Delete a voice note
   * Requirements: 13.7
   */
  async delete(id: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query('DELETE FROM voice_notes WHERE id = $1 AND user_id = $2', [
        id,
        userId,
      ]);

      if (result.rowCount === 0) {
        throw new Error('Voice note not found');
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
   * Associate multiple contacts with a voice note
   * Requirements: 2.2, 13.3
   */
  async associateContacts(
    voiceNoteId: string,
    userId: string,
    contactIds: string[]
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify voice note belongs to user
      const voiceNoteCheck = await client.query(
        'SELECT id FROM voice_notes WHERE id = $1 AND user_id = $2',
        [voiceNoteId, userId]
      );
      if (voiceNoteCheck.rows.length === 0) {
        throw new Error('Voice note not found');
      }

      // Verify all contacts belong to user
      const contactCheck = await client.query(
        'SELECT id FROM contacts WHERE id = ANY($1) AND user_id = $2',
        [contactIds, userId]
      );
      if (contactCheck.rows.length !== contactIds.length) {
        throw new Error('One or more contacts not found');
      }

      // Insert associations (ON CONFLICT DO NOTHING to handle duplicates)
      for (const contactId of contactIds) {
        await client.query(
          `INSERT INTO voice_note_contacts (voice_note_id, contact_id)
           VALUES ($1, $2)
           ON CONFLICT (voice_note_id, contact_id) DO NOTHING`,
          [voiceNoteId, contactId]
        );
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
   * Get all contacts associated with a voice note
   * Requirements: 2.6
   */
  async getAssociatedContacts(voiceNoteId: string, userId: string): Promise<Contact[]> {
    const result = await pool.query(
      `SELECT c.id
       FROM voice_note_contacts vnc
       JOIN contacts c ON vnc.contact_id = c.id
       WHERE vnc.voice_note_id = $1 AND c.user_id = $2
       ORDER BY vnc.created_at ASC`,
      [voiceNoteId, userId]
    );

    if (result.rows.length === 0) {
      return [];
    }

    const contactIds = result.rows.map((row) => row.id);
    const contacts = await getContactsByIds(userId, contactIds);

    // Preserve the order from the query
    const contactMap = new Map(contacts.map((c) => [c.id, c]));
    return contactIds.map((id) => contactMap.get(id)!).filter(Boolean);
  }

  /**
   * Remove a contact association from a voice note
   * Requirements: 2.6
   */
  async removeContactAssociation(
    voiceNoteId: string,
    userId: string,
    contactId: string
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify voice note belongs to user
      const voiceNoteCheck = await client.query(
        'SELECT id FROM voice_notes WHERE id = $1 AND user_id = $2',
        [voiceNoteId, userId]
      );
      if (voiceNoteCheck.rows.length === 0) {
        throw new Error('Voice note not found');
      }

      // Remove association
      const result = await client.query(
        `DELETE FROM voice_note_contacts
         WHERE voice_note_id = $1 AND contact_id = $2`,
        [voiceNoteId, contactId]
      );

      if (result.rowCount === 0) {
        throw new Error('Contact association not found');
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
   * Map database row to VoiceNote object
   */
  private mapRowToVoiceNote(row: any, contacts: Contact[]): VoiceNote {
    return {
      id: row.id,
      userId: row.user_id,
      transcript: row.transcript,
      recordingTimestamp: new Date(row.recording_timestamp),
      status: row.status as VoiceNoteStatus,
      extractedEntities: row.extracted_entities || undefined,
      enrichmentData: row.enrichment_data || undefined,
      contacts,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
