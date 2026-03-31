/**
 * Suggestion Service
 *
 * Business logic layer for suggestion generation and management.
 * Implements priority calculation, matching logic, and lifecycle management.
 * Incorporates enrichment data signals (communication frequency, recency, sentiment)
 * with configurable signal weights.
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6
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
// import { frequencyService } from '../contacts/frequency-service';
import { getOrSetCache, CacheKeys, CacheTTL, invalidateSuggestionCache } from '../utils/cache';
import pool from '../db/connection';

// ============================================
// Enrichment Signal Types & Weights
// Requirements: 17.1, 17.4
// ============================================

/**
 * Configurable signal weights for suggestion scoring.
 * Stored in `suggestion_signal_weights` table.
 */
export interface SuggestionSignalWeights {
  enrichmentData: number;   // default 0.25
  interactionLogs: number;  // default 0.35
  calendarData: number;     // default 0.25
  contactMetadata: number;  // default 0.15
}

export const DEFAULT_SIGNAL_WEIGHTS: SuggestionSignalWeights = {
  enrichmentData: 0.25,
  interactionLogs: 0.35,
  calendarData: 0.25,
  contactMetadata: 0.15,
};

/**
 * Enrichment signal data for a contact, derived from enrichment_records.
 */
export interface EnrichmentSignal {
  contactId: string;
  avgMessagesPerMonth: number;
  lastMessageDate: Date | null;
  sentimentTrend: 'positive' | 'neutral' | 'negative' | null;
  frequencyTrend: 'increasing' | 'stable' | 'declining';
  topPlatform: string | null;
  totalMessageCount: number;
}

/**
 * Breakdown of how each signal contributed to a suggestion score.
 */
export interface SignalContribution {
  enrichmentScore: number;
  interactionLogScore: number;
  calendarScore: number;
  metadataScore: number;
  weights: SuggestionSignalWeights;
  hasEnrichmentData: boolean;
  decliningFrequency: boolean;
  negativeSentiment: boolean;
}

/**
 * Fetch signal weights for a user (or global defaults).
 * Requirements: 17.4
 */
export async function getSignalWeights(userId?: string): Promise<SuggestionSignalWeights> {
  try {
    // Try user-specific weights first
    if (userId) {
      const { rows } = await pool.query(
        `SELECT enrichment_data, interaction_logs, calendar_data, contact_metadata
         FROM suggestion_signal_weights WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      if (rows.length > 0) {
        return {
          enrichmentData: parseFloat(rows[0].enrichment_data),
          interactionLogs: parseFloat(rows[0].interaction_logs),
          calendarData: parseFloat(rows[0].calendar_data),
          contactMetadata: parseFloat(rows[0].contact_metadata),
        };
      }
    }

    // Fall back to global defaults from DB
    const { rows } = await pool.query(
      `SELECT enrichment_data, interaction_logs, calendar_data, contact_metadata
       FROM suggestion_signal_weights WHERE user_id IS NULL LIMIT 1`,
    );
    if (rows.length > 0) {
      return {
        enrichmentData: parseFloat(rows[0].enrichment_data),
        interactionLogs: parseFloat(rows[0].interaction_logs),
        calendarData: parseFloat(rows[0].calendar_data),
        contactMetadata: parseFloat(rows[0].contact_metadata),
      };
    }
  } catch {
    // DB not available, use hardcoded defaults
  }
  return { ...DEFAULT_SIGNAL_WEIGHTS };
}

/**
 * Fetch enrichment signal data for a contact from enrichment_records.
 * Requirements: 17.1
 */
export async function getEnrichmentSignal(contactId: string, userId: string): Promise<EnrichmentSignal | null> {
  try {
    const { rows } = await pool.query(
      `SELECT platform, message_count, avg_messages_per_month,
              first_message_date, last_message_date, sentiment
       FROM enrichment_records
       WHERE contact_id = $1 AND user_id = $2
       ORDER BY last_message_date DESC NULLS LAST`,
      [contactId, userId],
    );

    if (rows.length === 0) return null;

    let totalMessageCount = 0;
    let totalAvgPerMonth = 0;
    let lastMessageDate: Date | null = null;
    let sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    let topPlatform: string | null = null;
    let topPlatformCount = 0;

    for (const r of rows) {
      const mc = r.message_count || 0;
      totalMessageCount += mc;
      totalAvgPerMonth += parseFloat(r.avg_messages_per_month || '0');

      if (r.last_message_date) {
        const d = new Date(r.last_message_date);
        if (!lastMessageDate || d > lastMessageDate) lastMessageDate = d;
      }

      if (r.sentiment) {
        sentimentCounts[r.sentiment as keyof typeof sentimentCounts]++;
      }

      if (mc > topPlatformCount) {
        topPlatformCount = mc;
        topPlatform = r.platform;
      }
    }

    // Determine sentiment trend (majority vote)
    let sentimentTrend: 'positive' | 'neutral' | 'negative' | null = null;
    const maxSentiment = Math.max(sentimentCounts.positive, sentimentCounts.neutral, sentimentCounts.negative);
    if (maxSentiment > 0) {
      if (sentimentCounts.negative === maxSentiment) sentimentTrend = 'negative';
      else if (sentimentCounts.positive === maxSentiment) sentimentTrend = 'positive';
      else sentimentTrend = 'neutral';
    }

    // Determine frequency trend: compare recent avg to 6-month avg
    const frequencyTrend = detectFrequencyTrend(totalAvgPerMonth / rows.length, rows);

    return {
      contactId,
      avgMessagesPerMonth: totalAvgPerMonth / rows.length,
      lastMessageDate,
      sentimentTrend,
      frequencyTrend,
      topPlatform,
      totalMessageCount,
    };
  } catch {
    return null;
  }
}

/**
 * Detect frequency trend by comparing recent activity to historical average.
 * Declining = current month avg < 50% of 6-month avg.
 * Requirements: 17.2
 */
export function detectFrequencyTrend(
  overallAvg: number,
  records: Array<{ avg_messages_per_month?: string; last_message_date?: string | Date }>
): 'increasing' | 'stable' | 'declining' {
  if (records.length === 0 || overallAvg === 0) return 'stable';

  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // Calculate recent average (records with last_message_date in last month)
  let recentTotal = 0;
  let recentCount = 0;
  for (const r of records) {
    if (r.last_message_date) {
      const d = new Date(r.last_message_date);
      if (d >= oneMonthAgo) {
        recentTotal += parseFloat(r.avg_messages_per_month || '0');
        recentCount++;
      }
    }
  }

  if (recentCount === 0) {
    // No recent activity — declining
    return 'declining';
  }

  const recentAvg = recentTotal / recentCount;
  const ratio = recentAvg / overallAvg;

  if (ratio < 0.5) return 'declining';
  if (ratio > 1.5) return 'increasing';
  return 'stable';
}

/**
 * Compute a weighted suggestion score using all signal sources.
 * Returns a score between 0 and 100.
 *
 * Requirements: 17.1, 17.2, 17.3, 17.5, 17.6
 */
export function computeWeightedScore(
  contact: Contact,
  enrichment: EnrichmentSignal | null,
  weights: SuggestionSignalWeights,
  currentDate: Date = new Date(),
): { score: number; reasoning: string; contribution: SignalContribution } {
  const hasEnrichment = enrichment !== null;

  // Re-weight if no enrichment data (Req 17.5)
  let effectiveWeights = { ...weights };
  if (!hasEnrichment) {
    const remaining = weights.interactionLogs + weights.calendarData + weights.contactMetadata;
    if (remaining > 0) {
      const scale = 1.0 / remaining;
      effectiveWeights = {
        enrichmentData: 0,
        interactionLogs: weights.interactionLogs * scale,
        calendarData: weights.calendarData * scale,
        contactMetadata: weights.contactMetadata * scale,
      };
    }
  }

  // --- Enrichment signal (0-100 raw) ---
  let enrichmentRaw = 0;
  if (hasEnrichment && enrichment) {
    // Recency component (0-50): more recent = higher
    const lastMsg = enrichment.lastMessageDate;
    if (lastMsg) {
      const daysSince = Math.floor((currentDate.getTime() - lastMsg.getTime()) / (1000 * 60 * 60 * 24));
      enrichmentRaw += Math.max(0, 50 - daysSince * 0.5);
    }
    // Frequency component (0-30): higher avg = higher
    enrichmentRaw += Math.min(30, enrichment.avgMessagesPerMonth * 2);
    // Volume component (0-20): more messages = higher
    enrichmentRaw += Math.min(20, enrichment.totalMessageCount * 0.02);
  }

  // --- Interaction log signal (0-100 raw) ---
  // Based on recency decay from existing priority calculation
  const lastContactDate = contact.lastContactDate ? new Date(contact.lastContactDate) : null;
  const basePriority = calculatePriority(contact, lastContactDate, currentDate);
  // Normalize to 0-100 range (base is 100, typical max ~400)
  const interactionLogRaw = Math.min(100, Math.max(0, (basePriority - 100) / 3 * 100 / 100));

  // --- Calendar signal (0-100 raw) ---
  // Placeholder: use lastContactDate proximity as proxy
  let calendarRaw = 0;
  if (lastContactDate) {
    const daysSince = Math.floor((currentDate.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
    calendarRaw = Math.max(0, Math.min(100, daysSince * 1.0));
  } else {
    calendarRaw = 50; // No data, neutral
  }

  // --- Metadata signal (0-100 raw) ---
  let metadataRaw = 0;
  if (contact.frequencyPreference && contact.frequencyPreference !== FrequencyOption.NA) metadataRaw += 30;
  if (contact.groups.length > 0) metadataRaw += 20;
  if (contact.tags.length > 0) metadataRaw += 20;
  if (contact.dunbarCircle) metadataRaw += 30;

  // Weighted combination
  let score =
    enrichmentRaw * effectiveWeights.enrichmentData +
    interactionLogRaw * effectiveWeights.interactionLogs +
    calendarRaw * effectiveWeights.calendarData +
    metadataRaw * effectiveWeights.contactMetadata;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Boost for declining frequency (Req 17.2)
  const decliningFrequency = hasEnrichment && enrichment!.frequencyTrend === 'declining';
  if (decliningFrequency) {
    score = Math.min(100, score * 1.25);
  }

  // Build reasoning
  const reasonParts: string[] = [];
  reasonParts.push(`It's been a while since you connected`);
  if (contact.frequencyPreference) {
    reasonParts.push(`(${contact.frequencyPreference} preference)`);
  }

  // Include sentiment context in reasoning (Req 17.3)
  const negativeSentiment = hasEnrichment && enrichment!.sentimentTrend === 'negative';
  if (negativeSentiment) {
    reasonParts.push(`— recent conversations had a negative tone, might be worth checking in`);
  }

  if (decliningFrequency && hasEnrichment) {
    reasonParts.push(`— communication frequency has been declining`);
  }

  if (hasEnrichment && enrichment!.topPlatform) {
    reasonParts.push(`(${enrichment!.totalMessageCount} messages via ${enrichment!.topPlatform})`);
  }

  const contribution: SignalContribution = {
    enrichmentScore: enrichmentRaw * effectiveWeights.enrichmentData,
    interactionLogScore: interactionLogRaw * effectiveWeights.interactionLogs,
    calendarScore: calendarRaw * effectiveWeights.calendarData,
    metadataScore: metadataRaw * effectiveWeights.contactMetadata,
    weights: effectiveWeights,
    hasEnrichmentData: hasEnrichment,
    decliningFrequency,
    negativeSentiment,
  };

  // Log signal contributions (Req 17.6)
  console.log(`[SuggestionEngine] Contact ${contact.id} score=${score.toFixed(2)}, ` +
    `enrichment=${contribution.enrichmentScore.toFixed(2)}, ` +
    `interaction=${contribution.interactionLogScore.toFixed(2)}, ` +
    `calendar=${contribution.calendarScore.toFixed(2)}, ` +
    `metadata=${contribution.metadataScore.toFixed(2)}, ` +
    `hasEnrichment=${hasEnrichment}, declining=${decliningFrequency}, negSentiment=${negativeSentiment}`);

  return { score, reasoning: reasonParts.join(' '), contribution };
}

/**
 * Helper function to fetch group names for a user
 */
async function fetchGroupNames(userId: string): Promise<Map<string, string>> {
  const result = await pool.query('SELECT id, name FROM groups WHERE user_id = $1', [userId]);

  const groupMap = new Map<string, string>();
  for (const row of result.rows) {
    groupMap.set(row.id, row.name);
  }

  return groupMap;
}

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
    [FrequencyOption.BIWEEKLY]: 14,
    [FrequencyOption.MONTHLY]: 30,
    [FrequencyOption.QUARTERLY]: 90,
    [FrequencyOption.YEARLY]: 365,
    [FrequencyOption.FLEXIBLE]: 60, // Default to ~2 months for flexible
    [FrequencyOption.NA]: 365, // N/A defaults to yearly (low priority)
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
  _userId: string,
  _timeslot: TimeSlot,
  contacts: Contact[],
  currentDate: Date = new Date(),
  groupMap: Map<string, string> = new Map()
): Promise<ContactMatch[]> {
  const matches: ContactMatch[] = [];

  for (const contact of contacts) {
    // Skip archived contacts
    if (contact.archived) {
      continue;
    }

    // Calculate priority
    const priority = calculatePriority(
      contact,
      contact.lastContactDate ? new Date(contact.lastContactDate) : null,
      currentDate
    );

    // Build reasoning
    let reasoning = `It's been a while since you connected`;

    // Add frequency context
    if (contact.frequencyPreference) {
      reasoning += ` (${contact.frequencyPreference} preference)`;
    }

    // Group and interest context is now displayed separately in the UI as badges
    // No need to include them in the reasoning text

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
 * Matches suggestions to available calendar slots that don't conflict with events.
 */
export async function generateTimeboundSuggestions(
  userId: string,
  availableSlots: TimeSlot[],
  currentDate: Date = new Date()
): Promise<Suggestion[]> {
  // Get all contacts for the user
  const contacts = await contactService.listContacts(userId);

  // Fetch group names for display in reasoning
  const groupMap = await fetchGroupNames(userId);

  // Filter contacts that need connection based on frequency preference
  const contactsNeedingConnection = contacts.filter((contact) => {
    if (contact.archived) return false;

    const frequency = contact.frequencyPreference || FrequencyOption.MONTHLY;
    const lastContact = contact.lastContactDate ? new Date(contact.lastContactDate) : new Date(0);

    const daysSinceContact = Math.floor(
      (currentDate.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if we've exceeded the frequency threshold
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
      currentDate,
      groupMap
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
    const lastContact = contact.lastContactDate ? new Date(contact.lastContactDate) : new Date(0);
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

  // Invalidate suggestion cache
  await invalidateSuggestionCache(userId);

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
  const updatedSuggestion = await suggestionRepository.update(suggestionId, userId, {
    status: SuggestionStatus.DISMISSED,
    dismissalReason: reason,
  });

  // Invalidate suggestion cache
  await invalidateSuggestionCache(userId);

  return updatedSuggestion;
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
  const updatedSuggestion = await suggestionRepository.update(suggestionId, userId, {
    status: SuggestionStatus.SNOOZED,
    snoozedUntil,
  });

  // Invalidate suggestion cache
  await invalidateSuggestionCache(userId);

  return updatedSuggestion;
}

/**
 * Get all suggestions for a user (regardless of status)
 */
export async function getAllSuggestions(
  userId: string,
  filters?: SuggestionFilters
): Promise<Suggestion[]> {
  return await suggestionRepository.findAll(userId, filters);
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
  // Only cache if no filters are applied
  if (!filters || Object.keys(filters).length === 0) {
    return await getOrSetCache(
      CacheKeys.SUGGESTION_LIST(userId),
      async () => await loadPendingSuggestions(userId, filters),
      CacheTTL.SUGGESTION_LIST
    );
  }

  // Don't cache filtered results
  return await loadPendingSuggestions(userId, filters);
}

/**
 * Internal function to load pending suggestions
 */
async function loadPendingSuggestions(
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
    "Timing doesn't work",
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

/**
 * Generate group suggestion for a contact group
 *
 * Requirements: 8.1, 8.2, 9.1, 9.2
 * Property 5: Group suggestion membership constraints
 * Property 6: Group suggestion frequency validation
 *
 * Creates a group suggestion for 2-3 contacts with strong shared context.
 * Validates that all contacts meet frequency thresholds.
 */
export async function generateGroupSuggestion(
  userId: string,
  contactGroup: import('../matching/group-matching-service').ContactGroup,
  timeslot: TimeSlot,
  currentDate: Date = new Date()
): Promise<Suggestion | null> {
  // Validate group size (2-3 contacts)
  if (contactGroup.contacts.length < 2 || contactGroup.contacts.length > 3) {
    return null;
  }

  // Verify all contacts meet frequency thresholds
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

  for (const contact of contactGroup.contacts) {
    const frequency = contact.frequencyPreference || FrequencyOption.MONTHLY;
    const lastContact = contact.lastContactDate ? new Date(contact.lastContactDate) : new Date(0);
    const daysSinceContact = Math.floor(
      (currentDate.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If any contact doesn't meet threshold, don't create group suggestion
    if (daysSinceContact < thresholds[frequency]) {
      return null;
    }
  }

  // Build reasoning from shared context
  const factors = contactGroup.sharedContext.factors;
  const reasonParts: string[] = [];

  if (factors.commonGroups.length > 0) {
    reasonParts.push(`Common groups: ${factors.commonGroups.join(', ')}`);
  }

  if (factors.sharedTags.length > 0) {
    reasonParts.push(`Shared interests: ${factors.sharedTags.join(', ')}`);
  }

  if (factors.coMentionedInVoiceNotes > 0) {
    reasonParts.push(`Mentioned together in ${factors.coMentionedInVoiceNotes} voice notes`);
  }

  const reasoning =
    reasonParts.length > 0
      ? `Group catchup opportunity: ${reasonParts.join('; ')}`
      : 'Group catchup opportunity based on shared context';

  // Calculate priority based on average recency and shared context score
  let totalPriority = 0;
  for (const contact of contactGroup.contacts) {
    const contactPriority = calculatePriority(
      contact,
      contact.lastContactDate ? new Date(contact.lastContactDate) : null,
      currentDate
    );
    totalPriority += contactPriority;
  }
  const avgPriority = Math.floor(totalPriority / contactGroup.contacts.length);

  // Boost priority by shared context score
  const priority = avgPriority + Math.floor(contactGroup.sharedContext.score / 2);

  // Create group suggestion
  const suggestionData: SuggestionCreateData = {
    userId,
    contactIds: contactGroup.contacts.map((c) => c.id),
    type: 'group',
    triggerType: TriggerType.TIMEBOUND,
    proposedTimeslot: timeslot,
    reasoning,
    priority,
    sharedContext: contactGroup.sharedContext,
  };

  const suggestion = await suggestionRepository.create(suggestionData);
  return suggestion;
}

/**
 * Balance group and individual suggestions
 *
 * Requirements: 8.2, 9.2, 9.5, 9.6, 9.9
 * Property 7: Suggestion type balance
 * Property 8: Shared context threshold enforcement
 * Property 9: Contact uniqueness in suggestion batch
 *
 * Ensures:
 * - Both types present when eligible
 * - Sorted by priority
 * - No contact appears in multiple suggestions
 * - Shared context threshold applied
 */
export function balanceSuggestions(
  individualSuggestions: Suggestion[],
  groupSuggestions: Suggestion[]
): Suggestion[] {
  // Combine all suggestions
  const allSuggestions = [...individualSuggestions, ...groupSuggestions];

  // Sort by priority (highest first)
  allSuggestions.sort((a, b) => b.priority - a.priority);

  // Track which contacts have been included
  const includedContacts = new Set<string>();
  const balancedSuggestions: Suggestion[] = [];

  for (const suggestion of allSuggestions) {
    // Check if any contact in this suggestion is already included
    const hasOverlap = suggestion.contacts.some((c) => includedContacts.has(c.id));

    if (!hasOverlap) {
      // Add this suggestion
      balancedSuggestions.push(suggestion);

      // Mark all contacts as included
      for (const contact of suggestion.contacts) {
        includedContacts.add(contact.id);
      }
    }
  }

  return balancedSuggestions;
}

/**
 * Generate suggestions for a user (enhanced with group support)
 *
 * Requirements: 8.1, 8.2, 9.1, 9.2
 * Property 7: Suggestion type balance
 *
 * Generates both individual and group suggestions, then balances them.
 */
export async function generateSuggestions(
  userId: string,
  availableSlots: TimeSlot[],
  currentDate: Date = new Date()
): Promise<Suggestion[]> {
  // Import group matching service
  const { groupMatchingService, GROUP_SUGGESTION_THRESHOLD } = await import(
    './group-matching-service'
  );

  // Get all contacts for the user
  const contacts = await contactService.listContacts(userId);

  // Generate individual timebound suggestions
  const individualSuggestions = await generateTimeboundSuggestions(
    userId,
    availableSlots,
    currentDate
  );

  // Find potential groups
  const potentialGroups = await groupMatchingService.findPotentialGroups(contacts, 3);

  // Generate group suggestions
  const groupSuggestions: Suggestion[] = [];
  let slotIndex = 0;

  for (const group of potentialGroups) {
    if (slotIndex >= availableSlots.length) break;

    // Only create group suggestion if shared context exceeds threshold
    if (group.sharedContext.score >= GROUP_SUGGESTION_THRESHOLD) {
      const slot = availableSlots[slotIndex];
      const suggestion = await generateGroupSuggestion(userId, group, slot, currentDate);

      if (suggestion) {
        groupSuggestions.push(suggestion);
        slotIndex++;
      }
    }
  }

  // Balance suggestions to ensure contact uniqueness and type balance
  const balancedSuggestions = balanceSuggestions(individualSuggestions, groupSuggestions);

  return balancedSuggestions;
}
