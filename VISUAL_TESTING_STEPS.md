# Visual Testing Steps - Google Calendar & Contacts

## 🎯 What We're Testing

1. ✅ Google Calendar Connection
2. ✅ Google Contacts Import
3. ✅ Combined functionality

---

## Step 1: Navigate to Preferences

1. **You should already be logged in** (from the Google SSO test)
2. **Click your email** in the header (top right)
3. **Click "Preferences"** button
4. You should see the Preferences page with two sections:
   - **Notifications** (left side)
   - **Integrations** (right side)

---

## Step 2: Test Google Calendar Connection

### A. Connect Calendar

1. In the **Integrations** section, find the **Google Calendar** card
2. You should see:
   - Google Calendar icon
   - "Not Connected" status (red badge)
   - Description text
   - **"Connect Calendar"** button

3. **Click "Connect Calendar"**
4. You'll be redirected to Google's authorization page
5. **Sign in** with your Google account (if not already)
6. **Review permissions** - CatchUp is requesting:
   - Read access to your calendar events
   - Read-only access (won't modify your calendar)
7. **Click "Allow"**
8. You'll be redirected back to CatchUp

### B. Verify Connection

After authorization, you should see:
- ✅ **"Connected"** status (green badge)
- ✅ Your Google email displayed: "Connected as: your-email@gmail.com"
- ✅ Last sync status: "Not synced yet" or a timestamp
- ✅ **"Refresh"** or **"Sync Now"** button
- ✅ **"Disconnect"** button

### C. Test Calendar Sync

1. **Click "Sync Now"** or **"Refresh"** button
2. Wait a moment for sync to complete
3. You should see:
   - Updated "Last synced" timestamp
   - Success message/toast notification

---

## Step 3: Test Google Contacts Import

### A. Connect Google Contacts

1. Scroll down in the **Integrations** section
2. Find the **Google Contacts** card
3. You should see:
   - **Blue banner** at top: "One-Way Sync (Read-Only)"
   - Explanation that CatchUp never modifies your Google Contacts
   - Google Contacts icon
   - "Not Connected" status (red badge)
   - Description text
   - **"Connect Google Contacts"** button

4. **Click "Connect Google Contacts"**
5. You'll be redirected to Google's authorization page
6. **Sign in** with your Google account (if not already)
7. **Review permissions** - CatchUp is requesting:
   - Read access to your contacts
   - Read-only access (won't modify your contacts)
8. **Click "Allow"**
9. You'll be redirected back to CatchUp

### B. Verify Connection & Sync

After authorization, you should see:
- ✅ **"Connected (Read-Only)"** status (green badge)
- ✅ Your Google email displayed
- ✅ Sync status showing:
  - **Last Sync**: timestamp or "Never"
  - **Contacts Synced**: number of contacts imported
- ✅ **"Sync Now"** button
- ✅ **"Disconnect"** button

### C. Trigger Initial Sync

1. **Click "Sync Now"** button
2. You should see:
   - Loading indicator
   - "Syncing contacts..." message
3. Wait for sync to complete (may take a few seconds depending on contact count)
4. After sync completes:
   - ✅ "Contacts Synced" count updates
   - ✅ "Last Sync" shows current timestamp
   - ✅ Success toast notification

---

## Step 4: Verify Contacts Were Imported

### A. Navigate to Contacts Page

1. **Click "Contacts"** in the navigation menu
2. You should now see your imported Google Contacts in the list
3. Each contact should show:
   - Name
   - Email (if available)
   - Phone number (if available)
   - Source badge or indicator showing it came from Google

### B. Check Contact Details

1. **Click on a contact** to view details
2. Verify the information matches your Google Contacts:
   - Name
   - Email addresses
   - Phone numbers
   - Organization (if available)
   - Other fields

---

## Step 5: Test Combined Features

Now that both integrations are connected, test how they work together:

### A. View Suggestions with Calendar Context

1. **Navigate to "Suggestions"** page
2. Suggestions should now be smarter:
   - Based on your imported Google Contacts
   - Considering your Google Calendar availability
   - Showing when you're free to meet

3. Look for indicators like:
   - "Free on [date]"
   - "Next available: [date/time]"
   - Calendar icons showing availability

### B. Test Schedule Preview

1. On a suggestion card, look for **"View Schedule"** button
2. **Click it** to open schedule preview
3. You should see:
   - Your actual calendar events for that day
   - Suggested meeting times (highlighted)
   - Free slots between events

---

## Step 6: Test Disconnection (Optional)

### A. Disconnect Calendar

1. Go back to **Preferences** page
2. In Google Calendar card, **click "Disconnect"**
3. Confirm disconnection
4. Verify:
   - Status changes to "Not Connected"
   - "Connect Calendar" button appears again

### B. Reconnect Calendar

1. **Click "Connect Calendar"** again
2. You may be asked to authorize again (or it might use cached authorization)
3. Verify connection is restored

### C. Disconnect Contacts

1. In Google Contacts card, **click "Disconnect"**
2. Confirm disconnection
3. Verify:
   - Status changes to "Not Connected"
   - "Connect Google Contacts" button appears again

**Note**: Disconnecting Google Contacts does NOT delete the imported contacts from CatchUp. They remain in your local database.

---

## ✅ Success Checklist

After completing all steps, you should have:

- [x] Google Calendar connected and syncing
- [x] Google Contacts connected and synced
- [x] Contacts visible in Contacts page
- [x] Suggestions showing calendar-aware information
- [x] Schedule preview showing actual calendar events
- [x] Both integrations showing "Connected" status
- [x] Sync timestamps updating correctly
- [x] No errors in browser console (F12)

---

## 🐛 Troubleshooting

### Calendar Not Connecting

**Symptoms**: Error during authorization or connection fails

**Solutions**:
1. Check browser console (F12) for errors
2. Verify redirect URI in Google Cloud Console: `http://localhost:3000/api/auth/google/callback`
3. Ensure Google Calendar API is enabled
4. Try disconnecting and reconnecting

### Contacts Not Syncing

**Symptoms**: Sync button doesn't work or shows 0 contacts

**Solutions**:
1. Check browser console (F12) for errors
2. Verify redirect URI in Google Cloud Console: `http://localhost:3000/api/contacts/oauth/callback`
3. Ensure People API is enabled
4. Check that your Google account has contacts
5. Try disconnecting and reconnecting

### Contacts Not Appearing in List

**Symptoms**: Sync shows success but contacts don't appear

**Solutions**:
1. Refresh the Contacts page
2. Check if contacts are filtered/hidden
3. Look in browser console for errors
4. Check server logs for sync errors

### Authorization Loops

**Symptoms**: Keeps redirecting to Google authorization

**Solutions**:
1. Clear browser cache and cookies
2. Clear localStorage (F12 → Application → Local Storage → Clear)
3. Try in incognito/private window
4. Check that redirect URIs match exactly in Google Cloud Console

---

## 📊 What to Observe

### Visual Indicators

**Connected State**:
- ✅ Green "Connected" badge
- ✅ Email address displayed
- ✅ Sync timestamps
- ✅ Action buttons (Sync Now, Disconnect)

**Not Connected State**:
- ❌ Red "Not Connected" badge
- ❌ No email displayed
- ❌ Connect button visible

### Data Flow

1. **Authorization** → Google OAuth consent screen
2. **Callback** → Redirect back to CatchUp with auth code
3. **Token Exchange** → Backend exchanges code for access token
4. **Data Sync** → Backend fetches calendar events / contacts
5. **Storage** → Data stored in CatchUp database
6. **Display** → Data shown in UI

---

## 🎉 Next Steps After Testing

Once both integrations are working:

1. **Add more contacts** manually or wait for more to sync
2. **Test voice notes** - Record a note mentioning a contact by name
3. **Check suggestions** - See how they improve with calendar + contacts data
4. **Explore circle management** - Organize contacts into circles (test page for now)
5. **Test notifications** - Configure notification preferences

---

## 💡 Tips

- **Use a test Google account** with some contacts and calendar events for best results
- **Check browser console** (F12) throughout testing for any errors
- **Watch server logs** in the terminal where `npm run dev` is running
- **Take screenshots** of any errors for debugging
- **Test in incognito mode** if you encounter caching issues

Happy testing! 🚀
