/**
 * vCard Import/Export API Routes
 *
 * POST /api/contacts/import-vcard — Import contacts from a vCard (.vcf) file.
 * GET  /api/contacts/export-vcard — Export contacts to vCard 4.0 format.
 *
 * Requirements: 14.4, 14.5
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { importVCard, exportToVCard } from '../../contacts/apple-contacts-service';
import pool from '../../db/connection';

const router = Router();

/**
 * POST /import-vcard
 *
 * Accepts raw vCard text in the request body and imports contacts.
 * Matches against existing contacts using Req 7 matching logic,
 * merges for matches, creates new for unmatched.
 * Adds 'apple' to sources array.
 *
 * Body: { fileContent: string }
 *
 * Requirements: 14.4
 */
router.post(
  '/import-vcard',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { fileContent } = req.body;

      if (!fileContent || typeof fileContent !== 'string') {
        res.status(400).json({
          error: 'Missing or invalid fileContent. Please provide vCard file content as a string.',
        });
        return;
      }

      if (fileContent.trim().length === 0) {
        res.status(400).json({
          error: 'The uploaded file contains no contacts.',
        });
        return;
      }

      // Check that it looks like a vCard file
      if (!fileContent.includes('BEGIN:VCARD')) {
        res.status(400).json({
          error: 'Invalid vCard format. The file must contain BEGIN:VCARD entries.',
        });
        return;
      }

      const result = await importVCard(pool, userId, fileContent);

      res.status(200).json({
        imported: result.imported,
        merged: result.merged,
        created: result.created,
        errors: result.errors,
      });
    } catch (error) {
      console.error('[vCard] Import error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while importing contacts.' });
    }
  },
);

/**
 * GET /export-vcard
 *
 * Exports contacts to vCard 4.0 format. Optionally accepts contactIds
 * query parameter (comma-separated) to export specific contacts.
 *
 * Query: ?contactIds=id1,id2,id3 (optional)
 *
 * Requirements: 14.5
 */
router.get(
  '/export-vcard',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const contactIdsParam = req.query.contactIds;
      let contactIds: string[] | undefined;

      if (contactIdsParam && typeof contactIdsParam === 'string') {
        contactIds = contactIdsParam.split(',').map((id) => id.trim()).filter(Boolean);
      }

      const vcardContent = await exportToVCard(pool, userId, contactIds);

      res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="contacts.vcf"');
      res.send(vcardContent);
    } catch (error) {
      console.error('[vCard] Export error:', error);
      res.status(500).json({ error: 'An unexpected error occurred while exporting contacts.' });
    }
  },
);

export default router;
