import { Router, Request, Response } from 'express';
import * as suggestionService from '../../matching/suggestion-service';
import pool from '../../db/connection';

const router = Router();

// GET /suggestions/all - Get ALL suggestions regardless of status
router.get('/all', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }

    const suggestions = await suggestionService.getAllSuggestions(userId as string);
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching all suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// GET /suggestions - Get suggestions for a user (with optional status filter)
// Updated to include group suggestions with multiple contacts and shared context
// Requirements: 8.1-8.12, 14.1-14.10
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, status } = req.query;

    console.log('GET /suggestions called with userId:', userId, 'status:', status);

    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }

    let suggestions;
    if (status && status !== 'all') {
      // Fetch suggestions with specific status
      const filters = { status: status as any };
      suggestions = await suggestionService.getPendingSuggestions(userId as string, filters);
    } else {
      // Fetch all suggestions (not just pending)
      suggestions = await suggestionService.getAllSuggestions(userId as string);
    }

    console.log('Found suggestions:', suggestions.length);

    // Format response to ensure group suggestions include all required data
    const formattedSuggestions = suggestions.map((suggestion) => ({
      id: suggestion.id,
      userId: suggestion.userId,
      type: suggestion.type, // 'individual' or 'group'
      contacts: suggestion.contacts, // Array of Contact objects
      contactId: suggestion.contactId, // Legacy field for backward compatibility
      triggerType: suggestion.triggerType,
      proposedTimeslot: suggestion.proposedTimeslot,
      reasoning: suggestion.reasoning,
      status: suggestion.status,
      dismissalReason: suggestion.dismissalReason,
      calendarEventId: suggestion.calendarEventId,
      snoozedUntil: suggestion.snoozedUntil,
      priority: suggestion.priority,
      sharedContext: suggestion.sharedContext, // Shared context data for group suggestions
      createdAt: suggestion.createdAt,
      updatedAt: suggestion.updatedAt,
    }));

    res.json(formattedSuggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// POST /suggestions/:id/accept - Accept a suggestion
router.post('/:id/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = await suggestionService.acceptSuggestion(req.params.id, userId);
    res.json(result);
  } catch (error) {
    console.error('Error accepting suggestion:', error);
    res.status(500).json({ error: 'Failed to accept suggestion' });
  }
});

// POST /suggestions/:id/dismiss - Dismiss a suggestion
router.post('/:id/dismiss', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    await suggestionService.dismissSuggestion(req.params.id, userId, reason);
    res.status(204).send();
  } catch (error) {
    console.error('Error dismissing suggestion:', error);
    res.status(500).json({ error: 'Failed to dismiss suggestion' });
  }
});

// POST /suggestions/:id/snooze - Snooze a suggestion
router.post('/:id/snooze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, duration } = req.body;

    if (!userId || !duration) {
      res.status(400).json({ error: 'userId and duration are required' });
      return;
    }

    await suggestionService.snoozeSuggestion(req.params.id, userId, duration);
    res.status(204).send();
  } catch (error) {
    console.error('Error snoozing suggestion:', error);
    res.status(500).json({ error: 'Failed to snooze suggestion' });
  }
});

// POST /suggestions/:id/remove-contact - Remove a contact from a group suggestion
// Requirements: 14.8, 14.9
router.post('/:id/remove-contact', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, contactId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    if (!contactId) {
      res.status(400).json({ error: 'contactId is required' });
      return;
    }

    // Import suggestion repository
    const { findById } = await import('../../matching/suggestion-repository');

    // Get the suggestion
    const suggestion = await findById(id, userId);
    if (!suggestion) {
      res.status(404).json({ error: 'Suggestion not found' });
      return;
    }

    // Verify it's a group suggestion
    if (suggestion.type !== 'group') {
      res.status(400).json({ error: 'Can only remove contacts from group suggestions' });
      return;
    }

    // Verify the contact is in the suggestion
    const contactInSuggestion = suggestion.contacts.some((c) => c.id === contactId);
    if (!contactInSuggestion) {
      res.status(400).json({ error: 'Contact not found in this suggestion' });
      return;
    }

    // Remove the contact from suggestion_contacts table
    await pool.query(
      'DELETE FROM suggestion_contacts WHERE suggestion_id = $1 AND contact_id = $2',
      [id, contactId]
    );

    // Get remaining contacts
    const remainingContactsResult = await pool.query(
      `SELECT contact_id FROM suggestion_contacts WHERE suggestion_id = $1`,
      [id]
    );

    const remainingCount = remainingContactsResult.rows.length;

    // If only one contact remains, convert to individual suggestion
    if (remainingCount === 1) {
      const remainingContactId = remainingContactsResult.rows[0].contact_id;
      await pool.query(
        `UPDATE suggestions 
         SET type = 'individual', contact_id = $1, shared_context = NULL
         WHERE id = $2`,
        [remainingContactId, id]
      );
    } else if (remainingCount === 0) {
      // If no contacts remain, dismiss the suggestion
      await pool.query(
        `UPDATE suggestions 
         SET status = 'dismissed', dismissal_reason = 'All contacts removed'
         WHERE id = $1`,
        [id]
      );
    }

    // Get updated suggestion
    const updatedSuggestion = await findById(id, userId);

    res.json(updatedSuggestion);
  } catch (error) {
    console.error('Error removing contact from suggestion:', error);
    res.status(500).json({
      error: 'Failed to remove contact from suggestion',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
