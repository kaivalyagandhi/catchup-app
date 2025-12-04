/**
 * SMS Rate Limiter Usage Examples
 * 
 * This file demonstrates how to use the SMS rate limiter in the webhook handler
 * and other parts of the SMS/MMS enrichment system.
 */

import {
  checkSMSRateLimit,
  incrementSMSCounter,
  getRemainingQuota,
  getSMSRateLimitStatus,
  resetSMSRateLimit,
} from './sms-rate-limiter';

/**
 * Example 1: Basic rate limit check in webhook handler
 */
export async function handleIncomingSMS(phoneNumber: string, messageBody: string) {
  // Check if the phone number has exceeded the rate limit
  const rateLimitResult = await checkSMSRateLimit(phoneNumber);

  if (!rateLimitResult.allowed) {
    console.log(`Rate limit exceeded for ${phoneNumber}`);
    console.log(`Retry after: ${rateLimitResult.retryAfter} seconds`);
    console.log(`Reset at: ${rateLimitResult.resetAt}`);

    // Return error response to user
    return {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `You've reached the limit of ${rateLimitResult.limit} messages per hour. Try again in ${rateLimitResult.retryAfter} seconds.`,
      retryAfter: rateLimitResult.retryAfter,
      resetAt: rateLimitResult.resetAt,
    };
  }

  // Process the message
  console.log(`Processing message from ${phoneNumber}: ${messageBody}`);

  // Increment the counter after successful processing
  await incrementSMSCounter(phoneNumber);

  return {
    success: true,
    message: 'Message processed successfully',
    remaining: rateLimitResult.remaining - 1, // Account for the message we just processed
  };
}

/**
 * Example 2: Check remaining quota before processing
 */
export async function checkQuotaBeforeProcessing(phoneNumber: string) {
  const remaining = await getRemainingQuota(phoneNumber);

  if (remaining === 0) {
    console.log(`No quota remaining for ${phoneNumber}`);
    return false;
  }

  console.log(`${remaining} messages remaining for ${phoneNumber}`);
  return true;
}

/**
 * Example 3: Get detailed rate limit status for monitoring
 */
export async function monitorRateLimitStatus(phoneNumber: string) {
  const status = await getSMSRateLimitStatus(phoneNumber);

  console.log('Rate Limit Status:');
  console.log(`  Phone Number: ${status.phoneNumber}`);
  console.log(`  Current Count: ${status.currentCount}/${status.limit}`);
  console.log(`  Remaining: ${status.remaining}`);
  console.log(`  Reset At: ${status.resetAt.toISOString()}`);
  console.log(`  Window: ${status.windowMs / 1000 / 60} minutes`);

  return status;
}

/**
 * Example 4: Admin function to reset rate limit
 */
export async function adminResetRateLimit(phoneNumber: string, reason: string) {
  console.log(`Admin reset rate limit for ${phoneNumber}. Reason: ${reason}`);

  await resetSMSRateLimit(phoneNumber);

  console.log(`Rate limit reset successfully for ${phoneNumber}`);
}

/**
 * Example 5: Express middleware for rate limiting
 */
export function smsRateLimitMiddleware() {
  return async (req: any, res: any, next: any) => {
    const phoneNumber = req.body.From; // Twilio sends phone number in 'From' field

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Missing phone number',
      });
    }

    const rateLimitResult = await checkSMSRateLimit(phoneNumber);

    // Add rate limit info to response headers
    res.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());

    if (!rateLimitResult.allowed) {
      res.setHeader('Retry-After', rateLimitResult.retryAfter || 0);

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `You've reached the limit of ${rateLimitResult.limit} messages per hour. Try again in ${rateLimitResult.retryAfter} seconds.`,
        retryAfter: rateLimitResult.retryAfter,
        resetAt: rateLimitResult.resetAt,
      });
    }

    // Store rate limit result in request for later use
    req.rateLimitResult = rateLimitResult;

    next();
  };
}

/**
 * Example 6: Batch processing with rate limit awareness
 */
export async function processBatchMessages(
  messages: Array<{ phoneNumber: string; body: string }>
) {
  const results = [];

  for (const message of messages) {
    const rateLimitResult = await checkSMSRateLimit(message.phoneNumber);

    if (!rateLimitResult.allowed) {
      results.push({
        phoneNumber: message.phoneNumber,
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitResult.retryAfter,
      });
      continue;
    }

    // Process message
    try {
      // ... process message logic ...
      await incrementSMSCounter(message.phoneNumber);

      results.push({
        phoneNumber: message.phoneNumber,
        success: true,
        remaining: rateLimitResult.remaining - 1,
      });
    } catch (error) {
      results.push({
        phoneNumber: message.phoneNumber,
        success: false,
        error: 'PROCESSING_ERROR',
      });
    }
  }

  return results;
}

/**
 * Example 7: Graceful degradation when Redis is unavailable
 */
export async function handleMessageWithFallback(phoneNumber: string, messageBody: string) {
  try {
    // Try Redis-based rate limiting
    const rateLimitResult = await checkSMSRateLimit(phoneNumber);

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitResult.retryAfter,
      };
    }

    // Process message
    console.log(`Processing message from ${phoneNumber}`);

    await incrementSMSCounter(phoneNumber);

    return {
      success: true,
      remaining: rateLimitResult.remaining - 1,
    };
  } catch (error) {
    console.error('Rate limiter error, falling back to in-memory:', error);

    // Fall back to in-memory rate limiter
    const { inMemoryRateLimiter } = await import('./sms-rate-limiter');

    const rateLimitResult = await inMemoryRateLimiter.check(phoneNumber);

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitResult.retryAfter,
      };
    }

    // Process message
    console.log(`Processing message from ${phoneNumber} (in-memory fallback)`);

    await inMemoryRateLimiter.increment(phoneNumber);

    return {
      success: true,
      remaining: rateLimitResult.remaining - 1,
    };
  }
}

// Example usage in main application
if (require.main === module) {
  (async () => {
    const testPhone = '+15555551234';

    console.log('Example 1: Basic rate limit check');
    const result1 = await handleIncomingSMS(testPhone, 'Test message');
    console.log(result1);

    console.log('\nExample 2: Check quota');
    await checkQuotaBeforeProcessing(testPhone);

    console.log('\nExample 3: Monitor status');
    await monitorRateLimitStatus(testPhone);

    console.log('\nExample 4: Admin reset');
    await adminResetRateLimit(testPhone, 'Testing purposes');

    process.exit(0);
  })();
}
