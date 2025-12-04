# Google SSO API Documentation

## Overview

This document provides detailed API documentation for the Google SSO authentication endpoints in CatchUp. These endpoints handle OAuth 2.0 authentication flow, user management, and authentication statistics.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.catchup.app`

## Authentication

Most endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Get Authorization URL

Get the Google OAuth authorization URL to initiate the sign-in flow.

**Endpoint**: `GET /api/auth/google/authorize`

**Authentication**: Not required

**Response**: `200 OK`

```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=123456789.apps.googleusercontent.com&redirect_uri=http://localhost:3000/api/auth/google/callback&response_type=code&scope=email%20profile&state=abc123xyz"
}
```

**Response Fields**:
- `authorizationUrl` (string): The URL to redirect the user to for Google authorization

**Usage**:
```javascript
// Frontend example
async function initiateGoogleSSO() {
  const response = await fetch('/api/auth/google/authorize');
  const { authorizationUrl } = await response.json();
  window.location.href = authorizationUrl;
}
```

**Error Responses**:
- `500 Internal Server Error`: Configuration error or failed to generate URL

---

### 2. OAuth Callback

Handle the OAuth callback from Google after user authorization. This endpoint is called automatically by Google after the user authorizes the application.

**Endpoint**: `GET /api/auth/google/callback`

**Authentication**: Not required

**Query Parameters**:
- `code` (required): Authorization code from Google
- `state` (required): State parameter for CSRF protection

**Response**: `302 Redirect`

Redirects to the application dashboard with JWT token:
- Success: `/?token=<jwt_token>`
- Error: `/?error=<error_message>`

**Process**:
1. Validates state parameter (CSRF protection)
2. Exchanges authorization code for ID token
3. Validates ID token signature and claims
4. Creates or finds user in database
5. Generates JWT token
6. Logs authentication event
7. Redirects to dashboard

**Error Responses**:
- `400 Bad Request`: Missing code or state parameter
- `400 Bad Request`: Invalid state (CSRF protection)
- `401 Unauthorized`: Token validation failed
- `500 Internal Server Error`: Token exchange or user creation failed

---

### 3. Exchange Token (Alternative Flow)

Alternative endpoint for exchanging authorization code for JWT token. Useful for single-page applications that prefer JSON responses over redirects.

**Endpoint**: `POST /api/auth/google/token`

**Authentication**: Not required

**Request Body**:
```json
{
  "code": "4/0AX4XfWh...",
  "state": "abc123xyz"
}
```

**Response**: `200 OK`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "profilePictureUrl": "https://lh3.googleusercontent.com/...",
    "authProvider": "google",
    "role": "user",
    "createdAt": "2025-01-01T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Fields**:
- `user` (object): User information
  - `id` (string): User UUID
  - `email` (string): User's email address
  - `name` (string): User's full name from Google profile
  - `profilePictureUrl` (string): URL to user's Google profile picture
  - `authProvider` (string): Authentication provider ('google', 'email', or 'both')
  - `role` (string): User role ('user' or 'admin')
  - `createdAt` (string): ISO 8601 timestamp of account creation
- `token` (string): JWT token for authentication

**Usage**:
```javascript
// Frontend example
async function handleGoogleCallback(code, state) {
  const response = await fetch('/api/auth/google/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state })
  });
  
  const { user, token } = await response.json();
  localStorage.setItem('token', token);
  // Redirect to dashboard
}
```

**Error Responses**:
- `400 Bad Request`: Missing code or state
- `400 Bad Request`: Invalid state (CSRF protection)
- `401 Unauthorized`: Token validation failed
- `500 Internal Server Error`: Token exchange or user creation failed

---

### 4. Check Connection Status

Check if the current user has Google SSO connected.

**Endpoint**: `GET /api/auth/google/status`

**Authentication**: Required

**Response**: `200 OK`

```json
{
  "connected": true,
  "email": "user@example.com",
  "name": "John Doe",
  "profilePictureUrl": "https://lh3.googleusercontent.com/...",
  "authProvider": "google",
  "connectedAt": "2025-01-01T12:00:00.000Z"
}
```

**Response Fields**:
- `connected` (boolean): Whether Google SSO is connected
- `email` (string): User's email address
- `name` (string): User's full name
- `profilePictureUrl` (string): URL to profile picture
- `authProvider` (string): Authentication provider
- `connectedAt` (string): ISO 8601 timestamp of when Google SSO was connected

**Usage**:
```javascript
// Frontend example
async function checkGoogleSSOStatus() {
  const response = await fetch('/api/auth/google/status', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const status = await response.json();
  if (status.connected) {
    console.log('Google SSO is connected');
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: User not found

---

### 5. Get Test Mode Status

Check if test mode is enabled (allows email/password authentication).

**Endpoint**: `GET /api/auth/test-mode/status`

**Authentication**: Not required

**Response**: `200 OK`

```json
{
  "testMode": true
}
```

**Response Fields**:
- `testMode` (boolean): Whether test mode is enabled

**Usage**:
```javascript
// Frontend example
async function checkTestMode() {
  const response = await fetch('/api/auth/test-mode/status');
  const { testMode } = await response.json();
  
  if (testMode) {
    // Show email/password form
    document.getElementById('email-auth-form').style.display = 'block';
  } else {
    // Hide email/password form
    document.getElementById('email-auth-form').style.display = 'none';
  }
}
```

---

### 6. Get Authentication Statistics

Get authentication statistics for the current user.

**Endpoint**: `GET /api/auth/statistics`

**Authentication**: Required

**Query Parameters**:
- `startDate` (optional): ISO 8601 date string (default: 30 days ago)
- `endDate` (optional): ISO 8601 date string (default: now)
- `userId` (optional): Filter by specific user (admin only)

**Response**: `200 OK`

```json
{
  "totalAuthentications": 150,
  "googleSSOAuthentications": 120,
  "emailPasswordAuthentications": 30,
  "googleSSOPercentage": 80.0,
  "emailPasswordPercentage": 20.0,
  "timeRange": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-01-31T23:59:59.999Z"
  },
  "breakdown": {
    "successful": {
      "googleSSO": 115,
      "emailPassword": 28
    },
    "failed": {
      "googleSSO": 5,
      "emailPassword": 2
    }
  }
}
```

**Response Fields**:
- `totalAuthentications` (number): Total authentication attempts
- `googleSSOAuthentications` (number): Google SSO authentication attempts
- `emailPasswordAuthentications` (number): Email/password authentication attempts
- `googleSSOPercentage` (number): Percentage of Google SSO authentications
- `emailPasswordPercentage` (number): Percentage of email/password authentications
- `timeRange` (object): Time range for statistics
  - `start` (string): Start date (ISO 8601)
  - `end` (string): End date (ISO 8601)
- `breakdown` (object): Breakdown by success/failure
  - `successful` (object): Successful authentications by method
  - `failed` (object): Failed authentications by method

**Usage**:
```javascript
// Frontend example
async function getAuthStats() {
  const response = await fetch('/api/auth/statistics', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const stats = await response.json();
  console.log(`Google SSO: ${stats.googleSSOPercentage}%`);
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Attempting to access other user's statistics without admin role

---

### 7. Get Global Authentication Statistics

Get global authentication statistics across all users (admin only).

**Endpoint**: `GET /api/auth/statistics/global`

**Authentication**: Required (Admin role)

**Query Parameters**:
- `startDate` (optional): ISO 8601 date string (default: 30 days ago)
- `endDate` (optional): ISO 8601 date string (default: now)

**Response**: `200 OK`

```json
{
  "totalAuthentications": 1500,
  "googleSSOAuthentications": 1200,
  "emailPasswordAuthentications": 300,
  "googleSSOPercentage": 80.0,
  "emailPasswordPercentage": 20.0,
  "timeRange": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-01-31T23:59:59.999Z"
  },
  "breakdown": {
    "successful": {
      "googleSSO": 1150,
      "emailPassword": 280
    },
    "failed": {
      "googleSSO": 50,
      "emailPassword": 20
    }
  },
  "userCount": 250,
  "newUsersThisPeriod": 45
}
```

**Response Fields**: Same as user statistics, plus:
- `userCount` (number): Total number of users
- `newUsersThisPeriod` (number): New users created in the time range

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User does not have admin role

---

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "details": "Additional error details (development only)"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CONFIG` | 500 | Google SSO configuration is invalid |
| `INVALID_CODE` | 400 | Authorization code is invalid |
| `TOKEN_EXCHANGE_FAILED` | 500 | Failed to exchange code for token |
| `INVALID_TOKEN` | 401 | ID token is invalid |
| `TOKEN_EXPIRED` | 401 | ID token has expired |
| `STATE_MISMATCH` | 400 | State parameter doesn't match (CSRF) |
| `USER_CREATION_FAILED` | 500 | Failed to create user account |
| `EMAIL_CONFLICT` | 400 | Email already exists with different auth provider |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |

### Example Error Response

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid authentication token. Please try again.",
    "details": "Token signature verification failed"
  }
}
```

## Rate Limiting

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2025-01-01T12:00:00Z
```

### Rate Limits by Endpoint

| Endpoint | Window | Max Requests |
|----------|--------|--------------|
| `/api/auth/google/authorize` | 1 minute | 10 |
| `/api/auth/google/callback` | 1 minute | 20 |
| `/api/auth/google/token` | 1 minute | 5 |
| `/api/auth/google/status` | 1 minute | 60 |
| `/api/auth/statistics` | 1 minute | 60 |

### Rate Limit Exceeded Response

**Status**: `429 Too Many Requests`

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 30 seconds.",
  "retryAfter": 30
}
```

**Headers**:
```
Retry-After: 30
```

## Security

### CSRF Protection

All OAuth flows use state parameter for CSRF protection:
1. Server generates random state value
2. State is stored with expiration (5 minutes)
3. State is included in authorization URL
4. Google returns state in callback
5. Server validates state matches stored value

### Token Validation

ID tokens from Google are validated:
1. Signature verification using Google's public keys
2. Issuer verification (`https://accounts.google.com`)
3. Audience verification (matches client ID)
4. Expiration verification
5. Email verification (email_verified claim)

### Token Storage

- OAuth tokens are encrypted at rest using AES-256-GCM
- JWT tokens are signed with HS256
- Tokens are never logged or exposed in error messages

### Audit Logging

All authentication events are logged:
- Successful authentications
- Failed authentication attempts
- Token validation failures
- Configuration errors
- Security events (state mismatch, invalid tokens)

## Best Practices

### Frontend Integration

1. **Check test mode on page load**:
```javascript
async function initAuth() {
  const { testMode } = await fetch('/api/auth/test-mode/status').then(r => r.json());
  if (!testMode) {
    hideEmailPasswordForm();
  }
}
```

2. **Handle OAuth callback**:
```javascript
// Parse URL parameters
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const error = params.get('error');

if (token) {
  localStorage.setItem('token', token);
  // Redirect to dashboard
} else if (error) {
  showError(error);
}
```

3. **Store JWT token securely**:
```javascript
// Use httpOnly cookies for production
// Or localStorage for development
localStorage.setItem('token', token);
```

4. **Include token in requests**:
```javascript
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

### Error Handling

1. **Display user-friendly messages**:
```javascript
try {
  const response = await fetch('/api/auth/google/token', {
    method: 'POST',
    body: JSON.stringify({ code, state })
  });
  
  if (!response.ok) {
    const { error } = await response.json();
    showError(error.message);
  }
} catch (err) {
  showError('An unexpected error occurred. Please try again.');
}
```

2. **Handle rate limiting**:
```javascript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  showError(`Too many requests. Please try again in ${retryAfter} seconds.`);
}
```

3. **Retry on transient errors**:
```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status < 500) throw new Error('Client error');
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Examples

### Complete OAuth Flow

```javascript
// 1. Initiate OAuth flow
async function signInWithGoogle() {
  try {
    const response = await fetch('/api/auth/google/authorize');
    const { authorizationUrl } = await response.json();
    window.location.href = authorizationUrl;
  } catch (error) {
    console.error('Failed to initiate Google SSO:', error);
  }
}

// 2. Handle callback (on page load)
async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const error = params.get('error');
  
  if (token) {
    localStorage.setItem('token', token);
    window.location.href = '/dashboard';
  } else if (error) {
    alert(`Authentication failed: ${error}`);
  }
}

// 3. Check authentication status
async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const response = await fetch('/api/auth/google/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const status = await response.json();
      return status.connected;
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
  }
  
  return false;
}
```

### Alternative Token Exchange Flow

```javascript
// For SPAs that prefer JSON responses
async function handleGoogleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  
  if (!code || !state) {
    console.error('Missing code or state parameter');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/google/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state })
    });
    
    if (response.ok) {
      const { user, token } = await response.json();
      localStorage.setItem('token', token);
      console.log('Logged in as:', user.email);
      window.location.href = '/dashboard';
    } else {
      const { error } = await response.json();
      alert(`Authentication failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Failed to exchange token:', error);
  }
}
```

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [People API Documentation](https://developers.google.com/people)
- [JWT Documentation](https://jwt.io/)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
