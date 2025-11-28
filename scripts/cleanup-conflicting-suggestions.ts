/**
 * One-time script to clean up existing suggestions that conflict with calendar events
 * 
 * Run with: npx ts-node scripts/cleanup-conflicting-suggestions.ts
 */

import pool from '../src/db/connection';
import * as suggestionService from '../src/matching/suggestion-service';
import * as calendarEventsRepository from '../src/calendar/calendar-events-repository';
import { SuggestionStatus } from '../src/types';

async function cleanupConflictingSuggestions() {
  console.log('Starting cleanup of conflicting suggestions...\n');

  try {
    // Get all users with pending suggestions
    const usersResult = await pool.query(`
      SELECT DISTINCT user_id 
      FROM suggestions 
      WHERE status = 'pending'
    `);

    console.log(`Found ${usersResult.rows.length} users with pending suggestions\n`);

    let totalDismissed = 0;

    for (const { user_id: userId } of usersResult.rows) {
      console.log(`Processing user: ${userId}`);

      // Get pending suggestions for this user
      const pendingSuggestions = await suggestionService.getPendingSuggestions(userId);
      console.log(`  - Found ${pendingSuggestions.length} pending suggestions`);

      // Get calendar events for the next 30 days
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const calendarEvents = await calendarEventsRepository.getCachedEvents(
        userId,
        now,
        thirtyDaysFromNow
      );

      // Convert busy events to time slots
      const busySlots = calendarEvents
        .filter((event) => event.isBusy && !event.isAllDay)
        .map((event) => ({
          start: new Date(event.startTime),
          end: new Date(event.endTime),
          timezone: event.timezone,
        }));

      console.log(`  - Found ${busySlots.length} busy calendar slots`);

      // Check each suggestion for conflicts
      let userDismissed = 0;
      for (const suggestion of pendingSuggestions) {
        const suggestionSlot = {
          start: new Date(suggestion.proposedTimeslot.start),
          end: new Date(suggestion.proposedTimeslot.end),
          timezone: suggestion.proposedTimeslot.timezone,
        };

        // Check if suggestion overlaps with any busy slot
        const hasConflict = busySlots.some((busySlot) =>
          slotsOverlap(suggestionSlot, busySlot)
        );

        if (hasConflict) {
          // Dismiss the suggestion
          await pool.query(
            `UPDATE suggestions 
             SET status = $1, dismissal_reason = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [
              SuggestionStatus.DISMISSED,
              'Conflicts with calendar event (auto-dismissed during cleanup)',
              suggestion.id,
            ]
          );
          userDismissed++;
          console.log(`    ✓ Dismissed suggestion ${suggestion.id} (conflicts with calendar)`);
        }
      }

      console.log(`  - Dismissed ${userDismissed} conflicting suggestions\n`);
      totalDismissed += userDismissed;
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`Total suggestions dismissed: ${totalDismissed}`);
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await pool.end();
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

// Run the cleanup
cleanupConflictingSuggestions()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });
