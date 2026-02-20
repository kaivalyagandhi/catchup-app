/**
 * Suggestion Generation Job Processor
 *
 * Scheduled job that generates suggestions for all users in batches.
 * Runs every 6 hours to identify connection opportunities.
 *
 * Memory-optimized with streaming contact processing.
 *
 * Requirements: 9.1-11.4
 * Memory Optimization: Phase 2, Task 2.2
 */

import { Job } from '../job-types';
import { SuggestionGenerationJobData, SuggestionGenerationResult } from '../types';
import * as oauthRepository from '../../integrations/oauth-repository';
import * as calendarService from '../../calendar/calendar-service';
import * as suggestionService from '../../matching/suggestion-service';
import { DateRange, FrequencyOption, TriggerType, TimeSlot } from '../../types';
import { MemoryCircuitBreaker, MemoryCircuitBreakerError } from '../../utils/memory-circuit-breaker';
import { MemoryMonitor } from '../../utils/memory-monitor';
import { streamingContactRepository, MinimalContact } from '../../contacts/streaming-repository';
import * as suggestionRepository from '../../matching/suggestion-repository';
import { SuggestionCreateData } from '../../matching/suggestion-repository';

const DEFAULT_BATCH_SIZE = 50; // Process 50 users at a time
const SUGGESTION_WINDOW_DAYS = 14; // Generate suggestions for next 2 weeks
const MAX_SUGGESTIONS_PER_USER = 50; // Limit suggestions to prevent memory issues
const CONTACT_BATCH_SIZE = 100; // Process contacts in batches of 100

/**
 * Generate timebound suggestions using streaming contact processing
 * 
 * Memory-optimized version that streams contacts in batches instead of
 * loading all contacts into memory at once.
 * 
 * Requirements: Memory Optimization Phase 2, Task 2.2
 */
async function generateTimeboundSuggestionsStreaming(
  userId: string,
  availableSlots: TimeSlot[],
  currentDate: Date = new Date()
): Promise<number> {
  let suggestionsGenerated = 0;
  const contactsNeedingConnection: MinimalContact[] = [];

  // Define frequency thresholds
  const thresholds: Record<FrequencyOption, number> = {
    [FrequencyOption.DAILY]: 1,
    [FrequencyOption.WEEKLY]: 7,
    [FrequencyOption.BIWEEKLY]: 14,
    [FrequencyOption.MONTHLY]: 30,
    [FrequencyOption.QUARTERLY]: 90,
    [FrequencyOption.YEARLY]: 365,
    [FrequencyOption.FLEXIBLE]: 60,
    [FrequencyOption.NA]: 365,
  };

  // Stream contacts in batches
  for await (const contactBatch of streamingContactRepository.streamMinimalContacts(userId, {
    batchSize: CONTACT_BATCH_SIZE,
    orderBy: 'last_contact_date',
    orderDirection: 'ASC',
  })) {
    // Filter contacts that need connection based on frequency preference
    for (const contact of contactBatch) {
      if (contact.archived) continue;

      const frequency = contact.frequencyPreference || FrequencyOption.MONTHLY;
      const lastContact = contact.lastContactDate || new Date(0);

      const daysSinceContact = Math.floor(
        (currentDate.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we've exceeded the frequency threshold
      if (daysSinceContact >= thresholds[frequency]) {
        contactsNeedingConnection.push(contact);
      }
    }

    // Stop early if we have enough contacts for all available slots
    if (contactsNeedingConnection.length >= availableSlots.length) {
      break;
    }

    // Yield to event loop
    await new Promise((resolve) => setImmediate(resolve));
  }

  // Match contacts to available slots
  for (const slot of availableSlots) {
    if (contactsNeedingConnection.length === 0) break;
    if (suggestionsGenerated >= MAX_SUGGESTIONS_PER_USER) break;

    // Calculate priority for each contact
    const contactsWithPriority = contactsNeedingConnection.map((contact) => {
      const priority = calculatePriorityMinimal(contact, currentDate);
      return { contact, priority };
    });

    // Sort by priority (highest first)
    contactsWithPriority.sort((a, b) => b.priority - a.priority);

    // Take the top match
    const topMatch = contactsWithPriority[0];

    // Build reasoning
    let reasoning = `It's been a while since you connected`;
    if (topMatch.contact.frequencyPreference) {
      reasoning += ` (${topMatch.contact.frequencyPreference} preference)`;
    }

    // Create suggestion
    const suggestionData: SuggestionCreateData = {
      userId,
      contactId: topMatch.contact.id,
      triggerType: TriggerType.TIMEBOUND,
      proposedTimeslot: slot,
      reasoning,
    };

    await suggestionRepository.create(suggestionData);
    suggestionsGenerated++;

    // Remove this contact from the pool
    const index = contactsNeedingConnection.findIndex((c) => c.id === topMatch.contact.id);
    if (index > -1) {
      contactsNeedingConnection.splice(index, 1);
    }
  }

  return suggestionsGenerated;
}

/**
 * Calculate priority for minimal contact data
 * Simplified version of suggestionService.calculatePriority for minimal contacts
 */
function calculatePriorityMinimal(
  contact: MinimalContact,
  currentDate: Date = new Date()
): number {
  const effectiveLastContact = contact.lastContactDate || new Date(0);

  const daysSinceContact = Math.floor(
    (currentDate.getTime() - effectiveLastContact.getTime()) / (1000 * 60 * 60 * 24)
  );

  const frequency = contact.frequencyPreference || FrequencyOption.MONTHLY;

  // Apply recency decay
  const decay = applyRecencyDecayMinimal(daysSinceContact, frequency);

  const basePriority = 100;
  const priority = basePriority + decay;

  return Math.max(0, priority);
}

/**
 * Apply recency decay for minimal contact data
 * Simplified version of suggestionService.applyRecencyDecay
 */
function applyRecencyDecayMinimal(
  daysSinceContact: number,
  frequencyPreference: FrequencyOption
): number {
  const thresholds: Record<FrequencyOption, number> = {
    [FrequencyOption.DAILY]: 1,
    [FrequencyOption.WEEKLY]: 7,
    [FrequencyOption.BIWEEKLY]: 14,
    [FrequencyOption.MONTHLY]: 30,
    [FrequencyOption.QUARTERLY]: 90,
    [FrequencyOption.YEARLY]: 365,
    [FrequencyOption.FLEXIBLE]: 60,
    [FrequencyOption.NA]: 365,
  };

  const threshold = thresholds[frequencyPreference];
  const excessDays = Math.max(0, daysSinceContact - threshold);
  const multiplier = 50;
  const decay = Math.log(1 + excessDays) * multiplier;

  return decay;
}

/**
 * Process suggestion generation job
 *
 * Generates suggestions for all users by:
 * 1. Getting users with Google Calendar connected
 * 2. Fetching their available time slots
 * 3. Streaming contacts and generating timebound suggestions
 * 4. Caching suggestions until status changes
 * 
 * Memory-optimized with streaming contact processing.
 */
export async function processSuggestionGeneration(
  job: Job<SuggestionGenerationJobData>
): Promise<SuggestionGenerationResult> {
  const { batchSize = DEFAULT_BATCH_SIZE, offset = 0 } = job.data;

  console.log(`Processing suggestion generation job - batch size: ${batchSize}, offset: ${offset}`);

  // Initialize memory management utilities
  const memoryBreaker = new MemoryCircuitBreaker({ maxHeapPercent: 80 });
  const memoryMonitor = new MemoryMonitor();

  const result: SuggestionGenerationResult = {
    usersProcessed: 0,
    suggestionsGenerated: 0,
    errors: [],
  };

  // Log memory before operation
  const memoryBefore = process.memoryUsage();

  try {
    // Check memory before starting
    await memoryBreaker.checkMemory();

    // Get all users with Google Calendar OAuth tokens
    const allUserIds = await oauthRepository.getUsersWithProvider('google_calendar');

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
        // Check memory before processing each user
        await memoryBreaker.checkMemory();

        // Get user's OAuth token
        const token = await oauthRepository.getToken(userId, 'google_calendar');
        if (!token) {
          result.errors.push(`No OAuth token found for user ${userId}`);
          continue;
        }

        // Get available time slots
        const availableSlots = await calendarService.getFreeTimeSlots(
          userId,
          token.accessToken,
          dateRange,
          token.refreshToken
        );

        console.log(`Found ${availableSlots.length} available slots for user ${userId}`);

        // Generate timebound suggestions with memory tracking and streaming
        const suggestions = await memoryMonitor.wrapOperation(
          `generate-suggestions-${userId}`,
          async () => {
            return await generateTimeboundSuggestionsStreaming(userId, availableSlots, now);
          }
        );

        result.usersProcessed++;
        result.suggestionsGenerated += suggestions;

        console.log(`Generated ${suggestions} suggestions for user ${userId}`);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Yield to event loop
        await new Promise((resolve) => setImmediate(resolve));
      } catch (error) {
        if (error instanceof MemoryCircuitBreakerError) {
          const errorMessage = `Memory circuit breaker triggered for user ${userId}: ${error.message}`;
          console.error(errorMessage);
          result.errors.push(errorMessage);
          // Stop processing more users if memory is critical
          break;
        }

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
      console.log(`Scheduling next batch - offset: ${offset + batchSize}`);
      // Note: The scheduler will handle this automatically
    }

    // Log memory after operation
    const memoryAfter = process.memoryUsage();
    memoryMonitor.logMemoryUsage('suggestion-generation-complete', memoryBefore, memoryAfter);

    return result;
  } catch (error) {
    if (error instanceof MemoryCircuitBreakerError) {
      const errorMessage = `Memory circuit breaker triggered: ${error.message}`;
      console.error(errorMessage);
      result.errors.push(errorMessage);
      return result; // Return partial results instead of throwing
    }

    const errorMessage = `Fatal error in suggestion generation: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(errorMessage);
    result.errors.push(errorMessage);
    throw error;
  }
}
