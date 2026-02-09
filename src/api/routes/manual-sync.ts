/**
 * Manual Sync Routes
 *
 * Handles user-initiated manual synchronization for Google Contacts and Calendar.
 * Implements rate limiting, circuit breaker bypass, and error handling.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { syncOrchestrator } from '../../integrations/sync-orchestrator';
import { getToken } from '../../integrations/oauth-repository';
import { checkRateLimit, RateLimitConfig } from '../../utils/rate-limiter';

const router = Router();

/**
 * Rate limit configuration for manual syncs
 * Requirements: 7.4 - Limit to 1 request per minute per user per integration
 */
const MANUAL_SYNC_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1, // 1 request per minute
  keyPrefix: 'ratelimit:manual-sync',
};

/**
 * POST /api/sync/manual
 * Trigger a manual synchronization for Google Contacts or Calendar
 *
 * Requirements:
 * - 7.1: Manual sync triggering
 * - 7.2: Circuit breaker bypass for manual syncs
 * - 7.3: Error handling with re-auth link
 * - 7.4: Rate limiting (1 per minute per user per integration)
 */
router.post('/manual', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { integration_type } = req.body;

    // Validate integration_type parameter
    if (!integration_type || !['contacts', 'calendar'].includes(integration_type)) {
      res.status(400).json({
        error: 'Invalid integration_type',
        message: 'integration_type must be either "contacts" or "calendar"',
      });
      return;
    }

    const integrationType = integration_type === 'contacts' ? 'google_contacts' : 'google_calendar';

    console.log(
      `[ManualSync] Manual sync requested for user ${req.userId}, integration ${integrationType}`
    );

    // Requirements: 7.4 - Rate limiting (1 per minute per user per integration)
    const rateLimitKey = `${req.userId}:${integrationType}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, MANUAL_SYNC_RATE_LIMIT);

    if (!rateLimitResult.allowed) {
      console.log(
        `[ManualSync] Rate limit exceeded for user ${req.userId}, integration ${integrationType}`
      );

      res.status(429).json({
        error: 'Too many requests',
        message: `You can only trigger a manual sync once per minute. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        retryAfter: rateLimitResult.retryAfter,
        resetAt: rateLimitResult.resetAt,
      });
      return;
    }

    // Get OAuth tokens for the user
    const provider = integration_type === 'contacts' ? 'google_contacts' : 'google_calendar';
    const token = await getToken(req.userId, provider);

    if (!token) {
      // Requirements: 7.3 - Return error with re-auth link on token failure
      const authUrl =
        integration_type === 'contacts'
          ? '/api/contacts/google/authorize'
          : '/api/calendar/google/authorize';

      res.status(401).json({
        error: 'Not connected',
        message: `Your ${integration_type === 'contacts' ? 'Google Contacts' : 'Google Calendar'} account is not connected. Please reconnect to enable sync.`,
        reAuthUrl: authUrl,
        requiresReAuth: true,
      });
      return;
    }

    // Requirements: 7.1 - Trigger immediate sync via SyncOrchestrator
    // Requirements: 7.2 - Bypass circuit breaker for manual syncs
    const syncResult = await syncOrchestrator.executeSyncJob({
      userId: req.userId,
      integrationType,
      syncType: 'manual',
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      bypassCircuitBreaker: true, // Manual syncs bypass circuit breaker
    });

    // Handle sync result
    if (syncResult.success) {
      console.log(
        `[ManualSync] Sync completed successfully for user ${req.userId}, integration ${integrationType}`
      );

      res.json({
        success: true,
        message: 'Sync completed successfully',
        result: {
          itemsProcessed: syncResult.itemsProcessed || 0,
          duration: syncResult.duration,
          changesDetected: syncResult.changesDetected || false,
        },
      });
      return;
    }

    // Handle sync failure
    if (syncResult.result === 'skipped') {
      // Requirements: 7.3 - Return error with re-auth link on token failure
      if (syncResult.skipReason === 'invalid_token') {
        const authUrl =
          integration_type === 'contacts'
            ? '/api/contacts/google/authorize'
            : '/api/calendar/google/authorize';

        res.status(401).json({
          error: 'Invalid token',
          message: `Your ${integration_type === 'contacts' ? 'Google Contacts' : 'Google Calendar'} token is invalid or expired. Please reconnect to enable sync.`,
          reAuthUrl: authUrl,
          requiresReAuth: true,
        });
        return;
      }

      // Other skip reasons (shouldn't happen with circuit breaker bypass, but handle anyway)
      res.status(503).json({
        error: 'Sync unavailable',
        message: 'Sync is temporarily unavailable. Please try again later.',
        skipReason: syncResult.skipReason,
      });
      return;
    }

    // Sync failed with error
    // Requirements: 7.3 - Return user-friendly error messages
    const isAuthError =
      syncResult.errorMessage?.includes('401') ||
      syncResult.errorMessage?.includes('unauthorized') ||
      syncResult.errorMessage?.includes('invalid_grant');

    if (isAuthError) {
      const authUrl =
        integration_type === 'contacts'
          ? '/api/contacts/google/authorize'
          : '/api/calendar/google/authorize';

      res.status(401).json({
        error: 'Authentication failed',
        message: `Failed to authenticate with ${integration_type === 'contacts' ? 'Google Contacts' : 'Google Calendar'}. Please reconnect your account.`,
        reAuthUrl: authUrl,
        requiresReAuth: true,
      });
      return;
    }

    // Generic error
    res.status(500).json({
      error: 'Sync failed',
      message: 'An error occurred during sync. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? syncResult.errorMessage : undefined,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[ManualSync] Error during manual sync:', errorMsg);

    // Requirements: 7.3 - Return user-friendly error messages
    res.status(500).json({
      error: 'Sync failed',
      message: 'An unexpected error occurred. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? errorMsg : undefined,
    });
  }
});

export default router;
