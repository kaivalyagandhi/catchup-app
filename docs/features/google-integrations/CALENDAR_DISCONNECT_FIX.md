# Google Calendar Disconnect Fix

## Issue

The "Disconnect Calendar" button in the preferences section wasn't working properly because:

1. The `checkCalendarConnection()` function was updated to return an object `{connected, email, expiresAt}` instead of just a boolean
2. The `loadPreferences()` function was still expecting a boolean value
3. This caused `calendarConnected` to be an object instead of a boolean, breaking the conditional rendering

## Root Cause

When the calendar status check was updated to include email information, the return type changed but the preferences page wasn't updated to handle the new format.

## Changes Made

### Frontend (`public/js/app.js`)

1. **Updated `loadPreferences()` function**:
   - Changed to properly destructure the status object returned by `checkCalendarConnection()`
   - Extracts the `connected` property to use in conditional rendering
   - Maintains backward compatibility with the rest of the preferences UI

2. **Improved `disconnectCalendar()` function**:
   - Added better error handling and logging
   - Retrieves auth token from localStorage if not in memory
   - Shows detailed error messages to the user
   - Logs each step of the disconnect process

### Backend (`src/api/routes/google-calendar-oauth.ts`)

1. **Enhanced `DELETE /api/calendar/oauth/disconnect` endpoint**:
   - Added detailed logging for debugging
   - Improved error messages with details
   - Better error handling and reporting

## How It Works Now

### Disconnect Flow

1. User clicks "Disconnect Calendar" button (in calendar section or preferences)
2. Confirmation dialog appears
3. Frontend sends DELETE request to `/api/calendar/oauth/disconnect` with JWT token
4. Backend:
   - Verifies user is authenticated
   - Deletes the OAuth token from database
   - Logs the action
   - Returns success response
5. Frontend:
   - Reloads calendar view
   - Refreshes preferences if currently viewing them
   - Shows success alert
6. Calendar section updates to show "Connect Google Calendar" button

### Error Handling

If disconnect fails, the user sees:
- Detailed error message in alert
- Console logs for debugging
- Server logs with specific error details

## Testing

### Manual Test

1. Log in to the app
2. Connect Google Calendar (if not already connected)
3. Go to Preferences
4. Click "Disconnect" button in the Google Calendar card
5. Confirm the dialog
6. Should see success message
7. Calendar section should update to show "Connect Google Calendar" button

### Verify in Database

After disconnect, verify the token was deleted:

```sql
SELECT * FROM oauth_tokens WHERE provider = 'google_calendar' AND user_id = '[your-user-id]';
```

Should return no rows.

## Browser Console Logs

When disconnecting, you should see:

```
Disconnecting Google Calendar...
Calendar disconnected successfully
```

## Server Logs

When disconnecting, you should see:

```
Disconnecting Google Calendar for user: [user-id]
Google Calendar disconnected successfully for user: [user-id]
```

## Files Modified

1. `public/js/app.js`
   - `loadPreferences()` - Fixed status object handling
   - `disconnectCalendar()` - Improved error handling

2. `src/api/routes/google-calendar-oauth.ts`
   - `DELETE /api/calendar/oauth/disconnect` - Added logging

## Backward Compatibility

The changes are fully backward compatible:
- The API response format hasn't changed
- The database schema hasn't changed
- Existing connected calendars continue to work
- The fix only affects the disconnect functionality

## Next Steps

If you encounter any issues:

1. Check browser console (F12 → Console) for error messages
2. Check server logs for backend errors
3. Verify auth token is valid: `localStorage.getItem('authToken')`
4. Check database for orphaned tokens: `SELECT * FROM oauth_tokens;`
