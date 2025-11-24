import { Router, Request, Response } from 'express';
import * as suggestionService from '../../matching/suggestion-service';

const router = Router();

// GET /suggestions - Get all pending suggestions for a user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }
    
    const suggestions = await suggestionService.getPendingSuggestions(userId as string);
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
