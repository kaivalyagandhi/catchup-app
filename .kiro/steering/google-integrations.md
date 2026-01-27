# Google Integrations Architecture

## Overview

CatchUp integrates with multiple Google services to provide seamless authentication, calendar availability detection, and contact synchronization. All Google integrations follow OAuth 2.0 authentication patterns with read-only access to user data.

## Core Principles

1. **Read-Only Access**: CatchUp NEVER modifies Google data (contacts, calendar events)
2. **User Control**: Users explicitly authorize each integration
3. **Token Security**: OAuth tokens stored securely, never exposed to client
4. **Graceful Degradation**: Features work independently if one integration fails
5. **Rate Limiting**: Respect Google API quotas and implement backoff strategies

## Google Services Integration

### 1. Google Single Sign-On (SSO)

#### Purpose
Provides secure, passwordless authentication using Google accounts.

#### OAuth Scopes
```typescript
[
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid'
]
```

#### Configuration
**Environment Variables**:
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
JWT_SECRET=your-jwt-secret-for-state-tokens
```

#### Authentication Flow

```
1. User clicks "Sign in with Google"
   ↓
2. Frontend: GET /api/auth/google/authorize
   - Server generates CSRF state token (JWT-based)
   - Returns Google OAuth URL with state
   ↓
3. Frontend redirects to Google OAuth URL
   ↓
4. User authenticates with Google
   - Grants permissions
   - Google redirects back to callback URL
   ↓
5. Backend: GET /api/auth/google/callback?code=...&state=...
   - Validates CSRF state token
   - Exchanges code for access/refresh tokens
   - Fetches user profile from Google
   - Creates or updates user in database
   - Generates JWT session token
   ↓
6. Backend redirects to frontend with session token
   ↓
7. Frontend stores JWT token
   - Uses for authenticated API requests
```

#### Key Components

**GoogleSSOService** (`src/api/google-sso-service.ts`)
- Manages OAuth flow
- Token exchange and validation
- User profile fetching
- Error handling with typed errors

**OAuthStateManager** (`src/api/oauth-state-manager.ts`)
- CSRF protection with JWT-based state tokens
- Stateless mode for serverless deployments
- Replay attack prevention
- Automatic cleanup of used states

**GoogleSSOErrorHandler** (`src/api/google-sso-error-handler.ts`)
- Centralized error handling
- User-friendly error messages
- Audit logging for security events
- Rate limiting integration

#### API Endpoints

**GET /api/auth/google/authorize**
```typescript
Response: {
  authUrl: string,  // Google OAuth URL
  state: string     // CSRF protection token
}
```

**GET /api/auth/google/callback**
```typescript
Query Parameters:
  code: string      // Authorization code from Google
  state: string     // CSRF state token

Response: Redirect to frontend with JWT token
```

**GET /api/auth/google/status**
```typescript
Response: {
  connected: boolean,
  email?: string,
  name?: string,
  profilePictureUrl?: string
}
```

#### Security Features

1. **CSRF Protection**: JWT-based state tokens with expiration
2. **Rate Limiting**: 10 requests/minute for authorize, 20 for callback
3. **Token Validation**: Verify state tokens before processing
4. **Audit Logging**: Log all authentication events
5. **Error Handling**: Sanitize error messages in production

#### User Data Storage

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  profile_picture_url TEXT,
  google_id VARCHAR(255) UNIQUE,
  auth_provider VARCHAR(20) DEFAULT 'google',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Google Calendar Integration

#### Purpose
Detects user availability by analyzing calendar events to suggest optimal times for catching up with contacts.

#### OAuth Scopes
```typescript
[
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]
```

#### Configuration
**Environment Variables**:
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback
```

#### Key Features

1. **Multi-Calendar Support**: Users can select which calendars to monitor
2. **Free Time Detection**: Identifies available time slots
3. **Event Analysis**: Filters busy/free events
4. **Sync Management**: Periodic refresh of calendar data

#### Architecture Components

**CalendarService** (`src/calendar/calendar-service.ts`)
- Calendar listing and selection
- Free time slot detection
- Event filtering and analysis
- Multi-calendar aggregation

**GoogleCalendarService** (`src/integrations/google-calendar-service.ts`)
- Google Calendar API client wrapper
- Event fetching with pagination
- User profile retrieval
- Token refresh handling

**CalendarRepository** (`src/calendar/calendar-repository.ts`)
- Database operations for calendar metadata
- Selection state management
- Sync token storage

#### Calendar Selection Flow

```
1. User connects Google Calendar
   ↓
2. OAuth flow (similar to SSO)
   - User grants calendar.readonly permission
   ↓
3. Backend fetches calendar list
   - GET /api/calendar/list
   - Returns all calendars from Google account
   ↓
4. User selects calendars to monitor
   - POST /api/calendar/selection
   - Stores selection in database
   ↓
5. Backend syncs calendar metadata
   - Stores calendar names, IDs, primary status
   - Marks selected calendars
```

#### Free Time Detection

```typescript
// Configuration
{
  dateRange: {
    start: Date,
    end: Date
  },
  minSlotDuration: 30,  // minutes
  workingHours: {
    start: 9,   // 9 AM
    end: 17     // 5 PM
  }
}

// Algorithm
1. Fetch events from all selected calendars
2. Filter out:
   - All-day events
   - Transparent (free) events
   - Declined events
3. Merge overlapping events
4. Identify gaps between events
5. Filter gaps by minimum duration
6. Apply working hours constraints
7. Return available time slots
```

#### API Endpoints

**GET /api/calendar/list**
```typescript
Response: {
  calendars: [
    {
      id: string,
      calendarId: string,
      name: string,
      isPrimary: boolean,
      selected: boolean
    }
  ]
}
```

**POST /api/calendar/selection**
```typescript
Request: {
  calendarIds: string[]
}

Response: {
  success: boolean,
  selectedCount: number
}
```

**GET /api/calendar/free-slots**
```typescript
Query Parameters:
  start: ISO date string
  end: ISO date string
  minDuration: number (minutes)

Response: {
  slots: [
    {
      start: ISO date string,
      end: ISO date string,
      duration: number (minutes)
    }
  ]
}
```

#### Database Schema

```sql
CREATE TABLE google_calendars (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  calendar_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_primary BOOLEAN DEFAULT false,
  selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, calendar_id)
);

CREATE TABLE calendar_sync_state (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  last_sync_at TIMESTAMP,
  sync_token TEXT,
  next_sync_at TIMESTAMP
);
```

#### Token Refresh Pattern

```typescript
// Automatic token refresh on API errors
try {
  const events = await calendar.events.list({ ... });
} catch (error) {
  if (error.code === 401) {
    // Token expired, refresh it
    const newTokens = await refreshAccessToken(refreshToken);
    
    // Update stored tokens
    await updateUserTokens(userId, newTokens);
    
    // Retry request with new token
    const events = await calendar.events.list({ ... });
  }
}
```

### 3. Google Contacts Integration

#### Purpose
One-way synchronization of contacts from Google Contacts to CatchUp for enriched contact management.

#### OAuth Scopes (READ-ONLY)
```typescript
[
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]
```

**IMPORTANT**: Only read-only scopes are used. CatchUp NEVER modifies Google Contacts.

#### Configuration
**Environment Variables**:
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CONTACTS_REDIRECT_URI=http://localhost:3000/api/contacts/google/callback
```

#### Key Features

1. **Full Sync**: Initial import of all contacts
2. **Incremental Sync**: Efficient updates using sync tokens
3. **Streaming Processing**: Memory-efficient handling of large contact lists
4. **Rate Limiting**: Respects Google API quotas
5. **Error Recovery**: Handles partial failures gracefully

#### Architecture Components

**GoogleContactsSyncService** (`src/integrations/google-contacts-sync-service.ts`)
- Orchestrates full and incremental sync
- Streaming contact processing
- Pagination handling
- Sync token management

**GoogleContactsClient** (`src/integrations/google-contacts-client.ts`)
- Read-only API wrapper
- Enforces read-only operations
- Throws errors on write attempts
- Security safeguards

**ImportService** (`src/contacts/import-service.ts`)
- Contact data transformation
- Deduplication logic
- Field mapping and validation
- Batch import operations

**GoogleContactsRateLimiter** (`src/integrations/google-contacts-rate-limiter.ts`)
- Per-user rate limiting
- Exponential backoff
- Quota management
- Request queuing

#### Sync Strategies

**Full Sync** (Initial Import)
```typescript
// Streaming approach - process one page at a time
1. Request first page (500 contacts)
2. Process each contact immediately
3. Import to database
4. Release from memory
5. Request next page
6. Repeat until no more pages
7. Store sync token for incremental updates
```

**Incremental Sync** (Updates)
```typescript
// Use sync token for efficient updates
1. Retrieve stored sync token
2. Request changes since last sync
3. Process only changed/new/deleted contacts
4. Update database
5. Store new sync token
```

#### Contact Data Mapping

```typescript
// Google Person → CatchUp Contact
{
  // Names
  name: person.names[0].displayName,
  firstName: person.names[0].givenName,
  lastName: person.names[0].familyName,
  
  // Contact Info
  email: person.emailAddresses[0].value,
  phone: person.phoneNumbers[0].value,
  
  // Professional
  company: person.organizations[0].name,
  jobTitle: person.organizations[0].title,
  
  // Social
  linkedin: extractLinkedIn(person.urls),
  
  // Metadata
  googleResourceName: person.resourceName,
  googleContactId: extractContactId(person.resourceName),
  source: 'google',
  lastSyncedAt: new Date()
}
```

#### API Endpoints

**POST /api/contacts/google/sync**
```typescript
Request: {
  syncType: 'full' | 'incremental'
}

Response: {
  success: boolean,
  contactsImported: number,
  contactsUpdated: number,
  contactsDeleted: number,
  errors: SyncError[]
}
```

**GET /api/contacts/google/sync-status**
```typescript
Response: {
  lastSyncAt: ISO date string,
  nextSyncAt: ISO date string,
  syncInProgress: boolean,
  totalContacts: number
}
```

#### Database Schema

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  job_title VARCHAR(255),
  google_resource_name VARCHAR(255),
  google_contact_id VARCHAR(255),
  source VARCHAR(50) DEFAULT 'manual',
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE google_contacts_sync_state (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  sync_token TEXT,
  last_full_sync_at TIMESTAMP,
  last_incremental_sync_at TIMESTAMP,
  sync_in_progress BOOLEAN DEFAULT false,
  total_contacts INTEGER DEFAULT 0
);
```

#### Read-Only Enforcement

```typescript
// Security check in GoogleContactsClient
private validateReadOnlyOperation(method: string): void {
  const allowedMethods = ['GET'];
  
  if (!allowedMethods.includes(method)) {
    throw new Error(
      `SECURITY ERROR: Write operation attempted on Google Contacts API. ` +
      `Method '${method}' is not allowed. Only GET requests are permitted.`
    );
  }
}

// Disabled write methods throw errors
async createContact(): Promise<never> {
  throw new Error(
    'SECURITY ERROR: Creating contacts in Google Contacts is not supported. ' +
    'CatchUp operates in read-only mode.'
  );
}
```

#### Rate Limiting Strategy

```typescript
// Per-user rate limits
{
  requestsPerMinute: 60,
  requestsPerDay: 10000,
  burstSize: 10
}

// Exponential backoff on rate limit errors
{
  initialDelay: 1000,      // 1 second
  maxDelay: 60000,         // 1 minute
  backoffMultiplier: 2,
  maxRetries: 5
}
```

## Common Patterns

### OAuth Flow Pattern

All Google integrations follow this OAuth 2.0 flow:

```typescript
// 1. Generate authorization URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',  // Get refresh token
  scope: SCOPES,
  prompt: 'consent',       // Force consent screen
  state: csrfToken         // CSRF protection
});

// 2. Exchange code for tokens
const { tokens } = await oauth2Client.getToken(code);
// tokens = { access_token, refresh_token, expiry_date }

// 3. Store tokens securely
await storeUserTokens(userId, tokens);

// 4. Use tokens for API calls
oauth2Client.setCredentials(tokens);
const api = google.calendar({ version: 'v3', auth: oauth2Client });
```

### Token Refresh Pattern

```typescript
// Check token expiry before API calls
async function ensureValidToken(userId: string): Promise<Credentials> {
  const tokens = await getUserTokens(userId);
  
  // Check if token is expired or will expire soon
  const expiryDate = new Date(tokens.expiry_date);
  const now = new Date();
  const bufferMinutes = 5;
  
  if (expiryDate.getTime() - now.getTime() < bufferMinutes * 60 * 1000) {
    // Token expired or expiring soon, refresh it
    const newTokens = await refreshAccessToken(tokens.refresh_token);
    await updateUserTokens(userId, newTokens);
    return newTokens;
  }
  
  return tokens;
}
```

### Error Handling Pattern

```typescript
// Standardized error handling for Google API calls
try {
  const result = await googleApiCall();
  return result;
} catch (error) {
  if (error.code === 401) {
    // Unauthorized - token expired
    await refreshTokenAndRetry();
  } else if (error.code === 403) {
    // Forbidden - insufficient permissions
    throw new Error('Missing required permissions');
  } else if (error.code === 429) {
    // Rate limit exceeded
    await exponentialBackoff();
  } else if (error.code >= 500) {
    // Server error - retry with backoff
    await retryWithBackoff();
  } else {
    // Client error - don't retry
    throw error;
  }
}
```

### Pagination Pattern

```typescript
// Handle paginated responses
async function fetchAllPages<T>(
  fetchPage: (pageToken?: string) => Promise<{ items: T[], nextPageToken?: string }>
): Promise<T[]> {
  const allItems: T[] = [];
  let pageToken: string | undefined;
  
  do {
    const response = await fetchPage(pageToken);
    allItems.push(...response.items);
    pageToken = response.nextPageToken;
  } while (pageToken);
  
  return allItems;
}
```

### Streaming Processing Pattern

```typescript
// Memory-efficient processing for large datasets
async function processContactsStreaming(userId: string): Promise<void> {
  let pageToken: string | undefined;
  
  do {
    // Fetch one page
    const response = await fetchContactsPage(pageToken);
    
    // Process immediately
    for (const contact of response.contacts) {
      await processContact(userId, contact);
    }
    
    // Release memory
    pageToken = response.nextPageToken;
    
    // Force garbage collection if available
    if (global.gc) global.gc();
    
  } while (pageToken);
}
```

## Security Best Practices

### 1. Token Storage
- Store tokens encrypted in database
- Never expose tokens to client-side code
- Use environment variables for OAuth credentials
- Rotate tokens regularly

### 2. Scope Minimization
- Request only necessary scopes
- Use read-only scopes when possible
- Document why each scope is needed
- Review scopes periodically

### 3. CSRF Protection
- Use state parameter in OAuth flow
- Validate state token on callback
- Implement token expiration
- Prevent replay attacks

### 4. Rate Limiting
- Implement per-user rate limits
- Use exponential backoff
- Queue requests during high load
- Monitor quota usage

### 5. Error Handling
- Sanitize error messages in production
- Log security events
- Implement audit trail
- Alert on suspicious activity

## Performance Optimization

### 1. Caching
- Cache calendar metadata (1 hour TTL)
- Cache contact lists (30 minutes TTL)
- Invalidate cache on user-initiated sync
- Use Redis for distributed caching

### 2. Batch Processing
- Batch contact imports (100 at a time)
- Use database transactions
- Implement retry logic
- Monitor batch performance

### 3. Async Operations
- Run syncs in background jobs
- Use job queues (Bull/Redis)
- Implement progress tracking
- Notify users on completion

### 4. Connection Pooling
- Reuse OAuth clients
- Pool database connections
- Limit concurrent API requests
- Monitor connection health

## Testing

### Unit Tests
- Mock Google API responses
- Test token refresh logic
- Validate error handling
- Test rate limiting

### Integration Tests
- Test OAuth flow end-to-end
- Verify token storage/retrieval
- Test sync operations
- Validate data mapping

### Manual Tests
- `tests/html/google-sso.test.html` - SSO flow
- `tests/html/google-contacts.test.html` - Contact sync
- Test with real Google accounts
- Verify permissions and scopes

## Monitoring and Observability

### Metrics to Track
- OAuth success/failure rates
- Token refresh frequency
- API request latency
- Rate limit hits
- Sync duration and throughput
- Error rates by type

### Logging
- Log all OAuth events
- Log API errors with context
- Log rate limit events
- Log sync progress

### Alerts
- Alert on high error rates
- Alert on rate limit exhaustion
- Alert on token refresh failures
- Alert on sync failures

## Related Documentation

- **Google SSO Setup**: `docs/features/google-integrations/GOOGLE_SSO_SETUP.md`
- **Calendar Integration**: `docs/features/google-integrations/CALENDAR_INTEGRATION.md`
- **Contacts Sync**: `docs/features/google-integrations/CONTACTS_SYNC.md`
- **API Reference**: `docs/API.md` - Google integration endpoints
- **Security Standards**: `.kiro/steering/security.md`
- **Examples**: `docs/examples/backend/integrations/` - Code examples
