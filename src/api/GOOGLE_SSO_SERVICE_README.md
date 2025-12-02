# Google SSO Service

## Overview

The Google SSO Service provides a complete implementation of Google OAuth 2.0 authentication for CatchUp. It handles the entire OAuth flow including authorization URL generation, token exchange, ID token validation, and user information extraction.

## Features

- ✅ Authorization URL generation with CSRF protection
- ✅ Authorization code to token exchange
- ✅ ID token validation with signature verification
- ✅ User information extraction from ID tokens
- ✅ Comprehensive error handling with user-friendly messages
- ✅ Configuration validation on startup
- ✅ Public key caching for performance
- ✅ Minimal scope request (email and profile only)

## Configuration

### Required Environment Variables

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Google+ API (for profile information)
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/google/callback`
     - Production: `https://yourdomain.com/api/auth/google/callback`
5. Copy Client ID and Client Secret to environment variables

## Usage

### Basic Flow

```typescript
import { getGoogleSSOService, GoogleSSOService } from './google-sso-service';

// 1. Generate authorization URL
const service = getGoogleSSOService();
const state = GoogleSSOService.generateState();
const authUrl = service.getAuthorizationUrl(state);

// Redirect user to authUrl

// 2. Handle OAuth callback
const tokenResponse = await service.exchangeCodeForToken(code);

// 3. Validate and extract user info
const userInfo = await service.validateAndDecodeToken(tokenResponse.id_token);

console.log(userInfo);
// {
//   sub: 'google-user-id',
//   email: 'user@example.com',
//   email_verified: true,
//   name: 'John Doe',
//   picture: 'https://...',
//   given_name: 'John',
//   family_name: 'Doe'
// }
```

### Complete Example

See `src/api/google-sso-example.ts` for a complete working example.

## API Reference

### `GoogleSSOService`

#### Constructor

```typescript
new GoogleSSOService()
```

Validates configuration and initializes the service. Throws `GoogleSSOError` if configuration is invalid.

#### Methods

##### `getAuthorizationUrl(state: string): string`

Generates the Google OAuth authorization URL.

**Parameters:**
- `state` - CSRF protection state parameter (use `GoogleSSOService.generateState()`)

**Returns:** Authorization URL to redirect user to

**Example:**
```typescript
const state = GoogleSSOService.generateState();
const url = service.getAuthorizationUrl(state);
// https://accounts.google.com/o/oauth2/v2/auth?client_id=...&state=...
```

##### `exchangeCodeForToken(code: string): Promise<GoogleTokenResponse>`

Exchanges authorization code for access token and ID token.

**Parameters:**
- `code` - Authorization code from OAuth callback

**Returns:** Token response containing access_token, id_token, expires_in, etc.

**Throws:** `GoogleSSOError` if exchange fails

**Example:**
```typescript
const tokens = await service.exchangeCodeForToken(code);
console.log(tokens.id_token);
```

##### `validateAndDecodeToken(idToken: string): Promise<GoogleUserInfo>`

Validates ID token signature and claims, then extracts user information.

**Parameters:**
- `idToken` - ID token from Google

**Returns:** User information including sub, email, name, etc.

**Throws:** `GoogleSSOError` if validation fails

**Validation checks:**
- Signature verification using Google's public keys
- Issuer verification (must be accounts.google.com)
- Audience verification (must match client ID)
- Expiration verification
- Email verification status

**Example:**
```typescript
const userInfo = await service.validateAndDecodeToken(idToken);
console.log(userInfo.email);
```

##### `verifyTokenSignature(idToken: string): Promise<boolean>`

Verifies ID token signature using Google's public keys.

**Parameters:**
- `idToken` - ID token to verify

**Returns:** True if signature is valid, false otherwise

**Example:**
```typescript
const isValid = await service.verifyTokenSignature(idToken);
```

#### Static Methods

##### `GoogleSSOService.generateState(): string`

Generates a cryptographically secure random state parameter for CSRF protection.

**Returns:** 64-character hex string

**Example:**
```typescript
const state = GoogleSSOService.generateState();
// Store in session/cache with expiration
```

##### `GoogleSSOService.getErrorMessage(code: GoogleSSOErrorCode): string`

Gets user-friendly error message for error code.

**Parameters:**
- `code` - Error code

**Returns:** User-friendly error message

**Example:**
```typescript
const message = GoogleSSOService.getErrorMessage(GoogleSSOErrorCode.INVALID_CODE);
// "Invalid authentication code. Please try again."
```

## Error Handling

### Error Codes

```typescript
enum GoogleSSOErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  INVALID_CODE = 'INVALID_CODE',
  TOKEN_EXCHANGE_FAILED = 'TOKEN_EXCHANGE_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  STATE_MISMATCH = 'STATE_MISMATCH',
  USER_CREATION_FAILED = 'USER_CREATION_FAILED',
  EMAIL_CONFLICT = 'EMAIL_CONFLICT',
  SIGNATURE_VERIFICATION_FAILED = 'SIGNATURE_VERIFICATION_FAILED',
}
```

### Error Handling Example

```typescript
try {
  const userInfo = await service.validateAndDecodeToken(idToken);
} catch (error) {
  if (error instanceof GoogleSSOError) {
    console.error('Error code:', error.code);
    console.error('User message:', error.userMessage);
    console.error('Status code:', error.statusCode);
  }
}
```

## Security Considerations

### CSRF Protection

Always use the state parameter to prevent CSRF attacks:

1. Generate state with `GoogleSSOService.generateState()`
2. Store state in session/cache with expiration (5-10 minutes)
3. Verify state matches on callback
4. Delete state after verification

### Token Validation

The service performs comprehensive token validation:

- ✅ Signature verification using Google's public keys
- ✅ Issuer verification
- ✅ Audience verification
- ✅ Expiration verification
- ✅ Email verification status check

### Minimal Scopes

The service requests only the minimum required scopes:
- `email` - User's email address
- `profile` - Basic profile information (name, picture)

No additional permissions are requested.

### Token Storage

When storing tokens:
- Encrypt access tokens and refresh tokens at rest
- Use the encryption utilities in `src/utils/encryption.ts`
- Never log tokens or include them in error messages

## Testing

Run tests:

```bash
npm test -- src/api/google-sso-service.test.ts
```

Tests cover:
- Configuration validation
- Authorization URL generation
- State generation
- Error message retrieval
- Error handling

## Performance

### Public Key Caching

Google's public keys are cached for 1 hour to reduce API calls and improve performance. The cache is automatically refreshed when expired.

### Token Validation

Token validation is fast because:
1. Public keys are cached
2. JWT verification is done locally
3. No external API calls required (except initial key fetch)

## Troubleshooting

### "Invalid client" error

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check that redirect URI matches exactly in Google Cloud Console

### "Token expired" error

- Token has expired (typically 1 hour)
- User needs to re-authenticate

### "Email is not verified" error

- User's Google email is not verified
- User needs to verify their email with Google

### Configuration errors

- Check all required environment variables are set
- Verify redirect URI is a valid URL
- Ensure Google Cloud Console is properly configured

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [JWT Verification](https://developers.google.com/identity/protocols/oauth2/openid-connect#validatinganidtoken)

