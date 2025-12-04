/**
 * Google Contacts Sync Routes
 * Handles manual and automatic synchronization of contacts
 *
 * Requirements: 4.1, 4.5, 8.1, 8.2, 8.3
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { googleContactsSyncQueue } from '../../jobs/queue';
import { GoogleContactsSyncJobData } from '../../jobs/types';
import { googleContactsSyncService } from '../../integrations/google-contacts-sync-service';
import { googleContactsOAuthService } from '../../integrations/google-contacts-oauth-service';

const router = Router();

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

    // Check for existing sync job for this user (exclude scheduled repeat jobs)
    const existingJobs = await googleContactsSyncQueue.getJobs(['active', 'waiting']);
    const userHasActiveJob = existingJobs.some((job) => job.data.userId === req.userId);

    if (userHasActiveJob) {
      res.status(409).json({
        error: 'Sync already in progress',
        message: 'A sync is already in progress. Please wait for it to complete.',
      });
      return;
    }

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

    const job = await googleContactsSyncQueue.add(jobData, {
      jobId: `google-contacts-sync-${req.userId}-${Date.now()}`,
    });

    console.log(`Full sync job queued for user ${req.userId}, job ID: ${job.id}`);

    res.json({
      message: 'Sync started successfully',
      jobId: job.id,
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

    // Check for existing sync job for this user (exclude scheduled repeat jobs)
    const existingJobs = await googleContactsSyncQueue.getJobs(['active', 'waiting']);
    const userHasActiveJob = existingJobs.some((job) => job.data.userId === req.userId);

    if (userHasActiveJob) {
      res.status(409).json({
        error: 'Sync already in progress',
        message: 'A sync is already in progress. Please wait for it to complete.',
      });
      return;
    }

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

    const job = await googleContactsSyncQueue.add(jobData, {
      jobId: `google-contacts-sync-${req.userId}-${Date.now()}`,
    });

    console.log(`Incremental sync job queued for user ${req.userId}, job ID: ${job.id}`);

    res.json({
      message: 'Sync started successfully',
      jobId: job.id,
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

    // Check for active sync job
    const activeJobs = await googleContactsSyncQueue.getJobs(['active', 'waiting', 'delayed']);
    const userActiveJob = activeJobs.find((job) => job.data.userId === req.userId);

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
    };

    // Add active job info if exists
    if (userActiveJob) {
      response.syncInProgress = true;
      response.currentJobId = userActiveJob.id;
      response.currentSyncType = userActiveJob.data.syncType;
    } else {
      response.syncInProgress = false;
    }

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
 * GET /api/contacts/groups/mappings/pending
 * Get all pending group mapping suggestions
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
 * POST /api/contacts/groups/mappings/:id/approve
 * Approve a group mapping suggestion
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
      await groupSyncService.approveMappingSuggestion(
        req.userId,
        mappingId,
        excludedMembers
      );

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
 * POST /api/contacts/groups/mappings/:id/reject
 * Reject a group mapping suggestion
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

    console.log(`Group member sync completed for user ${req.userId}: ${membershipsUpdated} memberships updated`);

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

export default router;
