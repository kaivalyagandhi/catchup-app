/**
 * Example: Secured Contacts Routes
 *
 * This file demonstrates how to secure API routes with authentication
 * To use this pattern, replace the existing routes/contacts.ts with this approach
 */

import { Router, Response } from 'express';
import { ContactServiceImpl } from '../../contacts/service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * POST /api/contacts
 * Create a new contact (authenticated)
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // userId comes from the authenticated token, not the request body
    const userId = req.userId!;
    const contactData = req.body;
    
    const contactService = new ContactServiceImpl();
    const contact = await contactService.createContact(userId, contactData);
    
    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

/**
 * GET /api/contacts/:id
 * Get a specific contact (authenticated)
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // userId comes from the authenticated token
    const userId = req.userId!;
    const contactId = req.params.id;
    
    const contactService = new ContactServiceImpl();
    const contact = await contactService.getContact(contactId, userId);
    
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

/**
 * GET /api/contacts
 * List all contacts for authenticated user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // userId comes from the authenticated token
    const userId = req.userId!;
    
    const contactService = new ContactServiceImpl();
    const contacts = await contactService.listContacts(userId);
    
    res.json(contacts);
  } catch (error) {
    console.error('Error listing contacts:', error);
    res.status(500).json({ error: 'Failed to list contacts' });
  }
});

/**
 * PUT /api/contacts/:id
 * Update a contact (authenticated)
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const contactId = req.params.id;
    const updates = req.body;
    
    const contactService = new ContactServiceImpl();
    const contact = await contactService.updateContact(contactId, userId, updates);
    
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

/**
 * DELETE /api/contacts/:id
 * Delete a contact (authenticated)
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const contactId = req.params.id;
    
    const contactService = new ContactServiceImpl();
    await contactService.deleteContact(contactId, userId);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;
