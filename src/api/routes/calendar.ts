import { Router, Request, Response } from 'express';
import * as calendarService from '../../calendar/calendar-service';
import * as feedService from '../../calendar/feed-service';

const router = Router();

// POST /calendar/connect - Connect Google Calendar
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { authCode, userId } = req.body;
    
    if (!authCode || !userId) {
      return res.status(400).json({ error: 'authCode and userId are required' });
    }
    
    const connection = await calendarService.connectGoogleCalendar(userId, authCode);
    res.status(201).json(connection);
  } catch (error) {
    console.error('Error connecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to connect Google Calendar' });
  }
});

// GET /calendar/calendars - List user's Google Calendars
router.get('/calendars', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }
    
    const calendars = await calendarService.listUserCalendars(userId as string);
    res.json(calendars);
  } catch (error) {
    console.error('Error listing calendars:', error);
    res.status(500).json({ error: 'Failed to list calendars' });
  }
});

// PUT /calendar/calendars/selection - Update selected calendars
router.put('/calendars/selection', async (req: Request, res: Response) => {
  try {
    const { userId, calendarIds } = req.body;
    
    if (!userId || !calendarIds || !Array.isArray(calendarIds)) {
      return res.status(400).json({ error: 'userId and calendarIds (array) are required' });
    }
    
    await calendarService.setSelectedCalendars(userId, calendarIds);
    res.status(204).send();
  } catch (error) {
    console.error('Error updating calendar selection:', error);
    res.status(500).json({ error: 'Failed to update calendar selection' });
  }
});

// GET /calendar/feed - Get iCal feed for suggestions
router.get('/feed', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }
    
    const feedUrl = await feedService.publishSuggestionFeed(userId as string);
    res.json({ feedUrl });
  } catch (error) {
    console.error('Error generating calendar feed:', error);
    res.status(500).json({ error: 'Failed to generate calendar feed' });
  }
});

// GET /calendar/feed/:userId.ics - Serve iCal feed content
router.get('/feed/:userId.ics', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const icalContent = await feedService.generateICalFeed(userId);
    
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${userId}-suggestions.ics"`);
    res.send(icalContent);
  } catch (error) {
    console.error('Error serving iCal feed:', error);
    res.status(500).json({ error: 'Failed to serve iCal feed' });
  }
});

export default router;
