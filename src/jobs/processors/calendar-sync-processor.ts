/**
 * Calendar Sync Job Processor
 *
 * Scheduled job that refreshes calendar data from Google Calendar.
 * Runs with adaptive frequency based on change detection.
 *
 * Now integrated with SyncOrchestrator for optimization features:
 * - Token health validation before sync
 * - Circuit breaker pattern to prevent repeated failures
 * - Adaptive scheduling based on change detection
 * - Comprehensive metrics recording
 *
 * Requirements: 7.8, 8.1
 */

import Bull from 'bull';
import { CalendarSyncJobData, CalendarSyncResult } from '../types';
import * as oauthRepository from '../../integrations/oauth-repository';
import * as calendarService from '../../calendar/calendar-service';
import { syncOrchestrator } from '../../integrations/sync-orchestrator';

/**
 * Process calendar sync job
 *
 * Executes sync operation through SyncOrchestrator which handles:
 * - Token health validation
 * - Circuit breaker checks
 * - Adaptive scheduling
 * - Metrics recording
 *
 * Requirements: 1.1, 1.4, 2.2, 5.1, 5.2, 10.5
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

    // Execute sync through orchestrator
    // This adds token health checks, circuit breaker, adaptive scheduling, and metrics
    console.log(`Executing calendar sync through orchestrator for user ${userId}`);
    const orchestratorResult = await syncOrchestrator.executeSyncJob({
      userId,
      integrationType: 'google_calendar',
      syncType: 'incremental', // Calendar syncs are always incremental
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      bypassCircuitBreaker: false, // Respect circuit breaker for scheduled syncs
    });

    // Check if sync was skipped
    if (orchestratorResult.result === 'skipped') {
      console.log(
        `Sync skipped for user ${userId}: ${orchestratorResult.skipReason || 'unknown reason'}`
      );
      result.errors.push(
        `Sync skipped: ${orchestratorResult.skipReason || 'unknown reason'}`
      );
      return result;
    }

    // Check if sync failed
    if (!orchestratorResult.success) {
      const errorMessage = orchestratorResult.errorMessage || 'Sync failed';
      console.error(`Sync failed for user ${userId}: ${errorMessage}`);
      result.errors.push(errorMessage);
      throw new Error(errorMessage);
    }

    // Sync calendar list from Google (to update calendar metadata)
    await calendarService.syncCalendarsFromGoogle(userId, token.accessToken, token.refreshToken);

    // Get calendar count
    const calendars = await calendarService.listUserCalendars(userId);
    result.calendarsRefreshed = calendars.length;

    // Get events processed from orchestrator
    result.eventsProcessed = orchestratorResult.itemsProcessed || 0;

    console.log(
      `Calendar sync complete for user ${userId} - ` +
        `refreshed ${result.calendarsRefreshed} calendars, ` +
        `${result.eventsProcessed} events processed, ` +
        `API calls saved: ${orchestratorResult.apiCallsSaved || 0}`
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
