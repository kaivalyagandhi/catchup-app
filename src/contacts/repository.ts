/**
 * Contact Repository
 *
 * Data access layer for contact operations using repository pattern.
 * Handles all database interactions for contacts, groups, and tags.
 */

import pool from '../db/connection';
import { Contact, FrequencyOption } from '../types';

/**
 * Dunbar circle types for contact categorization (Simplified 4-circle system)
 */
export type DunbarCircle = 'inner' | 'close' | 'active' | 'casual';

/**
 * Contact Repository Interface
 */
export interface ContactRepository {
  create(userId: string, data: ContactCreateData): Promise<Contact>;
  update(id: string, userId: string, data: ContactUpdateData): Promise<Contact>;
  findById(id: string, userId: string): Promise<Contact | null>;
  findAll(userId: string, filters?: ContactFilters): Promise<Contact[]>;
  findByGoogleResourceName(userId: string, resourceName: string): Promise<Contact | null>;
  findBySource(
    userId: string,
    source: 'manual' | 'google' | 'calendar' | 'voice_note'
  ): Promise<Contact[]>;
  delete(id: string, userId: string): Promise<void>;
  archive(id: string, userId: string): Promise<void>;
  unarchive(id: string, userId: string): Promise<void>;
  clearGoogleSyncMetadata(userId: string): Promise<void>;

  // Archive methods - Requirements: 14.1, 15.1, 15.2, 16.4
  previewArchival(userId: string, contactIds: string[]): Promise<Contact[]>;
  archiveContacts(userId: string, contactIds: string[]): Promise<number>;
  restoreContacts(userId: string, contactIds: string[]): Promise<number>;
  findArchived(userId: string): Promise<Contact[]>;

  // Circle assignment methods - Requirements: 3.3, 12.2, 12.5
  assignToCircle(
    id: string,
    userId: string,
    circle: DunbarCircle,
    confidence?: number
  ): Promise<Contact>;
  batchAssignToCircle(contactIds: string[], userId: string, circle: DunbarCircle): Promise<void>;
  findUncategorized(userId: string): Promise<Contact[]>;
  findByCircle(userId: string, circle: DunbarCircle): Promise<Contact[]>;
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
  source?: 'manual' | 'google' | 'calendar' | 'voice_note';
  googleResourceName?: string;
  googleEtag?: string;
  lastSyncedAt?: Date;
}

/**
 * Contact Update Data
 *
 * IMPORTANT - Requirements: 15.4
 * When updating contacts from user edits, DO NOT include Google metadata fields
 * (source, googleResourceName, googleEtag, lastSyncedAt).
 * These fields should only be updated during sync operations from Google.
 * This ensures local edits stay local and don't trigger Google API calls.
 */
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
  dunbarCircle?: 'inner' | 'close' | 'active' | 'casual';
  // Google metadata fields - only updated during sync operations
  source?: 'manual' | 'google' | 'calendar' | 'voice_note';
  googleResourceName?: string;
  googleEtag?: string;
  lastSyncedAt?: Date;
}

export interface ContactFilters {
  archived?: boolean;
  includeArchived?: boolean;
  groupId?: string;
  search?: string;
  source?: 'manual' | 'google' | 'calendar' | 'voice_note';
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
          last_contact_date, frequency_preference, source,
          google_resource_name, google_etag, last_synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
          data.source || 'manual',
          data.googleResourceName || null,
          data.googleEtag || null,
          data.lastSyncedAt || null,
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

      // LOCAL EDIT HANDLING - Requirements: 15.4
      // This method updates ONLY the fields provided in the data parameter.
      // Google metadata fields (google_resource_name, google_etag, last_synced_at, source)
      // are preserved unless explicitly provided (which only happens during sync operations).
      // User edits from the UI never include these fields, ensuring Google metadata is preserved.

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
      if (data.dunbarCircle !== undefined) {
        updates.push(`dunbar_circle = $${paramCount++}`);
        values.push(data.dunbarCircle || null);
      }
      if (data.source !== undefined) {
        updates.push(`source = $${paramCount++}`);
        values.push(data.source || 'manual');
      }
      if (data.googleResourceName !== undefined) {
        updates.push(`google_resource_name = $${paramCount++}`);
        values.push(data.googleResourceName || null);
      }
      if (data.googleEtag !== undefined) {
        updates.push(`google_etag = $${paramCount++}`);
        values.push(data.googleEtag || null);
      }
      if (data.lastSyncedAt !== undefined) {
        updates.push(`last_synced_at = $${paramCount++}`);
        values.push(data.lastSyncedAt || null);
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

  async findByGoogleResourceName(userId: string, resourceName: string): Promise<Contact | null> {
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
      WHERE c.user_id = $1 AND c.google_resource_name = $2
      GROUP BY c.id`,
      [userId, resourceName]
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
      // Handle archived filtering - Requirements: 15.2, 15.3, 15.4
      if (filters.archived === true) {
        // Only archived contacts
        query += ` AND c.archived_at IS NOT NULL`;
      } else {
        // Only non-archived contacts
        query += ` AND c.archived_at IS NULL`;
      }
    } else if (!filters?.includeArchived) {
      // Exclude archived by default
      query += ` AND c.archived_at IS NULL`;
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

    if (filters?.source) {
      query += ` AND c.source = $${paramCount++}`;
      values.push(filters.source);
    }

    query += ` GROUP BY c.id ORDER BY c.name ASC`;

    const result = await pool.query(query, values);

    return result.rows.map((row) => this.mapRowToContact(row));
  }

  async findBySource(
    userId: string,
    source: 'manual' | 'google' | 'calendar' | 'voice_note'
  ): Promise<Contact[]> {
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
      WHERE c.user_id = $1 AND c.source = $2
      GROUP BY c.id
      ORDER BY c.name ASC`,
      [userId, source]
    );

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
        'UPDATE contacts SET archived_at = NOW() WHERE id = $1 AND user_id = $2 AND archived_at IS NULL',
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Contact not found or already archived');
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
        'UPDATE contacts SET archived_at = NULL WHERE id = $1 AND user_id = $2 AND archived_at IS NOT NULL',
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Contact not found or not archived');
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
   * Preview contacts that would be archived
   * Requirements: 14.1, 14.5
   * This method does NOT modify any data - it only returns contacts for preview
   */
  async previewArchival(userId: string, contactIds: string[]): Promise<Contact[]> {
    if (contactIds.length === 0) {
      return [];
    }

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
      WHERE c.user_id = $1 AND c.id = ANY($2) AND c.archived_at IS NULL
      GROUP BY c.id
      ORDER BY c.name ASC`,
      [userId, contactIds]
    );

    return result.rows.map((row) => this.mapRowToContact(row));
  }

  /**
   * Archive contacts (soft delete)
   * Requirements: 15.1
   */
  async archiveContacts(userId: string, contactIds: string[]): Promise<number> {
    if (contactIds.length === 0) {
      return 0;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify all contacts belong to user
      const verifyResult = await client.query(
        'SELECT id FROM contacts WHERE id = ANY($1) AND user_id = $2 AND archived_at IS NULL',
        [contactIds, userId]
      );

      if (verifyResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return 0;
      }

      // Archive contacts
      const result = await client.query(
        `UPDATE contacts 
         SET archived_at = NOW(), updated_at = NOW() 
         WHERE user_id = $1 AND id = ANY($2) AND archived_at IS NULL`,
        [userId, contactIds]
      );

      await client.query('COMMIT');

      return result.rowCount || 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Restore archived contacts
   * Requirements: 16.4, 16.5
   */
  async restoreContacts(userId: string, contactIds: string[]): Promise<number> {
    if (contactIds.length === 0) {
      return 0;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify all contacts belong to user and are archived
      const verifyResult = await client.query(
        'SELECT id FROM contacts WHERE id = ANY($1) AND user_id = $2 AND archived_at IS NOT NULL',
        [contactIds, userId]
      );

      if (verifyResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return 0;
      }

      // Restore contacts
      const result = await client.query(
        `UPDATE contacts 
         SET archived_at = NULL, updated_at = NOW() 
         WHERE user_id = $1 AND id = ANY($2) AND archived_at IS NOT NULL`,
        [userId, contactIds]
      );

      await client.query('COMMIT');

      return result.rowCount || 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get archived contacts
   * Requirements: 16.1, 16.2
   */
  async findArchived(userId: string): Promise<Contact[]> {
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
      WHERE c.user_id = $1 AND c.archived_at IS NOT NULL 
      GROUP BY c.id
      ORDER BY c.archived_at DESC`,
      [userId]
    );

    return result.rows.map((row) => this.mapRowToContact(row));
  }

  /**
   * Clear Google sync metadata for all contacts of a user
   * Used when disconnecting Google Contacts
   * Preserves contacts but removes sync-related fields
   */
  async clearGoogleSyncMetadata(userId: string): Promise<void> {
    await pool.query(
      `UPDATE contacts
       SET google_resource_name = NULL,
           google_etag = NULL,
           last_synced_at = NULL
       WHERE user_id = $1 AND source = 'google'`,
      [userId]
    );
  }

  /**
   * Assign contact to a Dunbar circle
   * Requirements: 3.3
   */
  async assignToCircle(
    id: string,
    userId: string,
    circle: DunbarCircle,
    confidence?: number
  ): Promise<Contact> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE contacts
         SET dunbar_circle = $1,
             circle_assigned_at = CURRENT_TIMESTAMP,
             circle_confidence = $2
         WHERE id = $3 AND user_id = $4
         RETURNING *`,
        [circle, confidence || null, id, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Contact not found');
      }

      await client.query('COMMIT');

      // Fetch full contact with groups and tags
      const contact = await this.findById(id, userId);
      if (!contact) {
        throw new Error('Contact not found after update');
      }

      return contact;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch assign contacts to a circle
   * Requirements: 5.5
   */
  async batchAssignToCircle(
    contactIds: string[],
    userId: string,
    circle: DunbarCircle
  ): Promise<void> {
    if (contactIds.length === 0) {
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify all contacts belong to user
      const verifyResult = await client.query(
        'SELECT id FROM contacts WHERE id = ANY($1) AND user_id = $2',
        [contactIds, userId]
      );

      if (verifyResult.rows.length !== contactIds.length) {
        throw new Error('One or more contacts not found');
      }

      // Batch update
      await client.query(
        `UPDATE contacts
         SET dunbar_circle = $1,
             circle_assigned_at = CURRENT_TIMESTAMP
         WHERE id = ANY($2) AND user_id = $3`,
        [circle, contactIds, userId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find uncategorized contacts (no circle assigned)
   * Requirements: 11.1, 11.3
   */
  async findUncategorized(userId: string): Promise<Contact[]> {
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
      WHERE c.user_id = $1 
        AND c.dunbar_circle IS NULL
        AND c.archived_at IS NULL
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => this.mapRowToContact(row));
  }

  /**
   * Find contacts in a specific circle
   * Requirements: 3.3
   */
  async findByCircle(userId: string, circle: DunbarCircle): Promise<Contact[]> {
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
      WHERE c.user_id = $1 
        AND c.dunbar_circle = $2
        AND c.archived_at IS NULL
      GROUP BY c.id
      ORDER BY c.name ASC`,
      [userId, circle]
    );

    return result.rows.map((row) => this.mapRowToContact(row));
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
      archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
      source: row.source || undefined,
      googleResourceName: row.google_resource_name || undefined,
      googleEtag: row.google_etag || undefined,
      lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
      dunbarCircle: row.dunbar_circle || undefined,
      circleAssignedAt: row.circle_assigned_at ? new Date(row.circle_assigned_at) : undefined,
      circleConfidence: row.circle_confidence ? parseFloat(row.circle_confidence) : undefined,
      aiSuggestedCircle: row.ai_suggested_circle || undefined,
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

// Default instance for backward compatibility
const defaultRepository = new PostgresContactRepository();

export const findById = (id: string, userId: string) => defaultRepository.findById(id, userId);
export const findAll = (userId: string, filters?: ContactFilters) =>
  defaultRepository.findAll(userId, filters);
export const create = (userId: string, data: ContactCreateData) =>
  defaultRepository.create(userId, data);
export const update = (id: string, userId: string, data: ContactUpdateData) =>
  defaultRepository.update(id, userId, data);
