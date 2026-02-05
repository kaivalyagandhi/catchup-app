/**
 * Sync Status API Routes
 *
 * Provides real-time sync status information for onboarding progress UI.
 * Allows frontend to poll sync status and display progress/errors to users.
 *
 * Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 2: Onboarding Progress UI with Retry"
 */

import { Router, Request, Response } from 'express';
import { syncOrchestrator } from '../../integrations/sync-orchestrator';

const router = Router();

/**
 * Sync status response interface
 */
export interface SyncStatusResponse {
  status: 'in_progress' | 'completed' | 'failed' | 'not_found';
  integrationType: 'google_contacts' | 'google_calendar';
  itemsProcessed?: number;
  totalItems?: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

/**
 * GET /api/sync/status/:userId/:integrationType
 *
 * Get current sync status for a user and integration type.
 * Used by onboarding UI to poll sync progress.
 *
 * @param userId - User ID
 * @param integrationType - 'google_contacts' or 'google_calendar'
 *
 * @returns SyncStatusResponse
 */
router.get('/status/:userId/:integrationType', async (req: Request, res: Response) => {
  try {
    const { userId, integrationType } = req.params;

    // Validate integration type
    if (integrationType !== 'google_contacts' && integrationType !== 'google_calendar') {
      return res.status(400).json({
        error: 'Invalid integration type. Must be "google_contacts" or "google_calendar"',
      });
    }

    // Get sync status from orchestrator
    const status = await syncOrchestrator.getSyncStatus(
      userId,
      integrationType as 'google_contacts' | 'google_calendar'
    );

    if (!status) {
      return res.status(404).json({
        status: 'not_found',
        integrationType,
        errorMessage: 'No sync status found for this user and integration',
      });
    }

    res.json(status);
  } catch (error) {
    console.error('[SyncStatusAPI] Error getting sync status:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
