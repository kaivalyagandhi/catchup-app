import { Router, Response } from 'express';
import { CircleAssignmentServiceImpl } from '../../contacts/circle-assignment-service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { frequencyService } from '../../contacts/frequency-service';
import { FrequencyOption } from '../../types';
import {
  asyncHandler,
  validateRequest,
  requestTimeout,
} from '../middleware/error-handler';
import {
  validateCircleAssignment,
  validateBatchCircleAssignment,
  validatePreference,
  VALID_CIRCLES,
} from '../../contacts/onboarding-validation';
import {
  logOperation,
  withTimeout,
  executeBatchOperation,
} from '../../contacts/onboarding-error-handler';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply request timeout (30 seconds)
router.use(requestTimeout(30000));

/**
 * POST /api/circles/assign
 * Assign a single contact to a circle
 */
router.post(
  '/assign',
  validateRequest(validateCircleAssignment),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { contactId, circle } = req.body;

    logOperation('assign_circle', userId, { contactId, circle });

    const circleService = new CircleAssignmentServiceImpl();

    // Execute with timeout (5 seconds for single assignment)
    await withTimeout(
      () => circleService.assignToCircle(userId, contactId, circle),
      5000,
      'assign_circle'
    );

    res.status(204).send();
  })
);

/**
 * POST /api/circles/batch-assign
 * Assign multiple contacts to circles in a single transaction
 */
router.post(
  '/batch-assign',
  validateRequest((data) => validateBatchCircleAssignment(data.assignments || [])),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { assignments } = req.body;

    logOperation('batch_assign_circles', userId, {
      count: assignments.length,
    });

    const circleService = new CircleAssignmentServiceImpl();

    // Execute with timeout (30 seconds for batch operation)
    await withTimeout(
      () => circleService.batchAssign(userId, assignments),
      30000,
      'batch_assign_circles'
    );

    res.status(204).send();
  })
);

/**
 * GET /api/circles/distribution
 * Get the distribution of contacts across circles
 */
router.get(
  '/distribution',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;

    logOperation('get_circle_distribution', userId);

    const circleService = new CircleAssignmentServiceImpl();

    // Execute with timeout (5 seconds for read operation)
    const distribution = await withTimeout(
      () => circleService.getCircleDistribution(userId),
      5000,
      'get_circle_distribution'
    );

    res.json(distribution);
  })
);
    res.status(500).json({ error: 'Failed to fetch circle distribution' });
  }
});

/**
 * GET /api/circles/capacity/:circle
 * Get capacity status for a specific circle
 */
router.get('/capacity/:circle', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { circle } = req.params;

    // Validate circle
    if (!VALID_CIRCLES.includes(circle)) {
      res.status(400).json({ 
        error: `Invalid circle. Must be one of: ${VALID_CIRCLES.join(', ')}` 
      });
      return;
    }

    const circleService = new CircleAssignmentServiceImpl();
    const capacity = await circleService.validateCircleCapacity(userId, circle as any);

    res.json(capacity);
  } catch (error) {
    console.error('Error fetching circle capacity:', error);
    res.status(500).json({ error: 'Failed to fetch circle capacity' });
  }
});

/**
 * GET /api/circles/suggestions/rebalance
 * Get suggestions for rebalancing circles
 */
router.get('/suggestions/rebalance', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const circleService = new CircleAssignmentServiceImpl();
    const suggestions = await circleService.suggestCircleRebalancing(userId);

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching rebalancing suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch rebalancing suggestions' });
  }
});

/**
 * POST /api/circles/preferences/set
 * Set frequency preference for a contact
 */
router.post('/preferences/set', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { contactId, frequency } = req.body;

    // Validate required fields
    if (!contactId) {
      res.status(400).json({ error: 'contactId is required' });
      return;
    }

    if (!frequency) {
      res.status(400).json({ error: 'frequency is required' });
      return;
    }

    // Validate frequency value
    const validFrequencies = Object.values(FrequencyOption);
    if (!validFrequencies.includes(frequency as FrequencyOption)) {
      res.status(400).json({ 
        error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}` 
      });
      return;
    }

    await frequencyService.setFrequencyPreference(contactId, userId, frequency as FrequencyOption);

    res.status(204).send();
  } catch (error) {
    console.error('Error setting frequency preference:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to set frequency preference';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/circles/preferences/batch-set
 * Set frequency preferences for multiple contacts
 */
router.post('/preferences/batch-set', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { preferences } = req.body;

    // Validate preferences array
    if (!preferences || !Array.isArray(preferences)) {
      res.status(400).json({ error: 'preferences array is required' });
      return;
    }

    if (preferences.length === 0) {
      res.status(400).json({ error: 'preferences array cannot be empty' });
      return;
    }

    // Validate each preference
    const validFrequencies = Object.values(FrequencyOption);
    for (const pref of preferences) {
      if (!pref.contactId) {
        res.status(400).json({ error: 'Each preference must have a contactId' });
        return;
      }

      if (!pref.frequency) {
        res.status(400).json({ error: 'Each preference must have a frequency' });
        return;
      }

      if (!validFrequencies.includes(pref.frequency as FrequencyOption)) {
        res.status(400).json({ 
          error: `Invalid frequency "${pref.frequency}". Must be one of: ${validFrequencies.join(', ')}` 
        });
        return;
      }
    }

    // Set preferences sequentially (could be optimized with batch operation)
    for (const pref of preferences) {
      await frequencyService.setFrequencyPreference(
        pref.contactId, 
        userId, 
        pref.frequency as FrequencyOption
      );
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error batch setting frequency preferences:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to batch set frequency preferences';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * GET /api/circles/preferences/:contactId
 * Get frequency preference for a contact
 */
router.get('/preferences/:contactId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { contactId } = req.params;

    if (!contactId) {
      res.status(400).json({ error: 'contactId is required' });
      return;
    }

    const frequency = await frequencyService.getFrequencyPreference(contactId, userId);

    res.json({ contactId, frequency });
  } catch (error) {
    console.error('Error fetching frequency preference:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch frequency preference';
    
    // Return 404 if contact not found
    if (errorMessage.includes('not found')) {
      res.status(404).json({ error: errorMessage });
      return;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
