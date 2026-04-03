/**
 * Suggestion Feedback Routes
 *
 * Handles feedback submission, feedback summary, post-interaction reviews,
 * bulk dismiss, and contact exclusion management.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.3, 8.4, 10.3, 10.4, 13.7
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import {
  FeedbackService,
  VALID_PRESETS,
  VALID_REVIEW_OUTCOMES,
} from '../../matching/feedback-service';
import pool from '../../db/connection';

const router = Router();
const feedbackService = new FeedbackService();

// POST /suggestions/:id/feedback — Submit feedback and dismiss suggestion
router.post(
  '/:id/feedback',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { preset, comment } = req.body;

      if (!preset || !VALID_PRESETS.includes(preset)) {
        res.status(400).json({
          error: `Invalid preset. Must be one of: ${VALID_PRESETS.join(', ')}`,
        });
        return;
      }

      // Check suggestion exists and belongs to user
      const suggestionResult = await pool.query(
        'SELECT id FROM suggestions WHERE id = $1 AND user_id = $2',
        [req.params.id, userId],
      );

      if (suggestionResult.rows.length === 0) {
        res.status(404).json({ error: 'Suggestion not found' });
        return;
      }

      const record = await feedbackService.submitFeedback(
        req.params.id,
        userId,
        preset,
        comment,
      );

      res.status(201).json(record);
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.status(404).json({ error: error.message });
        return;
      }
      console.error('Error submitting feedback:', error);
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  },
);


// GET /suggestions/feedback/summary — Aggregated feedback counts
router.get(
  '/feedback/summary',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const summary = await feedbackService.getFeedbackSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error('Error fetching feedback summary:', error);
      res.status(500).json({ error: 'Failed to fetch feedback summary' });
    }
  },
);

// POST /suggestions/:id/review — Submit post-interaction review
router.post(
  '/:id/review',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { outcome } = req.body;

      if (!outcome || !VALID_REVIEW_OUTCOMES.includes(outcome)) {
        res.status(400).json({
          error: `Invalid outcome. Must be one of: ${VALID_REVIEW_OUTCOMES.join(', ')}`,
        });
        return;
      }

      // Check suggestion exists, belongs to user, and is accepted
      const suggestionResult = await pool.query(
        'SELECT id, status FROM suggestions WHERE id = $1 AND user_id = $2',
        [req.params.id, userId],
      );

      if (suggestionResult.rows.length === 0) {
        res.status(404).json({ error: 'Suggestion not found' });
        return;
      }

      if (suggestionResult.rows[0].status !== 'accepted') {
        res.status(400).json({ error: 'Can only review accepted suggestions' });
        return;
      }

      const review = await feedbackService.submitReview(
        req.params.id,
        userId,
        outcome,
      );

      res.status(201).json(review);
    } catch (error: any) {
      if (error.statusCode === 400) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error.statusCode === 404) {
        res.status(404).json({ error: error.message });
        return;
      }
      console.error('Error submitting review:', error);
      res.status(500).json({ error: 'Failed to submit review' });
    }
  },
);

// POST /suggestions/dismiss-all — Bulk dismiss all pending suggestions
router.post(
  '/dismiss-all',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Query all pending suggestions for user
      const pendingResult = await pool.query(
        "SELECT id FROM suggestions WHERE user_id = $1 AND status = 'pending'",
        [userId],
      );

      const pendingIds: string[] = pendingResult.rows.map((row: any) => row.id);

      // Submit feedback with 'not_relevant' for each
      for (const suggestionId of pendingIds) {
        await feedbackService.submitFeedback(
          suggestionId,
          userId,
          'not_relevant',
        );
      }

      res.json({ dismissed: pendingIds.length });
    } catch (error) {
      console.error('Error bulk dismissing suggestions:', error);
      res.status(500).json({ error: 'Failed to dismiss suggestions' });
    }
  },
);

// GET /suggestions/exclusions — List excluded contacts
router.get(
  '/exclusions',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await pool.query(
        `SELECT se.id, se.contact_id, se.created_at, c.name AS contact_name
         FROM suggestion_exclusions se
         LEFT JOIN contacts c ON c.id = se.contact_id
         WHERE se.user_id = $1
         ORDER BY se.created_at DESC`,
        [userId],
      );

      const exclusions = result.rows.map((row: any) => ({
        id: row.id,
        contactId: row.contact_id,
        contactName: row.contact_name || 'Unknown',
        createdAt: new Date(row.created_at),
      }));

      res.json(exclusions);
    } catch (error) {
      console.error('Error fetching exclusions:', error);
      res.status(500).json({ error: 'Failed to fetch exclusions' });
    }
  },
);

// DELETE /suggestions/exclusions/:contactId — Remove exclusion
router.delete(
  '/exclusions/:contactId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await pool.query(
        'DELETE FROM suggestion_exclusions WHERE user_id = $1 AND contact_id = $2',
        [userId, req.params.contactId],
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Exclusion not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error removing exclusion:', error);
      res.status(500).json({ error: 'Failed to remove exclusion' });
    }
  },
);

export default router;
