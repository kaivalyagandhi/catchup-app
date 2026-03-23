/**
 * User Preferences API Routes
 *
 * Generic key-value preference endpoints for authenticated users.
 * Uses the user_preferences table via UserPreferencesRepository.
 *
 * Requirements: 1.6, 1.7, 9
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { PostgresUserPreferencesRepository } from '../../users/user-preferences-repository';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/users/preferences/:key
 * Returns the stored preference value for the authenticated user.
 * Returns 404 if the key does not exist.
 */
router.get('/:key', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { key } = req.params;

    const repository = new PostgresUserPreferencesRepository();
    const value = await repository.get(userId, key);

    if (value === null) {
      res.status(404).json({ error: 'Preference not found' });
      return;
    }

    res.json({ key, value });
  } catch (error) {
    console.error('Error fetching user preference:', error);
    res.status(500).json({ error: 'Failed to fetch user preference' });
  }
});

/**
 * PUT /api/users/preferences/:key
 * Stores or updates a preference value for the authenticated user.
 * Expects request body: { value: any }
 * Returns { key, value, updatedAt }.
 */
router.put('/:key', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      res.status(400).json({ error: 'value is required in request body' });
      return;
    }

    const repository = new PostgresUserPreferencesRepository();
    await repository.set(userId, key, value);

    res.json({ key, value, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error setting user preference:', error);
    res.status(500).json({ error: 'Failed to set user preference' });
  }
});

export default router;
