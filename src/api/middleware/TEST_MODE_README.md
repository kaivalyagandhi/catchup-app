# Test Mode Middleware

## Overview

The test mode middleware enforces authentication method restrictions based on the `TEST_MODE` environment variable. This allows the application to support both Google SSO (production) and email/password authentication (development/testing) in a controlled manner.

## Purpose

- **Production Mode** (TEST_MODE=false or not set): Only Google SSO authentication is available
- **Test Mode** (TEST_MODE=true): Both Google SSO and email/password authentication are available

This design ensures that:
1. Production users have a streamlined Google SSO experience
2. Developers can test without requiring Google accounts
3. Email/password authentication cannot be accidentally enabled in production

## Components

### `isTestModeEnabled()`

Checks if test mode is currently enabled.

```typescript
const testMode = isTestModeEnabled();
// Returns true only when TEST_MODE === 'true'
```

### `enforceTestMode` Middleware

Blocks requests to email/password authentication endpoints when test mode is disabled.

**Usage:**
```typescript
router.post('/register', enforceTestMode, registerHandler);
router.post('/login', enforceTestMode, loginHandler);
```

**Behavior:**
- When TEST_MODE=true: Allows the request to proceed
- When TEST_MODE=false or not set: Returns 403 error with message

**Error Response:**
```json
{
  "error": {
    "code": "TEST_MODE_DISABLED",
    "message": "Email/password authentication is only available in test mode. Please use Google Sign-In.",
    "testMode": false
  }
}
```

### `addTestModeIndicator` Middleware

Adds a `testMode` field to all API responses.

**Usage:**
```typescript
router.get('/status', addTestModeIndicator, statusHandler);
```

**Example Response:**
```json
{
  "user": { "id": "123", "email": "user@example.com" },
  "token": "abc123",
  "testMode": true
}
```

### `getTestModeStatus()`

Returns the current test mode status with a descriptive message.

**Usage:**
```typescript
const status = getTestModeStatus();
// Returns: { enabled: boolean, message: string }
```

## Configuration

Set the `TEST_MODE` environment variable in your `.env` file:

```bash
# Enable test mode (development/testing)
TEST_MODE=true

# Disable test mode (production)
TEST_MODE=false
# or simply omit the variable
```

## Protected Endpoints

The following endpoints are protected by `enforceTestMode`:

- `POST /api/auth/register` - User registration with email/password
- `POST /api/auth/login` - User login with email/password

These endpoints will return a 403 error when TEST_MODE is disabled.

## Unprotected Endpoints

The following endpoints work regardless of test mode:

- `GET /api/auth/test-mode` - Check test mode status
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/change-password` - Change password (requires authentication)
- All Google SSO endpoints (`/api/auth/google/*`)

## Frontend Integration

The frontend should check test mode status on page load to determine which authentication UI to display:

```javascript
// Check test mode status
const response = await fetch('/api/auth/test-mode');
const { enabled } = await response.json();

if (enabled) {
  // Show both Google SSO button and email/password form
  document.getElementById('email-auth-form').style.display = 'block';
  document.getElementById('test-mode-notice').style.display = 'block';
} else {
  // Show only Google SSO button
  document.getElementById('email-auth-form').style.display = 'none';
}
```

## Testing

### Unit Tests

Test the middleware functions in isolation:

```bash
npm test src/api/middleware/test-mode.test.ts
```

### Integration Tests

Test the auth routes with test mode middleware:

```bash
npm test src/api/routes/auth-test-mode.test.ts
```

## Security Considerations

1. **Production Safety**: Always ensure TEST_MODE is not set (or set to false) in production environments
2. **Environment Variables**: Never commit `.env` files with TEST_MODE=true to production branches
3. **Monitoring**: Set up alerts if TEST_MODE is enabled in production
4. **Audit Logging**: All authentication attempts (both successful and failed) are logged regardless of test mode

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 3.1**: Display both authentication options when test mode is enabled
- **Requirement 3.2**: Display only Google SSO when test mode is disabled
- **Requirement 3.3**: Allow both authentication methods in test mode
- **Requirement 3.4**: Block email/password endpoints when test mode is disabled
- **Requirement 3.5**: Enable test mode when TEST_MODE environment variable is "true"

## Example Scenarios

### Scenario 1: Development Environment

```bash
# .env
TEST_MODE=true
```

- Developers can use email/password for quick testing
- Google SSO also works for testing OAuth flow
- Both authentication methods create valid sessions

### Scenario 2: Production Environment

```bash
# .env
# TEST_MODE not set or set to false
```

- Only Google SSO button is displayed
- Email/password endpoints return 403 errors
- Users must authenticate via Google

### Scenario 3: Staging Environment

```bash
# .env
TEST_MODE=true
```

- QA team can test both authentication methods
- Verify Google SSO flow works correctly
- Test email/password fallback scenarios
