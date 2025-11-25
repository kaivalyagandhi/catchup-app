import { Router, Request, Response } from 'express';
import * as suggestionService from '../../matching/suggestion-service';

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
    res.json(suggestions);
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

export default router;
