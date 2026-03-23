/**
 * Contact Groups API Routes
 *
 * Endpoints for ungrouped contact count, individual contact-group
 * assignment/removal, and AI group suggestions. All endpoints require JWT authentication.
 *
 * Requirements: 1.1, 1.2, 1.3, 2.6, 2.7, 9
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { PostgresGroupRepository } from '../../contacts/group-repository';
import { PostgresGroupAISuggestionService } from '../../matching/group-ai-suggestion-service';
import pool from '../../db/connection';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/contacts/ungrouped-count
 * Returns count of contacts with no group assignments for the authenticated user.
 */
router.get('/ungrouped-count', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const result = await pool.query(
      `SELECT COUNT(*) as count FROM contacts c
       WHERE c.user_id = $1 AND c.archived = false
       AND NOT EXISTS (SELECT 1 FROM contact_groups cg WHERE cg.contact_id = c.id)`,
      [userId]
    );

    const count = parseInt(result.rows[0].count, 10);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching ungrouped contact count:', error);
    res.status(500).json({ error: 'Failed to fetch ungrouped contact count' });
  }
});

/**
 * POST /api/contacts/batch-group-suggestions
 * Returns AI group suggestions for multiple contacts.
 * Body: { contactIds: string[] }
 *
 * NOTE: This route must be registered before /:id routes to avoid
 * "batch-group-suggestions" being captured as an :id param.
 */
router.post(
  '/batch-group-suggestions',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const { contactIds } = req.body;

      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        res.status(400).json({ error: 'contactIds must be a non-empty array' });
        return;
      }

      const service = new PostgresGroupAISuggestionService();
      const results = await service.batchSuggestGroups(userId, contactIds);

      res.json({ results });
    } catch (error) {
      console.error('Error fetching batch group suggestions:', error);
      res.status(500).json({ error: 'Failed to fetch batch group suggestions' });
    }
  }
);

/**
 * POST /api/contacts/:id/groups/:groupId
 * Assigns a contact to a group.
 * Returns 404 if contact or group not found, 409 if already assigned.
 */
router.post('/:id/groups/:groupId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: contactId, groupId } = req.params;

    const groupRepository = new PostgresGroupRepository();
    await groupRepository.assignContact(contactId, groupId, userId);

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign contact to group';

    if (message === 'Contact not found' || message === 'Group not found') {
      res.status(404).json({ error: message });
    } else if (message.includes('already assigned')) {
      res.status(409).json({ error: message });
    } else {
      console.error('Error assigning contact to group:', error);
      res.status(500).json({ error: 'Failed to assign contact to group' });
    }
  }
});

/**
 * DELETE /api/contacts/:id/groups/:groupId
 * Removes a contact from a group.
 * Returns 404 if contact or group not found.
 */
router.delete('/:id/groups/:groupId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: contactId, groupId } = req.params;

    const groupRepository = new PostgresGroupRepository();
    await groupRepository.removeContact(contactId, groupId, userId);

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove contact from group';

    if (message === 'Contact not found' || message === 'Group not found') {
      res.status(404).json({ error: message });
    } else {
      console.error('Error removing contact from group:', error);
      res.status(500).json({ error: 'Failed to remove contact from group' });
    }
  }
});

/**
 * GET /api/contacts/:id/group-suggestions
 * Returns AI group suggestions for a single contact.
 */
router.get(
  '/:id/group-suggestions',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id: contactId } = req.params;

      const service = new PostgresGroupAISuggestionService();
      const suggestions = await service.suggestGroupsForContact(userId, contactId);

      res.json({ suggestions });
    } catch (error) {
      console.error('Error fetching group suggestions:', error);
      res.status(500).json({ error: 'Failed to fetch group suggestions' });
    }
  }
);

export default router;
