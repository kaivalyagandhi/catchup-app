# Google SSO Authentication Setup Guide

## Overview

This guide walks you through setting up Google Single Sign-On (SSO) authentication for CatchUp. Google SSO is the primary authentication method for production users, providing a secure and streamlined sign-in experience.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Console Setup](#google-cloud-console-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Testing the Integration](#testing-the-integration)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- A Google Cloud Platform account
- Node.js 16+ installed
- PostgreSQL 12+ running
- CatchUp application cloned and dependencies installed
- Access to your `.env` file

## Google Cloud Console Setup

### Step 1: Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Either select an existing project or click "New Project"
4. If creating new:
   - Enter project name: "CatchUp" (or your preferred name)
   - Click "Create"

### Step 2: Enable Required APIs

Google SSO requires the People API for user profile information.

1. In the left sidebar, click "APIs & Services" > "Library"
2. Search for "People API"
3. Click on it and click "Enable"
4. Wait 2-3 minutes for the API to be fully enabled

**Note**: The People API provides access to basic user profile information (email, name, profile picture).

### Step 3: Configure OAuth Consent Screen

The OAuth consent screen is what users see when they authorize your application.

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select user type:
   - **Internal**: For Google Workspace organizations only
   - **External**: For public applications (most common)
3. Click "Create"

4. Fill in the required information:
   - **App name**: CatchUp
   - **User support email**: Your email address
   - **App logo**: (Optional) Upload your app logo
   - **Application home page**: Your application URL
   - **Application privacy policy link**: Your privacy policy URL
   - **Application terms of service link**: Your terms of service URL
   - **Authorized domains**: Add your domain (e.g., `catchup.app`)
   - **Developer contact information**: Your email address

5. Click "Save and Continue"

6. **Add Scopes**:
   - Click "Add or Remove Scopes"
   - Select these scopes:
     - `https://www.googleapis.com/auth/userinfo.email` - Read user email
     - `https://www.googleapis.com/auth/userinfo.profile` - Read user profile
   - Click "Update"
   - Click "Save and Continue"

7. **Test Users** (for External apps in testing):
   - Add email addresses of users who can test the app
   - Click "Save and Continue"

8. Review the summary and click "Back to Dashboard"

### Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Configure the OAuth client:
   - **Name**: CatchUp Web Client
   - **Authorized JavaScript origins**:
     - Development: `http://localhost:3000`
     - Production: `https://yourdomain.com`
   - **Authorized redirect URIs**:
     - Development: `http://localhost:3000/api/auth/google/callback`
     - Production: `https://yourdomain.com/api/auth/google/callback`

5. Click "Create"
6. **Important**: Copy the Client ID and Client Secret
   - You'll need these for your environment variables
   - Store them securely - never commit them to version control

### Step 5: Publish Your App (Production Only)

For production with more than 100 users:

1. Go to "OAuth consent screen"
2. Click "Publish App"
3. Submit for verification if required
4. Follow Google's verification process

**Note**: Apps in testing mode are limited to 100 users. Publishing removes this limit.

## Environment Configuration

### Required Environment Variables

Add these variables to your `.env` file:

```bash
# Google SSO Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Test Mode Configuration
# Set to 'true' to enable email/password authentication for development
# Set to 'false' for production (Google SSO only)
TEST_MODE=false

# Existing Configuration (ensure these are set)
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key
DATABASE_URL=postgresql://user:password@localhost:5432/catchup_db
```

### Environment Variable Details

**GOOGLE_CLIENT_ID**
- Your OAuth 2.0 Client ID from Google Cloud Console
- Format: `xxxxx.apps.googleusercontent.com`
- Required for Google SSO to work

**GOOGLE_CLIENT_SECRET**
- Your OAuth 2.0 Client Secret from Google Cloud Console
- Keep this secret and never commit to version control
- Required for token exchange

**GOOGLE_REDIRECT_URI**
- Must match exactly with the redirect URI configured in Google Cloud Console
- Development: `http://localhost:3000/api/auth/google/callback`
- Production: `https://yourdomain.com/api/auth/google/callback`
- No trailing slashes

**TEST_MODE**
- `true`: Enables both Google SSO and email/password authentication
- `false`: Only Google SSO is available (production mode)
- Default: `false`

### Example .env File

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=catchup_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_db_password
DATABASE_SSL=false

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key

# Google SSO
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Test Mode (set to false for production)
TEST_MODE=true

# Server
PORT=3000
NODE_ENV=development
```

## Database Setup

### Run the Migration

The Google SSO feature requires database schema changes. Run the migration:

```bash
npm run db:migrate
```

This will execute migration `021_add_google_sso_support.sql` which:
- Adds `google_id` column to users table
- Adds `auth_provider` column (values: 'email', 'google', 'both')
- Adds `name` column for user's full name
- Adds `profile_picture_url` column
- Makes `password_hash` nullable (for Google SSO users)
- Adds indexes for performance
- Adds constraint to ensure either password or google_id exists

### Verify the Migration

Check that the migration was successful:

```bash
psql -h localhost -U postgres -d catchup_db -c "\d users"
```

You should see the new columns:
- `google_id` (varchar)
- `auth_provider` (varchar)
- `name` (varchar)
- `profile_picture_url` (text)

## Testing the Integration

### 1. Start the Development Server

```bash
npm run dev
```

The server should start without errors. Check the logs for:
```
✓ Google SSO configuration validated
✓ Server listening on port 3000
```

### 2. Test Configuration Validation

The application validates Google SSO configuration on startup. If you see errors:

```
✗ Google SSO configuration error: Missing GOOGLE_CLIENT_ID
```

This means your environment variables are not set correctly. Review the [Environment Configuration](#environment-configuration) section.

### 3. Test the OAuth Flow

#### Option A: Using the UI

1. Open your browser to `http://localhost:3000`
2. You should see the "Sign in with Google" button
3. If `TEST_MODE=true`, you'll also see email/password fields
4. Click "Sign in with Google"
5. You'll be redirected to Google's consent screen
6. Authorize the application
7. You should be redirected back and logged in

#### Option B: Using cURL

1. Get the authorization URL:
```bash
curl http://localhost:3000/api/auth/google/authorize
```

Response:
```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=email%20profile&state=..."
}
```

2. Visit the URL in your browser
3. Authorize the application
4. You'll be redirected to the callback URL with a code
5. The callback handler will exchange the code for tokens and create/login the user

### 4. Verify User Creation

Check that the user was created in the database:

```bash
psql -h localhost -U postgres -d catchup_db -c "SELECT id, email, google_id, auth_provider, name FROM users;"
```

You should see your user with:
- `google_id` populated
- `auth_provider` set to 'google'
- `name` from your Google profile
- `password_hash` is NULL

### 5. Test Authentication Statistics

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/auth/statistics
```

Response:
```json
{
  "totalAuthentications": 1,
  "googleSSOAuthentications": 1,
  "emailPasswordAuthentications": 0,
  "googleSSOPercentage": 100.0,
  "emailPasswordPercentage": 0.0
}
```

### 6. Test Test Mode

With `TEST_MODE=true`:

1. Visit `http://localhost:3000`
2. You should see both:
   - "Sign in with Google" button
   - Email/password form
3. A "Test Mode Enabled" indicator should be visible

With `TEST_MODE=false`:

1. Visit `http://localhost:3000`
2. You should see only:
   - "Sign in with Google" button
3. Email/password form should be hidden

### 7. Test Account Section

1. Log in via Google SSO
2. Navigate to Preferences page
3. Look for the "Account" section
4. Verify it shows:
   - Your email address
   - Authentication method: "Google SSO"
   - Connection status: "Connected"
   - Account creation date
   - Last login timestamp
   - "Sign Out" button

## Production Deployment

### Pre-Deployment Checklist

- [ ] Google Cloud Console project is set up
- [ ] OAuth consent screen is configured and published
- [ ] OAuth credentials are created with production redirect URI
- [ ] Environment variables are set in production environment
- [ ] `TEST_MODE=false` in production
- [ ] Database migration has been run
- [ ] HTTPS is enabled for all redirect URIs
- [ ] Rate limiting is configured
- [ ] Monitoring and alerts are set up

### Environment Variables for Production

```bash
# Use your production domain
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# Disable test mode
TEST_MODE=false

# Use strong secrets
JWT_SECRET=<generate_strong_secret>
ENCRYPTION_KEY=<generate_32_character_key>

# Enable SSL for database
DATABASE_SSL=true
```

### Security Considerations

1. **HTTPS Required**: All redirect URIs must use HTTPS in production
2. **Secure Secrets**: Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
3. **Rate Limiting**: Configure rate limits on OAuth endpoints
4. **Monitoring**: Set up monitoring for:
   - Authentication success/failure rates
   - Token validation errors
   - Configuration errors
   - Unusual authentication patterns

### Deployment Steps

1. **Update Environment Variables**:
   ```bash
   # Set production environment variables in your hosting platform
   # Never commit these to version control
   ```

2. **Run Database Migration**:
   ```bash
   npm run db:migrate
   ```

3. **Verify Configuration**:
   ```bash
   npm run start
   # Check logs for configuration validation
   ```

4. **Test OAuth Flow**:
   - Visit your production URL
   - Test Google SSO login
   - Verify user creation
   - Check audit logs

5. **Monitor**:
   - Watch authentication metrics
   - Monitor error rates
   - Check audit logs for security events

## Troubleshooting

### Common Issues

#### "Invalid client" Error

**Symptoms**: Error when clicking "Sign in with Google"

**Causes**:
- `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is incorrect
- Credentials don't match the project

**Solutions**:
1. Verify credentials in Google Cloud Console
2. Copy the correct Client ID and Secret
3. Update your `.env` file
4. Restart the server

#### "Redirect URI Mismatch" Error

**Symptoms**: Error after Google authorization

**Causes**:
- Redirect URI in request doesn't match configured URI
- Trailing slash mismatch
- HTTP vs HTTPS mismatch

**Solutions**:
1. Check `GOOGLE_REDIRECT_URI` in `.env`
2. Verify it matches exactly in Google Cloud Console
3. Remove any trailing slashes
4. Ensure HTTP/HTTPS matches your environment

#### "People API has not been used" Error

**Symptoms**: Error during token validation

**Causes**:
- People API is not enabled in Google Cloud Console

**Solutions**:
1. Go to Google Cloud Console > APIs & Services > Library
2. Search for "People API"
3. Click "Enable"
4. Wait 2-3 minutes
5. Try again

#### "Configuration Error" on Startup

**Symptoms**: Server fails to start with configuration error

**Causes**:
- Missing required environment variables
- Invalid environment variable format

**Solutions**:
1. Check all required variables are set:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
2. Verify format is correct
3. Check for typos
4. Restart the server

#### Email/Password Form Not Showing in Test Mode

**Symptoms**: Only Google SSO button visible when `TEST_MODE=true`

**Causes**:
- `TEST_MODE` environment variable not set correctly
- Frontend not fetching test mode status

**Solutions**:
1. Verify `TEST_MODE=true` in `.env`
2. Restart the server
3. Clear browser cache
4. Check browser console for errors
5. Verify `/api/auth/test-mode/status` endpoint returns `{"testMode": true}`

#### Token Validation Fails

**Symptoms**: "Invalid token" error after successful Google authorization

**Causes**:
- Token signature validation failed
- Token expired
- Invalid token claims

**Solutions**:
1. Check server logs for detailed error
2. Verify system clock is synchronized
3. Check Google's public keys are accessible
4. Ensure token hasn't expired (check `exp` claim)

#### User Not Created After Authorization

**Symptoms**: Authorization succeeds but user not in database

**Causes**:
- Database connection error
- Migration not run
- Constraint violation

**Solutions**:
1. Check database connection
2. Verify migration was run: `npm run db:migrate`
3. Check server logs for database errors
4. Verify `google_id` column exists in users table

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Add to .env
DEBUG=google-sso:*
LOG_LEVEL=debug
```

This will output detailed logs for:
- OAuth flow steps
- Token validation
- User creation/lookup
- Error details

### Getting Help

If you're still experiencing issues:

1. Check the [API Documentation](./GOOGLE_SSO_API.md)
2. Review the [Troubleshooting Guide](./GOOGLE_SSO_TROUBLESHOOTING.md)
3. Check server logs for detailed error messages
4. Verify all prerequisites are met
5. Test with a fresh Google account

## Next Steps

After successful setup:

1. Review the [API Documentation](./GOOGLE_SSO_API.md) for endpoint details
2. Read the [User Guide](./GOOGLE_SSO_USER_GUIDE.md) for end-user documentation
3. Check the [Developer Guide](./GOOGLE_SSO_DEVELOPER_GUIDE.md) for advanced topics
4. Set up monitoring and alerts for production

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [People API Documentation](https://developers.google.com/people)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)
- [OAuth Verification Process](https://support.google.com/cloud/answer/9110914)
