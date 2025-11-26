/**
 * Groups & Tags Management API Routes
 *
 * Dedicated routes for managing groups and tags with contact counts
 * and association management.
 */

import { Router, Request, Response } from 'express';
import { GroupServiceImpl } from '../../contacts/group-service';
import { TagServiceImpl } from '../../contacts/tag-service';
import { PostgresGroupRepository } from '../../contacts/group-repository';
import { PostgresTagRepository } from '../../contacts/tag-repository';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================================================
// GROUP ENDPOINTS
// ============================================================================

/**
 * GET /api/groups-tags/groups
 * List all groups with contact counts for authenticated user
 */
router.get('/groups', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const groupRepository = new PostgresGroupRepository();
    const groups = await groupRepository.listGroupsWithContactCounts(userId);
    res.json(groups);
  } catch (error) {
    console.error('Error listing groups with counts:', error);
    res.status(500).json({ error: 'Failed to list groups' });
  }
});

/**
 * GET /api/groups-tags/groups/:id
 * Get specific group details with contact count
 */
router.get('/groups/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const groupRepository = new PostgresGroupRepository();
    const group = await groupRepository.getGroupWithContactCount(req.params.id, userId);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

/**
 * POST /api/groups-tags/groups
 * Create a new group
 */
router.post('/groups', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const groupService = new GroupServiceImpl();
    const group = await groupService.createGroup(userId, name);
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    const message = error instanceof Error ? error.message : 'Failed to create group';
    
    if (message === 'A group with this name already exists') {
      res.status(400).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * PUT /api/groups-tags/groups/:id
 * Update a group
 */
router.put('/groups/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const groupService = new GroupServiceImpl();
    const group = await groupService.updateGroup(req.params.id, userId, name);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    res.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    const message = error instanceof Error ? error.message : 'Failed to update group';
    
    if (message === 'Group not found') {
      res.status(404).json({ error: message });
    } else if (message === 'A group with this name already exists') {
      res.status(400).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * DELETE /api/groups-tags/groups/:id
 * Delete (archive) a group
 */
router.delete('/groups/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const groupService = new GroupServiceImpl();
    await groupService.archiveGroup(req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting group:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete group';
    
    if (message === 'Group not found') {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// ============================================================================
// GROUP-CONTACT ASSOCIATION ENDPOINTS
// ============================================================================

/**
 * GET /api/groups-tags/groups/:id/contacts
 * Get all contacts in a group
 */
router.get('/groups/:id/contacts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const groupRepository = new PostgresGroupRepository();
    const contacts = await groupRepository.getGroupContacts(req.params.id, userId);
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching group contacts:', error);
    res.status(500).json({ error: 'Failed to fetch group contacts' });
  }
});

/**
 * POST /api/groups-tags/groups/:id/contacts
 * Add contacts to a group
 */
router.post('/groups/:id/contacts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds)) {
      res.status(400).json({ error: 'contactIds (array) is required' });
      return;
    }

    const groupService = new GroupServiceImpl();
    await groupService.bulkAssignContactsToGroup(contactIds, req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error adding contacts to group:', error);
    const message = error instanceof Error ? error.message : 'Failed to add contacts to group';
    
    if (message === 'Group not found' || message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * DELETE /api/groups-tags/groups/:id/contacts/:contactId
 * Remove a contact from a group
 */
router.delete('/groups/:id/contacts/:contactId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const groupService = new GroupServiceImpl();
    await groupService.removeContactFromGroup(req.params.contactId, req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error removing contact from group:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove contact from group';
    
    if (message === 'Group not found' || message === 'Contact not found') {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// ============================================================================
// TAG ENDPOINTS
// ============================================================================

/**
 * GET /api/groups-tags/tags
 * List all tags with contact counts
 */
router.get('/tags', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const tagRepository = new PostgresTagRepository();
    const tags = await tagRepository.listTagsWithContactCounts(userId);
    res.json(tags);
  } catch (error) {
    console.error('Error listing tags with counts:', error);
    res.status(500).json({ error: 'Failed to list tags' });
  }
});

/**
 * GET /api/groups-tags/tags/:id
 * Get specific tag details with contact count
 */
router.get('/tags/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const tagRepository = new PostgresTagRepository();
    const tag = await tagRepository.getTagWithContactCount(req.params.id, userId);

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    res.json(tag);
  } catch (error) {
    console.error('Error fetching tag:', error);
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
});

/**
 * POST /api/groups-tags/tags
 * Create a new tag
 */
router.post('/tags', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { text, source = 'manual' } = req.body;

    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const tagRepository = new PostgresTagRepository();
    const tag = await tagRepository.create(text, source, userId);
    res.status(201).json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    const message = error instanceof Error ? error.message : 'Failed to create tag';
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/groups-tags/tags/:id
 * Update a tag
 */
router.put('/tags/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const tagService = new TagServiceImpl();
    const tag = await tagService.updateTag(req.params.id, text, userId);

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    res.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    const message = error instanceof Error ? error.message : 'Failed to update tag';
    
    if (message === 'Tag not found') {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * DELETE /api/groups-tags/tags/:id
 * Delete a tag
 */
router.delete('/tags/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const tagRepository = new PostgresTagRepository();
    await tagRepository.deleteTag(req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting tag:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete tag';
    
    if (message === 'Tag not found') {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// ============================================================================
// TAG-CONTACT ASSOCIATION ENDPOINTS
// ============================================================================

/**
 * GET /api/groups-tags/tags/:id/contacts
 * Get all contacts with a tag
 */
router.get('/tags/:id/contacts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const tagRepository = new PostgresTagRepository();
    const contacts = await tagRepository.getTagContacts(req.params.id, userId);
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching tag contacts:', error);
    res.status(500).json({ error: 'Failed to fetch tag contacts' });
  }
});

/**
 * POST /api/groups-tags/tags/:id/contacts
 * Add tag to contacts
 */
router.post('/tags/:id/contacts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds)) {
      res.status(400).json({ error: 'contactIds (array) is required' });
      return;
    }

    const tagRepository = new PostgresTagRepository();
    await tagRepository.bulkAddToContacts(contactIds, req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error adding tag to contacts:', error);
    const message = error instanceof Error ? error.message : 'Failed to add tag to contacts';
    
    if (message === 'Tag not found' || message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * DELETE /api/groups-tags/tags/:id/contacts/:contactId
 * Remove tag from a contact
 */
router.delete('/tags/:id/contacts/:contactId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const tagService = new TagServiceImpl();
    await tagService.removeTag(req.params.contactId, req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error removing tag from contact:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove tag from contact';
    
    if (message === 'Tag not found' || message === 'Contact not found') {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

export default router;
