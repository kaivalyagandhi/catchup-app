import { Router, Request, Response } from 'express';
import { ContactServiceImpl } from '../../contacts/service';
import { GroupServiceImpl } from '../../contacts/group-service';
import { TagServiceImpl } from '../../contacts/tag-service';

const router = Router();

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Otherwise /contacts/groups will match /contacts/:id with id="groups"

// Group management endpoints

// GET /groups - List all groups for a user
router.get('/groups', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }
    const groupService = new GroupServiceImpl();
    const groups = await groupService.listGroups(userId as string);
    res.json(groups);
  } catch (error) {
    console.error('Error listing groups:', error);
    res.status(500).json({ error: 'Failed to list groups' });
  }
});

// POST /groups - Create a new group
router.post('/groups', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, name } = req.body;
    if (!userId || !name) {
      res.status(400).json({ error: 'userId and name are required' });
      return;
    }
    const groupService = new GroupServiceImpl();
    const group = await groupService.createGroup(userId, name);
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// PUT /groups/:id - Update a group
router.put('/groups/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, name } = req.body;
    if (!userId || !name) {
      res.status(400).json({ error: 'userId and name are required' });
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
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// POST /contacts/bulk/groups - Bulk assign contacts to a group
router.post('/bulk/groups', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, contactIds, groupId, action } = req.body;

    if (!userId || !contactIds || !Array.isArray(contactIds) || !groupId || !action) {
      res
        .status(400)
        .json({ error: 'userId, contactIds (array), groupId, and action are required' });
      return;
    }

    const groupService = new GroupServiceImpl();

    if (action === 'add') {
      await groupService.bulkAssignContactsToGroup(contactIds, groupId, userId);
    } else if (action === 'remove') {
      await groupService.bulkRemoveContactsFromGroup(contactIds, groupId, userId);
    } else {
      res.status(400).json({ error: 'Invalid action. Must be "add" or "remove"' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error bulk updating group assignments:', error);
    res.status(500).json({ error: 'Failed to bulk update group assignments' });
  }
});

// Tag management endpoints

// POST /tags - Add a tag to a contact
router.post('/tags', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, contactId, text, source } = req.body;
    if (!userId || !contactId || !text || !source) {
      res.status(400).json({ error: 'userId, contactId, text, and source are required' });
      return;
    }
    const tagService = new TagServiceImpl();
    const tag = await tagService.addTag(contactId, userId, text, source);
    res.status(201).json(tag);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle duplicate tag error with 409 Conflict
    if (errorMessage.includes('Contact already has this tag')) {
      res.status(409).json({ error: 'Contact already has this tag' });
      return;
    }
    
    // Handle validation errors with 400 Bad Request
    if (errorMessage.includes('Tag must be') || errorMessage.includes('Tag text is required')) {
      res.status(400).json({ error: errorMessage });
      return;
    }
    
    console.error('Error adding tag:', error);
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

// PUT /tags/:id - Update a tag
router.put('/tags/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, text } = req.body;
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
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
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// DELETE /tags/:id - Remove a tag
router.delete('/tags/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, contactId } = req.query;

    if (!userId || !contactId) {
      res.status(400).json({ error: 'userId and contactId query parameters are required' });
      return;
    }

    const tagService = new TagServiceImpl();
    await tagService.removeTag(contactId as string, req.params.id, userId as string);
    res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle not found errors
    if (errorMessage.includes('Contact not found')) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    
    if (errorMessage.includes('Tag not found')) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }
    
    console.error('Error removing tag:', error);
    res.status(500).json({ error: 'Failed to remove tag' });
  }
});

// Contact CRUD endpoints (parameterized routes come AFTER specific routes)

// POST /contacts - Create a new contact
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, ...contactData } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    const contactService = new ContactServiceImpl();
    const contact = await contactService.createContact(userId, contactData);
    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// GET /contacts - List all contacts with optional filters
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, groupId, archived, search } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }

    const contactService = new ContactServiceImpl();
    const filters: Record<string, string | boolean> = {};
    if (groupId) filters.groupId = groupId as string;
    if (archived !== undefined) filters.archived = archived === 'true';
    if (search) filters.search = search as string;

    const contacts = await contactService.listContacts(userId as string, filters);
    
    // Log Emma Brown's location for debugging
    const emmaContact = contacts.find((c: any) => c.name === 'Emma Brown');
    if (emmaContact) {
      console.log(`[ContactsAPI] Emma Brown location: ${emmaContact.location}`);
    }
    
    res.json(contacts);
  } catch (error) {
    console.error('Error listing contacts:', error);
    res.status(500).json({ error: 'Failed to list contacts' });
  }
});

// GET /contacts/:id - Get a specific contact
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }
    const contactService = new ContactServiceImpl();
    const contact = await contactService.getContact(req.params.id, userId as string);

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// PUT /contacts/:id - Update a contact
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, ...updateData } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    const contactService = new ContactServiceImpl();
    const contact = await contactService.updateContact(req.params.id, userId, updateData);

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /contacts/:id - Delete a contact
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }
    const contactService = new ContactServiceImpl();
    await contactService.deleteContact(req.params.id, userId as string);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// POST /contacts/:id/archive - Archive a contact
router.post('/:id/archive', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    const contactService = new ContactServiceImpl();
    await contactService.archiveContact(req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error archiving contact:', error);
    res.status(500).json({ error: 'Failed to archive contact' });
  }
});

// POST /contacts/:id/reactivate - Reactivate an archived contact
// Requirements: 12.5
router.post('/:id/reactivate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    const contactService = new ContactServiceImpl();
    await contactService.unarchiveContact(req.params.id, userId);
    res.json({
      success: true,
      message: 'Contact reactivated successfully',
    });
  } catch (error) {
    console.error('Error reactivating contact:', error);
    res.status(500).json({ error: 'Failed to reactivate contact' });
  }
});

// GET /contacts/archived - Get all archived contacts
// Requirements: 12.2
router.get('/archived', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }
    const contactService = new ContactServiceImpl();
    const contacts = await contactService.listContacts(userId as string, { archived: true });
    res.json({
      success: true,
      contacts,
      count: contacts.length,
    });
  } catch (error) {
    console.error('Error fetching archived contacts:', error);
    res.status(500).json({ error: 'Failed to fetch archived contacts' });
  }
});

export default router;
