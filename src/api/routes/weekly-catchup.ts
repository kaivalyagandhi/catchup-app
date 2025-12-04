/**
 * Weekly Catchup API Routes
 *
 * REST API endpoints for weekly contact review sessions.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import express, { Request, Response } from 'express';
import {
  PostgresWeeklyCatchupService,
  type ReviewActionData,
} from '../../contacts/weekly-catchup-service';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const weeklyCatchupService = new PostgresWeeklyCatchupService();

/**
 * Start a new weekly catchup session
 * POST /api/weekly-catchup/start
 * Requirements: 7.1
 */
router.post('/start', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const session = await weeklyCatchupService.startSession(userId);

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Error starting weekly catchup session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start weekly catchup session',
    });
  }
});

/**
 * Get current active session
 * GET /api/weekly-catchup/current
 * Requirements: 7.1, 7.2
 */
router.get('/current', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const session = await weeklyCatchupService.getCurrentSession(userId);

    if (!session) {
      res.json({
        success: true,
        session: null,
      });
      return;
    }

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Error getting current session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current session',
    });
  }
});

/**
 * Get next contact to review
 * GET /api/weekly-catchup/:sessionId/next
 * Requirements: 7.2
 */
router.get('/:sessionId/next', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { sessionId } = req.params;

    const contact = await weeklyCatchupService.getNextContact(sessionId, userId);

    res.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error('Error getting next contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get next contact',
    });
  }
});

/**
 * Mark contact as reviewed
 * POST /api/weekly-catchup/:sessionId/review
 * Requirements: 7.2
 *
 * Body: {
 *   contactId: string,
 *   action: 'keep' | 'archive' | 'update_circle' | 'set_preference',
 *   circle?: DunbarCircle,
 *   frequencyPreference?: string
 * }
 */
router.post(
  '/:sessionId/review',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { sessionId } = req.params;
      const { contactId, action, circle, frequencyPreference } = req.body;

      if (!contactId || !action) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: contactId, action',
        });
        return;
      }

      const actionData: ReviewActionData = {
        action,
        circle,
        frequencyPreference,
      };

      await weeklyCatchupService.markContactReviewed(sessionId, userId, contactId, actionData);

      res.json({
        success: true,
        message: 'Contact reviewed successfully',
      });
    } catch (error) {
      console.error('Error reviewing contact:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to review contact',
      });
    }
  }
);

/**
 * Get session progress
 * GET /api/weekly-catchup/:sessionId/progress
 * Requirements: 7.2
 */
router.get(
  '/:sessionId/progress',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { sessionId } = req.params;

      const progress = await weeklyCatchupService.getSessionProgress(sessionId, userId);

      res.json({
        success: true,
        progress,
      });
    } catch (error) {
      console.error('Error getting session progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get session progress',
      });
    }
  }
);

/**
 * Complete the session
 * POST /api/weekly-catchup/:sessionId/complete
 * Requirements: 7.3
 */
router.post(
  '/:sessionId/complete',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { sessionId } = req.params;

      await weeklyCatchupService.completeSession(sessionId, userId);

      res.json({
        success: true,
        message: 'Session completed successfully',
      });
    } catch (error) {
      console.error('Error completing session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete session',
      });
    }
  }
);

/**
 * Skip the session
 * POST /api/weekly-catchup/:sessionId/skip
 * Requirements: 7.4
 */
router.post('/:sessionId/skip', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { sessionId } = req.params;

    await weeklyCatchupService.skipSession(sessionId, userId);

    res.json({
      success: true,
      message: 'Session skipped successfully',
    });
  } catch (error) {
    console.error('Error skipping session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to skip session',
    });
  }
});

export default router;
