# Google Calendar Integration

This module implements Google Calendar OAuth 2.0 integration for CatchUp, enabling users to connect their calendars and detect availability for smart scheduling.

## Architecture

### Files

- **google-calendar-config.ts** - OAuth 2.0 configuration and token management
- **google-calendar-service.ts** - Calendar API operations (events, availability)
- **google-calendar-oauth.test.ts** - Unit tests for OAuth flow

### API Routes

- **google-calendar-oauth.ts** - OAuth flow endpoints
- **calendar-api.ts** - Calendar data endpoints

## OAuth Flow

### 1. Authorization Request

User clicks "Connect Google Calendar" button, which calls:

```
GET /api/calendar/oauth/authorize
```

Returns authorization URL that redirects user to Google consent screen.

### 2. User Consent

User grants permissions on Google's consent screen. Google redirects back to:

```
GET /api/calendar/oauth/callback?code=AUTHORIZATION_CODE
```

### 3. Token Exchange

Backend exchanges authorization code for access and refresh tokens:

```typescript
const tokens = await getTokensFromCode(code);
```

Tokens are encrypted and stored in `oauth_tokens` table.

### 4. Token Storage

Tokens are stored with encryption:

```typescript
await upsertToken(
  userId,
  'google_calendar',
  accessToken,
  refreshToken,
  tokenType,
  expiresAt,
  scope
);
```

## API Endpoints

### OAuth Management

**GET /api/calendar/oauth/authorize**
- Returns authorization URL
- No authentication required

**GET /api/calendar/oauth/callback**
- Handles OAuth callback
- Requires `code` query parameter
- Requires JWT authentication
- Stores tokens in database

**GET /api/calendar/oauth/status**
- Check if user has connected Google Calendar
- Requires JWT authentication
- Returns: `{ connected: boolean, expiresAt: Date | null }`

**DELETE /api/calendar/oauth/disconnect**
- Disconnect Google Calendar
- Requires JWT authentication
- Deletes stored tokens

### Calendar Data

**GET /api/calendar/api/events**
- Fetch calendar events for date range
- Requires JWT authentication
- Query params: `startTime`, `endTime` (ISO 8601)
- Returns: `{ events: CalendarEvent[] }`

**GET /api/calendar/api/available-slots**
- Get available time slots
- Requires JWT authentication
- Query params: `startTime`, `endTime`, `slotDurationMinutes` (optional)
- Returns: `{ slots: Array<{ start: Date, end: Date }> }`

## Security

### Token Encryption

All tokens are encrypted at rest using `ENCRYPTION_KEY`:

```typescript
const encryptedToken = encryptToken(accessToken);
```

### Scopes

Only read-only scopes are requested:

- `calendar.readonly` - Read calendar events
- `userinfo.email` - Get user email
- `userinfo.profile` - Get user profile

### Token Refresh

Refresh tokens are stored and used to obtain new access tokens when needed. The system automatically handles token expiration.

## Usage Examples

### Frontend

```javascript
// Connect calendar
async function connectCalendar() {
  const response = await fetch('/api/calendar/oauth/authorize');
  const data = await response.json();
  window.location.href = data.authUrl;
}

// Check connection status
async function checkCalendarConnection() {
  const response = await fetch('/api/calendar/oauth/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.connected;
}

// Get available slots
async function getAvailableSlots(startTime, endTime) {
  const response = await fetch(
    `/api/calendar/api/available-slots?startTime=${startTime}&endTime=${endTime}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await response.json();
  return data.slots;
}
```

### Backend

```typescript
import { getCalendarEvents, getAvailableSlots } from './google-calendar-service';
import { getToken } from './oauth-repository';

// Get user's calendar events
const token = await getToken(userId, 'google_calendar');
const events = await getCalendarEvents(
  {
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    token_type: token.tokenType
  },
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

// Get available slots
const slots = await getAvailableSlots(
  {
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    token_type: token.tokenType
  },
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  30 // 30-minute slots
);
```

## Testing

### Unit Tests

Run tests with:

```bash
npm run test -- google-calendar-oauth.test.ts
```

Tests cover:
- Authorization URL generation
- Scope validation
- Error handling for missing credentials

### Manual Testing

1. Start development server: `npm run dev`
2. Get authorization URL:
   ```bash
   curl http://localhost:3000/api/calendar/oauth/authorize
   ```
3. Visit the returned URL and authorize
4. Check connection status:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/calendar/oauth/status
   ```

## Troubleshooting

### "Invalid client" error
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Check redirect URI matches exactly in Google Cloud Console

### "Token expired" error
- System should automatically refresh using refresh token
- If refresh fails, user needs to re-authorize

### "Calendar not connected" error
- User hasn't completed OAuth flow
- Call `/api/calendar/oauth/authorize` to start flow

## Environment Variables

Required:
- `GOOGLE_CLIENT_ID` - OAuth client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `GOOGLE_REDIRECT_URI` - Redirect URI (e.g., `http://localhost:3000/auth/google/callback`)
- `ENCRYPTION_KEY` - For encrypting stored tokens

Optional:
- `TEST_GOOGLE_EMAIL` - Test account email for development
- `TEST_GOOGLE_PASSWORD` - Test account password for development

## References

- [Google Calendar API](https://developers.google.com/calendar/api)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
