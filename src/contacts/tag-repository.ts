/**
 * Tag Repository
 *
 * Data access layer for tag operations.
 */

import pool from '../db/connection';
import { Tag, TagSource } from '../types';

/**
 * Extended Tag type with contact count
 */
export interface TagWithCount extends Tag {
  contactCount: number;
}

/**
 * Tag Repository Interface
 */
export interface TagRepository {
  create(text: string, source: TagSource, userId: string): Promise<Tag>;
  update(id: string, text: string, userId: string): Promise<Tag>;
  findById(id: string, userId: string): Promise<Tag | null>;
  findByContactId(contactId: string): Promise<Tag[]>;
  findByText(text: string, userId: string): Promise<Tag | null>;
  findSimilarTags(text: string, userId: string, threshold: number): Promise<Tag[]>;
  delete(id: string, userId: string): Promise<void>;
  deleteTag(id: string, userId: string): Promise<void>;
  addToContact(contactId: string, tagId: string, userId: string): Promise<void>;
  removeFromContact(contactId: string, tagId: string, userId: string): Promise<void>;
  getTagWithContactCount(id: string, userId: string): Promise<TagWithCount | null>;
  listTagsWithContactCounts(userId: string): Promise<TagWithCount[]>;
  getTagContacts(tagId: string, userId: string): Promise<any[]>;
  bulkAddToContacts(contactIds: string[], tagId: string, userId: string): Promise<void>;
}

/**
 * PostgreSQL Tag Repository Implementation
 */
export class PostgresTagRepository implements TagRepository {
  async create(text: string, source: TagSource, userId: string): Promise<Tag> {
    const result = await pool.query(
      `INSERT INTO tags (text, source, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, LOWER(text)) DO UPDATE SET text = EXCLUDED.text
       RETURNING *`,
      [text, source, userId]
    );

    return this.mapRowToTag(result.rows[0]);
  }

  async update(id: string, text: string, userId: string): Promise<Tag> {
    const result = await pool.query(
      `UPDATE tags SET text = $1
       WHERE id = $2
       RETURNING *`,
      [text, id]
    );

    if (result.rows.length === 0) {
      throw new Error('Tag not found');
    }

    return this.mapRowToTag(result.rows[0]);
  }

  async findById(id: string, userId: string): Promise<Tag | null> {
    const result = await pool.query('SELECT * FROM tags WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTag(result.rows[0]);
  }

  async findByContactId(contactId: string): Promise<Tag[]> {
    const result = await pool.query(
      `SELECT t.* FROM tags t
       INNER JOIN contact_tags ct ON t.id = ct.tag_id
       WHERE ct.contact_id = $1
       ORDER BY t.text ASC`,
      [contactId]
    );

    return result.rows.map((row) => this.mapRowToTag(row));
  }

  async findByText(text: string, userId: string): Promise<Tag | null> {
    const result = await pool.query(
      'SELECT * FROM tags WHERE LOWER(text) = LOWER($1) AND user_id = $2',
      [text, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTag(result.rows[0]);
  }

  async findSimilarTags(text: string, userId: string, threshold: number): Promise<Tag[]> {
    // Get all tags and compute similarity in application code
    // For production, consider using PostgreSQL extensions like pg_trgm for better performance
    const result = await pool.query('SELECT * FROM tags');

    const tags = result.rows.map((row) => this.mapRowToTag(row));
    const similarTags: Tag[] = [];

    for (const tag of tags) {
      const similarity = this.computeCosineSimilarity(text, tag.text);
      if (similarity >= threshold) {
        similarTags.push(tag);
      }
    }

    return similarTags;
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await pool.query('DELETE FROM tags WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new Error('Tag not found');
    }
  }

  async deleteTag(id: string, userId: string): Promise<void> {
    // Delete tag and all associations (cascade should handle this)
    const result = await pool.query('DELETE FROM tags WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new Error('Tag not found');
    }
  }

  async addToContact(contactId: string, tagId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify contact belongs to user
      const contactCheck = await client.query(
        'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );
      if (contactCheck.rows.length === 0) {
        throw new Error('Contact not found');
      }

      // Insert or ignore if already exists
      // Note: Foreign key constraints will ensure tag exists
      await client.query(
        `INSERT INTO contact_tags (contact_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT (contact_id, tag_id) DO NOTHING`,
        [contactId, tagId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async removeFromContact(contactId: string, tagId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify contact belongs to user
      const contactCheck = await client.query(
        'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );
      if (contactCheck.rows.length === 0) {
        throw new Error('Contact not found');
      }

      await client.query('DELETE FROM contact_tags WHERE contact_id = $1 AND tag_id = $2', [
        contactId,
        tagId,
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Compute cosine similarity between two strings
   * Uses character n-grams for similarity calculation
   */
  private computeCosineSimilarity(str1: string, str2: string): number {
    const ngrams1 = this.getNGrams(str1.toLowerCase(), 2);
    const ngrams2 = this.getNGrams(str2.toLowerCase(), 2);

    const set1 = new Set(ngrams1);
    const set2 = new Set(ngrams2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    if (set1.size === 0 || set2.size === 0) {
      return 0;
    }

    return intersection.size / Math.sqrt(set1.size * set2.size);
  }

  /**
   * Generate character n-grams from a string
   */
  private getNGrams(str: string, n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.push(str.substring(i, i + n));
    }
    return ngrams;
  }

  async getTagWithContactCount(id: string, userId: string): Promise<TagWithCount | null> {
    const result = await pool.query(
      `SELECT t.*, COUNT(DISTINCT ct.contact_id) as contact_count
       FROM tags t
       LEFT JOIN contact_tags ct ON t.id = ct.tag_id
       WHERE t.id = $1
       GROUP BY t.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTagWithCount(result.rows[0]);
  }

  async listTagsWithContactCounts(userId: string): Promise<TagWithCount[]> {
    const result = await pool.query(
      `SELECT t.*, COUNT(DISTINCT ct.contact_id) as contact_count
       FROM tags t
       LEFT JOIN contact_tags ct ON t.id = ct.tag_id
       LEFT JOIN contacts c ON ct.contact_id = c.id AND c.user_id = $1
       WHERE t.user_id = $1
       GROUP BY t.id
       ORDER BY t.text ASC`,
      [userId]
    );

    return result.rows.map((row) => this.mapRowToTagWithCount(row));
  }

  async getTagContacts(tagId: string, userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT c.id, c.name, c.email, c.phone
       FROM contacts c
       INNER JOIN contact_tags ct ON c.id = ct.contact_id
       WHERE ct.tag_id = $1 AND c.user_id = $2 AND c.archived = false
       ORDER BY c.name ASC`,
      [tagId, userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
    }));
  }

  async bulkAddToContacts(contactIds: string[], tagId: string, userId: string): Promise<void> {
    if (contactIds.length === 0) {
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify tag exists
      const tagCheck = await client.query('SELECT id FROM tags WHERE id = $1', [tagId]);
      if (tagCheck.rows.length === 0) {
        throw new Error('Tag not found');
      }

      // Verify all contacts belong to user
      const contactCheck = await client.query(
        'SELECT id FROM contacts WHERE id = ANY($1) AND user_id = $2',
        [contactIds, userId]
      );
      if (contactCheck.rows.length !== contactIds.length) {
        throw new Error('One or more contacts not found');
      }

      // Bulk insert
      const values = contactIds.map((contactId) => `('${contactId}', '${tagId}')`).join(',');
      await client.query(
        `INSERT INTO contact_tags (contact_id, tag_id)
         VALUES ${values}
         ON CONFLICT (contact_id, tag_id) DO NOTHING`
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToTag(row: any): Tag {
    return {
      id: row.id,
      text: row.text,
      source: row.source as TagSource,
      createdAt: new Date(row.created_at),
    };
  }

  private mapRowToTagWithCount(row: any): TagWithCount {
    return {
      ...this.mapRowToTag(row),
      contactCount: parseInt(row.contact_count, 10) || 0,
    };
  }
}
