---
inclusion: manual
---


# Google Calendar OAuth Integration

## Overview

CatchUp uses Google Calendar OAuth 2.0 to read user calendar events and detect availability. This steering document outlines the setup and testing requirements.

## Environment Configuration

### Required Environment Variables

Add these to your `.env` file:

```
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Test Google Account (for development and testing)
TEST_GOOGLE_EMAIL=your_test_google_email@gmail.com
TEST_GOOGLE_PASSWORD=your_test_google_password
```

### Setting Up Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (development)
     - Your production URL (e.g., `https://catchup.app/auth/google/callback`)
   - Copy the Client ID and Client Secret to your `.env` file

### Test Google Account

For development and testing, create a dedicated test Google account:

1. Create a new Gmail account (e.g., `catchup-test-123@gmail.com`)
2. Add the email and password to your `.env` file as `TEST_GOOGLE_EMAIL` and `TEST_GOOGLE_PASSWORD`
3. Create some test calendar events in this account for testing availability detection
4. **IMPORTANT**: Never commit the test account credentials to version control. Keep them in `.env` only.

## API Endpoints

### OAuth Flow

- **GET /api/calendar/oauth/authorize** - Get authorization URL to redirect user to Google consent screen
- **GET /api/calendar/oauth/callback** - Handle OAuth callback (requires `code` query parameter)
- **GET /api/calendar/oauth/status** - Check if user has connected Google Calendar
- **DELETE /api/calendar/oauth/disconnect** - Disconnect Google Calendar

### Calendar Data

- **GET /api/calendar/api/events** - Get calendar events for a date range
  - Query params: `startTime`, `endTime` (ISO 8601 format)
- **GET /api/calendar/api/available-slots** - Get available time slots
  - Query params: `startTime`, `endTime`, `slotDurationMinutes` (optional, default 30)

## Security Considerations

- OAuth tokens are encrypted at rest in the database using the `ENCRYPTION_KEY`
- Tokens are stored per user and provider in the `oauth_tokens` table
- Refresh tokens are securely stored and used to obtain new access tokens when needed
- All API endpoints require authentication (JWT token)
- Calendar API requests are read-only (no write permissions requested)

## Testing the Flow

### Manual Testing

1. Start the development server: `npm run dev`
2. Call the authorize endpoint to get the authorization URL:
   ```bash
   curl http://localhost:3000/api/calendar/oauth/authorize
   ```
3. Visit the returned URL in your browser and authorize the test account
4. The callback will store the tokens in the database
5. Check connection status:
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/calendar/oauth/status
   ```
6. Fetch calendar events:
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:3000/api/calendar/api/events?startTime=2025-01-01T00:00:00Z&endTime=2025-01-31T23:59:59Z"
   ```

### Automated Testing

Tests for the Google Calendar integration should:
- Mock the Google Calendar API responses
- Test token storage and retrieval
- Test availability detection logic
- Test error handling for missing/expired tokens

## Troubleshooting

### "Invalid client" error
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check that the redirect URI matches exactly in Google Cloud Console

### "Token expired" error
- The system should automatically refresh tokens using the refresh token
- If refresh fails, user needs to re-authorize

### "Calendar not connected" error
- User hasn't completed the OAuth flow yet
- Call `/api/calendar/oauth/authorize` to start the flow

## References

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
