import { Router, Response } from 'express';
import { PostgresAISuggestionService } from '../../contacts/ai-suggestion-service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Valid Dunbar circles
const VALID_CIRCLES = ['inner', 'close', 'active', 'casual', 'acquaintance'];

/**
 * POST /api/ai/suggest-circle
 * Get AI suggestion for a single contact's circle assignment
 */
router.post('/suggest-circle', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { contactId } = req.body;

    if (!contactId) {
      res.status(400).json({ error: 'contactId is required' });
      return;
    }

    const aiService = new PostgresAISuggestionService();
    const suggestion = await aiService.analyzeContact(userId, contactId);

    res.json(suggestion);
  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    res.status(500).json({ error: 'Failed to generate AI suggestion' });
  }
});

/**
 * POST /api/ai/batch-suggest
 * Get AI suggestions for multiple contacts
 */
router.post('/batch-suggest', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { contactIds } = req.body;

    // Validate contactIds array
    if (!contactIds || !Array.isArray(contactIds)) {
      res.status(400).json({ error: 'contactIds array is required' });
      return;
    }

    if (contactIds.length === 0) {
      res.status(400).json({ error: 'contactIds array cannot be empty' });
      return;
    }

    // Limit batch size to prevent overwhelming the system
    const MAX_BATCH_SIZE = 100;
    if (contactIds.length > MAX_BATCH_SIZE) {
      res.status(400).json({ 
        error: `Batch size cannot exceed ${MAX_BATCH_SIZE} contacts` 
      });
      return;
    }

    const aiService = new PostgresAISuggestionService();
    const suggestions = await aiService.batchAnalyze(userId, contactIds);

    res.json(suggestions);
  } catch (error) {
    console.error('Error generating batch AI suggestions:', error);
    res.status(500).json({ error: 'Failed to generate batch AI suggestions' });
  }
});

/**
 * POST /api/ai/record-override
 * Record when a user overrides an AI suggestion
 */
router.post('/record-override', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { contactId, suggestedCircle, actualCircle } = req.body;

    // Validate required fields
    if (!contactId) {
      res.status(400).json({ error: 'contactId is required' });
      return;
    }

    if (!suggestedCircle) {
      res.status(400).json({ error: 'suggestedCircle is required' });
      return;
    }

    if (!actualCircle) {
      res.status(400).json({ error: 'actualCircle is required' });
      return;
    }

    // Validate circle values
    if (!VALID_CIRCLES.includes(suggestedCircle)) {
      res.status(400).json({ 
        error: `Invalid suggestedCircle. Must be one of: ${VALID_CIRCLES.join(', ')}` 
      });
      return;
    }

    if (!VALID_CIRCLES.includes(actualCircle)) {
      res.status(400).json({ 
        error: `Invalid actualCircle. Must be one of: ${VALID_CIRCLES.join(', ')}` 
      });
      return;
    }

    const aiService = new PostgresAISuggestionService();
    await aiService.recordUserOverride(userId, contactId, suggestedCircle as any, actualCircle as any);

    res.status(204).send();
  } catch (error) {
    console.error('Error recording AI override:', error);
    res.status(500).json({ error: 'Failed to record AI override' });
  }
});

/**
 * POST /api/ai/improve-model
 * Trigger model improvement based on user overrides
 */
router.post('/improve-model', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const aiService = new PostgresAISuggestionService();
    await aiService.improveModel(userId);

    res.status(204).send();
  } catch (error) {
    console.error('Error improving AI model:', error);
    res.status(500).json({ error: 'Failed to improve AI model' });
  }
});

export default router;
