# Google SSO Troubleshooting Guide

## Overview

This guide helps you diagnose and resolve common issues with Google SSO authentication in CatchUp.

## Table of Contents

1. [Configuration Issues](#configuration-issues)
2. [OAuth Flow Issues](#oauth-flow-issues)
3. [Token Validation Issues](#token-validation-issues)
4. [User Creation Issues](#user-creation-issues)
5. [Test Mode Issues](#test-mode-issues)
6. [Frontend Issues](#frontend-issues)
7. [Production Issues](#production-issues)
8. [Debugging Tools](#debugging-tools)

## Configuration Issues

### Issue: "Google SSO configuration error" on Startup

**Symptoms**:
- Server fails to start
- Error message: "Missing GOOGLE_CLIENT_ID" or similar

**Causes**:
- Required environment variables are not set
- Environment variables have incorrect format
- `.env` file is not being loaded

**Solutions**:

1. **Verify environment variables are set**:
```bash
# Check if variables are set
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $GOOGLE_REDIRECT_URI
```

2. **Check `.env` file**:
```bash
# Ensure .env file exists and contains required variables
cat .env | grep GOOGLE
```

Expected output:
```
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

3. **Verify format**:
- Client ID should end with `.apps.googleusercontent.com`
- Client Secret should start with `GOCSPX-`
- Redirect URI should be a complete URL with no trailing slash

4. **Restart the server**:
```bash
npm run dev
```

---

### Issue: "Invalid client" Error

**Symptoms**:
- Error when clicking "Sign in with Google"
- Google shows "Error 400: invalid_client"

**Causes**:
- `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is incorrect
- Credentials don't match the Google Cloud project
- Credentials were regenerated but not updated in `.env`

**Solutions**:

1. **Verify credentials in Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" > "Credentials"
   - Find your OAuth 2.0 Client ID
   - Click the edit icon
   - Verify the Client ID matches your `.env` file

2. **Copy correct credentials**:
   - Click "Download JSON" to get the correct credentials
   - Update your `.env` file with the correct values
   - Restart the server

3. **Check for typos**:
   - Ensure no extra spaces or line breaks
   - Verify the entire credential is copied

---

### Issue: "Redirect URI mismatch" Error

**Symptoms**:
- Error after Google authorization
- Google shows "Error 400: redirect_uri_mismatch"

**Causes**:
- Redirect URI in request doesn't match configured URI in Google Cloud Console
- Trailing slash mismatch
- HTTP vs HTTPS mismatch
- Port number mismatch

**Solutions**:

1. **Check redirect URI in `.env`**:
```bash
cat .env | grep GOOGLE_REDIRECT_URI
```

Should be:
```
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

2. **Verify in Google Cloud Console**:
   - Go to "APIs & Services" > "Credentials"
   - Click your OAuth 2.0 Client ID
   - Check "Authorized redirect URIs"
   - Ensure it matches exactly (no trailing slash)

3. **Common mismatches**:
   - ❌ `http://localhost:3000/api/auth/google/callback/` (trailing slash)
   - ❌ `https://localhost:3000/api/auth/google/callback` (HTTPS instead of HTTP)
   - ❌ `http://localhost/api/auth/google/callback` (missing port)
   - ✅ `http://localhost:3000/api/auth/google/callback` (correct)

4. **Add the correct URI**:
   - In Google Cloud Console, click "Add URI"
   - Paste the exact URI from your `.env` file
   - Click "Save"
   - Wait 1-2 minutes for changes to propagate
   - Try again

---

## OAuth Flow Issues

### Issue: "People API has not been used" Error

**Symptoms**:
- Error during or after Google authorization
- Error message mentions "People API"

**Causes**:
- People API is not enabled in Google Cloud Console
- API was just enabled and hasn't propagated yet

**Solutions**:

1. **Enable People API**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" > "Library"
   - Search for "People API"
   - Click on it
   - Click "Enable"

2. **Wait for propagation**:
   - Wait 2-3 minutes after enabling
   - Try the OAuth flow again

3. **Verify API is enabled**:
   - Go to "APIs & Services" > "Dashboard"
   - Look for "People API" in the list of enabled APIs

---

### Issue: "State mismatch" Error

**Symptoms**:
- Error after Google authorization
- Error message: "Security validation failed" or "State mismatch"

**Causes**:
- CSRF protection detected a mismatch
- State expired (older than 5 minutes)
- Browser cleared cookies/storage
- Multiple OAuth flows initiated simultaneously

**Solutions**:

1. **Try again**:
   - Click "Sign in with Google" again
   - Complete the flow within 5 minutes

2. **Clear browser data**:
   - Clear cookies and local storage
   - Try the OAuth flow again

3. **Check for multiple tabs**:
   - Close other tabs with the application open
   - Try again in a single tab

4. **Verify state management**:
   - Check server logs for state generation and validation
   - Ensure state is being stored correctly

---

### Issue: OAuth Flow Hangs or Times Out

**Symptoms**:
- Clicking "Sign in with Google" does nothing
- Redirected to Google but nothing happens
- Callback never completes

**Causes**:
- Network connectivity issues
- Google services are down
- Popup blocker is blocking the OAuth window
- JavaScript errors in the frontend

**Solutions**:

1. **Check browser console**:
   - Open browser developer tools (F12)
   - Look for JavaScript errors
   - Check Network tab for failed requests

2. **Disable popup blocker**:
   - Allow popups for your application domain
   - Try again

3. **Check network connectivity**:
```bash
# Test connectivity to Google
curl https://accounts.google.com
```

4. **Check Google service status**:
   - Visit [Google Workspace Status Dashboard](https://www.google.com/appsstatus)
   - Check if OAuth services are operational

5. **Try incognito mode**:
   - Open an incognito/private window
   - Try the OAuth flow
   - This helps identify browser extension issues

---

## Token Validation Issues

### Issue: "Invalid token" Error

**Symptoms**:
- Error after successful Google authorization
- Error message: "Invalid authentication token"

**Causes**:
- Token signature validation failed
- Token claims are invalid
- System clock is out of sync
- Google's public keys are not accessible

**Solutions**:

1. **Check server logs**:
```bash
# Look for detailed error messages
tail -f logs/app.log | grep "token validation"
```

2. **Verify system clock**:
```bash
# Check system time
date

# Sync system clock (Linux)
sudo ntpdate -s time.nist.gov

# Sync system clock (macOS)
sudo sntp -sS time.apple.com
```

3. **Test Google's public keys**:
```bash
# Verify you can access Google's public keys
curl https://www.googleapis.com/oauth2/v3/certs
```

4. **Check token claims**:
   - Enable debug logging
   - Look for token claims in logs
   - Verify issuer, audience, and expiration

---

### Issue: "Token expired" Error

**Symptoms**:
- Error message: "Authentication session expired"
- Occurs after completing OAuth flow

**Causes**:
- Took too long to complete OAuth flow
- System clock is incorrect
- Token was issued in the past

**Solutions**:

1. **Complete flow quickly**:
   - Try the OAuth flow again
   - Complete it within 1-2 minutes

2. **Check system clock**:
```bash
# Verify system time is correct
date
```

3. **Verify token expiration**:
   - Check server logs for token `exp` claim
   - Compare with current time

---

## User Creation Issues

### Issue: User Not Created After Authorization

**Symptoms**:
- OAuth flow completes successfully
- User is not in the database
- Cannot log in

**Causes**:
- Database connection error
- Migration not run
- Constraint violation
- User creation logic error

**Solutions**:

1. **Check database connection**:
```bash
# Test database connection
psql -h localhost -U postgres -d catchup_db -c "SELECT 1;"
```

2. **Verify migration was run**:
```bash
# Check if google_id column exists
psql -h localhost -U postgres -d catchup_db -c "\d users"
```

Expected columns:
- `google_id`
- `auth_provider`
- `name`
- `profile_picture_url`

3. **Run migration if needed**:
```bash
npm run db:migrate
```

4. **Check server logs**:
```bash
# Look for user creation errors
tail -f logs/app.log | grep "user creation"
```

5. **Verify user in database**:
```bash
psql -h localhost -U postgres -d catchup_db -c "SELECT id, email, google_id, auth_provider FROM users;"
```

---

### Issue: "Email already exists" Error

**Symptoms**:
- Error message: "An account with this email already exists"
- Cannot sign in with Google

**Causes**:
- User previously registered with email/password
- Account linking is not working
- Email conflict in database

**Solutions**:

1. **Check existing user**:
```bash
psql -h localhost -U postgres -d catchup_db -c "SELECT id, email, auth_provider FROM users WHERE email = 'user@example.com';"
```

2. **Account linking should work automatically**:
   - If user exists with email/password, Google SSO should link to it
   - Check server logs for account linking errors

3. **Manual account linking** (if needed):
```sql
-- Update existing user to support Google SSO
UPDATE users 
SET google_id = 'google_user_id_here',
    auth_provider = 'both',
    name = 'User Name'
WHERE email = 'user@example.com';
```

---

## Test Mode Issues

### Issue: Email/Password Form Not Showing

**Symptoms**:
- Only "Sign in with Google" button is visible
- `TEST_MODE=true` but email/password form is hidden

**Causes**:
- `TEST_MODE` environment variable not set correctly
- Frontend not fetching test mode status
- JavaScript error preventing form display

**Solutions**:

1. **Verify TEST_MODE is set**:
```bash
cat .env | grep TEST_MODE
```

Should be:
```
TEST_MODE=true
```

2. **Restart the server**:
```bash
npm run dev
```

3. **Check test mode endpoint**:
```bash
curl http://localhost:3000/api/auth/test-mode/status
```

Expected response:
```json
{"testMode": true}
```

4. **Check browser console**:
   - Open developer tools (F12)
   - Look for JavaScript errors
   - Check if test mode status is being fetched

5. **Clear browser cache**:
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear cache and reload

---

### Issue: Email/Password Auth Blocked in Production

**Symptoms**:
- Error when trying to use email/password authentication
- Error message: "This feature is disabled"

**Causes**:
- `TEST_MODE=false` (correct for production)
- User trying to use email/password in production

**Solutions**:

This is expected behavior in production. Solutions:

1. **Use Google SSO**:
   - Click "Sign in with Google" instead
   - This is the intended authentication method for production

2. **Enable test mode** (development only):
```bash
# In .env file
TEST_MODE=true
```

3. **Verify test mode status**:
```bash
curl http://localhost:3000/api/auth/test-mode/status
```

---

## Frontend Issues

### Issue: "Sign in with Google" Button Not Working

**Symptoms**:
- Clicking button does nothing
- No redirect to Google
- No error message

**Causes**:
- JavaScript error
- Network request failing
- Authorization URL not being generated

**Solutions**:

1. **Check browser console**:
   - Open developer tools (F12)
   - Look for JavaScript errors
   - Check Network tab for failed requests

2. **Verify authorization endpoint**:
```bash
curl http://localhost:3000/api/auth/google/authorize
```

Expected response:
```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

3. **Check button event handler**:
   - Verify `google-sso.js` is loaded
   - Check if event listener is attached
   - Look for errors in console

4. **Test manually**:
   - Copy the authorization URL from the curl response
   - Paste it in your browser
   - If this works, the issue is in the frontend

---

### Issue: Callback Redirect Not Working

**Symptoms**:
- After Google authorization, not redirected back to app
- Stuck on Google page
- Redirected to wrong URL

**Causes**:
- Redirect URI mismatch
- Callback handler not working
- JavaScript error in callback handling

**Solutions**:

1. **Check redirect URI**:
   - Verify `GOOGLE_REDIRECT_URI` in `.env`
   - Ensure it matches Google Cloud Console configuration

2. **Test callback endpoint**:
```bash
# This should return an error (missing code), but endpoint should exist
curl http://localhost:3000/api/auth/google/callback
```

3. **Check server logs**:
```bash
# Look for callback requests
tail -f logs/app.log | grep "callback"
```

4. **Verify callback route is registered**:
   - Check `src/api/routes/google-sso.ts`
   - Ensure route is mounted in server

---

## Production Issues

### Issue: OAuth Not Working in Production

**Symptoms**:
- Works in development but not in production
- "Redirect URI mismatch" in production
- "Invalid client" in production

**Causes**:
- Production redirect URI not configured in Google Cloud Console
- Environment variables not set in production
- HTTPS not enabled

**Solutions**:

1. **Add production redirect URI**:
   - Go to Google Cloud Console
   - Add `https://yourdomain.com/api/auth/google/callback`
   - Ensure HTTPS (not HTTP)

2. **Verify production environment variables**:
```bash
# Check environment variables in production
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_REDIRECT_URI
```

3. **Ensure HTTPS is enabled**:
   - Production must use HTTPS
   - Verify SSL certificate is valid
   - Test: `curl https://yourdomain.com`

4. **Check production logs**:
```bash
# View production logs
tail -f /var/log/catchup/app.log
```

---

### Issue: High Authentication Failure Rate

**Symptoms**:
- Many users reporting authentication failures
- High error rate in logs
- Intermittent failures

**Causes**:
- Google API rate limits
- Network issues
- Configuration problems
- Database connection issues

**Solutions**:

1. **Check authentication statistics**:
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://yourdomain.com/api/auth/statistics/global
```

2. **Monitor error logs**:
```bash
# Look for patterns in errors
grep "authentication failed" /var/log/catchup/app.log | tail -100
```

3. **Check Google API quotas**:
   - Go to Google Cloud Console
   - Navigate to "APIs & Services" > "Dashboard"
   - Check quota usage for People API

4. **Verify database health**:
```bash
# Check database connections
psql -h localhost -U postgres -d catchup_db -c "SELECT count(*) FROM pg_stat_activity;"
```

5. **Check rate limiting**:
   - Review rate limit logs
   - Adjust rate limits if needed
   - Consider implementing retry logic

---

## Debugging Tools

### Enable Debug Logging

Add to `.env`:
```bash
DEBUG=google-sso:*
LOG_LEVEL=debug
```

Restart the server:
```bash
npm run dev
```

### Check Server Logs

```bash
# View real-time logs
tail -f logs/app.log

# Search for specific errors
grep "google-sso" logs/app.log

# View last 100 lines
tail -100 logs/app.log
```

### Test OAuth Flow Manually

1. **Get authorization URL**:
```bash
curl http://localhost:3000/api/auth/google/authorize
```

2. **Visit URL in browser**:
   - Copy the `authorizationUrl` from response
   - Paste in browser
   - Complete authorization

3. **Check callback**:
   - After authorization, you'll be redirected to callback URL
   - Check server logs for callback processing
   - Look for any errors

### Verify Database State

```bash
# Check users table
psql -h localhost -U postgres -d catchup_db -c "SELECT id, email, google_id, auth_provider, name FROM users;"

# Check audit logs
psql -h localhost -U postgres -d catchup_db -c "SELECT * FROM audit_logs WHERE action LIKE '%google%' ORDER BY created_at DESC LIMIT 10;"
```

### Test Token Validation

```bash
# Get a token from Google (use OAuth Playground)
# Then test validation
curl -X POST http://localhost:3000/api/auth/google/token \
  -H "Content-Type: application/json" \
  -d '{"code": "your_code_here", "state": "your_state_here"}'
```

### Check Network Connectivity

```bash
# Test connectivity to Google
curl https://accounts.google.com
curl https://www.googleapis.com/oauth2/v3/certs

# Test your callback endpoint
curl http://localhost:3000/api/auth/google/callback
```

### Browser Developer Tools

1. **Console**: Check for JavaScript errors
2. **Network**: Monitor API requests and responses
3. **Application**: Check localStorage and cookies
4. **Sources**: Debug JavaScript code

## Getting Help

If you're still experiencing issues after trying these solutions:

1. **Gather information**:
   - Server logs (last 100 lines)
   - Browser console errors
   - Network requests (from browser dev tools)
   - Environment variables (redact secrets)
   - Database schema (output of `\d users`)

2. **Check documentation**:
   - [Setup Guide](./GOOGLE_SSO_SETUP_GUIDE.md)
   - [API Documentation](./GOOGLE_SSO_API.md)
   - [Developer Guide](./GOOGLE_SSO_DEVELOPER_GUIDE.md)

3. **Review Google documentation**:
   - [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
   - [People API Documentation](https://developers.google.com/people)
   - [OAuth Troubleshooting](https://developers.google.com/identity/protocols/oauth2/web-server#handlingresponse)

4. **Test with a fresh setup**:
   - Create a new Google Cloud project
   - Use a different Google account
   - Test in incognito mode

## Common Error Messages Reference

| Error Message | Likely Cause | Solution |
|--------------|--------------|----------|
| "Missing GOOGLE_CLIENT_ID" | Environment variable not set | Set in `.env` file |
| "Invalid client" | Wrong credentials | Verify in Google Cloud Console |
| "Redirect URI mismatch" | URI doesn't match | Update Google Cloud Console |
| "People API has not been used" | API not enabled | Enable in Google Cloud Console |
| "State mismatch" | CSRF protection triggered | Try OAuth flow again |
| "Invalid token" | Token validation failed | Check system clock, verify token |
| "Token expired" | Token too old | Complete flow faster |
| "Email already exists" | User exists with different auth | Account linking should work automatically |
| "This feature is disabled" | Test mode is off | Use Google SSO or enable test mode |

## Prevention Tips

1. **Always use HTTPS in production**
2. **Keep environment variables in sync** between development and production
3. **Monitor authentication statistics** regularly
4. **Set up alerts** for high error rates
5. **Test OAuth flow** after any configuration changes
6. **Keep Google Cloud Console** credentials up to date
7. **Document any custom configurations**
8. **Regularly review audit logs** for security events
