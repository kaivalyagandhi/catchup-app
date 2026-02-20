/**
 * Streaming Contact Repository
 *
 * Provides async generator-based streaming for contacts to prevent
 * loading entire datasets into memory.
 *
 * Requirements: Memory Optimization Phase 2
 */

import pool from '../db/connection';
import { Contact, FrequencyOption } from '../types';

/**
 * Minimal contact data for matching operations
 * Uses ~500 bytes vs ~5KB for full contact
 */
export interface MinimalContact {
  id: string;
  name: string;
  lastContactDate: Date | null;
  frequencyPreference: FrequencyOption;
  groups: string[]; // Just IDs, not full objects
  archived: boolean;
}

export interface StreamingOptions {
  batchSize?: number; // Default: 100
  minimalData?: boolean; // Default: false
  orderBy?: 'last_contact_date' | 'name' | 'created_at'; // Default: 'last_contact_date'
  orderDirection?: 'ASC' | 'DESC'; // Default: 'ASC'
}

/**
 * Streaming Contact Repository
 *
 * Uses async generators to stream contacts in batches without
 * loading all contacts into memory at once.
 */
export class StreamingContactRepository {
  /**
   * Stream contacts in batches using async generator
   *
   * Usage:
   * ```typescript
   * for await (const batch of repo.streamContacts(userId)) {
   *   await processBatch(batch);
   * }
   * ```
   */
  async *streamContacts(
    userId: string,
    options: StreamingOptions = {}
  ): AsyncGenerator<Contact[], void, undefined> {
    const batchSize = options.batchSize || 100;
    const orderBy = options.orderBy || 'last_contact_date';
    const orderDirection = options.orderDirection || 'ASC';

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
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
        WHERE c.user_id = $1 AND c.archived_at IS NULL
        GROUP BY c.id
        ORDER BY c.${orderBy} ${orderDirection} NULLS FIRST, c.id
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [userId, batchSize, offset]);

      if (result.rows.length === 0) {
        hasMore = false;
        break;
      }

      const contacts = result.rows.map((row) => this.mapRowToContact(row));
      yield contacts;

      offset += batchSize;

      // Yield to event loop to prevent blocking
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  /**
   * Stream minimal contact data for matching operations
   *
   * Returns only essential fields, reducing memory usage by ~90%
   * (500 bytes vs 5KB per contact)
   */
  async *streamMinimalContacts(
    userId: string,
    options: StreamingOptions = {}
  ): AsyncGenerator<MinimalContact[], void, undefined> {
    const batchSize = options.batchSize || 100;
    const orderBy = options.orderBy || 'last_contact_date';
    const orderDirection = options.orderDirection || 'ASC';

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      // Minimal query - only essential columns
      const query = `
        SELECT 
          c.id,
          c.name,
          c.last_contact_date,
          c.frequency_preference,
          c.archived_at,
          COALESCE(
            json_agg(DISTINCT g.id) FILTER (WHERE g.id IS NOT NULL),
            '[]'
          ) as group_ids
        FROM contacts c
        LEFT JOIN contact_groups cg ON c.id = cg.contact_id
        LEFT JOIN groups g ON cg.group_id = g.id
        WHERE c.user_id = $1 AND c.archived_at IS NULL
        GROUP BY c.id, c.name, c.last_contact_date, c.frequency_preference, c.archived_at
        ORDER BY c.${orderBy} ${orderDirection} NULLS FIRST, c.id
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [userId, batchSize, offset]);

      if (result.rows.length === 0) {
        hasMore = false;
        break;
      }

      const contacts = result.rows.map((row) => this.mapRowToMinimalContact(row));
      yield contacts;

      offset += batchSize;

      // Yield to event loop
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  /**
   * Stream contacts using database cursor for very large datasets
   *
   * Note: Requires pg-cursor package (not yet installed)
   * This is a placeholder for future optimization
   */
  async *streamWithCursor(
    userId: string,
    options: StreamingOptions = {}
  ): AsyncGenerator<Contact[], void, undefined> {
    // For now, delegate to regular streaming
    // TODO: Implement cursor-based streaming when pg-cursor is added
    yield* this.streamContacts(userId, options);
  }

  /**
   * Map database row to full Contact object
   */
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
      archived: row.archived_at !== null,
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

  /**
   * Map database row to MinimalContact object
   */
  private mapRowToMinimalContact(row: any): MinimalContact {
    return {
      id: row.id,
      name: row.name,
      lastContactDate: row.last_contact_date ? new Date(row.last_contact_date) : null,
      frequencyPreference: row.frequency_preference || FrequencyOption.MONTHLY,
      groups: row.group_ids || [],
      archived: row.archived_at !== null,
    };
  }
}

// Export singleton instance
export const streamingContactRepository = new StreamingContactRepository();
