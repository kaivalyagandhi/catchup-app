/**
 * Dashboard API Routes
 *
 * GET /api/dashboard — Home dashboard data (action items, insights, quick actions, nudges,
 *   suggestions, goals, pause state, pending reviews, weekly digest)
 *
 * Requirements: 2.1, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.9, 14.1, 14.2, 14.5, 14.6
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import pool from '../../db/connection';
import { getVisibleNudges } from '../../contacts/nudge-service';
import { SuggestionPauseService } from '../../matching/suggestion-pause-service';
import { ConnectionGoalService } from '../../matching/connection-goal-service';
import { FeedbackService } from '../../matching/feedback-service';
import { getPendingSuggestions } from '../../matching/suggestion-service';

const router = Router();

/**
 * Get the most recent Monday at 00:00 UTC.
 * If today is Monday, returns today at 00:00 UTC.
 */
function getMostRecentMondayUTC(now: Date = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since last Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

/**
 * GET /
 *
 * Returns dashboard data including action items, relationship insights,
 * quick action links, visible nudge cards, suggestions, active goals,
 * pause state, pending reviews, and weekly digest.
 *
 * Requirements: 2.1, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.9, 14.1, 14.2, 14.5, 14.6
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // --- Action Items (Req 3.2) ---
      const [
        pendingEnrichmentsResult,
        pendingSyncResult,
        activeImportsResult,
        pendingMatchesResult,
      ] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) as cnt FROM pending_enrichments WHERE user_id = $1 AND status = 'pending'`,
          [userId],
        ),
        pool.query(
          `SELECT COUNT(*) as cnt FROM sync_back_operations WHERE user_id = $1 AND status = 'pending_review'`,
          [userId],
        ),
        pool.query(
          `SELECT COUNT(*) as cnt FROM import_records WHERE user_id = $1 AND status IN ('processing', 'parsed', 'enriching')`,
          [userId],
        ),
        pool.query(
          `SELECT COUNT(*) as cnt FROM pending_enrichments WHERE user_id = $1 AND status = 'pending' AND match_tier = 'likely'`,
          [userId],
        ),
      ]);

      const actionItems = {
        pendingEnrichments: parseInt(pendingEnrichmentsResult.rows[0]?.cnt || '0'),
        pendingSyncChanges: parseInt(pendingSyncResult.rows[0]?.cnt || '0'),
        activeImports: parseInt(activeImportsResult.rows[0]?.cnt || '0'),
        pendingLikelyMatches: parseInt(pendingMatchesResult.rows[0]?.cnt || '0'),
      };

      // --- Relationship Insights (Req 3.3) ---
      const [
        totalContactsResult,
        enrichedContactsResult,
        staleResult,
      ] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) as cnt FROM contacts WHERE user_id = $1 AND archived_at IS NULL`,
          [userId],
        ),
        pool.query(
          `SELECT COUNT(DISTINCT contact_id) as cnt FROM enrichment_records WHERE user_id = $1`,
          [userId],
        ),
        pool.query(
          `SELECT COUNT(*) as cnt FROM contacts
           WHERE user_id = $1 AND archived_at IS NULL
             AND (last_contact_date IS NULL OR last_contact_date < NOW() - INTERVAL '3 months')`,
          [userId],
        ),
      ]);

      // Top 5 "catch up soon" suggestions (contacts overdue or declining)
      const { rows: catchUpSoon } = await pool.query(
        `SELECT c.id, c.name, c.email, c.last_contact_date, c.frequency_preference, c.dunbar_circle
         FROM contacts c
         WHERE c.user_id = $1 AND c.archived_at IS NULL AND c.last_contact_date IS NOT NULL
         ORDER BY c.last_contact_date ASC
         LIMIT 5`,
        [userId],
      );

      const insights = {
        totalContacts: parseInt(totalContactsResult.rows[0]?.cnt || '0'),
        enrichedContacts: parseInt(enrichedContactsResult.rows[0]?.cnt || '0'),
        staleRelationships: parseInt(staleResult.rows[0]?.cnt || '0'),
        catchUpSoon: catchUpSoon.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          lastContactDate: c.last_contact_date,
          frequencyPreference: c.frequency_preference,
          circle: c.dunbar_circle,
        })),
      };

      // --- Quick Actions (Req 3.4) ---
      const quickActions = [
        { label: 'Import Chat History', url: '/app/import', icon: 'upload' },
        { label: 'Record Voice Note', url: '/app/voice', icon: 'mic' },
        { label: 'View All Contacts', url: '/app/directory', icon: 'contacts' },
        { label: 'Organize Circles', url: '/app/circles', icon: 'circles' },
      ];

      // --- Nudge Cards (Req 3.5) ---
      const nudges = await getVisibleNudges(userId);

      // --- Zero State (Req 3.9) ---
      const isZeroState = insights.totalContacts === 0 && insights.enrichedContacts === 0;
      let zeroState = null;
      if (isZeroState) {
        // Check if user has Google contacts with phone/email
        const { rows: googleStats } = await pool.query(
          `SELECT
             COUNT(*) as total,
             COUNT(CASE WHEN phone IS NOT NULL OR email IS NOT NULL THEN 1 END) as with_data
           FROM contacts WHERE user_id = $1`,
          [userId],
        );
        zeroState = {
          totalFromGoogle: parseInt(googleStats[0]?.total || '0'),
          withPhoneOrEmail: parseInt(googleStats[0]?.with_data || '0'),
          getStartedCard: {
            title: 'Get started with CatchUp',
            description: 'Enrich your contacts in three ways:',
            options: [
              'Import chat history from messaging platforms',
              'Connect your Google Calendar',
              'Record voice notes about your contacts',
            ],
          },
        };
      }

      // --- Suggestions, Goals, Pause, Reviews, Digest (Req 2.1, 2.3, 3.5, 3.6, 14.1, 14.2, 14.5, 14.6) ---
      const pauseService = new SuggestionPauseService();
      const goalService = new ConnectionGoalService();
      const feedbackService = new FeedbackService();

      let pauseState = null;
      let activeGoals: any[] = [];
      try {
        [pauseState, activeGoals] = await Promise.all([
          pauseService.getActivePause(userId),
          goalService.getActiveGoals(userId),
        ]);
      } catch {
        // New tables may not exist yet
      }

      const isPaused = pauseState !== null;

      // Fetch pending suggestions (returns [] if paused) — sorted by score descending (Req 2.3)
      let suggestions: any[] = [];
      try {
        suggestions = await getPendingSuggestions(userId);
      } catch {
        // Suggestion tables may not exist yet
      }

      // Map suggestions to include signalContribution, conversationStarter, goalRelevanceScore (Req 3.5, 3.6)
      const topSuggestions = suggestions.map((s: any) => ({
        id: s.id,
        contactId: s.contactId,
        contacts: s.contacts,
        type: s.type,
        triggerType: s.triggerType,
        reasoning: s.reasoning,
        status: s.status,
        priority: s.priority,
        proposedTimeslot: s.proposedTimeslot,
        signalContribution: s.signalContribution || null,
        conversationStarter: s.conversationStarter || null,
        goalRelevanceScore: s.signalContribution?.goalRelevanceScore ?? 0,
      }));

      // Fetch pending reviews
      let pendingReviews: any[] = [];
      try {
        pendingReviews = await feedbackService.getPendingReviews(userId);
      } catch {
        // Review tables may not exist yet
      }

      // --- Weekly Digest (Req 14.1, 14.2, 14.5, 14.6) ---
      let weeklyDigest: {
        show: boolean;
        summaries: Array<{ contactName: string; reasoning: string }>;
      } | null = null;

      const pendingCount = topSuggestions.filter((s: any) => s.status === 'pending').length;

      if (!isPaused && pendingCount > 0) {
        // Check last_digest_viewed_at against most recent Monday 00:00 UTC
        const mostRecentMonday = getMostRecentMondayUTC();
        let lastDigestViewedAt: Date | null = null;

        try {
          const prefResult = await pool.query(
            `SELECT last_digest_viewed_at FROM user_preferences WHERE user_id = $1`,
            [userId],
          );
          if (prefResult.rows.length > 0 && prefResult.rows[0].last_digest_viewed_at) {
            lastDigestViewedAt = new Date(prefResult.rows[0].last_digest_viewed_at);
          }
        } catch {
          // Column or table may not exist yet
        }

        const shouldShowDigest =
          lastDigestViewedAt === null || lastDigestViewedAt < mostRecentMonday;

        if (shouldShowDigest) {
          // Top 3 suggestion summaries (Req 14.2)
          const digestSuggestions = topSuggestions.slice(0, 3);
          const summaries = digestSuggestions.map((s: any) => {
            const contactName =
              s.contacts?.[0]?.name || 'Unknown';
            return {
              contactName,
              reasoning: s.reasoning || '',
            };
          });

          weeklyDigest = { show: true, summaries };

          // Update last_digest_viewed_at (Req 14.5)
          try {
            await pool.query(
              `UPDATE user_preferences SET last_digest_viewed_at = NOW() WHERE user_id = $1`,
              [userId],
            );
          } catch {
            // Column may not exist yet
          }
        }
      }

      res.json({
        actionItems,
        insights,
        quickActions,
        nudges,
        zeroState,
        suggestions: topSuggestions,
        activeGoals,
        pauseState: pauseState
          ? { active: true, pauseEnd: pauseState.pauseEnd, pauseStart: pauseState.pauseStart }
          : { active: false },
        pendingReviews,
        weeklyDigest,
      });
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  },
);

export default router;
