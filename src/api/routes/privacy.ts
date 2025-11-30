/**
 * Privacy API Routes
 *
 * Handles privacy-related operations including data export and account deletion
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { privacyService } from '../../contacts/privacy-service';
import { logAuditEvent, AuditAction } from '../../utils/audit-logger';

const router = Router();

/**
 * GET /api/privacy/notice
 * Get privacy notice content
 */
router.get('/notice', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const notice = privacyService.getPrivacyNotice();
    res.json({ notice });
  } catch (error) {
    console.error('Error getting privacy notice:', error);
    res.status(500).json({ 
      error: 'Failed to get privacy notice',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/privacy/export
 * Export all user data
 * 
 * Body (optional):
 * {
 *   includeContacts: boolean,
 *   includeCircleAssignments: boolean,
 *   includeOnboardingData: boolean,
 *   includeAchievements: boolean,
 *   includeWeeklyCatchup: boolean,
 *   includeInteractions: boolean,
 *   includeVoiceNotes: boolean
 * }
 */
router.post('/export', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const options = {
      userId: req.userId,
      includeContacts: req.body.includeContacts !== false,
      includeCircleAssignments: req.body.includeCircleAssignments !== false,
      includeOnboardingData: req.body.includeOnboardingData !== false,
      includeAchievements: req.body.includeAchievements !== false,
      includeWeeklyCatchup: req.body.includeWeeklyCatchup !== false,
      includeInteractions: req.body.includeInteractions !== false,
      includeVoiceNotes: req.body.includeVoiceNotes !== false
    };

    const exportedData = await privacyService.exportUserData(options);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="catchup-data-export-${Date.now()}.json"`);
    
    res.json(exportedData);
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ 
      error: 'Failed to export data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/privacy/account
 * Delete user account and all associated data
 * 
 * Body:
 * {
 *   confirmation: "DELETE MY ACCOUNT"
 * }
 */
router.delete('/account', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Require explicit confirmation
    if (req.body.confirmation !== 'DELETE MY ACCOUNT') {
      res.status(400).json({ 
        error: 'Confirmation required',
        message: 'Please provide confirmation: "DELETE MY ACCOUNT"'
      });
      return;
    }

    // Log the deletion request
    await logAuditEvent(AuditAction.ACCOUNT_DELETED, {
      userId: req.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { stage: 'requested' },
      success: true
    });

    // Perform deletion
    const result = await privacyService.deleteAccount(req.userId);

    res.json({
      success: true,
      message: 'Account and all data have been permanently deleted',
      deletedRecords: result.deletedRecords
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ 
      error: 'Failed to delete account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/privacy/data-summary
 * Get summary of user's data for transparency
 */
router.get('/data-summary', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Export with minimal data to get counts
    const exportedData = await privacyService.exportUserData({
      userId: req.userId,
      includeContacts: true,
      includeCircleAssignments: true,
      includeOnboardingData: true,
      includeAchievements: true,
      includeWeeklyCatchup: true,
      includeInteractions: true,
      includeVoiceNotes: true
    });

    const summary = {
      contacts: exportedData.contacts?.length || 0,
      circleAssignments: exportedData.circleAssignments?.length || 0,
      achievements: exportedData.achievements?.length || 0,
      weeklyCatchupSessions: exportedData.weeklyCatchupSessions?.length || 0,
      interactions: exportedData.interactions?.length || 0,
      voiceNotes: exportedData.voiceNotes?.length || 0,
      groups: exportedData.groups?.length || 0,
      tags: exportedData.tags?.length || 0,
      hasOnboardingData: !!exportedData.onboardingState,
      hasPreferences: !!exportedData.preferences
    };

    res.json(summary);
  } catch (error) {
    console.error('Error getting data summary:', error);
    res.status(500).json({ 
      error: 'Failed to get data summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/privacy/verify-isolation
 * Verify that a resource belongs to the authenticated user
 * 
 * Body:
 * {
 *   resourceId: string,
 *   resourceType: 'contact' | 'group' | 'tag' | 'voice_note' | 'onboarding_state'
 * }
 */
router.post('/verify-isolation', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { resourceId, resourceType } = req.body;

    if (!resourceId || !resourceType) {
      res.status(400).json({ error: 'resourceId and resourceType are required' });
      return;
    }

    const isOwner = await privacyService.verifyDataIsolation(
      req.userId,
      resourceId,
      resourceType
    );

    res.json({ isOwner });
  } catch (error) {
    console.error('Error verifying data isolation:', error);
    res.status(500).json({ 
      error: 'Failed to verify data isolation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
