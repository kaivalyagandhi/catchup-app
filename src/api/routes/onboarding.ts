import { Router, Response } from 'express';
import { PostgresOnboardingService } from '../../contacts/onboarding-service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, validateRequest, requestTimeout } from '../middleware/error-handler';
import {
  validateOnboardingInit,
  validateProgressUpdate,
  throwIfInvalid,
} from '../../contacts/onboarding-validation';
import {
  logOperation,
  logOperationError,
  withTimeout,
} from '../../contacts/onboarding-error-handler';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply request timeout (30 seconds)
router.use(requestTimeout(30000));

/**
 * POST /api/onboarding/initialize
 * Initialize onboarding flow for a user
 */
router.post(
  '/initialize',
  validateRequest(validateOnboardingInit),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { trigger, source, contactCount } = req.body;

    logOperation('initialize_onboarding', userId, { trigger, source, contactCount });

    const onboardingService = new PostgresOnboardingService();

    // Execute with timeout (10 seconds for initialization)
    const state = await withTimeout(
      () =>
        onboardingService.initializeOnboarding(userId, {
          type: trigger,
          source,
          contactCount,
        }),
      10000,
      'initialize_onboarding'
    );

    res.status(201).json(state);
  })
);

/**
 * GET /api/onboarding/state
 * Get current onboarding state for a user
 */
router.get(
  '/state',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;

    logOperation('get_onboarding_state', userId);

    const onboardingService = new PostgresOnboardingService();

    // Execute with timeout (5 seconds for read operation)
    const state = await withTimeout(
      () => onboardingService.getOnboardingState(userId),
      5000,
      'get_onboarding_state'
    );

    if (!state) {
      res.status(404).json({
        error: 'No onboarding state found',
        code: 'ONBOARDING_NOT_FOUND',
      });
      return;
    }

    res.json(state);
  })
);

/**
 * PUT /api/onboarding/progress
 * Update onboarding progress
 */
router.put(
  '/progress',
  validateRequest(validateProgressUpdate),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { step, data } = req.body;

    logOperation('update_onboarding_progress', userId, { step });

    const onboardingService = new PostgresOnboardingService();

    // Execute with timeout (10 seconds for update operation)
    await withTimeout(
      () => onboardingService.updateProgress(userId, step, data || {}),
      10000,
      'update_onboarding_progress'
    );

    res.status(204).send();
  })
);

/**
 * POST /api/onboarding/complete
 * Mark onboarding as complete
 */
router.post(
  '/complete',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;

    logOperation('complete_onboarding', userId);

    const onboardingService = new PostgresOnboardingService();

    // Execute with timeout (10 seconds for completion)
    await withTimeout(
      () => onboardingService.completeOnboarding(userId),
      10000,
      'complete_onboarding'
    );

    res.status(204).send();
  })
);

/**
 * GET /api/onboarding/uncategorized
 * Get uncategorized contacts for a user with pagination support
 * Requirements: 11.1, 4.2 - Implement pagination for large contact lists
 */
router.get('/uncategorized', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined;

    const onboardingService = new PostgresOnboardingService();
    const contacts = await onboardingService.getUncategorizedContacts(
      userId,
      page && pageSize ? { page, pageSize } : undefined
    );

    // Get total count for pagination metadata
    const totalCount = await onboardingService.getUncategorizedContactsCount(userId);

    res.json({
      contacts,
      pagination:
        page && pageSize
          ? {
              page,
              pageSize,
              totalItems: totalCount,
              totalPages: Math.ceil(totalCount / pageSize),
              hasNextPage: page * pageSize < totalCount,
              hasPreviousPage: page > 1,
            }
          : null,
    });
  } catch (error) {
    console.error('Error fetching uncategorized contacts:', error);
    res.status(500).json({ error: 'Failed to fetch uncategorized contacts' });
  }
});

/**
 * GET /api/onboarding/progress
 * Get onboarding progress including uncategorized count
 * Requirements: 11.1, 11.2
 */
router.get('/progress', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const onboardingService = new PostgresOnboardingService();
    const progress = await onboardingService.getProgress(userId);

    res.json(progress);
  } catch (error) {
    console.error('Error fetching onboarding progress:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding progress' });
  }
});

/**
 * GET /api/onboarding/completion-status
 * Get onboarding completion status
 * Requirements: 11.2, 11.4
 */
router.get(
  '/completion-status',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;

      const onboardingService = new PostgresOnboardingService();
      const status = await onboardingService.getCompletionStatus(userId);

      res.json(status);
    } catch (error) {
      console.error('Error fetching completion status:', error);
      res.status(500).json({ error: 'Failed to fetch completion status' });
    }
  }
);

/**
 * POST /api/onboarding/flag-contact
 * Flag a new contact for categorization
 * Requirements: 11.5
 */
router.post('/flag-contact', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { contactId } = req.body;

    if (!contactId) {
      res.status(400).json({ error: 'contactId is required' });
      return;
    }

    const onboardingService = new PostgresOnboardingService();
    await onboardingService.flagNewContactForCategorization(userId, contactId);

    res.status(204).send();
  } catch (error) {
    console.error('Error flagging contact:', error);
    res.status(500).json({ error: 'Failed to flag contact for categorization' });
  }
});

/**
 * GET /api/onboarding/should-trigger
 * Check if onboarding should be auto-triggered for the user
 * Requirements: 1.1, 2.1, 11.1
 */
router.get('/should-trigger', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const onboardingService = new PostgresOnboardingService();
    const shouldTrigger = await onboardingService.shouldTriggerOnboarding(userId);

    res.json({ shouldTrigger });
  } catch (error) {
    console.error('Error checking onboarding trigger:', error);
    res.status(500).json({ error: 'Failed to check onboarding trigger' });
  }
});

export default router;
