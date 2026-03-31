/**
 * Match Result Persistence
 *
 * Persists contact matching results from the matching engine into the database:
 *  - Auto-matches → enrichment_records (linking interaction_summary to matched contact)
 *  - Likely matches → pending_enrichments with match_tier='likely'
 *  - Unmatched → pending_enrichments with match_tier='unmatched', sorted by message_count desc
 *
 * Also flags top 20% unmatched by message count with a smart suggestion,
 * and updates import_record statistics.
 *
 * Requirements: 7.1, 7.3, 7.4, 7.6
 */

import type { Pool } from 'pg';
import type { ContactMatch } from './matching';
import type { ChatPlatform } from './parser';
import { addSourceToContact } from '../contacts/source-tracking';

/**
 * Maps participant identifier → interaction_summary_id so we can link
 * enrichment_records and pending_enrichments to the correct interaction_summary.
 */
export type InteractionSummaryMap = Map<string, string>;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Persist all match results from the matching engine into the database.
 *
 * - Auto-tier matches: INSERT into enrichment_records
 * - Likely-tier matches: INSERT into pending_enrichments with match_tier='likely'
 * - Unmatched: INSERT into pending_enrichments with match_tier='unmatched'
 *
 * All inserts happen within a single transaction.
 */
export async function persistMatchResults(
  pool: Pool,
  importRecordId: string,
  userId: string,
  matches: ContactMatch[],
  interactionSummaryMap: InteractionSummaryMap,
  platform: ChatPlatform,
): Promise<{ autoCount: number; likelyCount: number; unmatchedCount: number }> {
  const autoMatches = matches.filter((m) => m.tier === 'auto');
  const likelyMatches = matches.filter((m) => m.tier === 'likely');
  const unmatchedMatches = matches.filter((m) => m.tier === 'unmatched');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Auto-matches → enrichment_records (Req 7.1, 7.6)
    for (const match of autoMatches) {
      const summaryId = interactionSummaryMap.get(match.participant.identifier);
      if (!summaryId || !match.contactId) continue;

      await client.query(
        `INSERT INTO enrichment_records (
          contact_id, user_id, import_record_id, interaction_summary_id,
          platform, message_count, first_message_date, last_message_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          match.contactId,
          userId,
          importRecordId,
          summaryId,
          platform,
          match.participant.messageCount,
          match.participant.firstMessageDate,
          match.participant.lastMessageDate,
        ],
      );

      // Add 'chat_import' to contact's sources if not already present (Req 18.2)
      await addSourceToContact(client, match.contactId, 'chat_import');
    }

    // Likely matches → pending_enrichments (Req 7.1)
    for (const match of likelyMatches) {
      const summaryId = interactionSummaryMap.get(match.participant.identifier);
      if (!summaryId) continue;

      await client.query(
        `INSERT INTO pending_enrichments (
          user_id, import_record_id, interaction_summary_id,
          participant_identifier, participant_display_name, platform,
          match_tier, suggested_contact_id, confidence, match_reason,
          status, message_count, first_message_date, last_message_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          userId,
          importRecordId,
          summaryId,
          match.participant.identifier,
          match.participant.displayName ?? null,
          platform,
          'likely',
          match.contactId,
          match.confidence,
          match.matchReason,
          'pending',
          match.participant.messageCount,
          match.participant.firstMessageDate,
          match.participant.lastMessageDate,
        ],
      );
    }

    // Unmatched → pending_enrichments, sorted by message_count desc (Req 7.3)
    const sortedUnmatched = [...unmatchedMatches].sort(
      (a, b) => b.participant.messageCount - a.participant.messageCount,
    );

    for (const match of sortedUnmatched) {
      const summaryId = interactionSummaryMap.get(match.participant.identifier);
      if (!summaryId) continue;

      await client.query(
        `INSERT INTO pending_enrichments (
          user_id, import_record_id, interaction_summary_id,
          participant_identifier, participant_display_name, platform,
          match_tier, suggested_contact_id, confidence, match_reason,
          status, message_count, first_message_date, last_message_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          userId,
          importRecordId,
          summaryId,
          match.participant.identifier,
          match.participant.displayName ?? null,
          platform,
          'unmatched',
          null,
          match.confidence,
          match.matchReason,
          'pending',
          match.participant.messageCount,
          match.participant.firstMessageDate,
          match.participant.lastMessageDate,
        ],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    autoCount: autoMatches.length,
    likelyCount: likelyMatches.length,
    unmatchedCount: unmatchedMatches.length,
  };
}

/**
 * Flag the top 20% of unmatched pending_enrichments by message_count
 * with a smart suggestion indicator. (Req 7.4)
 *
 * Uses a SQL subquery to find the message_count threshold at the 80th percentile
 * among unmatched pending_enrichments for the given import, then updates
 * the match_reason to include a smart suggestion flag.
 */
export async function flagSmartSuggestions(
  pool: Pool,
  importRecordId: string,
): Promise<number> {
  // Count total unmatched for this import
  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM pending_enrichments
     WHERE import_record_id = $1 AND match_tier = 'unmatched'`,
    [importRecordId],
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);
  if (total === 0) return 0;

  // Top 20% means we want at least 1 flagged if there are any unmatched
  const top20Count = Math.max(1, Math.ceil(total * 0.2));

  // Flag the top N by message_count with smart suggestion
  const result = await pool.query(
    `UPDATE pending_enrichments
     SET match_reason = 'smart_suggestion'
     WHERE id IN (
       SELECT id FROM pending_enrichments
       WHERE import_record_id = $1 AND match_tier = 'unmatched'
       ORDER BY message_count DESC
       LIMIT $2
     )`,
    [importRecordId, top20Count],
  );

  return result.rowCount ?? 0;
}

/**
 * Update the import_record with match statistics. (Req 7.1)
 */
export async function updateImportRecordStats(
  pool: Pool,
  importRecordId: string,
  autoCount: number,
  likelyCount: number,
  unmatchedCount: number,
): Promise<void> {
  await pool.query(
    `UPDATE import_records
     SET auto_matched = $2,
         likely_matched = $3,
         unmatched = $4,
         total_participants = $5
     WHERE id = $1`,
    [
      importRecordId,
      autoCount,
      likelyCount,
      unmatchedCount,
      autoCount + likelyCount + unmatchedCount,
    ],
  );
}
