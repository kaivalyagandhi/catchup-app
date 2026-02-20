/**
 * Calendar Service
 *
 * Handles Google Calendar integration including OAuth, calendar listing,
 * calendar selection management, and free time slot detection.
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GoogleCalendar, TimeSlot, DateRange, AvailabilityParams } from '../types';
import * as calendarRepository from './calendar-repository';
import * as calendarEventsRepository from './calendar-events-repository';
import * as availabilityService from './availability-service';
import * as oauthRepository from '../integrations/oauth-repository';
import { getOrSetCache, CacheKeys, CacheTTL, invalidateCalendarCache } from '../utils/cache';
import { logAuditEvent, AuditAction } from '../utils/audit-logger';
import { userPreferencesService } from '../users/preferences-service';
import { MemoryCircuitBreaker, MemoryCircuitBreakerError } from '../utils/memory-circuit-breaker';
import { MemoryMonitor } from '../utils/memory-monitor';

// Initialize memory management utilities
const memoryBreaker = new MemoryCircuitBreaker({ maxHeapPercent: 80 });
const memoryMonitor = new MemoryMonitor();

/**
 * Connect Google Calendar by exchanging auth code for tokens
 *
 * Requirements: 7.1
 */
export async function connectGoogleCalendar(
  userId: string,
  authCode: string
): Promise<{ success: boolean; calendars: GoogleCalendar[] }> {
  const oauth2Client = createOAuth2Client();

  try {
    // Exchange auth code for tokens
    const { tokens } = await oauth2Client.getToken(authCode);

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Store tokens in database
    await oauthRepository.upsertToken(
      userId,
      'google_calendar',
      tokens.access_token,
      tokens.refresh_token || undefined,
      tokens.token_type || undefined,
      tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      tokens.scope || undefined
    );

    // Sync calendars from Google
    const calendars = await syncCalendarsFromGoogle(
      userId,
      tokens.access_token,
      tokens.refresh_token || undefined
    );

    // Log OAuth consent granted
    await logAuditEvent(AuditAction.OAUTH_CONSENT_GRANTED, {
      userId,
      metadata: { provider: 'google_calendar', scope: tokens.scope },
      success: true,
    });

    return { success: true, calendars };
  } catch (error) {
    console.error('Error connecting Google Calendar:', error);

    // Log failed OAuth attempt
    await logAuditEvent(AuditAction.OAUTH_CONSENT_GRANTED, {
      userId,
      metadata: { provider: 'google_calendar' },
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error('Failed to connect Google Calendar');
  }
}

/**
 * Create OAuth2 client
 */
function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Get OAuth2 client with credentials
 */
function getAuthenticatedClient(accessToken: string, refreshToken?: string): OAuth2Client {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * List all calendars from Google Calendar API
 */
export async function listUserCalendarsFromGoogle(
  accessToken: string,
  refreshToken?: string
): Promise<calendar_v3.Schema$CalendarListEntry[]> {
  const auth = getAuthenticatedClient(accessToken, refreshToken);
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const response = await calendar.calendarList.list();
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendars from Google:', error);
    throw new Error('Failed to fetch calendars from Google Calendar API');
  }
}

/**
 * Sync calendars from Google to local database
 */
export async function syncCalendarsFromGoogle(
  userId: string,
  accessToken: string,
  refreshToken?: string
): Promise<GoogleCalendar[]> {
  // Fetch calendars from Google
  const googleCalendars = await listUserCalendarsFromGoogle(accessToken, refreshToken);

  // Upsert each calendar to the database
  const syncedCalendars: GoogleCalendar[] = [];

  for (const gcal of googleCalendars) {
    if (!gcal.id) continue;

    const calendar = await calendarRepository.upsertCalendar(
      userId,
      gcal.id,
      gcal.summary || 'Unnamed Calendar',
      gcal.description || null,
      gcal.primary || false
    );

    syncedCalendars.push(calendar);
  }

  return syncedCalendars;
}

/**
 * List all user calendars from database
 */
export async function listUserCalendars(userId: string): Promise<GoogleCalendar[]> {
  return calendarRepository.getUserCalendars(userId);
}

/**
 * Get selected calendars for a user
 */
export async function getSelectedCalendars(userId: string): Promise<GoogleCalendar[]> {
  return calendarRepository.getSelectedCalendars(userId);
}

/**
 * Set selected calendars for a user
 */
export async function setSelectedCalendars(
  userId: string,
  calendarIds: string[]
): Promise<GoogleCalendar[]> {
  // Validate that all calendar IDs belong to the user
  const userCalendars = await calendarRepository.getUserCalendars(userId);
  const validCalendarIds = new Set(userCalendars.map((c) => c.calendarId));

  const invalidIds = calendarIds.filter((id) => !validCalendarIds.has(id));
  if (invalidIds.length > 0) {
    throw new Error(`Invalid calendar IDs: ${invalidIds.join(', ')}`);
  }

  return calendarRepository.setSelectedCalendars(userId, calendarIds);
}

/**
 * Update single calendar selection status
 */
export async function updateCalendarSelection(
  userId: string,
  calendarId: string,
  selected: boolean
): Promise<GoogleCalendar | null> {
  return calendarRepository.updateCalendarSelection(userId, calendarId, selected);
}

/**
 * Fetch events from Google Calendar for selected calendars
 */
async function fetchEventsFromGoogle(
  auth: OAuth2Client,
  calendarIds: string[],
  dateRange: DateRange
): Promise<Array<{ event: calendar_v3.Schema$Event; calendarId: string }>> {
  const calendar = google.calendar({ version: 'v3', auth });
  const allEvents: Array<{ event: calendar_v3.Schema$Event; calendarId: string }> = [];

  for (const calendarId of calendarIds) {
    try {
      let pageToken: string | undefined;
      let eventsProcessed = 0;

      do {
        const response = await calendar.events.list({
          calendarId,
          timeMin: dateRange.start.toISOString(),
          timeMax: dateRange.end.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250, // Fetch in smaller pages for memory efficiency
          pageToken,
        });

        if (response.data.items && response.data.items.length > 0) {
          allEvents.push(...response.data.items.map((event) => ({ event, calendarId })));
          eventsProcessed += response.data.items.length;
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      console.log(
        `Fetched ${eventsProcessed} events from calendar ${calendarId} (${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]})`
      );
    } catch (error) {
      console.error(`Error fetching events from calendar ${calendarId}:`, error);
      // Continue with other calendars even if one fails
    }
  }

  return allEvents;
}

/**
 * Sync calendar events from Google to database cache
 * 
 * Memory-optimized with circuit breaker checks and monitoring.
 */
async function syncEventsToCache(
  userId: string,
  auth: OAuth2Client,
  calendarIds: string[],
  dateRange: DateRange
): Promise<void> {
  const BATCH_SIZE = 100; // Process events in batches of 100

  // Log memory before operation
  const memoryBefore = process.memoryUsage();

  try {
    // Check memory before starting
    await memoryBreaker.checkMemory();

    // Fetch events from Google (already batched internally)
    const googleEvents = await fetchEventsFromGoogle(auth, calendarIds, dateRange);

    console.log(`Processing ${googleEvents.length} events in batches of ${BATCH_SIZE}`);

    // Process events in batches to prevent memory issues
    for (let i = 0; i < googleEvents.length; i += BATCH_SIZE) {
      // Check memory before each batch
      await memoryBreaker.checkMemory();

      const batch = googleEvents.slice(i, i + BATCH_SIZE);

    // Convert batch to our format
    const eventsToCache = batch
      .map(({ event, calendarId }) => {
        if (!event.id) return null;

        // Skip all-day events or events without proper time data
        const startTime = event.start?.dateTime;
        const endTime = event.end?.dateTime;
        const isAllDay = !!(event.start?.date || event.end?.date);

        return {
          googleEventId: event.id,
          calendarId,
          summary: event.summary || null,
          description: event.description || null,
          startTime: startTime ? new Date(startTime) : new Date(event.start?.date || ''),
          endTime: endTime ? new Date(endTime) : new Date(event.end?.date || ''),
          timezone: event.start?.timeZone || 'UTC',
          isAllDay,
          isBusy: event.transparency !== 'transparent',
          location: event.location || null,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    // Store batch in database
    if (eventsToCache.length > 0) {
      await calendarEventsRepository.upsertEvents(userId, eventsToCache);
      console.log(`Synced batch ${Math.floor(i / BATCH_SIZE) + 1}: ${eventsToCache.length} events`);
    }

    // Allow garbage collection between batches
    if (global.gc) {
      global.gc();
    }

    // Yield to event loop
    await new Promise((resolve) => setImmediate(resolve));
  }

  // Update last sync time
  await calendarEventsRepository.updateLastSyncTime(userId);

  // Clean up old events
  await calendarEventsRepository.deleteOldEvents(userId);

  // Log memory after operation
  const memoryAfter = process.memoryUsage();
  memoryMonitor.logMemoryUsage('calendar-sync', memoryBefore, memoryAfter);

  console.log(`Completed syncing ${googleEvents.length} calendar events for user ${userId}`);
  } catch (error) {
    if (error instanceof MemoryCircuitBreakerError) {
      console.error('Memory circuit breaker triggered during calendar sync');
      throw error;
    }
    throw error;
  }
}

/**
 * Convert cached calendar event to a time slot
 */
function cachedEventToTimeSlot(event: any): TimeSlot | null {
  // Skip all-day events
  if (event.isAllDay) {
    return null;
  }

  // Only include busy events
  if (!event.isBusy) {
    return null;
  }

  return {
    start: new Date(event.startTime),
    end: new Date(event.endTime),
    timezone: event.timezone,
  };
}

/**
 * Identify free time slots between events
 */
function identifyFreeSlots(
  busySlots: TimeSlot[],
  dateRange: DateRange,
  timezone: string,
  minSlotDuration: number = 30 // minimum duration in minutes
): TimeSlot[] {
  const freeSlots: TimeSlot[] = [];

  // Sort busy slots by start time
  const sortedBusySlots = [...busySlots].sort((a, b) => a.start.getTime() - b.start.getTime());

  let currentTime = dateRange.start;

  for (const busySlot of sortedBusySlots) {
    // Skip events that start after the date range ends
    if (busySlot.start >= dateRange.end) {
      continue;
    }

    // If there's a gap between current time and the next busy slot
    if (currentTime < busySlot.start) {
      // Cap the gap end at the date range end
      const gapEnd = busySlot.start < dateRange.end ? busySlot.start : dateRange.end;
      const gapDuration = (gapEnd.getTime() - currentTime.getTime()) / (1000 * 60);

      // Only add if the gap is at least the minimum duration
      if (gapDuration >= minSlotDuration) {
        freeSlots.push({
          start: new Date(currentTime),
          end: new Date(gapEnd),
          timezone,
        });
      }
    }

    // Move current time to the end of this busy slot
    // Handle overlapping events by taking the maximum end time
    if (busySlot.end > currentTime) {
      currentTime = busySlot.end;
    }
  }

  // Check if there's free time after the last event
  if (currentTime < dateRange.end) {
    const gapDuration = (dateRange.end.getTime() - currentTime.getTime()) / (1000 * 60);

    if (gapDuration >= minSlotDuration) {
      freeSlots.push({
        start: new Date(currentTime),
        end: new Date(dateRange.end),
        timezone,
      });
    }
  }

  return freeSlots;
}

/**
 * Get free time slots for a user based on their selected calendars
 *
 * Requirements: 7.5, 7.7, 7.8, 20.4
 * - Scans selected calendars for existing events
 * - Identifies gaps between events as free time slots
 * - Applies availability parameters to filter slots
 * - Supports calendar refresh on data changes
 * - Uses daily cached events to reduce API calls
 */
export async function getFreeTimeSlots(
  userId: string,
  accessToken: string,
  dateRange: DateRange,
  refreshToken?: string,
  minSlotDuration: number = 30,
  applyAvailabilityFilters: boolean = true,
  forceRefresh: boolean = false
): Promise<TimeSlot[]> {
  // Create cache key based on date range
  const dateKey = `${dateRange.start.toISOString().split('T')[0]}_${dateRange.end.toISOString().split('T')[0]}`;
  const cacheKey = CacheKeys.CALENDAR_FREE_SLOTS(userId, dateKey);

  // Try to get from cache first
  return await getOrSetCache(
    cacheKey,
    async () => {
      // Get selected calendars for the user
      const selectedCalendars = await calendarRepository.getSelectedCalendars(userId);

      if (selectedCalendars.length === 0) {
        throw new Error('No calendars selected for availability detection');
      }

      const calendarIds = selectedCalendars.map((cal) => cal.calendarId);

      // Check if we need to refresh from Google (once per day or force refresh)
      const needsSync = forceRefresh || (await calendarEventsRepository.needsRefresh(userId));

      if (needsSync) {
        console.log(
          `Syncing calendar events from Google for user ${userId} (force: ${forceRefresh})`
        );
        const auth = getAuthenticatedClient(accessToken, refreshToken);

        // Sync a wider range (30 days) to cache more events
        const syncRange: DateRange = {
          start: new Date(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };

        await syncEventsToCache(userId, auth, calendarIds, syncRange);
      }

      // Get cached events for the requested date range
      const cachedEvents = await calendarEventsRepository.getCachedEvents(
        userId,
        dateRange.start,
        dateRange.end
      );

      // Get user's timezone preference
      const timezone = await userPreferencesService.getTimezone(userId);

      // Convert cached events to time slots (filter out all-day events and non-busy)
      const busySlots = cachedEvents
        .map((event) => cachedEventToTimeSlot(event))
        .filter((slot): slot is TimeSlot => slot !== null);

      // Identify free time slots between busy slots
      let freeSlots = identifyFreeSlots(busySlots, dateRange, timezone, minSlotDuration);

      // Apply availability parameters if requested
      if (applyAvailabilityFilters) {
        const availabilityParams = await availabilityService.getAvailabilityParams(userId);
        if (availabilityParams) {
          freeSlots = availabilityService.applyAvailabilityParameters(
            freeSlots,
            availabilityParams
          );
        }
      }

      return freeSlots;
    },
    CacheTTL.CALENDAR_FREE_SLOTS
  );
}

/**
 * Refresh calendar data and recalculate free time slots
 *
 * This function can be called when calendar data changes to ensure
 * availability predictions are up to date.
 *
 * Requirements: 7.8
 */
export async function refreshCalendarData(
  userId: string,
  accessToken: string,
  dateRange: DateRange,
  refreshToken?: string
): Promise<TimeSlot[]> {
  // Invalidate calendar cache
  await invalidateCalendarCache(userId);

  // Sync calendars from Google to ensure we have the latest calendar list
  await syncCalendarsFromGoogle(userId, accessToken, refreshToken);

  // Get fresh free time slots with force refresh
  return getFreeTimeSlots(userId, accessToken, dateRange, refreshToken, 30, true, true);
}

/**
 * Force refresh calendar events from Google
 *
 * Bypasses the daily cache and fetches fresh events from Google Calendar API.
 * Useful when user knows their calendar has changed and wants immediate update.
 */
export async function forceRefreshCalendarEvents(
  userId: string,
  accessToken: string,
  refreshToken?: string
): Promise<{ success: boolean; eventCount: number; lastSync: Date; message?: string }> {
  try {
    // Invalidate all calendar caches
    await invalidateCalendarCache(userId);

    // First, sync calendar list from Google
    await syncCalendarsFromGoogle(userId, accessToken, refreshToken);

    // Get selected calendars
    let selectedCalendars = await calendarRepository.getSelectedCalendars(userId);

    // If no calendars selected, auto-select the primary calendar
    if (selectedCalendars.length === 0) {
      const allCalendars = await calendarRepository.getUserCalendars(userId);

      if (allCalendars.length === 0) {
        throw new Error('No calendars found. Please reconnect your Google Calendar.');
      }

      // Auto-select primary calendar or first calendar
      const primaryCalendar = allCalendars.find((cal) => cal.isPrimary) || allCalendars[0];
      await calendarRepository.updateCalendarSelection(userId, primaryCalendar.calendarId, true);
      selectedCalendars = [primaryCalendar];

      console.log(`Auto-selected calendar: ${primaryCalendar.name}`);
    }

    const calendarIds = selectedCalendars.map((cal) => cal.calendarId);
    const auth = getAuthenticatedClient(accessToken, refreshToken);

    // Smart sync range: 2 weeks past + current week + 2 months future
    // This captures recent context and upcoming availability
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twoMonthsFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const syncRange: DateRange = {
      start: twoWeeksAgo,
      end: twoMonthsFromNow,
    };

    console.log(
      `Syncing calendar events from ${syncRange.start.toISOString()} to ${syncRange.end.toISOString()}`
    );

    await syncEventsToCache(userId, auth, calendarIds, syncRange);

    // Get event count
    const events = await calendarEventsRepository.getCachedEvents(
      userId,
      syncRange.start,
      syncRange.end
    );

    const lastSync = await calendarEventsRepository.getLastSyncTime(userId);

    return {
      success: true,
      eventCount: events.length,
      lastSync: lastSync || new Date(),
      message: `Synced ${events.length} events from ${selectedCalendars.length} calendar(s)`,
    };
  } catch (error) {
    console.error('Error force refreshing calendar events:', error);
    throw error;
  }
}

/**
 * Get last calendar sync time for a user
 */
export async function getLastCalendarSync(userId: string): Promise<Date | null> {
  return calendarEventsRepository.getLastSyncTime(userId);
}

/**
 * Get availability parameters for a user
 *
 * Requirements: 7.6, 20.1, 20.2, 20.3
 */
export async function getAvailabilityParams(userId: string): Promise<AvailabilityParams | null> {
  return availabilityService.getAvailabilityParams(userId);
}

/**
 * Set availability parameters for a user
 *
 * Requirements: 7.6, 20.1, 20.2, 20.3
 */
export async function setAvailabilityParams(
  userId: string,
  params: AvailabilityParams
): Promise<AvailabilityParams> {
  return availabilityService.setAvailabilityParams(userId, params);
}

/**
 * Apply availability parameters to filter time slots
 *
 * Requirements: 7.7, 20.4
 */
export function applyAvailabilityParameters(
  slots: TimeSlot[],
  params: AvailabilityParams
): TimeSlot[] {
  return availabilityService.applyAvailabilityParameters(slots, params);
}

/**
 * Publish suggestion feed for a user
 *
 * Generates signed URLs for both iCal and Google Calendar subscription.
 * URLs expire after 30 days by default.
 *
 * Requirements: 8.1, 8.2
 */
export { publishSuggestionFeed, CalendarFeedUrl } from './feed-service';

/**
 * Generate iCal feed content for a user's suggestions
 *
 * Requirements: 8.1, 8.4
 */
export { generateFeedContent } from './feed-service';

/**
 * Update feed event when suggestion status changes
 *
 * Requirements: 8.3
 */
export { updateFeedEvent } from './feed-service';

/**
 * Verify a signed feed token
 */
export { verifySignedToken } from './feed-service';
