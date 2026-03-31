/**
 * Sync-Back API Routes
 *
 * GET    /api/sync-back/pending      — Get pending sync-back operations with diff view data
 * POST   /api/sync-back/approve      — Approve selected operations (bulk approve supported)
 * POST   /api/sync-back/skip         — Skip selected operations
 * POST   /api/sync-back/:id/undo     — Undo a synced operation
 *
 * Requirements: 13.2, 13.3, 13.8, 13.9
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { GoogleSyncBackServiceImpl } from '../../integrations/google-sync-back-service';
import { getToken } from '../../integrations/oauth-repository';
import pool from '../../db/connection';

const router = Router();

const CONTACTS_READONLY_SCOPE = 'https://www.googleapis.com/auth/contacts.readonly';
const CONTACTS_READWRITE_SCOPE = 'https://www.googleapis.com/auth/contacts';

/**
 * Check if the user's Google OAuth token includes read-write contacts scope.
 * Returns true if the user has the read-write scope.
 */
async function hasReadWriteScope(userId: string): Promise<boolean> {
  const token = await getToken(userId, 'google_contacts');
  if (!token || !token.scope) {
    return false;
  }
  const scopes = token.scope.split(' ');
  return scopes.includes(CONTACTS_READWRITE_SCOPE);
}

/**
 * Generate an incremental authorization URL that requests the read-write contacts scope.
 * Uses include_granted_scopes=true so existing scopes are preserved.
 *
 * Requirements: 13.9
 */
function generateIncrementalAuthUrl(userId: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CONTACTS_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Google OAuth environment variables not configured');
  }

  const state = Buffer.from(userId).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: CONTACTS_READWRITE_SCOPE,
    include_granted_scopes: 'true',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}


/**
 * GET /pending
 *
 * Returns pending sync-back operations with contact name and current values
 * for diff view display.
 *
 * Requirements: 13.2
 */
router.get(
  '/pending',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Fetch pending operations joined with contact data for diff view
      const { rows } = await pool.query(
        `SELECT sbo.id, sbo.user_id, sbo.contact_id, sbo.field,
                sbo.previous_value, sbo.new_value, sbo.status,
                sbo.google_etag, sbo.conflict_google_value,
                sbo.created_at, sbo.resolved_at,
                c.name AS contact_name, c.phone AS contact_phone,
                c.email AS contact_email, c.custom_notes AS contact_custom_notes
         FROM sync_back_operations sbo
         JOIN contacts c ON c.id = sbo.contact_id
         WHERE sbo.user_id = $1 AND sbo.status = 'pending_review'
         ORDER BY sbo.created_at DESC`,
        [userId],
      );

      const operations = rows.map((row) => ({
        id: row.id,
        contactId: row.contact_id,
        contactName: row.contact_name,
        field: row.field,
        previousValue: row.previous_value,
        newValue: row.new_value,
        currentGoogleValue: row.conflict_google_value ?? row.previous_value,
        status: row.status,
        googleEtag: row.google_etag,
        createdAt: row.created_at,
      }));

      res.json({ operations, count: operations.length });
    } catch (error) {
      console.error('[SyncBack] Get pending operations error:', error);
      res.status(500).json({ error: 'Failed to fetch pending sync-back operations' });
    }
  },
);

/**
 * POST /approve
 *
 * Approve selected sync-back operations (bulk approve supported).
 * Before approving, checks if user has read-write OAuth scope.
 * If not, returns a scope upgrade prompt with incremental auth URL.
 *
 * Requirements: 13.3, 13.9
 */
router.post(
  '/approve',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { operationIds } = req.body;

      if (!Array.isArray(operationIds) || operationIds.length === 0) {
        res.status(400).json({ error: 'operationIds must be a non-empty array' });
        return;
      }

      // Check if user has read-write scope (Requirement 13.9)
      const hasRWScope = await hasReadWriteScope(userId);
      if (!hasRWScope) {
        const authUrl = generateIncrementalAuthUrl(userId);
        res.json({
          scopeUpgradeRequired: true,
          authUrl,
          message: 'Read-write access to Google Contacts is required to sync changes. Please authorize the upgraded scope.',
        });
        return;
      }

      const service = new GoogleSyncBackServiceImpl();
      await service.approveOperations(userId, operationIds);

      res.json({ approved: true, count: operationIds.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve operations';
      console.error('[SyncBack] Approve operations error:', error);
      res.status(500).json({ error: message });
    }
  },
);

/**
 * POST /skip
 *
 * Skip selected sync-back operations.
 *
 * Requirements: 13.3
 */
router.post(
  '/skip',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { operationIds } = req.body;

      if (!Array.isArray(operationIds) || operationIds.length === 0) {
        res.status(400).json({ error: 'operationIds must be a non-empty array' });
        return;
      }

      const service = new GoogleSyncBackServiceImpl();
      await service.skipOperations(userId, operationIds);

      res.json({ skipped: true, count: operationIds.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to skip operations';
      console.error('[SyncBack] Skip operations error:', error);
      res.status(500).json({ error: message });
    }
  },
);

/**
 * POST /:id/undo
 *
 * Undo a synced operation — reverts the change locally and on Google Contacts.
 *
 * Requirements: 13.8
 */
router.post(
  '/:id/undo',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id: operationId } = req.params;

      const service = new GoogleSyncBackServiceImpl();
      await service.undoOperation(userId, operationId);

      res.json({ undone: true, operationId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to undo operation';
      console.error('[SyncBack] Undo operation error:', error);
      res.status(500).json({ error: message });
    }
  },
);

export default router;
