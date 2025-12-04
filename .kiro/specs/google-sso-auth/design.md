# Design Document: Google SSO Authentication

## Overview

This design document outlines the implementation of Google Single Sign-On (SSO) authentication for CatchUp. The system will use Google Identity Services (GIS) with OAuth 2.0 to provide secure, streamlined authentication. Google SSO will be the primary authentication method in production, while test mode will support both Google SSO and email/password authentication for development purposes.

The implementation leverages the existing authentication infrastructure (JWT tokens, user management, audit logging) and extends it to support OAuth-based authentication. The design follows security best practices including token validation, encrypted storage, and comprehensive audit logging.

## Architecture

### High-Level Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │────────▶│   CatchUp    │────────▶│   Google    │
│             │         │   Backend    │         │   OAuth     │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │  1. Click "Sign in"    │                        │
      │───────────────────────▶│                        │
      │                        │  2. Redirect to Google │
      │                        │───────────────────────▶│
      │  3. Google Auth Page   │                        │
      │◀───────────────────────────────────────────────│
      │                        │                        │
      │  4. User authenticates │                        │
      │───────────────────────────────────────────────▶│
      │                        │                        │
      │  5. Redirect with code │                        │
      │◀───────────────────────────────────────────────│
      │───────────────────────▶│                        │
      │                        │  6. Exchange code      │
      │                        │───────────────────────▶│
      │                        │  7. Return ID token    │
      │                        │◀───────────────────────│
      │                        │                        │
      │                        │  8. Validate token     │
      │                        │  9. Create/find user   │
      │                        │ 10. Generate JWT       │
      │                        │                        │
      │ 11. Return JWT + user  │                        │
      │◀───────────────────────│                        │
```

### Component Architecture

The implementation consists of the following components:

1. **Frontend Authentication UI**: Login/signup page with Google SSO button
2. **Google OAuth Service**: Handles OAuth flow, token exchange, and validation
3. **Authentication Service**: Extended to support Google SSO alongside existing email/password
4. **User Repository**: Database layer for user management
5. **Audit Logger**: Tracks authentication events
6. **Middleware**: Route protection and test mode enforcement

## Components and Interfaces

### 1. Google OAuth Service

**File**: `src/api/google-sso-service.ts`

**Responsibilities**:
- Generate Google OAuth authorization URL
- Exchange authorization code for ID token
- Validate ID token signature and claims
- Extract user information from ID token

**Interface**:
```typescript
interface GoogleSSOService {
  // Generate authorization URL for OAuth flow
  getAuthorizationUrl(state: string): string;
  
  // Exchange authorization code for ID token
  exchangeCodeForToken(code: string): Promise<GoogleTokenResponse>;
  
  // Validate ID token and extract user info
  validateAndDecodeToken(idToken: string): Promise<GoogleUserInfo>;
  
  // Verify token signature using Google's public keys
  verifyTokenSignature(idToken: string): Promise<boolean>;
}

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  sub: string;          // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}
```

### 2. Extended Authentication Service

**File**: `src/api/auth-service.ts` (extended)

**New Functions**:
```typescript
// Authenticate or create user via Google SSO
async function authenticateWithGoogle(
  idToken: string
): Promise<{ user: User; token: string }>;

// Link Google account to existing user
async function linkGoogleAccount(
  userId: string,
  googleUserId: string,
  email: string
): Promise<void>;

// Check if user has Google SSO enabled
async function hasGoogleSSO(userId: string): Promise<boolean>;
```

### 3. API Routes

**File**: `src/api/routes/google-sso.ts`

**Endpoints**:
- `GET /api/auth/google/authorize` - Get authorization URL
- `GET /api/auth/google/callback` - Handle OAuth callback
- `POST /api/auth/google/token` - Exchange code for token (alternative flow)
- `GET /api/auth/google/status` - Check Google SSO connection status

### 4. Frontend Components

**File**: `public/js/google-sso.js`

**Functions**:
- `initGoogleSSO()` - Initialize Google SSO button
- `handleGoogleLogin()` - Handle login button click
- `handleGoogleCallback()` - Process OAuth callback
- `displayAuthError(error)` - Show error messages

### 5. Test Mode Middleware

**File**: `src/api/middleware/test-mode.ts`

**Responsibilities**:
- Check TEST_MODE environment variable
- Block email/password endpoints when test mode is disabled
- Allow all authentication methods when test mode is enabled

**Interface**:
```typescript
interface TestModeMiddleware {
  // Check if test mode is enabled
  isTestModeEnabled(): boolean;
  
  // Middleware to enforce test mode restrictions
  enforceTestMode(req: Request, res: Response, next: NextFunction): void;
}
```

## Data Models

### User Table Extension

The existing `users` table will be extended to support Google SSO:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Make password_hash nullable for Google SSO users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add index for Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
```

### User Model

```typescript
interface User {
  id: string;
  email: string;
  password_hash?: string;      // Optional for Google SSO users
  google_id?: string;           // Google user ID (sub claim)
  auth_provider: 'email' | 'google' | 'both';
  name?: string;
  profile_picture_url?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}
```

### OAuth State Management

For CSRF protection, we'll store OAuth state in memory (or Redis for production):

```typescript
interface OAuthState {
  state: string;
  created_at: Date;
  expires_at: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Authorization URL Generation
*For any* OAuth state value, generating an authorization URL should produce a URL containing the correct client_id, redirect_uri, scope (email and profile), response_type (code), and state parameter
**Validates: Requirements 1.2, 2.1**

### Property 2: Account Creation from Google Profile
*For any* valid Google user profile (with email, sub, and name), authenticating with that profile should create a user account with google_id set to the profile's sub, email set to the profile's email, and auth_provider set to 'google'
**Validates: Requirements 1.3, 2.3**

### Property 3: JWT Generation After Authentication
*For any* user authenticated via Google SSO, the system should generate a valid JWT token that contains the user's ID, can be verified with the system's secret key, and has not expired
**Validates: Requirements 1.4**

### Property 4: Error Handling and User Feedback
*For any* authentication error (invalid token, API failure, network error), the system should return a user-friendly error message without exposing sensitive technical details and allow the user to retry
**Validates: Requirements 1.5, 2.4, 5.2, 5.3**

### Property 5: Existing User Login
*For any* existing user with a Google account linked, authenticating with the matching Google email should log the user in and generate a JWT token without creating a duplicate account
**Validates: Requirements 2.2**

### Property 6: Audit Logging for Successful Authentication
*For any* successful Google SSO authentication, the system should create an audit log entry containing the user ID, authentication method ('google'), timestamp, and success status
**Validates: Requirements 2.5, 7.1, 7.5**

### Property 7: Test Mode Enforcement
*For any* request to email/password authentication endpoints when TEST_MODE is false, the system should reject the request with an error indicating the feature is disabled
**Validates: Requirements 3.4**

### Property 8: Dual Authentication in Test Mode
*For any* authentication attempt in test mode (TEST_MODE=true), both Google SSO and email/password authentication methods should be functional and create valid sessions
**Validates: Requirements 3.3**

### Property 9: Token Validation
*For any* ID token received from Google, the system should validate the token's signature using Google's public keys, verify the issuer is 'https://accounts.google.com', verify the audience matches the client ID, and verify the token has not expired
**Validates: Requirements 4.1, 4.2**

### Property 10: Token Encryption at Rest
*For any* OAuth token stored in the database, the token should be encrypted using the system's encryption key before storage
**Validates: Requirements 4.3**

### Property 11: Minimal Scope Request
*For any* authorization URL generated, the scope parameter should contain only 'email' and 'profile' scopes and no additional scopes
**Validates: Requirements 4.4**

### Property 12: Error Logging
*For any* authentication failure (token validation failure, API error, invalid state), the system should create a log entry with error details, timestamp, and sufficient context for debugging
**Validates: Requirements 5.1, 5.4, 7.2, 7.4**

### Property 13: Post-Authentication Redirect
*For any* successful authentication, the system should redirect the user to the main application dashboard ('/') with the JWT token included in the response
**Validates: Requirements 6.4**

### Property 14: Sign Out Session Clearing
*For any* authenticated user who signs out, the system should clear the user's session/JWT token and redirect to the authentication page
**Validates: Requirements 8.4**

### Property 15: Authentication Statistics
*For any* set of authentication events, querying authentication statistics should return accurate counts of Google SSO authentications versus email/password authentications
**Validates: Requirements 7.3**

## Error Handling

### Error Categories

1. **Configuration Errors**
   - Missing or invalid Google OAuth credentials
   - Invalid redirect URI configuration
   - Missing encryption key

2. **OAuth Flow Errors**
   - Invalid authorization code
   - State mismatch (CSRF protection)
   - Token exchange failure
   - Invalid or expired ID token

3. **User Account Errors**
   - Email already exists with different auth provider
   - Account creation failure
   - Database errors

4. **Validation Errors**
   - Token signature validation failure
   - Invalid token claims (issuer, audience, expiration)
   - Missing required user information

### Error Handling Strategy

```typescript
class GoogleSSOError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'GoogleSSOError';
  }
}

// Error codes
enum GoogleSSOErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  INVALID_CODE = 'INVALID_CODE',
  TOKEN_EXCHANGE_FAILED = 'TOKEN_EXCHANGE_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  STATE_MISMATCH = 'STATE_MISMATCH',
  USER_CREATION_FAILED = 'USER_CREATION_FAILED',
  EMAIL_CONFLICT = 'EMAIL_CONFLICT',
}

// User-friendly error messages
const ERROR_MESSAGES = {
  [GoogleSSOErrorCode.INVALID_CONFIG]: 'Authentication service is not properly configured',
  [GoogleSSOErrorCode.INVALID_CODE]: 'Invalid authentication code. Please try again.',
  [GoogleSSOErrorCode.TOKEN_EXCHANGE_FAILED]: 'Failed to complete authentication. Please try again.',
  [GoogleSSOErrorCode.INVALID_TOKEN]: 'Invalid authentication token. Please try again.',
  [GoogleSSOErrorCode.TOKEN_EXPIRED]: 'Authentication session expired. Please try again.',
  [GoogleSSOErrorCode.STATE_MISMATCH]: 'Security validation failed. Please try again.',
  [GoogleSSOErrorCode.USER_CREATION_FAILED]: 'Failed to create user account. Please try again.',
  [GoogleSSOErrorCode.EMAIL_CONFLICT]: 'An account with this email already exists.',
};
```

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;  // Only in development mode
  };
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify specific functionality and edge cases:

1. **Google OAuth Service Tests**
   - Authorization URL generation with correct parameters
   - Token exchange with mocked Google API responses
   - Token validation with valid and invalid tokens
   - Error handling for API failures

2. **Authentication Service Tests**
   - User creation from Google profile
   - Existing user login
   - Account linking scenarios
   - JWT generation and validation

3. **Middleware Tests**
   - Test mode enforcement
   - Route protection
   - Configuration validation

4. **Error Handling Tests**
   - Various error scenarios
   - Error message formatting
   - Audit logging for errors

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using **fast-check** (JavaScript property testing library):

1. **Property Test: Authorization URL Structure**
   - Generate random state values
   - Verify all URLs contain required parameters
   - Verify scope is always 'email profile'

2. **Property Test: Token Validation**
   - Generate tokens with various claim combinations
   - Verify only tokens with correct issuer, audience, and valid expiration are accepted

3. **Property Test: Account Creation Idempotency**
   - Generate random Google profiles
   - Verify authenticating twice with same profile doesn't create duplicates

4. **Property Test: JWT Generation**
   - Generate random user data
   - Verify all generated JWTs are valid and contain correct claims

5. **Property Test: Audit Logging Completeness**
   - Generate random authentication events
   - Verify all events are logged with required fields

6. **Property Test: Error Message Safety**
   - Generate various error scenarios
   - Verify error messages never contain sensitive data (tokens, secrets)

7. **Property Test: Test Mode Enforcement**
   - Generate random requests to email/password endpoints
   - Verify all are rejected when TEST_MODE=false

### Integration Testing

Integration tests will verify end-to-end flows:

1. **Complete OAuth Flow**
   - Mock Google OAuth endpoints
   - Test full authorization → callback → token exchange → user creation flow

2. **Test Mode Switching**
   - Verify behavior changes when TEST_MODE is toggled
   - Test both authentication methods in test mode

3. **Database Integration**
   - Verify user records are created correctly
   - Verify token encryption/decryption
   - Verify audit log entries

4. **Frontend Integration**
   - Test Google SSO button rendering
   - Test callback handling
   - Test error display

### Testing Configuration

```typescript
// vitest.config.ts
export default {
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.ts',
      ],
    },
  },
};
```

### Property Test Configuration

Each property-based test should run a minimum of 100 iterations:

```typescript
import fc from 'fast-check';

// Example property test
test('Property: Authorization URL contains required parameters', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 10, maxLength: 50 }), // Random state
      (state) => {
        const url = googleSSOService.getAuthorizationUrl(state);
        const urlObj = new URL(url);
        
        expect(urlObj.searchParams.get('client_id')).toBe(process.env.GOOGLE_CLIENT_ID);
        expect(urlObj.searchParams.get('redirect_uri')).toBe(process.env.GOOGLE_REDIRECT_URI);
        expect(urlObj.searchParams.get('scope')).toBe('email profile');
        expect(urlObj.searchParams.get('response_type')).toBe('code');
        expect(urlObj.searchParams.get('state')).toBe(state);
      }
    ),
    { numRuns: 100 }
  );
});
```

## Security Considerations

### 1. CSRF Protection

Use state parameter to prevent CSRF attacks:
- Generate cryptographically random state value
- Store state in session or memory cache with expiration
- Verify state matches on callback

### 2. Token Validation

Comprehensive ID token validation:
- Verify signature using Google's public keys (fetched from https://www.googleapis.com/oauth2/v3/certs)
- Verify issuer is 'https://accounts.google.com' or 'accounts.google.com'
- Verify audience matches client ID
- Verify token is not expired
- Verify email is verified (email_verified claim)

### 3. Secure Storage

- Store Google OAuth credentials in environment variables
- Encrypt sensitive tokens at rest using AES-256-GCM
- Never log tokens or sensitive user data
- Use secure session management

### 4. Rate Limiting

Apply rate limiting to OAuth endpoints:
- Authorization endpoint: 10 requests per minute per IP
- Callback endpoint: 20 requests per minute per IP
- Token exchange: 5 requests per minute per IP

### 5. Audit Logging

Log all authentication events:
- Successful authentications
- Failed authentication attempts
- Token validation failures
- Configuration errors
- Security events (state mismatch, invalid tokens)

## Configuration

### Environment Variables

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Test Mode Configuration
TEST_MODE=false  # Set to 'true' to enable email/password authentication

# Existing Configuration
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
DATABASE_URL=postgresql://...
```

### Google Cloud Console Setup

1. Create a new project or select existing project
2. Enable Google+ API (for profile information)
3. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/google/callback`
     - Production: `https://yourdomain.com/api/auth/google/callback`
4. Copy Client ID and Client Secret to environment variables

### Scopes Required

- `email`: Access to user's email address
- `profile`: Access to user's basic profile information (name, picture)

## Implementation Notes

### Frontend Implementation

The frontend will use a simple button-based approach:

```html
<!-- Login page -->
<div class="auth-container">
  <h1>Welcome to CatchUp</h1>
  
  <!-- Google SSO Button (always visible) -->
  <button id="google-sso-btn" class="google-sso-button">
    <img src="/images/google-logo.svg" alt="Google" />
    Sign in with Google
  </button>
  
  <!-- Email/Password Form (only in test mode) -->
  <div id="email-auth-form" style="display: none;">
    <div class="divider">
      <span>OR</span>
    </div>
    <form id="login-form">
      <input type="email" placeholder="Email" required />
      <input type="password" placeholder="Password" required />
      <button type="submit">Sign In</button>
    </form>
    <p class="test-mode-notice">Test Mode Enabled</p>
  </div>
</div>
```

### Backend Flow

1. **Authorization Request**
   ```
   GET /api/auth/google/authorize
   → Generate state
   → Store state with expiration
   → Return authorization URL
   ```

2. **OAuth Callback**
   ```
   GET /api/auth/google/callback?code=...&state=...
   → Verify state
   → Exchange code for tokens
   → Validate ID token
   → Create/find user
   → Generate JWT
   → Redirect to dashboard with JWT
   ```

3. **Alternative Token Flow** (for SPAs)
   ```
   POST /api/auth/google/token
   Body: { code, state }
   → Same validation as callback
   → Return JWT in JSON response
   ```

### Database Migration

```sql
-- Migration: Add Google SSO support to users table
-- File: scripts/migrations/021_add_google_sso_support.sql

-- Add Google SSO columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Make password_hash nullable for Google SSO users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- Add constraint to ensure either password or google_id exists
ALTER TABLE users ADD CONSTRAINT check_auth_method 
  CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL);

-- Update existing users to have auth_provider set
UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL;
```

### Preferences UI Integration

The Preferences page will display account information:

```html
<div class="preferences-section">
  <h2>Account</h2>
  
  <div class="account-info">
    <div class="info-row">
      <label>Email:</label>
      <span id="user-email">user@example.com</span>
    </div>
    
    <div class="info-row">
      <label>Authentication:</label>
      <span id="auth-method">Google SSO</span>
      <span class="status-badge connected">Connected</span>
    </div>
    
    <div class="info-row">
      <label>Member Since:</label>
      <span id="created-at">January 1, 2025</span>
    </div>
    
    <div class="info-row">
      <label>Last Login:</label>
      <span id="last-login">2 hours ago</span>
    </div>
  </div>
  
  <div class="account-actions">
    <button id="sign-out-btn" class="btn-secondary">Sign Out</button>
  </div>
</div>
```

## Deployment Checklist

- [ ] Set up Google Cloud Console project
- [ ] Configure OAuth 2.0 credentials
- [ ] Add environment variables to production
- [ ] Run database migration
- [ ] Test OAuth flow in staging
- [ ] Verify TEST_MODE is disabled in production
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts
- [ ] Update documentation
- [ ] Train support team on Google SSO troubleshooting

## Monitoring and Metrics

### Key Metrics to Track

1. **Authentication Success Rate**
   - Google SSO success rate
   - Email/password success rate (in test mode)
   - Overall authentication success rate

2. **Error Rates**
   - Token validation failures
   - OAuth flow errors
   - Configuration errors

3. **Performance Metrics**
   - OAuth flow completion time
   - Token validation time
   - User creation time

4. **Usage Metrics**
   - New user signups via Google SSO
   - Returning user logins
   - Test mode usage (should be 0 in production)

### Logging

All authentication events should be logged with:
- Timestamp
- User ID (if available)
- Authentication method
- Success/failure status
- Error details (if failed)
- IP address
- User agent

### Alerts

Set up alerts for:
- High authentication failure rate (>5% in 5 minutes)
- Google API errors
- Configuration errors
- Unusual authentication patterns
- Test mode enabled in production
