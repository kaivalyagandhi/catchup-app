# Google Cloud Setup Guide for CatchUp

## Required APIs

To use Google Calendar integration with email display, you need to enable these APIs in Google Cloud Console:

1. **Google Calendar API** - For calendar access
2. **Google+ API** - For user profile information (email, name)

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

### 3. Enable Google+ API

1. In the same "Library" page, search for "Google+ API"
2. Click on it
3. Click the "Enable" button

**Note**: Google+ API is deprecated but still works for basic user info retrieval. If you prefer, you can use the "People API" instead:
- Search for "People API"
- Enable it
- Update the code to use `google.people()` instead of `google.oauth2()`

### 4. Verify OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Make sure your app is configured:
   - App name: "CatchUp"
   - User support email: your email
   - Developer contact: your email
3. Add required scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

### 5. Verify OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Find your OAuth 2.0 Client ID (Web application)
3. Verify the authorized redirect URIs include:
   - `http://localhost:3000/auth/google/callback` (development)
   - Your production URL (e.g., `https://catchup.app/auth/google/callback`)

## Testing

After enabling the APIs:

1. Start your server: `npm run dev`
2. Try connecting Google Calendar again
3. Check server logs for the user profile data
4. You should see the email address displayed

## Troubleshooting

### "Failed to get user profile"

**Cause**: Google+ API is not enabled

**Solution**:
1. Go to Google Cloud Console
2. Enable "Google+ API"
3. Wait a few minutes for the change to propagate
4. Try connecting again

### Email not displaying

**Cause**: 
- Google+ API not enabled
- User profile doesn't have email in response
- Email field is null in database

**Solution**:
1. Check server logs for: `Google userinfo response:`
2. Verify the response includes `email` field
3. If not, enable Google+ API (see above)

### "The caller does not have permission"

**Cause**: OAuth scopes are not configured correctly

**Solution**:
1. Go to "OAuth consent screen"
2. Add these scopes:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
3. Re-authorize the app

## API Quotas

Google Cloud has quotas for API calls:

- **Calendar API**: 1,000,000 requests per day (free tier)
- **Google+ API**: 1,000,000 requests per day (free tier)

For development, these quotas are more than sufficient.

## Production Considerations

For production deployment:

1. Use a service account for server-to-server communication (optional)
2. Monitor API usage in Google Cloud Console
3. Set up billing alerts if needed
4. Consider using the People API instead of Google+ API (more modern)

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

- [ ] Google Calendar API is enabled
- [ ] Google+ API (or People API) is enabled
- [ ] OAuth consent screen is configured
- [ ] Redirect URIs are correct
- [ ] Scopes include `userinfo.email` and `userinfo.profile`
- [ ] Server logs show user profile with email
- [ ] Email displays in the UI after connecting

## References

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google+ API Documentation](https://developers.google.com/+/web/api/rest)
- [People API Documentation](https://developers.google.com/people/api/rest)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)
