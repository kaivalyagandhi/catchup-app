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
 * Query params: startTime, endTime (ISO 8601 format), includeSyncStatus (optional)
 */
router.get('/events', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { startTime, endTime, includeSyncStatus } = req.query;

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

    // Include sync status if requested (for graceful degradation)
    if (includeSyncStatus === 'true') {
      const { GracefulDegradationService } = await import('../../integrations/graceful-degradation-service');
      const { CircuitBreakerManager } = await import('../../integrations/circuit-breaker-manager');
      const { TokenHealthMonitor } = await import('../../integrations/token-health-monitor');
      
      const circuitBreakerManager = CircuitBreakerManager.getInstance();
      const tokenHealthMonitor = TokenHealthMonitor.getInstance();
      const gracefulDegradationService = new GracefulDegradationService(
        circuitBreakerManager,
        tokenHealthMonitor
      );

      const cachedData = await gracefulDegradationService.getCachedCalendarEvents(
        req.userId,
        start,
        end
      );

      res.json({
        events: cachedData.data,
        syncStatus: {
          available: !cachedData.syncUnavailable,
          cached: cachedData.cached,
          lastUpdated: cachedData.lastUpdated,
          unavailableReason: cachedData.unavailableReason,
        },
      });
      return;
    }

    const events = await getCalendarEvents(
      {
        access_token: token.accessToken,
        refresh_token: token.refreshToken || undefined,
        token_type: token.tokenType || 'Bearer',
        expiry_date: token.expiresAt?.getTime(),
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
        refresh_token: token.refreshToken || undefined,
        token_type: token.tokenType || 'Bearer',
        expiry_date: token.expiresAt?.getTime(),
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

/**
 * POST /api/calendar/refresh
 * Force refresh calendar events from Google Calendar
 * Also regenerates suggestions to avoid conflicts
 */
router.post('/refresh', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Get OAuth token
    const token = await getToken(req.userId, 'google_calendar');

    if (!token) {
      res.status(403).json({ error: 'Google Calendar not connected' });
      return;
    }

    // Import the force refresh function
    const { forceRefreshCalendarEvents } = await import('../../calendar/calendar-service');

    const result = await forceRefreshCalendarEvents(
      req.userId,
      token.accessToken,
      token.refreshToken || undefined
    );

    // Regenerate suggestions synchronously to ensure conflicts are resolved immediately
    let regenerationResult = { dismissed: 0, created: 0 };
    try {
      const { processSuggestionRegeneration } = await import(
        '../../jobs/processors/suggestion-regeneration'
      );

      // Create a mock job object for synchronous execution
      const mockJob = {
        data: {
          userId: req.userId,
          reason: 'calendar_sync' as const,
        },
      } as any;

      regenerationResult = await processSuggestionRegeneration(mockJob);
    } catch (regenError) {
      console.error('Failed to regenerate suggestions:', regenError);
      // Don't fail the request if regeneration fails
    }

    res.json({
      ...result,
      suggestionsRegenerated: true,
      regenerationResult,
    });
  } catch (error) {
    console.error('Error refreshing calendar:', error);
    res.status(500).json({ error: 'Failed to refresh calendar events' });
  }
});

/**
 * GET /api/calendar/sync-status
 * Get last calendar sync time
 */
router.get('/sync-status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { getLastCalendarSync } = await import('../../calendar/calendar-service');
    const lastSync = await getLastCalendarSync(req.userId);

    res.json({ lastSync });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

/**
 * GET /api/calendar/events/count
 * Get total count of synced calendar events
 */
router.get('/events/count', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const pool = (await import('../../db/connection')).default;
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM calendar_events WHERE user_id = $1',
      [req.userId]
    );

    const count = parseInt(result.rows[0]?.count || '0', 10);

    res.json({ count });
  } catch (error) {
    console.error('Error getting calendar events count:', error);
    res.status(500).json({ error: 'Failed to get calendar events count' });
  }
});

/**
 * GET /api/calendar/free-slots
 * Get free time slots for scheduling (used by initiator availability)
 * Query params: startDate, endDate (YYYY-MM-DD format)
 * Requirements: 5.2, 5.3 - Auto-populate availability from Google Calendar
 */
router.get('/free-slots', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    // Get OAuth token
    const token = await getToken(req.userId, 'google_calendar');

    if (!token) {
      res.status(403).json({ error: 'Google Calendar not connected', connected: false });
      return;
    }

    // Parse dates and set time boundaries (8 AM to 9 PM)
    const start = new Date(startDate as string);
    start.setHours(8, 0, 0, 0);
    
    const end = new Date(endDate as string);
    end.setHours(21, 0, 0, 0);

    // Get available slots in 30-minute increments
    const slots = await getAvailableSlots(
      {
        access_token: token.accessToken,
        refresh_token: token.refreshToken || undefined,
        token_type: token.tokenType || 'Bearer',
        expiry_date: token.expiresAt?.getTime(),
      },
      start,
      end,
      30 // 30-minute slots
    );

    // Filter slots to only include working hours (8 AM - 9 PM)
    const filteredSlots = slots.filter(slot => {
      const slotHour = slot.start.getHours();
      return slotHour >= 8 && slotHour < 21;
    });

    res.json({ 
      slots: filteredSlots,
      connected: true 
    });
  } catch (error) {
    console.error('Error fetching free slots:', error);
    res.status(500).json({ error: 'Failed to fetch free slots' });
  }
});

/**
 * GET /api/calendar/sync-health
 * Get comprehensive sync health status for calendar
 * Requirements: 9.1, 9.6 - Graceful degradation
 */
router.get('/sync-health', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { GracefulDegradationService } = await import('../../integrations/graceful-degradation-service');
    const { CircuitBreakerManager } = await import('../../integrations/circuit-breaker-manager');
    const { TokenHealthMonitor } = await import('../../integrations/token-health-monitor');
    
    const circuitBreakerManager = CircuitBreakerManager.getInstance();
    const tokenHealthMonitor = TokenHealthMonitor.getInstance();
    const gracefulDegradationService = new GracefulDegradationService(
      circuitBreakerManager,
      tokenHealthMonitor
    );

    const syncStatus = await gracefulDegradationService.getSyncStatus(
      req.userId,
      'google_calendar'
    );

    res.json(syncStatus);
  } catch (error) {
    console.error('Error getting calendar sync health:', error);
    res.status(500).json({ error: 'Failed to get calendar sync health' });
  }
});

export default router;
