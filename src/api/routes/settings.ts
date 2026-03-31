/**
 * Unified Settings API Routes
 *
 * GET  /api/settings          — return all user settings
 * PUT  /api/settings          — update settings with auto-save behavior
 * GET  /api/settings/timezones — search timezones by city name or identifier
 *
 * Requirements: 25.1, 25.2, 25.3, 25.4, 25.5
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import pool from '../../db/connection';

const router = Router();

/**
 * Common timezone dataset for search.
 * A representative subset — in production, use a full IANA timezone database.
 */
const TIMEZONE_DATA = [
  { city: 'New York', country: 'US', timezone: 'America/New_York', aliases: ['NYC', 'Eastern'] },
  { city: 'Los Angeles', country: 'US', timezone: 'America/Los_Angeles', aliases: ['LA', 'Pacific'] },
  { city: 'Chicago', country: 'US', timezone: 'America/Chicago', aliases: ['Central'] },
  { city: 'Denver', country: 'US', timezone: 'America/Denver', aliases: ['Mountain'] },
  { city: 'London', country: 'UK', timezone: 'Europe/London', aliases: ['GMT', 'BST'] },
  { city: 'Paris', country: 'FR', timezone: 'Europe/Paris', aliases: ['CET'] },
  { city: 'Berlin', country: 'DE', timezone: 'Europe/Berlin', aliases: [] },
  { city: 'Tokyo', country: 'JP', timezone: 'Asia/Tokyo', aliases: ['JST'] },
  { city: 'Sydney', country: 'AU', timezone: 'Australia/Sydney', aliases: ['AEST'] },
  { city: 'Dubai', country: 'AE', timezone: 'Asia/Dubai', aliases: ['GST'] },
  { city: 'Singapore', country: 'SG', timezone: 'Asia/Singapore', aliases: ['SGT'] },
  { city: 'Hong Kong', country: 'HK', timezone: 'Asia/Hong_Kong', aliases: ['HKT'] },
  { city: 'Mumbai', country: 'IN', timezone: 'Asia/Kolkata', aliases: ['IST', 'Kolkata'] },
  { city: 'Shanghai', country: 'CN', timezone: 'Asia/Shanghai', aliases: ['CST'] },
  { city: 'São Paulo', country: 'BR', timezone: 'America/Sao_Paulo', aliases: ['BRT', 'Sao Paulo'] },
  { city: 'Mexico City', country: 'MX', timezone: 'America/Mexico_City', aliases: [] },
  { city: 'Toronto', country: 'CA', timezone: 'America/Toronto', aliases: [] },
  { city: 'Vancouver', country: 'CA', timezone: 'America/Vancouver', aliases: [] },
  { city: 'Seoul', country: 'KR', timezone: 'Asia/Seoul', aliases: ['KST'] },
  { city: 'Moscow', country: 'RU', timezone: 'Europe/Moscow', aliases: ['MSK'] },
  { city: 'Istanbul', country: 'TR', timezone: 'Europe/Istanbul', aliases: ['TRT'] },
  { city: 'Cairo', country: 'EG', timezone: 'Africa/Cairo', aliases: ['EET'] },
  { city: 'Johannesburg', country: 'ZA', timezone: 'Africa/Johannesburg', aliases: ['SAST'] },
  { city: 'Auckland', country: 'NZ', timezone: 'Pacific/Auckland', aliases: ['NZST'] },
  { city: 'Honolulu', country: 'US', timezone: 'Pacific/Honolulu', aliases: ['HST', 'Hawaii'] },
  { city: 'Anchorage', country: 'US', timezone: 'America/Anchorage', aliases: ['AKST', 'Alaska'] },
  { city: 'UTC', country: '', timezone: 'UTC', aliases: ['Coordinated Universal Time'] },
];

/**
 * Search timezones by city name or timezone identifier.
 * Requirements: 25.4
 */
export function searchTimezones(query: string): typeof TIMEZONE_DATA {
  if (!query || query.length < 1) return TIMEZONE_DATA.slice(0, 10);

  const q = query.toLowerCase();
  return TIMEZONE_DATA.filter((tz) =>
    tz.city.toLowerCase().includes(q) ||
    tz.timezone.toLowerCase().includes(q) ||
    tz.country.toLowerCase().includes(q) ||
    tz.aliases.some((a) => a.toLowerCase().includes(q))
  );
}

/**
 * GET /
 *
 * Returns all user settings consolidated into sections.
 * Requirements: 25.1, 25.2, 25.3
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

      // Fetch user profile
      const { rows: userRows } = await pool.query(
        `SELECT id, name, email, created_at FROM users WHERE id = $1`,
        [userId],
      );
      const user = userRows[0];

      // Fetch user preferences
      const { rows: prefRows } = await pool.query(
        `SELECT preferences FROM user_preferences WHERE user_id = $1`,
        [userId],
      );
      const prefs = prefRows[0]?.preferences || {};

      // Fetch Google Contacts OAuth status
      const { rows: googleContactsOAuth } = await pool.query(
        `SELECT scope, created_at as connected_at FROM oauth_tokens
         WHERE user_id = $1 AND provider = 'google_contacts' LIMIT 1`,
        [userId],
      );

      // Fetch Google Calendar OAuth status
      const { rows: googleCalendarOAuth } = await pool.query(
        `SELECT scope, created_at as connected_at FROM oauth_tokens
         WHERE user_id = $1 AND provider = 'google_calendar' LIMIT 1`,
        [userId],
      );

      // Fetch pending sync count
      const { rows: syncCountRows } = await pool.query(
        `SELECT COUNT(*) as cnt FROM sync_back_operations
         WHERE user_id = $1 AND status = 'pending_review'`,
        [userId],
      );

      // Determine scope level
      const googleContactsScope = googleContactsOAuth[0]?.scope || '';
      const isReadWrite = googleContactsScope.includes('auth/contacts') &&
        !googleContactsScope.includes('readonly');

      const settings = {
        profile: {
          name: user?.name || '',
          email: user?.email || '',
          timezone: prefs.timezone || 'UTC',
        },
        notifications: {
          importComplete: prefs.notif_import_complete !== false,
          aiEnrichmentReady: prefs.notif_ai_enrichment !== false,
          syncConflict: prefs.notif_sync_conflict !== false,
          pendingReminder: prefs.notif_pending_reminder !== false,
        },
        connectedAccounts: {
          googleContacts: {
            connected: googleContactsOAuth.length > 0,
            scopeLevel: isReadWrite ? 'read-write' : 'read-only',
            connectedAt: googleContactsOAuth[0]?.connected_at || null,
            pendingSyncCount: parseInt(syncCountRows[0]?.cnt || '0'),
          },
          googleCalendar: {
            connected: googleCalendarOAuth.length > 0,
            connectedAt: googleCalendarOAuth[0]?.connected_at || null,
          },
        },
        display: {
          theme: prefs.theme || 'system',
          keyboardShortcuts: prefs.keyboardShortcuts !== false,
          contactColumns: prefs.contactColumns || ['name', 'lastInteraction', 'healthIndicator', 'sources', 'circle', 'groups'],
        },
      };

      res.json(settings);
    } catch (error) {
      console.error('[Settings] Get error:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  },
);

/**
 * PUT /
 *
 * Updates user settings. Supports partial updates (auto-save).
 * Requirements: 25.5
 */
router.put(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const updates = req.body;
      if (!updates || typeof updates !== 'object') {
        res.status(400).json({ error: 'Request body must be an object' });
        return;
      }

      // Build preferences update object
      const prefUpdates: Record<string, any> = {};

      if (updates.profile?.timezone) {
        prefUpdates.timezone = updates.profile.timezone;
      }
      if (updates.profile?.name) {
        await pool.query(`UPDATE users SET name = $1 WHERE id = $2`, [updates.profile.name, userId]);
      }

      if (updates.notifications) {
        if (updates.notifications.importComplete !== undefined) prefUpdates.notif_import_complete = updates.notifications.importComplete;
        if (updates.notifications.aiEnrichmentReady !== undefined) prefUpdates.notif_ai_enrichment = updates.notifications.aiEnrichmentReady;
        if (updates.notifications.syncConflict !== undefined) prefUpdates.notif_sync_conflict = updates.notifications.syncConflict;
        if (updates.notifications.pendingReminder !== undefined) prefUpdates.notif_pending_reminder = updates.notifications.pendingReminder;
      }

      if (updates.display) {
        if (updates.display.theme) prefUpdates.theme = updates.display.theme;
        if (updates.display.keyboardShortcuts !== undefined) prefUpdates.keyboardShortcuts = updates.display.keyboardShortcuts;
        if (updates.display.contactColumns) prefUpdates.contactColumns = updates.display.contactColumns;
      }

      // Merge preferences
      if (Object.keys(prefUpdates).length > 0) {
        await pool.query(
          `INSERT INTO user_preferences (user_id, preferences)
           VALUES ($1, $2::jsonb)
           ON CONFLICT (user_id)
           DO UPDATE SET preferences = user_preferences.preferences || $2::jsonb`,
          [userId, JSON.stringify(prefUpdates)],
        );
      }

      res.json({ updated: true, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('[Settings] Update error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  },
);

/**
 * GET /timezones
 *
 * Search timezones by city name or timezone identifier.
 * Requirements: 25.4
 */
router.get(
  '/timezones',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const query = (req.query.q as string) || '';
      const results = searchTimezones(query);

      res.json({ timezones: results });
    } catch (error) {
      console.error('[Settings] Timezone search error:', error);
      res.status(500).json({ error: 'Failed to search timezones' });
    }
  },
);

export default router;
