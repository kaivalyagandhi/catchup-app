# Google SSO Error Handling - Quick Reference

## Quick Start

```typescript
import { googleSSOErrorHandler } from './google-sso-error-handler';

// In your route handler
try {
  // Your Google SSO code
} catch (error) {
  googleSSOErrorHandler.logError(error as Error, req, { endpoint: '/callback' });
  const errorResponse = googleSSOErrorHandler.formatError(error as Error);
  const statusCode = error instanceof GoogleSSOError ? error.statusCode : 500;
  res.status(statusCode).json(errorResponse);
}
```

## Common Patterns

### 1. Basic Error Handling
```typescript
catch (error) {
  googleSSOErrorHandler.logError(error as Error, req);
  const response = googleSSOErrorHandler.formatError(error as Error);
  res.status(error.statusCode || 500).json(response);
}
```

### 2. With Retry Guidance
```typescript
catch (error) {
  const response = googleSSOErrorHandler.formatError(error as Error);
  response.error.message = googleSSOErrorHandler.getMessageWithGuidance(error as Error);
  res.status(error.statusCode || 500).json(response);
}
```

### 3. Check Error Type
```typescript
if (googleSSOErrorHandler.isRetryable(error)) {
  // Show retry button
}

if (googleSSOErrorHandler.isSecurityEvent(error)) {
  // Trigger security alert
}
```

### 4. Create Error with Logging
```typescript
throw googleSSOErrorHandler.createError(
  'Technical message',
  GoogleSSOErrorCode.INVALID_TOKEN,
  'User message',
  401,
  req
);
```

## Error Codes

| Code | Severity | Retryable | Security Event |
|------|----------|-----------|----------------|
| `INVALID_CONFIG` | CRITICAL | No | No |
| `STATE_MISMATCH` | CRITICAL | No | Yes |
| `SIGNATURE_VERIFICATION_FAILED` | CRITICAL | No | Yes |
| `USER_CREATION_FAILED` | HIGH | No | No |
| `TOKEN_EXCHANGE_FAILED` | MEDIUM | Yes | No |
| `INVALID_TOKEN` | MEDIUM | No | Yes |
| `TOKEN_EXPIRED` | LOW | Yes | No |
| `INVALID_CODE` | LOW | No | No |
| `EMAIL_CONFLICT` | LOW | No | No |

## Response Format

### Production
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid authentication token. Please try again."
  }
}
```

### Development
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid authentication token. Please try again.",
    "details": {
      "technicalMessage": "Token audience does not match client ID",
      "stack": "Error: ..."
    }
  }
}
```

## Convenience Functions

```typescript
// Format error for API response
googleSSOErrorHandler.formatError(error)

// Log error with context
googleSSOErrorHandler.logError(error, req, context)

// Create and log error
googleSSOErrorHandler.createError(message, code, userMessage, statusCode, req, context)

// Check if retryable
googleSSOErrorHandler.isRetryable(error)

// Check if security event
googleSSOErrorHandler.isSecurityEvent(error)

// Get message with guidance
googleSSOErrorHandler.getMessageWithGuidance(error)

// Express middleware
app.use(googleSSOErrorHandler.middleware())
```

## Environment Variables

- `NODE_ENV=development`: Enables detailed error logging and stack traces
- `NODE_ENV=production`: Sanitizes logs and hides technical details

## Best Practices

1. **Always log errors with context**
   ```typescript
   googleSSOErrorHandler.logError(error, req, {
     endpoint: '/callback',
     action: 'oauth_callback',
   });
   ```

2. **Add retry guidance for user-facing errors**
   ```typescript
   response.error.message = googleSSOErrorHandler.getMessageWithGuidance(error);
   ```

3. **Use createError for throwing errors**
   ```typescript
   throw googleSSOErrorHandler.createError(
     'Technical message',
     GoogleSSOErrorCode.INVALID_TOKEN,
     'User message',
     401,
     req
   );
   ```

4. **Check error properties before taking action**
   ```typescript
   if (googleSSOErrorHandler.isSecurityEvent(error)) {
     // Alert security team
   }
   ```

5. **Integrate with audit logging**
   ```typescript
   googleSSOErrorHandler.logError(error, req);
   await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
     metadata: { provider: 'google', error: error.message },
     success: false,
   });
   ```

## Testing

```typescript
import { GoogleSSOErrorHandler } from './google-sso-error-handler';
import { GoogleSSOError, GoogleSSOErrorCode } from './google-sso-service';

const handler = new GoogleSSOErrorHandler();
const error = new GoogleSSOError(
  'Technical message',
  GoogleSSOErrorCode.INVALID_TOKEN,
  'User message',
  401
);

// Test formatting
const response = handler.formatErrorResponse(error);
expect(response.error.code).toBe(GoogleSSOErrorCode.INVALID_TOKEN);

// Test retryable
expect(handler.isRetryableError(error)).toBe(false);

// Test security event
expect(handler.isSecurityEvent(error)).toBe(true);
```

## Related Files

- **Implementation**: `src/api/google-sso-error-handler.ts`
- **Tests**: `src/api/google-sso-error-handler.test.ts`
- **Examples**: `src/api/google-sso-error-handler-example.ts`
- **Documentation**: `src/api/GOOGLE_SSO_ERROR_HANDLER_README.md`
- **Routes**: `src/api/routes/google-sso.ts`
