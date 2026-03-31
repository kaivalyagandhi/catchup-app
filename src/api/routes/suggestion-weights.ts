/**
 * Suggestion Weights API Routes
 *
 * GET  /api/suggestion-weights — get current signal weights
 * PUT  /api/suggestion-weights — update signal weights (validate sum ≈ 1.0)
 *
 * Requirements: 17.4
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import pool from '../../db/connection';

const router = Router();

/**
 * GET /
 *
 * Returns the current signal weights for the authenticated user,
 * falling back to global defaults.
 *
 * Requirements: 17.4
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

      // Try user-specific weights first
      const { rows: userRows } = await pool.query(
        `SELECT enrichment_data, interaction_logs, calendar_data, contact_metadata, updated_at
         FROM suggestion_signal_weights WHERE user_id = $1 LIMIT 1`,
        [userId],
      );

      if (userRows.length > 0) {
        res.json({
          enrichmentData: parseFloat(userRows[0].enrichment_data),
          interactionLogs: parseFloat(userRows[0].interaction_logs),
          calendarData: parseFloat(userRows[0].calendar_data),
          contactMetadata: parseFloat(userRows[0].contact_metadata),
          updatedAt: userRows[0].updated_at,
          isCustom: true,
        });
        return;
      }

      // Fall back to global defaults
      const { rows: globalRows } = await pool.query(
        `SELECT enrichment_data, interaction_logs, calendar_data, contact_metadata, updated_at
         FROM suggestion_signal_weights WHERE user_id IS NULL LIMIT 1`,
      );

      if (globalRows.length > 0) {
        res.json({
          enrichmentData: parseFloat(globalRows[0].enrichment_data),
          interactionLogs: parseFloat(globalRows[0].interaction_logs),
          calendarData: parseFloat(globalRows[0].calendar_data),
          contactMetadata: parseFloat(globalRows[0].contact_metadata),
          updatedAt: globalRows[0].updated_at,
          isCustom: false,
        });
        return;
      }

      // Hardcoded defaults
      res.json({
        enrichmentData: 0.25,
        interactionLogs: 0.35,
        calendarData: 0.25,
        contactMetadata: 0.15,
        updatedAt: null,
        isCustom: false,
      });
    } catch (error) {
      console.error('[SuggestionWeights] Get error:', error);
      res.status(500).json({ error: 'Failed to fetch suggestion weights' });
    }
  },
);

/**
 * PUT /
 *
 * Updates signal weights for the authenticated user.
 * Validates that the sum of all weights is approximately 1.0 (0.99–1.01).
 *
 * Requirements: 17.4
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

      const { enrichmentData, interactionLogs, calendarData, contactMetadata } = req.body;

      // Validate all fields are numbers
      if (
        typeof enrichmentData !== 'number' ||
        typeof interactionLogs !== 'number' ||
        typeof calendarData !== 'number' ||
        typeof contactMetadata !== 'number'
      ) {
        res.status(400).json({ error: 'All weight fields must be numbers' });
        return;
      }

      // Validate non-negative
      if (enrichmentData < 0 || interactionLogs < 0 || calendarData < 0 || contactMetadata < 0) {
        res.status(400).json({ error: 'All weight fields must be non-negative' });
        return;
      }

      // Validate sum ≈ 1.0
      const sum = enrichmentData + interactionLogs + calendarData + contactMetadata;
      if (sum < 0.99 || sum > 1.01) {
        res.status(400).json({
          error: 'Signal weights must sum to approximately 1.0',
          code: 'INVALID_WEIGHTS_SUM',
          currentSum: sum,
        });
        return;
      }

      // Upsert user-specific weights
      const { rows } = await pool.query(
        `INSERT INTO suggestion_signal_weights (user_id, enrichment_data, interaction_logs, calendar_data, contact_metadata, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id) WHERE user_id IS NOT NULL
         DO UPDATE SET enrichment_data = $2, interaction_logs = $3, calendar_data = $4, contact_metadata = $5, updated_at = NOW()
         RETURNING enrichment_data, interaction_logs, calendar_data, contact_metadata, updated_at`,
        [userId, enrichmentData, interactionLogs, calendarData, contactMetadata],
      );

      if (rows.length > 0) {
        res.json({
          enrichmentData: parseFloat(rows[0].enrichment_data),
          interactionLogs: parseFloat(rows[0].interaction_logs),
          calendarData: parseFloat(rows[0].calendar_data),
          contactMetadata: parseFloat(rows[0].contact_metadata),
          updatedAt: rows[0].updated_at,
          isCustom: true,
        });
      } else {
        res.status(500).json({ error: 'Failed to save weights' });
      }
    } catch (error) {
      console.error('[SuggestionWeights] Update error:', error);
      res.status(500).json({ error: 'Failed to update suggestion weights' });
    }
  },
);

export default router;
