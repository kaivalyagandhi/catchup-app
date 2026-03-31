/**
 * Import Parse Job Processor
 *
 * Handles the 'import-parse' Cloud Tasks job:
 *  1. Retrieve the uploaded file content from import_records.raw_content
 *  2. Select the correct platform parser
 *  3. Parse the file content
 *  4. Generate and store interaction summaries
 *  5. Run tiered matching
 *  6. Persist match results and flag smart suggestions
 *  7. Update import_record stats and status to 'parsed'
 *  8. Clear raw_content (Req 12.6 — no raw message storage)
 *  9. Enqueue AI enrichment job
 * 10. Create "import complete" in-app notification
 *
 * Requirements: 6.1, 6.2, 7.1, 11.3
 */

import type { Pool } from 'pg';
import pool from '../../db/connection';
import type { ChatPlatform, ParseResult } from '../../chat-import/parser';
import { parseWhatsAppText } from '../../chat-import/whatsapp-parser';
import { parseInstagramJson } from '../../chat-import/instagram-parser';
import { parseIMessageCsv } from '../../chat-import/imessage-parser';
import { parseFacebookJson } from '../../chat-import/facebook-parser';
import { parseTwitterJson } from '../../chat-import/twitter-parser';
import { parseGoogleMessagesXml } from '../../chat-import/google-messages-parser';
import {
  generateInteractionSummaries,
  storeInteractionSummaries,
} from '../../chat-import/interaction-summary-generator';
import type { InteractionSummaryMap } from '../../chat-import/match-persistence';
import {
  persistMatchResults,
  flagSmartSuggestions,
  updateImportRecordStats,
} from '../../chat-import/match-persistence';
import { createMatchingEngine } from '../../chat-import/matching';
import { CloudTasksQueue } from '../cloud-tasks-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImportParseJobData {
  importRecordId: string;
  userId: string;
  platform: ChatPlatform;
  fileHash: string;
}

// ─── Platform parser selection ───────────────────────────────────────────────


/**
 * Select the correct parser function based on the platform.
 */
export function selectParser(platform: ChatPlatform): (text: string) => ParseResult {
  switch (platform) {
    case 'whatsapp':
      return parseWhatsAppText;
    case 'instagram':
      return parseInstagramJson;
    case 'imessage':
      return parseIMessageCsv;
    case 'facebook':
      return parseFacebookJson;
    case 'twitter':
      return parseTwitterJson;
    case 'google_messages':
      return parseGoogleMessagesXml;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// ─── Main processor ──────────────────────────────────────────────────────────

/**
 * Process an import-parse job.
 *
 * Accepts a Job-like object with `data` containing ImportParseJobData.
 */
export async function processImportParse(
  job: { id: string; data: ImportParseJobData; name: string },
): Promise<{ totalParticipants: number; autoMatched: number; likelyMatched: number; unmatched: number }> {
  const { importRecordId, userId, platform, fileHash } = job.data;

  console.log(`[ImportParse] Starting parse job for import ${importRecordId}, platform=${platform}`);

  try {
    // 1. Retrieve raw file content from import_records
    const fileContent = await fetchRawContent(pool, importRecordId);

    // 2. Select parser and parse
    const parse = selectParser(platform);
    const parseResult = parse(fileContent);

    if (parseResult.errors.length > 0) {
      console.warn(
        `[ImportParse] ${parseResult.errors.length} parse errors for import ${importRecordId}`,
      );
    }

    // 3. Generate interaction summaries
    const summaries = generateInteractionSummaries(parseResult, importRecordId);

    // 4. Store interaction summaries in DB
    const storedSummaries = await storeInteractionSummaries(pool, summaries);

    // 5. Build identifier → summary ID map for match persistence
    const interactionSummaryMap: InteractionSummaryMap = new Map();
    for (const stored of storedSummaries) {
      interactionSummaryMap.set(stored.participantIdentifier, stored.id);
    }

    // 6. Run tiered matching
    const matchingEngine = createMatchingEngine(pool);
    const matches = await matchingEngine.matchParticipants(userId, parseResult.participants);

    // 7. Persist match results
    const { autoCount, likelyCount, unmatchedCount } = await persistMatchResults(
      pool,
      importRecordId,
      userId,
      matches,
      interactionSummaryMap,
      platform,
    );

    // 8. Flag smart suggestions for top 20% unmatched
    await flagSmartSuggestions(pool, importRecordId);

    // 9. Update import_record stats
    await updateImportRecordStats(pool, importRecordId, autoCount, likelyCount, unmatchedCount);

    // 10. Update status to 'parsed' and clear raw_content (Req 12.6)
    await pool.query(
      `UPDATE import_records
       SET status = 'parsed', raw_content = NULL
       WHERE id = $1`,
      [importRecordId],
    );

    // 11. Enqueue AI enrichment job
    try {
      const queue = new CloudTasksQueue('import-parse');
      await queue.add('ai-enrichment', {
        importRecordId,
        userId,
        platform,
      });
    } catch (enqueueError) {
      console.error('[ImportParse] Failed to enqueue AI enrichment job:', enqueueError);
      // Non-fatal — the import is still considered parsed
    }

    // 12. Create "import complete" in-app notification
    await createImportCompleteNotification(pool, userId, importRecordId, platform, {
      totalParticipants: autoCount + likelyCount + unmatchedCount,
      autoMatched: autoCount,
      likelyMatched: likelyCount,
      unmatched: unmatchedCount,
    });

    // 13. Enqueue pending-enrichments-reminder 48h from now (if there are unresolved items)
    if (likelyCount + unmatchedCount > 0) {
      try {
        const FORTY_EIGHT_HOURS = 48 * 60 * 60; // seconds
        const reminderQueue = new CloudTasksQueue('pending-enrichments-reminder');
        await reminderQueue.add('pending-enrichments-reminder', {
          userId,
          importRecordId,
        }, { delay: FORTY_EIGHT_HOURS });
      } catch (reminderError) {
        console.error('[ImportParse] Failed to enqueue pending-enrichments-reminder:', reminderError);
        // Non-fatal
      }
    }

    console.log(
      `[ImportParse] Completed import ${importRecordId}: ` +
      `${autoCount} auto, ${likelyCount} likely, ${unmatchedCount} unmatched`,
    );

    return {
      totalParticipants: autoCount + likelyCount + unmatchedCount,
      autoMatched: autoCount,
      likelyMatched: likelyCount,
      unmatched: unmatchedCount,
    };
  } catch (error: any) {
    // Mark import as failed
    const failedPhase = detectFailedPhase(error);
    await pool.query(
      `UPDATE import_records
       SET status = 'failed', failed_phase = $2, error_message = $3, raw_content = NULL
       WHERE id = $1`,
      [importRecordId, failedPhase, error.message],
    );

    // Create "import failed" in-app notification
    try {
      await createImportFailedNotification(pool, userId, importRecordId, platform, failedPhase);
    } catch (notifError) {
      console.error('[ImportParse] Failed to create failure notification:', notifError);
    }

    console.error(`[ImportParse] Failed import ${importRecordId}:`, error);
    throw error;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fetch the raw file content from import_records.raw_content.
 */
export async function fetchRawContent(db: Pool, importRecordId: string): Promise<string> {
  const result = await db.query(
    `SELECT raw_content FROM import_records WHERE id = $1`,
    [importRecordId],
  );

  if (result.rows.length === 0) {
    throw new Error(`Import record not found: ${importRecordId}`);
  }

  const rawContent = result.rows[0].raw_content;
  if (!rawContent) {
    throw new Error(`No raw content found for import record: ${importRecordId}`);
  }

  // raw_content is stored as BYTEA; convert to UTF-8 string
  return Buffer.isBuffer(rawContent) ? rawContent.toString('utf-8') : String(rawContent);
}

/**
 * Determine which phase failed based on the error context.
 */
function detectFailedPhase(error: any): string {
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('parse') || msg.includes('parser') || msg.includes('unsupported platform')) {
    return 'parsing';
  }
  if (msg.includes('match') || msg.includes('contact')) {
    return 'matching';
  }
  return 'parsing';
}

/**
 * Create an "import complete" in-app notification.
 */
async function createImportCompleteNotification(
  db: Pool,
  userId: string,
  importRecordId: string,
  platform: ChatPlatform,
  stats: { totalParticipants: number; autoMatched: number; likelyMatched: number; unmatched: number },
): Promise<void> {
  const platformLabel = platform.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const title = `${platformLabel} import complete`;
  const description =
    `Found ${stats.totalParticipants} participants: ` +
    `${stats.autoMatched} auto-matched, ${stats.likelyMatched} likely matches, ` +
    `${stats.unmatched} unmatched.`;
  const actionUrl = `/imports/${importRecordId}/matches`;

  await db.query(
    `INSERT INTO in_app_notifications (user_id, event_type, title, description, action_url)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'import_complete', title, description, actionUrl],
  );
}

/**
 * Create an "import failed" in-app notification.
 */
async function createImportFailedNotification(
  db: Pool,
  userId: string,
  importRecordId: string,
  platform: ChatPlatform,
  failedPhase: string,
): Promise<void> {
  const platformLabel = platform.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const title = `${platformLabel} import failed`;
  const description = `Your import failed during ${failedPhase}. You can retry the import.`;
  const actionUrl = `/imports/${importRecordId}/reimport`;

  await db.query(
    `INSERT INTO in_app_notifications (user_id, event_type, title, description, action_url)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'import_failed', title, description, actionUrl],
  );
}
