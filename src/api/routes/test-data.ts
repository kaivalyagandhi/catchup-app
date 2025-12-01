/**
 * Test Data Routes
 *
 * Endpoints for seeding test data and generating suggestions for testing
 */

import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { testDataGenerator } from '../../contacts/test-data-generator';

const router = Router();

/**
 * Middleware to check if test data endpoints are enabled
 * Returns 403 Forbidden if ENABLE_TEST_DATA_ENDPOINTS is set to 'false'
 */
const checkTestDataEnabled = (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const enabled = process.env.ENABLE_TEST_DATA_ENDPOINTS;

  // If the environment variable is explicitly set to 'false', disable endpoints
  if (enabled === 'false') {
    res.status(403).json({
      error: 'Test data endpoints are disabled',
      message:
        'Test data endpoints are disabled in this environment. Set ENABLE_TEST_DATA_ENDPOINTS=true to enable them.',
    });
    return;
  }

  // By default (undefined or any other value), endpoints are enabled
  next();
};

/**
 * POST /api/test-data/seed
 * Seed test contacts, groups, tags, and optionally calendar events and suggestions
 */
router.post(
  '/seed',
  checkTestDataEnabled,
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const userId = req.userId;
      const { contactCount, includeCalendarEvents, includeSuggestions, includeVoiceNotes } =
        req.body;

      // Seed test data using the generator
      const result = await testDataGenerator.seedTestData(userId, {
        contactCount: contactCount || 10,
        includeCalendarEvents: includeCalendarEvents || false,
        includeSuggestions: includeSuggestions || false,
        includeVoiceNotes: includeVoiceNotes || false,
      });

      // If includeSuggestions is true, generate suggestions after seeding
      let finalResult = result;
      if (includeSuggestions) {
        const suggestionResult = await testDataGenerator.generateSuggestions(userId, {
          daysAhead: 7,
        });
        finalResult = {
          ...result,
          suggestionsCreated: suggestionResult.suggestionsCreated,
        };
      }

      res.json({
        message: 'Test data seeded successfully',
        ...finalResult,
      });
    } catch (error) {
      console.error('Error seeding test data:', error);
      res.status(500).json({
        error: 'Failed to seed test data',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/test-data/generate-suggestions
 * Generate suggestions for existing contacts using calendar events
 */
router.post(
  '/generate-suggestions',
  checkTestDataEnabled,
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const userId = req.userId;
      const { daysAhead } = req.body;

      // Use the test data generator to generate suggestions
      const result = await testDataGenerator.generateSuggestions(userId, {
        daysAhead: daysAhead || 7,
      });

      res.json({
        message: 'Suggestions generated successfully',
        suggestionsCreated: result.suggestionsCreated,
      });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/test-data/clear
 * Clear all test data for the authenticated user
 */
router.post(
  '/clear',
  checkTestDataEnabled,
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const userId = req.userId;

      // Clear test data using the generator
      const result = await testDataGenerator.clearTestData(userId);

      res.json({
        message: 'Test data cleared successfully',
        ...result,
      });
    } catch (error) {
      console.error('Error clearing test data:', error);
      res.status(500).json({
        error: 'Failed to clear test data',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/test-data/status
 * Get status counts for all test data types
 */
router.get(
  '/status',
  checkTestDataEnabled,
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const userId = req.userId;
      const status = await testDataGenerator.getStatus(userId);

      res.json(status);
    } catch (error) {
      console.error('Error fetching test data status:', error);
      res.status(500).json({
        error: 'Failed to fetch test data status',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/test-data/generate/:dataType
 * Generate specific type of test data
 */
router.post(
  '/generate/:dataType',
  checkTestDataEnabled,
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const userId = req.userId;
      const { dataType } = req.params;

      const result = await testDataGenerator.generateByType(userId, dataType);

      res.json(result);
    } catch (error) {
      console.error(`Error generating ${req.params.dataType}:`, error);
      res.status(500).json({
        error: `Failed to generate ${req.params.dataType}`,
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/test-data/remove/:dataType
 * Remove specific type of test data
 */
router.post(
  '/remove/:dataType',
  checkTestDataEnabled,
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const userId = req.userId;
      const { dataType } = req.params;

      const result = await testDataGenerator.removeByType(userId, dataType);

      res.json(result);
    } catch (error) {
      console.error(`Error removing ${req.params.dataType}:`, error);
      res.status(500).json({
        error: `Failed to remove ${req.params.dataType}`,
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
