/**
 * Suggestion Pause Routes
 *
 * Handles pause creation, retrieval, and early resume.
 *
 * Requirements: 11.8, 11.9, 11.10
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { SuggestionPauseService } from '../../matching/suggestion-pause-service';

const router = Router();
const pauseService = new SuggestionPauseService();

// POST /suggestions/pause — Create a pause (1–4 weeks)
router.post(
  '/pause',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { weeks } = req.body;

      if (!Number.isInteger(weeks) || weeks < 1 || weeks > 4) {
        res.status(400).json({ error: 'Weeks must be between 1 and 4' });
        return;
      }

      const pause = await pauseService.createPause(userId, weeks);
      res.status(201).json(pause);
    } catch (error: any) {
      if (error.statusCode === 409) {
        res.status(409).json({ error: error.message });
        return;
      }
      console.error('Error creating pause:', error);
      res.status(500).json({ error: 'Failed to create pause' });
    }
  },
);

// GET /suggestions/pause — Get current pause state
router.get(
  '/pause',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const pause = await pauseService.getActivePause(userId);
      if (pause) {
        res.json(pause);
      } else {
        res.json({ active: false });
      }
    } catch (error) {
      console.error('Error fetching pause state:', error);
      res.status(500).json({ error: 'Failed to fetch pause state' });
    }
  },
);

// DELETE /suggestions/pause — Resume early
router.delete(
  '/pause',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      await pauseService.resumeEarly(userId);
      res.status(204).send();
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json({ error: error.message });
        return;
      }
      console.error('Error resuming suggestions:', error);
      res.status(500).json({ error: 'Failed to resume suggestions' });
    }
  },
);

export default router;
