# Task 9: Error Handling and Retry Logic Implementation

## Summary

Implemented comprehensive error handling for SMS/MMS enrichment processing with classification, retry logic, logging, and user notifications.

## Requirements Implemented

- **Requirement 9.1**: Error classification and comprehensive logging with context
- **Requirement 9.2**: Retry logic with exponential backoff (max 3 attempts)
- **Requirement 9.3**: User notification after all retries fail
- **Requirement 9.4**: Immediate failure for unrecoverable errors

## Files Created

### 1. `src/sms/sms-error-handler.ts`
Main error handling module with:
- Error classification (recoverable vs unrecoverable)
- Retry logic with exponential backoff
- Comprehensive error logging with context
- User notification system
- Security audit logging

### 2. `src/sms/sms-error-handler.test.ts`
Comprehensive test suite covering:
- Error classification for all error types
- Exponential backoff calculation
- Retry logic with various scenarios
- Error context preservation
- User notification triggering

### 3. `src/sms/SMS_ERROR_HANDLING_README.md`
Complete documentation including:
- Usage examples
- Error type reference
- Configuration options
- Monitoring queries
- Best practices

## Files Modified

### 1. `src/sms/message-processor.ts`
- Integrated comprehensive error handling
- Replaced old retry logic with new error handler
- Added error context building
- Improved error logging

### 2. `scripts/migrations/018_create_sms_mms_enrichment_schema.sql`
- Added `notification_queue` table for SMS notifications
- Includes indexes for efficient querying

## Error Classification

### Recoverable Errors (Will Retry)
- `NETWORK_TIMEOUT` - Network connection timeouts
- `SERVICE_UNAVAILABLE` - External service temporarily unavailable
- `RATE_LIMIT_EXTERNAL` - Rate limit from external API
- `DATABASE_CONNECTION` - Database connection issues
- `TEMPORARY_FAILURE` - Other temporary failures

### Unrecoverable Errors (Fail Immediately)
- `INVALID_CREDENTIALS` - Authentication credentials invalid
- `MALFORMED_MEDIA` - Media file corrupt or malformed
- `UNSUPPORTED_MEDIA_TYPE` - Media type not supported
- `QUOTA_EXCEEDED` - API quota exceeded
- `AUTHENTICATION_FAILED` - Authentication failed
- `INVALID_PHONE_NUMBER` - Phone number not valid
- `MEDIA_SIZE_EXCEEDED` - Media file exceeds 5MB limit
- `PERMISSION_DENIED` - Permission denied

## Retry Configuration

Default configuration:
```typescript
{
  maxAttempts: 3,           // Maximum retry attempts
  initialDelayMs: 1000,     // Initial delay (1 second)
  maxDelayMs: 10000,        // Maximum delay (10 seconds)
  backoffMultiplier: 2      // Exponential backoff multiplier
}
```

Retry delays:
- Attempt 1: 1000ms (1 second)
- Attempt 2: 2000ms (2 seconds)
- Attempt 3: 4000ms (4 seconds)

## Error Context

Comprehensive error context includes:
- User ID (required)
- Phone number
- Message SID
- Message type (SMS/MMS)
- Content type (text/audio/image/video)
- Media URL
- Attempt number
- Timestamp
- Additional error details

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

## Test Results

All 21 tests pass:
- ✓ Error Classification (8 tests)
- ✓ Exponential Backoff (2 tests)
- ✓ Retry Logic (4 tests)
- ✓ Process with Error Handling (3 tests)
- ✓ Error Context (1 test)
- ✓ SMSProcessingError (3 tests)

## Usage Example

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
    return await processMessage(payload);
  },
  context
);

if (result.success) {
  console.log('Processing succeeded:', result.result);
} else {
  console.error('Processing failed:', result.error);
  // User has already been notified
}
```

## Integration

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

## Next Steps

The error handling system is now complete and integrated with the message processor. Future enhancements could include:

1. **Metrics Dashboard** - Visualize error rates and types
2. **Alert System** - Trigger alerts for high error rates
3. **Error Recovery** - Automatic recovery strategies for specific error types
4. **Cost Tracking** - Track costs associated with retries
5. **Performance Monitoring** - Monitor retry impact on processing time

## Related Tasks

- Task 8: Message Processor (uses error handling)
- Task 10: TwiML Response Generator (uses error messages)
- Task 13: Monitoring and Logging (extends error logging)
