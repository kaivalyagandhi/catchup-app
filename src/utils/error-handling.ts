/**
 * Error Handling Utilities for External Services
 *
 * Provides retry logic, exponential backoff, and graceful error handling
 * for external service integrations (Google Calendar, SMS, Email, Transcription, NLP).
 */

/**
 * Error types for classification
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMIT = 'RATE_LIMIT',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [ErrorType.NETWORK, ErrorType.RATE_LIMIT, ErrorType.SERVER_ERROR],
};

/**
 * Classify error by type
 */
export function classifyError(error: any): ErrorType {
  // Network errors
  if (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNRESET'
  ) {
    return ErrorType.NETWORK;
  }

  // HTTP status codes
  const status = error.status || error.statusCode || error.code;

  if (status === 401 || status === 403) {
    return ErrorType.AUTHENTICATION;
  }

  if (status === 429) {
    return ErrorType.RATE_LIMIT;
  }

  if (status === 400 || status === 422) {
    return ErrorType.VALIDATION;
  }

  if (status === 404) {
    return ErrorType.NOT_FOUND;
  }

  if (status >= 500 && status < 600) {
    return ErrorType.SERVER_ERROR;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Check if error is retryable
 */
export function isRetryable(error: any, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  const errorType = classifyError(error);
  return config.retryableErrors.includes(errorType);
}

/**
 * Calculate delay for exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryable(error, config)) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateBackoffDelay(attempt, config);

      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Google Calendar specific error handling
 */
export class GoogleCalendarError extends Error {
  constructor(
    message: string,
    public originalError?: any,
    public errorType?: ErrorType
  ) {
    super(message);
    this.name = 'GoogleCalendarError';
  }
}

export async function handleGoogleCalendarError<T>(
  fn: () => Promise<T>,
  fallbackValue?: T
): Promise<T> {
  try {
    return await retryWithBackoff(fn, {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 2,
    });
  } catch (error: unknown) {
    const errorType = classifyError(error);

    // Log error for monitoring
    console.error('Google Calendar API error:', {
      type: errorType,
      message: error.message,
      stack: error.stack,
    });

    // If fallback value provided, return it
    if (fallbackValue !== undefined) {
      console.warn('Using fallback value for Google Calendar operation');
      return fallbackValue;
    }

    // Throw wrapped error
    throw new GoogleCalendarError(
      'Google Calendar operation failed',
      error,
      errorType
    );
  }
}

/**
 * SMS/Email delivery error handling
 */
export class NotificationDeliveryError extends Error {
  constructor(
    message: string,
    public channel: 'sms' | 'email',
    public originalError?: any,
    public errorType?: ErrorType
  ) {
    super(message);
    this.name = 'NotificationDeliveryError';
  }
}

export async function handleNotificationDelivery<T>(
  fn: () => Promise<T>,
  channel: 'sms' | 'email'
): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    const result = await retryWithBackoff(fn, {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 3,
    });

    return { success: true, result };
  } catch (error: unknown) {
    const errorType = classifyError(error);

    // Log error for monitoring
    console.error(`${channel.toUpperCase()} delivery error:`, {
      type: errorType,
      message: error.message,
    });

    return {
      success: false,
      error: `Failed to deliver ${channel}: ${error.message}`,
    };
  }
}

/**
 * Transcription service error handling
 */
export class TranscriptionError extends Error {
  constructor(
    message: string,
    public originalError?: any,
    public errorType?: ErrorType
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

export async function handleTranscription(
  fn: () => Promise<string>
): Promise<{ success: boolean; transcript?: string; error?: string }> {
  try {
    const transcript = await retryWithBackoff(fn, {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 2,
    });

    return { success: true, transcript };
  } catch (error: unknown) {
    const errorType = classifyError(error);

    // Log error for monitoring
    console.error('Transcription error:', {
      type: errorType,
      message: error.message,
    });

    return {
      success: false,
      error: 'Transcription failed. Please enter text manually.',
    };
  }
}

/**
 * NLP service error handling
 */
export class NLPError extends Error {
  constructor(
    message: string,
    public originalError?: any,
    public errorType?: ErrorType
  ) {
    super(message);
    this.name = 'NLPError';
  }
}

export async function handleNLPOperation<T>(
  fn: () => Promise<T>,
  fallbackValue?: T
): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    const result = await retryWithBackoff(fn, {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 2,
    });

    return { success: true, result };
  } catch (error: unknown) {
    const errorType = classifyError(error);

    // Log error for monitoring
    console.error('NLP operation error:', {
      type: errorType,
      message: error.message,
    });

    // If fallback value provided, return it
    if (fallbackValue !== undefined) {
      return { success: true, result: fallbackValue };
    }

    return {
      success: false,
      error: 'NLP operation failed. Please provide information manually.',
    };
  }
}

/**
 * Database error handling
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: any,
    public errorType?: ErrorType
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export async function handleDatabaseOperation<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await retryWithBackoff(
      fn,
      {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 2,
        retryableErrors: [ErrorType.NETWORK, ErrorType.SERVER_ERROR],
      },
      (attempt, error) => {
        console.warn(`Database operation retry attempt ${attempt}:`, error.message);
      }
    );
  } catch (error: unknown) {
    const errorType = classifyError(error);

    // Log error for monitoring
    console.error('Database operation error:', {
      type: errorType,
      message: error.message,
      stack: error.stack,
    });

    throw new DatabaseError('Database operation failed', error, errorType);
  }
}

/**
 * Circuit breaker pattern for external services
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;

      if (timeSinceLastFailure < this.resetTimeoutMs) {
        throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      }

      // Try to close circuit
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();

      // Success - reset circuit
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }

      return result;
    } catch (error: unknown) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        console.error('Circuit breaker opened due to repeated failures');
      }

      throw error;
    }
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }
}

/**
 * Create circuit breakers for external services
 */
export const circuitBreakers = {
  googleCalendar: new CircuitBreaker(5, 60000),
  sms: new CircuitBreaker(5, 60000),
  email: new CircuitBreaker(5, 60000),
  transcription: new CircuitBreaker(3, 120000),
  nlp: new CircuitBreaker(3, 120000),
};
