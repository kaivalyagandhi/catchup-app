/**
 * Suggestion Generation Job Processor
 *
 * Scheduled job that generates suggestions for all users in batches.
 * Runs every 6 hours to identify connection opportunities.
 *
 * Requirements: 9.1-11.4
 */

import Bull from 'bull';
import {
  SuggestionGenerationJobData,
  SuggestionGenerationResult,
} from '../types';
import * as oauthRepository from '../../integrations/oauth-repository';
import * as calendarService from '../../calendar/calendar-service';
import * as suggestionService from '../../matching/suggestion-service';
import { DateRange } from '../../types';

const DEFAULT_BATCH_SIZE = 50; // Process 50 users at a time
const SUGGESTION_WINDOW_DAYS = 14; // Generate suggestions for next 2 weeks

/**
 * Process suggestion generation job
 *
 * Generates suggestions for all users by:
 * 1. Getting users with Google Calendar connected
 * 2. Fetching their available time slots
 * 3. Generating timebound suggestions based on frequency preferences
 * 4. Caching suggestions until status changes
 */
export async function processSuggestionGeneration(
  job: Bull.Job<SuggestionGenerationJobData>
): Promise<SuggestionGenerationResult> {
  const { batchSize = DEFAULT_BATCH_SIZE, offset = 0 } = job.data;

  console.log(
    `Processing suggestion generation job - batch size: ${batchSize}, offset: ${offset}`
  );

  const result: SuggestionGenerationResult = {
    usersProcessed: 0,
    suggestionsGenerated: 0,
    errors: [],
  };

  try {
    // Get all users with Google Calendar OAuth tokens
    const allUserIds = await oauthRepository.getUsersWithProvider(
      'google_calendar'
    );

    // Apply pagination
    const userIds = allUserIds.slice(offset, offset + batchSize);

    console.log(
      `Found ${allUserIds.length} total users, processing ${userIds.length} in this batch`
    );

    // Define date range for suggestions (next 2 weeks)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + SUGGESTION_WINDOW_DAYS);

    const dateRange: DateRange = {
      start: now,
      end: endDate,
    };

    // Process each user
    for (const userId of userIds) {
      try {
        // Get user's OAuth token
        const token = await oauthRepository.getToken(userId, 'google_calendar');
        if (!token) {
          result.errors.push(
            `No OAuth token found for user ${userId}`
          );
          continue;
        }

        // Get available time slots
        const availableSlots = await calendarService.getFreeTimeSlots(
          userId,
          token.accessToken,
          dateRange,
          token.refreshToken
        );

        console.log(
          `Found ${availableSlots.length} available slots for user ${userId}`
        );

        // Generate timebound suggestions
        const suggestions =
          await suggestionService.generateTimeboundSuggestions(
            userId,
            availableSlots
          );

        result.usersProcessed++;
        result.suggestionsGenerated += suggestions.length;

        console.log(
          `Generated ${suggestions.length} suggestions for user ${userId}`
        );
      } catch (error) {
        const errorMessage = `Error processing user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        console.error(errorMessage);
        result.errors.push(errorMessage);
      }
    }

    console.log(
      `Suggestion generation complete - processed ${result.usersProcessed} users, generated ${result.suggestionsGenerated} suggestions`
    );

    // If there are more users to process, schedule the next batch
    if (offset + batchSize < allUserIds.length) {
      console.log(
        `Scheduling next batch - offset: ${offset + batchSize}`
      );
      // Note: The scheduler will handle this automatically
    }

    return result;
  } catch (error) {
    const errorMessage = `Fatal error in suggestion generation: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(errorMessage);
    result.errors.push(errorMessage);
    throw error;
  }
}
