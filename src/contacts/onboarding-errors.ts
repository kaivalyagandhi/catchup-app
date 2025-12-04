/**
 * Onboarding-specific Error Classes
 *
 * Provides specialized error types for contact onboarding operations
 * with detailed error information for debugging and user feedback.
 */

import { ErrorType } from '../utils/error-handling';

/**
 * Base onboarding error class
 */
export class OnboardingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'OnboardingError';
  }
}

/**
 * Invalid onboarding state error
 */
export class InvalidOnboardingStateError extends OnboardingError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_ONBOARDING_STATE', 400, details);
    this.name = 'InvalidOnboardingStateError';
  }
}

/**
 * Circle assignment error
 */
export class CircleAssignmentError extends OnboardingError {
  constructor(message: string, details?: any) {
    super(message, 'CIRCLE_ASSIGNMENT_ERROR', 400, details);
    this.name = 'CircleAssignmentError';
  }
}

/**
 * Circle capacity exceeded error
 */
export class CircleCapacityError extends OnboardingError {
  constructor(circle: string, currentSize: number, maxSize: number, details?: any) {
    super(
      `Circle "${circle}" is at capacity (${currentSize}/${maxSize})`,
      'CIRCLE_CAPACITY_EXCEEDED',
      400,
      { circle, currentSize, maxSize, ...details }
    );
    this.name = 'CircleCapacityError';
  }
}

/**
 * Invalid circle name error
 */
export class InvalidCircleError extends OnboardingError {
  constructor(circle: string, validCircles: string[]) {
    super(
      `Invalid circle "${circle}". Must be one of: ${validCircles.join(', ')}`,
      'INVALID_CIRCLE',
      400,
      { circle, validCircles }
    );
    this.name = 'InvalidCircleError';
  }
}

/**
 * Contact not found error
 */
export class ContactNotFoundError extends OnboardingError {
  constructor(contactId: string) {
    super(`Contact not found: ${contactId}`, 'CONTACT_NOT_FOUND', 404, { contactId });
    this.name = 'ContactNotFoundError';
  }
}

/**
 * Unauthorized contact access error
 */
export class UnauthorizedContactAccessError extends OnboardingError {
  constructor(contactId: string, userId: string) {
    super(
      `User ${userId} is not authorized to access contact ${contactId}`,
      'UNAUTHORIZED_CONTACT_ACCESS',
      403,
      { contactId, userId }
    );
    this.name = 'UnauthorizedContactAccessError';
  }
}

/**
 * Batch operation error
 */
export class BatchOperationError extends OnboardingError {
  constructor(
    message: string,
    public failedItems: Array<{ id: string; error: string }>,
    details?: any
  ) {
    super(message, 'BATCH_OPERATION_ERROR', 400, {
      failedItems,
      ...details,
    });
    this.name = 'BatchOperationError';
  }
}

/**
 * AI suggestion service error
 */
export class AISuggestionError extends OnboardingError {
  constructor(message: string, details?: any) {
    super(message, 'AI_SUGGESTION_ERROR', 503, details);
    this.name = 'AISuggestionError';
  }
}

/**
 * Onboarding not found error
 */
export class OnboardingNotFoundError extends OnboardingError {
  constructor(userId: string) {
    super(`No onboarding state found for user ${userId}`, 'ONBOARDING_NOT_FOUND', 404, { userId });
    this.name = 'OnboardingNotFoundError';
  }
}

/**
 * Concurrent modification error
 */
export class ConcurrentModificationError extends OnboardingError {
  constructor(resourceType: string, resourceId: string, details?: any) {
    super(
      `Concurrent modification detected for ${resourceType} ${resourceId}`,
      'CONCURRENT_MODIFICATION',
      409,
      { resourceType, resourceId, ...details }
    );
    this.name = 'ConcurrentModificationError';
  }
}

/**
 * Validation error with field-specific errors
 */
export class ValidationError extends OnboardingError {
  constructor(
    message: string,
    public fieldErrors: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400, { fieldErrors });
    this.name = 'ValidationError';
  }
}

/**
 * Weekly catchup error
 */
export class WeeklyCatchupError extends OnboardingError {
  constructor(message: string, details?: any) {
    super(message, 'WEEKLY_CATCHUP_ERROR', 400, details);
    this.name = 'WeeklyCatchupError';
  }
}

/**
 * Achievement error
 */
export class AchievementError extends OnboardingError {
  constructor(message: string, details?: any) {
    super(message, 'ACHIEVEMENT_ERROR', 400, details);
    this.name = 'AchievementError';
  }
}

/**
 * Preference error
 */
export class PreferenceError extends OnboardingError {
  constructor(message: string, details?: any) {
    super(message, 'PREFERENCE_ERROR', 400, details);
    this.name = 'PreferenceError';
  }
}

/**
 * Check if error is an onboarding error
 */
export function isOnboardingError(error: any): error is OnboardingError {
  return error instanceof OnboardingError;
}

/**
 * Convert error to user-friendly message
 */
export function getErrorMessage(error: any): string {
  if (isOnboardingError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Convert error to API response format
 */
export function toErrorResponse(error: any): {
  error: string;
  code: string;
  details?: any;
  statusCode: number;
} {
  if (isOnboardingError(error)) {
    return {
      error: error.message,
      code: error.code,
      details: error.details,
      statusCode: error.statusCode,
    };
  }

  // Default error response
  return {
    error: error instanceof Error ? error.message : 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  };
}
