/**
 * Suggestion Regeneration Job Processor
 *
 * Regenerates pending suggestions when calendar data changes to ensure
 * suggestions don't overlap with newly added calendar events.
 */

import { Job } from '../job-types';
import * as suggestionService from '../../matching/suggestion-service';
import * as suggestionRepository from '../../matching/suggestion-repository';
import { SuggestionStatus } from '../../types';

export interface SuggestionRegenerationJobData {
  userId: string;
  reason: 'calendar_sync' | 'manual_refresh';
}

export interface SuggestionRegenerationResult {
  dismissed: number;
  created: number;
}

/**
 * Process suggestion regeneration job
 *
 * This job:
 * 1. Dismisses pending suggestions that now overlap with calendar events
 * 2. Generates new suggestions for available time slots
 */
export async function processSuggestionRegeneration(
  job: Job<SuggestionRegenerationJobData>
): Promise<SuggestionRegenerationResult> {
  const { userId } = job.data;

  try {
    // Get all pending suggestions
    const pendingSuggestions = await suggestionService.getPendingSuggestions(userId);

    // Get calendar events for the next 30 days
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const calendarEvents = await import('../../calendar/calendar-events-repository').then(
      (module) => module.getCachedEvents(userId, now, thirtyDaysFromNow)
    );

    // Convert busy events to time slots
    const busySlots = calendarEvents
      .filter((event) => event.isBusy && !event.isAllDay)
      .map((event) => ({
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        timezone: event.timezone,
      }));

    // Check each pending suggestion for conflicts
    let dismissedCount = 0;
    for (const suggestion of pendingSuggestions) {
      const suggestionSlot = {
        start: new Date(suggestion.proposedTimeslot.start),
        end: new Date(suggestion.proposedTimeslot.end),
        timezone: suggestion.proposedTimeslot.timezone,
      };

      // Check if suggestion overlaps with any busy slot
      const hasConflict = busySlots.some((busySlot) => slotsOverlap(suggestionSlot, busySlot));

      if (hasConflict) {
        // Dismiss the suggestion
        await suggestionRepository.update(suggestion.id, userId, {
          status: SuggestionStatus.DISMISSED,
          dismissalReason: 'Conflicts with calendar event (auto-dismissed after sync)',
        });
        dismissedCount++;
      }
    }

    return {
      dismissed: dismissedCount,
      created: 0,
    };
  } catch (error) {
    console.error('Error regenerating suggestions:', error);
    throw error;
  }
}

/**
 * Check if two time slots overlap
 */
function slotsOverlap(
  slot1: { start: Date; end: Date },
  slot2: { start: Date; end: Date }
): boolean {
  return slot1.start < slot2.end && slot1.end > slot2.start;
}
