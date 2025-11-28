/**
 * Sync State Repository
 *
 * Data access layer for Google Contacts sync state operations.
 * Tracks synchronization status, tokens, and metadata per user.
 */

import pool from '../db/connection';

export interface SyncState {
  id: string;
  userId: string;
  syncToken: string | null;
  lastFullSyncAt: Date | null;
  lastIncrementalSyncAt: Date | null;
  totalContactsSynced: number;
  lastSyncStatus: 'pending' | 'in_progress' | 'success' | 'failed';
  lastSyncError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncResult {
  contactsImported?: number;
  contactsUpdated?: number;
  contactsDeleted?: number;
  groupsImported?: number;
  syncToken?: string;
  duration: number;
  errors: SyncError[];
}

export interface SyncError {
  contactResourceName?: string;
  errorMessage: string;
  errorCode?: string;
}

interface SyncStateRow {
  id: string;
  user_id: string;
  sync_token: string | null;
  last_full_sync_at: Date | null;
  last_incremental_sync_at: Date | null;
  total_contacts_synced: number;
  last_sync_status: string;
  last_sync_error: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Sync State Repository Interface
 */
export interface SyncStateRepository {
  getSyncState(userId: string): Promise<SyncState | null>;
  upsertSyncState(userId: string, state: Partial<SyncState>): Promise<SyncState>;
  updateSyncToken(userId: string, syncToken: string): Promise<void>;
  markSyncInProgress(userId: string): Promise<void>;
  markSyncComplete(userId: string, result: SyncResult): Promise<void>;
  markSyncFailed(userId: string, error: string): Promise<void>;
  clearSyncState(userId: string): Promise<void>;
  resetSyncState(userId: string): Promise<void>;
}

/**
 * PostgreSQL Sync State Repository Implementation
 */
export class PostgresSyncStateRepository implements SyncStateRepository {
  /**
   * Get sync state for user
   */
  async getSyncState(userId: string): Promise<SyncState | null> {
    const result = await pool.query<SyncStateRow>(
      'SELECT * FROM google_contacts_sync_state WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSyncState(result.rows[0]);
  }

  /**
   * Create or update sync state
   */
  async upsertSyncState(userId: string, state: Partial<SyncState>): Promise<SyncState> {
    const fields: string[] = [];
    const values: any[] = [userId];
    let paramCount = 2;

    if (state.syncToken !== undefined) {
      fields.push(`sync_token = $${paramCount++}`);
      values.push(state.syncToken);
    }
    if (state.lastFullSyncAt !== undefined) {
      fields.push(`last_full_sync_at = $${paramCount++}`);
      values.push(state.lastFullSyncAt);
    }
    if (state.lastIncrementalSyncAt !== undefined) {
      fields.push(`last_incremental_sync_at = $${paramCount++}`);
      values.push(state.lastIncrementalSyncAt);
    }
    if (state.totalContactsSynced !== undefined) {
      fields.push(`total_contacts_synced = $${paramCount++}`);
      values.push(state.totalContactsSynced);
    }
    if (state.lastSyncStatus !== undefined) {
      fields.push(`last_sync_status = $${paramCount++}`);
      values.push(state.lastSyncStatus);
    }
    if (state.lastSyncError !== undefined) {
      fields.push(`last_sync_error = $${paramCount++}`);
      values.push(state.lastSyncError);
    }

    const updateClause = fields.length > 0 ? fields.join(', ') : 'updated_at = CURRENT_TIMESTAMP';

    const result = await pool.query<SyncStateRow>(
      `INSERT INTO google_contacts_sync_state (user_id)
       VALUES ($1)
       ON CONFLICT (user_id)
       DO UPDATE SET ${updateClause}
       RETURNING *`,
      values
    );

    return this.mapRowToSyncState(result.rows[0]);
  }

  /**
   * Update sync token
   */
  async updateSyncToken(userId: string, syncToken: string): Promise<void> {
    await pool.query(
      `INSERT INTO google_contacts_sync_state (user_id, sync_token)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET sync_token = EXCLUDED.sync_token, updated_at = CURRENT_TIMESTAMP`,
      [userId, syncToken]
    );
  }

  /**
   * Mark sync as in progress
   */
  async markSyncInProgress(userId: string): Promise<void> {
    await pool.query(
      `INSERT INTO google_contacts_sync_state (user_id, last_sync_status)
       VALUES ($1, 'in_progress')
       ON CONFLICT (user_id)
       DO UPDATE SET last_sync_status = 'in_progress', updated_at = CURRENT_TIMESTAMP`,
      [userId]
    );
  }

  /**
   * Mark sync as complete
   */
  async markSyncComplete(userId: string, result: SyncResult): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current state to calculate total contacts
      const currentState = await this.getSyncState(userId);
      const currentTotal = currentState?.totalContactsSynced || 0;

      // Calculate new total based on sync result
      let newTotal = currentTotal;
      if (result.contactsImported !== undefined) {
        newTotal += result.contactsImported;
      }
      if (result.contactsDeleted !== undefined) {
        newTotal -= result.contactsDeleted;
      }

      // Determine which timestamp to update
      const isFullSync = result.contactsImported !== undefined;
      const timestampField = isFullSync ? 'last_full_sync_at' : 'last_incremental_sync_at';

      // Update sync state
      await client.query(
        `INSERT INTO google_contacts_sync_state (
          user_id, 
          sync_token, 
          ${timestampField}, 
          total_contacts_synced, 
          last_sync_status, 
          last_sync_error
        )
        VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'success', NULL)
        ON CONFLICT (user_id)
        DO UPDATE SET
          sync_token = COALESCE(EXCLUDED.sync_token, google_contacts_sync_state.sync_token),
          ${timestampField} = CURRENT_TIMESTAMP,
          total_contacts_synced = EXCLUDED.total_contacts_synced,
          last_sync_status = 'success',
          last_sync_error = NULL,
          updated_at = CURRENT_TIMESTAMP`,
        [userId, result.syncToken || null, newTotal]
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
   * Mark sync as failed
   */
  async markSyncFailed(userId: string, error: string): Promise<void> {
    await pool.query(
      `INSERT INTO google_contacts_sync_state (user_id, last_sync_status, last_sync_error)
       VALUES ($1, 'failed', $2)
       ON CONFLICT (user_id)
       DO UPDATE SET 
         last_sync_status = 'failed', 
         last_sync_error = EXCLUDED.last_sync_error,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, error]
    );
  }

  /**
   * Clear sync state for user (used on disconnect)
   * Removes sync token and resets sync timestamps
   */
  async clearSyncState(userId: string): Promise<void> {
    await pool.query(
      `UPDATE google_contacts_sync_state
       SET sync_token = NULL,
           last_full_sync_at = NULL,
           last_incremental_sync_at = NULL,
           last_sync_status = 'pending',
           last_sync_error = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Reset sync state for user (used on reconnect)
   * Clears sync token to force full sync on next sync operation
   */
  async resetSyncState(userId: string): Promise<void> {
    await pool.query(
      `INSERT INTO google_contacts_sync_state (user_id, sync_token, last_sync_status)
       VALUES ($1, NULL, 'pending')
       ON CONFLICT (user_id)
       DO UPDATE SET
         sync_token = NULL,
         last_sync_status = 'pending',
         last_sync_error = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [userId]
    );
  }

  /**
   * Map database row to SyncState object
   */
  private mapRowToSyncState(row: SyncStateRow): SyncState {
    return {
      id: row.id,
      userId: row.user_id,
      syncToken: row.sync_token,
      lastFullSyncAt: row.last_full_sync_at,
      lastIncrementalSyncAt: row.last_incremental_sync_at,
      totalContactsSynced: row.total_contacts_synced,
      lastSyncStatus: row.last_sync_status as 'pending' | 'in_progress' | 'success' | 'failed',
      lastSyncError: row.last_sync_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Default instance for convenience
const defaultRepository = new PostgresSyncStateRepository();

export const getSyncState = (userId: string) => defaultRepository.getSyncState(userId);
export const upsertSyncState = (userId: string, state: Partial<SyncState>) =>
  defaultRepository.upsertSyncState(userId, state);
export const updateSyncToken = (userId: string, syncToken: string) =>
  defaultRepository.updateSyncToken(userId, syncToken);
export const markSyncInProgress = (userId: string) => defaultRepository.markSyncInProgress(userId);
export const markSyncComplete = (userId: string, result: SyncResult) =>
  defaultRepository.markSyncComplete(userId, result);
export const markSyncFailed = (userId: string, error: string) =>
  defaultRepository.markSyncFailed(userId, error);
export const clearSyncState = (userId: string) => defaultRepository.clearSyncState(userId);
export const resetSyncState = (userId: string) => defaultRepository.resetSyncState(userId);
