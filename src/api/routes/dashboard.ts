/**
 * Dashboard API Routes
 *
 * GET /api/dashboard — Home dashboard data (action items, insights, quick actions, nudges)
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.9
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import pool from '../../db/connection';
import { getVisibleNudges } from '../../contacts/nudge-service';

const router = Router();

/**
 * GET /
 *
 * Returns dashboard data including action items, relationship insights,
 * quick action links, and visible nudge cards.
 * Handles zero state when user has no enrichment data.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.9
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

      res.json({
        actionItems,
        insights,
        quickActions,
        nudges,
        zeroState,
      });
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  },
);

export default router;
