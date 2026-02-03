/**
 * Admin Sync Health API Routes
 * 
 * Provides admin dashboard endpoints for monitoring sync health across all users.
 * Protected by requireAdmin middleware.
 * 
 * Requirements: 10.1, 10.6
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { SyncHealthService } from '../../integrations/sync-health-service';

const router = Router();
const syncHealthService = new SyncHealthService();

/**
 * GET /api/admin/sync-health
 * 
 * Get comprehensive sync health metrics for admin dashboard
 * 
 * Query Parameters:
 *   - integration_type (optional): Filter by 'google_contacts' or 'google_calendar'
 * 
 * Response:
 *   - totalUsers: Total users with active integrations
 *   - activeIntegrations: Count by integration type
 *   - invalidTokens: Count of invalid tokens by type
 *   - openCircuitBreakers: Count of open circuit breakers by type
 *   - syncSuccessRate24h: Success rate percentage by type
 *   - apiCallsSaved: API calls saved by optimization type
 *   - persistentFailures: List of users with sync failures >7 days
 * 
 * Requirements: 10.1, 10.6
 */
router.get(
  '/sync-health',
  authenticate,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const integrationType = req.query.integration_type as
        | 'google_contacts'
        | 'google_calendar'
        | undefined;

      // Validate integration_type if provided
      if (
        integrationType &&
        integrationType !== 'google_contacts' &&
        integrationType !== 'google_calendar'
      ) {
        res.status(400).json({
          error: 'Invalid integration_type. Must be "google_contacts" or "google_calendar"',
        });
        return;
      }

      const metrics = await syncHealthService.getHealthMetrics(integrationType);

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching sync health metrics:', error);
      res.status(500).json({
        error: 'Failed to fetch sync health metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/admin/sync-health/user/:userId
 * 
 * Get detailed sync status for a specific user
 * 
 * Path Parameters:
 *   - userId: User ID to query
 * 
 * Response:
 *   - contacts: Sync status for Google Contacts integration
 *   - calendar: Sync status for Google Calendar integration
 * 
 * Each status includes:
 *   - tokenHealth: Token status and expiry
 *   - circuitBreakerState: Circuit breaker state and failure count
 *   - syncSchedule: Current frequency and next sync time
 *   - lastSync: Last sync timestamp
 *   - lastSyncResult: Last sync outcome
 *   - webhookActive: Webhook status (calendar only)
 * 
 * Requirements: 10.1, 10.2, 10.3
 */
router.get(
  '/sync-health/user/:userId',
  authenticate,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const status = await syncHealthService.getUserSyncStatus(userId);

      res.json(status);
    } catch (error) {
      console.error('Error fetching user sync status:', error);
      res.status(500).json({
        error: 'Failed to fetch user sync status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
