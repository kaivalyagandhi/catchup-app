/**
 * Nudge API Routes
 *
 * GET  /api/nudges         — get visible nudges for the user
 * POST /api/nudges/dismiss — dismiss a nudge (7-day cooldown)
 *
 * Requirements: 2.4, 2.5
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getVisibleNudges, dismissNudge, NudgeType } from '../../contacts/nudge-service';

const router = Router();

const VALID_NUDGE_TYPES: NudgeType[] = [
  'get_deeper_insights',
  'organize_circles',
  'set_frequency',
  'import_more',
];

/**
 * GET /
 * Returns visible nudges for the authenticated user.
 * Requirements: 2.4
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const nudges = await getVisibleNudges(userId);
      res.json({ nudges });
    } catch (error) {
      console.error('[Nudges] Get visible nudges error:', error);
      res.status(500).json({ error: 'Failed to fetch nudges' });
    }
  },
);

/**
 * POST /dismiss
 * Dismiss a nudge with 7-day cooldown.
 * Body: { nudgeType: string }
 * Requirements: 2.5
 */
router.post(
  '/dismiss',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { nudgeType } = req.body;
      if (!nudgeType || !VALID_NUDGE_TYPES.includes(nudgeType)) {
        res.status(400).json({
          error: 'Invalid nudge type',
          validTypes: VALID_NUDGE_TYPES,
        });
        return;
      }

      const dismissal = await dismissNudge(userId, nudgeType);
      res.json({ dismissed: true, showAgainAfter: dismissal.showAgainAfter });
    } catch (error) {
      console.error('[Nudges] Dismiss error:', error);
      res.status(500).json({ error: 'Failed to dismiss nudge' });
    }
  },
);

export default router;
