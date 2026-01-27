/**
 * Contact Archive API Routes
 *
 * Endpoints for archiving and restoring contacts (soft delete functionality).
 * Requirements: 14.1, 14.3, 15.1, 16.3, 16.6
 */

import { Router, Request, Response } from 'express';
import { PostgresContactRepository } from '../../contacts/repository';
import { authenticate } from '../middleware/auth';

const router = Router();
const contactRepository = new PostgresContactRepository();

/**
 * GET /api/contacts/archived
 * Get all archived contacts for the authenticated user
 * Requirements: 16.1, 16.2
 */
router.get('/archived', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const archivedContacts = await contactRepository.findArchived(userId);

    res.json({
      success: true,
      contacts: archivedContacts,
      count: archivedContacts.length,
    });
  } catch (error) {
    console.error('Error fetching archived contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch archived contacts',
    });
  }
});

/**
 * POST /api/contacts/archive/preview
 * Preview which contacts will be archived without modifying data
 * Requirements: 14.1, 14.5
 */
router.post('/archive/preview', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds)) {
      return res.status(400).json({
        success: false,
        error: 'contactIds array is required',
      });
    }

    const contacts = await contactRepository.previewArchival(userId, contactIds);

    res.json({
      success: true,
      contacts,
      count: contacts.length,
    });
  } catch (error) {
    console.error('Error previewing archival:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview archival',
    });
  }
});

/**
 * POST /api/contacts/archive
 * Archive contacts (soft delete)
 * Requirements: 15.1
 */
router.post('/archive', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds)) {
      return res.status(400).json({
        success: false,
        error: 'contactIds array is required',
      });
    }

    if (contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one contact ID is required',
      });
    }

    const archivedCount = await contactRepository.archiveContacts(userId, contactIds);

    res.json({
      success: true,
      archivedCount,
      message: `Successfully archived ${archivedCount} contact(s)`,
    });
  } catch (error) {
    console.error('Error archiving contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive contacts',
    });
  }
});

/**
 * POST /api/contacts/:id/restore
 * Restore a single archived contact
 * Requirements: 16.3
 */
router.post('/:id/restore', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const restoredCount = await contactRepository.restoreContacts(userId, [id]);

    if (restoredCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found or not archived',
      });
    }

    res.json({
      success: true,
      message: 'Contact restored successfully',
    });
  } catch (error) {
    console.error('Error restoring contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore contact',
    });
  }
});

/**
 * POST /api/contacts/restore/bulk
 * Restore multiple archived contacts
 * Requirements: 16.6
 */
router.post('/restore/bulk', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds)) {
      return res.status(400).json({
        success: false,
        error: 'contactIds array is required',
      });
    }

    if (contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one contact ID is required',
      });
    }

    const restoredCount = await contactRepository.restoreContacts(userId, contactIds);

    res.json({
      success: true,
      restoredCount,
      message: `Successfully restored ${restoredCount} contact(s)`,
    });
  } catch (error) {
    console.error('Error restoring contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore contacts',
    });
  }
});

export default router;
