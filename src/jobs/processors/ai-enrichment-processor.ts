/**
 * AI Enrichment Job Processor
 *
 * Handles the 'ai-enrichment' Cloud Tasks job:
 *  1. Fetch interaction_summaries for the import where ai_enrichment_status = 'pending'
 *  2. For each summary, call Google Gemini API for topic extraction and sentiment analysis
 *  3. Update interaction_summaries with topics and sentiment
 *  4. Set ai_enrichment_status to 'complete' (or 'failed' if API call fails)
 *  5. Update import_record status to 'complete'
 *  6. Create "AI enrichment ready" in-app notification
 *
 * Requirements: 6.2, 6.3
 */

import type { Pool } from 'pg';
import pool from '../../db/connection';
import type { ChatPlatform } from '../../chat-import/parser';
import {
  initializeGeminiClient,
  DEFAULT_GEMINI_CONFIG,
} from '../../integrations/google-gemini-config';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AiEnrichmentJobData {
  importRecordId: string;
  userId: string;
  platform: ChatPlatform;
}

export interface PendingSummary {
  id: string;
  participantIdentifier: string;
  participantDisplayName: string | null;
  platform: string;
  messageCount: number;
  firstMessageDate: Date;
  lastMessageDate: Date;
  avgMessagesPerMonth: number;
}

export interface AiEnrichmentResult {
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_BATCH_SIZE = 100;
const MAX_RETRIES = 2;

// ─── Main processor ──────────────────────────────────────────────────────────

/**
 * Process an ai-enrichment job.
 */
export async function processAiEnrichment(
  job: { id: string; data: AiEnrichmentJobData; name: string },
): Promise<{ enrichedCount: number; failedCount: number }> {
  const { importRecordId, userId, platform } = job.data;

  console.log(`[AiEnrichment] Starting enrichment for import ${importRecordId}, platform=${platform}`);

  let enrichedCount = 0;
  let failedCount = 0;

  try {
    // 1. Fetch pending interaction summaries
    const summaries = await fetchPendingSummaries(pool, importRecordId);

    if (summaries.length === 0) {
      console.log(`[AiEnrichment] No pending summaries for import ${importRecordId}`);
      await markImportComplete(pool, importRecordId);
      return { enrichedCount: 0, failedCount: 0 };
    }

    console.log(`[AiEnrichment] Found ${summaries.length} pending summaries`);

    // 2. Process summaries in batches
    const batches = createBatches(summaries, MAX_BATCH_SIZE);

    for (const batch of batches) {
      const results = await enrichBatchWithRetry(batch);

      // 3. Update each summary with results
      for (let i = 0; i < batch.length; i++) {
        const summary = batch[i];
        const result = results[i];

        if (result) {
          await updateSummaryEnrichment(pool, summary.id, result, 'complete');
          enrichedCount++;
        } else {
          await updateSummaryEnrichment(pool, summary.id, null, 'failed');
          failedCount++;
        }
      }
    }

    // 4. Update import_record status to 'complete'
    await markImportComplete(pool, importRecordId);

    // 5. Create "AI enrichment ready" notification
    await createEnrichmentNotification(pool, userId, importRecordId, platform, enrichedCount);

    console.log(
      `[AiEnrichment] Completed import ${importRecordId}: ${enrichedCount} enriched, ${failedCount} failed`,
    );

    return { enrichedCount, failedCount };
  } catch (error: any) {
    console.error(`[AiEnrichment] Failed enrichment for import ${importRecordId}:`, error);

    // Mark all remaining pending summaries as failed
    await pool.query(
      `UPDATE interaction_summaries
       SET ai_enrichment_status = 'failed'
       WHERE import_record_id = $1 AND ai_enrichment_status = 'pending'`,
      [importRecordId],
    );

    // Still mark import as complete (AI enrichment is non-blocking)
    await markImportComplete(pool, importRecordId);

    throw error;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fetch interaction summaries with ai_enrichment_status = 'pending' for an import.
 */
export async function fetchPendingSummaries(
  db: Pool,
  importRecordId: string,
): Promise<PendingSummary[]> {
  const result = await db.query(
    `SELECT id, participant_identifier, participant_display_name,
            platform, message_count, first_message_date, last_message_date,
            avg_messages_per_month
     FROM interaction_summaries
     WHERE import_record_id = $1 AND ai_enrichment_status = 'pending'
     ORDER BY message_count DESC`,
    [importRecordId],
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    participantIdentifier: row.participant_identifier,
    participantDisplayName: row.participant_display_name,
    platform: row.platform,
    messageCount: row.message_count,
    firstMessageDate: row.first_message_date,
    lastMessageDate: row.last_message_date,
    avgMessagesPerMonth: parseFloat(row.avg_messages_per_month),
  }));
}

/**
 * Split summaries into batches of the given size.
 */
export function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Build the Gemini prompt for topic extraction and sentiment analysis.
 */
export function buildEnrichmentPrompt(summaries: PendingSummary[]): string {
  const summaryDescriptions = summaries.map((s, i) => {
    const name = s.participantDisplayName || s.participantIdentifier;
    const dateRange = `${new Date(s.firstMessageDate).toISOString().split('T')[0]} to ${new Date(s.lastMessageDate).toISOString().split('T')[0]}`;
    return `${i + 1}. Participant: "${name}" (${s.platform}), ${s.messageCount} messages, ${dateRange}, avg ${s.avgMessagesPerMonth} msgs/month`;
  }).join('\n');

  return `Analyze the following chat conversation participants and provide topic keywords and sentiment analysis for each.

For each participant, based on the platform, message frequency, and communication patterns:
- Extract up to 10 relevant topic keywords that likely describe the relationship and conversation themes
- Determine the overall sentiment: "positive", "neutral", or "negative"

Participants:
${summaryDescriptions}

Respond with a JSON array where each element has:
- "index": the participant number (1-based)
- "topics": array of up to 10 topic keyword strings
- "sentiment": one of "positive", "neutral", "negative"

Example response:
[{"index": 1, "topics": ["family", "travel", "weekend plans"], "sentiment": "positive"}]

Respond ONLY with the JSON array, no other text.`;
}

/**
 * Call Gemini API for a batch of summaries with retry logic.
 */
export async function enrichBatchWithRetry(
  summaries: PendingSummary[],
  retries: number = MAX_RETRIES,
): Promise<(AiEnrichmentResult | null)[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callGeminiForEnrichment(summaries);
    } catch (error: any) {
      console.warn(
        `[AiEnrichment] Gemini API attempt ${attempt + 1}/${retries + 1} failed:`,
        error.message,
      );

      if (attempt === retries) {
        console.error('[AiEnrichment] All retry attempts exhausted');
        return summaries.map(() => null);
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return summaries.map(() => null);
}

/**
 * Call Google Gemini API for topic extraction and sentiment analysis.
 */
export async function callGeminiForEnrichment(
  summaries: PendingSummary[],
): Promise<(AiEnrichmentResult | null)[]> {
  const prompt = buildEnrichmentPrompt(summaries);

  const genAI = initializeGeminiClient();
  const model = genAI.getGenerativeModel({
    model: DEFAULT_GEMINI_CONFIG.model,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  return parseGeminiResponse(text, summaries.length);
}

/**
 * Parse the Gemini API response into enrichment results.
 */
export function parseGeminiResponse(
  responseText: string,
  expectedCount: number,
): (AiEnrichmentResult | null)[] {
  const results: (AiEnrichmentResult | null)[] = new Array(expectedCount).fill(null);

  try {
    const parsed = JSON.parse(responseText);

    if (!Array.isArray(parsed)) {
      console.warn('[AiEnrichment] Gemini response is not an array');
      return results;
    }

    for (const item of parsed) {
      const index = (item.index ?? 0) - 1; // Convert 1-based to 0-based
      if (index < 0 || index >= expectedCount) continue;

      const topics = Array.isArray(item.topics)
        ? item.topics.filter((t: any) => typeof t === 'string').slice(0, 10)
        : [];

      const sentiment = ['positive', 'neutral', 'negative'].includes(item.sentiment)
        ? (item.sentiment as 'positive' | 'neutral' | 'negative')
        : 'neutral';

      results[index] = { topics, sentiment };
    }
  } catch (error: any) {
    console.error('[AiEnrichment] Failed to parse Gemini response:', error.message);
  }

  return results;
}

/**
 * Update an interaction_summary with AI enrichment results.
 */
export async function updateSummaryEnrichment(
  db: Pool,
  summaryId: string,
  result: AiEnrichmentResult | null,
  status: 'complete' | 'failed',
): Promise<void> {
  if (result) {
    await db.query(
      `UPDATE interaction_summaries
       SET topics = $2, sentiment = $3, ai_enrichment_status = $4
       WHERE id = $1`,
      [summaryId, JSON.stringify(result.topics), result.sentiment, status],
    );
  } else {
    await db.query(
      `UPDATE interaction_summaries
       SET ai_enrichment_status = $2
       WHERE id = $1`,
      [summaryId, status],
    );
  }
}

/**
 * Mark import_record status as 'complete'.
 */
async function markImportComplete(db: Pool, importRecordId: string): Promise<void> {
  await db.query(
    `UPDATE import_records
     SET status = 'complete', completed_at = NOW()
     WHERE id = $1`,
    [importRecordId],
  );
}

/**
 * Create an "AI enrichment ready" in-app notification.
 */
async function createEnrichmentNotification(
  db: Pool,
  userId: string,
  importRecordId: string,
  platform: ChatPlatform,
  enrichedCount: number,
): Promise<void> {
  const platformLabel = platform.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const title = `AI analysis complete for your ${platformLabel} import`;
  const description = `Topics and sentiment now available for ${enrichedCount} conversation${enrichedCount !== 1 ? 's' : ''}.`;
  const actionUrl = `/imports/${importRecordId}/matches`;

  await db.query(
    `INSERT INTO in_app_notifications (user_id, event_type, title, description, action_url)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'ai_enrichment_ready', title, description, actionUrl],
  );
}
