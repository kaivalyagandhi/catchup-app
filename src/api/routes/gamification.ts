/**
 * Gamification API Routes
 *
 * API endpoints for gamification features including progress tracking,
 * achievements, streaks, and network health scores.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import express, { Request, Response } from 'express';
import { GamificationServiceImpl } from '../../contacts/gamification-service';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const gamificationService = new GamificationServiceImpl();

/**
 * GET /api/gamification/progress
 * Get current progress information
 * Requirements: 8.1
 */
router.get('/progress', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const progress = await gamificationService.getProgress(userId);

    res.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

/**
 * POST /api/gamification/milestones/detect
 * Detect and award new milestones
 * Requirements: 8.2
 */
router.post('/milestones/detect', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const newAchievements = await gamificationService.detectAndAwardMilestones(userId);

    res.json({
      newAchievements,
      count: newAchievements.length,
    });
  } catch (error) {
    console.error('Error detecting milestones:', error);
    res.status(500).json({ error: 'Failed to detect milestones' });
  }
});

/**
 * GET /api/gamification/achievements
 * Get all achievements for the user
 * Requirements: 8.3
 */
router.get('/achievements', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const achievements = await gamificationService.getAchievements(userId);

    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * POST /api/gamification/achievements/:type
 * Award a specific achievement
 * Requirements: 8.3
 */
router.post('/achievements/:type', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const achievementType = req.params.type as any;

    const achievement = await gamificationService.checkAndAwardAchievement(userId, achievementType);

    if (achievement) {
      res.json(achievement);
    } else {
      res.status(200).json({ message: 'Achievement already earned' });
    }
  } catch (error) {
    console.error('Error awarding achievement:', error);
    res.status(500).json({ error: 'Failed to award achievement' });
  }
});

/**
 * GET /api/gamification/streak
 * Get current streak information
 * Requirements: 8.4
 */
router.get('/streak', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const streakInfo = await gamificationService.getStreakInfo(userId);

    res.json(streakInfo);
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

/**
 * POST /api/gamification/streak/update
 * Update streak based on activity
 * Requirements: 8.4
 */
router.post('/streak/update', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const streakInfo = await gamificationService.updateStreak(userId);

    res.json(streakInfo);
  } catch (error) {
    console.error('Error updating streak:', error);
    res.status(500).json({ error: 'Failed to update streak' });
  }
});

/**
 * GET /api/gamification/network-health
 * Get network health score
 * Requirements: 8.5
 */
router.get('/network-health', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const networkHealth = await gamificationService.calculateNetworkHealth(userId);

    res.json(networkHealth);
  } catch (error) {
    console.error('Error calculating network health:', error);
    res.status(500).json({ error: 'Failed to calculate network health' });
  }
});

/**
 * GET /api/gamification/network-health/history
 * Get network health score history
 * Requirements: 8.5
 */
router.get('/network-health/history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 30;

    const history = await gamificationService.getAchievements(userId);

    res.json(history);
  } catch (error) {
    console.error('Error fetching network health history:', error);
    res.status(500).json({ error: 'Failed to fetch network health history' });
  }
});

export default router;
