/**
 * SMS/MMS Error Handler
 *
 * Comprehensive error handling for SMS/MMS enrichment processing
 * with classification, retry logic, logging, and user notifications.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import { logAuditEvent, AuditAction } from '../utils/audit-logger';
import pool from '../db/connection';

/**
 * Error classification for SMS/MMS processing
 *
 * Requirement 9.1: Error classification
 */
export enum SMSErrorType {
  // Recoverable errors (will retry)
  NETWORK_TIMEOUT = 'network_timeout',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  RATE_LIMIT_EXTERNAL = 'rate_limit_external',
  DATABASE_CONNECTION = 'database_connection',
  TEMPORARY_FAILURE = 'temporary_failure',

  // Unrecoverable errors (fail immediately)
  INVALID_CREDENTIALS = 'invalid_credentials',
  MALFORMED_MEDIA = 'malformed_media',
  UNSUPPORTED_MEDIA_TYPE = 'unsupported_media_type',
  QUOTA_EXCEEDED = 'quota_exceeded',
  AUTHENTICATION_FAILED = 'authentication_failed',
  INVALID_PHONE_NUMBER = 'invalid_phone_number',
  MEDIA_SIZE_EXCEEDED = 'media_size_exceeded',
  PERMISSION_DENIED = 'permission_denied',
}

/**
 * Error context for comprehensive logging
 *
 * Requirement 9.1: Log errors with context
 */
export interface ErrorContext {
  userId: string;
  phoneNumber?: string;
  messageSid?: string;
  messageType?: 'sms' | 'mms';
  contentType?: 'text' | 'audio' | 'image' | 'video';
  mediaUrl?: string;
  attemptNumber?: number;
  timestamp: Date;
  errorDetails?: any;
}

/**
 * Retry configuration
 *
 * Requirement 9.2: Retry up to 3 times with exponential backoff
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * SMS/MMS specific error class
 */
export class SMSProcessingError extends Error {
  constructor(
    message: string,
    public errorType: SMSErrorType,
    public context: ErrorContext,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'SMSProcessingError';
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(): boolean {
    return isRecoverableError(this.errorType);
  }
}

/**
 * Check if error type is recoverable
 *
 * Requirement 9.2: Classify errors as recoverable vs unrecoverable
 */
export function isRecoverableError(errorType: SMSErrorType): boolean {
  const recoverableErrors = [
    SMSErrorType.NETWORK_TIMEOUT,
    SMSErrorType.SERVICE_UNAVAILABLE,
    SMSErrorType.RATE_LIMIT_EXTERNAL,
    SMSErrorType.DATABASE_CONNECTION,
    SMSErrorType.TEMPORARY_FAILURE,
  ];

  return recoverableErrors.includes(errorType);
}

/**
 * Classify error from exception
 *
 * Requirement 9.1: Error classification
 */
export function classifyError(error: any): SMSErrorType {
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';

  // Network errors
  if (
    code === 'econnrefused' ||
    code === 'enotfound' ||
    code === 'etimedout' ||
    code === 'econnreset' ||
    message.includes('timeout') ||
    message.includes('network')
  ) {
    return SMSErrorType.NETWORK_TIMEOUT;
  }

  // Service unavailable
  if (
    error.status === 503 ||
    error.statusCode === 503 ||
    message.includes('service unavailable') ||
    message.includes('temporarily unavailable')
  ) {
    return SMSErrorType.SERVICE_UNAVAILABLE;
  }

  // Rate limiting from external services
  if (
    error.status === 429 ||
    error.statusCode === 429 ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return SMSErrorType.RATE_LIMIT_EXTERNAL;
  }

  // Database connection issues
  if (
    message.includes('database') ||
    message.includes('connection pool') ||
    code.includes('econnrefused')
  ) {
    return SMSErrorType.DATABASE_CONNECTION;
  }

  // Authentication failures
  if (
    error.status === 401 ||
    error.statusCode === 401 ||
    error.status === 403 ||
    error.statusCode === 403 ||
    message.includes('authentication failed') ||
    message.includes('invalid credentials') ||
    message.includes('unauthorized')
  ) {
    return SMSErrorType.AUTHENTICATION_FAILED;
  }

  // Malformed media
  if (
    message.includes('malformed') ||
    message.includes('corrupt') ||
    message.includes('invalid format')
  ) {
    return SMSErrorType.MALFORMED_MEDIA;
  }

  // Unsupported media type
  if (
    message.includes('unsupported') ||
    message.includes('not supported') ||
    message.includes('invalid media type')
  ) {
    return SMSErrorType.UNSUPPORTED_MEDIA_TYPE;
  }

  // Quota exceeded
  if (
    message.includes('quota exceeded') ||
    message.includes('limit exceeded') ||
    message.includes('over quota')
  ) {
    return SMSErrorType.QUOTA_EXCEEDED;
  }

  // Media size exceeded
  if (
    message.includes('file size') ||
    message.includes('exceeds.*limit') ||
    message.includes('too large')
  ) {
    return SMSErrorType.MEDIA_SIZE_EXCEEDED;
  }

  // Invalid phone number
  if (message.includes('invalid phone') || message.includes('invalid number')) {
    return SMSErrorType.INVALID_PHONE_NUMBER;
  }

  // Permission denied
  if (message.includes('permission denied') || message.includes('access denied')) {
    return SMSErrorType.PERMISSION_DENIED;
  }

  // Default to temporary failure (recoverable)
  return SMSErrorType.TEMPORARY_FAILURE;
}

/**
 * Calculate exponential backoff delay
 *
 * Requirement 9.2: Exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Log error with comprehensive context
 *
 * Requirement 9.1: Log errors with context including user ID, message type, and error details
 */
export async function logErrorWithContext(
  error: SMSProcessingError | Error,
  context: ErrorContext
): Promise<void> {
  const errorType = error instanceof SMSProcessingError ? error.errorType : classifyError(error);

  const logEntry = {
    timestamp: context.timestamp,
    userId: context.userId,
    phoneNumber: context.phoneNumber,
    messageSid: context.messageSid,
    messageType: context.messageType,
    contentType: context.contentType,
    mediaUrl: context.mediaUrl,
    attemptNumber: context.attemptNumber,
    errorType,
    errorMessage: error.message,
    errorStack: error.stack,
    errorDetails: context.errorDetails,
    recoverable: isRecoverableError(errorType),
  };

  // Log to console with full context
  console.error('SMS/MMS Processing Error:', JSON.stringify(logEntry, null, 2));

  // Store in database for monitoring
  try {
    await pool.query(
      `INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id,
        metadata, success, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        context.userId,
        'sms_processing_error',
        context.messageType || 'sms',
        context.messageSid || null,
        JSON.stringify({
          phoneNumber: context.phoneNumber,
          contentType: context.contentType,
          errorType,
          attemptNumber: context.attemptNumber,
          recoverable: isRecoverableError(errorType),
        }),
        false,
        error.message,
      ]
    );
  } catch (dbError) {
    // Don't throw if audit logging fails
    console.error('Failed to log error to database:', dbError);
  }

  // Log security events for specific error types
  if (
    errorType === SMSErrorType.AUTHENTICATION_FAILED ||
    errorType === SMSErrorType.PERMISSION_DENIED ||
    errorType === SMSErrorType.INVALID_PHONE_NUMBER
  ) {
    await logAuditEvent(AuditAction.SUSPICIOUS_ACTIVITY, {
      userId: context.userId,
      metadata: {
        errorType,
        phoneNumber: context.phoneNumber,
        messageSid: context.messageSid,
      },
      success: false,
      errorMessage: error.message,
    });
  }
}

/**
 * Retry function with exponential backoff
 *
 * Requirement 9.2: Retry logic with exponential backoff (max 3 attempts)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  context: ErrorContext,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      // Update context with current attempt
      context.attemptNumber = attempt + 1;
      context.timestamp = new Date();

      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorType = classifyError(error);

      // Create SMS processing error
      const smsError = new SMSProcessingError(lastError.message, errorType, context, lastError);

      // Log error with context
      await logErrorWithContext(smsError, context);

      // Check if error is unrecoverable
      if (!isRecoverableError(errorType)) {
        // Requirement 9.4: Unrecoverable errors fail immediately
        console.error(
          `Unrecoverable error for message ${context.messageSid}, not retrying:`,
          errorType
        );
        throw smsError;
      }

      // Check if this was the last attempt
      if (attempt === config.maxAttempts - 1) {
        // Requirement 9.3: All retries exhausted
        console.error(
          `All ${config.maxAttempts} retry attempts exhausted for message ${context.messageSid}`
        );
        throw smsError;
      }

      // Calculate backoff delay
      const delay = calculateBackoffDelay(attempt, config);

      console.warn(
        `Recoverable error (${errorType}) for message ${context.messageSid}, ` +
          `retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxAttempts})`
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry logic failed unexpectedly');
}

/**
 * Send user notification for processing failure
 *
 * Requirement 9.3: Notify user after all retries fail
 * Requirement 9.4: Notify user immediately for unrecoverable errors
 */
export async function notifyUserOfFailure(
  userId: string,
  phoneNumber: string,
  errorType: SMSErrorType,
  context: ErrorContext
): Promise<void> {
  // Generate user-friendly error message
  const userMessage = getUserFriendlyErrorMessage(errorType);

  console.log(`Notifying user ${userId} of processing failure:`, userMessage);

  // Store notification in database (to be sent via SMS)
  try {
    await pool.query(
      `INSERT INTO notification_queue (
        user_id, channel, recipient, message, metadata
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'sms',
        phoneNumber,
        userMessage,
        JSON.stringify({
          errorType,
          messageSid: context.messageSid,
          timestamp: context.timestamp,
        }),
      ]
    );

    console.log(`Queued failure notification for user ${userId}`);
  } catch (error) {
    console.error('Failed to queue user notification:', error);
    // Don't throw - notification failure shouldn't break the flow
  }
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyErrorMessage(errorType: SMSErrorType): string {
  const messages: Record<SMSErrorType, string> = {
    [SMSErrorType.NETWORK_TIMEOUT]:
      "We couldn't process your message due to a network issue. Please try again.",
    [SMSErrorType.SERVICE_UNAVAILABLE]:
      'Our service is temporarily unavailable. Please try again in a few minutes.',
    [SMSErrorType.RATE_LIMIT_EXTERNAL]: "We're experiencing high demand. Please try again shortly.",
    [SMSErrorType.DATABASE_CONNECTION]:
      "We're experiencing technical difficulties. Please try again later.",
    [SMSErrorType.TEMPORARY_FAILURE]: "We couldn't process your message. Please try again.",
    [SMSErrorType.INVALID_CREDENTIALS]: "There's a configuration issue. Please contact support.",
    [SMSErrorType.MALFORMED_MEDIA]:
      "We couldn't process your media file. Please ensure it's a valid audio, image, or video file.",
    [SMSErrorType.UNSUPPORTED_MEDIA_TYPE]:
      "This media type isn't supported. Please send text, voice notes, images, or videos.",
    [SMSErrorType.QUOTA_EXCEEDED]:
      "You've reached your processing limit. Please try again later or contact support.",
    [SMSErrorType.AUTHENTICATION_FAILED]:
      'Authentication failed. Please verify your phone number in the web app.',
    [SMSErrorType.INVALID_PHONE_NUMBER]:
      "This phone number isn't linked to a CatchUp account. Visit the web app to link it.",
    [SMSErrorType.MEDIA_SIZE_EXCEEDED]:
      'Your file is too large (max 5MB). Please send a smaller file.',
    [SMSErrorType.PERMISSION_DENIED]: 'Permission denied. Please contact support.',
  };

  return messages[errorType] || "We couldn't process your message. Please try again later.";
}

/**
 * Process message with comprehensive error handling
 *
 * Combines retry logic, error logging, and user notifications
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */
export async function processWithErrorHandling<T>(
  fn: () => Promise<T>,
  context: ErrorContext,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{ success: boolean; result?: T; error?: SMSProcessingError }> {
  try {
    // Attempt processing with retry logic
    const result = await retryWithBackoff(fn, context, config);

    return { success: true, result };
  } catch (error) {
    const smsError =
      error instanceof SMSProcessingError
        ? error
        : new SMSProcessingError(
            (error as Error).message,
            classifyError(error),
            context,
            error as Error
          );

    // Notify user of failure
    // Requirement 9.3: Notify after all retries fail
    // Requirement 9.4: Notify immediately for unrecoverable errors
    if (context.phoneNumber) {
      await notifyUserOfFailure(context.userId, context.phoneNumber, smsError.errorType, context);
    }

    return { success: false, error: smsError };
  }
}

/**
 * Wrap existing message processor with error handling
 */
export function wrapWithErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  contextBuilder: (...args: T) => ErrorContext
): (...args: T) => Promise<{ success: boolean; result?: R; error?: SMSProcessingError }> {
  return async (...args: T) => {
    const context = contextBuilder(...args);
    return processWithErrorHandling(() => fn(...args), context);
  };
}
