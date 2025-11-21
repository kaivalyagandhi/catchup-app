/**
 * Voice Note Repository
 *
 * Handles database operations for voice notes
 */

import { Pool } from 'pg';
import { VoiceNote, ExtractedEntities } from '../types';

export class VoiceNoteRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new voice note record
   */
  async create(
    userId: string,
    audioUrl: string,
    transcript: string,
    contactId?: string,
    extractedEntities?: ExtractedEntities
  ): Promise<VoiceNote> {
    const query = `
      INSERT INTO voice_notes (user_id, audio_url, transcript, contact_id, extracted_entities, processed)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const processed = !!extractedEntities;
    const result = await this.pool.query(query, [
      userId,
      audioUrl,
      transcript,
      contactId || null,
      extractedEntities ? JSON.stringify(extractedEntities) : null,
      processed,
    ]);

    return this.mapRowToVoiceNote(result.rows[0]);
  }

  /**
   * Update a voice note with extracted entities and contact
   */
  async update(
    id: string,
    contactId: string | null,
    extractedEntities: ExtractedEntities,
    processed: boolean = true
  ): Promise<VoiceNote> {
    const query = `
      UPDATE voice_notes
      SET contact_id = $1, extracted_entities = $2, processed = $3
      WHERE id = $4
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      contactId,
      JSON.stringify(extractedEntities),
      processed,
      id,
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Voice note with id ${id} not found`);
    }

    return this.mapRowToVoiceNote(result.rows[0]);
  }

  /**
   * Get a voice note by ID
   */
  async getById(id: string): Promise<VoiceNote | null> {
    const query = 'SELECT * FROM voice_notes WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVoiceNote(result.rows[0]);
  }

  /**
   * Get all voice notes for a user
   */
  async getByUserId(userId: string): Promise<VoiceNote[]> {
    const query = `
      SELECT * FROM voice_notes
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);

    return result.rows.map(this.mapRowToVoiceNote);
  }

  /**
   * Delete a voice note
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM voice_notes WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  /**
   * Map database row to VoiceNote object
   */
  private mapRowToVoiceNote(row: any): VoiceNote {
    return {
      id: row.id,
      userId: row.user_id,
      audioUrl: row.audio_url,
      transcript: row.transcript,
      contactId: row.contact_id,
      extractedEntities: row.extracted_entities,
      processed: row.processed,
      createdAt: row.created_at,
    };
  }
}
