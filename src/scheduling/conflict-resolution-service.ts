/**
 * Conflict Resolution Service
 *
 * AI-powered conflict resolution using Google Gemini.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as schedulingRepository from './scheduling-repository';
import * as availabilityCollectionService from './availability-collection-service';
import {
  CatchupPlan,
  PlanInvitee,
  InviteeAvailability,
  ConflictSuggestion,
  ConflictAnalysis,
  SlotOverlap,
} from '../types/scheduling';

/**
 * Initialize Gemini client
 */
function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GOOGLE_GEMINI_API_KEY not set, AI suggestions will be disabled');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Analyze conflicts and generate suggestions
 */
export async function analyzeConflicts(
  planId: string,
  userId: string
): Promise<ConflictAnalysis> {
  const plan = await schedulingRepository.getPlanById(planId);
  if (!plan || plan.userId !== userId) {
    throw new Error('Plan not found or access denied');
  }

  // Get availability data
  const { initiatorAvailability, inviteeAvailability } =
    await availabilityCollectionService.getAvailabilityForPlan(planId, userId);

  // Calculate overlaps
  const overlaps = await availabilityCollectionService.calculateOverlaps(planId, userId);

  // Find perfect overlap slots
  const perfectOverlapSlots: string[] = [];
  const nearOverlapSlots: { slot: string; missingAttendees: string[] }[] = [];

  overlaps.forEach((overlap, slot) => {
    if (overlap.isPerfectOverlap) {
      perfectOverlapSlots.push(slot);
    } else if (overlap.mustAttendCount === overlap.totalMustAttend - 1) {
      // Find missing attendees
      const missingAttendees = findMissingAttendees(plan, overlap, initiatorAvailability);
      nearOverlapSlots.push({ slot, missingAttendees });
    }
  });

  // Generate AI suggestions if no perfect overlap
  let suggestions: ConflictSuggestion[] = [];
  if (perfectOverlapSlots.length === 0) {
    suggestions = await generateAISuggestions(
      plan,
      inviteeAvailability,
      initiatorAvailability,
      overlaps
    );
  }

  return {
    hasPerfectOverlap: perfectOverlapSlots.length > 0,
    perfectOverlapSlots: perfectOverlapSlots.sort(),
    nearOverlapSlots: nearOverlapSlots.sort((a, b) => a.slot.localeCompare(b.slot)),
    suggestions: rankSuggestions(suggestions),
  };
}


/**
 * Generate AI suggestions for conflict resolution
 */
async function generateAISuggestions(
  plan: CatchupPlan,
  inviteeAvailability: InviteeAvailability[],
  initiatorAvailability: string[],
  overlaps: Map<string, SlotOverlap>
): Promise<ConflictSuggestion[]> {
  const genAI = getGeminiClient();
  if (!genAI) {
    return generateFallbackSuggestions(plan, overlaps);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build availability summary (limit to top 20 slots by overlap count)
    const sortedSlots = Array.from(overlaps.entries())
      .sort((a, b) => b[1].availableCount - a[1].availableCount)
      .slice(0, 20);

    const prompt = buildPrompt(plan, sortedSlots);

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]) as ConflictSuggestion[];
      // Validate suggestions are within date range
      return suggestions.filter((s) => validateSuggestion(s, plan));
    }
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
  }

  return generateFallbackSuggestions(plan, overlaps);
}

/**
 * Build the prompt for Gemini
 */
function buildPrompt(
  plan: CatchupPlan,
  sortedSlots: [string, SlotOverlap][]
): string {
  const mustAttendInvitees = plan.invitees.filter((i) => i.attendanceType === 'must_attend');
  const niceToHaveInvitees = plan.invitees.filter((i) => i.attendanceType === 'nice_to_have');

  return `You are helping schedule a group catchup. Analyze the availability data and suggest solutions.

Plan Details:
- Activity: ${plan.activityType || 'General catchup'}
- Duration: ${plan.duration} minutes
- Date Range: ${plan.dateRangeStart} to ${plan.dateRangeEnd}

Participants:
- Initiator (must attend)
${mustAttendInvitees.map((i) => `- ${i.contactName} (must attend)`).join('\n')}
${niceToHaveInvitees.map((i) => `- ${i.contactName} (nice to have)`).join('\n')}

Availability Summary (sorted by most available):
${sortedSlots
  .map(
    ([slot, overlap]) =>
      `- ${slot}: ${overlap.mustAttendCount}/${overlap.totalMustAttend} must-attend, ${overlap.availableCount} total available`
  )
  .join('\n')}

Generate up to 3 suggestions to resolve scheduling conflicts. Consider:
1. Alternative times within the date range that maximize attendance
2. Whether excluding a "nice-to-have" attendee opens up better options
3. Whether a shorter activity (like video call instead of dinner) might work better

Return ONLY a JSON array with suggestions (no other text):
[
  {
    "type": "time_suggestion",
    "suggestedTime": "YYYY-MM-DD_HH:mm format",
    "attendeeCount": number,
    "reasoning": "brief explanation"
  }
]

Valid types: "time_suggestion", "exclude_attendee", "activity_change"
For exclude_attendee, include "excludeeName" field.
For activity_change, include "alternativeActivity" field.`;
}

/**
 * Generate fallback suggestions without AI
 */
function generateFallbackSuggestions(
  plan: CatchupPlan,
  overlaps: Map<string, SlotOverlap>
): ConflictSuggestion[] {
  const suggestions: ConflictSuggestion[] = [];

  // Find slots with highest must-attend count
  const sortedSlots = Array.from(overlaps.entries())
    .filter(([_, overlap]) => overlap.mustAttendCount > 0)
    .sort((a, b) => {
      // Sort by must-attend count first, then by total available
      if (b[1].mustAttendCount !== a[1].mustAttendCount) {
        return b[1].mustAttendCount - a[1].mustAttendCount;
      }
      return b[1].availableCount - a[1].availableCount;
    })
    .slice(0, 3);

  sortedSlots.forEach(([slot, overlap]) => {
    suggestions.push({
      type: 'time_suggestion',
      suggestedTime: slot,
      attendeeCount: overlap.availableCount,
      reasoning: `${overlap.mustAttendCount} of ${overlap.totalMustAttend} required participants available, ${overlap.availableCount} total.`,
    });
  });

  // Suggest excluding nice-to-have if it would help
  const niceToHaveInvitees = plan.invitees.filter((i) => i.attendanceType === 'nice_to_have');
  if (niceToHaveInvitees.length > 0 && suggestions.length < 3) {
    suggestions.push({
      type: 'exclude_attendee',
      excludeeName: niceToHaveInvitees[0].contactName,
      reasoning: `Excluding ${niceToHaveInvitees[0].contactName} (optional attendee) may open up more scheduling options.`,
    });
  }

  return suggestions;
}

/**
 * Validate that a suggestion is within the plan's date range
 */
function validateSuggestion(suggestion: ConflictSuggestion, plan: CatchupPlan): boolean {
  if (suggestion.type === 'time_suggestion' && suggestion.suggestedTime) {
    const suggestedDate = suggestion.suggestedTime.split('_')[0];
    return suggestedDate >= plan.dateRangeStart && suggestedDate <= plan.dateRangeEnd;
  }
  return true;
}

/**
 * Rank suggestions by quality
 */
export function rankSuggestions(suggestions: ConflictSuggestion[]): ConflictSuggestion[] {
  return suggestions.sort((a, b) => {
    // Prioritize time suggestions over other types
    if (a.type === 'time_suggestion' && b.type !== 'time_suggestion') return -1;
    if (b.type === 'time_suggestion' && a.type !== 'time_suggestion') return 1;

    // Then by attendee count (higher is better)
    return (b.attendeeCount || 0) - (a.attendeeCount || 0);
  });
}

/**
 * Find missing attendees for a slot
 */
function findMissingAttendees(
  plan: CatchupPlan,
  overlap: SlotOverlap,
  initiatorAvailability: string[]
): string[] {
  const missingAttendees: string[] = [];

  // Check if initiator is missing
  if (!overlap.availableParticipants.some((p) => p.name === 'You')) {
    missingAttendees.push('You');
  }

  // Check which must-attend invitees are missing
  plan.invitees
    .filter((i) => i.attendanceType === 'must_attend')
    .forEach((invitee) => {
      if (!overlap.availableParticipants.some((p) => p.name === invitee.contactName)) {
        missingAttendees.push(invitee.contactName);
      }
    });

  return missingAttendees;
}
