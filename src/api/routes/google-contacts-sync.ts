/**
 * Google Contacts Sync Routes
 * Handles manual and automatic synchronization of contacts
 *
 * Requirements: 4.1, 4.5, 8.1, 8.2, 8.3
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { CloudTasksQueue } from '../../jobs/cloud-tasks-client';
import { GoogleContactsSyncJobData } from '../../jobs/types';
import { googleContactsSyncService } from '../../integrations/google-contacts-sync-service';
import { googleContactsOAuthService } from '../../integrations/google-contacts-oauth-service';

const router = Router();

// Cloud Tasks queue for Google Contacts sync
const googleContactsSyncQueue = new CloudTasksQueue('google-contacts-sync');

/**
 * POST /api/contacts/sync/full
 * Trigger a full synchronization of all contacts
 *
 * Requirements: 4.1, 8.1
 */
router.post('/full', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    console.log(`Full sync requested for user ${req.userId}`);

    // Check if user has connected Google Contacts
    const isConnected = await googleContactsOAuthService.isConnected(req.userId);
    if (!isConnected) {
      res.status(400).json({
        error: 'Google Contacts not connected',
        message: 'Please connect your Google Contacts account first',
      });
      return;
    }

    // Check for existing sync job for this user
    // Note: With Cloud Tasks, we rely on database sync state to prevent concurrent syncs
    // Cloud Tasks handles deduplication via idempotency keys

    // Check database sync state for stale locks
    const { getSyncState } = await import('../../integrations/sync-state-repository');
    const syncState = await getSyncState(req.userId);

    if (syncState?.lastSyncStatus === 'in_progress') {
      // Check if sync has been running for more than 5 minutes (stale lock)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (syncState.updatedAt < fiveMinutesAgo) {
        console.log(`Clearing stale sync lock for user ${req.userId}`);
        const { markSyncFailed } = await import('../../integrations/sync-state-repository');
        await markSyncFailed(req.userId, 'Sync timed out - cleared stale lock');
      } else {
        res.status(409).json({
          error: 'Sync already in progress',
          message: 'A sync is already in progress. Please wait for it to complete.',
        });
        return;
      }
    }

    // Queue the sync job
    const jobData: GoogleContactsSyncJobData = {
      userId: req.userId,
      syncType: 'full',
    };

    const taskId = await googleContactsSyncQueue.add(
      `google-contacts-sync-${req.userId}-${Date.now()}`,
      jobData
    );

    console.log(`Full sync job queued for user ${req.userId}, task ID: ${taskId}`);

    res.json({
      message: 'Sync started successfully',
      jobId: taskId,
      status: 'queued',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error starting full sync:', errorMsg);
    res.status(500).json({
      error: 'Failed to start sync',
      message: errorMsg,
    });
  }
});

/**
 * POST /api/contacts/sync/incremental
 * Trigger an incremental synchronization (only changed contacts)
 *
 * Requirements: 4.1, 8.1
 */
router.post('/incremental', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    console.log(`Incremental sync requested for user ${req.userId}`);

    // Check if user has connected Google Contacts
    const isConnected = await googleContactsOAuthService.isConnected(req.userId);
    if (!isConnected) {
      res.status(400).json({
        error: 'Google Contacts not connected',
        message: 'Please connect your Google Contacts account first',
      });
      return;
    }

    // Check for existing sync job for this user
    // Note: With Cloud Tasks, we rely on database sync state to prevent concurrent syncs
    // Cloud Tasks handles deduplication via idempotency keys

    // Check database sync state for stale locks
    const { getSyncState } = await import('../../integrations/sync-state-repository');
    const syncState = await getSyncState(req.userId);

    if (syncState?.lastSyncStatus === 'in_progress') {
      // Check if sync has been running for more than 5 minutes (stale lock)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (syncState.updatedAt < fiveMinutesAgo) {
        console.log(`Clearing stale sync lock for user ${req.userId}`);
        const { markSyncFailed } = await import('../../integrations/sync-state-repository');
        await markSyncFailed(req.userId, 'Sync timed out - cleared stale lock');
      } else {
        res.status(409).json({
          error: 'Sync already in progress',
          message: 'A sync is already in progress. Please wait for it to complete.',
        });
        return;
      }
    }

    // Queue the sync job
    const jobData: GoogleContactsSyncJobData = {
      userId: req.userId,
      syncType: 'incremental',
    };

    const taskId = await googleContactsSyncQueue.add(
      `google-contacts-sync-${req.userId}-${Date.now()}`,
      jobData
    );

    console.log(`Incremental sync job queued for user ${req.userId}, task ID: ${taskId}`);

    res.json({
      message: 'Sync started successfully',
      jobId: taskId,
      status: 'queued',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error starting incremental sync:', errorMsg);
    res.status(500).json({
      error: 'Failed to start sync',
      message: errorMsg,
    });
  }
});

/**
 * GET /api/contacts/sync/status
 * Get the current sync status and history
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    console.log(`Sync status requested for user ${req.userId}`);

    // Check if user has connected Google Contacts
    const connectionStatus = await googleContactsOAuthService.getConnectionStatus(req.userId);

    if (!connectionStatus.connected) {
      res.json({
        connected: false,
        message: 'Google Contacts not connected',
      });
      return;
    }

    // Get sync state from database
    const syncState = await googleContactsSyncService.getSyncState(req.userId);

    // Note: With Cloud Tasks, we check database sync state instead of queue
    // syncInProgress is determined by lastSyncStatus === 'in_progress'

    // Build response
    const response: any = {
      connected: true,
      email: connectionStatus.email,
      lastSyncAt: syncState?.lastIncrementalSyncAt || syncState?.lastFullSyncAt || null,
      lastFullSyncAt: syncState?.lastFullSyncAt || null,
      totalContactsSynced: syncState?.totalContactsSynced || 0,
      lastSyncStatus: syncState?.lastSyncStatus || 'pending',
      lastSyncError: syncState?.lastSyncError || null,
      autoSyncEnabled: true, // Will be configurable in future
      syncInProgress: syncState?.lastSyncStatus === 'in_progress',
    };

    console.log('Sync status:', response);

    res.json(response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error getting sync status:', errorMsg);
    res.status(500).json({
      error: 'Failed to get sync status',
      details: errorMsg,
    });
  }
});

/**
 * GET /api/google-contacts/mapping-suggestions
 * Get mapping suggestions
 * Requirements: 5.2, 5.3, 5.4
 */
router.get(
  '/mapping-suggestions',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { groupSyncService } = await import('../../integrations/group-sync-service');
      const pendingMappings = await groupSyncService.getPendingMappingSuggestions(req.userId);

      res.json(pendingMappings);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error getting mapping suggestions:', errorMsg);
      res.status(500).json({
        error: 'Failed to get mapping suggestions',
        details: errorMsg,
      });
    }
  }
);

/**
 * GET /api/contacts/sync/reviewed-mappings
 * Get all reviewed group mappings (accepted and rejected)
 * Requirements: Groups & Preferences UI Improvements - 1.1
 */
router.get('/reviewed-mappings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const pool = await import('../../db/connection').then((m) => m.default);

    // Query reviewed mappings (approved or rejected)
    const result = await pool.query(
      `SELECT 
          gcg.id,
          gcg.google_resource_name as google_group_id,
          gcg.google_name as google_group_name,
          gcg.catchup_group_id,
          g.name as catchup_group_name,
          gcg.mapping_status as status,
          gcg.reviewed_at,
          gcg.member_count
        FROM google_contact_groups gcg
        LEFT JOIN groups g ON g.id = gcg.catchup_group_id
        WHERE gcg.user_id = $1
          AND gcg.mapping_status IN ('approved', 'rejected')
        ORDER BY gcg.reviewed_at DESC`,
      [req.userId]
    );

    res.json({ mappings: result.rows });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error getting reviewed mappings:', errorMsg);
    res.status(500).json({
      error: 'Failed to get reviewed mappings',
      details: errorMsg,
    });
  }
});

/**
 * GET /api/contacts/groups/mappings/pending
 * Get all pending group mapping suggestions (legacy endpoint)
 *
 * Requirements: 6.5
 */
router.get(
  '/groups/mappings/pending',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { groupSyncService } = await import('../../integrations/group-sync-service');
      const pendingMappings = await groupSyncService.getPendingMappingSuggestions(req.userId);

      res.json(pendingMappings);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error getting pending mappings:', errorMsg);
      res.status(500).json({
        error: 'Failed to get pending mappings',
        details: errorMsg,
      });
    }
  }
);

/**
 * GET /api/contacts/groups/mappings
 * Get all group mappings (all statuses)
 *
 * Requirements: 6.5
 */
router.get('/groups/mappings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { findAll } = await import('../../integrations/group-mapping-repository');
    const allMappings = await findAll(req.userId);

    res.json(allMappings);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error getting all mappings:', errorMsg);
    res.status(500).json({
      error: 'Failed to get mappings',
      details: errorMsg,
    });
  }
});

/**
 * POST /api/google-contacts/accept-mapping
 * Accept a mapping
 * Requirements: 5.2, 5.3, 5.4
 */
router.post('/accept-mapping', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { mappingId, googleGroupId, catchupGroupId, excludedMembers = [] } = req.body;

    if (!mappingId && !googleGroupId) {
      res.status(400).json({ error: 'mappingId or googleGroupId is required' });
      return;
    }

    const { groupSyncService } = await import('../../integrations/group-sync-service');

    // Use mappingId if provided, otherwise find by googleGroupId
    const targetMappingId = mappingId || googleGroupId;

    // Approve mapping and store excluded members
    await groupSyncService.approveMappingSuggestion(req.userId, targetMappingId, excludedMembers);

    // Sync members for this specific mapping only, excluding the ones user removed
    const membershipsUpdated = await groupSyncService.syncMembersForMapping(
      req.userId,
      targetMappingId,
      excludedMembers
    );

    res.json({
      message: 'Group mapping accepted successfully',
      membershipsUpdated,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error accepting mapping:', errorMsg);
    res.status(500).json({
      error: 'Failed to accept mapping',
      details: errorMsg,
    });
  }
});

/**
 * POST /api/contacts/groups/mappings/:id/approve
 * Approve a group mapping suggestion (legacy endpoint)
 *
 * Requirements: 6.6
 */
router.post(
  '/groups/mappings/:id/approve',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const mappingId = req.params.id;
      const { excludedMembers = [] } = req.body;

      const { groupSyncService } = await import('../../integrations/group-sync-service');

      // Approve mapping and store excluded members
      await groupSyncService.approveMappingSuggestion(req.userId, mappingId, excludedMembers);

      // Sync members for this specific mapping only, excluding the ones user removed
      const membershipsUpdated = await groupSyncService.syncMembersForMapping(
        req.userId,
        mappingId,
        excludedMembers
      );

      res.json({
        message: 'Group mapping approved successfully',
        membershipsUpdated,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error approving mapping:', errorMsg);
      res.status(500).json({
        error: 'Failed to approve mapping',
        details: errorMsg,
      });
    }
  }
);

/**
 * POST /api/google-contacts/reject-mapping
 * Reject a mapping
 * Requirements: 5.2, 5.3, 5.4
 */
router.post('/reject-mapping', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { mappingId, googleGroupId } = req.body;

    if (!mappingId && !googleGroupId) {
      res.status(400).json({ error: 'mappingId or googleGroupId is required' });
      return;
    }

    const { groupSyncService } = await import('../../integrations/group-sync-service');

    // Use mappingId if provided, otherwise use googleGroupId
    const targetMappingId = mappingId || googleGroupId;

    await groupSyncService.rejectMappingSuggestion(req.userId, targetMappingId);

    res.json({
      message: 'Group mapping rejected successfully',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error rejecting mapping:', errorMsg);
    res.status(500).json({
      error: 'Failed to reject mapping',
      details: errorMsg,
    });
  }
});

/**
 * POST /api/contacts/groups/mappings/:id/reject
 * Reject a group mapping suggestion (legacy endpoint)
 *
 * Requirements: 6.7
 */
router.post(
  '/groups/mappings/:id/reject',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const mappingId = req.params.id;

      const { groupSyncService } = await import('../../integrations/group-sync-service');
      await groupSyncService.rejectMappingSuggestion(req.userId, mappingId);

      res.json({
        message: 'Group mapping rejected successfully',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error rejecting mapping:', errorMsg);
      res.status(500).json({
        error: 'Failed to reject mapping',
        details: errorMsg,
      });
    }
  }
);

/**
 * GET /api/contacts/sync/groups/mappings/:id/members
 * Get members for a group mapping (preview before approval)
 *
 * Requirements: 6.5
 */
router.get(
  '/groups/mappings/:id/members',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const mappingId = req.params.id;
      const pool = await import('../../db/connection').then((m) => m.default);

      // Get the mapping
      const { findAll } = await import('../../integrations/group-mapping-repository');
      const allMappings = await findAll(req.userId);
      const mapping = allMappings.find((m) => m.id === mappingId);

      if (!mapping) {
        res.status(404).json({ error: 'Mapping not found' });
        return;
      }

      // Get contacts that are members of this Google group
      const result = await pool.query(
        `SELECT c.id, c.name, c.email, c.phone, c.location
         FROM contacts c
         JOIN contact_google_memberships cgm ON c.id = cgm.contact_id
         WHERE cgm.user_id = $1 AND cgm.google_group_resource_name = $2
         ORDER BY c.name`,
        [req.userId, mapping.googleResourceName]
      );

      res.json({
        mappingId,
        googleName: mapping.googleName,
        memberCount: result.rows.length,
        members: result.rows,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error getting mapping members:', errorMsg);
      res.status(500).json({
        error: 'Failed to get mapping members',
        message: errorMsg,
      });
    }
  }
);

/**
 * POST /api/contacts/sync/groups/members
 * Sync group members for approved mappings
 *
 * Requirements: 6.8
 */
router.post('/groups/members', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    console.log(`Group member sync requested for user ${req.userId}`);

    // Check if user has connected Google Contacts
    const isConnected = await googleContactsOAuthService.isConnected(req.userId);
    if (!isConnected) {
      res.status(400).json({
        error: 'Google Contacts not connected',
        message: 'Please connect your Google Contacts account first',
      });
      return;
    }

    // Get access token
    const accessToken = await googleContactsOAuthService.getAccessToken(req.userId);

    // Sync group memberships using cached data (no API calls needed)
    const { groupSyncService } = await import('../../integrations/group-sync-service');
    const membershipsUpdated = await groupSyncService.syncGroupMembershipsFromCache(req.userId);

    console.log(
      `Group member sync completed for user ${req.userId}: ${membershipsUpdated} memberships updated`
    );

    res.json({
      message: 'Group members synced successfully',
      membershipsUpdated,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error syncing group members:', errorMsg);
    res.status(500).json({
      error: 'Failed to sync group members',
      message: errorMsg,
    });
  }
});

/**
 * GET /api/contacts/sync/health
 * Get comprehensive sync health status for contacts
 * Requirements: 9.1, 9.6 - Graceful degradation
 */
router.get('/health', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { GracefulDegradationService } = await import(
      '../../integrations/graceful-degradation-service'
    );
    const { CircuitBreakerManager } = await import('../../integrations/circuit-breaker-manager');
    const { TokenHealthMonitor } = await import('../../integrations/token-health-monitor');

    const circuitBreakerManager = CircuitBreakerManager.getInstance();
    const tokenHealthMonitor = TokenHealthMonitor.getInstance();
    const gracefulDegradationService = new GracefulDegradationService(
      circuitBreakerManager,
      tokenHealthMonitor
    );

    const syncStatus = await gracefulDegradationService.getSyncStatus(
      req.userId,
      'google_contacts'
    );

    res.json(syncStatus);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error getting contacts sync health:', errorMsg);
    res.status(500).json({
      error: 'Failed to get contacts sync health',
      details: errorMsg,
    });
  }
});

/**
 * GET /api/contacts/sync/comprehensive-health
 * Get comprehensive sync health for both contacts and calendar
 * Requirements: 9.1, 9.6 - Graceful degradation
 */
router.get(
  '/comprehensive-health',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { GracefulDegradationService } = await import(
        '../../integrations/graceful-degradation-service'
      );
      const { CircuitBreakerManager } = await import('../../integrations/circuit-breaker-manager');
      const { TokenHealthMonitor } = await import('../../integrations/token-health-monitor');

      const circuitBreakerManager = CircuitBreakerManager.getInstance();
      const tokenHealthMonitor = TokenHealthMonitor.getInstance();
      const gracefulDegradationService = new GracefulDegradationService(
        circuitBreakerManager,
        tokenHealthMonitor
      );

      const comprehensiveHealth = await gracefulDegradationService.getComprehensiveSyncHealth(
        req.userId
      );

      res.json(comprehensiveHealth);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error getting comprehensive sync health:', errorMsg);
      res.status(500).json({
        error: 'Failed to get comprehensive sync health',
        details: errorMsg,
      });
    }
  }
);

export default router;
