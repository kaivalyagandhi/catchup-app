import { Router, Request, Response } from 'express';
import * as availabilityService from '../../calendar/availability-service';
import * as preferencesService from '../../notifications/preferences-service';

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

export default router;
