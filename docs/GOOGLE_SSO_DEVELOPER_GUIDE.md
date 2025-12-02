# Google SSO Developer Guide

## Overview

This guide provides detailed information for developers working with the Google SSO authentication system in CatchUp. It covers architecture, implementation details, testing strategies, and best practices.

## Table of Contents

1. [Architecture](#architecture)
2. [Implementation Details](#implementation-details)
3. [Test Mode](#test-mode)
4. [Security Considerations](#security-considerations)
5. [Testing](#testing)
6. [Extending the System](#extending-the-system)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring and Debugging](#monitoring-and-debugging)

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

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ google-sso.js│  │  app.js      │  │ index.html   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      API Layer                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │           google-sso.ts (Routes)                 │   │
│  │  - GET /authorize                                │   │
│  │  - GET /callback                                 │   │
│  │  - POST /token                                   │   │
│  │  - GET /status                                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ GoogleSSO    │  │ AuthService  │  │ OAuthState   │  │
│  │ Service      │  │              │  │ Manager      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ User         │  │ OAuth Token  │  │ Audit Log    │  │
│  │ Repository   │  │ Repository   │  │ Repository   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. GoogleSSOService (`src/api/google-sso-service.ts`)

Handles OAuth 2.0 flow with Google:
- Generates authorization URLs
- Exchanges authorization codes for tokens
- Validates ID tokens
- Extracts user information

**Key Methods**:
```typescript
class GoogleSSOService {
  getAuthorizationUrl(state: string): string
  exchangeCodeForToken(code: string): Promise<GoogleTokenResponse>
  validateAndDecodeToken(idToken: string): Promise<GoogleUserInfo>
  verifyTokenSignature(idToken: string): Promise<boolean>
}
```

#### 2. AuthService (`src/api/auth-service.ts`)

Extended to support Google SSO:
- Authenticates users via Google
- Creates new users from Google profiles
- Links Google accounts to existing users
- Generates JWT tokens

**Key Functions**:
```typescript
async function authenticateWithGoogle(idToken: string): Promise<{
  user: User;
  token: string;
}>

async function linkGoogleAccount(
  userId: string,
  googleUserId: string,
  email: string
): Promise<void>
```

#### 3. OAuthStateManager (`src/api/oauth-state-manager.ts`)

Manages OAuth state for CSRF protection:
- Generates cryptographically random state values
- Stores state with expiration (5 minutes)
- Validates state on callback
- Automatically cleans up expired states

**Key Methods**:
```typescript
class OAuthStateManager {
  generateState(): string
  storeState(state: string): void
  validateState(state: string): boolean
  cleanupExpiredStates(): void
}
```

#### 4. Test Mode Middleware (`src/api/middleware/test-mode.ts`)

Enforces test mode restrictions:
- Checks TEST_MODE environment variable
- Blocks email/password endpoints when disabled
- Adds test mode indicator to responses

**Usage**:
```typescript
import { enforceTestMode } from './middleware/test-mode';

// Apply to email/password routes
router.post('/register', enforceTestMode, registerHandler);
router.post('/login', enforceTestMode, loginHandler);
```

## Implementation Details

### OAuth Flow Implementation

#### Step 1: Generate Authorization URL

```typescript
// src/api/routes/google-sso.ts
router.get('/authorize', async (req, res) => {
  try {
    // Generate random state for CSRF protection
    const state = oauthStateManager.generateState();
    oauthStateManager.storeState(state);
    
    // Generate authorization URL
    const authorizationUrl = googleSSOService.getAuthorizationUrl(state);
    
    res.json({ authorizationUrl });
  } catch (error) {
    handleError(error, res);
  }
});
```

#### Step 2: Handle Callback

```typescript
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Validate state (CSRF protection)
    if (!oauthStateManager.validateState(state as string)) {
      throw new GoogleSSOError('State mismatch', 'STATE_MISMATCH', ...);
    }
    
    // Exchange code for tokens
    const tokens = await googleSSOService.exchangeCodeForToken(code as string);
    
    // Validate and decode ID token
    const userInfo = await googleSSOService.validateAndDecodeToken(tokens.id_token);
    
    // Authenticate or create user
    const { user, token } = await authenticateWithGoogle(tokens.id_token);
    
    // Log authentication event
    await auditLog.log({
      action: 'google_sso_login',
      userId: user.id,
      success: true
    });
    
    // Redirect with token
    res.redirect(`/?token=${token}`);
  } catch (error) {
    handleError(error, res);
  }
});
```

#### Step 3: Token Validation

```typescript
// src/api/google-sso-service.ts
async validateAndDecodeToken(idToken: string): Promise<GoogleUserInfo> {
  // Decode token without verification first
  const decoded = jwt.decode(idToken, { complete: true });
  
  // Verify signature using Google's public keys
  const isValid = await this.verifyTokenSignature(idToken);
  if (!isValid) {
    throw new GoogleSSOError('Invalid token signature', 'INVALID_TOKEN', ...);
  }
  
  // Verify claims
  const payload = decoded.payload;
  
  // Check issuer
  if (payload.iss !== 'https://accounts.google.com' && 
      payload.iss !== 'accounts.google.com') {
    throw new GoogleSSOError('Invalid issuer', 'INVALID_TOKEN', ...);
  }
  
  // Check audience
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new GoogleSSOError('Invalid audience', 'INVALID_TOKEN', ...);
  }
  
  // Check expiration
  if (payload.exp < Date.now() / 1000) {
    throw new GoogleSSOError('Token expired', 'TOKEN_EXPIRED', ...);
  }
  
  // Check email verification
  if (!payload.email_verified) {
    throw new GoogleSSOError('Email not verified', 'INVALID_TOKEN', ...);
  }
  
  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
    name: payload.name,
    picture: payload.picture
  };
}
```

### User Creation and Account Linking

```typescript
// src/api/auth-service.ts
export async function authenticateWithGoogle(
  idToken: string
): Promise<{ user: User; token: string }> {
  // Validate and decode token
  const userInfo = await googleSSOService.validateAndDecodeToken(idToken);
  
  // Try to find user by google_id
  let user = await userRepository.findByGoogleId(userInfo.sub);
  
  if (!user) {
    // Try to find by email (for account linking)
    user = await userRepository.findByEmail(userInfo.email);
    
    if (user) {
      // Link Google account to existing user
      await userRepository.update(user.id, {
        google_id: userInfo.sub,
        auth_provider: user.password_hash ? 'both' : 'google',
        name: userInfo.name,
        profile_picture_url: userInfo.picture
      });
    } else {
      // Create new user
      user = await userRepository.create({
        email: userInfo.email,
        google_id: userInfo.sub,
        auth_provider: 'google',
        name: userInfo.name,
        profile_picture_url: userInfo.picture,
        role: 'user'
      });
    }
  }
  
  // Generate JWT token
  const token = generateJWT({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  
  return { user, token };
}
```

## Test Mode

### Purpose

Test mode allows developers to use email/password authentication alongside Google SSO for development and testing purposes.

### Configuration

```bash
# .env
TEST_MODE=true  # Enable test mode
TEST_MODE=false # Disable test mode (production)
```

### Implementation

```typescript
// src/api/middleware/test-mode.ts
export function isTestModeEnabled(): boolean {
  return process.env.TEST_MODE === 'true';
}

export function enforceTestMode(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isTestModeEnabled()) {
    return res.status(403).json({
      error: {
        code: 'FEATURE_DISABLED',
        message: 'This feature is only available in test mode'
      }
    });
  }
  next();
}
```

### Frontend Integration

```javascript
// public/js/google-sso.js
async function checkTestMode() {
  const response = await fetch('/api/auth/test-mode/status');
  const { testMode } = await response.json();
  
  const emailForm = document.getElementById('email-auth-form');
  if (testMode) {
    emailForm.style.display = 'block';
  } else {
    emailForm.style.display = 'none';
  }
}
```

### Best Practices

1. **Always disable in production**: Set `TEST_MODE=false`
2. **Use for development only**: Never enable in production
3. **Test both modes**: Ensure your code works with test mode on and off
4. **Document test accounts**: Keep a list of test accounts for development

## Security Considerations

### CSRF Protection

State parameter prevents CSRF attacks:

```typescript
// Generate state
const state = crypto.randomBytes(32).toString('hex');

// Store with expiration
stateStore.set(state, {
  createdAt: Date.now(),
  expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
});

// Validate on callback
if (!stateStore.has(state)) {
  throw new Error('Invalid state');
}
```

### Token Validation

Comprehensive ID token validation:

1. **Signature verification**: Using Google's public keys
2. **Issuer verification**: Must be Google
3. **Audience verification**: Must match client ID
4. **Expiration verification**: Token must not be expired
5. **Email verification**: Email must be verified by Google

### Token Storage

- **OAuth tokens**: Encrypted at rest using AES-256-GCM
- **JWT tokens**: Signed with HS256
- **Never log tokens**: Tokens are never logged or exposed in errors

### Rate Limiting

```typescript
// Apply rate limiting to OAuth endpoints
import rateLimit from 'express-rate-limit';

const oauthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many OAuth requests'
});

router.get('/authorize', oauthLimiter, authorizeHandler);
router.get('/callback', oauthLimiter, callbackHandler);
```

### Audit Logging

All authentication events are logged:

```typescript
await auditLog.log({
  action: 'google_sso_login',
  userId: user.id,
  email: user.email,
  success: true,
  timestamp: new Date(),
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

## Testing

### Unit Tests

Test individual components:

```typescript
// src/api/google-sso-service.test.ts
describe('GoogleSSOService', () => {
  describe('getAuthorizationUrl', () => {
    it('should generate valid authorization URL', () => {
      const state = 'test-state';
      const url = service.getAuthorizationUrl(state);
      
      expect(url).toContain('accounts.google.com');
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('scope=email%20profile');
    });
  });
  
  describe('validateAndDecodeToken', () => {
    it('should validate valid token', async () => {
      const token = createMockToken();
      const userInfo = await service.validateAndDecodeToken(token);
      
      expect(userInfo.email).toBe('test@example.com');
    });
    
    it('should reject expired token', async () => {
      const token = createExpiredToken();
      
      await expect(service.validateAndDecodeToken(token))
        .rejects.toThrow('Token expired');
    });
  });
});
```

### Integration Tests

Test complete flows:

```typescript
// src/api/google-sso-integration.test.ts
describe('Google SSO Integration', () => {
  it('should complete full OAuth flow', async () => {
    // 1. Get authorization URL
    const authResponse = await request(app)
      .get('/api/auth/google/authorize')
      .expect(200);
    
    const { authorizationUrl } = authResponse.body;
    expect(authorizationUrl).toContain('accounts.google.com');
    
    // 2. Mock Google callback
    const mockCode = 'mock-auth-code';
    const mockState = extractState(authorizationUrl);
    
    // 3. Exchange code for token
    const tokenResponse = await request(app)
      .post('/api/auth/google/token')
      .send({ code: mockCode, state: mockState })
      .expect(200);
    
    const { user, token } = tokenResponse.body;
    expect(user.email).toBe('test@example.com');
    expect(token).toBeDefined();
    
    // 4. Verify user in database
    const dbUser = await userRepository.findById(user.id);
    expect(dbUser.google_id).toBeDefined();
    expect(dbUser.auth_provider).toBe('google');
  });
});
```

### Property-Based Tests (Optional)

Test universal properties:

```typescript
import fc from 'fast-check';

describe('Google SSO Properties', () => {
  it('Property: Authorization URL contains required parameters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 50 }), // Random state
        (state) => {
          const url = service.getAuthorizationUrl(state);
          const urlObj = new URL(url);
          
          expect(urlObj.searchParams.get('client_id')).toBe(process.env.GOOGLE_CLIENT_ID);
          expect(urlObj.searchParams.get('scope')).toBe('email profile');
          expect(urlObj.searchParams.get('state')).toBe(state);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Manual Testing

1. **Test OAuth flow**:
   - Click "Sign in with Google"
   - Complete authorization
   - Verify redirect and login

2. **Test test mode**:
   - Set `TEST_MODE=true`
   - Verify email/password form appears
   - Set `TEST_MODE=false`
   - Verify email/password form is hidden

3. **Test error handling**:
   - Use invalid credentials
   - Verify error messages
   - Check audit logs

## Extending the System

### Adding New OAuth Providers

To add another OAuth provider (e.g., GitHub, Microsoft):

1. **Create provider service**:
```typescript
// src/api/github-sso-service.ts
export class GitHubSSOService {
  getAuthorizationUrl(state: string): string { ... }
  exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> { ... }
  validateAndDecodeToken(token: string): Promise<GitHubUserInfo> { ... }
}
```

2. **Extend user model**:
```sql
ALTER TABLE users ADD COLUMN github_id VARCHAR(255);
ALTER TABLE users ADD COLUMN github_username VARCHAR(255);
```

3. **Add routes**:
```typescript
router.get('/auth/github/authorize', ...);
router.get('/auth/github/callback', ...);
```

4. **Update frontend**:
```html
<button id="github-sso-btn">Sign in with GitHub</button>
```

### Adding Custom Claims to JWT

```typescript
function generateJWT(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      authProvider: user.auth_provider,
      // Add custom claims
      customClaim: 'value'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
```

### Adding OAuth Scopes

To request additional scopes:

```typescript
// src/api/google-sso-service.ts
getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: this.clientId,
    redirect_uri: this.redirectUri,
    response_type: 'code',
    scope: 'email profile https://www.googleapis.com/auth/calendar.readonly', // Add scope
    state
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
```

**Note**: Additional scopes require OAuth consent screen update and may require app verification.

## Performance Optimization

### Caching Google's Public Keys

```typescript
// Cache public keys for 24 hours
const publicKeysCache = new Map<string, { keys: any; expiresAt: number }>();

async function getGooglePublicKeys() {
  const cached = publicKeysCache.get('google');
  if (cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }
  
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  const keys = await response.json();
  
  publicKeysCache.set('google', {
    keys,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });
  
  return keys;
}
```

### Connection Pooling

Use connection pooling for database:

```typescript
// src/db/connection.ts
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### Async Processing

Process non-critical tasks asynchronously:

```typescript
// Don't wait for audit logging
authenticateWithGoogle(idToken).then(({ user, token }) => {
  // Return immediately
  res.json({ user, token });
  
  // Log asynchronously
  auditLog.log({ ... }).catch(err => console.error('Audit log failed:', err));
});
```

## Monitoring and Debugging

### Logging

Use structured logging:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log authentication events
logger.info('Google SSO authentication', {
  userId: user.id,
  email: user.email,
  success: true,
  timestamp: new Date()
});
```

### Metrics

Track key metrics:

```typescript
// Track authentication attempts
metrics.increment('auth.google_sso.attempts');
metrics.increment('auth.google_sso.success');
metrics.increment('auth.google_sso.failure');

// Track timing
const startTime = Date.now();
await authenticateWithGoogle(idToken);
metrics.timing('auth.google_sso.duration', Date.now() - startTime);
```

### Error Tracking

Use error tracking service:

```typescript
import * as Sentry from '@sentry/node';

try {
  await authenticateWithGoogle(idToken);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'google-sso',
      action: 'authenticate'
    },
    extra: {
      userId: user?.id,
      email: user?.email
    }
  });
  throw error;
}
```

### Health Checks

Add health check endpoint:

```typescript
router.get('/health/google-sso', async (req, res) => {
  try {
    // Check configuration
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('Missing GOOGLE_CLIENT_ID');
    }
    
    // Check Google's public keys are accessible
    await fetch('https://www.googleapis.com/oauth2/v3/certs');
    
    res.json({ status: 'healthy' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

## Best Practices

1. **Always validate tokens**: Never trust tokens without validation
2. **Use HTTPS in production**: OAuth requires HTTPS
3. **Keep secrets secure**: Never commit secrets to version control
4. **Log authentication events**: Maintain audit trail
5. **Handle errors gracefully**: Provide user-friendly error messages
6. **Test thoroughly**: Test both success and failure scenarios
7. **Monitor metrics**: Track authentication success/failure rates
8. **Keep dependencies updated**: Regularly update OAuth libraries
9. **Document changes**: Keep documentation up to date
10. **Review security regularly**: Conduct security audits

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [People API Documentation](https://developers.google.com/people)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
