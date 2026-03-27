import { Router, Response } from 'express';
import * as calendarService from '../../calendar/calendar-service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// POST /calendar/connect - Connect Google Calendar
router.post('/connect', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { authCode } = req.body;

    if (!authCode || !userId) {
      return res.status(400).json({ error: 'authCode is required' });
    }

    const connection = await calendarService.connectGoogleCalendar(userId, authCode);
    res.status(201).json(connection);
  } catch (error) {
    console.error('Error connecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to connect Google Calendar' });
  }
});

// GET /calendar/calendars - List user's Google Calendars
router.get('/calendars', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const calendars = await calendarService.listUserCalendars(userId);
    res.json(calendars);
  } catch (error) {
    console.error('Error listing calendars:', error);
    res.status(500).json({ error: 'Failed to list calendars' });
  }
});

// PUT /calendar/calendars/selection - Update selected calendars
router.put('/calendars/selection', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { calendarIds } = req.body;

    if (!userId || !calendarIds || !Array.isArray(calendarIds)) {
      return res.status(400).json({ error: 'calendarIds (array) is required' });
    }

    await calendarService.setSelectedCalendars(userId, calendarIds);
    res.status(204).send();
  } catch (error) {
    console.error('Error updating calendar selection:', error);
    res.status(500).json({ error: 'Failed to update calendar selection' });
  }
});

export default router;
