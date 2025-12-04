/**
 * Google SSO Error Handler - Usage Examples
 *
 * This file demonstrates how to use the Google SSO error handler
 * in various scenarios.
 */

import { Request, Response, NextFunction } from 'express';
import {
  googleSSOErrorHandler,
  GoogleSSOErrorHandler,
  getGoogleSSOErrorHandler,
} from './google-sso-error-handler';
import { GoogleSSOError, GoogleSSOErrorCode } from './google-sso-service';

// ============================================================================
// Example 1: Basic Error Handling in Route Handler
// ============================================================================

async function handleGoogleCallback(req: Request, res: Response) {
  try {
    // Your Google SSO logic here
    throw new GoogleSSOError(
      'Token signature verification failed',
      GoogleSSOErrorCode.SIGNATURE_VERIFICATION_FAILED,
      'Token signature verification failed. Please try again.',
      401
    );
  } catch (error) {
    // Log the error with context
    googleSSOErrorHandler.logError(error as Error, req, {
      endpoint: '/callback',
      action: 'oauth_callback',
    });

    // Format and send error response
    const errorResponse = googleSSOErrorHandler.formatError(error as Error);
    const statusCode = error instanceof GoogleSSOError ? error.statusCode : 500;
    res.status(statusCode).json(errorResponse);
  }
}

// ============================================================================
// Example 2: Using Error Handler Middleware
// ============================================================================

import express from 'express';

const app = express();

// Add Google SSO error handler middleware
// This will automatically catch and handle GoogleSSOError instances
app.use(googleSSOErrorHandler.middleware());

// Your routes here
app.get('/api/auth/google/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Your Google SSO logic
    throw new GoogleSSOError(
      'Invalid state parameter',
      GoogleSSOErrorCode.STATE_MISMATCH,
      'Security validation failed. Please try again.',
      400
    );
  } catch (error) {
    // Pass error to middleware
    next(error);
  }
});

// ============================================================================
// Example 3: Creating Errors with Automatic Logging
// ============================================================================

async function validateToken(req: Request, token: string) {
  if (!token) {
    // Create error with automatic logging
    throw googleSSOErrorHandler.createError(
      'Token is missing',
      GoogleSSOErrorCode.INVALID_TOKEN,
      'Invalid authentication token. Please try again.',
      401,
      req,
      { endpoint: '/validate', token: 'missing' }
    );
  }

  // Validate token...
}

// ============================================================================
// Example 4: Checking Error Properties
// ============================================================================

async function handleAuthError(error: Error, req: Request, res: Response) {
  // Check if error is retryable
  if (googleSSOErrorHandler.isRetryable(error)) {
    console.log('This error can be retried');
    // Show retry button in UI
  }

  // Check if error is a security event
  if (googleSSOErrorHandler.isSecurityEvent(error)) {
    console.log('Security event detected!');
    // Trigger security alert
    // Log to security monitoring system
  }

  // Get error message with guidance
  const messageWithGuidance = googleSSOErrorHandler.getMessageWithGuidance(error);
  console.log('User message:', messageWithGuidance);

  // Send response
  const errorResponse = googleSSOErrorHandler.formatError(error);
  const statusCode = error instanceof GoogleSSOError ? error.statusCode : 500;
  res.status(statusCode).json(errorResponse);
}

// ============================================================================
// Example 5: Custom Error Handling with Severity-Based Actions
// ============================================================================

async function handleErrorWithSeverity(error: Error, req: Request, res: Response) {
  // Log the error
  const logEntry = googleSSOErrorHandler.logError(error, req, {
    endpoint: req.path,
    method: req.method,
  });

  // Take action based on error type
  if (error instanceof GoogleSSOError) {
    switch (error.code) {
      case GoogleSSOErrorCode.STATE_MISMATCH:
      case GoogleSSOErrorCode.SIGNATURE_VERIFICATION_FAILED:
        // CRITICAL: Security event
        console.error('SECURITY ALERT:', error.message);
        // Send alert to security team
        // Log to SIEM system
        break;

      case GoogleSSOErrorCode.USER_CREATION_FAILED:
        // HIGH: System error
        console.error('SYSTEM ERROR:', error.message);
        // Alert operations team
        break;

      case GoogleSSOErrorCode.TOKEN_EXCHANGE_FAILED:
      case GoogleSSOErrorCode.INVALID_TOKEN:
        // MEDIUM: Recoverable error
        console.warn('Recoverable error:', error.message);
        // Monitor for patterns
        break;

      case GoogleSSOErrorCode.INVALID_CODE:
      case GoogleSSOErrorCode.TOKEN_EXPIRED:
      case GoogleSSOErrorCode.EMAIL_CONFLICT:
        // LOW: User error
        console.info('User error:', error.message);
        // Normal operation
        break;
    }
  }

  // Send response
  const errorResponse = googleSSOErrorHandler.formatError(error);
  const statusCode = error instanceof GoogleSSOError ? error.statusCode : 500;
  res.status(statusCode).json(errorResponse);
}

// ============================================================================
// Example 6: Integration with Audit Logging
// ============================================================================

import { logAuditEvent, AuditAction } from '../utils/audit-logger';

async function handleAuthenticationError(error: Error, req: Request, res: Response) {
  // Log error with error handler
  googleSSOErrorHandler.logError(error, req, {
    endpoint: '/callback',
    action: 'oauth_callback',
  });

  // Also log to audit system
  await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
    metadata: {
      provider: 'google',
      method: 'oauth_callback',
      error: error instanceof Error ? error.message : String(error),
    },
    success: false,
    errorMessage: error instanceof Error ? error.message : String(error),
  });

  // Send response with guidance
  const errorResponse = googleSSOErrorHandler.formatError(error);
  if (errorResponse.error && error instanceof Error) {
    errorResponse.error.message = googleSSOErrorHandler.getMessageWithGuidance(error);
  }

  const statusCode = error instanceof GoogleSSOError ? error.statusCode : 500;
  res.status(statusCode).json(errorResponse);
}

// ============================================================================
// Example 7: Using Singleton Instance
// ============================================================================

function usingSingleton() {
  // Get singleton instance
  const handler = getGoogleSSOErrorHandler();

  // Use instance methods
  const error = new GoogleSSOError(
    'Technical message',
    GoogleSSOErrorCode.INVALID_TOKEN,
    'User message',
    401
  );

  const formatted = handler.formatErrorResponse(error);
  const isRetryable = handler.isRetryableError(error);
  const isSecurityEvent = handler.isSecurityEvent(error);

  console.log('Formatted:', formatted);
  console.log('Retryable:', isRetryable);
  console.log('Security Event:', isSecurityEvent);
}

// ============================================================================
// Example 8: Development vs Production Behavior
// ============================================================================

function demonstrateEnvironmentBehavior() {
  const error = new GoogleSSOError(
    'Detailed technical error message with sensitive info',
    GoogleSSOErrorCode.INVALID_TOKEN,
    'Invalid authentication token. Please try again.',
    401
  );

  // In development (NODE_ENV=development):
  // - Error response includes technical details and stack trace
  // - Logs include full context and email addresses
  // - Stack traces are included in logs

  // In production (NODE_ENV=production):
  // - Error response only includes user-friendly message
  // - Logs exclude PII (email addresses)
  // - Stack traces are excluded from logs
  // - Only error code and user message are exposed

  const response = googleSSOErrorHandler.formatError(error);
  console.log('Response:', JSON.stringify(response, null, 2));
}

// ============================================================================
// Example 9: Error Response Format
// ============================================================================

function demonstrateErrorResponseFormat() {
  const error = new GoogleSSOError(
    'Token audience does not match client ID',
    GoogleSSOErrorCode.INVALID_TOKEN,
    'Invalid authentication token. Please try again.',
    401
  );

  const response = googleSSOErrorHandler.formatError(error);

  // Production response:
  // {
  //   "error": {
  //     "code": "INVALID_TOKEN",
  //     "message": "Invalid authentication token. Please try again."
  //   }
  // }

  // Development response:
  // {
  //   "error": {
  //     "code": "INVALID_TOKEN",
  //     "message": "Invalid authentication token. Please try again.",
  //     "details": {
  //       "technicalMessage": "Token audience does not match client ID",
  //       "stack": "Error: Token audience does not match client ID\n    at ..."
  //     }
  //   }
  // }

  console.log('Response:', JSON.stringify(response, null, 2));
}

// ============================================================================
// Example 10: Complete Route Handler with Best Practices
// ============================================================================

async function completeRouteHandler(req: Request, res: Response) {
  try {
    // 1. Validate input
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      throw googleSSOErrorHandler.createError(
        'Authorization code is missing or invalid',
        GoogleSSOErrorCode.INVALID_CODE,
        'Invalid authentication code. Please try again.',
        400,
        req,
        { code: code ? 'invalid_type' : 'missing' }
      );
    }

    // 2. Perform OAuth flow
    // ... your OAuth logic here ...

    // 3. Success response
    res.json({
      message: 'Authentication successful',
      token: 'jwt-token-here',
    });
  } catch (error) {
    // 4. Log error with context
    googleSSOErrorHandler.logError(error as Error, req, {
      endpoint: '/callback',
      action: 'oauth_callback',
      code: req.query.code ? 'present' : 'missing',
      state: req.query.state ? 'present' : 'missing',
    });

    // 5. Log to audit system for authentication failures
    if (error instanceof GoogleSSOError) {
      await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
        metadata: {
          provider: 'google',
          method: 'oauth_callback',
          errorCode: error.code,
        },
        success: false,
        errorMessage: error.message,
      });
    }

    // 6. Format error response with guidance
    const errorResponse = googleSSOErrorHandler.formatError(error as Error);
    if (errorResponse.error && error instanceof Error) {
      errorResponse.error.message = googleSSOErrorHandler.getMessageWithGuidance(error);
    }

    // 7. Send response with appropriate status code
    const statusCode = error instanceof GoogleSSOError ? error.statusCode : 500;
    res.status(statusCode).json(errorResponse);
  }
}

// Export examples for documentation
export {
  handleGoogleCallback,
  handleAuthError,
  handleErrorWithSeverity,
  handleAuthenticationError,
  usingSingleton,
  demonstrateEnvironmentBehavior,
  demonstrateErrorResponseFormat,
  completeRouteHandler,
};
