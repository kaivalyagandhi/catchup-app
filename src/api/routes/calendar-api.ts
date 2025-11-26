/**
 * Calendar API Routes
 * Handles calendar event retrieval and availability detection
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getToken } from '../../integrations/oauth-repository';
import { getCalendarEvents, getAvailableSlots } from '../../integrations/google-calendar-service';

const router = Router();

/**
 * GET /api/calendar/events
 * Get calendar events for a date range
 * Query params: startTime, endTime (ISO 8601 format)
 */
router.get('/events', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      res.status(400).json({ error: 'startTime and endTime are required' });
      return;
    }

    // Get OAuth token
    const token = await getToken(req.userId, 'google_calendar');

    if (!token) {
      res.status(403).json({ error: 'Google Calendar not connected' });
      return;
    }

    const start = new Date(startTime as string);
    const end = new Date(endTime as string);

    const events = await getCalendarEvents(
      {
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        token_type: token.tokenType
      },
      start,
      end
    );

    res.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

/**
 * GET /api/calendar/available-slots
 * Get available time slots for a date range
 * Query params: startTime, endTime (ISO 8601 format), slotDurationMinutes (optional, default 30)
 */
router.get('/available-slots', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { startTime, endTime, slotDurationMinutes } = req.query;

    if (!startTime || !endTime) {
      res.status(400).json({ error: 'startTime and endTime are required' });
      return;
    }

    // Get OAuth token
    const token = await getToken(req.userId, 'google_calendar');

    if (!token) {
      res.status(403).json({ error: 'Google Calendar not connected' });
      return;
    }

    const start = new Date(startTime as string);
    const end = new Date(endTime as string);
    const duration = slotDurationMinutes ? parseInt(slotDurationMinutes as string) : 30;

    const slots = await getAvailableSlots(
      {
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        token_type: token.tokenType
      },
      start,
      end,
      duration
    );

    res.json({ slots });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

export default router;
