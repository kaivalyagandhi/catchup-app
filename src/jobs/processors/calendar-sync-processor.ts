/**
 * Calendar Sync Job Processor
 *
 * Scheduled job that refreshes calendar data from Google Calendar.
 * Runs every 30 minutes per user to keep availability predictions up to date.
 *
 * Requirements: 7.8, 8.1
 */

import Bull from 'bull';
import { CalendarSyncJobData, CalendarSyncResult } from '../types';
import * as oauthRepository from '../../integrations/oauth-repository';
import * as calendarService from '../../calendar/calendar-service';
import { DateRange } from '../../types';

const SYNC_WINDOW_DAYS = 30; // Sync calendar data for next 30 days

/**
 * Process calendar sync job
 *
 * Refreshes calendar data by:
 * 1. Getting user's OAuth token
 * 2. Syncing calendar list from Google
 * 3. Fetching events from selected calendars
 * 4. Updating availability predictions
 */
export async function processCalendarSync(
  job: Bull.Job<CalendarSyncJobData>
): Promise<CalendarSyncResult> {
  const { userId } = job.data;

  console.log(`Processing calendar sync for user ${userId}`);

  const result: CalendarSyncResult = {
    userId,
    calendarsRefreshed: 0,
    eventsProcessed: 0,
    errors: [],
  };

  try {
    // Get user's OAuth token
    const token = await oauthRepository.getToken(userId, 'google_calendar');
    if (!token) {
      const errorMessage = `No OAuth token found for user ${userId}`;
      console.error(errorMessage);
      result.errors.push(errorMessage);
      return result;
    }

    // Define date range for sync (next 30 days)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + SYNC_WINDOW_DAYS);

    const dateRange: DateRange = {
      start: now,
      end: endDate,
    };

    // Sync calendars from Google first
    await calendarService.syncCalendarsFromGoogle(
      userId,
      token.accessToken,
      token.refreshToken
    );

    // Refresh calendar data (fetch events and calculate free slots)
    const availableSlots = await calendarService.getFreeTimeSlots(
      userId,
      token.accessToken,
      dateRange,
      token.refreshToken
    );

    // Get calendar count
    const calendars = await calendarService.listUserCalendars(userId);
    result.calendarsRefreshed = calendars.length;

    // Estimate events processed (rough calculation based on available slots)
    // This is an approximation since we don't have direct access to event count
    result.eventsProcessed = Math.max(
      0,
      Math.floor((SYNC_WINDOW_DAYS * 24 - availableSlots.length) / 2)
    );

    console.log(
      `Calendar sync complete for user ${userId} - refreshed ${result.calendarsRefreshed} calendars, ~${result.eventsProcessed} events processed, ${availableSlots.length} free slots identified`
    );

    return result;
  } catch (error) {
    const errorMessage = `Error syncing calendar for user ${userId}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(errorMessage);
    result.errors.push(errorMessage);
    throw error;
  }
}
