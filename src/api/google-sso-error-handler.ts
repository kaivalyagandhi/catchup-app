/**
 * Google SSO Error Handler
 *
 * Provides comprehensive error handling for Google SSO authentication:
 * - Error response formatting
 * - User-friendly error messages
 * - Detailed error logging
 * - Security-conscious error reporting
 */

import { Request, Response, NextFunction } from 'express';
import { GoogleSSOError, GoogleSSOErrorCode } from './google-sso-service';

/**
 * Error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any; // Only in development mode
  };
}

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  timestamp: Date;
  errorCode: string;
  message: string;
  userMessage: string;
  statusCode: number;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  stack?: string;
  context?: Record<string, any>;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW', // User errors (invalid input, etc.)
  MEDIUM = 'MEDIUM', // Recoverable errors (token expired, etc.)
  HIGH = 'HIGH', // System errors (config issues, API failures)
  CRITICAL = 'CRITICAL', // Security events (state mismatch, signature failures)
}

/**
 * Map error codes to severity levels
 */
const ERROR_SEVERITY_MAP: Record<GoogleSSOErrorCode, ErrorSeverity> = {
  [GoogleSSOErrorCode.INVALID_CONFIG]: ErrorSeverity.CRITICAL,
  [GoogleSSOErrorCode.INVALID_CODE]: ErrorSeverity.LOW,
  [GoogleSSOErrorCode.TOKEN_EXCHANGE_FAILED]: ErrorSeverity.MEDIUM,
  [GoogleSSOErrorCode.INVALID_TOKEN]: ErrorSeverity.MEDIUM,
  [GoogleSSOErrorCode.TOKEN_EXPIRED]: ErrorSeverity.LOW,
  [GoogleSSOErrorCode.STATE_MISMATCH]: ErrorSeverity.CRITICAL,
  [GoogleSSOErrorCode.USER_CREATION_FAILED]: ErrorSeverity.HIGH,
  [GoogleSSOErrorCode.EMAIL_CONFLICT]: ErrorSeverity.LOW,
  [GoogleSSOErrorCode.SIGNATURE_VERIFICATION_FAILED]: ErrorSeverity.CRITICAL,
};

/**
 * Google SSO Error Handler class
 */
export class GoogleSSOErrorHandler {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Format error response for API
   * @param error - Error to format
   * @param includeDetails - Whether to include detailed error information
   * @returns Formatted error response
   */
  formatErrorResponse(
    error: GoogleSSOError | Error,
    includeDetails: boolean = false
  ): ErrorResponse {
    if (error instanceof GoogleSSOError) {
      const response: ErrorResponse = {
        error: {
          code: error.code,
          message: error.userMessage,
        },
      };

      // Include details only in development mode or if explicitly requested
      if ((this.isDevelopment || includeDetails) && error.message !== error.userMessage) {
        response.error.details = {
          technicalMessage: error.message,
          stack: this.isDevelopment ? error.stack : undefined,
        };
      }

      return response;
    }

    // Handle non-GoogleSSOError errors
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        details: this.isDevelopment
          ? {
              technicalMessage: error.message,
              stack: error.stack,
            }
          : undefined,
      },
    };
  }

  /**
   * Log error with appropriate detail level
   * @param error - Error to log
   * @param req - Express request object (optional)
   * @param context - Additional context information
   */
  logError(
    error: GoogleSSOError | Error,
    req?: Request,
    context?: Record<string, any>
  ): ErrorLogEntry {
    // Extract user info from request if available (from authenticated requests)
    const reqWithUser = req as any;

    const logEntry: ErrorLogEntry = {
      timestamp: new Date(),
      errorCode: error instanceof GoogleSSOError ? error.code : 'INTERNAL_ERROR',
      message: error.message,
      userMessage: error instanceof GoogleSSOError ? error.userMessage : 'Internal error',
      statusCode: error instanceof GoogleSSOError ? error.statusCode : 500,
      userId: reqWithUser?.user?.id || reqWithUser?.userId,
      email: reqWithUser?.user?.email,
      ipAddress: this.getClientIp(req),
      userAgent: req?.headers['user-agent'],
      stack: error.stack,
      context,
    };

    const severity = this.getErrorSeverity(error);

    // Log based on severity
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        console.error('[CRITICAL] Google SSO Error:', this.sanitizeLogEntry(logEntry));
        // In production, this should trigger alerts
        break;

      case ErrorSeverity.HIGH:
        console.error('[HIGH] Google SSO Error:', this.sanitizeLogEntry(logEntry));
        break;

      case ErrorSeverity.MEDIUM:
        console.warn('[MEDIUM] Google SSO Error:', this.sanitizeLogEntry(logEntry));
        break;

      case ErrorSeverity.LOW:
        console.info('[LOW] Google SSO Error:', this.sanitizeLogEntry(logEntry));
        break;
    }

    // Write to audit log for security events and high-severity errors
    if (
      this.isSecurityEvent(error) ||
      severity === ErrorSeverity.HIGH ||
      severity === ErrorSeverity.CRITICAL
    ) {
      this.writeToAuditLog(logEntry).catch((auditError) => {
        console.error('Failed to write to audit log:', auditError);
      });
    }

    return logEntry;
  }

  /**
   * Write error to audit log table
   * @param logEntry - Error log entry to write
   */
  private async writeToAuditLog(logEntry: ErrorLogEntry): Promise<void> {
    try {
      const { logAuditEvent, AuditAction } = await import('../utils/audit-logger');

      // Determine the appropriate audit action
      let action: string;
      if (this.isSecurityEvent({ code: logEntry.errorCode } as GoogleSSOError)) {
        action = AuditAction.SUSPICIOUS_ACTIVITY;
      } else {
        action = AuditAction.FAILED_LOGIN_ATTEMPT;
      }

      await logAuditEvent(action as any, {
        userId: logEntry.userId,
        ipAddress: logEntry.ipAddress,
        userAgent: logEntry.userAgent,
        metadata: {
          provider: 'google',
          errorCode: logEntry.errorCode,
          errorMessage: logEntry.message,
          userMessage: logEntry.userMessage,
          statusCode: logEntry.statusCode,
          severity: this.getErrorSeverity({ code: logEntry.errorCode } as GoogleSSOError),
          context: logEntry.context,
        },
        success: false,
        errorMessage: logEntry.message,
      });
    } catch (error) {
      // Don't throw - audit logging should not break the application
      console.error('Failed to write to audit log:', error);
    }
  }

  /**
   * Get error severity level
   */
  private getErrorSeverity(error: GoogleSSOError | Error): ErrorSeverity {
    if (error instanceof GoogleSSOError) {
      return ERROR_SEVERITY_MAP[error.code] || ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.HIGH;
  }

  /**
   * Sanitize log entry to remove sensitive information
   */
  private sanitizeLogEntry(entry: ErrorLogEntry): Partial<ErrorLogEntry> {
    const sanitized: Partial<ErrorLogEntry> = {
      timestamp: entry.timestamp,
      errorCode: entry.errorCode,
      message: entry.message,
      userMessage: entry.userMessage,
      statusCode: entry.statusCode,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    };

    // Include stack trace only in development
    if (this.isDevelopment) {
      sanitized.stack = entry.stack;
      sanitized.context = entry.context;
    }

    // Never log email addresses in production logs (PII)
    if (this.isDevelopment && entry.email) {
      sanitized.email = entry.email;
    }

    return sanitized;
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req?: Request): string | undefined {
    if (!req) return undefined;

    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress
    );
  }

  /**
   * Express middleware for handling Google SSO errors
   */
  middleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      // Only handle Google SSO errors
      if (!(error instanceof GoogleSSOError)) {
        return next(error);
      }

      // Log the error
      this.logError(error, req);

      // Format and send error response
      const errorResponse = this.formatErrorResponse(error);
      res.status(error.statusCode).json(errorResponse);
    };
  }

  /**
   * Create a GoogleSSOError with automatic logging
   */
  createError(
    message: string,
    code: GoogleSSOErrorCode,
    userMessage: string,
    statusCode: number = 400,
    req?: Request,
    context?: Record<string, any>
  ): GoogleSSOError {
    const error = new GoogleSSOError(message, code, userMessage, statusCode);
    this.logError(error, req, context);
    return error;
  }

  /**
   * Check if error should be retried
   * @param error - Error to check
   * @returns True if error is retryable
   */
  isRetryableError(error: GoogleSSOError | Error): boolean {
    if (!(error instanceof GoogleSSOError)) {
      return false;
    }

    // These errors are retryable
    const retryableErrors = [
      GoogleSSOErrorCode.TOKEN_EXCHANGE_FAILED,
      GoogleSSOErrorCode.TOKEN_EXPIRED,
    ];

    return retryableErrors.includes(error.code);
  }

  /**
   * Check if error is a security event
   * @param error - Error to check
   * @returns True if error is a security event
   */
  isSecurityEvent(error: GoogleSSOError | Error): boolean {
    if (!(error instanceof GoogleSSOError)) {
      return false;
    }

    const securityErrors = [
      GoogleSSOErrorCode.STATE_MISMATCH,
      GoogleSSOErrorCode.SIGNATURE_VERIFICATION_FAILED,
      GoogleSSOErrorCode.INVALID_TOKEN,
    ];

    return securityErrors.includes(error.code);
  }

  /**
   * Get user-friendly error message with retry guidance
   */
  getErrorMessageWithGuidance(error: GoogleSSOError | Error): string {
    if (!(error instanceof GoogleSSOError)) {
      return 'An unexpected error occurred. Please try again later.';
    }

    let message = error.userMessage;

    // Add retry guidance for retryable errors
    if (this.isRetryableError(error)) {
      message += ' If the problem persists, please contact support.';
    }

    // Add security guidance for security events
    if (this.isSecurityEvent(error)) {
      message += ' For your security, please start the authentication process again.';
    }

    return message;
  }
}

// Export singleton instance
let _errorHandler: GoogleSSOErrorHandler | null = null;

export function getGoogleSSOErrorHandler(): GoogleSSOErrorHandler {
  if (!_errorHandler) {
    _errorHandler = new GoogleSSOErrorHandler();
  }
  return _errorHandler;
}

// Export convenience functions
export const googleSSOErrorHandler = {
  get instance(): GoogleSSOErrorHandler {
    return getGoogleSSOErrorHandler();
  },

  formatError(error: GoogleSSOError | Error): ErrorResponse {
    return getGoogleSSOErrorHandler().formatErrorResponse(error);
  },

  logError(
    error: GoogleSSOError | Error,
    req?: Request,
    context?: Record<string, any>
  ): ErrorLogEntry {
    return getGoogleSSOErrorHandler().logError(error, req, context);
  },

  middleware() {
    return getGoogleSSOErrorHandler().middleware();
  },

  createError(
    message: string,
    code: GoogleSSOErrorCode,
    userMessage: string,
    statusCode?: number,
    req?: Request,
    context?: Record<string, any>
  ): GoogleSSOError {
    return getGoogleSSOErrorHandler().createError(
      message,
      code,
      userMessage,
      statusCode,
      req,
      context
    );
  },

  isRetryable(error: GoogleSSOError | Error): boolean {
    return getGoogleSSOErrorHandler().isRetryableError(error);
  },

  isSecurityEvent(error: GoogleSSOError | Error): boolean {
    return getGoogleSSOErrorHandler().isSecurityEvent(error);
  },

  getMessageWithGuidance(error: GoogleSSOError | Error): string {
    return getGoogleSSOErrorHandler().getErrorMessageWithGuidance(error);
  },
};
