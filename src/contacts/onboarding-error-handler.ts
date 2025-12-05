/**
 * Onboarding Error Handler
 *
 * Centralized error handling for onboarding API calls.
 * Handles integration connection failures, AI service timeouts,
 * group mapping API errors, and provides retry mechanisms.
 *
 * Requirements: 13.4
 */

export interface ErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  showToast?: boolean;
}

export interface RetryableError {
  isRetryable: boolean;
  shouldShowRetry: boolean;
  userMessage: string;
  technicalMessage: string;
}

export class OnboardingErrorHandler {
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 2000;
  private static readonly DEFAULT_TIMEOUT = 30000;

  /**
   * Classify an error and determine if it's retryable
   * Requirements: 13.4
   */
  static classifyError(error: unknown): RetryableError {
    let errorMessage = 'An unknown error occurred';
    let isRetryable = false;
    let shouldShowRetry = false;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Network errors - retryable
      if (
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError')
      ) {
        return {
          isRetryable: true,
          shouldShowRetry: true,
          userMessage: 'Network connection issue. Please check your internet and try again.',
          technicalMessage: errorMessage,
        };
      }

      // Timeout errors - retryable
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        return {
          isRetryable: true,
          shouldShowRetry: true,
          userMessage: 'Request timed out. The server may be busy. Please try again.',
          technicalMessage: errorMessage,
        };
      }

      // HTTP 5xx errors - retryable
      if (errorMessage.includes('HTTP 5') || errorMessage.includes('500') || errorMessage.includes('503')) {
        return {
          isRetryable: true,
          shouldShowRetry: true,
          userMessage: 'Server error. Please try again in a moment.',
          technicalMessage: errorMessage,
        };
      }

      // HTTP 429 (rate limit) - retryable with delay
      if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        return {
          isRetryable: true,
          shouldShowRetry: true,
          userMessage: 'Too many requests. Please wait a moment and try again.',
          technicalMessage: errorMessage,
        };
      }

      // HTTP 401/403 - not retryable, auth issue
      if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
        return {
          isRetryable: false,
          shouldShowRetry: false,
          userMessage: 'Authentication failed. Please sign in again.',
          technicalMessage: errorMessage,
        };
      }

      // HTTP 404 - not retryable
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        return {
          isRetryable: false,
          shouldShowRetry: false,
          userMessage: 'Resource not found. Please refresh the page.',
          technicalMessage: errorMessage,
        };
      }

      // HTTP 400 - not retryable, bad request
      if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        return {
          isRetryable: false,
          shouldShowRetry: false,
          userMessage: 'Invalid request. Please check your input and try again.',
          technicalMessage: errorMessage,
        };
      }
    }

    // Default: not retryable
    return {
      isRetryable: false,
      shouldShowRetry: false,
      userMessage: 'An error occurred. Please try again or contact support.',
      technicalMessage: errorMessage,
    };
  }

  /**
   * Handle integration connection errors
   * Requirements: 13.4
   */
  static handleIntegrationError(integration: 'google-calendar' | 'google-contacts', error: unknown): RetryableError {
    const classified = this.classifyError(error);
    const integrationName = integration === 'google-calendar' ? 'Google Calendar' : 'Google Contacts';

    // Add integration-specific context
    if (error instanceof Error) {
      // OAuth/popup errors
      if (error.message.includes('popup') || error.message.includes('blocked')) {
        return {
          isRetryable: true,
          shouldShowRetry: true,
          userMessage: `${integrationName} connection failed. Please allow popups and try again.`,
          technicalMessage: error.message,
        };
      }

      // Permission errors
      if (error.message.includes('permission') || error.message.includes('scope')) {
        return {
          isRetryable: true,
          shouldShowRetry: true,
          userMessage: `${integrationName} connection failed. Please grant the required permissions.`,
          technicalMessage: error.message,
        };
      }

      // OAuth state mismatch
      if (error.message.includes('state') || error.message.includes('CSRF')) {
        return {
          isRetryable: true,
          shouldShowRetry: true,
          userMessage: `${integrationName} connection failed. Please try again.`,
          technicalMessage: error.message,
        };
      }
    }

    // Use classified error with integration context
    return {
      ...classified,
      userMessage: `${integrationName}: ${classified.userMessage}`,
    };
  }

  /**
   * Handle AI service errors (timeouts, failures)
   * Requirements: 13.4
   */
  static handleAIServiceError(error: unknown): RetryableError {
    const classified = this.classifyError(error);

    // AI service timeouts are common and should be handled gracefully
    if (classified.technicalMessage.includes('timeout')) {
      return {
        isRetryable: false, // Don't auto-retry AI, it's optional
        shouldShowRetry: false,
        userMessage: 'AI suggestions are temporarily unavailable. You can still organize contacts manually.',
        technicalMessage: classified.technicalMessage,
      };
    }

    // AI service failures should not block the user
    return {
      isRetryable: false,
      shouldShowRetry: false,
      userMessage: 'AI suggestions are temporarily unavailable. You can still organize contacts manually.',
      technicalMessage: classified.technicalMessage,
    };
  }

  /**
   * Handle group mapping API errors
   * Requirements: 13.4
   */
  static handleGroupMappingError(error: unknown): RetryableError {
    const classified = this.classifyError(error);

    // Add group mapping context
    return {
      ...classified,
      userMessage: `Group mapping: ${classified.userMessage}`,
    };
  }

  /**
   * Execute a function with retry logic
   * Requirements: 13.4
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const retryDelay = options.retryDelay ?? this.DEFAULT_RETRY_DELAY;
    const timeout = options.timeout ?? this.DEFAULT_TIMEOUT;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout wrapper
        const result = await this.withTimeout(fn(), timeout);
        return result;
      } catch (error) {
        lastError = error;
        const classified = this.classifyError(error);

        console.error(`Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);

        // If not retryable or last attempt, throw
        if (!classified.isRetryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Wrap a promise with a timeout
   */
  private static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Sleep for a specified duration
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Show error toast to user
   */
  static showErrorToast(error: RetryableError): void {
    if (typeof window !== 'undefined') {
      const showToast = (window as Window & { showToast?: (msg: string, type: string) => void }).showToast;
      if (typeof showToast === 'function') {
        showToast(error.userMessage, 'error');
      } else {
        console.error(error.userMessage);
      }
    }
  }

  /**
   * Show retry button in UI
   */
  static showRetryButton(
    containerId: string,
    retryCallback: () => void,
    error: RetryableError
  ): void {
    if (typeof document === 'undefined') return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Check if retry button already exists
    if (container.querySelector('.error-retry-btn')) return;

    const retrySection = document.createElement('div');
    retrySection.className = 'error-retry-section';
    retrySection.innerHTML = `
      <div class="error-message">${error.userMessage}</div>
      <button class="error-retry-btn btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; margin-right: 8px;">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        Retry
      </button>
    `;

    const retryBtn = retrySection.querySelector('.error-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        retrySection.remove();
        retryCallback();
      });
    }

    container.appendChild(retrySection);
  }
}

// Export convenience functions
export function classifyError(error: unknown): RetryableError {
  return OnboardingErrorHandler.classifyError(error);
}

export function handleIntegrationError(
  integration: 'google-calendar' | 'google-contacts',
  error: unknown
): RetryableError {
  return OnboardingErrorHandler.handleIntegrationError(integration, error);
}

export function handleAIServiceError(error: unknown): RetryableError {
  return OnboardingErrorHandler.handleAIServiceError(error);
}

export function handleGroupMappingError(error: unknown): RetryableError {
  return OnboardingErrorHandler.handleGroupMappingError(error);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: ErrorHandlerOptions
): Promise<T> {
  return OnboardingErrorHandler.withRetry(fn, options);
}
