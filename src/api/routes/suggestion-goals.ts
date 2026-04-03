/**
 * Suggestion Goals Routes
 *
 * Handles connection goal creation, retrieval, and archival.
 *
 * Requirements: 15.6, 15.7, 15.8
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { ConnectionGoalService } from '../../matching/connection-goal-service';

const router = Router();
const goalService = new ConnectionGoalService();

// POST /suggestions/goals — Create a connection goal
router.post(
  '/goals',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { text } = req.body;

      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Goal text is required' });
        return;
      }

      const goal = await goalService.createGoal(userId, text);
      res.status(201).json(goal);
    } catch (error: any) {
      if (error.statusCode === 409) {
        res.status(409).json({ error: error.message });
        return;
      }
      console.error('Error creating goal:', error);
      res.status(500).json({ error: 'Failed to create goal' });
    }
  },
);

// GET /suggestions/goals — Get active goals
router.get(
  '/goals',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const goals = await goalService.getActiveGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error('Error fetching goals:', error);
      res.status(500).json({ error: 'Failed to fetch goals' });
    }
  },
);

// DELETE /suggestions/goals/:goalId — Archive a goal
router.delete(
  '/goals/:goalId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      await goalService.archiveGoal(req.params.goalId, userId);
      res.status(204).send();
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json({ error: error.message });
        return;
      }
      console.error('Error archiving goal:', error);
      res.status(500).json({ error: 'Failed to archive goal' });
    }
  },
);

export default router;
