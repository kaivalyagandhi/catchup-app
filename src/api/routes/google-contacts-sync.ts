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
        message: 'Please connect your Google Contacts account first'
      });
      return;
    }

    // Check for existing sync job for this user
    const existingJobs = await googleContactsSyncQueue.getJobs(['active', 'waiting', 'delayed']);
    const userHasActiveJob = existingJobs.some(
      job => job.data.userId === req.userId
    );

    if (userHasActiveJob) {
      res.status(409).json({ 
        error: 'Sync already in progress',
        message: 'A sync operation is already running for your account'
      });
      return;
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
      message: 'Full sync started',
      jobId: job.id,
      status: 'queued',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error starting full sync:', errorMsg);
    res.status(500).json({ 
      error: 'Failed to start sync',
      details: errorMsg
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
        message: 'Please connect your Google Contacts account first'
      });
      return;
    }

    // Check for existing sync job for this user
    const existingJobs = await googleContactsSyncQueue.getJobs(['active', 'waiting', 'delayed']);
    const userHasActiveJob = existingJobs.some(
      job => job.data.userId === req.userId
    );

    if (userHasActiveJob) {
      res.status(409).json({ 
        error: 'Sync already in progress',
        message: 'A sync operation is already running for your account'
      });
      return;
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
      message: 'Incremental sync started',
      jobId: job.id,
      status: 'queued',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error starting incremental sync:', errorMsg);
    res.status(500).json({ 
      error: 'Failed to start sync',
      details: errorMsg
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
    const userActiveJob = activeJobs.find(job => job.data.userId === req.userId);

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
      details: errorMsg
    });
  }
});

/**
 * GET /api/contacts/groups/mappings/pending
 * Get all pending group mapping suggestions
 * 
 * Requirements: 6.5
 */
router.get('/groups/mappings/pending', authenticate, async (req: AuthenticatedRequest, res: Response) => {
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
      details: errorMsg
    });
  }
});

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
      details: errorMsg
    });
  }
});

/**
 * POST /api/contacts/groups/mappings/:id/approve
 * Approve a group mapping suggestion
 * 
 * Requirements: 6.6
 */
router.post('/groups/mappings/:id/approve', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const mappingId = req.params.id;

    const { groupSyncService } = await import('../../integrations/group-sync-service');
    const approvedMapping = await groupSyncService.approveMappingSuggestion(req.userId, mappingId);

    res.json({
      message: 'Group mapping approved successfully',
      mapping: approvedMapping
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error approving mapping:', errorMsg);
    res.status(500).json({ 
      error: 'Failed to approve mapping',
      details: errorMsg
    });
  }
});

/**
 * POST /api/contacts/groups/mappings/:id/reject
 * Reject a group mapping suggestion
 * 
 * Requirements: 6.7
 */
router.post('/groups/mappings/:id/reject', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const mappingId = req.params.id;

    const { groupSyncService } = await import('../../integrations/group-sync-service');
    await groupSyncService.rejectMappingSuggestion(req.userId, mappingId);

    res.json({
      message: 'Group mapping rejected successfully'
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error rejecting mapping:', errorMsg);
    res.status(500).json({ 
      error: 'Failed to reject mapping',
      details: errorMsg
    });
  }
});

export default router;
