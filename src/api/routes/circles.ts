import { Router, Response } from 'express';
import { CircleAssignmentServiceImpl } from '../../contacts/circle-assignment-service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { frequencyService } from '../../contacts/frequency-service';
import { FrequencyOption } from '../../types';
import { asyncHandler, validateRequest, requestTimeout } from '../middleware/error-handler';
import { validateCircleAssignment } from '../../contacts/onboarding-validation';

const VALID_CIRCLES = ['inner', 'close', 'active', 'casual'];

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
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { contactId, circle } = req.body;

    // Validate input
    const validation = validateCircleAssignment({ contactId, circle });
    if (!validation.valid) {
      res.status(400).json({ errors: validation.errors });
      return;
    }

    const circleService = new CircleAssignmentServiceImpl();
    await circleService.assignToCircle(userId, contactId, circle);

    res.status(204).send();
  })
);

/**
 * POST /api/circles/batch-assign
 * Assign multiple contacts to circles in a single transaction
 */
router.post(
  '/batch-assign',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { assignments } = req.body;

    if (!assignments || !Array.isArray(assignments)) {
      res.status(400).json({ error: 'assignments array is required' });
      return;
    }

    const circleService = new CircleAssignmentServiceImpl();
    await circleService.batchAssign(userId, assignments);

    res.status(204).send();
  })
);

/**
 * POST /api/circles/batch-accept
 * Accept a batch of contacts and assign them to a circle atomically
 *
 * This endpoint is used during onboarding to accept batch suggestions.
 * All assignments succeed or all fail (atomic transaction).
 *
 * Requirements: 17.3, 17.6, 17.7
 */
router.post(
  '/batch-accept',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { batchId, circle, contactIds } = req.body;

    // Validate input
    if (!batchId) {
      res.status(400).json({ error: 'batchId is required' });
      return;
    }

    if (!circle) {
      res.status(400).json({ error: 'circle is required' });
      return;
    }

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      res.status(400).json({ error: 'contactIds array is required and must not be empty' });
      return;
    }

    // Validate circle
    if (!VALID_CIRCLES.includes(circle)) {
      res.status(400).json({
        error: `Invalid circle. Must be one of: ${VALID_CIRCLES.join(', ')}`,
      });
      return;
    }

    // Use existing batchAssign service with atomic transaction
    const circleService = new CircleAssignmentServiceImpl();

    // Convert to assignments format
    const assignments = contactIds.map((contactId) => ({
      contactId,
      circle,
    }));

    // This will use a transaction internally - all succeed or all fail
    await circleService.batchAssign(userId, assignments, 'user');

    res.json({
      success: true,
      batchId,
      assignedCount: contactIds.length,
      circle,
    });
  })
);

/**
 * POST /api/circles/batch-remove
 * Remove circle assignments from multiple contacts (for undo functionality)
 *
 * Requirements: 8.4 (Undo capability)
 */
router.post(
  '/batch-remove',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { contactIds } = req.body;

    // Validate input
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      res.status(400).json({ error: 'contactIds array is required and must not be empty' });
      return;
    }

    const circleService = new CircleAssignmentServiceImpl();

    // Remove circle assignments by setting to null
    const assignments = contactIds.map((contactId) => ({
      contactId,
      circle: null as any, // Remove circle assignment
    }));

    await circleService.batchAssign(userId, assignments, 'user');

    res.json({
      success: true,
      removedCount: contactIds.length,
    });
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

    const circleService = new CircleAssignmentServiceImpl();
    const distribution = await circleService.getCircleDistribution(userId);

    res.json(distribution);
  })
);

/**
 * GET /api/circles/capacity/:circle
 * Get capacity status for a specific circle
 */
router.get('/capacity/:circle', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { circle } = req.params;

    // Validate circle
    if (!VALID_CIRCLES.includes(circle as any)) {
      res.status(400).json({
        error: `Invalid circle. Must be one of: ${VALID_CIRCLES.join(', ')}`,
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
router.get(
  '/suggestions/rebalance',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;

      const circleService = new CircleAssignmentServiceImpl();
      const suggestions = await circleService.suggestCircleRebalancing(userId);

      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching rebalancing suggestions:', error);
      res.status(500).json({ error: 'Failed to fetch rebalancing suggestions' });
    }
  }
);

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
        error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`,
      });
      return;
    }

    await frequencyService.setFrequencyPreference(contactId, userId, frequency as FrequencyOption);

    res.status(204).send();
  } catch (error) {
    console.error('Error setting frequency preference:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to set frequency preference';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/circles/preferences/batch-set
 * Set frequency preferences for multiple contacts
 */
router.post(
  '/preferences/batch-set',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
            error: `Invalid frequency "${pref.frequency}". Must be one of: ${validFrequencies.join(', ')}`,
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
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to batch set frequency preferences';
      res.status(500).json({ error: errorMessage });
    }
  }
);

/**
 * GET /api/circles/preferences/:contactId
 * Get frequency preference for a contact
 */
router.get(
  '/preferences/:contactId',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch frequency preference';

      // Return 404 if contact not found
      if (errorMessage.includes('not found')) {
        res.status(404).json({ error: errorMessage });
        return;
      }

      res.status(500).json({ error: errorMessage });
    }
  }
);

export default router;
