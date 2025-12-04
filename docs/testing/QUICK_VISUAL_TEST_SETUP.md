# Quick Visual Test Setup - Start Here! 🚀

## Current Status ✅

- ✅ PostgreSQL is running
- ✅ Redis is running
- ✅ Environment variables configured
- ⚠️ Google OAuth credentials need to be set up

## 3-Step Quick Start

### Step 1: Configure Google OAuth (5 minutes)

Your `.env` currently has placeholder values. You need real Google OAuth credentials:

```bash
# Current (needs updating):
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Get your credentials:**

1. Go to: https://console.cloud.google.com/
2. Create/select a project
3. Enable APIs:
   - Google Calendar API
   - People API
4. Create OAuth credentials (Web application)
5. Add redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `http://localhost:3000/api/contacts/oauth/callback`
6. Copy Client ID and Secret to your `.env` file

**Detailed instructions:** See `GOOGLE_INTEGRATION_VISUAL_TESTING_GUIDE.md`

### Step 2: Start the App

```bash
npm run dev
```

The server will start on: **http://localhost:3000**

### Step 3: Open Browser and Test

Open: **http://localhost:3000**

You should see:
- Login/Register screen
- "Sign in with Google" button (if TEST_MODE=true, also email/password option)

## Visual Testing Flow

### 1️⃣ First Login
- Click "Sign in with Google"
- Authorize with your Google account
- You'll be redirected back to CatchUp dashboard

### 2️⃣ Onboarding Flow (Auto-triggers for new users)
- Welcome screen
- Import contacts step
- Circle assignment (organize contacts)
- Preference setting
- Group overlay
- Completion

### 3️⃣ Connect Google Calendar
- Click your email in header → Preferences
- Find "Connect Google Calendar" button
- Authorize calendar access
- Verify "Connected" status appears

### 4️⃣ Import Google Contacts
- Go to Contacts page
- Click "Import from Google" button
- Authorize contacts access
- Watch contacts sync
- Verify contacts appear in list

### 5️⃣ Test Combined Features
- Check Suggestions page (should show calendar-aware suggestions)
- Try Voice Notes (should recognize your Google contacts)
- View Schedule preview on suggestions

## Quick Troubleshooting

### Can't connect to Google?
- Check your `.env` has real Google credentials (not placeholders)
- Verify redirect URIs match exactly in Google Cloud Console
- Check browser console (F12) for errors

### Onboarding not showing?
- It auto-triggers for new users only
- Manually trigger: Contacts page → "⚙️ Manage Circles" button

### Contacts not syncing?
- Verify People API is enabled in Google Cloud Console
- Check your Google account has contacts
- Look for error messages in UI or browser console

## What to Look For

### ✅ Success Indicators:
- "Connected" status with green checkmark
- Your Google email displayed
- Contacts appear with "Google" badge
- Suggestions show calendar context
- Schedule preview shows your actual events

### ❌ Error Indicators:
- Red error messages
- "Invalid client" errors → Check Google credentials
- "Token expired" → Should auto-refresh, if not reconnect
- Console errors → Check browser developer tools (F12)

## Browser Developer Tools

Press **F12** to open:

- **Console tab**: See error messages and logs
- **Network tab**: See API requests (filter by Fetch/XHR)
- **Application tab**: Check Local Storage for auth tokens

## Need More Details?

See the full guide: `GOOGLE_INTEGRATION_VISUAL_TESTING_GUIDE.md`

## Ready to Start?

1. ✅ Update `.env` with real Google credentials
2. ✅ Run `npm run dev`
3. ✅ Open http://localhost:3000
4. ✅ Follow the visual testing flow above

Happy testing! 🎉
