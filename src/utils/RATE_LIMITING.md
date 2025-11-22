# Rate Limiting Implementation

This document describes the rate limiting strategy implemented for the CatchUp application.

## Overview

Rate limiting is implemented to:

1. **Prevent abuse** - Protect against malicious users or bots
2. **Ensure fair usage** - Distribute resources fairly among users
3. **Protect external APIs** - Avoid hitting rate limits on third-party services
4. **Prevent spam** - Limit notification frequency

## Implementation

The rate limiter uses Redis with a sliding window algorithm to track requests over time.

### Algorithm

The sliding window algorithm:

1. Stores each request with a timestamp in a Redis sorted set
2. Removes requests outside the time window
3. Counts remaining requests in the window
4. Allows or blocks based on the count

Benefits:
- More accurate than fixed windows
- Prevents burst traffic at window boundaries
- Efficient with Redis sorted sets

## Rate Limits

### API Rate Limits

**Per User API Requests**
- Limit: 60 requests per minute
- Window: 1 minute
- Applies to: All API endpoints

```typescript
import { apiRateLimiter } from './utils/rate-limiter';

// Apply to all routes
app.use('/api', apiRateLimiter());

// Or specific routes
app.get('/api/contacts', apiRateLimiter(), contactController.list);
```

### Voice Upload Limits

**Per User Voice Uploads**
- Limit: 10 uploads per hour
- Window: 1 hour
- Max file size: 10MB (configured separately)

```typescript
import { checkVoiceUploadLimit } from './utils/rate-limiter';

async function uploadVoiceNote(userId: string, file: Buffer) {
  const rateLimit = await checkVoiceUploadLimit(userId);
  
  if (!rateLimit.allowed) {
    throw new Error(
      `Upload limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`
    );
  }
  
  // Process upload
}
```

### Notification Limits

**Per User Notifications**
- Limit: 20 notifications per hour
- Window: 1 hour
- Applies to: SMS and email notifications

```typescript
import { checkNotificationLimit } from './utils/rate-limiter';

async function sendNotification(userId: string, message: string) {
  const rateLimit = await checkNotificationLimit(userId);
  
  if (!rateLimit.allowed) {
    console.log(`Notification rate limit exceeded for user ${userId}`);
    return;
  }
  
  // Send notification
}
```

### SMS Limits

**Per User SMS**
- Limit: 10 SMS per hour
- Window: 1 hour
- Prevents SMS spam

```typescript
import { checkSMSLimit } from './utils/rate-limiter';

async function sendSMS(userId: string, phoneNumber: string, message: string) {
  const rateLimit = await checkSMSLimit(userId);
  
  if (!rateLimit.allowed) {
    throw new Error('SMS rate limit exceeded');
  }
  
  // Send SMS via Twilio
}
```

### Email Limits

**Per User Emails**
- Limit: 20 emails per hour
- Window: 1 hour
- Prevents email spam

```typescript
import { checkEmailLimit } from './utils/rate-limiter';

async function sendEmail(userId: string, to: string, subject: string, body: string) {
  const rateLimit = await checkEmailLimit(userId);
  
  if (!rateLimit.allowed) {
    throw new Error('Email rate limit exceeded');
  }
  
  // Send email via SendGrid
}
```

### External API Limits

**Google Calendar API**
- Limit: 10 requests per minute per user
- Window: 1 minute
- Includes exponential backoff

```typescript
import { externalAPILimiter } from './utils/rate-limiter';

async function fetchCalendarEvents(userId: string) {
  return await externalAPILimiter.execute(
    userId,
    async () => {
      // Make Google Calendar API call
      return await calendar.events.list({ ... });
    }
  );
}
```

## Usage

### Express Middleware

Apply rate limiting to API routes:

```typescript
import express from 'express';
import { apiRateLimiter, RateLimits } from './utils/rate-limiter';

const app = express();

// Apply to all API routes
app.use('/api', apiRateLimiter());

// Custom rate limit for specific route
app.post('/api/voice-notes', 
  apiRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyPrefix: 'ratelimit:voice',
  }),
  voiceController.upload
);
```

### Manual Rate Limit Checks

Check rate limits programmatically:

```typescript
import { checkRateLimit } from './utils/rate-limiter';

async function performAction(userId: string) {
  const result = await checkRateLimit(userId, {
    windowMs: 60000,
    maxRequests: 10,
    keyPrefix: 'custom:action',
  });

  if (!result.allowed) {
    throw new Error(
      `Rate limit exceeded. ${result.remaining} requests remaining. ` +
      `Try again in ${result.retryAfter} seconds.`
    );
  }

  // Perform action
}
```

### External API Rate Limiting

Use the external API limiter for third-party services:

```typescript
import { externalAPILimiter, RateLimits } from './utils/rate-limiter';

async function callExternalAPI(userId: string) {
  return await externalAPILimiter.execute(
    userId,
    async () => {
      // Your API call here
      return await fetch('https://api.example.com/data');
    },
    RateLimits.GOOGLE_CALENDAR_API
  );
}
```

## Response Headers

When rate limiting is applied, the following headers are included:

- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: ISO timestamp when the window resets
- `Retry-After`: Seconds until next request allowed (when blocked)

Example response when rate limited:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
Retry-After: 45

{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "retryAfter": 45
}
```

## Exponential Backoff

The external API rate limiter implements exponential backoff:

1. First retry: 1 second delay
2. Second retry: 2 seconds delay
3. Third retry: 4 seconds delay
4. Fourth retry: 8 seconds delay
5. Maximum delay: 30 seconds

Formula: `delay = min(1000 * 2^retryCount, 30000)`

## Configuration

### Environment Variables

Configure rate limiting in `.env`:

```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Custom Rate Limits

Define custom rate limits:

```typescript
import { checkRateLimit, RateLimitConfig } from './utils/rate-limiter';

const customLimit: RateLimitConfig = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 100,
  keyPrefix: 'custom:feature',
};

const result = await checkRateLimit(userId, customLimit);
```

## Monitoring

### Track Rate Limit Hits

Monitor rate limit violations:

```typescript
import { checkRateLimit } from './utils/rate-limiter';

async function monitoredAction(userId: string) {
  const result = await checkRateLimit(userId, config);

  if (!result.allowed) {
    // Log rate limit hit
    console.log(`Rate limit hit for user ${userId}`, {
      remaining: result.remaining,
      resetAt: result.resetAt,
      retryAfter: result.retryAfter,
    });

    // Track in monitoring system
    metrics.increment('rate_limit.hits', { userId });
  }

  return result;
}
```

### Redis Monitoring

Monitor Redis for rate limiting:

```bash
# Connect to Redis
redis-cli

# Check rate limit keys
KEYS ratelimit:*

# Check specific user's rate limit
ZRANGE ratelimit:api:user:USER_ID 0 -1 WITHSCORES

# Monitor commands in real-time
MONITOR
```

## Best Practices

1. **Fail Open** - If Redis is unavailable, allow requests (don't block users)
2. **Clear Error Messages** - Tell users when they'll be able to retry
3. **Log Rate Limit Hits** - Monitor for abuse patterns
4. **Adjust Limits** - Review and adjust based on usage patterns
5. **Use Different Limits** - Different endpoints may need different limits
6. **Whitelist Internal Services** - Don't rate limit internal service-to-service calls
7. **Consider User Tiers** - Premium users might have higher limits

## Troubleshooting

### Rate Limits Too Strict

If legitimate users are being blocked:

1. Review rate limit logs
2. Identify usage patterns
3. Increase limits for affected endpoints
4. Consider user tiers with different limits

### Rate Limits Too Lenient

If abuse is occurring:

1. Monitor for suspicious patterns
2. Decrease limits
3. Add additional validation
4. Consider IP-based rate limiting

### Redis Connection Issues

If Redis is unavailable:

1. Rate limiter fails open (allows requests)
2. Check Redis connection
3. Review Redis logs
4. Ensure Redis is running and accessible

### Performance Issues

If rate limiting is slow:

1. Check Redis latency
2. Review Redis memory usage
3. Consider Redis Cluster for scaling
4. Optimize rate limit key patterns

## Testing

Test rate limiting:

```typescript
import { checkRateLimit } from './utils/rate-limiter';

describe('Rate Limiting', () => {
  it('should block after limit exceeded', async () => {
    const config = {
      windowMs: 60000,
      maxRequests: 2,
      keyPrefix: 'test',
    };

    // First request - allowed
    const result1 = await checkRateLimit('test-user', config);
    expect(result1.allowed).toBe(true);

    // Second request - allowed
    const result2 = await checkRateLimit('test-user', config);
    expect(result2.allowed).toBe(true);

    // Third request - blocked
    const result3 = await checkRateLimit('test-user', config);
    expect(result3.allowed).toBe(false);
    expect(result3.retryAfter).toBeGreaterThan(0);
  });
});
```

## Security Considerations

1. **DDoS Protection** - Rate limiting helps mitigate DDoS attacks
2. **Credential Stuffing** - Limit login attempts
3. **API Abuse** - Prevent automated scraping
4. **Resource Exhaustion** - Protect server resources

## Future Enhancements

1. **IP-based Rate Limiting** - Track by IP address in addition to user ID
2. **Dynamic Rate Limits** - Adjust limits based on system load
3. **User Tiers** - Different limits for free vs premium users
4. **Geographic Rate Limits** - Different limits by region
5. **Endpoint-specific Limits** - Fine-grained control per endpoint
