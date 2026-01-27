/**
 * AI Batch Suggestions API Routes
 * 
 * Provides endpoints for batch contact suggestions grouped by relationship signals.
 * Used during onboarding to help users quickly categorize contacts into circles.
 * 
 * Requirements: 6.1, 6.2, 17.2, 17.5
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, requestTimeout } from '../middleware/error-handler';
import { PostgresContactRepository, DunbarCircle } from '../../contacts/repository';
import { PostgresAISuggestionService } from '../../contacts/ai-suggestion-service';
import { getCachedEvents } from '../../calendar/calendar-events-repository';
import { Contact } from '../../types';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply request timeout (60 seconds for batch processing)
router.use(requestTimeout(60000));

/**
 * Contact batch for grouping contacts by signal strength
 */
interface ContactBatch {
  id: string;
  name: string;
  description: string;
  suggestedCircle: DunbarCircle;
  contacts: Contact[];
  signalStrength: 'high' | 'medium' | 'low';
  averageScore: number;
  signalType: 'calendar' | 'metadata' | 'communication' | 'mixed';
}

/**
 * Batch suggestions response
 */
interface BatchSuggestionsResponse {
  batches: ContactBatch[];
  uncategorized: Contact[];
  totalContacts: number;
}

/**
 * Contact with enriched scoring data
 */
interface ScoredContact extends Contact {
  calendarEventCount: number;
  metadataScore: number;
  overallScore: number;
}

/**
 * GET /api/ai/batch-suggestions
 * 
 * Returns contacts grouped by relationship signal strength for batch assignment.
 * Groups contacts into high/medium/low signal batches with suggested circles.
 * 
 * Requirements:
 * - 6.1: Group contacts by signal strength
 * - 6.2: Create batches based on combined signals
 * - 17.2: Provide batch-suggestions endpoint
 * - 17.5: Return batches with suggested circles and contact counts
 */
router.get(
  '/batch-suggestions',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;

    // Initialize services
    const contactRepository = new PostgresContactRepository();
    const aiService = new PostgresAISuggestionService(contactRepository);

    // 1. Fetch all uncategorized contacts (no circle assigned)
    const allContacts = await contactRepository.findAll(userId);
    const uncategorizedContacts = allContacts.filter(contact => !contact.dunbarCircle);

    if (uncategorizedContacts.length === 0) {
      res.json({
        batches: [],
        uncategorized: [],
        totalContacts: 0,
      });
      return;
    }

    // 2. Get calendar events for scoring (last 6 months to present)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const calendarEvents = await getCachedEvents(userId, sixMonthsAgo, now);

    // 3. Score each contact and calculate metadata/calendar metrics
    const scoredContacts: ScoredContact[] = await Promise.all(
      uncategorizedContacts.map(async (contact) => {
        // Calculate calendar event count
        const calendarEventCount = contact.email
          ? calendarEvents.filter(event =>
              event.attendees?.some(attendee =>
                attendee.email?.toLowerCase() === contact.email?.toLowerCase()
              )
            ).length
          : 0;

        // Calculate metadata richness score
        const metadataScore = calculateMetadataRichnessScore(contact);

        // Calculate overall score for sorting
        const overallScore = (calendarEventCount * 10) + metadataScore;

        return {
          ...contact,
          calendarEventCount,
          metadataScore,
          overallScore,
        };
      })
    );

    // 4. Group contacts by signal strength
    // Requirements 6.2:
    // - High signal (Close Friends): 5+ shared calendar events OR metadata richness score >= 40
    // - Medium signal (Active Friends): 2-4 shared calendar events OR metadata richness score 20-39
    // - Low signal (Casual Network): 0-1 shared calendar events AND metadata richness score < 20

    const highSignalContacts = scoredContacts.filter(
      contact => contact.calendarEventCount >= 5 || contact.metadataScore >= 40
    );

    const mediumSignalContacts = scoredContacts.filter(
      contact =>
        (contact.calendarEventCount >= 2 && contact.calendarEventCount <= 4) ||
        (contact.metadataScore >= 20 && contact.metadataScore < 40)
    ).filter(contact => !highSignalContacts.includes(contact)); // Exclude high signal

    const lowSignalContacts = scoredContacts.filter(
      contact =>
        contact.calendarEventCount <= 1 &&
        contact.metadataScore < 20
    );

    // 5. Create batches with suggested circles
    const batches: ContactBatch[] = [];

    // High signal batch → Close Friends
    if (highSignalContacts.length > 0) {
      const avgScore = highSignalContacts.reduce((sum, c) => sum + c.overallScore, 0) / highSignalContacts.length;
      const hasCalendarSignal = highSignalContacts.some(c => c.calendarEventCount >= 5);
      const hasMetadataSignal = highSignalContacts.some(c => c.metadataScore >= 40);

      batches.push({
        id: 'high-signal',
        name: 'Frequent Calendar Overlap',
        description: hasCalendarSignal && hasMetadataSignal
          ? `${highSignalContacts.length} contacts with frequent calendar events and rich contact information`
          : hasCalendarSignal
          ? `${highSignalContacts.length} contacts with frequent calendar events`
          : `${highSignalContacts.length} contacts with detailed contact information`,
        suggestedCircle: 'close',
        contacts: highSignalContacts.sort((a, b) => b.overallScore - a.overallScore),
        signalStrength: 'high',
        averageScore: avgScore,
        signalType: hasCalendarSignal && hasMetadataSignal ? 'mixed' : hasCalendarSignal ? 'calendar' : 'metadata',
      });
    }

    // Medium signal batch → Active Friends
    if (mediumSignalContacts.length > 0) {
      const avgScore = mediumSignalContacts.reduce((sum, c) => sum + c.overallScore, 0) / mediumSignalContacts.length;
      const hasCalendarSignal = mediumSignalContacts.some(c => c.calendarEventCount >= 2);
      const hasMetadataSignal = mediumSignalContacts.some(c => c.metadataScore >= 20);

      batches.push({
        id: 'medium-signal',
        name: 'Regular Contact',
        description: hasCalendarSignal && hasMetadataSignal
          ? `${mediumSignalContacts.length} contacts with some calendar events and contact details`
          : hasCalendarSignal
          ? `${mediumSignalContacts.length} contacts with some calendar events`
          : `${mediumSignalContacts.length} contacts with some contact details`,
        suggestedCircle: 'active',
        contacts: mediumSignalContacts.sort((a, b) => b.overallScore - a.overallScore),
        signalStrength: 'medium',
        averageScore: avgScore,
        signalType: hasCalendarSignal && hasMetadataSignal ? 'mixed' : hasCalendarSignal ? 'calendar' : 'metadata',
      });
    }

    // Low signal batch → Casual Network
    if (lowSignalContacts.length > 0) {
      const avgScore = lowSignalContacts.reduce((sum, c) => sum + c.overallScore, 0) / lowSignalContacts.length;

      batches.push({
        id: 'low-signal',
        name: 'Occasional Contact',
        description: `${lowSignalContacts.length} contacts with minimal interaction history`,
        suggestedCircle: 'casual',
        contacts: lowSignalContacts.sort((a, b) => b.overallScore - a.overallScore),
        signalStrength: 'low',
        averageScore: avgScore,
        signalType: 'metadata',
      });
    }

    // 6. Return response
    const response: BatchSuggestionsResponse = {
      batches,
      uncategorized: uncategorizedContacts,
      totalContacts: uncategorizedContacts.length,
    };

    res.json(response);
  })
);

/**
 * Calculate metadata richness score based on populated contact fields
 * Requirements: 5.4
 * 
 * Scoring:
 * - email: +5
 * - phone: +5
 * - location: +10
 * - customNotes: +10
 * - linkedIn: +5
 * - instagram: +5
 * - xHandle: +5
 * - otherSocialMedia: +5 per platform (max 15)
 * 
 * Normalized to 0-100 range
 */
function calculateMetadataRichnessScore(contact: Contact): number {
  let score = 0;

  // Email
  if (contact.email) score += 5;

  // Phone
  if (contact.phone) score += 5;

  // Location
  if (contact.location) score += 10;

  // Custom notes
  if (contact.customNotes) score += 10;

  // Social profiles
  if (contact.linkedIn) score += 5;
  if (contact.instagram) score += 5;
  if (contact.xHandle) score += 5;

  // Other social media platforms
  if (contact.otherSocialMedia) {
    const platformCount = Object.keys(contact.otherSocialMedia).length;
    score += Math.min(15, platformCount * 5); // Max 15 points for other platforms
  }

  // Normalize to 0-100 range
  // Maximum possible score is ~60 (all fields populated)
  // Multiply by 1.67 to scale to 100
  return Math.min(100, Math.round(score * 1.67));
}

export default router;
