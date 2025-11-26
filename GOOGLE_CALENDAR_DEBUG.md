# Google Calendar Connection Debugging Guide

## Issue Fixed

The Google Calendar connection was failing because:
1. The OAuth2 client was being created once at module load time with potentially unset environment variables
2. Error messages weren't detailed enough to diagnose the actual problem
3. Frontend wasn't properly handling authentication token during OAuth callback

## What Changed

1. **google-calendar-config.ts**: Now creates a fresh OAuth2 client for each operation
2. **google-calendar-service.ts**: Updated to pass credentials directly to client creation functions
3. **calendar-api.ts**: Fixed token object structure to match Google's Credentials interface
4. **google-calendar-oauth.ts**: Added detailed error logging and better error handling
5. **app.js**: Improved OAuth callback handler to ensure auth token is available

## Quick Test

### 1. Verify Environment Variables

Run this test script to check if everything is configured:

```bash
node test-calendar-connection.js
```

Expected output:
```
✅ All checks passed! Your Google Calendar OAuth is configured correctly.
```

### 2. Check Server Environment

```bash
curl http://localhost:3000/debug/env
```

Expected response:
```json
{
  "GOOGLE_CLIENT_ID": "✓ Set",
  "GOOGLE_CLIENT_SECRET": "✓ Set",
  "GOOGLE_REDIRECT_URI": "http://localhost:3000/auth/google/callback",
  "NODE_ENV": "development"
}
```

### 3. Test Authorization URL Generation

```bash
curl http://localhost:3000/api/calendar/oauth/authorize
```

Expected response:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=..."
}
```

## Complete OAuth Flow (In Browser)

### Step 1: Log In to CatchUp

1. Open http://localhost:3000
2. Sign up or log in with your account
3. You should see the main app with a "Connect Google Calendar" button

### Step 2: Click "Connect Google Calendar"

1. Click the button in the Calendar section
2. You'll be redirected to Google's consent screen
3. Sign in with your Google account (if not already signed in)
4. Grant calendar permissions

### Step 3: Check Browser Console

After Google redirects back, check the browser console (F12 → Console tab) for:

**Success messages:**
```
Exchanging authorization code for tokens...
Getting user profile...
Storing tokens in database...
Calendar connected successfully: { email: '...', name: '...' }
```

**Error messages will show the actual problem:**
```
Failed to exchange code for tokens: [error details]
Failed to get user profile: [error details]
Failed to store tokens in database: [error details]
```

### Step 4: Check Server Logs

Look at your terminal where the server is running for detailed logs:

```
Exchanging authorization code for tokens...
Getting user profile...
Storing tokens in database...
Calendar connection successful for user: [user-id]
```

## Troubleshooting

### "You must be logged in to connect Google Calendar"

**Cause**: Auth token is not available when callback is processed

**Solution**:
1. Make sure you're logged in before clicking "Connect Google Calendar"
2. Check browser console for auth token: `localStorage.getItem('authToken')`
3. If empty, log out and log back in

### "Failed to exchange authorization code"

**Cause**: Google rejected the authorization code

**Solution**:
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` are correct
2. Check that `GOOGLE_REDIRECT_URI` matches exactly in Google Cloud Console
3. Try the flow again - authorization codes expire quickly
4. Check server logs for the specific error message

### "Failed to get user profile"

**Cause**: Access token is invalid or doesn't have required scopes

**Solution**:
1. Verify the scopes in `google-calendar-config.ts` include `userinfo.email` and `userinfo.profile`
2. Try disconnecting and reconnecting
3. Check server logs for the specific error

### "Failed to store calendar connection"

**Cause**: Database error or encryption issue

**Solution**:
1. Verify database is running: `npm run db:test`
2. Check that `ENCRYPTION_KEY` is set in `.env`
3. Check server logs for the specific database error

## Database Verification

Check if tokens are being stored:

```sql
SELECT user_id, provider, expires_at, created_at FROM oauth_tokens WHERE provider = 'google_calendar';
```

Tokens are encrypted in the database, so you won't see the actual token values.

## Manual Testing with curl

If you want to test the callback endpoint directly (requires a valid auth token):

```bash
# Get your JWT token from localStorage in the browser console
JWT_TOKEN="your_token_here"

# Test the status endpoint
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/calendar/oauth/status
```

## Next Steps

If the connection still fails:

1. **Check browser console** (F12 → Console) for JavaScript errors
2. **Check server logs** for detailed error messages
3. **Verify Google Cloud Console**:
   - OAuth consent screen is configured
   - Calendar API is enabled
   - Redirect URI is whitelisted exactly as shown in `.env`
4. **Try with a different Google account**
5. **Check network tab** (F12 → Network) to see the actual HTTP responses
