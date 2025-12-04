/**
 * Contact Pruning API Routes
 *
 * Endpoints for archiving, removing, and reactivating contacts.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import express, { Request, Response } from 'express';
import { PostgresContactPruningService } from '../../contacts/contact-pruning-service';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Archive a contact
 * POST /api/contacts/:contactId/archive
 * Requirements: 12.1, 12.2
 */
router.post('/:contactId/archive', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { contactId } = req.params;

    const pruningService = new PostgresContactPruningService();
    const result = await pruningService.archiveContact(userId, contactId);

    res.json({
      success: true,
      result,
      message: 'Contact archived successfully',
    });
  } catch (error: any) {
    console.error('Error archiving contact:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to archive contact',
    });
  }
});

/**
 * Remove a contact permanently
 * DELETE /api/contacts/:contactId
 * Requirements: 12.3
 */
router.delete('/:contactId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { contactId } = req.params;

    const pruningService = new PostgresContactPruningService();
    const result = await pruningService.removeContact(userId, contactId);

    res.json({
      success: true,
      result,
      message: 'Contact removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing contact:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove contact',
    });
  }
});

/**
 * Reactivate an archived contact
 * POST /api/contacts/:contactId/reactivate
 * Requirements: 12.5
 */
router.post('/:contactId/reactivate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { contactId } = req.params;

    const pruningService = new PostgresContactPruningService();
    const result = await pruningService.reactivateContact(userId, contactId);

    res.json({
      success: true,
      result,
      message: 'Contact reactivated successfully',
    });
  } catch (error: any) {
    console.error('Error reactivating contact:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reactivate contact',
    });
  }
});

/**
 * Get all archived contacts
 * GET /api/contacts/archived
 * Requirements: 12.2
 */
router.get('/archived', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const pruningService = new PostgresContactPruningService();
    const archivedContacts = await pruningService.getArchivedContacts(userId);

    res.json({
      success: true,
      contacts: archivedContacts,
      count: archivedContacts.length,
    });
  } catch (error: any) {
    console.error('Error fetching archived contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch archived contacts',
    });
  }
});

/**
 * Bulk archive contacts
 * POST /api/contacts/bulk-archive
 * Requirements: 12.4
 */
router.post('/bulk-archive', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { contactIds } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'contactIds must be a non-empty array',
      });
    }

    const pruningService = new PostgresContactPruningService();
    const results = await pruningService.bulkArchive(userId, contactIds);

    const successCount = results.filter((r) => r.success).length;

    res.json({
      success: true,
      results,
      summary: {
        total: contactIds.length,
        successful: successCount,
        failed: contactIds.length - successCount,
      },
    });
  } catch (error: any) {
    console.error('Error bulk archiving contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to bulk archive contacts',
    });
  }
});

/**
 * Bulk remove contacts
 * POST /api/contacts/bulk-remove
 * Requirements: 12.4
 */
router.post('/bulk-remove', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { contactIds } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'contactIds must be a non-empty array',
      });
    }

    const pruningService = new PostgresContactPruningService();
    const results = await pruningService.bulkRemove(userId, contactIds);

    const successCount = results.filter((r) => r.success).length;

    res.json({
      success: true,
      results,
      summary: {
        total: contactIds.length,
        successful: successCount,
        failed: contactIds.length - successCount,
      },
    });
  } catch (error: any) {
    console.error('Error bulk removing contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to bulk remove contacts',
    });
  }
});

export default router;
