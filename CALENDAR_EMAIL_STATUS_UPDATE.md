# Google Calendar Email Status Update

## Overview

Updated the Google Calendar integration to display the connected account email address in the calendar settings section.

## Changes Made

### Backend

1. **Database Migration** (`scripts/migrations/006_add_email_to_oauth_tokens.sql`)
   - Added `email` column to `oauth_tokens` table
   - Added index on email for faster lookups

2. **OAuth Repository** (`src/integrations/oauth-repository.ts`)
   - Updated `OAuthToken` interface to include optional `email` field
   - Updated `OAuthTokenRow` interface to include `email` column
   - Modified `upsertToken()` function to accept and store email address

3. **OAuth Routes** (`src/api/routes/google-calendar-oauth.ts`)
   - Updated callback handler to store the user's email when connecting
   - Updated `/api/calendar/oauth/status` endpoint to return email in response
   - Added detailed error logging for debugging

### Frontend

1. **App JavaScript** (`public/js/app.js`)
   - Updated `loadCalendar()` to display connected email address
   - Updated `checkCalendarConnection()` to return full status object with email
   - Added conditional rendering of email display when calendar is connected

2. **Styles** (`public/index.html`)
   - Added `.calendar-connected` styles for the connected state
   - Added `.calendar-email` styles to display the email in a highlighted box
   - Integrated with existing theme system for light/dark mode support

## How It Works

### Connection Flow

1. User clicks "Connect Google Calendar"
2. Redirected to Google OAuth consent screen
3. After authorization, callback handler:
   - Exchanges code for tokens
   - Fetches user profile (including email)
   - Stores tokens and email in database
4. Frontend displays success message with email

### Status Display

When calendar is connected, users see:
```
Google Calendar Connected
Your calendar is synced and ready for smart scheduling
Connected as: user@gmail.com
[Disconnect Calendar]
```

### API Response

The `/api/calendar/oauth/status` endpoint now returns:
```json
{
  "connected": true,
  "email": "user@gmail.com",
  "expiresAt": "2025-01-26T12:34:56.000Z"
}
```

## Database Changes

Run the migration to add the email column:

```bash
npm run db:migrate
```

The migration is idempotent and safe to run multiple times.

## Testing

1. Start the server: `npm run dev`
2. Log in to the app
3. Navigate to Calendar section
4. Click "Connect Google Calendar"
5. Complete the OAuth flow
6. You should see your connected email address displayed

## Styling

The email display uses the theme system:
- Light theme: Green background with dark text
- Dark theme: Green background with light text
- Responsive and mobile-friendly

## Notes

- Email is stored unencrypted in the database (unlike tokens which are encrypted)
- Email is used for display purposes only
- If email is not available from Google profile, the field will be null
- Disconnecting the calendar also removes the stored email
