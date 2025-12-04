# Google Calendar & Contacts Visual Testing Guide

## Prerequisites

### 1. Google Cloud Console Setup

Before you can test, you need to configure Google OAuth credentials:

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Select or create a project**
3. **Enable Required APIs:**
   - Navigate to "APIs & Services" → "Library"
   - Search and enable:
     - **Google Calendar API**
     - **People API** (for Contacts)

4. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add these **Authorized redirect URIs**:
     ```
     http://localhost:3000/api/auth/google/callback
     http://localhost:3000/api/contacts/oauth/callback
     ```
   - Copy the **Client ID** and **Client Secret**

5. **Update Your `.env` File:**
   
   Replace these lines in your `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_actual_client_secret
   ```

### 2. Verify Database is Running

```bash
# Test PostgreSQL connection
npm run db:test

# If not initialized, run:
npm run db:init
```

### 3. Verify Redis is Running

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start it:
brew services start redis
```

### 4. Enable Test Mode (Optional)

If you want to test with email/password auth alongside Google SSO:

In your `.env` file:
```bash
TEST_MODE=true
```

Otherwise, keep it as `false` for Google SSO only.

---

## Starting the Application

```bash
# Start the development server
npm run dev
```

The app will be available at: **http://localhost:3000**

---

## Visual Testing Flow

### Step 1: Initial Login/Registration

**Open your browser:** http://localhost:3000

You'll see the authentication screen with:

#### Option A: Google SSO (Recommended)
- Click the **"Sign in with Google"** button
- You'll be redirected to Google's consent screen
- Sign in with your Google account
- Grant the requested permissions
- You'll be redirected back to CatchUp

#### Option B: Email/Password (if TEST_MODE=true)
- Click "Don't have an account? Register"
- Fill in:
  - Name
  - Email
  - Password
- Click "Register"
- Then login with those credentials

**Expected Result:** You should be logged in and see the main dashboard

---

### Step 2: Test Onboarding Flow

After first login, the onboarding flow should trigger automatically for new users.

#### Onboarding Steps to Verify:

1. **Welcome Screen**
   - Should see a welcome message
   - Button to start onboarding

2. **Import Contacts**
   - Option to manually add contacts
   - Option to import from Google Contacts (we'll test this next)

3. **Circle Assignment**
   - Assign contacts to relationship circles (Close Friends, Good Friends, Acquaintances)
   - Visual circular interface for organizing contacts

4. **Preference Setting**
   - Set how often you want to catch up with each circle
   - Configure notification preferences

5. **Group Overlay**
   - Create custom groups for your contacts
   - Assign contacts to groups

6. **Completion**
   - Summary of your setup
   - Button to finish and go to dashboard

**To manually trigger onboarding:**
- Navigate to the "Contacts" page
- Click the **"⚙️ Manage Circles"** button

---

### Step 3: Test Google Calendar Integration

#### 3.1 Navigate to Account Settings

From the main dashboard:
1. Click on your **user email** in the header
2. Click **"Preferences"** or look for an **Account/Settings** section

#### 3.2 Connect Google Calendar

Look for a **"Connect Google Calendar"** button or similar option.

**Expected Flow:**
1. Click "Connect Google Calendar"
2. You'll be redirected to Google's OAuth consent screen
3. Review the permissions (read-only calendar access)
4. Click "Allow"
5. You'll be redirected back to CatchUp
6. Should see a success message: "✓ Google Calendar Connected"
7. Your connected email should be displayed

#### 3.3 Verify Calendar Connection

**Visual Indicators:**
- Status should show "Connected" with a green checkmark
- Your Google account email should be displayed
- Button should change to "Disconnect Calendar" or "Reconnect"

#### 3.4 Test Calendar Features

Once connected, test these features:

**A. View Suggestions with Calendar Context**
- Navigate to the "Suggestions" page
- Suggestions should now show calendar-aware information
- Look for indicators like:
  - "Free on [date]"
  - "Next available: [date/time]"
  - Calendar icon showing availability

**B. Schedule Preview**
- Click on a suggestion
- Should see a "View Schedule" or calendar preview option
- Opens a modal showing your calendar for that day
- Shows existing events and suggested meeting times

**C. Available Slots**
- Some suggestions may show "Available slots" information
- Based on your actual Google Calendar events

---

### Step 4: Test Google Contacts Integration

#### 4.1 Navigate to Contacts Import

From the dashboard:
1. Go to **"Contacts"** page
2. Look for **"Import from Google"** or **"Connect Google Contacts"** button

#### 4.2 Connect Google Contacts

**Expected Flow:**
1. Click "Import from Google" or "Connect Google Contacts"
2. Redirected to Google's OAuth consent screen
3. Review permissions (read-only contacts access)
4. Click "Allow"
5. Redirected back to CatchUp
6. Should see a loading indicator: "Syncing contacts..."
7. Success message: "✓ Contacts synced successfully"

#### 4.3 Verify Contacts Sync

**Visual Verification:**
- Your Google Contacts should now appear in the contacts list
- Each contact should show:
  - Name
  - Email (if available)
  - Phone number (if available)
  - Source indicator: "Google" or similar badge
  - Profile picture (if available from Google)

**Check for:**
- Contact count increased
- Google contacts are marked/tagged as imported
- No duplicate contacts (if you had some manually added)

#### 4.4 Test Sync Status

Look for a sync status indicator:
- Last synced time
- Sync status (Success/In Progress/Failed)
- Option to "Sync Now" or "Refresh"

---

### Step 5: Test Combined Features

Now that both integrations are connected, test the combined functionality:

#### 5.1 Contact Suggestions with Calendar

1. Navigate to **"Suggestions"** page
2. Suggestions should now be smarter:
   - Based on your imported Google Contacts
   - Considering your Google Calendar availability
   - Showing when you're both free

#### 5.2 Create Voice Notes for Google Contacts

1. Go to **"Voice Notes"** page
2. Record a voice note mentioning a Google Contact by name
3. The system should:
   - Transcribe the audio
   - Identify the contact from your Google Contacts
   - Link the note to that contact
   - Extract tags/interests mentioned

#### 5.3 Group Suggestions

1. Check if group suggestions appear
2. Should suggest meeting multiple contacts at once
3. Based on:
   - Shared interests/tags
   - Mutual availability (from calendar)
   - Time since last contact

---

## Testing Checklist

### Google Calendar Integration ✓

- [ ] Connect Google Calendar button visible
- [ ] OAuth flow redirects to Google
- [ ] Successfully grants permissions
- [ ] Redirects back to CatchUp
- [ ] Shows "Connected" status
- [ ] Displays connected email
- [ ] Suggestions show calendar context
- [ ] Schedule preview works
- [ ] Can disconnect calendar
- [ ] Can reconnect calendar

### Google Contacts Integration ✓

- [ ] Import from Google button visible
- [ ] OAuth flow redirects to Google
- [ ] Successfully grants permissions
- [ ] Redirects back to CatchUp
- [ ] Shows sync progress
- [ ] Contacts appear in list
- [ ] Contact details are correct
- [ ] Source badge shows "Google"
- [ ] Profile pictures load (if available)
- [ ] No duplicate contacts
- [ ] Sync status is displayed
- [ ] Can trigger manual sync

### Onboarding Flow ✓

- [ ] Triggers automatically for new users
- [ ] Welcome screen appears
- [ ] Can navigate through all steps
- [ ] Import contacts step works
- [ ] Circle assignment interface loads
- [ ] Can assign contacts to circles
- [ ] Preference setting saves correctly
- [ ] Group overlay works
- [ ] Completion screen appears
- [ ] Can access dashboard after completion
- [ ] Can re-trigger from "Manage Circles" button

### Combined Features ✓

- [ ] Suggestions use both calendar and contacts
- [ ] Voice notes recognize Google contacts
- [ ] Group suggestions work
- [ ] Calendar shows availability for contacts
- [ ] Can schedule with imported contacts

---

## Troubleshooting

### "Invalid client" Error

**Problem:** OAuth fails with "invalid client" error

**Solution:**
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
2. Check that redirect URIs match exactly in Google Cloud Console
3. Ensure APIs are enabled (Calendar API, People API)

### Calendar Not Connecting

**Problem:** Calendar connection fails or shows error

**Solution:**
1. Check browser console for errors (F12)
2. Verify redirect URI: `http://localhost:3000/api/auth/google/callback`
3. Check server logs for detailed error messages
4. Ensure `ENCRYPTION_KEY` is set in `.env`

### Contacts Not Syncing

**Problem:** Contacts import fails or shows no contacts

**Solution:**
1. Verify People API is enabled in Google Cloud Console
2. Check that your Google account has contacts
3. Look for sync errors in the UI
4. Check server logs for API errors
5. Verify redirect URI: `http://localhost:3000/api/contacts/oauth/callback`

### Onboarding Not Triggering

**Problem:** Onboarding doesn't start for new users

**Solution:**
1. Check if user is marked as "onboarded" in database
2. Clear browser localStorage and try again
3. Manually trigger from "Manage Circles" button
4. Check browser console for JavaScript errors

### Token Expired

**Problem:** "Token expired" or "Unauthorized" errors

**Solution:**
1. The system should auto-refresh tokens
2. If it fails, disconnect and reconnect the integration
3. Check that refresh tokens are being stored correctly

---

## Browser Developer Tools Tips

### Check Network Requests

1. Open Developer Tools (F12)
2. Go to "Network" tab
3. Filter by "Fetch/XHR"
4. Look for:
   - `/api/calendar/oauth/*` requests
   - `/api/contacts/oauth/*` requests
   - `/api/onboarding/*` requests

### Check Console Logs

1. Open Developer Tools (F12)
2. Go to "Console" tab
3. Look for:
   - Error messages (red)
   - Warning messages (yellow)
   - Success messages (blue/green)

### Check Local Storage

1. Open Developer Tools (F12)
2. Go to "Application" tab
3. Expand "Local Storage"
4. Check for:
   - `catchup-auth-token`
   - `catchup-onboarding-state`
   - `catchup-theme`

---

## Expected Visual Elements

### Dashboard Header
- CatchUp logo/title
- Navigation: Contacts, Suggestions, Voice Notes, Groups & Tags
- User info with email
- Preferences button
- Logout button
- Theme toggle (light/dark mode)

### Account/Settings Section
- Google Calendar connection status
- Google Contacts connection status
- Connect/Disconnect buttons
- Last sync information
- Notification preferences

### Contacts Page
- List of all contacts
- Import from Google button
- Add contact manually button
- Manage Circles button
- Search/filter options
- Contact cards with details

### Suggestions Page
- Suggestion cards
- Filter options (All, Individual, Group)
- Calendar indicators
- "View Schedule" buttons
- Action buttons (Accept, Dismiss, Snooze)

---

## Success Criteria

You've successfully tested the integrations when:

1. ✅ You can log in with Google SSO
2. ✅ Onboarding flow completes without errors
3. ✅ Google Calendar connects and shows "Connected" status
4. ✅ Google Contacts sync and appear in your contacts list
5. ✅ Suggestions show calendar-aware information
6. ✅ Schedule preview displays your actual calendar events
7. ✅ Voice notes recognize your Google contacts by name
8. ✅ You can disconnect and reconnect both integrations
9. ✅ No console errors in browser developer tools
10. ✅ All features work smoothly together

---

## Next Steps After Testing

Once you've verified everything works:

1. **Test with multiple Google accounts** to ensure it works for different users
2. **Test edge cases:**
   - Account with no calendar events
   - Account with no contacts
   - Account with many contacts (100+)
3. **Test disconnection and reconnection** flows
4. **Test token refresh** by waiting for tokens to expire
5. **Test error handling** by temporarily disabling APIs in Google Cloud Console

---

## Need Help?

If you encounter issues:

1. Check the server logs: Look at the terminal where `npm run dev` is running
2. Check browser console: F12 → Console tab
3. Check network requests: F12 → Network tab
4. Review the `.env` file for correct configuration
5. Verify Google Cloud Console settings match the guide

Happy testing! 🚀
