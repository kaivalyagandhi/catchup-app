/**
 * Test Mode Middleware
 *
 * Enforces test mode restrictions for email/password authentication.
 * When TEST_MODE is disabled (production), email/password endpoints are blocked.
 * When TEST_MODE is enabled (development/testing), both Google SSO and email/password work.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Check if test mode is enabled
 * Test mode is enabled when TEST_MODE environment variable is set to 'true'
 */
export function isTestModeEnabled(): boolean {
  return process.env.TEST_MODE === 'true';
}

/**
 * Middleware to enforce test mode restrictions
 * Blocks email/password authentication endpoints when test mode is disabled
 *
 * Usage:
 * router.post('/register', enforceTestMode, registerHandler);
 * router.post('/login', enforceTestMode, loginHandler);
 */
export function enforceTestMode(req: Request, res: Response, next: NextFunction): void {
  const testMode = isTestModeEnabled();

  // If test mode is disabled, block email/password authentication
  if (!testMode) {
    console.log('[Test Mode] Email/password authentication blocked - test mode disabled');

    res.status(403).json({
      error: {
        code: 'TEST_MODE_DISABLED',
        message:
          'Email/password authentication is only available in test mode. Please use Google Sign-In.',
        testMode: false,
      },
    });
    return;
  }

  // Test mode is enabled, allow the request
  console.log('[Test Mode] Email/password authentication allowed - test mode enabled');
  next();
}

/**
 * Middleware to add test mode indicator to API responses
 * Adds a testMode field to the response body
 *
 * Usage:
 * router.get('/status', addTestModeIndicator, statusHandler);
 */
export function addTestModeIndicator(req: Request, res: Response, next: NextFunction): void {
  const testMode = isTestModeEnabled();

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to add testMode field
  res.json = function (body: any): Response {
    // Add testMode indicator to response
    const enhancedBody = {
      ...body,
      testMode,
    };

    return originalJson(enhancedBody);
  };

  next();
}

/**
 * Get test mode status
 * Returns an object with test mode information
 */
export function getTestModeStatus(): {
  enabled: boolean;
  message: string;
} {
  const enabled = isTestModeEnabled();

  return {
    enabled,
    message: enabled
      ? 'Test mode is enabled. Both Google SSO and email/password authentication are available.'
      : 'Test mode is disabled. Only Google SSO authentication is available.',
  };
}
