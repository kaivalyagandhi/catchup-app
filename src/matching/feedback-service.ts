/**
 * FeedbackService
 *
 * Manages structured feedback on suggestions, feedback-driven weight adjustment,
 * post-interaction reviews, and pending review retrieval.
 *
 * Requirements: 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.4, 8.1,
 *               13.1, 13.4, 13.5, 13.6, 13.8
 */

import pool from '../db/connection';
import { FeedbackPreset, ReviewOutcome } from '../types';

// ── Public types ────────────────────────────────────────────────────────────

export const VALID_PRESETS: FeedbackPreset[] = [
  'already_in_touch',
  'not_relevant',
  'timing_off',
  'dont_suggest_contact',
  'other',
];

export const VALID_REVIEW_OUTCOMES: ReviewOutcome[] = [
  'went_well',
  'not_great',
  'not_yet',
  'skip',
];

export interface FeedbackRecord {
  id: string;
  suggestionId: string;
  userId: string;
  preset: FeedbackPreset;
  comment?: string;
  createdAt: Date;
}

export interface FeedbackSummary {
  preset: FeedbackPreset;
  count: number;
}

export interface ReviewRecord {
  id: string;
  suggestionId: string;
  userId: string;
  outcome: ReviewOutcome;
  createdAt: Date;
}

// ── Weight adjustment constants ─────────────────────────────────────────────

const WEIGHT_MIN = 0.05;
const WEIGHT_MAX = 0.60;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Clamp a value to [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Normalize four weights so they sum to 1.0, then clamp each to [WEIGHT_MIN, WEIGHT_MAX].
 * Repeats until stable (handles cases where clamping breaks the sum).
 */
function normalizeAndClamp(weights: {
  enrichmentData: number;
  interactionLogs: number;
  calendarData: number;
  contactMetadata: number;
}): {
  enrichmentData: number;
  interactionLogs: number;
  calendarData: number;
  contactMetadata: number;
} {
  const keys = ['enrichmentData', 'interactionLogs', 'calendarData', 'contactMetadata'] as const;
  const w = { ...weights };

  // Iterate to convergence (clamping can break the sum)
  for (let iter = 0; iter < 10; iter++) {
    const sum = keys.reduce((s, k) => s + w[k], 0);
    if (sum <= 0) {
      // Fallback: equal weights
      for (const k of keys) w[k] = 0.25;
      return w;
    }
    // Normalize
    for (const k of keys) w[k] = w[k] / sum;
    // Clamp
    for (const k of keys) w[k] = clamp(w[k], WEIGHT_MIN, WEIGHT_MAX);
    // Check if sum is close enough
    const newSum = keys.reduce((s, k) => s + w[k], 0);
    if (Math.abs(newSum - 1.0) < 0.001) break;
  }

  // Final normalize pass to ensure sum = 1.0
  const finalSum = keys.reduce((s, k) => s + w[k], 0);
  for (const k of keys) w[k] = w[k] / finalSum;

  return w;
}

// ── FeedbackService class ───────────────────────────────────────────────────

export class FeedbackService {
  /**
   * Persist feedback and dismiss the suggestion in one transaction.
   * If preset is 'dont_suggest_contact', also creates an exclusion record.
   *
   * Requirements: 4.4, 4.5, 7.4, 8.1
   */
  async submitFeedback(
    suggestionId: string,
    userId: string,
    preset: FeedbackPreset,
    comment?: string,
  ): Promise<FeedbackRecord> {
    if (!VALID_PRESETS.includes(preset)) {
      const error = new Error(
        `Invalid preset. Must be one of: ${VALID_PRESETS.join(', ')}`,
      );
      (error as any).statusCode = 400;
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert feedback record
      const feedbackResult = await client.query(
        `INSERT INTO suggestion_feedback (suggestion_id, user_id, preset, comment)
         VALUES ($1, $2, $3, $4)
         RETURNING id, suggestion_id, user_id, preset, comment, created_at`,
        [suggestionId, userId, preset, comment || null],
      );

      // Dismiss the suggestion
      const updateResult = await client.query(
        `UPDATE suggestions
         SET status = 'dismissed', updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [suggestionId, userId],
      );

      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        const error = new Error('Suggestion not found');
        (error as any).statusCode = 404;
        throw error;
      }

      // Handle 'dont_suggest_contact' — create exclusion
      if (preset === 'dont_suggest_contact') {
        // Get the contact_id from the suggestion
        const suggestionResult = await client.query(
          `SELECT contact_id FROM suggestions WHERE id = $1`,
          [suggestionId],
        );

        if (suggestionResult.rows.length > 0 && suggestionResult.rows[0].contact_id) {
          await client.query(
            `INSERT INTO suggestion_exclusions (user_id, contact_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, contact_id) DO NOTHING`,
            [userId, suggestionResult.rows[0].contact_id],
          );
        }
      }

      await client.query('COMMIT');

      const row = feedbackResult.rows[0];
      return {
        id: row.id,
        suggestionId: row.suggestion_id,
        userId: row.user_id,
        preset: row.preset as FeedbackPreset,
        comment: row.comment || undefined,
        createdAt: new Date(row.created_at),
      };
    } catch (err) {
      // Only rollback if we haven't already
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback errors
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get aggregated feedback counts for a user, grouped by preset.
   *
   * Requirements: 7.3
   */
  async getFeedbackSummary(userId: string): Promise<FeedbackSummary[]> {
    const result = await pool.query(
      `SELECT preset, COUNT(*)::int AS count
       FROM suggestion_feedback
       WHERE user_id = $1
       GROUP BY preset
       ORDER BY count DESC`,
      [userId],
    );

    return result.rows.map((row: any) => ({
      preset: row.preset as FeedbackPreset,
      count: row.count,
    }));
  }

  /**
   * Check feedback patterns and adjust signal weights if thresholds are met.
   *
   * Rules (30-day window):
   *  - 5× not_relevant   → contactMetadata  −10%
   *  - 5× timing_off     → calendarData     −10%
   *  - 3× already_in_touch → interactionLogs +10%
   *
   * After adjustment: normalize to sum 1.0, clamp each to [0.05, 0.60].
   * UPSERT into suggestion_signal_weights.
   *
   * Requirements: 5.1, 5.2, 5.4, 5.5, 5.6
   */
  async adjustWeightsFromFeedback(userId: string): Promise<void> {
    // Query 30-day feedback counts by preset
    const countsResult = await pool.query(
      `SELECT preset, COUNT(*)::int AS count
       FROM suggestion_feedback
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY preset`,
      [userId],
    );

    const counts: Record<string, number> = {};
    for (const row of countsResult.rows) {
      counts[row.preset] = row.count;
    }

    const notRelevantCount = counts['not_relevant'] || 0;
    const timingOffCount = counts['timing_off'] || 0;
    const alreadyInTouchCount = counts['already_in_touch'] || 0;

    // Check if any threshold is met
    const shouldAdjust =
      notRelevantCount >= 5 || timingOffCount >= 5 || alreadyInTouchCount >= 3;

    if (!shouldAdjust) return;

    // Get current weights for the user
    const weightsResult = await pool.query(
      `SELECT enrichment_data, interaction_logs, calendar_data, contact_metadata
       FROM suggestion_signal_weights
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );

    let weights = {
      enrichmentData: 0.25,
      interactionLogs: 0.35,
      calendarData: 0.25,
      contactMetadata: 0.15,
    };

    if (weightsResult.rows.length > 0) {
      weights = {
        enrichmentData: parseFloat(weightsResult.rows[0].enrichment_data),
        interactionLogs: parseFloat(weightsResult.rows[0].interaction_logs),
        calendarData: parseFloat(weightsResult.rows[0].calendar_data),
        contactMetadata: parseFloat(weightsResult.rows[0].contact_metadata),
      };
    } else {
      // Try global defaults
      const globalResult = await pool.query(
        `SELECT enrichment_data, interaction_logs, calendar_data, contact_metadata
         FROM suggestion_signal_weights
         WHERE user_id IS NULL
         LIMIT 1`,
      );
      if (globalResult.rows.length > 0) {
        weights = {
          enrichmentData: parseFloat(globalResult.rows[0].enrichment_data),
          interactionLogs: parseFloat(globalResult.rows[0].interaction_logs),
          calendarData: parseFloat(globalResult.rows[0].calendar_data),
          contactMetadata: parseFloat(globalResult.rows[0].contact_metadata),
        };
      }
    }

    // Apply threshold rules
    if (notRelevantCount >= 5) {
      weights.contactMetadata *= 0.90; // −10%
    }
    if (timingOffCount >= 5) {
      weights.calendarData *= 0.90; // −10%
    }
    if (alreadyInTouchCount >= 3) {
      weights.interactionLogs *= 1.10; // +10%
    }

    // Normalize and clamp
    const adjusted = normalizeAndClamp(weights);

    // UPSERT into suggestion_signal_weights
    await pool.query(
      `INSERT INTO suggestion_signal_weights
         (user_id, enrichment_data, interaction_logs, calendar_data, contact_metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) WHERE user_id IS NOT NULL
       DO UPDATE SET
         enrichment_data = $2,
         interaction_logs = $3,
         calendar_data = $4,
         contact_metadata = $5,
         updated_at = NOW()`,
      [
        userId,
        adjusted.enrichmentData,
        adjusted.interactionLogs,
        adjusted.calendarData,
        adjusted.contactMetadata,
      ],
    );
  }

  /**
   * Submit a post-interaction review.
   *
   * Outcomes:
   *  - 'went_well':  +5% to contributing signal weights, normalize
   *  - 'not_great':  −5% to contributing signal weights, normalize
   *  - 'not_yet':    reschedule review_prompt_after +48h (max 2 reschedules)
   *  - 'skip':       no-op
   *
   * Requirements: 13.4, 13.5, 13.6
   */
  async submitReview(
    suggestionId: string,
    userId: string,
    outcome: ReviewOutcome,
  ): Promise<ReviewRecord> {
    if (!VALID_REVIEW_OUTCOMES.includes(outcome)) {
      const error = new Error(
        `Invalid outcome. Must be one of: ${VALID_REVIEW_OUTCOMES.join(', ')}`,
      );
      (error as any).statusCode = 400;
      throw error;
    }

    // Verify suggestion exists, belongs to user, and is accepted
    const suggestionResult = await pool.query(
      `SELECT id, status, review_reschedule_count
       FROM suggestions
       WHERE id = $1 AND user_id = $2`,
      [suggestionId, userId],
    );

    if (suggestionResult.rows.length === 0) {
      const error = new Error('Suggestion not found');
      (error as any).statusCode = 404;
      throw error;
    }

    const suggestion = suggestionResult.rows[0];
    if (suggestion.status !== 'accepted') {
      const error = new Error('Can only review accepted suggestions');
      (error as any).statusCode = 400;
      throw error;
    }

    // Handle 'not_yet' — reschedule
    if (outcome === 'not_yet') {
      const rescheduleCount = suggestion.review_reschedule_count || 0;
      if (rescheduleCount < 2) {
        await pool.query(
          `UPDATE suggestions
           SET review_prompt_after = NOW() + INTERVAL '48 hours',
               review_reschedule_count = review_reschedule_count + 1,
               updated_at = NOW()
           WHERE id = $1 AND user_id = $2`,
          [suggestionId, userId],
        );
      }
      // If rescheduleCount >= 2, no further rescheduling — just record the review
    }

    // Record the review outcome on the suggestion
    await pool.query(
      `UPDATE suggestions
       SET review_outcome = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [suggestionId, userId, outcome],
    );

    // Handle weight adjustments for went_well / not_great
    if (outcome === 'went_well' || outcome === 'not_great') {
      await this.adjustWeightsFromReview(userId, outcome);
    }

    // Return a ReviewRecord (we don't have a separate reviews table,
    // the outcome is stored on the suggestion itself)
    return {
      id: suggestionId, // Use suggestion ID as the review ID
      suggestionId,
      userId,
      outcome,
      createdAt: new Date(),
    };
  }

  /**
   * Adjust signal weights based on review outcome.
   * 'went_well' → +5% to all contributing weights
   * 'not_great' → −5% to all contributing weights
   */
  private async adjustWeightsFromReview(
    userId: string,
    outcome: 'went_well' | 'not_great',
  ): Promise<void> {
    // Get current weights
    const weightsResult = await pool.query(
      `SELECT enrichment_data, interaction_logs, calendar_data, contact_metadata
       FROM suggestion_signal_weights
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );

    let weights = {
      enrichmentData: 0.25,
      interactionLogs: 0.35,
      calendarData: 0.25,
      contactMetadata: 0.15,
    };

    if (weightsResult.rows.length > 0) {
      weights = {
        enrichmentData: parseFloat(weightsResult.rows[0].enrichment_data),
        interactionLogs: parseFloat(weightsResult.rows[0].interaction_logs),
        calendarData: parseFloat(weightsResult.rows[0].calendar_data),
        contactMetadata: parseFloat(weightsResult.rows[0].contact_metadata),
      };
    } else {
      // Try global defaults
      const globalResult = await pool.query(
        `SELECT enrichment_data, interaction_logs, calendar_data, contact_metadata
         FROM suggestion_signal_weights
         WHERE user_id IS NULL
         LIMIT 1`,
      );
      if (globalResult.rows.length > 0) {
        weights = {
          enrichmentData: parseFloat(globalResult.rows[0].enrichment_data),
          interactionLogs: parseFloat(globalResult.rows[0].interaction_logs),
          calendarData: parseFloat(globalResult.rows[0].calendar_data),
          contactMetadata: parseFloat(globalResult.rows[0].contact_metadata),
        };
      }
    }

    const factor = outcome === 'went_well' ? 1.05 : 0.95;

    // Apply factor to all contributing weights
    weights.enrichmentData *= factor;
    weights.interactionLogs *= factor;
    weights.calendarData *= factor;
    weights.contactMetadata *= factor;

    // Normalize and clamp
    const adjusted = normalizeAndClamp(weights);

    // UPSERT
    await pool.query(
      `INSERT INTO suggestion_signal_weights
         (user_id, enrichment_data, interaction_logs, calendar_data, contact_metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) WHERE user_id IS NOT NULL
       DO UPDATE SET
         enrichment_data = $2,
         interaction_logs = $3,
         calendar_data = $4,
         contact_metadata = $5,
         updated_at = NOW()`,
      [
        userId,
        adjusted.enrichmentData,
        adjusted.interactionLogs,
        adjusted.calendarData,
        adjusted.contactMetadata,
      ],
    );
  }

  /**
   * Get suggestions pending post-interaction review.
   *
   * Returns accepted suggestions where:
   *  - review_prompt_after < NOW()
   *  - no review_outcome set
   *  - accepted within last 7 days (auto-dismiss after 7 days)
   *
   * Requirements: 13.2, 13.8
   */
  async getPendingReviews(
    userId: string,
  ): Promise<Array<{ suggestionId: string; contactName: string; acceptedAt: Date }>> {
    const result = await pool.query(
      `SELECT s.id AS suggestion_id,
              c.name AS contact_name,
              s.updated_at AS accepted_at
       FROM suggestions s
       LEFT JOIN contacts c ON c.id = s.contact_id
       WHERE s.user_id = $1
         AND s.status = 'accepted'
         AND s.review_prompt_after IS NOT NULL
         AND s.review_prompt_after < NOW()
         AND s.review_outcome IS NULL
         AND s.updated_at >= NOW() - INTERVAL '7 days'
       ORDER BY s.review_prompt_after ASC`,
      [userId],
    );

    return result.rows.map((row: any) => ({
      suggestionId: row.suggestion_id,
      contactName: row.contact_name || 'Unknown',
      acceptedAt: new Date(row.accepted_at),
    }));
  }
}
