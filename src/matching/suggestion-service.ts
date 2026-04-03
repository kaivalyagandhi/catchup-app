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
  ConnectionGoal,
  ExtendedSignalContribution,
} from '../types';
import * as suggestionRepository from './suggestion-repository';
import { SuggestionCreateData, SuggestionFilters } from './suggestion-repository';
import { contactService } from '../contacts/service';
import { interactionService } from '../contacts/interaction-service';
// import { frequencyService } from '../contacts/frequency-service';
import { getOrSetCache, CacheKeys, CacheTTL, invalidateSuggestionCache } from '../utils/cache';
import pool from '../db/connection';
import { ConnectionGoalService } from './connection-goal-service';
import { SuggestionPauseService } from './suggestion-pause-service';

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
  // Compute days since last contact for reasoning (Req 3.2)
  const lastContactForReasoning = contact.lastContactDate ? new Date(contact.lastContactDate) : null;
  const daysSinceLastContact = lastContactForReasoning
    ? Math.floor((currentDate.getTime() - lastContactForReasoning.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const reasonParts: string[] = [];

  // When frequency decay is primary signal, include preference and days (Req 3.2)
  if (contact.frequencyPreference && contact.frequencyPreference !== FrequencyOption.NA && daysSinceLastContact !== null) {
    reasonParts.push(`You usually catch up ${contact.frequencyPreference}, but it's been ${daysSinceLastContact} days`);
  } else {
    reasonParts.push(`It's been a while since you connected`);
    if (contact.frequencyPreference && contact.frequencyPreference !== FrequencyOption.NA) {
      reasonParts.push(`(${contact.frequencyPreference} preference)`);
    }
  }

  // Include sentiment context in reasoning (Req 17.3)
  const negativeSentiment = hasEnrichment && enrichment!.sentimentTrend === 'negative';
  if (negativeSentiment) {
    reasonParts.push(`— recent conversations had a negative tone, might be worth checking in`);
  }

  // When declining frequency, state that messaging frequency has dropped (Req 3.3)
  if (decliningFrequency && hasEnrichment) {
    if (enrichment!.topPlatform) {
      reasonParts.push(`— messaging frequency on ${enrichment!.topPlatform} has dropped`);
    } else {
      reasonParts.push(`— messaging frequency has dropped`);
    }
  }

  if (hasEnrichment && enrichment!.topPlatform && !decliningFrequency) {
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
 * Compute a goal-aware weighted suggestion score.
 * When goals are active, redistributes existing 4 weights (each × 0.80)
 * and adds a goalRelevance weight of 0.20 as a 5th signal.
 * When no goals are active, delegates to the original 4-signal computeWeightedScore.
 *
 * Requirements: 8.2, 16.1, 16.2, 16.8, 16.9
 * Property 39: Five-signal weight redistribution when goals active
 */
export function computeGoalAwareScore(
  contact: Contact,
  enrichment: EnrichmentSignal | null,
  weights: SuggestionSignalWeights,
  goals: ConnectionGoal[],
  currentDate: Date = new Date(),
): { score: number; reasoning: string; contribution: ExtendedSignalContribution } {
  const goalService = new ConnectionGoalService();

  // No active goals — use original 4-signal scoring
  if (goals.length === 0) {
    const result = computeWeightedScore(contact, enrichment, weights, currentDate);
    return {
      score: result.score,
      reasoning: result.reasoning,
      contribution: {
        ...result.contribution,
        goalRelevanceScore: 0,
      },
    };
  }

  // Redistribute weights: each original × 0.80, goalRelevance = 0.20
  const redistributedWeights: SuggestionSignalWeights = {
    enrichmentData: weights.enrichmentData * 0.80,
    interactionLogs: weights.interactionLogs * 0.80,
    calendarData: weights.calendarData * 0.80,
    contactMetadata: weights.contactMetadata * 0.80,
  };

  // Compute the base 4-signal score with redistributed weights
  const baseResult = computeWeightedScore(contact, enrichment, redistributedWeights, currentDate);

  // Compute goal relevance (0–100)
  const goalRelevanceRaw = goalService.computeGoalRelevance(contact, goals);

  // The base result score was computed with weights summing to 0.80.
  // We need to add the goal relevance contribution (weight 0.20) and re-clamp.
  const goalContribution = goalRelevanceRaw * 0.20;
  let finalScore = baseResult.score + goalContribution;

  // Apply the same declining frequency boost as computeWeightedScore
  // (already applied in baseResult.score, no need to re-apply)

  // Clamp to 0-100
  finalScore = Math.max(0, Math.min(100, finalScore));

  const contribution: ExtendedSignalContribution = {
    ...baseResult.contribution,
    goalRelevanceScore: goalContribution,
  };

  // When goalRelevanceScore > 0, append goal reference to reasoning (Req 16.7)
  let reasoning = baseResult.reasoning;
  if (goalContribution > 0) {
    // Find the first goal that contributed to the score
    const matchingGoal = goals.find(
      (g) => goalService.computeGoalRelevance(contact, [g]) > 0,
    );
    if (matchingGoal) {
      reasoning += ` — Relevant to your goal: ${matchingGoal.text}`;
    }
  }

  return {
    score: finalScore,
    reasoning,
    contribution,
  };
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

  // Schedule post-interaction review prompt 48 hours after acceptance (Req 13.1)
  await pool.query(
    `UPDATE suggestions SET review_prompt_after = NOW() + INTERVAL '48 hours' WHERE id = $1 AND user_id = $2`,
    [suggestionId, userId],
  );

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
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 11.4, 8.2, 16.8
 * Property 54: Feed displays pending suggestions
 * Property 56: Suggestion snooze behavior
 * Property 19: Paused users receive no suggestions
 * Property 12: Excluded contacts never appear in suggestions
 *
 * Returns pending suggestions, handling snoozed suggestions that should resurface.
 * Returns empty array if suggestions are paused.
 * Filters out excluded contacts.
 * Adds signalContribution with goalRelevanceScore to each suggestion.
 */
export async function getPendingSuggestions(
  userId: string,
  filters?: SuggestionFilters
): Promise<Suggestion[]> {
  // Check if suggestions are paused (Req 11.4)
  const pauseService = new SuggestionPauseService();
  const paused = await pauseService.isPaused(userId);
  if (paused) {
    return [];
  }

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

  // Fetch excluded contact IDs (Req 8.2)
  let excludedContactIds = new Set<string>();
  try {
    const { rows } = await pool.query(
      `SELECT contact_id FROM suggestion_exclusions WHERE user_id = $1`,
      [userId],
    );
    excludedContactIds = new Set(rows.map((r: any) => r.contact_id));
  } catch {
    // Table may not exist yet; proceed without exclusions
  }

  const now = new Date();

  // Filter and process suggestions
  const pendingSuggestions = allSuggestions.filter((suggestion) => {
    // Filter out excluded contacts (Req 8.2)
    if (excludedContactIds.has(suggestion.contactId)) {
      return false;
    }

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

  // Add signalContribution with goalRelevanceScore to each suggestion (Req 16.8)
  const goalService = new ConnectionGoalService();
  let activeGoals: ConnectionGoal[] = [];
  try {
    activeGoals = await goalService.getActiveGoals(userId);
  } catch {
    // Goals table may not exist yet
  }

  let weights: SuggestionSignalWeights = { ...DEFAULT_SIGNAL_WEIGHTS };
  try {
    weights = await getSignalWeights(userId);
  } catch {
    // Use defaults
  }

  for (const suggestion of pendingSuggestions) {
    // Find the contact from the suggestion's contacts array
    const contact = suggestion.contacts?.[0];
    if (contact) {
      let enrichment: EnrichmentSignal | null = null;
      try {
        enrichment = await getEnrichmentSignal(contact.id, userId);
      } catch {
        // Enrichment not available
      }

      const { contribution } = computeGoalAwareScore(
        contact,
        enrichment,
        weights,
        activeGoals,
        now,
      );

      // Attach signalContribution to the suggestion object
      (suggestion as any).signalContribution = contribution;

      // Generate and attach conversationStarter (Req 12.6)
      try {
        const starter = await generateConversationStarterWithTopics(
          contact,
          suggestion,
          enrichment,
          userId,
          activeGoals,
        );
        (suggestion as any).conversationStarter = starter;
      } catch {
        (suggestion as any).conversationStarter = interpolateName(
          selectFromPool(FALLBACK_POOL, contact.id),
          contact.name,
        );
      }
    } else {
      // No contact data available, attach default contribution
      (suggestion as any).signalContribution = {
        enrichmentScore: 0,
        interactionLogScore: 0,
        calendarScore: 0,
        metadataScore: 0,
        weights: weights,
        hasEnrichmentData: false,
        decliningFrequency: false,
        negativeSentiment: false,
        goalRelevanceScore: 0,
      } as ExtendedSignalContribution;
      (suggestion as any).conversationStarter = interpolateName(
        selectFromPool(FALLBACK_POOL, suggestion.contactId || ''),
        '',
      );
    }
  }

  return pendingSuggestions;
}

// ============================================
// Context-Aware Conversation Starter Utilities
// Requirements: 036-ui-suggestion-starters
// ============================================

/**
 * DJB2 hash of a contact ID string to a non-negative integer.
 * Pure, deterministic, no side effects.
 */
export function contactIdHash(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) + hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Select an item from a pool using contactIdHash for deterministic selection.
 */
export function selectFromPool<T>(pool: T[], contactId: string): T {
  if (pool.length === 0) return undefined as unknown as T;
  return pool[contactIdHash(contactId) % pool.length];
}

/**
 * Replace all [name] placeholders with the contact's name, or "them" if empty.
 */
export function interpolateName(template: string, name: string): string {
  const replacement = name && name.trim() ? name.trim() : 'them';
  return template.split('[name]').join(replacement);
}

/**
 * Categorize time since last contact into buckets.
 * <14d = recent, 14-28d = moderate, 29-90d = long, >90d = significant
 */
export function getTimeGapBucket(
  lastContactDate: Date,
  now: Date = new Date(),
): 'recent' | 'moderate' | 'long' | 'significant' | undefined {
  const diffMs = now.getTime() - lastContactDate.getTime();
  if (isNaN(diffMs)) return undefined;
  const days = diffMs / (1000 * 60 * 60 * 24);
  if (days < 14) return 'recent';
  if (days <= 28) return 'moderate';
  if (days <= 90) return 'long';
  return 'significant';
}

/**
 * Check if reasoning string contains any of the given signal keywords (case-insensitive).
 */
export function isReasoningSignal(reasoning: string | undefined, signals: string[]): boolean {
  if (!reasoning) return false;
  const lower = reasoning.toLowerCase();
  return signals.some((s) => lower.includes(s.toLowerCase()));
}

// ============================================
// Starter Template Constants
// ============================================

export const FALLBACK_POOL: string[] = [
  "A quick hello to [name] could brighten both your days",
  "Drop [name] a line — no reason needed",
  "Thinking of [name]? That's reason enough to reach out",
  "A short message to [name] can go a long way",
  "Why not check in on [name] today?",
  "Send [name] a quick note — small gestures matter",
  "Reach out to [name] — you never know what they're going through",
  "A simple 'hey' to [name] keeps the connection alive",
  "Take a moment to reconnect with [name]",
  "It costs nothing to say hi to [name]",
  "Show [name] you're thinking of them with a quick message",
  "Life gets busy — [name] would appreciate hearing from you",
  "A little effort goes a long way — drop [name] a note",
  "Surprise [name] with a friendly check-in",
  "You don't need a reason to reach out to [name]",
  "Keep the connection warm — send [name] a quick hello",
  "Even a short message to [name] can make their day",
];

export const CIRCLE_STARTERS: Record<string, string[]> = {
  inner: [
    "Check in on how [name]'s doing — you two go way back",
    "Life's too short — catch up with [name] today",
    "[name] is one of your closest — make time for them",
  ],
  close: [
    "It's been a minute — drop [name] a quick hello",
    "Reach out to [name] — good friends stay in touch",
    "[name] would love to hear from you — send a quick note",
  ],
  active: [
    "Haven't heard from [name] in a while — worth a quick catch-up",
    "Keep the momentum going — check in with [name]",
    "A quick message to [name] keeps the friendship fresh",
  ],
  casual: [
    "Touch base with [name] — keep the connection alive",
    "A brief hello to [name] goes a long way",
    "Stay on [name]'s radar with a quick check-in",
  ],
};

export const TIME_GAP_STARTERS: Record<string, string[]> = {
  recent: [
    "You chatted recently — keep the momentum going with [name]",
    "Great timing — follow up with [name] while it's fresh",
  ],
  moderate: [
    "It's been a couple weeks — a quick message to [name] would be nice",
    "Two weeks since you last connected — drop [name] a line",
  ],
  long: [
    "It's been over a month — [name] would probably love to hear from you",
    "Time flies — reconnect with [name] before too long",
  ],
  significant: [
    "It's been a while — even a simple hello can rekindle the connection with [name]",
    "It's been too long — [name] would appreciate hearing from you",
  ],
};

export const COMBINED_STARTERS: Record<string, Record<string, string[]>> = {
  inner: {
    recent: [
      "You just caught up with [name] — keep the good vibes going",
    ],
    moderate: [
      "It's been a couple weeks since you talked to [name] — check in on them",
    ],
    long: [
      "Over a month since you caught up with [name] — they'd love to hear from you",
    ],
    significant: [
      "It's been too long since you caught up with [name] — they'd love to hear from you",
    ],
  },
  close: {
    recent: [
      "You connected with [name] recently — a quick follow-up keeps it going",
    ],
    moderate: [
      "A couple weeks since you talked to [name] — drop them a note",
    ],
    long: [
      "It's been over a month — [name] would appreciate a catch-up",
    ],
    significant: [
      "Way too long since you talked to [name] — time to reconnect",
    ],
  },
  active: {
    recent: [
      "You spoke with [name] recently — keep the conversation going",
    ],
    moderate: [
      "It's been a few weeks — check in with [name]",
    ],
    long: [
      "Over a month since you connected with [name] — worth reaching out",
    ],
    significant: [
      "It's been a while since you heard from [name] — a quick hello goes far",
    ],
  },
  casual: {
    recent: [
      "You connected with [name] recently — a quick follow-up keeps it going",
    ],
    moderate: [
      "A couple weeks since you touched base with [name] — stay connected",
    ],
    long: [
      "It's been over a month — a brief note to [name] keeps the connection warm",
    ],
    significant: [
      "It's been a while since you connected with [name] — even a short hello helps",
    ],
  },
};

export const GOAL_STARTERS: { network: string[]; reconnect: string[]; generic: string[] } = {
  network: [
    "They could be a great connection for your networking goal — reach out to [name]",
    "[name] fits your professional networking goal — say hello",
    "Your networking goal aligns well with [name] — make the connection",
  ],
  reconnect: [
    "Perfect time to reconnect — [name] is exactly who your goal is about",
    "Your reconnection goal is calling — reach out to [name]",
    "[name] is a key part of your reconnect goal — check in today",
  ],
  generic: [
    "Reaching out to [name] supports your connection goal",
    "[name] aligns with one of your active goals — say hi",
    "Your goal to stay connected applies here — message [name]",
  ],
};

/**
 * Generate a conversation starter for a suggestion card.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 * Requirements: 036-ui-suggestion-starters (all)
 *
 * Priority order:
 * 1. Shared interests/tags (skip if reasoning mentions shared activity)
 * 2. Calendar event context (skip if reasoning mentions shared activity)
 * 3. Enrichment signal context (skip if reasoning mentions frequency/declining)
 * 4. Goal-aware starter (skip if reasoning mentions a goal)
 * 5. Combined Dunbar circle + time-gap (or single dimension)
 * 6. Fallback pool via contactIdHash
 *
 * All results pass through interpolateName before return.
 */
export function generateConversationStarter(
  contact: Contact,
  suggestion: Suggestion,
  enrichment: EnrichmentSignal | null,
  goals?: ConnectionGoal[],
): string {
  const reasoning = suggestion.reasoning;

  // Reasoning signal checks
  const hasSharedActivitySignal = isReasoningSignal(reasoning, ['shared activity']);
  const hasFrequencySignal = isReasoningSignal(reasoning, ['frequency decay', 'declining']);
  const hasGoalSignal = isReasoningSignal(reasoning, ['connection goal', 'goal']);

  // 1. Shared interests/tags (Req 12.2) — skip if reasoning mentions shared activity
  if (!hasSharedActivitySignal && contact.tags && contact.tags.length > 0) {
    if (suggestion.triggerType === TriggerType.SHARED_ACTIVITY && suggestion.reasoning) {
      const reasoningLower = suggestion.reasoning.toLowerCase();
      const matchingTags = contact.tags.filter((t) =>
        reasoningLower.includes(t.text.toLowerCase()),
      );
      if (matchingTags.length > 0) {
        const tagText = matchingTags[0].text;
        return interpolateName(
          `You both follow ${tagText} — ask about their recent experience`,
          contact.name,
        );
      }
    }

    if (contact.tags.length > 0) {
      const tagText = contact.tags[0].text;
      return interpolateName(
        `You both follow ${tagText} — ask about their recent experience`,
        contact.name,
      );
    }
  }

  // 2. Calendar event context (Req 12.3) — skip if reasoning mentions shared activity
  if (
    !hasSharedActivitySignal &&
    suggestion.triggerType === TriggerType.SHARED_ACTIVITY &&
    suggestion.calendarEventId
  ) {
    const eventTitle = suggestion.reasoning?.split(':')[0]?.trim();
    if (eventTitle) {
      return interpolateName(
        `You're both attending ${eventTitle} — suggest grabbing coffee after`,
        contact.name,
      );
    }
  }

  // 3. Enrichment signal context (Req 12.4) — skip if reasoning mentions frequency/declining
  if (!hasFrequencySignal) {
    if (enrichment && enrichment.frequencyTrend === 'declining' && enrichment.topPlatform) {
      return interpolateName(
        `Last time you talked about catching up via ${enrichment.topPlatform} — check in on how things are going`,
        contact.name,
      );
    }

    if (enrichment && enrichment.lastMessageDate && enrichment.topPlatform) {
      return interpolateName(
        `You last connected via ${enrichment.topPlatform} — pick up where you left off`,
        contact.name,
      );
    }
  }

  // 4. Goal-aware starter — skip if reasoning already mentions a goal
  if (!hasGoalSignal && goals && goals.length > 0) {
    const goalService = new ConnectionGoalService();
    const relevance = goalService.computeGoalRelevance(contact, goals);
    if (relevance > 0) {
      // Find the best matching goal
      const matchingGoal = goals[0];
      const goalKeywords = matchingGoal.keywords.map((k) => k.toLowerCase());

      let starterPool: string[];
      if (goalKeywords.some((k) => k === 'network' || k === 'professional')) {
        starterPool = GOAL_STARTERS.network;
      } else if (
        goalKeywords.some((k) => k === 'reconnect') &&
        (contact.dunbarCircle === 'inner' || contact.dunbarCircle === 'close')
      ) {
        starterPool = GOAL_STARTERS.reconnect;
      } else {
        starterPool = GOAL_STARTERS.generic;
      }

      const starter = selectFromPool(starterPool, contact.id);
      if (starter) {
        return interpolateName(starter, contact.name);
      }
    }
  }

  // 5. Combined Dunbar circle + time-gap (or single dimension)
  const circle = contact.dunbarCircle;
  const lastDate = contact.lastContactDate;
  const bucket = lastDate ? getTimeGapBucket(lastDate) : undefined;

  if (circle && bucket) {
    // Combined starter
    const combinedForCircle = COMBINED_STARTERS[circle];
    if (combinedForCircle && combinedForCircle[bucket] && combinedForCircle[bucket].length > 0) {
      const starter = selectFromPool(combinedForCircle[bucket], contact.id);
      if (starter) {
        return interpolateName(starter, contact.name);
      }
    }
  }

  if (circle && CIRCLE_STARTERS[circle] && CIRCLE_STARTERS[circle].length > 0) {
    const starter = selectFromPool(CIRCLE_STARTERS[circle], contact.id);
    if (starter) {
      return interpolateName(starter, contact.name);
    }
  }

  if (bucket && TIME_GAP_STARTERS[bucket] && TIME_GAP_STARTERS[bucket].length > 0) {
    const starter = selectFromPool(TIME_GAP_STARTERS[bucket], contact.id);
    if (starter) {
      return interpolateName(starter, contact.name);
    }
  }

  // 6. Fallback pool
  const fallback = selectFromPool(FALLBACK_POOL, contact.id);
  return interpolateName(fallback, contact.name);
}

/**
 * Fetch enrichment topics for a contact from enrichment_records.
 * Returns the first non-empty topics array found.
 */
async function getEnrichmentTopics(contactId: string, userId: string): Promise<string[]> {
  try {
    const { rows } = await pool.query(
      `SELECT topics FROM enrichment_records
       WHERE contact_id = $1 AND user_id = $2
       AND topics IS NOT NULL AND topics != '[]'::jsonb
       ORDER BY last_message_date DESC NULLS LAST
       LIMIT 1`,
      [contactId, userId],
    );
    if (rows.length > 0 && Array.isArray(rows[0].topics)) {
      return rows[0].topics;
    }
  } catch {
    // Table may not exist yet
  }
  return [];
}

/**
 * Generate a conversation starter with enrichment topics from the database.
 * This is the async version that fetches topics for richer starters.
 *
 * Requirements: 12.4, 12.6, 036-ui-suggestion-starters
 */
async function generateConversationStarterWithTopics(
  contact: Contact,
  suggestion: Suggestion,
  enrichment: EnrichmentSignal | null,
  userId: string,
  goals?: ConnectionGoal[],
): Promise<string> {
  // Fetch goals if not provided
  let activeGoals = goals;
  if (!activeGoals) {
    try {
      const goalService = new ConnectionGoalService();
      activeGoals = await goalService.getActiveGoals(userId);
    } catch {
      activeGoals = [];
    }
  }

  // First try the synchronous version for tags, calendar, enrichment, goals, circle, time-gap
  const syncStarter = generateConversationStarter(contact, suggestion, enrichment, activeGoals);

  // If we got a non-fallback result (not from the pool), use it
  const isFromFallbackPool = FALLBACK_POOL.some(
    (tpl) => interpolateName(tpl, contact.name) === syncStarter,
  );
  if (!isFromFallbackPool) {
    return syncStarter;
  }

  // Try enrichment topics from DB (Req 12.4) — sits between enrichment and goal-aware
  if (enrichment) {
    const topics = await getEnrichmentTopics(contact.id, userId);
    if (topics.length > 0) {
      return interpolateName(
        `Last time you talked about ${topics[0]} — check in on how it's going`,
        contact.name,
      );
    }
  }

  return syncStarter;
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
 * Generate contact-based suggestions without timeslots.
 * V1 approach: scores all contacts using enrichment signals and creates
 * suggestions for the top contacts that need a catch-up.
 * No calendar scheduling dependency.
 *
 * Requirements: 17.1, 17.2, 032-v1-contact-enrichment-redesign
 */
export async function generateContactSuggestions(
  userId: string,
  maxSuggestions: number = 10,
  currentDate: Date = new Date(),
): Promise<Suggestion[]> {
  // Get all contacts
  const contacts = await contactService.listContacts(userId);

  // Get signal weights and active goals
  let weights: SuggestionSignalWeights = { ...DEFAULT_SIGNAL_WEIGHTS };
  try { weights = await getSignalWeights(userId); } catch { /* use defaults */ }

  const goalService = new ConnectionGoalService();
  let activeGoals: ConnectionGoal[] = [];
  try { activeGoals = await goalService.getActiveGoals(userId); } catch { /* no goals */ }

  // Fetch excluded contacts
  let excludedContactIds = new Set<string>();
  try {
    const { rows } = await pool.query(
      `SELECT contact_id FROM suggestion_exclusions WHERE user_id = $1`,
      [userId],
    );
    excludedContactIds = new Set(rows.map((r: any) => r.contact_id));
  } catch { /* table may not exist */ }

  // Fetch existing pending suggestion contact IDs to avoid duplicates
  let existingPendingContactIds = new Set<string>();
  try {
    const { rows } = await pool.query(
      `SELECT contact_id FROM suggestions WHERE user_id = $1 AND status = 'pending'`,
      [userId],
    );
    existingPendingContactIds = new Set(rows.map((r: any) => r.contact_id));
  } catch { /* ok */ }

  // Score all eligible contacts
  const scored: Array<{ contact: Contact; score: number; reasoning: string }> = [];

  for (const contact of contacts) {
    if (contact.archived) continue;
    if (excludedContactIds.has(contact.id)) continue;
    if (existingPendingContactIds.has(contact.id)) continue;

    let enrichment: EnrichmentSignal | null = null;
    try { enrichment = await getEnrichmentSignal(contact.id, userId); } catch { /* ok */ }

    const { score, reasoning } = computeGoalAwareScore(contact, enrichment, weights, activeGoals, currentDate);
    scored.push({ contact, score, reasoning });
  }

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  const topContacts = scored.slice(0, maxSuggestions);

  // Create suggestions
  const suggestions: Suggestion[] = [];
  for (const { contact, reasoning } of topContacts) {
    try {
      const suggestion = await suggestionRepository.create({
        userId,
        contactId: contact.id,
        triggerType: TriggerType.TIMEBOUND,
        reasoning,
      });
      suggestions.push(suggestion);
    } catch (err) {
      console.error(`[generateContactSuggestions] Failed to create suggestion for contact ${contact.id}:`, err);
    }
  }

  return suggestions;
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
