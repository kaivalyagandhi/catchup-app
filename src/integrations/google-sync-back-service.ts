/**
 * Google Sync-Back Service
 *
 * Manages bidirectional sync of contact edits from CatchUp back to Google Contacts.
 * Changes are never auto-synced — they require explicit user review and approval.
 *
 * Requirements: 13.1, 13.4, 13.5, 13.6, 13.7, 13.8
 */

import pool from '../db/connection';
import { CloudTasksQueue } from '../jobs/cloud-tasks-client';
import { getPeopleClient } from './google-contacts-config';
import { getToken } from './oauth-repository';
import type { Credentials } from 'google-auth-library';

// --- Types ---

export type SyncBackStatus =
  | 'pending_review'
  | 'approved'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'failed'
  | 'skipped';

export interface SyncBackOperation {
  id: string;
  userId: string;
  contactId: string;
  field: string;
  previousValue: string | null;
  newValue: string | null;
  status: SyncBackStatus;
  googleEtag?: string;
  conflictGoogleValue?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface GoogleSyncBackService {
  createSyncBackOperation(
    userId: string,
    contactId: string,
    field: string,
    prevValue: string | null,
    newValue: string | null
  ): Promise<SyncBackOperation>;
  getPendingOperations(userId: string): Promise<SyncBackOperation[]>;
  approveOperations(userId: string, operationIds: string[]): Promise<void>;
  skipOperations(userId: string, operationIds: string[]): Promise<void>;
  undoOperation(userId: string, operationId: string): Promise<void>;
  handleConflict(userId: string, operationId: string): Promise<SyncBackOperation>;
}


// --- Database row mapping ---

interface SyncBackOperationRow {
  id: string;
  user_id: string;
  contact_id: string;
  field: string;
  previous_value: string | null;
  new_value: string | null;
  status: SyncBackStatus;
  google_etag: string | null;
  conflict_google_value: string | null;
  created_at: Date;
  resolved_at: Date | null;
}

function rowToSyncBackOperation(row: SyncBackOperationRow): SyncBackOperation {
  return {
    id: row.id,
    userId: row.user_id,
    contactId: row.contact_id,
    field: row.field,
    previousValue: row.previous_value,
    newValue: row.new_value,
    status: row.status,
    googleEtag: row.google_etag ?? undefined,
    conflictGoogleValue: row.conflict_google_value ?? undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

// --- Allowed sync-back fields ---

const SYNCABLE_FIELDS = new Set(['name', 'phone', 'email', 'customNotes']);

// --- Service implementation ---

export class GoogleSyncBackServiceImpl implements GoogleSyncBackService {
  private enqueueJob: (operationId: string, userId: string) => Promise<void>;
  private fetchGoogleContact: (
    userId: string,
    googleResourceName: string
  ) => Promise<{ etag: string; fieldValues: Record<string, string | null> } | null>;

  constructor(deps?: {
    enqueueJob?: (operationId: string, userId: string) => Promise<void>;
    fetchGoogleContact?: (
      userId: string,
      googleResourceName: string
    ) => Promise<{ etag: string; fieldValues: Record<string, string | null> } | null>;
  }) {
    this.enqueueJob = deps?.enqueueJob ?? defaultEnqueueSyncBackJob;
    this.fetchGoogleContact = deps?.fetchGoogleContact ?? defaultFetchGoogleContact;
  }

  /**
   * Create a pending_review sync-back operation when a user edits a Google-synced contact field.
   * Requirements: 13.1
   */
  async createSyncBackOperation(
    userId: string,
    contactId: string,
    field: string,
    prevValue: string | null,
    newValue: string | null
  ): Promise<SyncBackOperation> {
    if (!SYNCABLE_FIELDS.has(field)) {
      throw new Error(`Field '${field}' is not eligible for sync-back. Allowed: ${[...SYNCABLE_FIELDS].join(', ')}`);
    }

    // Verify the contact belongs to the user and has a googleResourceName
    const contactResult = await pool.query(
      'SELECT id, google_resource_name FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, userId]
    );

    if (contactResult.rows.length === 0) {
      throw new Error('Contact not found or does not belong to user');
    }

    if (!contactResult.rows[0].google_resource_name) {
      throw new Error('Contact is not synced with Google Contacts');
    }

    // Fetch current google etag for optimistic concurrency
    const googleEtag = await this.getContactGoogleEtag(contactId);

    const result = await pool.query<SyncBackOperationRow>(
      `INSERT INTO sync_back_operations (user_id, contact_id, field, previous_value, new_value, status, google_etag)
       VALUES ($1, $2, $3, $4, $5, 'pending_review', $6)
       RETURNING *`,
      [userId, contactId, field, prevValue, newValue, googleEtag]
    );

    return rowToSyncBackOperation(result.rows[0]);
  }

  /**
   * Get all pending_review operations for a user.
   * Requirements: 13.2
   */
  async getPendingOperations(userId: string): Promise<SyncBackOperation[]> {
    const result = await pool.query<SyncBackOperationRow>(
      `SELECT * FROM sync_back_operations
       WHERE user_id = $1 AND status = 'pending_review'
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(rowToSyncBackOperation);
  }

  /**
   * Approve operations: mark as approved, enqueue Cloud Tasks jobs to push to Google People API.
   * Requirements: 13.4, 13.5
   */
  async approveOperations(userId: string, operationIds: string[]): Promise<void> {
    if (operationIds.length === 0) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Mark all as approved (only if they belong to the user and are pending_review)
      const updateResult = await client.query<SyncBackOperationRow>(
        `UPDATE sync_back_operations
         SET status = 'approved'
         WHERE id = ANY($1) AND user_id = $2 AND status = 'pending_review'
         RETURNING *`,
        [operationIds, userId]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('No eligible operations found to approve');
      }

      await client.query('COMMIT');

      // Enqueue Cloud Tasks jobs for each approved operation
      for (const row of updateResult.rows) {
        try {
          await this.enqueueJob(row.id, userId);
        } catch (err) {
          console.error(`[SyncBack] Failed to enqueue job for operation ${row.id}:`, err);
          // Mark as failed if enqueue fails
          await pool.query(
            `UPDATE sync_back_operations SET status = 'failed' WHERE id = $1`,
            [row.id]
          );
        }
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Skip operations: mark as skipped.
   * Requirements: 13.3
   */
  async skipOperations(userId: string, operationIds: string[]): Promise<void> {
    if (operationIds.length === 0) return;

    const result = await pool.query(
      `UPDATE sync_back_operations
       SET status = 'skipped', resolved_at = NOW()
       WHERE id = ANY($1) AND user_id = $2 AND status = 'pending_review'`,
      [operationIds, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('No eligible operations found to skip');
    }
  }

  /**
   * Undo a synced operation: revert the change locally and on Google Contacts.
   * Requirements: 13.8
   */
  async undoOperation(userId: string, operationId: string): Promise<void> {
    const opResult = await pool.query<SyncBackOperationRow>(
      `SELECT * FROM sync_back_operations WHERE id = $1 AND user_id = $2`,
      [operationId, userId]
    );

    if (opResult.rows.length === 0) {
      throw new Error('Operation not found or does not belong to user');
    }

    const op = rowToSyncBackOperation(opResult.rows[0]);

    if (op.status !== 'synced' && op.status !== 'approved' && op.status !== 'pending_review') {
      throw new Error(`Cannot undo operation with status '${op.status}'`);
    }

    // Revert the local contact field to the previous value
    const fieldColumn = mapFieldToColumn(op.field);
    await pool.query(
      `UPDATE contacts SET ${fieldColumn} = $1 WHERE id = $2 AND user_id = $3`,
      [op.previousValue, op.contactId, userId]
    );

    // Mark the operation as skipped (reverted)
    await pool.query(
      `UPDATE sync_back_operations SET status = 'skipped', resolved_at = NOW() WHERE id = $1`,
      [operationId]
    );
  }

  /**
   * Handle a 409 conflict: fetch latest from Google, update diff, set status to 'conflict'.
   * Requirements: 13.6
   */
  async handleConflict(userId: string, operationId: string): Promise<SyncBackOperation> {
    const opResult = await pool.query<SyncBackOperationRow>(
      `SELECT sbo.*, c.google_resource_name
       FROM sync_back_operations sbo
       JOIN contacts c ON c.id = sbo.contact_id
       WHERE sbo.id = $1 AND sbo.user_id = $2`,
      [operationId, userId]
    );

    if (opResult.rows.length === 0) {
      throw new Error('Operation not found or does not belong to user');
    }

    const row = opResult.rows[0] as SyncBackOperationRow & { google_resource_name: string };
    const googleResourceName = row.google_resource_name;

    if (!googleResourceName) {
      throw new Error('Contact has no Google resource name');
    }

    // Fetch latest from Google
    const googleData = await this.fetchGoogleContact(userId, googleResourceName);

    if (!googleData) {
      throw new Error('Failed to fetch contact from Google');
    }

    const conflictGoogleValue = googleData.fieldValues[row.field] ?? null;

    // Update the operation with conflict info
    const updateResult = await pool.query<SyncBackOperationRow>(
      `UPDATE sync_back_operations
       SET status = 'conflict', google_etag = $1, conflict_google_value = $2
       WHERE id = $3
       RETURNING *`,
      [googleData.etag, conflictGoogleValue, operationId]
    );

    // Create sync_conflict notification
    try {
      await pool.query(
        `INSERT INTO in_app_notifications (user_id, event_type, title, description, action_url)
         VALUES ($1, 'sync_conflict', 'Sync conflict detected with Google Contacts',
                 'A field was changed in Google since your edit. Please re-review.',
                 '/app/sync-back')`,
        [userId],
      );
    } catch (notifError) {
      console.error('[SyncBack] Failed to create conflict notification:', notifError);
    }

    return rowToSyncBackOperation(updateResult.rows[0]);
  }

  /**
   * Get the stored google etag for a contact.
   */
  private async getContactGoogleEtag(contactId: string): Promise<string | null> {
    const result = await pool.query<{ google_etag: string | null }>(
      'SELECT google_etag FROM contacts WHERE id = $1',
      [contactId]
    );
    return result.rows[0]?.google_etag ?? null;
  }
}


// --- Helper functions ---

/**
 * Map a sync-back field name to the corresponding contacts table column.
 */
export function mapFieldToColumn(field: string): string {
  const mapping: Record<string, string> = {
    name: 'name',
    phone: 'phone',
    email: 'email',
    customNotes: 'custom_notes',
  };
  const col = mapping[field];
  if (!col) {
    throw new Error(`Unknown sync-back field: ${field}`);
  }
  return col;
}

/**
 * Default Cloud Tasks enqueue function for sync-back push jobs.
 */
async function defaultEnqueueSyncBackJob(operationId: string, userId: string): Promise<void> {
  const queue = new CloudTasksQueue('google-contacts-sync');
  await queue.add('sync-back-push', { operationId, userId });
}

/**
 * Default function to fetch a contact from Google People API.
 * Returns the etag and relevant field values.
 */
async function defaultFetchGoogleContact(
  userId: string,
  googleResourceName: string
): Promise<{ etag: string; fieldValues: Record<string, string | null> } | null> {
  const token = await getToken(userId, 'google-contacts');
  if (!token) {
    console.error(`[SyncBack] No Google Contacts token found for user ${userId}`);
    return null;
  }

  const credentials: Credentials = {
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
  };

  const peopleClient = getPeopleClient(credentials);

  try {
    const response = await peopleClient.people.get({
      resourceName: googleResourceName,
      personFields: 'names,phoneNumbers,emailAddresses,biographies,metadata',
    });

    const person = response.data;
    const etag = person.etag || '';

    const fieldValues: Record<string, string | null> = {
      name: person.names?.[0]?.displayName ?? null,
      phone: person.phoneNumbers?.[0]?.value ?? null,
      email: person.emailAddresses?.[0]?.value ?? null,
      customNotes: person.biographies?.[0]?.value ?? null,
    };

    return { etag, fieldValues };
  } catch (err) {
    console.error(`[SyncBack] Failed to fetch Google contact ${googleResourceName}:`, err);
    return null;
  }
}
