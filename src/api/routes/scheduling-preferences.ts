/**
 * Scheduling Preferences API Routes
 *
 * API endpoints for user scheduling preferences and privacy settings.
 * Requirements: 16.1-16.12, 8.1-8.9
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import * as schedulingPreferencesService from '../../scheduling/scheduling-preferences-service';
import * as preferencesRepository from '../../scheduling/preferences-repository';

const router = Router();

/**
 * GET /api/scheduling/preferences - Get user scheduling preferences
 */
router.get('/preferences', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const preferences = await schedulingPreferencesService.getPreferences(req.userId);
    
    if (!preferences) {
      // Return default preferences if none exist
      return res.json({
        preferredDays: [],
        preferredTimeRanges: [],
        preferredDurations: [60],
        favoriteLocations: [],
        defaultActivityType: null,
        applyByDefault: false,
      });
    }

    res.json(preferences);
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

/**
 * PUT /api/scheduling/preferences - Save user scheduling preferences
 */
router.put('/preferences', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      preferredDays,
      preferredTimeRanges,
      preferredDurations,
      favoriteLocations,
      defaultActivityType,
      applyByDefault,
    } = req.body;

    const preferences = await schedulingPreferencesService.savePreferences(req.userId, {
      preferredDays,
      preferredTimeRanges,
      preferredDurations,
      favoriteLocations,
      defaultActivityType,
      applyByDefault,
    });

    res.json(preferences);
  } catch (error: any) {
    console.error('Error saving preferences:', error);
    if (error.message.includes('Invalid') || error.message.includes('Maximum')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

/**
 * POST /api/scheduling/preferences/locations - Add a favorite location
 */
router.post('/preferences/locations', async (req: Request, res: Response) => {
  try {
    const { userId, location } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'location is required' });
    }

    const preferences = await schedulingPreferencesService.addFavoriteLocation(
      userId,
      location.trim()
    );
    res.json(preferences);
  } catch (error: any) {
    console.error('Error adding favorite location:', error);
    if (error.message.includes('Maximum') || error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to add favorite location' });
  }
});

/**
 * DELETE /api/scheduling/preferences/locations - Remove a favorite location
 */
router.delete('/preferences/locations', async (req: Request, res: Response) => {
  try {
    const { userId, location } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    if (!location) {
      return res.status(400).json({ error: 'location query parameter is required' });
    }

    const preferences = await schedulingPreferencesService.removeFavoriteLocation(
      userId as string,
      location as string
    );

    if (!preferences) {
      return res.status(404).json({ error: 'Preferences not found' });
    }

    res.json(preferences);
  } catch (error) {
    console.error('Error removing favorite location:', error);
    res.status(500).json({ error: 'Failed to remove favorite location' });
  }
});

/**
 * GET /api/scheduling/preferences/suggested-slots - Get suggested time slots based on preferences
 */
router.get('/preferences/suggested-slots', async (req: Request, res: Response) => {
  try {
    const { userId, dateRangeStart, dateRangeEnd } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    if (!dateRangeStart || !dateRangeEnd) {
      return res.status(400).json({ error: 'dateRangeStart and dateRangeEnd are required' });
    }

    const slots = await schedulingPreferencesService.getSuggestedTimeSlots(
      userId as string,
      dateRangeStart as string,
      dateRangeEnd as string
    );

    res.json({ slots });
  } catch (error) {
    console.error('Error getting suggested slots:', error);
    res.status(500).json({ error: 'Failed to get suggested slots' });
  }
});

/**
 * GET /api/scheduling/privacy - Get user calendar sharing privacy settings
 * Requirements: 8.5, 8.6
 */
router.get('/privacy', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const privacySettings = await preferencesRepository.getPrivacySettings(req.userId);
    
    if (!privacySettings) {
      // Return default privacy settings (private by default)
      return res.json({
        shareWithInnerCircle: false,
      });
    }

    res.json(privacySettings);
  } catch (error) {
    console.error('Error getting privacy settings:', error);
    res.status(500).json({ error: 'Failed to get privacy settings' });
  }
});

/**
 * PUT /api/scheduling/privacy - Save user calendar sharing privacy settings
 * Requirements: 8.5, 8.6, 8.8
 */
router.put('/privacy', async (req: Request, res: Response) => {
  try {
    const { shareWithInnerCircle } = req.body;
    
    // Get userId from body or auth header
    const userId = req.body.userId || (req as any).userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Validate shareWithInnerCircle is a boolean
    if (typeof shareWithInnerCircle !== 'boolean') {
      return res.status(400).json({ error: 'shareWithInnerCircle must be a boolean' });
    }

    const privacySettings = await preferencesRepository.savePrivacySettings(userId, {
      shareWithInnerCircle,
    });

    res.json(privacySettings);
  } catch (error) {
    console.error('Error saving privacy settings:', error);
    res.status(500).json({ error: 'Failed to save privacy settings' });
  }
});

export default router;
