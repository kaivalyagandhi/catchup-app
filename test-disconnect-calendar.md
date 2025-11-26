# Testing Google Calendar Disconnect

## Manual Testing Steps

### 1. Connect Google Calendar First

1. Open http://localhost:3000
2. Log in with your account
3. Navigate to Calendar section
4. Click "Connect Google Calendar"
5. Complete the OAuth flow
6. Verify you see "Connected as: your-email@gmail.com"

### 2. Test Disconnect

1. Click "Disconnect Calendar" button
2. Confirm the dialog
3. Check browser console (F12 → Console) for logs:
   - Should see: `Disconnecting Google Calendar...`
   - Should see: `Calendar disconnected successfully`
4. The calendar section should update to show "Connect Google Calendar" button again

### 3. Verify in Database

Check that the token was deleted:

```sql
SELECT * FROM oauth_tokens WHERE provider = 'google_calendar';
```

Should return no rows after disconnect.

## Troubleshooting

### "You must be logged in to disconnect Google Calendar"

**Cause**: Auth token is missing from localStorage

**Solution**:
1. Check browser console: `localStorage.getItem('authToken')`
2. If empty, log out and log back in
3. Try disconnect again

### "Failed to disconnect calendar: [error message]"

**Cause**: Server error during disconnect

**Solution**:
1. Check server logs for detailed error message
2. Look for: `Error disconnecting Google Calendar:`
3. Common issues:
   - Database connection error
   - User ID mismatch
   - Token already deleted

### Disconnect button doesn't appear

**Cause**: Calendar status check failed or returned false

**Solution**:
1. Check browser console for errors in `loadCalendar()`
2. Verify auth token is valid
3. Check server logs for status endpoint errors

## Server Logs to Check

When testing disconnect, look for these logs in your terminal:

```
Disconnecting Google Calendar for user: [user-id]
Google Calendar disconnected successfully for user: [user-id]
```

If you see errors instead:

```
Error disconnecting Google Calendar: [error details]
```

## Browser Console Logs

Expected console output when disconnecting:

```
Disconnecting Google Calendar...
Calendar disconnected successfully
```

If you see errors:

```
Disconnect failed: {error: "...", details: "..."}
Error disconnecting calendar: ...
```

## API Testing with curl

If you have a valid JWT token, you can test the endpoint directly:

```bash
JWT_TOKEN="your_token_here"

curl -X DELETE http://localhost:3000/api/calendar/oauth/disconnect \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "message": "Google Calendar disconnected successfully"
}
```

Error response:
```json
{
  "error": "Failed to disconnect Google Calendar",
  "details": "[error message]"
}
```
