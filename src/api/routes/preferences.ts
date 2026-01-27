import { Router, Request, Response } from 'express';
import * as availabilityService from '../../calendar/availability-service';
import * as preferencesService from '../../notifications/preferences-service';
import { userPreferencesService } from '../../users/preferences-service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// PUT /preferences/availability - Update availability parameters
router.put('/availability', async (req: Request, res: Response) => {
  try {
    const { userId, availabilityParams } = req.body;

    if (!userId || !availabilityParams) {
      return res.status(400).json({ error: 'userId and availabilityParams are required' });
    }

    await availabilityService.setAvailabilityParams(userId, availabilityParams);
    res.status(204).send();
  } catch (error) {
    console.error('Error updating availability preferences:', error);
    res.status(500).json({ error: 'Failed to update availability preferences' });
  }
});

// GET /preferences/availability - Get availability parameters
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const params = await availabilityService.getAvailabilityParams(userId as string);
    res.json(params);
  } catch (error) {
    console.error('Error fetching availability preferences:', error);
    res.status(500).json({ error: 'Failed to fetch availability preferences' });
  }
});

// PUT /preferences/notifications - Update notification preferences
router.put('/notifications', async (req: Request, res: Response) => {
  try {
    const { userId, notificationPreferences } = req.body;

    if (!userId || !notificationPreferences) {
      return res.status(400).json({ error: 'userId and notificationPreferences are required' });
    }

    await preferencesService.setNotificationPreferences(userId, notificationPreferences);
    res.status(204).send();
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// GET /preferences/notifications - Get notification preferences
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const prefs = await preferencesService.getNotificationPreferences(userId as string);
    res.json(prefs);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// GET /preferences/timezone - Get user timezone preference
router.get('/timezone', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const timezone = await userPreferencesService.getTimezone(userId);
    res.json({ timezone });
  } catch (error) {
    console.error('Error fetching timezone preference:', error);
    res.status(500).json({ error: 'Failed to fetch timezone preference' });
  }
});

// PUT /preferences/timezone - Update user timezone preference
router.put('/timezone', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { timezone } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!timezone) {
      return res.status(400).json({ error: 'timezone is required' });
    }

    await userPreferencesService.setTimezone(userId, timezone);
    res.json({ success: true, timezone });
  } catch (error) {
    console.error('Error updating timezone preference:', error);
    
    // Check if it's a validation error
    if (error instanceof Error && error.message.includes('Invalid timezone')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to update timezone preference' });
  }
});

export default router;
