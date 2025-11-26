/**
 * Google Calendar Service
 * Handles calendar event retrieval and availability detection
 */

import { google } from 'googleapis';
import { getCalendarClient, getOAuth2Client } from './google-calendar-config';
import type { Credentials } from 'google-auth-library';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  busy: boolean;
}

/**
 * Get user's calendar events for a date range
 */
export async function getCalendarEvents(
  tokens: Credentials,
  startTime: Date,
  endTime: Date
): Promise<CalendarEvent[]> {
  try {
    const calendar = getCalendarClient(tokens);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false
    });

    const events = response.data.items || [];

    return events.map((event: any) => ({
      id: event.id,
      summary: event.summary || 'No title',
      start: new Date(event.start.dateTime || event.start.date),
      end: new Date(event.end.dateTime || event.end.date),
      busy: event.transparency !== 'transparent'
    }));
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

/**
 * Get user profile info from Google
 */
export async function getUserProfile(tokens: Credentials) {
  try {
    const oauth2Client = getOAuth2Client(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

    const response = await oauth2.userinfo.get();
    console.log('Google userinfo response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Detect available time slots in a date range
 */
export async function getAvailableSlots(
  tokens: any,
  startTime: Date,
  endTime: Date,
  slotDurationMinutes: number = 30
): Promise<Array<{ start: Date; end: Date }>> {
  try {
    const events = await getCalendarEvents(tokens, startTime, endTime);

    const slots: Array<{ start: Date; end: Date }> = [];
    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + slotDurationMinutes * 60000);

      // Check if slot overlaps with any event
      const isAvailable = !events.some(
        event =>
          (currentTime >= event.start && currentTime < event.end) ||
          (slotEnd > event.start && slotEnd <= event.end) ||
          (currentTime <= event.start && slotEnd >= event.end)
      );

      if (isAvailable) {
        slots.push({ start: new Date(currentTime), end: new Date(slotEnd) });
      }

      currentTime = slotEnd;
    }

    return slots;
  } catch (error) {
    console.error('Error detecting available slots:', error);
    throw error;
  }
}
