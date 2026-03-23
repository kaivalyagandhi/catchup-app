/**
 * Group AI Suggestion Service
 *
 * AI-powered group placement suggestions using a weighted signal hierarchy.
 * Signals: Google Contact Group name matching (35%), interaction frequency (20%),
 * calendar co-attendance (20%), shared tags (15%), contact metadata (10%).
 *
 * Requirements: 2
 */

import pool from '../db/connection';
import {
  PostgresGroupSuggestionFeedbackRepository,
  type GroupSuggestionFeedbackRepository,
} from './group-suggestion-feedback-repository';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface SignalBreakdown {
  googleGroupMatch: number; // weight: 35%
  interactionFrequency: number; // weight: 20%
  calendarCoAttendance: number; // weight: 20%
  sharedTags: number; // weight: 15%
  contactMetadata: number; // weight: 10%
}

export interface GroupSuggestion {
  groupId: string;
  groupName: string;
  confidence: number; // 0-100
  signals: SignalBreakdown;
}

export interface GroupAISuggestionService {
  suggestGroupsForContact(userId: string, contactId: string): Promise<GroupSuggestion[]>;
  batchSuggestGroups(
    userId: string,
    contactIds: string[]
  ): Promise<Record<string, GroupSuggestion[]>>;
}

// ── Signal weights ──────────────────────────────────────────────────────────

export const SIGNAL_WEIGHTS = {
  googleGroupMatch: 0.35,
  interactionFrequency: 0.2,
  calendarCoAttendance: 0.2,
  sharedTags: 0.15,
  contactMetadata: 0.1,
} as const;

// ── Implementation ──────────────────────────────────────────────────────────

export class PostgresGroupAISuggestionService implements GroupAISuggestionService {
  private feedbackRepo: GroupSuggestionFeedbackRepository;

  constructor(feedbackRepo?: GroupSuggestionFeedbackRepository) {
    this.feedbackRepo = feedbackRepo ?? new PostgresGroupSuggestionFeedbackRepository();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  async suggestGroupsForContact(userId: string, contactId: string): Promise<GroupSuggestion[]> {
    // 1. Fetch all non-archived groups for the user
    const groups = await this.fetchUserGroups(userId);
    if (groups.length === 0) return [];

    // 2. Compute signals for each group
    const suggestions: GroupSuggestion[] = [];

    for (const group of groups) {
      const signals = await this.computeSignals(userId, contactId, group);
      const confidence = this.computeConfidence(signals);

      if (confidence > 0) {
        suggestions.push({
          groupId: group.id,
          groupName: group.name,
          confidence,
          signals,
        });
      }
    }

    // 3. Filter out rejected groups
    const rejectedGroupIds = await this.feedbackRepo.getRejectedGroups(userId, contactId);
    const rejectedSet = new Set(rejectedGroupIds);
    const filtered = suggestions.filter((s) => !rejectedSet.has(s.groupId));

    // 4. Sort by confidence descending
    filtered.sort((a, b) => b.confidence - a.confidence);

    return filtered;
  }

  async batchSuggestGroups(
    userId: string,
    contactIds: string[]
  ): Promise<Record<string, GroupSuggestion[]>> {
    const results: Record<string, GroupSuggestion[]> = {};
    for (const contactId of contactIds) {
      results[contactId] = await this.suggestGroupsForContact(userId, contactId);
    }
    return results;
  }

  // ── Signal computation ────────────────────────────────────────────────

  private async computeSignals(
    userId: string,
    contactId: string,
    group: { id: string; name: string }
  ): Promise<SignalBreakdown> {
    const [googleGroupMatch, interactionFrequency, calendarCoAttendance, sharedTags, contactMetadata] =
      await Promise.all([
        this.computeGoogleGroupMatchSignal(userId, contactId, group),
        this.computeInteractionFrequencySignal(userId, contactId, group.id),
        this.computeCalendarCoAttendanceSignal(userId, contactId, group.id),
        this.computeSharedTagsSignal(userId, contactId, group.id),
        this.computeContactMetadataSignal(userId, contactId, group.id),
      ]);

    return {
      googleGroupMatch,
      interactionFrequency,
      calendarCoAttendance,
      sharedTags,
      contactMetadata,
    };
  }

  /**
   * Compute confidence as weighted sum of signals, clamped to [0, 100].
   */
  computeConfidence(signals: SignalBreakdown): number {
    const raw =
      signals.googleGroupMatch * SIGNAL_WEIGHTS.googleGroupMatch +
      signals.interactionFrequency * SIGNAL_WEIGHTS.interactionFrequency +
      signals.calendarCoAttendance * SIGNAL_WEIGHTS.calendarCoAttendance +
      signals.sharedTags * SIGNAL_WEIGHTS.sharedTags +
      signals.contactMetadata * SIGNAL_WEIGHTS.contactMetadata;

    return Math.round(Math.min(100, Math.max(0, raw)));
  }

  // ── Google Contact Group name matching (35%) ──────────────────────────

  /**
   * Compare the contact's Google Contact Group labels against the CatchUp group name
   * using case-insensitive fuzzy matching. Full 100 score on exact/near-exact match.
   */
  private async computeGoogleGroupMatchSignal(
    userId: string,
    contactId: string,
    group: { id: string; name: string }
  ): Promise<number> {
    // Get the contact's Google group memberships via the junction table
    const result = await pool.query(
      `SELECT gcg.google_name
       FROM contact_google_memberships cgm
       JOIN google_contact_groups gcg
         ON cgm.google_group_resource_name = gcg.google_resource_name
         AND gcg.user_id = cgm.user_id
       WHERE cgm.contact_id = $1 AND cgm.user_id = $2`,
      [contactId, userId]
    );

    if (result.rows.length === 0) return 0;

    const groupNameLower = group.name.toLowerCase().trim();
    let bestScore = 0;

    for (const row of result.rows) {
      const googleName = (row.google_name || '').toLowerCase().trim();
      if (!googleName) continue;

      const score = this.fuzzyMatchScore(googleName, groupNameLower);
      if (score > bestScore) bestScore = score;
    }

    return bestScore;
  }

  /**
   * Case-insensitive fuzzy match returning 0-100.
   * - Exact match → 100
   * - One contains the other → 80
   * - Levenshtein distance ≤ 2 → 70
   * - Otherwise → 0
   */
  fuzzyMatchScore(a: string, b: string): number {
    if (a === b) return 100;
    if (a.includes(b) || b.includes(a)) return 80;
    const dist = this.levenshteinDistance(a, b);
    if (dist <= 2) return 70;
    return 0;
  }

  private levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  // ── Interaction frequency (20%) ───────────────────────────────────────

  /**
   * Query interaction_logs for interactions between the contact and other
   * contacts in the group. Higher frequency with group members → higher score.
   */
  private async computeInteractionFrequencySignal(
    userId: string,
    contactId: string,
    groupId: string
  ): Promise<number> {
    // Count interactions the contact has in the last 90 days
    const contactInteractions = await pool.query(
      `SELECT COUNT(*) as cnt FROM interaction_logs
       WHERE user_id = $1 AND contact_id = $2
       AND date >= NOW() - INTERVAL '90 days'`,
      [userId, contactId]
    );

    // Count average interactions for group members in the last 90 days
    const groupAvg = await pool.query(
      `SELECT COALESCE(AVG(cnt), 0) as avg_cnt FROM (
         SELECT COUNT(*) as cnt FROM interaction_logs il
         JOIN contact_groups cg ON il.contact_id = cg.contact_id
         WHERE il.user_id = $1 AND cg.group_id = $2
         AND il.date >= NOW() - INTERVAL '90 days'
         GROUP BY il.contact_id
       ) sub`,
      [userId, groupId]
    );

    const contactCount = parseInt(contactInteractions.rows[0].cnt, 10);
    const avgCount = parseFloat(groupAvg.rows[0].avg_cnt);

    if (avgCount === 0 && contactCount === 0) return 0;
    if (avgCount === 0) return 50; // Contact has interactions but group has none

    // Score based on how similar the contact's interaction frequency is to the group average
    const ratio = Math.min(contactCount / avgCount, 2);
    return Math.round(Math.min(100, ratio * 50));
  }

  // ── Calendar co-attendance (20%) ──────────────────────────────────────

  /**
   * Query calendar_events for events where the contact and group members
   * are co-attendees. More shared events → higher score.
   */
  private async computeCalendarCoAttendanceSignal(
    userId: string,
    contactId: string,
    groupId: string
  ): Promise<number> {
    // Get the contact's email
    const contactResult = await pool.query(
      'SELECT email FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, userId]
    );
    if (contactResult.rows.length === 0 || !contactResult.rows[0].email) return 0;
    const contactEmail = contactResult.rows[0].email.toLowerCase();

    // Get emails of group members
    const groupMembersResult = await pool.query(
      `SELECT DISTINCT c.email FROM contacts c
       JOIN contact_groups cg ON c.id = cg.contact_id
       WHERE cg.group_id = $1 AND c.user_id = $2 AND c.email IS NOT NULL`,
      [groupId, userId]
    );
    const groupEmails = new Set(
      groupMembersResult.rows.map((r: any) => (r.email as string).toLowerCase())
    );
    if (groupEmails.size === 0) return 0;

    // Find calendar events with attendees containing the contact's email
    const eventsResult = await pool.query(
      `SELECT attendees FROM calendar_events
       WHERE user_id = $1 AND attendees IS NOT NULL
       AND start_time >= NOW() - INTERVAL '180 days'`,
      [userId]
    );

    let sharedEventCount = 0;
    for (const row of eventsResult.rows) {
      const attendees: Array<{ email?: string; displayName?: string }> = row.attendees || [];
      const attendeeEmails = attendees
        .map((a) => (a.email || '').toLowerCase())
        .filter((e) => e.length > 0);

      const contactPresent = attendeeEmails.includes(contactEmail);
      const groupMemberPresent = attendeeEmails.some((e) => groupEmails.has(e));

      if (contactPresent && groupMemberPresent) {
        sharedEventCount++;
      }
    }

    // Score: 0 shared events → 0, 1 → 30, 3 → 60, 5+ → 100
    if (sharedEventCount === 0) return 0;
    return Math.round(Math.min(100, sharedEventCount * 20));
  }

  // ── Shared tags (15%) ─────────────────────────────────────────────────

  /**
   * Compare contact's tags with the most common tags among group members.
   * More overlap → higher score.
   */
  private async computeSharedTagsSignal(
    userId: string,
    contactId: string,
    groupId: string
  ): Promise<number> {
    // Get contact's tags
    const contactTags = await pool.query(
      `SELECT t.text FROM tags t
       JOIN contact_tags ct ON t.id = ct.tag_id
       WHERE ct.contact_id = $1 AND t.user_id = $2`,
      [contactId, userId]
    );
    if (contactTags.rows.length === 0) return 0;
    const contactTagSet = new Set(
      contactTags.rows.map((r: any) => (r.text as string).toLowerCase())
    );

    // Get most common tags among group members
    const groupTags = await pool.query(
      `SELECT t.text, COUNT(*) as cnt FROM tags t
       JOIN contact_tags ct ON t.id = ct.tag_id
       JOIN contact_groups cg ON ct.contact_id = cg.contact_id
       WHERE cg.group_id = $1 AND t.user_id = $2
       GROUP BY t.text
       ORDER BY cnt DESC
       LIMIT 20`,
      [groupId, userId]
    );
    if (groupTags.rows.length === 0) return 0;

    const groupTagTexts = groupTags.rows.map((r: any) => (r.text as string).toLowerCase());
    const overlap = groupTagTexts.filter((t: string) => contactTagSet.has(t)).length;

    if (overlap === 0) return 0;
    // Score based on overlap ratio
    const ratio = overlap / Math.min(contactTagSet.size, groupTagTexts.length);
    return Math.round(Math.min(100, ratio * 100));
  }

  // ── Contact metadata (10%) ────────────────────────────────────────────

  /**
   * Compare location, company (custom_notes heuristic), and other metadata
   * between the contact and group members.
   */
  private async computeContactMetadataSignal(
    userId: string,
    contactId: string,
    groupId: string
  ): Promise<number> {
    // Get contact metadata
    const contactResult = await pool.query(
      'SELECT location, custom_notes FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, userId]
    );
    if (contactResult.rows.length === 0) return 0;
    const contact = contactResult.rows[0];

    // Get group members' metadata
    const groupMembers = await pool.query(
      `SELECT c.location, c.custom_notes FROM contacts c
       JOIN contact_groups cg ON c.id = cg.contact_id
       WHERE cg.group_id = $1 AND c.user_id = $2`,
      [groupId, userId]
    );
    if (groupMembers.rows.length === 0) return 0;

    let matchPoints = 0;
    let totalChecks = 0;

    const contactLocation = (contact.location || '').toLowerCase().trim();

    if (contactLocation) {
      totalChecks++;
      const locationMatches = groupMembers.rows.filter((m: any) => {
        const memberLoc = (m.location || '').toLowerCase().trim();
        return memberLoc && (memberLoc.includes(contactLocation) || contactLocation.includes(memberLoc));
      }).length;
      if (locationMatches > 0) {
        matchPoints += locationMatches / groupMembers.rows.length;
      }
    }

    const contactNotes = (contact.custom_notes || '').toLowerCase().trim();
    if (contactNotes) {
      totalChecks++;
      const notesMatches = groupMembers.rows.filter((m: any) => {
        const memberNotes = (m.custom_notes || '').toLowerCase().trim();
        if (!memberNotes) return false;
        // Simple keyword overlap
        const contactWords = new Set(contactNotes.split(/\s+/).filter((w: string) => w.length > 3));
        const memberWords = memberNotes.split(/\s+/).filter((w: string) => w.length > 3);
        return memberWords.some((w: string) => contactWords.has(w));
      }).length;
      if (notesMatches > 0) {
        matchPoints += notesMatches / groupMembers.rows.length;
      }
    }

    if (totalChecks === 0) return 0;
    const score = (matchPoints / totalChecks) * 100;
    return Math.round(Math.min(100, score));
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async fetchUserGroups(userId: string): Promise<Array<{ id: string; name: string }>> {
    const result = await pool.query(
      'SELECT id, name FROM groups WHERE user_id = $1 AND archived = false ORDER BY name ASC',
      [userId]
    );
    return result.rows.map((r: any) => ({ id: r.id, name: r.name }));
  }
}
