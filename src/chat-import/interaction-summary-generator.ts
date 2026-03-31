/**
 * Interaction Summary Generator
 *
 * Generates one InteractionSummary per unique participant from a ParseResult.
 * Computes message_count, first_message_date, last_message_date, avg_messages_per_month.
 * Normalizes participant identifiers using identifier-normalizer.
 * Stores interaction summaries in the `interaction_summaries` table.
 *
 * Requirements: 6.1, 6.4
 */

import type { Pool } from 'pg';
import type { ParseResult, ChatPlatform } from './parser';
import { normalizeIdentifier, type IdentifierType } from './identifier-normalizer';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InteractionSummaryInput {
  importRecordId: string;
  participantIdentifier: string;
  participantDisplayName?: string;
  identifierType: IdentifierType;
  platform: ChatPlatform;
  messageCount: number;
  firstMessageDate: Date;
  lastMessageDate: Date;
  avgMessagesPerMonth: number;
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | null;
}

export interface StoredInteractionSummary extends InteractionSummaryInput {
  id: string;
  createdAt: Date;
}

// Senders to skip — system messages and self-messages
const SKIP_SENDERS = new Set(['__system__', '__self__']);

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate InteractionSummary objects from a ParseResult.
 *
 * Groups non-system messages by normalized participant identifier,
 * computes stats for each unique participant, and returns an array
 * of InteractionSummaryInput objects ready for DB insertion.
 */
export function generateInteractionSummaries(
  parseResult: ParseResult,
  importRecordId: string,
): InteractionSummaryInput[] {
  const participantMap = new Map<string, {
    displayName?: string;
    identifierType: IdentifierType;
    messageCount: number;
    firstMessageDate: Date;
    lastMessageDate: Date;
  }>();

  for (const message of parseResult.messages) {
    // Skip system and self messages
    if (message.isSystemMessage || SKIP_SENDERS.has(message.sender)) {
      continue;
    }

    const normalized = normalizeIdentifier(message.sender);
    const key = normalized.identifier;

    const existing = participantMap.get(key);
    if (existing) {
      existing.messageCount += 1;
      if (message.timestamp < existing.firstMessageDate) {
        existing.firstMessageDate = new Date(message.timestamp);
      }
      if (message.timestamp > existing.lastMessageDate) {
        existing.lastMessageDate = new Date(message.timestamp);
      }
    } else {
      // Look up display name from participants array
      const participant = parseResult.participants.find(
        (p) => normalizeIdentifier(p.identifier).identifier === key,
      );

      participantMap.set(key, {
        displayName: participant?.displayName,
        identifierType: normalized.identifierType,
        messageCount: 1,
        firstMessageDate: new Date(message.timestamp),
        lastMessageDate: new Date(message.timestamp),
      });
    }
  }

  const summaries: InteractionSummaryInput[] = [];

  for (const [identifier, data] of participantMap) {
    summaries.push({
      importRecordId,
      participantIdentifier: identifier,
      participantDisplayName: data.displayName,
      identifierType: data.identifierType,
      platform: parseResult.platform,
      messageCount: data.messageCount,
      firstMessageDate: data.firstMessageDate,
      lastMessageDate: data.lastMessageDate,
      avgMessagesPerMonth: computeAvgMessagesPerMonth(
        data.messageCount,
        data.firstMessageDate,
        data.lastMessageDate,
      ),
      topics: [],
      sentiment: null,
    });
  }

  return summaries;
}

/**
 * Compute average messages per month.
 * Uses a minimum of 1 month to avoid division by zero for short conversations.
 */
export function computeAvgMessagesPerMonth(
  messageCount: number,
  firstDate: Date,
  lastDate: Date,
): number {
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44; // average days per month
  const diffMs = lastDate.getTime() - firstDate.getTime();
  const months = Math.max(1, diffMs / msPerMonth);
  return Math.round((messageCount / months) * 100) / 100;
}

/**
 * Store interaction summaries in the `interaction_summaries` table.
 * Returns the stored summaries with their generated IDs and timestamps.
 */
export async function storeInteractionSummaries(
  pool: Pool,
  summaries: InteractionSummaryInput[],
): Promise<StoredInteractionSummary[]> {
  if (summaries.length === 0) {
    return [];
  }

  const stored: StoredInteractionSummary[] = [];

  // Use a single transaction for all inserts
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const summary of summaries) {
      const result = await client.query(
        `INSERT INTO interaction_summaries (
          import_record_id, participant_identifier, participant_display_name,
          identifier_type, platform, message_count,
          first_message_date, last_message_date, avg_messages_per_month,
          topics, sentiment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, created_at`,
        [
          summary.importRecordId,
          summary.participantIdentifier,
          summary.participantDisplayName ?? null,
          summary.identifierType,
          summary.platform,
          summary.messageCount,
          summary.firstMessageDate,
          summary.lastMessageDate,
          summary.avgMessagesPerMonth,
          JSON.stringify(summary.topics),
          summary.sentiment,
        ],
      );

      const row = result.rows[0];
      stored.push({
        ...summary,
        id: row.id,
        createdAt: row.created_at,
      });
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return stored;
}
