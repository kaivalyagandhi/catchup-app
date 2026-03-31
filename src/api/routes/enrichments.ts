/**
 * Enrichment API Routes
 *
 * GET  /api/enrichments/pending — Get pending enrichments grouped by import.
 * POST /api/enrichments/pending/:id/link — Link pending enrichment to existing contact.
 * POST /api/enrichments/pending/:id/create-contact — Create new contact from pending enrichment.
 * POST /api/enrichments/pending/:id/dismiss — Dismiss a pending enrichment.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import pool from '../../db/connection';
import { addSourceToContact } from '../../contacts/source-tracking';

const router = Router();

/**
 * GET /pending
 *
 * Returns pending enrichments grouped by import (platform and date),
 * with items sorted by message_count descending within each group.
 *
 * Requirements: 8.1, 8.2
 */
router.get(
  '/pending',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { rows } = await pool.query(
        `SELECT pe.id, pe.import_record_id, pe.participant_identifier,
                pe.participant_display_name, pe.platform, pe.match_tier,
                pe.suggested_contact_id, pe.confidence, pe.match_reason,
                pe.status, pe.message_count, pe.first_message_date,
                pe.last_message_date, pe.created_at,
                ir.platform AS import_platform, ir.created_at AS import_date
         FROM pending_enrichments pe
         JOIN import_records ir ON pe.import_record_id = ir.id
         WHERE pe.user_id = $1 AND pe.status = 'pending'
         ORDER BY ir.created_at DESC, pe.message_count DESC`,
        [userId],
      );

      // Group by import_record_id
      const groupMap = new Map<string, {
        importId: string;
        platform: string;
        importDate: string;
        items: any[];
      }>();

      for (const r of rows) {
        const key = r.import_record_id;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            importId: key,
            platform: r.import_platform,
            importDate: r.import_date,
            items: [],
          });
        }
        groupMap.get(key)!.items.push({
          id: r.id,
          participantIdentifier: r.participant_identifier,
          participantDisplayName: r.participant_display_name,
          platform: r.platform,
          matchTier: r.match_tier,
          suggestedContactId: r.suggested_contact_id,
          confidence: r.confidence ? parseFloat(r.confidence) : null,
          matchReason: r.match_reason,
          messageCount: r.message_count,
          firstMessageDate: r.first_message_date,
          lastMessageDate: r.last_message_date,
        });
      }

      res.json({ imports: Array.from(groupMap.values()) });
    } catch (error) {
      console.error('[Enrichments] Get pending error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while fetching pending enrichments.' });
    }
  },
);


/**
 * POST /pending/:id/link
 *
 * Links a pending enrichment to an existing contact. Creates an
 * enrichment_record, updates the pending_enrichment status to 'linked',
 * adds 'chat_import' to the contact's sources, and updates lastContactDate.
 *
 * Requirements: 8.3
 */
router.post(
  '/pending/:id/link',
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

      const { id } = req.params;
      const { contactId } = req.body;

      if (!contactId) {
        res.status(400).json({ error: 'contactId is required' });
        client.release();
        return;
      }

      // Fetch the pending_enrichment and verify ownership
      const { rows: peRows } = await client.query(
        `SELECT pe.id, pe.user_id, pe.import_record_id, pe.interaction_summary_id,
                pe.platform, pe.message_count, pe.first_message_date,
                pe.last_message_date, pe.status,
                isum.avg_messages_per_month, isum.topics, isum.sentiment
         FROM pending_enrichments pe
         LEFT JOIN interaction_summaries isum ON pe.interaction_summary_id = isum.id
         WHERE pe.id = $1 AND pe.user_id = $2`,
        [id, userId],
      );

      if (peRows.length === 0) {
        res.status(404).json({ error: 'Pending enrichment not found' });
        client.release();
        return;
      }

      const pe = peRows[0];

      if (pe.status !== 'pending') {
        res.status(400).json({ error: 'Pending enrichment has already been resolved' });
        client.release();
        return;
      }

      // Verify the contact belongs to the user
      const { rows: contactRows } = await client.query(
        `SELECT id, sources FROM contacts WHERE id = $1 AND user_id = $2`,
        [contactId, userId],
      );

      if (contactRows.length === 0) {
        res.status(404).json({ error: 'Contact not found' });
        client.release();
        return;
      }

      await client.query('BEGIN');

      // Create enrichment_record
      const { rows: enrichmentRows } = await client.query(
        `INSERT INTO enrichment_records (
          contact_id, user_id, import_record_id, interaction_summary_id,
          platform, message_count, first_message_date, last_message_date,
          avg_messages_per_month, topics, sentiment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          contactId,
          userId,
          pe.import_record_id,
          pe.interaction_summary_id,
          pe.platform,
          pe.message_count,
          pe.first_message_date,
          pe.last_message_date,
          pe.avg_messages_per_month || 0,
          pe.topics || '[]',
          pe.sentiment || null,
        ],
      );

      const enrichmentRecordId = enrichmentRows[0].id;

      // Update pending_enrichment status to 'linked'
      await client.query(
        `UPDATE pending_enrichments SET status = 'linked', resolved_at = NOW() WHERE id = $1`,
        [id],
      );

      // Add 'chat_import' to contact's sources if not already present
      await addSourceToContact(client, contactId, 'chat_import');

      // Update contact's lastContactDate if enrichment has a more recent date
      if (pe.last_message_date) {
        await client.query(
          `UPDATE contacts
           SET last_contact_date = $1
           WHERE id = $2 AND (last_contact_date IS NULL OR last_contact_date < $1)`,
          [pe.last_message_date, contactId],
        );
      }

      await client.query('COMMIT');

      res.json({ linked: true, enrichmentRecordId });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[Enrichments] Link error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while linking the enrichment.' });
    } finally {
      client.release();
    }
  },
);


/**
 * POST /pending/:id/create-contact
 *
 * Creates a new contact pre-populated with participant identifiers from the
 * pending enrichment, links it as an enrichment_record, and updates the
 * pending_enrichment status to 'created'.
 *
 * Requirements: 8.4
 */
router.post(
  '/pending/:id/create-contact',
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

      const { id } = req.params;

      // Fetch the pending_enrichment and verify ownership
      const { rows: peRows } = await client.query(
        `SELECT pe.id, pe.user_id, pe.import_record_id, pe.interaction_summary_id,
                pe.participant_identifier, pe.participant_display_name,
                pe.platform, pe.message_count, pe.first_message_date,
                pe.last_message_date, pe.status,
                isum.identifier_type, isum.avg_messages_per_month, isum.topics, isum.sentiment
         FROM pending_enrichments pe
         LEFT JOIN interaction_summaries isum ON pe.interaction_summary_id = isum.id
         WHERE pe.id = $1 AND pe.user_id = $2`,
        [id, userId],
      );

      if (peRows.length === 0) {
        res.status(404).json({ error: 'Pending enrichment not found' });
        client.release();
        return;
      }

      const pe = peRows[0];

      if (pe.status !== 'pending') {
        res.status(400).json({ error: 'Pending enrichment has already been resolved' });
        client.release();
        return;
      }

      await client.query('BEGIN');

      // Build contact fields from participant identifiers
      const contactName = pe.participant_display_name || pe.participant_identifier;
      const identifierType: string | null = pe.identifier_type;
      const identifier = pe.participant_identifier;

      let phone: string | null = null;
      let email: string | null = null;
      let instagram: string | null = null;
      let xHandle: string | null = null;

      if (identifierType === 'phone') {
        phone = identifier;
      } else if (identifierType === 'email') {
        email = identifier;
      } else if (identifierType === 'username') {
        // Map username to the appropriate platform handle
        if (pe.platform === 'instagram') {
          instagram = identifier;
        } else if (pe.platform === 'twitter') {
          xHandle = identifier;
        }
      }

      // Create the contact
      const { rows: contactRows } = await client.query(
        `INSERT INTO contacts (
          user_id, name, phone, email, instagram, x_handle,
          last_contact_date, source, sources
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', $8)
        RETURNING id`,
        [
          userId,
          contactName,
          phone,
          email,
          instagram,
          xHandle,
          pe.last_message_date || null,
          ['chat_import'],
        ],
      );

      const contactId = contactRows[0].id;

      // Create enrichment_record
      const { rows: enrichmentRows } = await client.query(
        `INSERT INTO enrichment_records (
          contact_id, user_id, import_record_id, interaction_summary_id,
          platform, message_count, first_message_date, last_message_date,
          avg_messages_per_month, topics, sentiment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          contactId,
          userId,
          pe.import_record_id,
          pe.interaction_summary_id,
          pe.platform,
          pe.message_count,
          pe.first_message_date,
          pe.last_message_date,
          pe.avg_messages_per_month || 0,
          pe.topics || '[]',
          pe.sentiment || null,
        ],
      );

      const enrichmentRecordId = enrichmentRows[0].id;

      // Update pending_enrichment status to 'created'
      await client.query(
        `UPDATE pending_enrichments SET status = 'created', resolved_at = NOW() WHERE id = $1`,
        [id],
      );

      await client.query('COMMIT');

      res.status(201).json({ created: true, contactId, enrichmentRecordId });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[Enrichments] Create contact error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while creating the contact.' });
    } finally {
      client.release();
    }
  },
);

/**
 * POST /pending/:id/dismiss
 *
 * Marks a pending enrichment as dismissed, hiding it from the default view.
 *
 * Requirements: 8.5
 */
router.post(
  '/pending/:id/dismiss',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;

      const { rows } = await pool.query(
        `SELECT id, status FROM pending_enrichments WHERE id = $1 AND user_id = $2`,
        [id, userId],
      );

      if (rows.length === 0) {
        res.status(404).json({ error: 'Pending enrichment not found' });
        return;
      }

      if (rows[0].status !== 'pending') {
        res.status(400).json({ error: 'Pending enrichment has already been resolved' });
        return;
      }

      await pool.query(
        `UPDATE pending_enrichments SET status = 'dismissed', resolved_at = NOW() WHERE id = $1`,
        [id],
      );

      res.json({ dismissed: true });
    } catch (error) {
      console.error('[Enrichments] Dismiss error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while dismissing the enrichment.' });
    }
  },
);

export default router;
