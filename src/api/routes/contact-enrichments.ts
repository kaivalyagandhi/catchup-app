/**
 * Contact Enrichment API Routes
 *
 * GET    /api/contacts/:id/enrichments              — Get all enrichment records for a contact with per-platform breakdown
 * DELETE /api/contacts/:id/enrichments/:enrichmentId — Delete an enrichment record, revert contact's lastContactDate
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import pool from '../../db/connection';

const router = Router();

/**
 * GET /:id/enrichments
 *
 * Returns all enrichment records for a contact with aggregated totals
 * and per-platform breakdown.
 *
 * Requirements: 10.1, 10.2
 */
router.get(
  '/:id/enrichments',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id: contactId } = req.params;

      // Verify the contact belongs to the user
      const { rows: contactRows } = await pool.query(
        `SELECT id FROM contacts WHERE id = $1 AND user_id = $2`,
        [contactId, userId],
      );

      if (contactRows.length === 0) {
        res.status(404).json({ error: 'Contact not found' });
        return;
      }

      // Fetch all enrichment records for this contact
      const { rows: records } = await pool.query(
        `SELECT id, contact_id, user_id, import_record_id, interaction_summary_id,
                platform, message_count, first_message_date, last_message_date,
                avg_messages_per_month, topics, sentiment, raw_data_reference, imported_at
         FROM enrichment_records
         WHERE contact_id = $1 AND user_id = $2
         ORDER BY last_message_date DESC NULLS LAST`,
        [contactId, userId],
      );

      // Aggregate across all records
      let totalMessageCount = 0;
      let lastInteractionDate: string | null = null;
      const platformMap = new Map<string, {
        platform: string;
        messageCount: number;
        firstMessageDate: string | null;
        lastMessageDate: string | null;
        topics: string[];
        sentiment: string | null;
      }>();

      for (const r of records) {
        totalMessageCount += r.message_count || 0;

        // Track most recent lastMessageDate
        if (r.last_message_date) {
          const d = new Date(r.last_message_date).toISOString();
          if (!lastInteractionDate || d > lastInteractionDate) {
            lastInteractionDate = d;
          }
        }

        // Per-platform aggregation
        const key = r.platform;
        if (!platformMap.has(key)) {
          platformMap.set(key, {
            platform: key,
            messageCount: 0,
            firstMessageDate: null,
            lastMessageDate: null,
            topics: [],
            sentiment: null,
          });
        }

        const entry = platformMap.get(key)!;
        entry.messageCount += r.message_count || 0;

        if (r.first_message_date) {
          const fd = new Date(r.first_message_date).toISOString();
          if (!entry.firstMessageDate || fd < entry.firstMessageDate) {
            entry.firstMessageDate = fd;
          }
        }

        if (r.last_message_date) {
          const ld = new Date(r.last_message_date).toISOString();
          if (!entry.lastMessageDate || ld > entry.lastMessageDate) {
            entry.lastMessageDate = ld;
          }
        }

        // Merge topics (deduplicate)
        const topics: string[] = Array.isArray(r.topics) ? r.topics : (typeof r.topics === 'string' ? JSON.parse(r.topics || '[]') : []);
        for (const t of topics) {
          if (!entry.topics.includes(t)) {
            entry.topics.push(t);
          }
        }

        // Use most recent sentiment
        if (r.sentiment && r.last_message_date) {
          const ld = new Date(r.last_message_date).toISOString();
          if (ld === entry.lastMessageDate) {
            entry.sentiment = r.sentiment;
          }
        }
      }

      // Format records for response
      const formattedRecords = records.map((r) => ({
        id: r.id,
        contactId: r.contact_id,
        importRecordId: r.import_record_id,
        interactionSummaryId: r.interaction_summary_id,
        platform: r.platform,
        messageCount: r.message_count,
        firstMessageDate: r.first_message_date,
        lastMessageDate: r.last_message_date,
        avgMessagesPerMonth: r.avg_messages_per_month ? parseFloat(r.avg_messages_per_month) : 0,
        topics: Array.isArray(r.topics) ? r.topics : (typeof r.topics === 'string' ? JSON.parse(r.topics || '[]') : []),
        sentiment: r.sentiment,
        rawDataReference: r.raw_data_reference,
        importedAt: r.imported_at,
      }));

      res.json({
        contactId,
        totalMessageCount,
        lastInteractionDate,
        platforms: Array.from(platformMap.values()),
        records: formattedRecords,
      });
    } catch (error) {
      console.error('[ContactEnrichments] Get enrichments error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while fetching enrichment records.' });
    }
  },
);


/**
 * DELETE /:id/enrichments/:enrichmentId
 *
 * Deletes an enrichment record and recalculates the contact's lastContactDate
 * from remaining enrichment records.
 *
 * Requirements: 10.5
 */
router.delete(
  '/:id/enrichments/:enrichmentId',
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

      const { id: contactId, enrichmentId } = req.params;

      // Verify the contact belongs to the user
      const { rows: contactRows } = await client.query(
        `SELECT id FROM contacts WHERE id = $1 AND user_id = $2`,
        [contactId, userId],
      );

      if (contactRows.length === 0) {
        res.status(404).json({ error: 'Contact not found' });
        client.release();
        return;
      }

      // Verify the enrichment record exists and belongs to this contact/user
      const { rows: enrichmentRows } = await client.query(
        `SELECT id FROM enrichment_records WHERE id = $1 AND contact_id = $2 AND user_id = $3`,
        [enrichmentId, contactId, userId],
      );

      if (enrichmentRows.length === 0) {
        res.status(404).json({ error: 'Enrichment record not found' });
        client.release();
        return;
      }

      await client.query('BEGIN');

      // Delete the enrichment record
      await client.query(
        `DELETE FROM enrichment_records WHERE id = $1`,
        [enrichmentId],
      );

      // Recalculate contact's lastContactDate from remaining enrichment records
      const { rows: remainingRows } = await client.query(
        `SELECT MAX(last_message_date) AS max_date
         FROM enrichment_records
         WHERE contact_id = $1 AND user_id = $2`,
        [contactId, userId],
      );

      const newLastContactDate = remainingRows[0]?.max_date || null;

      await client.query(
        `UPDATE contacts SET last_contact_date = $1 WHERE id = $2`,
        [newLastContactDate, contactId],
      );

      await client.query('COMMIT');

      res.json({ deleted: true });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[ContactEnrichments] Delete enrichment error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while deleting the enrichment record.' });
    } finally {
      client.release();
    }
  },
);

export default router;
