import { Router, Request, Response } from 'express';
import { ContactServiceImpl } from '../../contacts/service';
import { GroupServiceImpl } from '../../contacts/group-service';
import { TagServiceImpl } from '../../contacts/tag-service';

const router = Router();

// Contact CRUD endpoints

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

// GET /contacts/:id - Get a specific contact
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }
    const contactService = new ContactServiceImpl();
    const contact = await contactService.getContact(req.params.id, userId as string);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// GET /contacts - List all contacts with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, groupId, archived, search } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }
    
    const contactService = new ContactServiceImpl();
    const filters: any = {};
    if (groupId) filters.groupId = groupId as string;
    if (archived !== undefined) filters.archived = archived === 'true';
    if (search) filters.search = search as string;
    
    const contacts = await contactService.listContacts(userId as string, filters);
    res.json(contacts);
  } catch (error) {
    console.error('Error listing contacts:', error);
    res.status(500).json({ error: 'Failed to list contacts' });
  }
});

// PUT /contacts/:id - Update a contact
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, ...updateData } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const contactService = new ContactServiceImpl();
    const contact = await contactService.updateContact(req.params.id, userId, updateData);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /contacts/:id - Delete a contact
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
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
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const contactService = new ContactServiceImpl();
    await contactService.archiveContact(req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error archiving contact:', error);
    res.status(500).json({ error: 'Failed to archive contact' });
  }
});

// Group management endpoints

// POST /groups - Create a new group
router.post('/groups', async (req: Request, res: Response) => {
  try {
    const { userId, name } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ error: 'userId and name are required' });
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
router.put('/groups/:id', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const groupService = new GroupServiceImpl();
    const group = await groupService.updateGroup(req.params.id, name);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// POST /contacts/bulk/groups - Bulk assign contacts to a group
router.post('/bulk/groups', async (req: Request, res: Response) => {
  try {
    const { contactIds, groupId, action } = req.body;
    
    if (!contactIds || !Array.isArray(contactIds) || !groupId || !action) {
      return res.status(400).json({ error: 'contactIds (array), groupId, and action are required' });
    }
    
    const groupService = new GroupServiceImpl();
    
    if (action === 'add') {
      await groupService.bulkAssignContactsToGroup(contactIds, groupId);
    } else if (action === 'remove') {
      await groupService.bulkRemoveContactsFromGroup(contactIds, groupId);
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be "add" or "remove"' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error bulk updating group assignments:', error);
    res.status(500).json({ error: 'Failed to bulk update group assignments' });
  }
});

// Tag management endpoints

// POST /tags - Add a tag to a contact
router.post('/tags', async (req: Request, res: Response) => {
  try {
    const { contactId, text, source } = req.body;
    if (!contactId || !text || !source) {
      return res.status(400).json({ error: 'contactId, text, and source are required' });
    }
    const tagService = new TagServiceImpl();
    await tagService.addTag(contactId, { text, source });
    res.status(201).send();
  } catch (error) {
    console.error('Error adding tag:', error);
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

// PUT /tags/:id - Update a tag
router.put('/tags/:id', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const tagService = new TagServiceImpl();
    const tag = await tagService.updateTag(req.params.id, text);
    
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    res.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// DELETE /tags/:id - Remove a tag
router.delete('/tags/:id', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.query;
    
    if (!contactId) {
      return res.status(400).json({ error: 'contactId query parameter is required' });
    }
    
    const tagService = new TagServiceImpl();
    await tagService.removeTag(contactId as string, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error removing tag:', error);
    res.status(500).json({ error: 'Failed to remove tag' });
  }
});

export default router;
