/**
 * Contact Archive API Routes
 *
 * Endpoints for archiving and restoring contacts (soft delete functionality).
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { Router, Request, Response } from 'express';
import { PostgresContactRepository } from '../../contacts/repository';
import { authenticate } from '../middleware/auth';

const router = Router();
const contactRepository = new PostgresContactRepository();

/**
 * GET /api/contacts/archive/preview
 * Preview which contacts would be archived with name, email, phone, groups, circle
 * Requirements: 15.1
 */
router.get('/archive/preview', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const contactIdsParam = req.query.contactIds;

    if (!contactIdsParam) {
      return res.status(400).json({
        success: false,
        error: 'contactIds query parameter is required (comma-separated)',
      });
    }

    const contactIds = (contactIdsParam as string).split(',').filter(Boolean);

    if (contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one contact ID is required',
      });
    }

    const contacts = await contactRepository.previewArchival(userId, contactIds);

    res.json({
      success: true,
      contacts: contacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        groups: c.groups || [],
        circle: c.dunbarCircle || null,
      })),
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
 * GET /api/contacts/archived
 * Get all archived contacts sorted by archived_at descending
 * Requirements: 15.3
 */
router.get('/archived', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

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
 * GET /api/contacts/archived/count
 * Get count of archived contacts for badge display
 * Requirements: 15.5
 */
router.get('/archived/count', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const archivedContacts = await contactRepository.findArchived(userId);

    res.json({
      success: true,
      count: archivedContacts.length,
    });
  } catch (error) {
    console.error('Error fetching archived count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch archived count',
    });
  }
});

/**
 * POST /api/contacts/archive
 * Archive contacts by setting archived_at timestamp
 * Excludes from default list, suggestions, circle/group views
 * Requirements: 15.2
 */
router.post('/archive', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
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
 * POST /api/contacts/restore
 * Restore archived contacts by clearing archived_at
 * Restores to default list with all previous group/circle assignments intact
 * Requirements: 15.4
 */
router.post('/restore', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
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

    if (restoredCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No archived contacts found with the given IDs',
      });
    }

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

/**
 * POST /api/contacts/:id/restore
 * Restore a single archived contact
 * Requirements: 15.4
 */
router.post('/:id/restore', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
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

export default router;
