/**
 * Error Handling Middleware
 *
 * Centralized error handling for API routes with proper logging,
 * status codes, and user-friendly error messages.
 */

import { Request, Response, NextFunction } from 'express';
import {
  OnboardingError,
  isOnboardingError,
  toErrorResponse,
} from '../../contacts/onboarding-errors';
import { ValidationError } from '../../contacts/onboarding-errors';
import { DatabaseError } from '../../utils/error-handling';
import { OptimisticLockError, ConcurrentUpdateError } from '../../utils/concurrency';

/**
 * Error logger
 */
function logError(error: any, req: Request): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    },
  };

  // Log to console (in production, this would go to a logging service)
  console.error('API Error:', JSON.stringify(errorInfo, null, 2));
}

/**
 * Sanitize error for client response
 * Removes sensitive information like stack traces in production
 */
function sanitizeError(error: any, includeStack: boolean = false): any {
  const sanitized: any = {
    error: error.message || 'An unexpected error occurred',
    code: error.code || 'INTERNAL_ERROR',
  };

  if (error.details) {
    sanitized.details = error.details;
  }

  if (includeStack && error.stack) {
    sanitized.stack = error.stack;
  }

  return sanitized;
}

/**
 * Main error handling middleware
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logError(error, req);

  // Determine if we should include stack traces (only in development)
  const includeStack = process.env.NODE_ENV === 'development';

  // Handle onboarding-specific errors
  if (isOnboardingError(error)) {
    const response = toErrorResponse(error);
    res.status(response.statusCode).json(sanitizeError(response, includeStack));
    return;
  }

  // Handle validation errors
  if (error instanceof ValidationError) {
    res.status(400).json({
      error: error.message,
      code: 'VALIDATION_ERROR',
      fieldErrors: error.fieldErrors,
    });
    return;
  }

  // Handle database errors
  if (error instanceof DatabaseError) {
    res.status(500).json({
      error: 'Database operation failed',
      code: 'DATABASE_ERROR',
      ...(includeStack && { details: error.message }),
    });
    return;
  }

  // Handle concurrency errors
  if (error instanceof OptimisticLockError || error instanceof ConcurrentUpdateError) {
    res.status(409).json({
      error: 'Resource was modified by another request. Please refresh and try again.',
      code: 'CONCURRENT_MODIFICATION',
      details: error.message,
    });
    return;
  }

  // Handle authentication errors
  if (error.name === 'UnauthorizedError' || error.statusCode === 401) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  // Handle forbidden errors
  if (error.statusCode === 403) {
    res.status(403).json({
      error: 'Access forbidden',
      code: 'FORBIDDEN',
    });
    return;
  }

  // Handle not found errors
  if (error.statusCode === 404) {
    res.status(404).json({
      error: error.message || 'Resource not found',
      code: 'NOT_FOUND',
    });
    return;
  }

  // Handle timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
    res.status(504).json({
      error: 'Request timeout. Please try again.',
      code: 'TIMEOUT',
    });
    return;
  }

  // Handle rate limit errors
  if (error.statusCode === 429) {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: error.retryAfter || 60,
    });
    return;
  }

  // Default error response
  res.status(error.statusCode || 500).json({
    error: includeStack
      ? error.message || 'Internal server error'
      : 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    ...(includeStack && { stack: error.stack }),
  });
}

/**
 * Async route handler wrapper
 * Catches async errors and passes them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
}

/**
 * Request timeout middleware
 */
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Request timeout',
          code: 'TIMEOUT',
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
}

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a validation function
 */
export function validateRequest(
  validationFn: (data: any) => { valid: boolean; errors: Record<string, string[]> }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validationFn(req.body);

    if (!result.valid) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        fieldErrors: result.errors,
      });
      return;
    }

    next();
  };
}

/**
 * Rate limiting error response
 */
export function rateLimitExceeded(req: Request, res: Response): void {
  res.status(429).json({
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60,
  });
}
