import { Router, Response } from 'express';
import { PostgresAISuggestionService } from '../../contacts/ai-suggestion-service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Valid Dunbar circles (Simplified 4-circle system)
const VALID_CIRCLES = ['inner', 'close', 'active', 'casual'];

/**
 * GET /api/ai/circle-suggestions
 * Get circle suggestions grouped by circle type (inner, close, active)
 * Returns suggestions in format: { inner: [], close: [], active: [] }
 * Each suggestion has: { contactId, name, confidence, reasons }
 */
router.get('/circle-suggestions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    console.log('[AI Suggestions] GET /circle-suggestions for userId:', userId);

    // Get all uncategorized contacts
    const { PostgresContactRepository } = await import('../../contacts/repository');
    const contactRepo = new PostgresContactRepository();
    const uncategorized = await contactRepo.findUncategorized(userId);
    
    console.log('[AI Suggestions] Found uncategorized contacts:', uncategorized.length);
    
    if (uncategorized.length === 0) {
      console.log('[AI Suggestions] No uncategorized contacts, returning empty suggestions');
      res.json({ suggestions: { inner: [], close: [], active: [], casual: [] } });
      return;
    }

    // Limit to first 50 uncategorized contacts for performance
    const targetContacts = uncategorized.slice(0, 50);
    const targetContactIds = targetContacts.map((c: any) => c.id);

    const aiService = new PostgresAISuggestionService();
    
    // Set a timeout for AI processing (15 seconds for GET)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI suggestion timeout')), 15000);
    });

    const suggestionsPromise = aiService.batchAnalyze(userId, targetContactIds);

    try {
      const flatSuggestions = await Promise.race([suggestionsPromise, timeoutPromise]) as any[];
      
      console.log('[AI Suggestions] Got flat suggestions:', flatSuggestions.length);
      
      // Group suggestions by circle
      const grouped: { inner: any[], close: any[], active: any[], casual: any[] } = {
        inner: [],
        close: [],
        active: [],
        casual: []
      };
      
      // Create a map of contact IDs to names
      const contactNameMap = new Map<string, string>();
      targetContacts.forEach((c: any) => {
        contactNameMap.set(c.id, c.name || 'Unknown');
      });
      
      // Group suggestions by their suggested circle
      flatSuggestions.forEach((suggestion: any) => {
        const circle = suggestion.suggestedCircle || suggestion.circle;
        console.log('[AI Suggestions] Processing suggestion:', suggestion.contactId, 'circle:', circle);
        if (circle && grouped[circle as keyof typeof grouped]) {
          grouped[circle as keyof typeof grouped].push({
            contactId: suggestion.contactId,
            name: contactNameMap.get(suggestion.contactId) || 'Unknown',
            confidence: suggestion.confidence || 0.7,
            reasons: suggestion.factors?.map((f: any) => f.description) || suggestion.reasons || ['AI suggested']
          });
        }
      });
      
      // Sort each circle by confidence (highest first) and limit to 5 per circle
      Object.keys(grouped).forEach(circle => {
        grouped[circle as keyof typeof grouped] = grouped[circle as keyof typeof grouped]
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5);
      });
      
      console.log('[AI Suggestions] Grouped suggestions:', {
        inner: grouped.inner.length,
        close: grouped.close.length,
        active: grouped.active.length,
        casual: grouped.casual.length
      });
      
      res.json({ suggestions: grouped });
    } catch (timeoutError) {
      console.error('AI suggestion timeout:', timeoutError);
      res.json({ 
        suggestions: { inner: [], close: [], active: [], casual: [] },
        warning: 'AI suggestion service timed out.'
      });
    }
  } catch (error) {
    console.error('Error getting circle suggestions:', error);
    res.json({ 
      suggestions: { inner: [], close: [], active: [], casual: [] },
      error: 'Failed to get AI suggestions.'
    });
  }
});

/**
 * POST /api/ai/circle-suggestions
 * Generate circle suggestions for contacts
 * Analyze communication frequency, recency, calendar co-attendance
 * Return suggestions with confidence scores and reasons
 * Handle timeouts and errors gracefully
 * Requirements: 8.1, 8.2, 8.3, 9.1
 */
router.post('/circle-suggestions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { contactIds } = req.body;

    // If no contactIds provided, generate suggestions for all uncategorized contacts
    let targetContactIds = contactIds;
    
    if (!targetContactIds || !Array.isArray(targetContactIds) || targetContactIds.length === 0) {
      // Get all uncategorized contacts
      const { PostgresContactRepository } = await import('../../contacts/repository');
      const contactRepo = new PostgresContactRepository();
      const uncategorized = await contactRepo.findUncategorized(userId);
      targetContactIds = uncategorized.map((c: any) => c.id);
      
      if (targetContactIds.length === 0) {
        res.json({ suggestions: [] });
        return;
      }
    }

    // Limit batch size to prevent overwhelming the system
    const MAX_BATCH_SIZE = 100;
    if (targetContactIds.length > MAX_BATCH_SIZE) {
      res.status(400).json({
        error: `Batch size cannot exceed ${MAX_BATCH_SIZE} contacts`,
      });
      return;
    }

    const aiService = new PostgresAISuggestionService();
    
    // Set a timeout for AI processing (30 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI suggestion timeout')), 30000);
    });

    const suggestionsPromise = aiService.batchAnalyze(userId, targetContactIds);

    try {
      const suggestions = await Promise.race([suggestionsPromise, timeoutPromise]);
      res.json({ suggestions });
    } catch (timeoutError) {
      console.error('AI suggestion timeout:', timeoutError);
      // Return empty suggestions on timeout
      res.json({ 
        suggestions: [],
        warning: 'AI suggestion service timed out. Please try again with fewer contacts.'
      });
    }
  } catch (error) {
    console.error('Error generating circle suggestions:', error);
    // Handle errors gracefully - return empty suggestions instead of failing
    res.json({ 
      suggestions: [],
      error: 'Failed to generate AI suggestions. You can still assign circles manually.'
    });
  }
});

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
        error: `Batch size cannot exceed ${MAX_BATCH_SIZE} contacts`,
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
        error: `Invalid suggestedCircle. Must be one of: ${VALID_CIRCLES.join(', ')}`,
      });
      return;
    }

    if (!VALID_CIRCLES.includes(actualCircle)) {
      res.status(400).json({
        error: `Invalid actualCircle. Must be one of: ${VALID_CIRCLES.join(', ')}`,
      });
      return;
    }

    const aiService = new PostgresAISuggestionService();
    await aiService.recordUserOverride(
      userId,
      contactId,
      suggestedCircle as any,
      actualCircle as any
    );

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
