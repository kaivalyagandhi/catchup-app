/**
 * Import API Routes
 *
 * POST /api/imports/upload — Upload a chat export file for processing.
 * GET  /api/imports/:jobId/status — Poll import job progress.
 * GET  /api/imports/history — List import records sorted by date descending.
 * DELETE /api/imports/:importId — Delete import and cascade data.
 * POST /api/imports/:importId/reimport — Re-import with new file.
 * GET  /api/imports/:importId/matches — Get likely matches for review.
 * POST /api/imports/matches/:matchId/confirm — Confirm a likely match.
 * POST /api/imports/matches/:matchId/reject — Reject a match.
 * POST /api/imports/matches/:matchId/skip — Skip a match for later.
 *
 * Requirements: 5.5, 5.6, 5.7, 5.8, 7.2, 7.5, 7.6, 7.7, 11.1, 11.2, 11.3, 11.5, 11.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { createHash } from 'crypto';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { detectPlatform } from '../../chat-import/parser';
import pool from '../../db/connection';
import { CloudTasksQueue } from '../../jobs/cloud-tasks-client';

const router = Router();

// 200 MB limit
const MAX_FILE_SIZE = 200 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

/** Maximum concurrent imports (status in processing/parsed/enriching) per user */
const MAX_CONCURRENT_IMPORTS = 3;

/**
 * POST /upload
 *
 * Accepts a multipart file upload, auto-detects the platform, checks limits
 * and dedup, creates an import_record, enqueues a parse job, and returns
 * the jobId.
 */
router.post(
  '/upload',
  authenticate,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: any) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: 'FILE_TOO_LARGE',
          message: `File exceeds the maximum allowed size of 200 MB.`,
        });
        return;
      }
      if (err) {
        return next(err);
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No file provided. Please upload a chat export file.' });
        return;
      }

      // --- Platform detection (first 4 KB) ---
      const headerBytes = Buffer.from(file.buffer.buffer, file.buffer.byteOffset, Math.min(4096, file.buffer.byteLength));
      const platform = detectPlatform(file.originalname, headerBytes);

      if (!platform) {
        res.status(400).json({
          error: 'UNRECOGNIZED_FORMAT',
          message:
            'The uploaded file does not match a supported chat export format. ' +
            'Supported formats: WhatsApp (.txt), Instagram (.json), Facebook Messenger (.json), ' +
            'X/Twitter DMs (.json), Google Messages/SMS (.xml), iMessage (.csv).',
        });
        return;
      }

      // --- Concurrent import limit ---
      const { rows: activeImports } = await pool.query(
        `SELECT COUNT(*)::int AS count FROM import_records
         WHERE user_id = $1 AND status IN ('processing', 'parsed', 'enriching')`,
        [userId],
      );

      if (activeImports[0].count >= MAX_CONCURRENT_IMPORTS) {
        res.status(429).json({
          error: 'IMPORT_LIMIT_EXCEEDED',
          message: `You already have ${MAX_CONCURRENT_IMPORTS} imports in progress. Please wait for one to complete before uploading another.`,
        });
        return;
      }

      // --- File hash for dedup ---
      const fileHash = createHash('sha256').update(file.buffer).digest('hex');

      const { rows: existingImports } = await pool.query(
        `SELECT id FROM import_records WHERE user_id = $1 AND file_hash = $2`,
        [userId, fileHash],
      );

      if (existingImports.length > 0) {
        res.status(409).json({
          error: 'DUPLICATE_FILE',
          message: 'This file has already been imported. If you want to re-import, use the re-import action on the existing import.',
        });
        return;
      }

      // --- Create import_record (store raw_content for async parse job) ---
      const { rows: inserted } = await pool.query(
        `INSERT INTO import_records (user_id, platform, file_name, file_hash, status, raw_content)
         VALUES ($1, $2, $3, $4, 'processing', $5)
         RETURNING id`,
        [userId, platform, file.originalname, fileHash, file.buffer],
      );

      const importRecordId = inserted[0].id;

      // --- Enqueue parse job via Cloud Tasks ---
      try {
        const queue = new CloudTasksQueue('import-parse');
        await queue.add('import-parse', {
          importRecordId,
          userId,
          platform,
          fileHash,
        });
      } catch (enqueueError) {
        // If enqueue fails, still return the jobId — the job can be retried later
        console.error('[Imports] Failed to enqueue parse job:', enqueueError);
      }

      res.status(201).json({
        jobId: importRecordId,
        status: 'processing',
      });
    } catch (error) {
      console.error('[Imports] Upload error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while processing the upload.' });
    }
  },
);

/**
 * Percentage estimation based on import status.
 */
function estimatePercentage(status: string): number {
  switch (status) {
    case 'processing': return 25;
    case 'parsed': return 50;
    case 'enriching': return 75;
    case 'complete': return 100;
    case 'failed': return 0;
    default: return 0;
  }
}

/**
 * Map import status to a user-facing phase label.
 */
function statusToPhase(status: string): string {
  switch (status) {
    case 'processing': return 'parsing';
    case 'parsed': return 'matching';
    case 'enriching': return 'enriching';
    case 'complete': return 'complete';
    case 'failed': return 'failed';
    default: return status;
  }
}

/**
 * GET /:jobId/status
 *
 * Returns the current status/phase, estimated percentage, and match counts
 * for a given import job.
 *
 * Requirements: 11.2, 11.3
 */
router.get(
  '/:jobId/status',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { jobId } = req.params;

      const { rows } = await pool.query(
        `SELECT status, failed_phase, error_message,
                total_participants, auto_matched, likely_matched, unmatched
         FROM import_records
         WHERE id = $1 AND user_id = $2`,
        [jobId, userId],
      );

      if (rows.length === 0) {
        res.status(404).json({ error: 'Import not found' });
        return;
      }

      const record = rows[0];

      res.json({
        status: record.status,
        phase: statusToPhase(record.status),
        percentage: estimatePercentage(record.status),
        autoMatched: record.auto_matched,
        likelyMatched: record.likely_matched,
        unmatched: record.unmatched,
        totalParticipants: record.total_participants,
        failedPhase: record.failed_phase || null,
        errorMessage: record.error_message || null,
      });
    } catch (error) {
      console.error('[Imports] Status polling error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while fetching import status.' });
    }
  },
);

/**
 * GET /history
 *
 * Returns all import records for the authenticated user, sorted by
 * created_at descending.
 *
 * Requirements: 12.1, 12.2
 */
router.get(
  '/history',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { rows } = await pool.query(
        `SELECT id, platform, file_name, file_hash, status,
                total_participants, auto_matched, likely_matched, unmatched,
                enrichment_records_created, created_at, completed_at
         FROM import_records
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId],
      );

      res.json(
        rows.map((r: any) => ({
          id: r.id,
          platform: r.platform,
          fileName: r.file_name,
          fileHash: r.file_hash,
          status: r.status,
          totalParticipants: r.total_participants,
          autoMatched: r.auto_matched,
          likelyMatched: r.likely_matched,
          unmatched: r.unmatched,
          enrichmentRecordsCreated: r.enrichment_records_created,
          createdAt: r.created_at,
          completedAt: r.completed_at,
        })),
      );
    } catch (error) {
      console.error('[Imports] History error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while fetching import history.' });
    }
  },
);

/**
 * DELETE /:importId
 *
 * Deletes an import record and cascades to enrichment_records,
 * pending_enrichments, and interaction_summaries. Recalculates
 * lastContactDate for affected contacts.
 *
 * Requirements: 12.3, 12.4, 12.5
 */
router.delete(
  '/:importId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        client.release();
        return;
      }

      const { importId } = req.params;

      // Verify ownership
      const { rows: importRows } = await client.query(
        `SELECT id FROM import_records WHERE id = $1 AND user_id = $2`,
        [importId, userId],
      );

      if (importRows.length === 0) {
        res.status(404).json({ error: 'Import not found' });
        client.release();
        return;
      }

      await client.query('BEGIN');

      // Find contacts affected by this import (before deleting enrichment_records)
      const { rows: affectedContacts } = await client.query(
        `SELECT DISTINCT contact_id FROM enrichment_records
         WHERE import_record_id = $1 AND user_id = $2`,
        [importId, userId],
      );

      // Delete enrichment_records for this import
      await client.query(
        `DELETE FROM enrichment_records WHERE import_record_id = $1 AND user_id = $2`,
        [importId, userId],
      );

      // Delete pending_enrichments for this import
      await client.query(
        `DELETE FROM pending_enrichments WHERE import_record_id = $1 AND user_id = $2`,
        [importId, userId],
      );

      // Delete interaction_summaries for this import
      await client.query(
        `DELETE FROM interaction_summaries WHERE import_record_id = $1`,
        [importId],
      );

      // Delete the import_record itself
      await client.query(
        `DELETE FROM import_records WHERE id = $1 AND user_id = $2`,
        [importId, userId],
      );

      // Recalculate lastContactDate for affected contacts
      for (const { contact_id } of affectedContacts) {
        const { rows: remaining } = await client.query(
          `SELECT MAX(last_message_date) AS max_date
           FROM enrichment_records
           WHERE contact_id = $1`,
          [contact_id],
        );

        const newLastDate = remaining[0]?.max_date || null;

        await client.query(
          `UPDATE contacts SET last_contact_date = $1 WHERE id = $2`,
          [newLastDate, contact_id],
        );
      }

      await client.query('COMMIT');

      res.json({ deleted: true });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[Imports] Delete error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while deleting the import.' });
    } finally {
      client.release();
    }
  },
);

/**
 * POST /:importId/reimport
 *
 * Accepts a new file upload, deletes old data from the previous import,
 * and processes the new file as a fresh import.
 *
 * Requirements: 12.5
 */
router.post(
  '/:importId/reimport',
  authenticate,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: any) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: 'FILE_TOO_LARGE',
          message: `File exceeds the maximum allowed size of 200 MB.`,
        });
        return;
      }
      if (err) {
        return next(err);
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        client.release();
        return;
      }

      const { importId } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No file provided. Please upload a chat export file.' });
        client.release();
        return;
      }

      // Verify ownership
      const { rows: importRows } = await client.query(
        `SELECT id, platform FROM import_records WHERE id = $1 AND user_id = $2`,
        [importId, userId],
      );

      if (importRows.length === 0) {
        res.status(404).json({ error: 'Import not found' });
        client.release();
        return;
      }

      // Platform detection on new file
      const headerBytes = Buffer.from(file.buffer.buffer, file.buffer.byteOffset, Math.min(4096, file.buffer.byteLength));
      const platform = detectPlatform(file.originalname, headerBytes);

      if (!platform) {
        res.status(400).json({
          error: 'UNRECOGNIZED_FORMAT',
          message:
            'The uploaded file does not match a supported chat export format. ' +
            'Supported formats: WhatsApp (.txt), Instagram (.json), Facebook Messenger (.json), ' +
            'X/Twitter DMs (.json), Google Messages/SMS (.xml), iMessage (.csv).',
        });
        client.release();
        return;
      }

      const fileHash = createHash('sha256').update(file.buffer).digest('hex');

      await client.query('BEGIN');

      // Find contacts affected by the old import
      const { rows: affectedContacts } = await client.query(
        `SELECT DISTINCT contact_id FROM enrichment_records
         WHERE import_record_id = $1 AND user_id = $2`,
        [importId, userId],
      );

      // Delete old data
      await client.query(
        `DELETE FROM enrichment_records WHERE import_record_id = $1 AND user_id = $2`,
        [importId, userId],
      );
      await client.query(
        `DELETE FROM pending_enrichments WHERE import_record_id = $1 AND user_id = $2`,
        [importId, userId],
      );
      await client.query(
        `DELETE FROM interaction_summaries WHERE import_record_id = $1`,
        [importId],
      );

      // Update the import_record with new file data and reset status
      await client.query(
        `UPDATE import_records
         SET platform = $1, file_name = $2, file_hash = $3, status = 'processing',
             raw_content = $4, failed_phase = NULL, error_message = NULL,
             total_participants = 0, auto_matched = 0, likely_matched = 0,
             unmatched = 0, enrichment_records_created = 0, completed_at = NULL
         WHERE id = $5 AND user_id = $6`,
        [platform, file.originalname, fileHash, file.buffer, importId, userId],
      );

      // Recalculate lastContactDate for affected contacts
      for (const { contact_id } of affectedContacts) {
        const { rows: remaining } = await client.query(
          `SELECT MAX(last_message_date) AS max_date
           FROM enrichment_records
           WHERE contact_id = $1`,
          [contact_id],
        );
        const newLastDate = remaining[0]?.max_date || null;
        await client.query(
          `UPDATE contacts SET last_contact_date = $1 WHERE id = $2`,
          [newLastDate, contact_id],
        );
      }

      await client.query('COMMIT');

      // Enqueue parse job for the new file
      try {
        const queue = new CloudTasksQueue('import-parse');
        await queue.add('import-parse', {
          importRecordId: importId,
          userId,
          platform,
          fileHash,
        });
      } catch (enqueueError) {
        console.error('[Imports] Failed to enqueue reimport parse job:', enqueueError);
      }

      res.status(201).json({
        jobId: importId,
        status: 'processing',
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[Imports] Reimport error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while re-importing.' });
    } finally {
      client.release();
    }
  },
);

/**
 * GET /:importId/matches
 *
 * Returns pending likely matches and unmatched with smart_suggestion for review.
 * Joins with contacts to include suggested contact name.
 *
 * Requirements: 7.2, 7.5, 7.7
 */
router.get(
  '/:importId/matches',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { importId } = req.params;

      // Verify the import belongs to the user
      const { rows: importRows } = await pool.query(
        `SELECT id FROM import_records WHERE id = $1 AND user_id = $2`,
        [importId, userId],
      );

      if (importRows.length === 0) {
        res.status(404).json({ error: 'Import not found' });
        return;
      }

      // Get likely matches and unmatched with smart_suggestion for review
      const { rows } = await pool.query(
        `SELECT pe.id, pe.participant_identifier, pe.participant_display_name,
                pe.platform, pe.match_tier, pe.suggested_contact_id,
                c.name AS suggested_contact_name,
                pe.confidence, pe.match_reason, pe.message_count,
                pe.first_message_date, pe.last_message_date
         FROM pending_enrichments pe
         LEFT JOIN contacts c ON pe.suggested_contact_id = c.id
         WHERE pe.import_record_id = $1
           AND pe.user_id = $2
           AND pe.status = 'pending'
           AND (pe.match_tier = 'likely' OR pe.match_reason = 'smart_suggestion')
         ORDER BY pe.confidence DESC NULLS LAST, pe.message_count DESC`,
        [importId, userId],
      );

      res.json(
        rows.map((r: any) => ({
          id: r.id,
          participantIdentifier: r.participant_identifier,
          participantDisplayName: r.participant_display_name,
          platform: r.platform,
          matchTier: r.match_tier,
          suggestedContactId: r.suggested_contact_id,
          suggestedContactName: r.suggested_contact_name,
          confidence: r.confidence ? parseFloat(r.confidence) : null,
          matchReason: r.match_reason,
          messageCount: r.message_count,
          firstMessageDate: r.first_message_date,
          lastMessageDate: r.last_message_date,
        })),
      );
    } catch (error) {
      console.error('[Imports] Get matches error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while fetching matches.' });
    }
  },
);

/**
 * POST /matches/:matchId/confirm
 *
 * Confirms a likely match: creates an enrichment_record linking the
 * interaction_summary to the suggested contact, updates the pending_enrichment
 * status to 'linked', and updates the contact's lastContactDate if needed.
 *
 * Requirements: 7.6, 7.7
 */
router.post(
  '/matches/:matchId/confirm',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        client.release();
        return;
      }

      const { matchId } = req.params;

      // Fetch the pending_enrichment and verify ownership
      const { rows: peRows } = await client.query(
        `SELECT id, user_id, import_record_id, interaction_summary_id,
                suggested_contact_id, platform, message_count,
                first_message_date, last_message_date, status
         FROM pending_enrichments
         WHERE id = $1 AND user_id = $2`,
        [matchId, userId],
      );

      if (peRows.length === 0) {
        res.status(404).json({ error: 'Match not found' });
        client.release();
        return;
      }

      const pe = peRows[0];

      if (pe.status !== 'pending') {
        res.status(400).json({ error: 'Match has already been resolved' });
        client.release();
        return;
      }

      if (!pe.suggested_contact_id) {
        res.status(400).json({ error: 'No suggested contact to confirm' });
        client.release();
        return;
      }

      await client.query('BEGIN');

      // Create enrichment_record
      const { rows: enrichmentRows } = await client.query(
        `INSERT INTO enrichment_records (
          contact_id, user_id, import_record_id, interaction_summary_id,
          platform, message_count, first_message_date, last_message_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          pe.suggested_contact_id,
          userId,
          pe.import_record_id,
          pe.interaction_summary_id,
          pe.platform,
          pe.message_count,
          pe.first_message_date,
          pe.last_message_date,
        ],
      );

      const enrichmentRecordId = enrichmentRows[0].id;

      // Update pending_enrichment status to 'linked'
      await client.query(
        `UPDATE pending_enrichments SET status = 'linked', resolved_at = NOW() WHERE id = $1`,
        [matchId],
      );

      // Update contact's lastContactDate if enrichment has a more recent date
      if (pe.last_message_date) {
        await client.query(
          `UPDATE contacts
           SET last_contact_date = $1
           WHERE id = $2 AND (last_contact_date IS NULL OR last_contact_date < $1)`,
          [pe.last_message_date, pe.suggested_contact_id],
        );
      }

      await client.query('COMMIT');

      res.json({ confirmed: true, enrichmentRecordId });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[Imports] Confirm match error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while confirming the match.' });
    } finally {
      client.release();
    }
  },
);

/**
 * POST /matches/:matchId/reject
 *
 * Rejects a match by setting the pending_enrichment status to 'dismissed'.
 *
 * Requirements: 7.5, 7.7
 */
router.post(
  '/matches/:matchId/reject',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { matchId } = req.params;

      const { rows } = await pool.query(
        `SELECT id, status FROM pending_enrichments WHERE id = $1 AND user_id = $2`,
        [matchId, userId],
      );

      if (rows.length === 0) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      if (rows[0].status !== 'pending') {
        res.status(400).json({ error: 'Match has already been resolved' });
        return;
      }

      await pool.query(
        `UPDATE pending_enrichments SET status = 'dismissed', resolved_at = NOW() WHERE id = $1`,
        [matchId],
      );

      res.json({ rejected: true });
    } catch (error) {
      console.error('[Imports] Reject match error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while rejecting the match.' });
    }
  },
);

/**
 * POST /matches/:matchId/skip
 *
 * Skips a match for later review. The pending_enrichment remains as 'pending'.
 *
 * Requirements: 7.5, 7.7
 */
router.post(
  '/matches/:matchId/skip',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { matchId } = req.params;

      const { rows } = await pool.query(
        `SELECT id, status FROM pending_enrichments WHERE id = $1 AND user_id = $2`,
        [matchId, userId],
      );

      if (rows.length === 0) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      if (rows[0].status !== 'pending') {
        res.status(400).json({ error: 'Match has already been resolved' });
        return;
      }

      res.json({ skipped: true });
    } catch (error) {
      console.error('[Imports] Skip match error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while skipping the match.' });
    }
  },
);

/**
 * POST /not-ready
 *
 * Called when the user clicks "My export isn't ready yet" in the import wizard.
 * Enqueues a Cloud Tasks job to send an export reminder notification 24 hours later.
 *
 * Requirements: 5.4, 26.3
 */
router.post(
  '/not-ready',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { platform } = req.body;
      if (!platform) {
        res.status(400).json({ error: 'platform is required' });
        return;
      }

      // Enqueue export reminder 24 hours from now
      const TWENTY_FOUR_HOURS = 24 * 60 * 60; // seconds
      try {
        const queue = new CloudTasksQueue('export-reminder');
        await queue.add('export-reminder', { userId, platform }, { delay: TWENTY_FOUR_HOURS });
      } catch (enqueueError) {
        console.error('[Imports] Failed to enqueue export reminder:', enqueueError);
        // Non-fatal — the user can still proceed manually
      }

      res.json({ scheduled: true });
    } catch (error) {
      console.error('[Imports] Not-ready error:', error);
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  },
);

export default router;
