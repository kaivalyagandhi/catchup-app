/**
 * Group Mapping Repository
 *
 * Data access layer for Google contact group to CatchUp group mappings.
 * Handles mapping between Google contact groups and CatchUp groups.
 */

import pool from '../db/connection';

export interface GroupMapping {
  id: string;
  userId: string;
  catchupGroupId: string | null;
  googleResourceName: string;
  googleName: string;
  googleEtag: string | null;
  googleGroupType: string;
  memberCount: number;
  mappingStatus: string;
  suggestedAction: string | null;
  suggestedGroupId: string | null;
  suggestedGroupName: string | null;
  confidenceScore: number | null;
  suggestionReason: string | null;
  lastSyncedAt: Date | null;
  syncEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMappingData {
  catchupGroupId?: string;
  googleResourceName: string;
  googleName: string;
  googleEtag?: string;
  googleGroupType?: string;
  memberCount?: number;
  mappingStatus?: string;
  suggestedAction?: string;
  suggestedGroupId?: string;
  suggestedGroupName?: string;
  confidenceScore?: number;
  suggestionReason?: string;
  syncEnabled?: boolean;
}

interface GroupMappingRow {
  id: string;
  user_id: string;
  catchup_group_id: string | null;
  google_resource_name: string;
  google_name: string;
  google_etag: string | null;
  google_group_type: string;
  member_count: number;
  mapping_status: string;
  suggested_action: string | null;
  suggested_group_id: string | null;
  suggested_group_name: string | null;
  confidence_score: number | null;
  suggestion_reason: string | null;
  last_synced_at: Date | null;
  sync_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Group Mapping Repository Interface
 */
export interface GroupMappingRepository {
  findByGoogleResourceName(
    userId: string,
    googleResourceName: string
  ): Promise<GroupMapping | null>;
  findByCatchupGroupId(userId: string, catchupGroupId: string): Promise<GroupMapping | null>;
  findAll(userId: string, syncEnabledOnly?: boolean): Promise<GroupMapping[]>;
  create(userId: string, data: GroupMappingData): Promise<GroupMapping>;
  update(id: string, userId: string, data: Partial<GroupMappingData>): Promise<GroupMapping>;
  updateLastSyncedAt(id: string, userId: string): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
  disableSync(id: string, userId: string): Promise<void>;
}

/**
 * PostgreSQL Group Mapping Repository Implementation
 */
export class PostgresGroupMappingRepository implements GroupMappingRepository {
  /**
   * Find group mapping by Google resource name
   */
  async findByGoogleResourceName(
    userId: string,
    googleResourceName: string
  ): Promise<GroupMapping | null> {
    const result = await pool.query<GroupMappingRow>(
      'SELECT * FROM google_contact_groups WHERE user_id = $1 AND google_resource_name = $2',
      [userId, googleResourceName]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToGroupMapping(result.rows[0]);
  }

  /**
   * Find group mapping by CatchUp group ID
   */
  async findByCatchupGroupId(userId: string, catchupGroupId: string): Promise<GroupMapping | null> {
    const result = await pool.query<GroupMappingRow>(
      'SELECT * FROM google_contact_groups WHERE user_id = $1 AND catchup_group_id = $2',
      [userId, catchupGroupId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToGroupMapping(result.rows[0]);
  }

  /**
   * Find all group mappings for a user
   */
  async findAll(userId: string, syncEnabledOnly: boolean = false): Promise<GroupMapping[]> {
    let query = 'SELECT * FROM google_contact_groups WHERE user_id = $1';
    if (syncEnabledOnly) {
      query += ' AND sync_enabled = true';
    }
    query += ' ORDER BY google_name ASC';

    const result = await pool.query<GroupMappingRow>(query, [userId]);

    return result.rows.map((row) => this.mapRowToGroupMapping(row));
  }

  /**
   * Create a new group mapping
   */
  async create(userId: string, data: GroupMappingData): Promise<GroupMapping> {
    const result = await pool.query<GroupMappingRow>(
      `INSERT INTO google_contact_groups (
        user_id,
        catchup_group_id,
        google_resource_name,
        google_name,
        google_etag,
        google_group_type,
        member_count,
        mapping_status,
        suggested_action,
        suggested_group_id,
        suggested_group_name,
        confidence_score,
        suggestion_reason,
        sync_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        userId,
        data.catchupGroupId || null,
        data.googleResourceName,
        data.googleName,
        data.googleEtag || null,
        data.googleGroupType || 'USER_CONTACT_GROUP',
        data.memberCount || 0,
        data.mappingStatus || 'pending',
        data.suggestedAction || null,
        data.suggestedGroupId || null,
        data.suggestedGroupName || null,
        data.confidenceScore || null,
        data.suggestionReason || null,
        data.syncEnabled !== undefined ? data.syncEnabled : true,
      ]
    );

    return this.mapRowToGroupMapping(result.rows[0]);
  }

  /**
   * Update an existing group mapping
   */
  async update(id: string, userId: string, data: Partial<GroupMappingData>): Promise<GroupMapping> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.catchupGroupId !== undefined) {
      fields.push(`catchup_group_id = $${paramCount++}`);
      values.push(data.catchupGroupId);
    }
    if (data.googleName !== undefined) {
      fields.push(`google_name = $${paramCount++}`);
      values.push(data.googleName);
    }
    if (data.googleEtag !== undefined) {
      fields.push(`google_etag = $${paramCount++}`);
      values.push(data.googleEtag);
    }
    if (data.googleGroupType !== undefined) {
      fields.push(`google_group_type = $${paramCount++}`);
      values.push(data.googleGroupType);
    }
    if (data.memberCount !== undefined) {
      fields.push(`member_count = $${paramCount++}`);
      values.push(data.memberCount);
    }
    if (data.syncEnabled !== undefined) {
      fields.push(`sync_enabled = $${paramCount++}`);
      values.push(data.syncEnabled);
    }

    if (fields.length === 0) {
      // No updates, just return current mapping
      const result = await pool.query<GroupMappingRow>(
        'SELECT * FROM google_contact_groups WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Group mapping not found');
      }

      return this.mapRowToGroupMapping(result.rows[0]);
    }

    values.push(id, userId);
    const result = await pool.query<GroupMappingRow>(
      `UPDATE google_contact_groups 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Group mapping not found');
    }

    return this.mapRowToGroupMapping(result.rows[0]);
  }

  /**
   * Update last synced timestamp
   */
  async updateLastSyncedAt(id: string, userId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE google_contact_groups 
       SET last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Group mapping not found');
    }
  }

  /**
   * Delete a group mapping
   */
  async delete(id: string, userId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM google_contact_groups WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Group mapping not found');
    }
  }

  /**
   * Disable sync for a group mapping
   */
  async disableSync(id: string, userId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE google_contact_groups 
       SET sync_enabled = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Group mapping not found');
    }
  }

  /**
   * Map database row to GroupMapping object
   */
  private mapRowToGroupMapping(row: GroupMappingRow): GroupMapping {
    return {
      id: row.id,
      userId: row.user_id,
      catchupGroupId: row.catchup_group_id,
      googleResourceName: row.google_resource_name,
      googleName: row.google_name,
      googleEtag: row.google_etag,
      googleGroupType: row.google_group_type,
      memberCount: row.member_count,
      mappingStatus: row.mapping_status,
      suggestedAction: row.suggested_action,
      suggestedGroupId: row.suggested_group_id,
      suggestedGroupName: row.suggested_group_name,
      confidenceScore: row.confidence_score,
      suggestionReason: row.suggestion_reason,
      lastSyncedAt: row.last_synced_at,
      syncEnabled: row.sync_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Default instance for convenience
const defaultRepository = new PostgresGroupMappingRepository();

export const findByGoogleResourceName = (userId: string, googleResourceName: string) =>
  defaultRepository.findByGoogleResourceName(userId, googleResourceName);
export const findByCatchupGroupId = (userId: string, catchupGroupId: string) =>
  defaultRepository.findByCatchupGroupId(userId, catchupGroupId);
export const findAll = (userId: string, syncEnabledOnly?: boolean) =>
  defaultRepository.findAll(userId, syncEnabledOnly);
export const create = (userId: string, data: GroupMappingData) =>
  defaultRepository.create(userId, data);
export const update = (id: string, userId: string, data: Partial<GroupMappingData>) =>
  defaultRepository.update(id, userId, data);
export const updateLastSyncedAt = (id: string, userId: string) =>
  defaultRepository.updateLastSyncedAt(id, userId);
export const deleteMapping = (id: string, userId: string) => defaultRepository.delete(id, userId);
export const disableSync = (id: string, userId: string) =>
  defaultRepository.disableSync(id, userId);
