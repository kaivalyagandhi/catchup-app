# Google Cloud Setup Guide for CatchUp

## Overview

This guide walks you through setting up Google Cloud Console for CatchUp's integrations:
- **Google Calendar** - Read-only calendar access for availability detection
- **Google Contacts** - Read-only contact sync (one-way from Google to CatchUp)

## Required APIs

Enable these APIs in Google Cloud Console:

1. **Google Calendar API** - For calendar access
2. **People API** - For Google Contacts access (read-only) and user profile information
3. **Google+ API** (Optional) - Legacy API for user profile information

## Step-by-Step Setup

### 1. Go to Google Cloud Console

1. Visit https://console.cloud.google.com/
2. Select your project (or create a new one if you haven't already)

### 2. Enable Google Calendar API

1. Click on "APIs & Services" in the left sidebar
2. Click "Library"
3. Search for "Google Calendar API"
4. Click on it
5. Click the "Enable" button

### 3. Enable People API (Required for Google Contacts)

**IMPORTANT**: The People API provides read-only access to Google Contacts. CatchUp uses only read-only scopes and will never modify your Google Contacts.

1. In the same "Library" page, search for "People API"
2. Click on it
3. Click the "Enable" button
4. Wait a few minutes for the API to be fully enabled

**What the People API is used for:**
- Importing contacts from Google Contacts (read-only)
- Syncing contact updates from Google to CatchUp (one-way)
- Importing contact groups from Google
- Retrieving user profile information (email, name)

### 4. Enable Google+ API (Optional)

1. In the same "Library" page, search for "Google+ API"
2. Click on it
3. Click the "Enable" button

**Note**: Google+ API is deprecated but still works for basic user info retrieval. The People API is the modern replacement and is required for Google Contacts integration.

### 5. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Make sure your app is configured:
   - App name: "CatchUp"
   - User support email: your email
   - Developer contact: your email
3. Add required scopes (click "Add or Remove Scopes"):

**Google Calendar Scopes:**
   - `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events

**Google Contacts Scopes (READ-ONLY):**
   - `https://www.googleapis.com/auth/contacts.readonly` - Read contacts
   - `https://www.googleapis.com/auth/contacts.other.readonly` - Read "Other contacts"

**User Profile Scopes:**
   - `https://www.googleapis.com/auth/userinfo.email` - Read user email
   - `https://www.googleapis.com/auth/userinfo.profile` - Read user profile

4. **IMPORTANT**: Verify that you are using READ-ONLY scopes for contacts:
   - ✅ Use: `contacts.readonly` and `contacts.other.readonly`
   - ❌ Do NOT use: `contacts` (read-write scope)

5. Save the consent screen configuration

**Why Read-Only Scopes?**
- CatchUp implements one-way sync from Google to CatchUp
- Your Google Contacts are never modified by CatchUp
- This ensures maximum data safety and user trust
- Changes made in CatchUp stay in CatchUp only

### 6. Configure OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Find your OAuth 2.0 Client ID (Web application) or create a new one:
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "CatchUp Web Client"

3. Add authorized redirect URIs:

**Development:**
   - `http://localhost:3000/auth/google/callback` (Google Calendar)
   - `http://localhost:3000/api/contacts/oauth/callback` (Google Contacts)

**Production:**
   - `https://yourdomain.com/auth/google/callback` (Google Calendar)
   - `https://yourdomain.com/api/contacts/oauth/callback` (Google Contacts)

4. Click "Save"
5. Copy the Client ID and Client Secret to your `.env` file:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

## Testing

### Testing Google Calendar Integration

1. Start your server: `npm run dev`
2. Navigate to Calendar settings in the UI
3. Click "Connect Google Calendar"
4. Authorize the app
5. Check server logs for the user profile data
6. You should see the email address displayed

### Testing Google Contacts Integration

1. Start your server: `npm run dev`
2. Navigate to Google Contacts settings in the UI
3. You should see a prominent "One-Way Sync (Read-Only)" notice
4. Click "Connect Google Contacts"
5. Review the OAuth consent screen - verify it shows READ-ONLY permissions
6. Authorize the app
7. The initial full sync should start automatically
8. Check the sync status to see imported contacts
9. Verify that the UI shows "Your Google Contacts remain unchanged"

**What to verify:**
- ✅ OAuth consent screen shows "View your contacts" (not "Manage your contacts")
- ✅ Contacts are imported successfully
- ✅ Contact groups appear as mapping suggestions
- ✅ UI clearly indicates one-way sync
- ✅ No write operations are possible to Google Contacts

## Troubleshooting

### Google Calendar Issues

#### "Failed to get user profile"

**Cause**: Google+ API or People API is not enabled

**Solution**:
1. Go to Google Cloud Console
2. Enable "People API" (recommended) or "Google+ API"
3. Wait a few minutes for the change to propagate
4. Try connecting again

#### Email not displaying

**Cause**: 
- People API not enabled
- User profile doesn't have email in response
- Email field is null in database

**Solution**:
1. Check server logs for: `Google userinfo response:`
2. Verify the response includes `email` field
3. If not, enable People API (see above)

### Google Contacts Issues

#### "People API has not been used in project"

**Cause**: People API is not enabled in your Google Cloud project

**Solution**:
1. Go to Google Cloud Console > APIs & Services > Library
2. Search for "People API"
3. Click "Enable"
4. Wait 2-3 minutes for the API to be fully enabled
5. Try connecting again

#### "Access Not Configured"

**Cause**: OAuth scopes are not configured correctly

**Solution**:
1. Go to "OAuth consent screen"
2. Click "Edit App"
3. Add these scopes:
   - `https://www.googleapis.com/auth/contacts.readonly`
   - `https://www.googleapis.com/auth/contacts.other.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
4. Save changes
5. Re-authorize the app (disconnect and reconnect)

#### "Invalid redirect URI"

**Cause**: The redirect URI in your request doesn't match the configured URIs

**Solution**:
1. Go to "Credentials" > Your OAuth 2.0 Client ID
2. Verify the redirect URIs include:
   - `http://localhost:3000/api/contacts/oauth/callback` (development)
   - `https://yourdomain.com/api/contacts/oauth/callback` (production)
3. Make sure there are no trailing slashes
4. Save changes
5. Try connecting again

#### Contacts not syncing

**Cause**: Multiple possible causes

**Solution**:
1. Check the sync status endpoint: `GET /api/contacts/sync/status`
2. Look for error messages in the response
3. Check server logs for detailed error information
4. Verify the OAuth token hasn't expired
5. Try manually triggering a sync: `POST /api/contacts/sync/full`

#### "Insufficient Permission" error

**Cause**: Using write scopes instead of read-only scopes

**Solution**:
1. Go to "OAuth consent screen"
2. Verify you're using:
   - ✅ `contacts.readonly` (correct)
   - ❌ NOT `contacts` (incorrect - this is read-write)
3. Update scopes if needed
4. Re-authorize the app

#### Sync token expired (410 error)

**Cause**: Sync tokens expire after 7 days of inactivity

**Solution**:
- This is normal behavior
- The system automatically triggers a full sync when this happens
- No action needed - it's handled automatically

## API Quotas

Google Cloud has quotas for API calls:

- **Calendar API**: 1,000,000 requests per day (free tier)
- **People API**: 
  - Queries per day: 3,000,000 (free tier)
  - Queries per minute per user: 600
  - Queries per minute: 3,000
- **Google+ API**: 1,000,000 requests per day (free tier, deprecated)

For development and most production use cases, these quotas are more than sufficient.

### Monitoring Quota Usage

1. Go to Google Cloud Console
2. Navigate to "APIs & Services" > "Dashboard"
3. Click on "People API" or "Calendar API"
4. View the "Quotas" tab to see current usage
5. Set up alerts if you're approaching limits

## Production Considerations

For production deployment:

1. **OAuth Verification**: Submit your app for OAuth verification if you have >100 users
   - Go to "OAuth consent screen"
   - Click "Publish App"
   - Submit for verification (required for production)

2. **API Monitoring**: Monitor API usage in Google Cloud Console
   - Set up quota alerts
   - Monitor error rates
   - Track sync performance

3. **Billing**: Set up billing alerts if needed
   - Free tier is usually sufficient
   - Monitor usage to avoid unexpected charges

4. **Security**:
   - Use HTTPS for all redirect URIs
   - Rotate OAuth credentials periodically
   - Monitor for suspicious activity
   - Implement rate limiting on your endpoints

5. **Data Privacy**:
   - Ensure compliance with GDPR and other regulations
   - Provide clear privacy policy
   - Allow users to disconnect and delete data
   - Maintain audit logs

6. **Read-Only Enforcement**:
   - Verify that only read-only scopes are requested
   - Implement safeguards in code to prevent write operations
   - Display clear messaging about one-way sync
   - Never request write permissions

## Alternative: Using People API

If you prefer to use the newer People API instead of Google+ API:

1. Enable "People API" in Google Cloud Console
2. Update `src/integrations/google-calendar-service.ts`:

```typescript
export async function getUserProfile(tokens: Credentials) {
  try {
    const oauth2Client = getOAuth2Client(tokens);
    const people = google.people({ version: 'v1', auth: oauth2Client });

    const response = await people.people.get({
      resourceName: 'people/me',
      personFields: 'emailAddresses,names',
    });

    return {
      email: response.data.emailAddresses?.[0]?.value,
      name: response.data.names?.[0]?.displayName,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}
```

## Verification Checklist

### Google Calendar
- [ ] Google Calendar API is enabled
- [ ] OAuth consent screen includes `calendar.readonly` scope
- [ ] Redirect URI configured: `http://localhost:3000/auth/google/callback`
- [ ] Server logs show user profile with email
- [ ] Email displays in the UI after connecting

### Google Contacts
- [ ] People API is enabled (required)
- [ ] OAuth consent screen includes READ-ONLY scopes:
  - [ ] `contacts.readonly`
  - [ ] `contacts.other.readonly`
  - [ ] `userinfo.email`
  - [ ] `userinfo.profile`
- [ ] Redirect URI configured: `http://localhost:3000/api/contacts/oauth/callback`
- [ ] OAuth consent screen shows "View your contacts" (not "Manage")
- [ ] UI displays "One-Way Sync (Read-Only)" notice
- [ ] Initial sync completes successfully
- [ ] Contact groups appear as mapping suggestions
- [ ] No write operations are possible to Google Contacts

### General
- [ ] Client ID and Client Secret are in `.env` file
- [ ] All redirect URIs match exactly (no trailing slashes)
- [ ] App is published (for production with >100 users)
- [ ] Privacy policy is linked in OAuth consent screen

## References

### API Documentation
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [People API Documentation](https://developers.google.com/people/api/rest)
- [People API Contacts Guide](https://developers.google.com/people/api/rest/v1/people.connections)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Google+ API Documentation](https://developers.google.com/+/web/api/rest) (deprecated)

### OAuth and Security
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OAuth Verification Process](https://support.google.com/cloud/answer/9110914)
- [API Security Best Practices](https://cloud.google.com/apis/design/security)

### CatchUp Documentation
- [Google Contacts Integration Research](./GOOGLE_CONTACTS_INTEGRATION_RESEARCH.md)
- [Google Contacts OAuth Implementation](./GOOGLE_CONTACTS_OAUTH_IMPLEMENTATION.md)
- [API Documentation](./docs/API.md)
