# Google SSO Error Handler

Comprehensive error handling for Google SSO authentication with user-friendly messages, detailed logging, and security-conscious error reporting.

## Features

- **Error Classification**: Categorizes errors by severity (LOW, MEDIUM, HIGH, CRITICAL)
- **User-Friendly Messages**: Provides clear, actionable error messages without exposing technical details
- **Detailed Logging**: Logs errors with appropriate detail levels based on severity
- **Security Events**: Identifies and handles security-related errors (CSRF, signature verification)
- **Retry Guidance**: Provides guidance on which errors are retryable
- **PII Protection**: Sanitizes logs to prevent exposure of sensitive information in production

## Usage

### Basic Error Handling

```typescript
import { googleSSOErrorHandler } from './google-sso-error-handler';

try {
  // Your Google SSO code
} catch (error) {
  // Log the error
  googleSSOErrorHandler.logError(error as Error, req, {
    endpoint: '/callback',
    action: 'oauth_callback',
  });

  // Format and send error response
  const errorResponse = googleSSOErrorHandler.formatError(error as Error);
  const statusCode = error instanceof GoogleSSOError ? error.statusCode : 500;
  res.status(statusCode).json(errorResponse);
}
```

### Express Middleware

```typescript
import { googleSSOErrorHandler } from './google-sso-error-handler';

// Add to your Express app
app.use(googleSSOErrorHandler.middleware());
```

### Creating Errors with Automatic Logging

```typescript
import { googleSSOErrorHandler, GoogleSSOErrorCode } from './google-sso-error-handler';

const error = googleSSOErrorHandler.createError(
  'Technical error message',
  GoogleSSOErrorCode.INVALID_TOKEN,
  'User-friendly message',
  401,
  req,
  { additionalContext: 'value' }
);

throw error;
```

### Checking Error Properties

```typescript
// Check if error is retryable
if (googleSSOErrorHandler.isRetryable(error)) {
  // Show retry button
}

// Check if error is a security event
if (googleSSOErrorHandler.isSecurityEvent(error)) {
  // Trigger security alert
}

// Get error message with guidance
const messageWithGuidance = googleSSOErrorHandler.getMessageWithGuidance(error);
```

## Error Codes and Severity

| Error Code | Severity | Description |
|------------|----------|-------------|
| `INVALID_CONFIG` | CRITICAL | Missing or invalid OAuth configuration |
| `INVALID_CODE` | LOW | Invalid authorization code from user |
| `TOKEN_EXCHANGE_FAILED` | MEDIUM | Failed to exchange code for token |
| `INVALID_TOKEN` | MEDIUM | Token validation failed |
| `TOKEN_EXPIRED` | LOW | Token has expired |
| `STATE_MISMATCH` | CRITICAL | CSRF protection state mismatch |
| `USER_CREATION_FAILED` | HIGH | Failed to create user account |
| `EMAIL_CONFLICT` | LOW | Email already exists |
| `SIGNATURE_VERIFICATION_FAILED` | CRITICAL | Token signature verification failed |

## Error Response Format

### Production Response

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid authentication token. Please try again."
  }
}
```

### Development Response

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid authentication token. Please try again.",
    "details": {
      "technicalMessage": "Token audience does not match client ID",
      "stack": "Error: Token audience does not match client ID\n    at ..."
    }
  }
}
```

## Log Entry Format

```typescript
{
  timestamp: Date,
  errorCode: string,
  message: string,
  userMessage: string,
  statusCode: number,
  userId?: string,
  email?: string,        // Only in development
  ipAddress?: string,
  userAgent?: string,
  stack?: string,        // Only in development
  context?: object       // Only in development
}
```

## Security Considerations

### PII Protection

- Email addresses are only logged in development mode
- Stack traces are only included in development mode
- Sensitive context is sanitized in production logs

### Security Events

The following errors are classified as security events and logged with CRITICAL severity:

- `STATE_MISMATCH`: Potential CSRF attack
- `SIGNATURE_VERIFICATION_FAILED`: Potential token tampering
- `INVALID_CONFIG`: System misconfiguration

### Error Message Safety

User-facing error messages never expose:
- Internal system details
- Configuration values
- Token contents
- Database information
- Stack traces (in production)

## Logging Levels

### CRITICAL (Security Events)

- `INVALID_CONFIG`: System misconfiguration
- `STATE_MISMATCH`: CSRF protection failure
- `SIGNATURE_VERIFICATION_FAILED`: Token tampering

**Action**: Immediate investigation required, potential security incident

### HIGH (System Errors)

- `USER_CREATION_FAILED`: Database or system error

**Action**: Investigation required, may indicate system issues

### MEDIUM (Recoverable Errors)

- `TOKEN_EXCHANGE_FAILED`: Google API error
- `INVALID_TOKEN`: Token validation failure

**Action**: Monitor for patterns, may indicate transient issues

### LOW (User Errors)

- `INVALID_CODE`: User provided invalid code
- `TOKEN_EXPIRED`: Normal expiration
- `EMAIL_CONFLICT`: User error

**Action**: Normal operation, no action required

## Integration with Audit Logging

The error handler integrates with the existing audit logging system:

```typescript
// Error handler logs the error
googleSSOErrorHandler.logError(error, req, context);

// Audit logger records the authentication event
await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
  metadata: { 
    provider: 'google',
    method: 'oauth_callback',
    error: error.message
  },
  success: false,
  errorMessage: error.message,
});
```

## Testing

```typescript
import { GoogleSSOErrorHandler, GoogleSSOErrorCode } from './google-sso-error-handler';
import { GoogleSSOError } from './google-sso-service';

describe('GoogleSSOErrorHandler', () => {
  it('should format error response', () => {
    const handler = new GoogleSSOErrorHandler();
    const error = new GoogleSSOError(
      'Technical message',
      GoogleSSOErrorCode.INVALID_TOKEN,
      'User message',
      401
    );

    const response = handler.formatErrorResponse(error);
    
    expect(response.error.code).toBe(GoogleSSOErrorCode.INVALID_TOKEN);
    expect(response.error.message).toBe('User message');
  });

  it('should identify retryable errors', () => {
    const handler = new GoogleSSOErrorHandler();
    const error = new GoogleSSOError(
      'Token exchange failed',
      GoogleSSOErrorCode.TOKEN_EXCHANGE_FAILED,
      'Failed to complete authentication',
      500
    );

    expect(handler.isRetryableError(error)).toBe(true);
  });

  it('should identify security events', () => {
    const handler = new GoogleSSOErrorHandler();
    const error = new GoogleSSOError(
      'State mismatch',
      GoogleSSOErrorCode.STATE_MISMATCH,
      'Security validation failed',
      400
    );

    expect(handler.isSecurityEvent(error)).toBe(true);
  });
});
```

## Environment Variables

- `NODE_ENV`: Set to 'development' to enable detailed error logging and stack traces

## Related Files

- `src/api/google-sso-service.ts`: Google SSO service with error definitions
- `src/api/routes/google-sso.ts`: API routes using error handler
- `src/utils/audit-logger.ts`: Audit logging integration
