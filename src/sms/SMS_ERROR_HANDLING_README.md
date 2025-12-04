# SMS/MMS Error Handling

Comprehensive error handling for SMS/MMS enrichment processing with classification, retry logic, logging, and user notifications.

## Overview

The SMS error handling system provides:

1. **Error Classification** - Categorizes errors as recoverable or unrecoverable
2. **Retry Logic** - Automatically retries recoverable errors with exponential backoff
3. **Comprehensive Logging** - Logs errors with full context for debugging
4. **User Notifications** - Notifies users of processing failures
5. **Security Audit Logging** - Tracks security-related events

## Requirements Implemented

- **Requirement 9.1**: Error classification and comprehensive logging with context
- **Requirement 9.2**: Retry logic with exponential backoff (max 3 attempts)
- **Requirement 9.3**: User notification after all retries fail
- **Requirement 9.4**: Immediate failure for unrecoverable errors

## Error Types

### Recoverable Errors (Will Retry)

These errors are temporary and may succeed on retry:

- `NETWORK_TIMEOUT` - Network connection timeouts
- `SERVICE_UNAVAILABLE` - External service temporarily unavailable (503)
- `RATE_LIMIT_EXTERNAL` - Rate limit from external API (429)
- `DATABASE_CONNECTION` - Database connection issues
- `TEMPORARY_FAILURE` - Other temporary failures

### Unrecoverable Errors (Fail Immediately)

These errors indicate permanent problems that won't be fixed by retrying:

- `INVALID_CREDENTIALS` - Authentication credentials are invalid
- `MALFORMED_MEDIA` - Media file is corrupt or malformed
- `UNSUPPORTED_MEDIA_TYPE` - Media type is not supported
- `QUOTA_EXCEEDED` - API quota has been exceeded
- `AUTHENTICATION_FAILED` - Authentication failed (401/403)
- `INVALID_PHONE_NUMBER` - Phone number is not valid
- `MEDIA_SIZE_EXCEEDED` - Media file exceeds 5MB limit
- `PERMISSION_DENIED` - Permission denied for operation

## Retry Configuration

Default retry configuration:

```typescript
{
  maxAttempts: 3,           // Maximum number of retry attempts
  initialDelayMs: 1000,     // Initial delay (1 second)
  maxDelayMs: 10000,        // Maximum delay (10 seconds)
  backoffMultiplier: 2      // Exponential backoff multiplier
}
```

Retry delays:
- Attempt 1: 1000ms (1 second)
- Attempt 2: 2000ms (2 seconds)
- Attempt 3: 4000ms (4 seconds)

## Usage

### Basic Usage

```typescript
import { processWithErrorHandling, ErrorContext } from './sms-error-handler';

const context: ErrorContext = {
  userId: 'user-123',
  phoneNumber: '+15555551234',
  messageSid: 'MM123',
  messageType: 'sms',
  contentType: 'text',
  timestamp: new Date(),
};

const result = await processWithErrorHandling(
  async () => {
    // Your processing logic here
    return await processMessage(payload);
  },
  context
);

if (result.success) {
  console.log('Processing succeeded:', result.result);
} else {
  console.error('Processing failed:', result.error);
}
```

### Manual Retry

```typescript
import { retryWithBackoff, ErrorContext } from './sms-error-handler';

const result = await retryWithBackoff(
  async () => {
    return await someOperation();
  },
  context,
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  }
);
```

### Error Classification

```typescript
import { classifyError, isRecoverableError } from './sms-error-handler';

try {
  await someOperation();
} catch (error) {
  const errorType = classifyError(error);
  
  if (isRecoverableError(errorType)) {
    console.log('Error is recoverable, will retry');
  } else {
    console.log('Error is unrecoverable, failing immediately');
  }
}
```

### Manual Logging

```typescript
import { logErrorWithContext, ErrorContext } from './sms-error-handler';

const context: ErrorContext = {
  userId: 'user-123',
  phoneNumber: '+15555551234',
  messageSid: 'MM123',
  messageType: 'sms',
  contentType: 'text',
  timestamp: new Date(),
};

try {
  await someOperation();
} catch (error) {
  await logErrorWithContext(error, context);
}
```

### Manual User Notification

```typescript
import { notifyUserOfFailure, SMSErrorType } from './sms-error-handler';

await notifyUserOfFailure(
  'user-123',
  '+15555551234',
  SMSErrorType.MALFORMED_MEDIA,
  context
);
```

## Error Context

The `ErrorContext` interface provides comprehensive information for logging:

```typescript
interface ErrorContext {
  userId: string;              // User ID (required)
  phoneNumber?: string;        // User's phone number
  messageSid?: string;         // Twilio message SID
  messageType?: 'sms' | 'mms'; // Message type
  contentType?: 'text' | 'audio' | 'image' | 'video'; // Content type
  mediaUrl?: string;           // Media URL if applicable
  attemptNumber?: number;      // Current retry attempt
  timestamp: Date;             // Timestamp of error
  errorDetails?: any;          // Additional error details
}
```

## Logging

Errors are logged in multiple places:

1. **Console** - Full error details with context (JSON format)
2. **Database** - Stored in `audit_logs` table for monitoring
3. **Security Events** - Suspicious errors logged separately

Example log entry:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "userId": "user-123",
  "phoneNumber": "+15555551234",
  "messageSid": "MM123",
  "messageType": "mms",
  "contentType": "audio",
  "mediaUrl": "https://api.twilio.com/media/MM123",
  "attemptNumber": 2,
  "errorType": "network_timeout",
  "errorMessage": "Connection timeout",
  "recoverable": true
}
```

## User Notifications

When processing fails, users receive SMS notifications with friendly error messages:

| Error Type | User Message |
|------------|--------------|
| `NETWORK_TIMEOUT` | "We couldn't process your message due to a network issue. Please try again." |
| `SERVICE_UNAVAILABLE` | "Our service is temporarily unavailable. Please try again in a few minutes." |
| `MALFORMED_MEDIA` | "We couldn't process your media file. Please ensure it's a valid audio, image, or video file." |
| `MEDIA_SIZE_EXCEEDED` | "Your file is too large (max 5MB). Please send a smaller file." |
| `INVALID_PHONE_NUMBER` | "This phone number isn't linked to a CatchUp account. Visit the web app to link it." |

Notifications are queued in the `notification_queue` table and sent asynchronously.

## Security Audit Logging

Security-related errors trigger audit log entries:

- `AUTHENTICATION_FAILED` - Failed authentication attempts
- `PERMISSION_DENIED` - Permission denied errors
- `INVALID_PHONE_NUMBER` - Invalid phone number attempts

These are logged with action `SUSPICIOUS_ACTIVITY` for security monitoring.

## Integration with Message Processor

The message processor automatically uses error handling:

```typescript
// In message-processor.ts
const result = await processWithErrorHandling(
  async () => {
    return await this.routeToProcessor(payload, userId, messageType, contentType);
  },
  errorContext,
  DEFAULT_RETRY_CONFIG
);
```

This provides:
- Automatic retry for recoverable errors
- Comprehensive error logging
- User notifications on failure
- Security audit logging

## Testing

Run tests:

```bash
npm test src/sms/sms-error-handler.test.ts
```

Tests cover:
- Error classification (recoverable vs unrecoverable)
- Exponential backoff calculation
- Retry logic with various error types
- Error context preservation
- User notification triggering

## Monitoring

Monitor error rates and types:

```sql
-- Error rate by type
SELECT 
  metadata->>'errorType' as error_type,
  COUNT(*) as count,
  metadata->>'recoverable' as recoverable
FROM audit_logs
WHERE action = 'sms_processing_error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type, recoverable
ORDER BY count DESC;

-- Recent errors for a user
SELECT 
  created_at,
  metadata->>'errorType' as error_type,
  error_message,
  metadata->>'attemptNumber' as attempt
FROM audit_logs
WHERE user_id = 'user-123'
  AND action = 'sms_processing_error'
ORDER BY created_at DESC
LIMIT 10;
```

## Best Practices

1. **Always provide context** - Include as much context as possible in `ErrorContext`
2. **Use appropriate error types** - Classify errors correctly for proper retry behavior
3. **Monitor error rates** - Set up alerts for high error rates
4. **Test error scenarios** - Test both recoverable and unrecoverable error paths
5. **Keep user messages friendly** - Error messages should be helpful, not technical

## Related Files

- `src/sms/sms-error-handler.ts` - Main error handling implementation
- `src/sms/sms-error-handler.test.ts` - Comprehensive test suite
- `src/sms/message-processor.ts` - Integration with message processing
- `src/utils/error-handling.ts` - General error handling utilities
- `src/utils/audit-logger.ts` - Audit logging utilities
