/**
 * Contact Repository
 *
 * Data access layer for contact operations using repository pattern.
 * Handles all database interactions for contacts, groups, and tags.
 */

import pool from '../db/connection';
import { Contact, FrequencyOption } from '../types';

/**
 * Contact Repository Interface
 */
export interface ContactRepository {
  create(userId: string, data: ContactCreateData): Promise<Contact>;
  update(id: string, userId: string, data: ContactUpdateData): Promise<Contact>;
  findById(id: string, userId: string): Promise<Contact | null>;
  findAll(userId: string, filters?: ContactFilters): Promise<Contact[]>;
  delete(id: string, userId: string): Promise<void>;
  archive(id: string, userId: string): Promise<void>;
  unarchive(id: string, userId: string): Promise<void>;
}

export interface ContactCreateData {
  name: string;
  phone?: string;
  email?: string;
  linkedIn?: string;
  instagram?: string;
  xHandle?: string;
  otherSocialMedia?: Record<string, string>;
  location?: string;
  timezone?: string;
  customNotes?: string;
  lastContactDate?: Date;
  frequencyPreference?: FrequencyOption;
}

export interface ContactUpdateData {
  name?: string;
  phone?: string;
  email?: string;
  linkedIn?: string;
  instagram?: string;
  xHandle?: string;
  otherSocialMedia?: Record<string, string>;
  location?: string;
  timezone?: string;
  customNotes?: string;
  lastContactDate?: Date;
  frequencyPreference?: FrequencyOption;
}

export interface ContactFilters {
  archived?: boolean;
  groupId?: string;
  search?: string;
}

/**
 * PostgreSQL Contact Repository Implementation
 */
export class PostgresContactRepository implements ContactRepository {
  async create(userId: string, data: ContactCreateData): Promise<Contact> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO contacts (
          user_id, name, phone, email, linked_in, instagram, x_handle,
          other_social_media, location, timezone, custom_notes,
          last_contact_date, frequency_preference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          userId,
          data.name,
          data.phone || null,
          data.email || null,
          data.linkedIn || null,
          data.instagram || null,
          data.xHandle || null,
          data.otherSocialMedia ? JSON.stringify(data.otherSocialMedia) : null,
          data.location || null,
          data.timezone || null,
          data.customNotes || null,
          data.lastContactDate || null,
          data.frequencyPreference || null,
        ]
      );

      await client.query('COMMIT');

      return this.mapRowToContact(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: string, userId: string, data: ContactUpdateData): Promise<Contact> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      if (data.phone !== undefined) {
        updates.push(`phone = $${paramCount++}`);
        values.push(data.phone || null);
      }
      if (data.email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(data.email || null);
      }
      if (data.linkedIn !== undefined) {
        updates.push(`linked_in = $${paramCount++}`);
        values.push(data.linkedIn || null);
      }
      if (data.instagram !== undefined) {
        updates.push(`instagram = $${paramCount++}`);
        values.push(data.instagram || null);
      }
      if (data.xHandle !== undefined) {
        updates.push(`x_handle = $${paramCount++}`);
        values.push(data.xHandle || null);
      }
      if (data.otherSocialMedia !== undefined) {
        updates.push(`other_social_media = $${paramCount++}`);
        values.push(data.otherSocialMedia ? JSON.stringify(data.otherSocialMedia) : null);
      }
      if (data.location !== undefined) {
        updates.push(`location = $${paramCount++}`);
        values.push(data.location || null);
      }
      if (data.timezone !== undefined) {
        updates.push(`timezone = $${paramCount++}`);
        values.push(data.timezone || null);
      }
      if (data.customNotes !== undefined) {
        updates.push(`custom_notes = $${paramCount++}`);
        values.push(data.customNotes || null);
      }
      if (data.lastContactDate !== undefined) {
        updates.push(`last_contact_date = $${paramCount++}`);
        values.push(data.lastContactDate || null);
      }
      if (data.frequencyPreference !== undefined) {
        updates.push(`frequency_preference = $${paramCount++}`);
        values.push(data.frequencyPreference || null);
      }

      if (updates.length === 0) {
        // No updates, just return current contact
        const contact = await this.findById(id, userId);
        if (!contact) {
          throw new Error('Contact not found');
        }
        return contact;
      }

      values.push(id, userId);
      const result = await client.query(
        `UPDATE contacts SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND user_id = $${paramCount++}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Contact not found');
      }

      await client.query('COMMIT');

      return this.mapRowToContact(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string, userId: string): Promise<Contact | null> {
    const result = await pool.query(
      `SELECT c.*,
        COALESCE(
          json_agg(DISTINCT g.id) FILTER (WHERE g.id IS NOT NULL),
          '[]'
        ) as group_ids,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', t.id,
            'text', t.text,
            'source', t.source,
            'createdAt', t.created_at
          )) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM contacts c
      LEFT JOIN contact_groups cg ON c.id = cg.contact_id
      LEFT JOIN groups g ON cg.group_id = g.id
      LEFT JOIN contact_tags ct ON c.id = ct.contact_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.id = $1 AND c.user_id = $2
      GROUP BY c.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToContact(result.rows[0]);
  }

  async findAll(userId: string, filters?: ContactFilters): Promise<Contact[]> {
    let query = `
      SELECT c.*,
        COALESCE(
          json_agg(DISTINCT g.id) FILTER (WHERE g.id IS NOT NULL),
          '[]'
        ) as group_ids,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', t.id,
            'text', t.text,
            'source', t.source,
            'createdAt', t.created_at
          )) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM contacts c
      LEFT JOIN contact_groups cg ON c.id = cg.contact_id
      LEFT JOIN groups g ON cg.group_id = g.id
      LEFT JOIN contact_tags ct ON c.id = ct.contact_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.user_id = $1
    `;

    const values: any[] = [userId];
    let paramCount = 2;

    if (filters?.archived !== undefined) {
      query += ` AND c.archived = $${paramCount++}`;
      values.push(filters.archived);
    }

    if (filters?.groupId) {
      query += ` AND g.id = $${paramCount++}`;
      values.push(filters.groupId);
    }

    if (filters?.search) {
      query += ` AND (c.name ILIKE $${paramCount++} OR c.email ILIKE $${paramCount} OR c.phone ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ` GROUP BY c.id ORDER BY c.name ASC`;

    const result = await pool.query(query, values);

    return result.rows.map((row) => this.mapRowToContact(row));
  }

  async delete(id: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query('DELETE FROM contacts WHERE id = $1 AND user_id = $2', [
        id,
        userId,
      ]);

      if (result.rowCount === 0) {
        throw new Error('Contact not found');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async archive(id: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE contacts SET archived = true WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Contact not found');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async unarchive(id: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE contacts SET archived = false WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Contact not found');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToContact(row: any): Contact {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      phone: row.phone || undefined,
      email: row.email || undefined,
      linkedIn: row.linked_in || undefined,
      instagram: row.instagram || undefined,
      xHandle: row.x_handle || undefined,
      otherSocialMedia: row.other_social_media || undefined,
      location: row.location || undefined,
      timezone: row.timezone || undefined,
      customNotes: row.custom_notes || undefined,
      lastContactDate: row.last_contact_date ? new Date(row.last_contact_date) : undefined,
      frequencyPreference: row.frequency_preference || undefined,
      groups: row.group_ids || [],
      tags: row.tags || [],
      archived: row.archived,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

/**
 * Get contacts by multiple IDs
 * Useful for batch operations like generating calendar feeds
 */
export async function getContactsByIds(userId: string, contactIds: string[]): Promise<Contact[]> {
  if (contactIds.length === 0) {
    return [];
  }

  const query = `
    SELECT c.*,
      COALESCE(
        json_agg(DISTINCT g.id) FILTER (WHERE g.id IS NOT NULL),
        '[]'
      ) as group_ids,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', t.id,
          'text', t.text,
          'source', t.source,
          'createdAt', t.created_at
        )) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) as tags
    FROM contacts c
    LEFT JOIN contact_groups cg ON c.id = cg.contact_id
    LEFT JOIN groups g ON cg.group_id = g.id
    LEFT JOIN contact_tags ct ON c.id = ct.contact_id
    LEFT JOIN tags t ON ct.tag_id = t.id
    WHERE c.user_id = $1 AND c.id = ANY($2)
    GROUP BY c.id
  `;

  const result = await pool.query(query, [userId, contactIds]);

  return result.rows.map((row) => {
    const repo = new PostgresContactRepository();
    return (repo as any).mapRowToContact(row);
  });
}
