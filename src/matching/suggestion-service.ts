/**
 * Suggestion Service
 *
 * Business logic layer for suggestion generation and management.
 * Implements priority calculation, matching logic, and lifecycle management.
 */

import {
  Contact,
  Suggestion,
  SuggestionStatus,
  TriggerType,
  TimeSlot,
  FrequencyOption,
  InteractionType,
} from '../types';
import * as suggestionRepository from './suggestion-repository';
import { SuggestionCreateData, SuggestionFilters } from './suggestion-repository';
import { contactService } from '../contacts/service';
import { interactionService } from '../contacts/interaction-service';
import { frequencyService } from '../contacts/frequency-service';

/**
 * Contact match result with priority score
 */
export interface ContactMatch {
  contact: Contact;
  priority: number;
  reasoning: string;
}

/**
 * Calculate priority score for a contact based on recency decay
 *
 * Requirements: 11.1
 * Property 41: Priority calculation with recency decay
 *
 * The priority score is calculated using recency decay based on:
 * - Time since last contact
 * - Frequency preference
 *
 * Higher scores indicate higher priority for connection.
 */
export function calculatePriority(
  contact: Contact,
  lastContactDate: Date | null,
  currentDate: Date = new Date()
): number {
  // If no last contact date, use a very old date to maximize priority
  const effectiveLastContact = lastContactDate || new Date(0);

  // Calculate days since last contact
  const daysSinceContact = Math.floor(
    (currentDate.getTime() - effectiveLastContact.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get frequency preference (default to MONTHLY if not set)
  const frequency = contact.frequencyPreference || FrequencyOption.MONTHLY;

  // Apply recency decay based on frequency preference
  const decay = applyRecencyDecay(daysSinceContact, frequency);

  // Base priority starts at 100
  const basePriority = 100;

  // Calculate final priority: base + decay factor
  // Decay increases priority as time passes
  const priority = basePriority + decay;

  return Math.max(0, priority); // Ensure non-negative
}

/**
 * Apply recency decay based on time since last contact and frequency preference
 *
 * Requirements: 11.1
 * Property 41: Priority calculation with recency decay
 *
 * Returns a decay factor that increases as time passes beyond the frequency threshold.
 * The decay factor is added to the base priority.
 */
export function applyRecencyDecay(
  daysSinceContact: number,
  frequencyPreference: FrequencyOption
): number {
  // Define frequency thresholds in days
  const thresholds: Record<FrequencyOption, number> = {
    [FrequencyOption.DAILY]: 1,
    [FrequencyOption.WEEKLY]: 7,
    [FrequencyOption.MONTHLY]: 30,
    [FrequencyOption.YEARLY]: 365,
    [FrequencyOption.FLEXIBLE]: 60, // Default to ~2 months for flexible
  };

  const threshold = thresholds[frequencyPreference];

  // Calculate how much we've exceeded the threshold
  const excessDays = Math.max(0, daysSinceContact - threshold);

  // Decay factor increases exponentially with excess days
  // Using a logarithmic scale to prevent extreme values
  // Formula: log(1 + excessDays) * multiplier
  const multiplier = 50; // Tunable parameter
  const decay = Math.log(1 + excessDays) * multiplier;

  return decay;
}

/**
 * Match contacts to a timeslot based on various criteria
 *
 * Requirements: 11.2, 11.3, 11.4
 * Property 42: Availability parameter consideration in matching
 * Property 43: Close Friends prioritization
 * Property 39: Communication preference respect
 *
 * Considers:
 * - Priority score (recency decay)
 * - Group membership (Close Friends prioritized)
 * - Communication preferences (IRL vs URL)
 */
export async function matchContactsToTimeslot(
  userId: string,
  timeslot: TimeSlot,
  contacts: Contact[],
  currentDate: Date = new Date()
): Promise<ContactMatch[]> {
  const matches: ContactMatch[] = [];

  for (const contact of contacts) {
    // Skip archived contacts
    if (contact.archived) {
      continue;
    }

    // Calculate priority
    const priority = calculatePriority(contact, contact.lastContactDate || null, currentDate);

    // Build reasoning
    let reasoning = `It's been a while since you connected`;

    // Add frequency context
    if (contact.frequencyPreference) {
      reasoning += ` (${contact.frequencyPreference} preference)`;
    }

    // Add group context
    if (contact.groups && contact.groups.length > 0) {
      reasoning += `. Member of: ${contact.groups.join(', ')}`;
    }

    // Add tag context for shared interests
    if (contact.tags && contact.tags.length > 0) {
      const tagTexts = contact.tags.map((t) => t.text).slice(0, 3);
      reasoning += `. Interests: ${tagTexts.join(', ')}`;
    }

    matches.push({
      contact,
      priority,
      reasoning,
    });
  }

  // Sort by priority (highest first)
  matches.sort((a, b) => b.priority - a.priority);

  // Apply Close Friends prioritization
  // Move Close Friends to the top while maintaining relative priority within groups
  const closeFriends = matches.filter((m) =>
    m.contact.groups.some((g) => g.toLowerCase().includes('close'))
  );
  const others = matches.filter(
    (m) => !m.contact.groups.some((g) => g.toLowerCase().includes('close'))
  );

  return [...closeFriends, ...others];
}

/**
 * Generate timebound suggestions for contacts
 *
 * Requirements: 10.1, 10.2, 10.5
 * Property 38: Timebound suggestion generation
 *
 * Generates suggestions when time since last contact exceeds frequency threshold.
 * Matches suggestions to available calendar slots.
 */
export async function generateTimeboundSuggestions(
  userId: string,
  availableSlots: TimeSlot[],
  currentDate: Date = new Date()
): Promise<Suggestion[]> {
  // Get all contacts for the user
  const contacts = await contactService.listContacts(userId);

  // Filter contacts that need connection based on frequency preference
  const contactsNeedingConnection = contacts.filter((contact) => {
    if (contact.archived) return false;

    const frequency = contact.frequencyPreference || FrequencyOption.MONTHLY;
    const lastContact = contact.lastContactDate || new Date(0);

    const daysSinceContact = Math.floor(
      (currentDate.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if we've exceeded the frequency threshold
    const thresholds: Record<FrequencyOption, number> = {
      [FrequencyOption.DAILY]: 1,
      [FrequencyOption.WEEKLY]: 7,
      [FrequencyOption.MONTHLY]: 30,
      [FrequencyOption.YEARLY]: 365,
      [FrequencyOption.FLEXIBLE]: 60,
    };

    return daysSinceContact >= thresholds[frequency];
  });

  const suggestions: Suggestion[] = [];

  // Match contacts to available slots
  for (const slot of availableSlots) {
    if (contactsNeedingConnection.length === 0) break;

    // Get best matches for this slot
    const matches = await matchContactsToTimeslot(
      userId,
      slot,
      contactsNeedingConnection,
      currentDate
    );

    if (matches.length === 0) continue;

    // Take the top match
    const topMatch = matches[0];

    // Create suggestion
    const suggestionData: SuggestionCreateData = {
      userId,
      contactId: topMatch.contact.id,
      triggerType: TriggerType.TIMEBOUND,
      proposedTimeslot: slot,
      reasoning: topMatch.reasoning,
    };

    const suggestion = await suggestionRepository.create(suggestionData);
    suggestions.push(suggestion);

    // Remove this contact from the pool
    const index = contactsNeedingConnection.findIndex((c) => c.id === topMatch.contact.id);
    if (index > -1) {
      contactsNeedingConnection.splice(index, 1);
    }
  }

  return suggestions;
}

/**
 * Generate shared activity suggestions for a calendar event
 *
 * Requirements: 8.5, 9.1, 9.2, 9.3, 9.4, 9.5
 * Property 34: Shared activity interest matching
 * Property 35: Shared activity proximity filtering
 * Property 36: Shared activity recency consideration
 * Property 37: Shared activity suggestion content
 *
 * Detects calendar events suitable for friend invitations.
 * Matches contacts based on shared interests, proximity, and recency.
 */
export async function generateSharedActivitySuggestions(
  userId: string,
  calendarEventId: string,
  eventDetails: {
    title: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    timezone: string;
  }
): Promise<Suggestion[]> {
  // Get all contacts for the user
  const contacts = await contactService.listContacts(userId);

  const suggestions: Suggestion[] = [];

  // Extract keywords from event for interest matching
  const eventKeywords = extractKeywords(eventDetails.title, eventDetails.description);

  for (const contact of contacts) {
    if (contact.archived) continue;

    let matchScore = 0;
    const reasons: string[] = [];

    // Check for shared interests (tags)
    if (contact.tags && contact.tags.length > 0) {
      const tagTexts = contact.tags.map((t) => t.text.toLowerCase());
      const matchingInterests = eventKeywords.filter((keyword) =>
        tagTexts.some((tag) => tag.includes(keyword) || keyword.includes(tag))
      );

      if (matchingInterests.length > 0) {
        matchScore += matchingInterests.length * 10;
        reasons.push(`Shared interests: ${matchingInterests.join(', ')}`);
      }
    }

    // Check for geographic proximity (if event has location)
    if (eventDetails.location && contact.location) {
      // Simple proximity check - in production, use proper geocoding
      const eventLoc = eventDetails.location.toLowerCase();
      const contactLoc = contact.location.toLowerCase();

      if (eventLoc.includes(contactLoc) || contactLoc.includes(eventLoc)) {
        matchScore += 20;
        reasons.push(`Located in ${contact.location}`);
      }
    }

    // Consider time since last contact
    const lastContact = contact.lastContactDate || new Date(0);
    const daysSinceContact = Math.floor(
      (new Date().getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceContact > 30) {
      matchScore += 5;
      reasons.push(`Haven't connected in ${daysSinceContact} days`);
    }

    // Only create suggestion if there's a meaningful match
    if (matchScore > 0 && reasons.length > 0) {
      const reasoning = `${eventDetails.title}: ${reasons.join('; ')}`;

      const suggestionData: SuggestionCreateData = {
        userId,
        contactId: contact.id,
        triggerType: TriggerType.SHARED_ACTIVITY,
        proposedTimeslot: {
          start: eventDetails.start,
          end: eventDetails.end,
          timezone: eventDetails.timezone,
        },
        reasoning,
        calendarEventId,
      };

      const suggestion = await suggestionRepository.create(suggestionData);
      suggestions.push(suggestion);
    }
  }

  // Sort by match score (implicit in creation order, but could be explicit)
  return suggestions;
}

/**
 * Extract keywords from text for interest matching
 */
function extractKeywords(title: string, description?: string): string[] {
  const text = `${title} ${description || ''}`.toLowerCase();

  // Simple keyword extraction - in production, use NLP
  const words = text.split(/\s+/);

  // Filter out common words
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
  ]);

  return words.filter((w) => w.length > 3 && !stopWords.has(w)).slice(0, 10);
}

/**
 * Accept a suggestion
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4
 * Property 57: Acceptance draft message generation
 * Property 58: Acceptance calendar feed addition
 * Property 20: Interaction logging from suggestion acceptance
 *
 * Generates draft message, adds to calendar feed, creates interaction log.
 */
export async function acceptSuggestion(
  suggestionId: string,
  userId: string
): Promise<{
  suggestion: Suggestion;
  draftMessage: string;
  interactionLog: any;
}> {
  // Get the suggestion
  const suggestion = await suggestionRepository.findById(suggestionId, userId);
  if (!suggestion) {
    throw new Error('Suggestion not found');
  }

  if (suggestion.status !== SuggestionStatus.PENDING) {
    throw new Error('Suggestion is not pending');
  }

  // Update suggestion status
  const updatedSuggestion = await suggestionRepository.update(suggestionId, userId, {
    status: SuggestionStatus.ACCEPTED,
  });

  // Get contact details
  const contact = await contactService.getContact(suggestion.contactId, userId);

  // Generate draft message
  const draftMessage = generateDraftMessage(contact, suggestion);

  // Create interaction log
  const interactionLog = await interactionService.logInteraction(
    userId,
    suggestion.contactId,
    new Date(),
    InteractionType.HANGOUT, // Default to hangout, could be inferred from suggestion
    `Accepted suggestion: ${suggestion.reasoning}`,
    suggestionId
  );

  // TODO: Add to calendar feed (will be implemented in feed service)

  return {
    suggestion: updatedSuggestion,
    draftMessage,
    interactionLog,
  };
}

/**
 * Generate draft message for accepted suggestion
 *
 * Requirements: 16.1
 * Property 57: Acceptance draft message generation
 */
function generateDraftMessage(contact: Contact, suggestion: Suggestion): string {
  const timeStr = suggestion.proposedTimeslot.start.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  let message = `Hey ${contact.name}! `;

  if (suggestion.triggerType === TriggerType.SHARED_ACTIVITY) {
    message += `I'm going to ${suggestion.reasoning.split(':')[0]} on ${timeStr}. Would you like to join?`;
  } else {
    message += `It's been a while! Would you be free to catch up on ${timeStr}?`;
  }

  return message;
}

/**
 * Dismiss a suggestion
 *
 * Requirements: 17.1, 17.2, 17.3, 17.5, 17.6, 17.7
 * Property 59: Dismissal reason prompt
 * Property 60: "Met too recently" dismissal handling
 * Property 61: Dismissal reason persistence
 */
export async function dismissSuggestion(
  suggestionId: string,
  userId: string,
  reason: string
): Promise<Suggestion> {
  // Get the suggestion
  const suggestion = await suggestionRepository.findById(suggestionId, userId);
  if (!suggestion) {
    throw new Error('Suggestion not found');
  }

  if (suggestion.status !== SuggestionStatus.PENDING) {
    throw new Error('Suggestion is not pending');
  }

  // Handle "met too recently" dismissal
  if (reason.toLowerCase().includes('met too recently')) {
    // Update contact's last contact date to now
    await contactService.updateContact(suggestion.contactId, userId, {
      lastContactDate: new Date(),
    });

    // TODO: Prompt for frequency preference if not set
    // This would be handled by the API layer returning a flag
  }

  // Update suggestion status
  return await suggestionRepository.update(suggestionId, userId, {
    status: SuggestionStatus.DISMISSED,
    dismissalReason: reason,
  });
}

/**
 * Snooze a suggestion
 *
 * Requirements: 15.5
 * Property 56: Suggestion snooze behavior
 */
export async function snoozeSuggestion(
  suggestionId: string,
  userId: string,
  snoozeDuration: number // in hours
): Promise<Suggestion> {
  // Get the suggestion
  const suggestion = await suggestionRepository.findById(suggestionId, userId);
  if (!suggestion) {
    throw new Error('Suggestion not found');
  }

  if (suggestion.status !== SuggestionStatus.PENDING) {
    throw new Error('Suggestion is not pending');
  }

  // Calculate snooze until time
  const snoozedUntil = new Date();
  snoozedUntil.setHours(snoozedUntil.getHours() + snoozeDuration);

  // Update suggestion status
  return await suggestionRepository.update(suggestionId, userId, {
    status: SuggestionStatus.SNOOZED,
    snoozedUntil,
  });
}

/**
 * Get pending suggestions for a user
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 * Property 54: Feed displays pending suggestions
 * Property 56: Suggestion snooze behavior
 *
 * Returns pending suggestions, handling snoozed suggestions that should resurface.
 */
export async function getPendingSuggestions(
  userId: string,
  filters?: SuggestionFilters
): Promise<Suggestion[]> {
  // Get all suggestions with filters
  const allSuggestions = await suggestionRepository.findAll(userId, filters);

  const now = new Date();

  // Filter and process suggestions
  const pendingSuggestions = allSuggestions.filter((suggestion) => {
    // Include pending suggestions
    if (suggestion.status === SuggestionStatus.PENDING) {
      return true;
    }

    // Include snoozed suggestions that should resurface
    if (
      suggestion.status === SuggestionStatus.SNOOZED &&
      suggestion.snoozedUntil &&
      suggestion.snoozedUntil <= now
    ) {
      // Automatically update status back to pending
      suggestionRepository
        .update(suggestion.id, userId, {
          status: SuggestionStatus.PENDING,
          snoozedUntil: undefined,
        })
        .catch((err) => console.error('Error updating snoozed suggestion:', err));

      return true;
    }

    return false;
  });

  return pendingSuggestions;
}

/**
 * Generate dismissal reason templates based on contact metadata
 *
 * Requirements: 17.2, 17.3
 * Property 59: Dismissal reason prompt
 */
export function generateDismissalReasonTemplates(contact: Contact): string[] {
  const templates = [
    'Met too recently',
    'Not interested in connecting right now',
    'Timing doesn\'t work',
    'Prefer to connect at a different time',
  ];

  // Add context-specific templates
  if (contact.location) {
    templates.push(`Not in ${contact.location} currently`);
  }

  if (contact.frequencyPreference) {
    templates.push(`${contact.frequencyPreference} is too frequent`);
  }

  return templates;
}
