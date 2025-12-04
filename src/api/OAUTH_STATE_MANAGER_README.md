# OAuth State Manager

## Overview

The OAuth State Manager provides secure state token management for OAuth 2.0 flows, implementing CSRF protection through state parameter validation. It stores state tokens in-memory with automatic expiration and cleanup.

## Features

- **Cryptographically Secure**: Uses `crypto.randomBytes` for state generation
- **Automatic Expiration**: States expire after 10 minutes
- **One-Time Use**: States are consumed upon validation to prevent replay attacks
- **Automatic Cleanup**: Expired states are automatically removed every 5 minutes
- **Thread-Safe**: Handles concurrent access safely
- **Memory Efficient**: In-memory storage with automatic cleanup

## Usage

### Basic Usage

```typescript
import { getOAuthStateManager } from './oauth-state-manager';

const stateManager = getOAuthStateManager();

// Generate a new state token
const state = stateManager.generateState();

// Store the state in your OAuth authorization URL
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?state=${state}&...`;

// Later, when handling the OAuth callback
const callbackState = req.query.state;

if (!stateManager.validateState(callbackState)) {
  throw new Error('Invalid or expired state token');
}

// Continue with OAuth flow...
```

### Integration with Google SSO Service

```typescript
import { getOAuthStateManager } from './oauth-state-manager';
import { GoogleSSOService } from './google-sso-service';

const stateManager = getOAuthStateManager();
const googleSSO = new GoogleSSOService();

// Step 1: Generate authorization URL
app.get('/api/auth/google/authorize', (req, res) => {
  const state = stateManager.generateState();
  const authUrl = googleSSO.getAuthorizationUrl(state);
  
  res.json({ authUrl });
});

// Step 2: Handle OAuth callback
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Validate state for CSRF protection
  if (!stateManager.validateState(state as string)) {
    return res.status(400).json({ 
      error: 'Invalid or expired state token' 
    });
  }
  
  // Exchange code for tokens
  const tokens = await googleSSO.exchangeCodeForToken(code as string);
  
  // Continue with authentication...
});
```

## API Reference

### `generateState(): string`

Generates a new cryptographically secure state token and stores it with expiration.

**Returns**: A 64-character hexadecimal string

**Example**:
```typescript
const state = stateManager.generateState();
// Returns: "a1b2c3d4e5f6..."
```

### `validateState(state: string): boolean`

Validates a state token and removes it if valid (one-time use).

**Parameters**:
- `state`: The state token to validate

**Returns**: `true` if valid and not expired, `false` otherwise

**Example**:
```typescript
if (stateManager.validateState(callbackState)) {
  // State is valid, proceed with OAuth flow
} else {
  // State is invalid or expired
}
```

### `hasState(state: string): boolean`

Checks if a state exists without consuming it.

**Parameters**:
- `state`: The state token to check

**Returns**: `true` if exists and not expired, `false` otherwise

**Example**:
```typescript
if (stateManager.hasState(state)) {
  // State exists and is valid
}
```

### `getActiveStateCount(): number`

Returns the number of active (non-expired) states.

**Returns**: Number of active states

**Example**:
```typescript
const count = stateManager.getActiveStateCount();
console.log(`Active states: ${count}`);
```

### `clearAll(): void`

Removes all states from storage. Useful for testing.

**Example**:
```typescript
stateManager.clearAll();
```

### `destroy(): void`

Stops automatic cleanup and clears all states. Call this on application shutdown.

**Example**:
```typescript
process.on('SIGTERM', () => {
  stateManager.destroy();
  process.exit(0);
});
```

## Security Considerations

### CSRF Protection

The state parameter provides CSRF protection by:
1. Generating a unique, unpredictable token for each OAuth flow
2. Validating the token matches when the callback is received
3. Consuming the token after validation (one-time use)

### State Expiration

States expire after 10 minutes to:
- Prevent long-lived tokens from being exploited
- Reduce memory usage
- Force users to restart the flow if they take too long

### One-Time Use

States are consumed upon validation to prevent:
- Replay attacks
- Token reuse by attackers
- Multiple authentications from a single OAuth flow

## Configuration

The following constants can be adjusted if needed:

```typescript
private readonly STATE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes
```

## Monitoring

Monitor the OAuth state manager in production:

```typescript
// Log active state count periodically
setInterval(() => {
  const count = stateManager.getActiveStateCount();
  console.log(`[Monitoring] Active OAuth states: ${count}`);
}, 60000); // Every minute
```

## Testing

The OAuth state manager includes comprehensive tests:

```bash
npm test -- src/api/oauth-state-manager.test.ts
```

Test coverage includes:
- State generation uniqueness
- State validation
- Expiration handling
- CSRF protection
- Concurrent access
- Automatic cleanup

## Troubleshooting

### "Invalid or expired state token"

**Cause**: The state token is either:
- Not found in storage
- Expired (older than 10 minutes)
- Already used (consumed by previous validation)

**Solution**: 
- Ensure users complete the OAuth flow within 10 minutes
- Check that the state parameter is correctly passed through the OAuth flow
- Verify the state isn't being validated multiple times

### High Memory Usage

**Cause**: Too many active states in memory

**Solution**:
- Check `getActiveStateCount()` to monitor state count
- Verify automatic cleanup is running
- Consider reducing `STATE_EXPIRATION_MS` if needed

### States Not Cleaning Up

**Cause**: Cleanup timer may have stopped

**Solution**:
- Verify the cleanup timer is running
- Check application logs for cleanup messages
- Restart the application if needed

## Production Considerations

### Scaling

For multi-instance deployments, consider:
- Using Redis or similar for shared state storage
- Implementing distributed state management
- Ensuring state validation works across instances

### Monitoring

Set up alerts for:
- High active state count (potential memory leak)
- Frequent validation failures (potential attack)
- Cleanup failures

### Logging

The state manager logs cleanup operations:
```
[OAuthStateManager] Cleaned up 5 expired state(s)
```

Consider adding additional logging for:
- State generation rate
- Validation success/failure rate
- Average state lifetime

## Related Documentation

- [Google SSO Service](./GOOGLE_SSO_SERVICE_README.md)
- [Authentication Service](./AUTH_SERVICE_GOOGLE_SSO_README.md)
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)
