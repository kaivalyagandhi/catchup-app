import { checkRateLimit, RateLimitConfig } from '../utils/rate-limiter';

/**
 * Google Contacts API Rate Limiter
 *
 * Implements rate limiting for Google Contacts API requests with:
 * - 500 requests per minute per user (sliding window)
 * - Exponential backoff for 429 errors
 * - Request throttling and queuing
 *
 * Requirements: 9.1, 9.2, 9.3
 */
export class GoogleContactsRateLimiter {
  private retryCount: Map<string, number> = new Map();
  private lastRetryTime: Map<string, number> = new Map();
  private requestQueue: Map<string, Array<() => void>> = new Map();
  private processingQueue: Map<string, boolean> = new Map();

  private readonly config: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 500, // 500 requests per minute
    keyPrefix: 'ratelimit:google-contacts',
  };

  /**
   * Execute a request with rate limiting
   *
   * This method enforces the 500 requests/minute limit and handles
   * rate limit errors with exponential backoff.
   */
  async executeRequest<T>(userId: string, request: () => Promise<T>): Promise<T> {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(userId, this.config);

    if (!rateLimitResult.allowed) {
      // Queue the request if rate limit exceeded
      await this.waitForSlot(userId, rateLimitResult.retryAfter || 60);

      // Retry after waiting
      return this.executeRequest(userId, request);
    }

    try {
      // Reset retry count on successful rate limit check
      this.retryCount.delete(userId);

      // Execute the request
      const result = await request();

      return result;
    } catch (error: any) {
      // Handle 429 rate limit errors from Google API
      if (this.isRateLimitError(error)) {
        await this.handleRateLimitError(userId);

        // Retry the request after backoff
        return this.executeRequest(userId, request);
      }

      // Re-throw non-rate-limit errors
      throw error;
    }
  }

  /**
   * Check if a request can be made now
   */
  async canMakeRequest(userId: string): Promise<boolean> {
    const result = await checkRateLimit(userId, this.config);
    return result.allowed;
  }

  /**
   * Wait for an available slot in the rate limit window
   */
  private async waitForSlot(userId: string, retryAfter: number): Promise<void> {
    const waitMs = retryAfter * 1000;

    console.log(`Rate limit reached for user ${userId}. Waiting ${retryAfter}s before retry.`);

    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  /**
   * Handle rate limit error with exponential backoff
   *
   * Implements exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
   */
  async handleRateLimitError(userId: string): Promise<void> {
    const retryCount = this.retryCount.get(userId) || 0;

    // Calculate exponential backoff: 2^retryCount seconds, max 30s
    const backoffSeconds = Math.min(Math.pow(2, retryCount), 30);
    const backoffMs = backoffSeconds * 1000;

    console.log(
      `Google Contacts API rate limit (429) for user ${userId}. ` +
        `Retry ${retryCount + 1}, backing off for ${backoffSeconds}s`
    );

    // Increment retry count
    this.retryCount.set(userId, retryCount + 1);
    this.lastRetryTime.set(userId, Date.now());

    // Wait for backoff period
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  /**
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    // Check for HTTP 429 status
    if (error.code === 429 || error.status === 429) {
      return true;
    }

    // Check for rate limit in error message
    if (error.message && typeof error.message === 'string') {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate limit') ||
        message.includes('quota exceeded') ||
        message.includes('too many requests')
      );
    }

    // Check for Google API specific error structure
    if (error.errors && Array.isArray(error.errors)) {
      return error.errors.some(
        (e: any) => e.reason === 'rateLimitExceeded' || e.reason === 'quotaExceeded'
      );
    }

    return false;
  }

  /**
   * Reset retry count for a user
   *
   * Useful for testing or when starting a new sync operation
   */
  reset(userId: string): void {
    this.retryCount.delete(userId);
    this.lastRetryTime.delete(userId);
    this.requestQueue.delete(userId);
    this.processingQueue.delete(userId);
  }

  /**
   * Get current retry count for a user
   */
  getRetryCount(userId: string): number {
    return this.retryCount.get(userId) || 0;
  }

  /**
   * Get rate limit configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const googleContactsRateLimiter = new GoogleContactsRateLimiter();
