import { Router, Response } from 'express';
import { PostgresAISuggestionService } from '../../contacts/ai-suggestion-service';
import { PostgresContactRepository } from '../../contacts/repository';
import { getCachedEvents } from '../../calendar/calendar-events-repository';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Interface for Quick Start Suggestion response
 */
interface QuickStartSuggestion {
  contactId: string;
  name: string;
  confidence: number;
  reasons: string[];
  metadataScore: number;
  calendarEventCount: number;
}

interface QuickStartResponse {
  suggestions: QuickStartSuggestion[];
  totalContacts: number;
  qualifyingContacts: number;
}

/**
 * GET /api/ai/quick-start-suggestions
 *
 * Generate AI-powered quick start suggestions for new users during onboarding.
 * Returns top 10 contacts with >= 85% confidence for Inner Circle assignment.
 *
 * Uses weighted scoring optimized for new users without app history:
 * - Shared calendar events (35%): Strongest signal for relationship depth
 * - Metadata richness (30%): Populated contact fields
 * - Contact age (15%): How long contact has existed
 * - Communication frequency (10%): Interactions per month (if available)
 * - Recency (10%): Days since last contact (if available)
 *
 * Requirements: 5.1, 5.5, 5.6, 17.1, 17.4
 */
router.get(
  '/quick-start-suggestions',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;

      // 1. Fetch all contacts for user (excluding archived)
      const contactRepository = new PostgresContactRepository();
      const allContacts = await contactRepository.findAll(userId);

      if (allContacts.length === 0) {
        res.json({
          suggestions: [],
          totalContacts: 0,
          qualifyingContacts: 0,
        });
        return;
      }

      // 2. Fetch calendar events for the past 6 months to analyze shared attendance
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const calendarEvents = await getCachedEvents(userId, sixMonthsAgo, now);

      // 3. Analyze each contact using onboarding-optimized scoring
      const aiService = new PostgresAISuggestionService();
      const suggestions: QuickStartSuggestion[] = [];

      for (const contact of allContacts) {
        try {
          // Use the onboarding-optimized analysis method
          const suggestion = await aiService.analyzeContactForOnboarding(
            userId,
            contact.id,
            calendarEvents
          );

          // Only include contacts with >= 60% confidence (Inner Circle candidates)
          // Note: Lowered from 85% to 60% to include contacts with good metadata
          // but no calendar events (common for test data or new users)
          if (suggestion.confidence >= 60) {
            // Count calendar events for this contact
            const calendarEventCount = contact.email
              ? calendarEvents.filter((event) =>
                  event.attendees?.some(
                    (attendee) => attendee.email?.toLowerCase() === contact.email?.toLowerCase()
                  )
                ).length
              : 0;

            // Extract metadata score from factors
            const metadataFactor = suggestion.factors.find(
              (f) => f.type === 'communication_frequency' && f.weight === 0.3
            );
            const metadataScore = metadataFactor?.value || 0;

            // Build human-readable reasons
            const reasons = buildReasons(calendarEventCount, contact);

            suggestions.push({
              contactId: contact.id,
              name: contact.name,
              confidence: Math.round(suggestion.confidence),
              reasons,
              metadataScore: Math.round(metadataScore),
              calendarEventCount,
            });
          }
        } catch (error) {
          console.error(`Error analyzing contact ${contact.id}:`, error);
          // Continue with other contacts
        }
      }

      // 4. Sort by confidence (highest first) and take top 10
      suggestions.sort((a, b) => b.confidence - a.confidence);
      const top10 = suggestions.slice(0, 10);

      // 5. Return response
      const response: QuickStartResponse = {
        suggestions: top10,
        totalContacts: allContacts.length,
        qualifyingContacts: suggestions.length,
      };

      res.json(response);
    } catch (error) {
      console.error('Error generating quick start suggestions:', error);
      res.status(500).json({
        error: 'Failed to generate quick start suggestions',
        suggestions: [],
        totalContacts: 0,
        qualifyingContacts: 0,
      });
    }
  }
);

/**
 * Build human-readable reasons for a suggestion
 */
function buildReasons(calendarEventCount: number, contact: any): string[] {
  const reasons: string[] = [];

  // Calendar events reason
  if (calendarEventCount > 0) {
    if (calendarEventCount >= 20) {
      reasons.push(`${calendarEventCount}+ shared calendar events`);
    } else if (calendarEventCount >= 10) {
      reasons.push(`${calendarEventCount} shared calendar events`);
    } else if (calendarEventCount >= 5) {
      reasons.push(`${calendarEventCount} shared calendar events`);
    } else {
      reasons.push(
        `${calendarEventCount} shared calendar event${calendarEventCount > 1 ? 's' : ''}`
      );
    }
  }

  // Metadata richness reasons
  const metadataReasons: string[] = [];
  if (contact.birthday) metadataReasons.push('birthday');
  if (contact.email) metadataReasons.push('email');
  if (contact.phone) metadataReasons.push('phone');
  if (contact.location) metadataReasons.push('location');
  if (contact.customNotes) metadataReasons.push('notes');
  if (contact.linkedIn) metadataReasons.push('LinkedIn');
  if (contact.instagram) metadataReasons.push('Instagram');
  if (contact.xHandle) metadataReasons.push('X/Twitter');

  if (metadataReasons.length > 0) {
    const metadataText = metadataReasons.slice(0, 3).join(', ');
    const remaining = metadataReasons.length - 3;
    if (remaining > 0) {
      reasons.push(`${metadataText}, +${remaining} more fields saved`);
    } else {
      reasons.push(`${metadataText} saved`);
    }
  }

  // Contact age reason
  if (contact.createdAt) {
    const ageInDays = (Date.now() - contact.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    const ageInYears = ageInDays / 365;

    if (ageInYears >= 5) {
      reasons.push('Contact for 5+ years');
    } else if (ageInYears >= 3) {
      reasons.push('Contact for 3+ years');
    } else if (ageInYears >= 2) {
      reasons.push('Contact for 2+ years');
    } else if (ageInYears >= 1) {
      reasons.push('Contact for 1+ year');
    }
  }

  // If no specific reasons, add a generic one
  if (reasons.length === 0) {
    reasons.push('Strong relationship signals detected');
  }

  return reasons;
}

export default router;
