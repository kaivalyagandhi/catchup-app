/**
 * Contacts Enrichment Columns API Routes
 *
 * GET  /api/contacts/enriched       — contacts list with enrichment columns
 * GET  /api/contacts/column-config   — get column configuration
 * PUT  /api/contacts/column-config   — update column configuration
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import pool from '../../db/connection';
import { FrequencyOption } from '../../types';

const router = Router();

/**
 * Frequency thresholds in days for health indicator computation.
 */
const FREQUENCY_THRESHOLDS: Record<string, number> = {
  [FrequencyOption.DAILY]: 1,
  [FrequencyOption.WEEKLY]: 7,
  [FrequencyOption.BIWEEKLY]: 14,
  [FrequencyOption.MONTHLY]: 30,
  [FrequencyOption.QUARTERLY]: 90,
  [FrequencyOption.YEARLY]: 365,
  [FrequencyOption.FLEXIBLE]: 60,
  [FrequencyOption.NA]: 365,
};

/**
 * Compute relationship health indicator for a contact.
 *
 * green:  within frequency window
 * yellow: within 1.5× the window
 * red:    beyond 1.5× the window
 * gray:   no data (no frequency preference or no interaction data)
 *
 * Requirements: 4.2
 */
export function computeHealthIndicator(
  lastInteractionDate: Date | null,
  frequencyPreference: string | null,
  currentDate: Date = new Date(),
): 'green' | 'yellow' | 'red' | 'gray' {
  if (!frequencyPreference || !lastInteractionDate) {
    return 'gray';
  }

  const threshold = FREQUENCY_THRESHOLDS[frequencyPreference];
  if (threshold === undefined) {
    return 'gray';
  }

  const daysSince = Math.floor(
    (currentDate.getTime() - new Date(lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSince <= threshold) return 'green';
  if (daysSince <= threshold * 1.5) return 'yellow';
  return 'red';
}

/**
 * Format a date as relative time string.
 * Requirements: 4.1
 */
export function formatRelativeTime(date: Date | null, now: Date = new Date()): string {
  if (!date) return 'No data';

  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'In the future';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  if (diffDays < 730) return '1 year ago';
  return `${Math.floor(diffDays / 365)} years ago`;
}

const DEFAULT_COLUMNS = ['name', 'lastInteraction', 'healthIndicator', 'sources', 'circle', 'groups'];

/**
 * GET /enriched
 *
 * Returns contacts list with enrichment columns:
 * - last interaction date (relative time)
 * - relationship health indicator
 * - platform source icons
 * - top topic tag
 *
 * Supports sorting by lastInteraction (asc/desc).
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6
 */
router.get(
  '/enriched',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sortBy = (req.query.sortBy as string) || 'name';
      const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'ASC' : 'DESC';
      const source = req.query.source as string | undefined;

      let orderClause = 'c.name ASC';
      if (sortBy === 'lastInteraction') {
        orderClause = `c.last_contact_date ${sortOrder} NULLS LAST`;
      }

      let sourceFilter = '';
      const params: any[] = [userId];
      if (source) {
        sourceFilter = ` AND $2 = ANY(c.sources)`;
        params.push(source);
      }

      const { rows: contacts } = await pool.query(
        `SELECT c.id, c.name, c.email, c.phone, c.last_contact_date,
                c.frequency_preference, c.dunbar_circle, c.groups, c.sources,
                c.archived_at
         FROM contacts c
         WHERE c.user_id = $1 AND c.archived_at IS NULL${sourceFilter}
         ORDER BY ${orderClause}`,
        params,
      );

      // Fetch enrichment data for all contacts in one query
      const contactIds = contacts.map((c) => c.id);
      let enrichmentMap = new Map<string, { platforms: string[]; topTopic: string | null }>();

      if (contactIds.length > 0) {
        const { rows: enrichments } = await pool.query(
          `SELECT contact_id, platform, topics
           FROM enrichment_records
           WHERE contact_id = ANY($1) AND user_id = $2`,
          [contactIds, userId],
        );

        for (const e of enrichments) {
          const existing = enrichmentMap.get(e.contact_id) || { platforms: [], topTopic: null };
          if (!existing.platforms.includes(e.platform)) {
            existing.platforms.push(e.platform);
          }
          const topics: string[] = Array.isArray(e.topics) ? e.topics : [];
          if (topics.length > 0 && !existing.topTopic) {
            existing.topTopic = topics[0];
          }
          enrichmentMap.set(e.contact_id, existing);
        }
      }

      const now = new Date();
      const enrichedContacts = contacts.map((c) => {
        const enrichment = enrichmentMap.get(c.id);
        const lastInteraction = c.last_contact_date ? new Date(c.last_contact_date) : null;

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          lastInteractionDate: lastInteraction,
          lastInteractionRelative: formatRelativeTime(lastInteraction, now),
          healthIndicator: computeHealthIndicator(lastInteraction, c.frequency_preference, now),
          sources: c.sources || [],
          enrichmentPlatforms: enrichment?.platforms || [],
          topTopic: enrichment?.topTopic || null,
          circle: c.dunbar_circle,
          groups: c.groups || [],
          frequencyPreference: c.frequency_preference,
        };
      });

      res.json({ contacts: enrichedContacts });
    } catch (error) {
      console.error('[ContactsEnriched] List error:', error);
      res.status(500).json({ error: 'Failed to fetch enriched contacts' });
    }
  },
);

/**
 * GET /column-config
 *
 * Returns the user's column configuration for the contacts table.
 * Requirements: 4.5
 */
router.get(
  '/column-config',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Try to get user's saved column config from preferences
      const { rows } = await pool.query(
        `SELECT preferences FROM user_preferences WHERE user_id = $1`,
        [userId],
      );

      const prefs = rows[0]?.preferences || {};
      const columns = prefs.contactColumns || DEFAULT_COLUMNS;

      res.json({ columns, availableColumns: [
        'name', 'lastInteraction', 'healthIndicator', 'sources', 'topTopic', 'circle', 'groups',
      ]});
    } catch (error) {
      console.error('[ColumnConfig] Get error:', error);
      res.status(500).json({ error: 'Failed to fetch column config' });
    }
  },
);

/**
 * PUT /column-config
 *
 * Updates the user's column configuration.
 * Requirements: 4.5
 */
router.put(
  '/column-config',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { columns } = req.body;
      if (!Array.isArray(columns)) {
        res.status(400).json({ error: 'columns must be an array' });
        return;
      }

      // Update user preferences with column config
      await pool.query(
        `INSERT INTO user_preferences (user_id, preferences)
         VALUES ($1, jsonb_build_object('contactColumns', $2::jsonb))
         ON CONFLICT (user_id)
         DO UPDATE SET preferences = user_preferences.preferences || jsonb_build_object('contactColumns', $2::jsonb)`,
        [userId, JSON.stringify(columns)],
      );

      res.json({ columns });
    } catch (error) {
      console.error('[ColumnConfig] Update error:', error);
      res.status(500).json({ error: 'Failed to update column config' });
    }
  },
);

export default router;
