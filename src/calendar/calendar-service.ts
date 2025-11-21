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
import * as availabilityService from './availability-service';

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
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = google.calendar({ version: 'v3', auth });
  const allEvents: calendar_v3.Schema$Event[] = [];

  for (const calendarId of calendarIds) {
    try {
      const response = await calendar.events.list({
        calendarId,
        timeMin: dateRange.start.toISOString(),
        timeMax: dateRange.end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      if (response.data.items) {
        allEvents.push(...response.data.items);
      }
    } catch (error) {
      console.error(`Error fetching events from calendar ${calendarId}:`, error);
      // Continue with other calendars even if one fails
    }
  }

  return allEvents;
}

/**
 * Convert Google Calendar event to a time slot
 */
function eventToTimeSlot(event: calendar_v3.Schema$Event, timezone: string): TimeSlot | null {
  // Skip all-day events
  if (event.start?.date || event.end?.date) {
    return null;
  }

  const start = event.start?.dateTime;
  const end = event.end?.dateTime;

  if (!start || !end) {
    return null;
  }

  return {
    start: new Date(start),
    end: new Date(end),
    timezone,
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
  const sortedBusySlots = [...busySlots].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

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
 */
export async function getFreeTimeSlots(
  userId: string,
  accessToken: string,
  dateRange: DateRange,
  refreshToken?: string,
  minSlotDuration: number = 30,
  applyAvailabilityFilters: boolean = true
): Promise<TimeSlot[]> {
  // Get selected calendars for the user
  const selectedCalendars = await calendarRepository.getSelectedCalendars(userId);

  if (selectedCalendars.length === 0) {
    throw new Error('No calendars selected for availability detection');
  }

  // Create authenticated client
  const auth = getAuthenticatedClient(accessToken, refreshToken);

  // Fetch events from all selected calendars
  const calendarIds = selectedCalendars.map((cal) => cal.calendarId);
  const events = await fetchEventsFromGoogle(auth, calendarIds, dateRange);

  // Determine timezone (use first selected calendar's timezone or default to UTC)
  // In a real implementation, we might want to use the user's timezone preference
  const timezone = 'UTC'; // TODO: Get from user preferences

  // Convert events to time slots (filter out all-day events)
  const busySlots = events
    .map((event) => eventToTimeSlot(event, timezone))
    .filter((slot): slot is TimeSlot => slot !== null);

  // Identify free time slots between busy slots
  let freeSlots = identifyFreeSlots(busySlots, dateRange, timezone, minSlotDuration);

  // Apply availability parameters if requested
  if (applyAvailabilityFilters) {
    const availabilityParams = await availabilityService.getAvailabilityParams(userId);
    if (availabilityParams) {
      freeSlots = availabilityService.applyAvailabilityParameters(freeSlots, availabilityParams);
    }
  }

  return freeSlots;
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
  // Sync calendars from Google to ensure we have the latest calendar list
  await syncCalendarsFromGoogle(userId, accessToken, refreshToken);

  // Get fresh free time slots
  return getFreeTimeSlots(userId, accessToken, dateRange, refreshToken);
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
