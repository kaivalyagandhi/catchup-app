# Authentication Service - Google SSO Extension

This document describes the Google SSO authentication extensions to the CatchUp authentication service.

## Overview

The authentication service has been extended to support Google Single Sign-On (SSO) authentication alongside the existing email/password authentication. Users can:

- Sign up with Google SSO
- Log in with Google SSO
- Link their Google account to an existing email/password account
- Use both authentication methods (dual authentication)

## New Functions

### `authenticateWithGoogle(googleUserInfo: GoogleUserInfo)`

Authenticates a user via Google SSO. This function handles three scenarios:

1. **New User**: Creates a new account with Google SSO
2. **Existing Google User**: Logs in an existing Google SSO user
3. **Account Linking**: Links Google account to existing email/password account

**Parameters:**
- `googleUserInfo`: User information from Google ID token

**Returns:**
```typescript
{
  user: User,           // User object with all profile information
  token: string,        // JWT token for authentication
  isNewUser: boolean    // True if account was just created
}
```

**Example:**
```typescript
import { authenticateWithGoogle } from './auth-service';
import { getGoogleSSOService } from './google-sso-service';

const googleSSOService = getGoogleSSOService();

// After OAuth callback, exchange code for token
const tokenResponse = await googleSSOService.exchangeCodeForToken(code);

// Validate and decode ID token
const googleUserInfo = await googleSSOService.validateAndDecodeToken(
  tokenResponse.id_token
);

// Authenticate or create user
const result = await authenticateWithGoogle(googleUserInfo);

console.log('User:', result.user);
console.log('Token:', result.token);
console.log('New user:', result.isNewUser);
```

### `linkGoogleAccount(userId: string, googleUserId: string, email: string)`

Links a Google account to an existing user account. This is useful when a user who signed up with email/password wants to add Google SSO.

**Parameters:**
- `userId`: The existing user's ID
- `googleUserId`: Google user ID (sub claim from ID token)
- `email`: Email address (must match user's email)

**Throws:**
- Error if email doesn't match user account
- Error if Google ID is already linked to another user
- Error if user not found

**Example:**
```typescript
import { linkGoogleAccount } from './auth-service';

await linkGoogleAccount(
  userId,
  googleUserInfo.sub,
  googleUserInfo.email
);

console.log('Google account linked successfully');
```

### `hasGoogleSSO(userId: string)`

Checks if a user has Google SSO enabled.

**Parameters:**
- `userId`: User ID to check

**Returns:**
- `true` if user has Google SSO linked
- `false` if user does not have Google SSO or user doesn't exist

**Example:**
```typescript
import { hasGoogleSSO } from './auth-service';

const hasGoogle = await hasGoogleSSO(userId);

if (hasGoogle) {
  console.log('User can sign in with Google');
} else {
  console.log('User uses email/password only');
}
```

## User Object Extensions

The `User` interface has been extended with Google SSO fields:

```typescript
interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  
  // New Google SSO fields
  googleId?: string;                           // Google user ID (sub claim)
  authProvider?: 'email' | 'google' | 'both';  // Authentication method(s)
  name?: string;                               // User's full name from Google
  profilePictureUrl?: string;                  // Profile picture URL from Google
}
```

## Authentication Providers

Users can have one of three authentication provider values:

- **`email`**: User authenticates with email/password only
- **`google`**: User authenticates with Google SSO only
- **`both`**: User can authenticate with either method

## Account Linking Behavior

When a user authenticates with Google SSO and an account with that email already exists:

1. The system automatically links the Google account to the existing account
2. The `auth_provider` is updated to `'both'`
3. The user's name and profile picture are updated if not already set
4. The user is logged in with their existing account

This provides a seamless experience for users who may have signed up with email/password and later want to use Google SSO.

## Password Handling

For Google-only users (users who signed up with Google SSO):

- The `password_hash` field is `NULL` in the database
- Attempting to log in with email/password will fail with a clear error message
- Attempting to change password will fail with a clear error message

The error messages guide users to use Google Sign-In instead.

## Audit Logging

All Google SSO authentication events are logged:

- New user registration via Google SSO
- Successful login via Google SSO
- Account linking events
- Failed authentication attempts

Audit logs include:
- User ID
- Email address
- Authentication provider
- Authentication method (`'google_sso'`)
- Whether account was linked

## Database Schema

The `users` table has been extended with the following columns:

```sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN name VARCHAR(255);
ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
```

## Security Considerations

1. **Email Verification**: Only verified Google emails are accepted (`email_verified` must be `true`)
2. **Case-Insensitive Email Matching**: Emails are normalized to lowercase for consistent matching
3. **Unique Google IDs**: Each Google ID can only be linked to one account
4. **Audit Trail**: All authentication events are logged for security monitoring
5. **JWT Tokens**: Same JWT token generation as email/password authentication

## Error Handling

The authentication service provides clear error messages:

- "This account uses Google Sign-In. Please sign in with Google." - When trying to use password login for Google-only account
- "This account uses Google Sign-In and does not have a password." - When trying to change password for Google-only account
- "Email does not match user account" - When linking Google account with wrong email
- "This Google account is already linked to another user" - When trying to link already-linked Google ID

## Testing

Comprehensive tests are available in `src/api/auth-service-google.test.ts`:

- New user creation via Google SSO
- Existing user login via Google SSO
- Account linking scenarios
- Email case-insensitivity
- Error conditions
- Google SSO status checking

Run tests:
```bash
npm test src/api/auth-service-google.test.ts
```

## Example Usage

See `src/api/google-sso-auth-example.ts` for complete examples of:

- Complete Google SSO authentication flow
- Linking Google account to existing user
- Checking Google SSO status
- Handling different authentication scenarios

## Integration with Routes

The authentication service functions are designed to be used in API routes:

```typescript
// In your OAuth callback route
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Validate state (CSRF protection)
    // ... state validation logic ...
    
    // Exchange code for token
    const googleSSOService = getGoogleSSOService();
    const tokenResponse = await googleSSOService.exchangeCodeForToken(code);
    
    // Validate and decode token
    const googleUserInfo = await googleSSOService.validateAndDecodeToken(
      tokenResponse.id_token
    );
    
    // Authenticate or create user
    const result = await authenticateWithGoogle(googleUserInfo);
    
    // Set JWT token in cookie or return in response
    res.cookie('token', result.token, { httpOnly: true, secure: true });
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Google SSO error:', error);
    res.redirect('/login?error=auth_failed');
  }
});
```

## Requirements Validation

This implementation satisfies the following requirements:

- **1.3**: Creates new user accounts with Google profile information
- **1.4**: Generates JWT tokens for authenticated users
- **2.2**: Logs in existing users with Google SSO
- **2.3**: Creates new accounts for users who don't exist
- **Account Linking**: Automatically links Google accounts to existing email accounts

## Next Steps

After implementing the authentication service extensions:

1. Implement OAuth state management (Task 4)
2. Create Google SSO API routes (Task 5)
3. Implement test mode middleware (Task 6)
4. Add error handling (Task 7)
5. Implement audit logging (Task 8)
6. Create frontend UI (Tasks 10-12)
