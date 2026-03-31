/**
 * Nudge Service
 *
 * Manages nudge visibility logic and dismissals for progressive onboarding.
 * Nudge types:
 *   - get_deeper_insights: shown after dashboard view
 *   - organize_circles: shown when uncategorized contacts > 10
 *   - set_frequency: shown after first circle assignment
 *   - import_more: shown after first chat import
 *
 * Dismissals stored in `nudge_dismissals` table with 7-day cooldown.
 *
 * Requirements: 2.4, 2.5
 */

import pool from '../db/connection';

export type NudgeType = 'get_deeper_insights' | 'organize_circles' | 'set_frequency' | 'import_more';

export interface Nudge {
  type: NudgeType;
  title: string;
  description: string;
  actionUrl: string;
  dismissable: boolean;
}

export interface NudgeDismissal {
  id: string;
  userId: string;
  nudgeType: NudgeType;
  dismissedAt: Date;
  showAgainAfter: Date;
}

const NUDGE_DEFINITIONS: Record<NudgeType, Omit<Nudge, 'type'>> = {
  get_deeper_insights: {
    title: 'Get deeper insights',
    description: 'Import your chat history to see who you talk to most. WhatsApp is the fastest — export in under a minute.',
    actionUrl: '/app/import',
    dismissable: true,
  },
  organize_circles: {
    title: 'Organize your circles',
    description: 'You have uncategorized contacts. Organize them into circles for better suggestions.',
    actionUrl: '/app/circles',
    dismissable: true,
  },
  set_frequency: {
    title: 'Set catchup frequency',
    description: 'Set how often you want to catch up with contacts in your circles.',
    actionUrl: '/app/settings',
    dismissable: true,
  },
  import_more: {
    title: 'Import more platforms',
    description: 'Import chat history from more platforms to get a complete picture of your relationships.',
    actionUrl: '/app/import',
    dismissable: true,
  },
};

const COOLDOWN_DAYS = 7;

/**
 * Get visible nudges for a user based on their current state.
 * Requirements: 2.4, 2.5
 */
export async function getVisibleNudges(userId: string): Promise<Nudge[]> {
  const now = new Date();

  // Fetch active dismissals (not yet past cooldown)
  const { rows: dismissals } = await pool.query(
    `SELECT nudge_type FROM nudge_dismissals
     WHERE user_id = $1 AND show_again_after > $2`,
    [userId, now],
  );
  const dismissedTypes = new Set(dismissals.map((d) => d.nudge_type));

  // Check conditions for each nudge type
  const visibleNudges: Nudge[] = [];

  // "Get deeper insights" — after dashboard view (always eligible if not dismissed)
  if (!dismissedTypes.has('get_deeper_insights')) {
    const { rows: imports } = await pool.query(
      `SELECT COUNT(*) as cnt FROM import_records WHERE user_id = $1`,
      [userId],
    );
    // Show if user has no imports yet
    if (parseInt(imports[0]?.cnt || '0') === 0) {
      visibleNudges.push({ type: 'get_deeper_insights', ...NUDGE_DEFINITIONS.get_deeper_insights });
    }
  }

  // "Organize your circles" — when uncategorized contacts > 10
  if (!dismissedTypes.has('organize_circles')) {
    const { rows: uncategorized } = await pool.query(
      `SELECT COUNT(*) as cnt FROM contacts
       WHERE user_id = $1 AND dunbar_circle IS NULL AND archived_at IS NULL`,
      [userId],
    );
    if (parseInt(uncategorized[0]?.cnt || '0') > 10) {
      visibleNudges.push({ type: 'organize_circles', ...NUDGE_DEFINITIONS.organize_circles });
    }
  }

  // "Set catchup frequency" — after first circle assignment
  if (!dismissedTypes.has('set_frequency')) {
    const { rows: circled } = await pool.query(
      `SELECT COUNT(*) as cnt FROM contacts
       WHERE user_id = $1 AND dunbar_circle IS NOT NULL AND archived_at IS NULL`,
      [userId],
    );
    const { rows: withFreq } = await pool.query(
      `SELECT COUNT(*) as cnt FROM contacts
       WHERE user_id = $1 AND frequency_preference IS NOT NULL AND archived_at IS NULL`,
      [userId],
    );
    // Show if user has circle assignments but few frequency preferences
    if (parseInt(circled[0]?.cnt || '0') > 0 && parseInt(withFreq[0]?.cnt || '0') < 3) {
      visibleNudges.push({ type: 'set_frequency', ...NUDGE_DEFINITIONS.set_frequency });
    }
  }

  // "Import more platforms" — after first chat import
  if (!dismissedTypes.has('import_more')) {
    const { rows: imports } = await pool.query(
      `SELECT COUNT(DISTINCT platform) as cnt FROM import_records
       WHERE user_id = $1 AND status = 'complete'`,
      [userId],
    );
    const platformCount = parseInt(imports[0]?.cnt || '0');
    // Show if user has exactly 1 completed import (encourage more)
    if (platformCount === 1) {
      visibleNudges.push({ type: 'import_more', ...NUDGE_DEFINITIONS.import_more });
    }
  }

  return visibleNudges;
}

/**
 * Dismiss a nudge with 7-day cooldown.
 * Requirements: 2.5
 */
export async function dismissNudge(userId: string, nudgeType: NudgeType): Promise<NudgeDismissal> {
  const now = new Date();
  const showAgainAfter = new Date(now);
  showAgainAfter.setDate(showAgainAfter.getDate() + COOLDOWN_DAYS);

  const { rows } = await pool.query(
    `INSERT INTO nudge_dismissals (user_id, nudge_type, dismissed_at, show_again_after)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, nudge_type)
     DO UPDATE SET dismissed_at = $3, show_again_after = $4
     RETURNING id, user_id, nudge_type, dismissed_at, show_again_after`,
    [userId, nudgeType, now, showAgainAfter],
  );

  return {
    id: rows[0].id,
    userId: rows[0].user_id,
    nudgeType: rows[0].nudge_type,
    dismissedAt: rows[0].dismissed_at,
    showAgainAfter: rows[0].show_again_after,
  };
}

/**
 * Check if a specific nudge is currently dismissed (within cooldown).
 */
export async function isNudgeDismissed(userId: string, nudgeType: NudgeType): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM nudge_dismissals
     WHERE user_id = $1 AND nudge_type = $2 AND show_again_after > NOW()`,
    [userId, nudgeType],
  );
  return rows.length > 0;
}
