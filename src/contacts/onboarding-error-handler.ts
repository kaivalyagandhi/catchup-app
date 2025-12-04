/**
 * Onboarding Service Error Handling Wrapper
 *
 * Provides error handling, retry logic, and graceful degradation
 * for onboarding service operations.
 */

import {
  OnboardingError,
  InvalidOnboardingStateError,
  OnboardingNotFoundError,
  ContactNotFoundError,
  CircleAssignmentError,
  AISuggestionError,
  ConcurrentModificationError,
} from './onboarding-errors';
import {
  retryWithBackoff,
  DEFAULT_RETRY_CONFIG,
  handleDatabaseOperation,
  circuitBreakers,
} from '../utils/error-handling';
import { updateWithOptimisticLock, OptimisticLockError } from '../utils/concurrency';

/**
 * Wrap onboarding operation with error handling
 */
export async function withOnboardingErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallbackValue?: T
): Promise<T> {
  try {
    return await handleDatabaseOperation(operation);
  } catch (error: any) {
    console.error(`Onboarding operation failed: ${operationName}`, {
      error: error.message,
      stack: error.stack,
    });

    // If fallback value provided, return it
    if (fallbackValue !== undefined) {
      console.warn(`Using fallback value for ${operationName}`);
      return fallbackValue;
    }

    // Re-throw onboarding errors as-is
    if (error instanceof OnboardingError) {
      throw error;
    }

    // Wrap other errors
    throw new OnboardingError(`Operation failed: ${operationName}`, 'OPERATION_FAILED', 500, {
      originalError: error.message,
    });
  }
}

/**
 * Wrap AI suggestion operation with graceful degradation
 */
export async function withAISuggestionHandling<T>(
  operation: () => Promise<T>,
  fallbackValue?: T
): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    // Use circuit breaker for AI service
    const result = await circuitBreakers.nlp.execute(async () => {
      return await retryWithBackoff(operation, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 2,
      });
    });

    return { success: true, result };
  } catch (error: any) {
    console.error('AI suggestion operation failed:', {
      error: error.message,
      circuitState: circuitBreakers.nlp.getState(),
    });

    // If fallback value provided, return it
    if (fallbackValue !== undefined) {
      return { success: true, result: fallbackValue };
    }

    return {
      success: false,
      error: 'AI suggestions temporarily unavailable. Please assign circles manually.',
    };
  }
}

/**
 * Wrap concurrent modification with retry logic
 */
export async function withConcurrencyHandling<T>(
  operation: (version?: number) => Promise<T>,
  resourceType: string,
  resourceId: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Only retry on optimistic lock errors
      if (error instanceof OptimisticLockError) {
        console.warn(
          `Concurrent modification detected, retry attempt ${attempt + 1}/${maxRetries}`,
          { resourceType, resourceId }
        );

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
        continue;
      }

      // Don't retry other errors
      throw error;
    }
  }

  // Max retries exceeded
  throw new ConcurrentModificationError(resourceType, resourceId, {
    attempts: maxRetries,
    lastError: lastError.message,
  });
}

/**
 * Validate and execute operation
 */
export async function validateAndExecute<T>(
  validationFn: () => void,
  operation: () => Promise<T>
): Promise<T> {
  // Run validation
  validationFn();

  // Execute operation with error handling
  return await withOnboardingErrorHandling(operation, 'validated operation');
}

/**
 * Batch operation with partial success handling
 */
export async function executeBatchOperation<TInput, TResult>(
  items: TInput[],
  operation: (item: TInput) => Promise<TResult>,
  options: {
    continueOnError?: boolean;
    maxConcurrent?: number;
  } = {}
): Promise<{
  successful: Array<{ item: TInput; result: TResult }>;
  failed: Array<{ item: TInput; error: string }>;
}> {
  const { continueOnError = true, maxConcurrent = 10 } = options;

  const successful: Array<{ item: TInput; result: TResult }> = [];
  const failed: Array<{ item: TInput; error: string }> = [];

  // Process in batches to limit concurrency
  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);

    const results = await Promise.allSettled(
      batch.map(async (item) => {
        try {
          const result = await operation(item);
          return { item, result };
        } catch (error: any) {
          if (!continueOnError) {
            throw error;
          }
          return {
            item,
            error: error.message || 'Operation failed',
          };
        }
      })
    );

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const value = result.value;
        if ('error' in value) {
          failed.push(value as { item: TInput; error: string });
        } else {
          successful.push(value as { item: TInput; result: TResult });
        }
      } else {
        // This shouldn't happen if continueOnError is true
        failed.push({
          item: batch[results.indexOf(result)],
          error: result.reason?.message || 'Unknown error',
        });
      }
    });
  }

  return { successful, failed };
}

/**
 * Timeout wrapper for operations
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new OnboardingError(`Operation timeout: ${operationName}`, 'TIMEOUT', 504, {
              timeoutMs,
            })
          ),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Log operation for monitoring
 */
export function logOperation(operationName: string, userId: string, details?: any): void {
  console.log('Onboarding operation:', {
    timestamp: new Date().toISOString(),
    operation: operationName,
    userId,
    ...details,
  });
}

/**
 * Log error for monitoring
 */
export function logOperationError(
  operationName: string,
  userId: string,
  error: any,
  details?: any
): void {
  console.error('Onboarding operation error:', {
    timestamp: new Date().toISOString(),
    operation: operationName,
    userId,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    },
    ...details,
  });
}

/**
 * Measure operation performance
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ result: T; durationMs: number }> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const durationMs = Date.now() - startTime;

    console.log(`Performance: ${operationName}`, {
      durationMs,
      timestamp: new Date().toISOString(),
    });

    return { result, durationMs };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    console.error(`Performance (failed): ${operationName}`, {
      durationMs,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}
