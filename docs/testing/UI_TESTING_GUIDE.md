# CatchUp UI Testing Guide

## Server is Running! 🎉

Your CatchUp application is now running at: **http://localhost:3000**

## Quick Start

1. **Open your browser** and navigate to: http://localhost:3000
2. You'll see the **Login/Sign Up** screen

## Testing the UI

### 1. Create an Account

1. Click "Sign up" link at the bottom
2. Enter an email (e.g., `test@example.com`)
3. Enter a password (minimum 6 characters)
4. Click "Sign Up"
5. You'll be automatically logged in

### 2. Add Your First Contact

1. Click the "Add Contact" button
2. Fill in the contact details:
   - **Name** (required): e.g., "John Doe"
   - **Phone**: e.g., "+1234567890"
   - **Email**: e.g., "john@example.com"
   - **Location**: e.g., "New York City" (timezone will be auto-detected!)
   - **Frequency Preference**: How often you want to connect (monthly, weekly, etc.)
   - **Notes**: Any additional context
3. Click "Save"
4. Your contact appears with the inferred timezone!

### 3. Manage Contacts

- **Search**: Use the search bar to filter contacts by name, email, or phone
- **Edit**: Click "Edit" on any contact card to update details
- **Delete**: Click "Delete" to remove a contact (with confirmation)

### 4. View Suggestions

1. Click "Suggestions" in the navigation
2. Initially empty - suggestions are generated based on:
   - Time since last contact + frequency preference
   - Calendar events (when calendar is connected)
   - Shared interests (tags)

### 5. Calendar Integration

1. Click "Calendar" in the navigation
2. See placeholder for Google Calendar OAuth
3. (Requires Google OAuth credentials in `.env` to fully test)

### 6. Voice Notes

1. Click "Voice Notes" in the navigation
2. See placeholder for voice recording
3. (Requires OpenAI API key in `.env` to fully test)

### 7. Preferences

1. Click "Preferences" in the navigation
2. Configure notification settings:
   - Enable/disable SMS and email
   - Set batch notification day and time
3. Click "Save Preferences"

### 8. Logout

- Click "Logout" button in the header
- You'll return to the login screen
- Your data is saved and will be there when you log back in

## Features to Test

### ✅ Working Features (No API Keys Required)

- **Authentication**: Register, login, logout
- **Contact Management**: Create, read, update, delete contacts
- **Timezone Inference**: Enter a city name and see timezone auto-detected
- **Frequency Preferences**: Set how often you want to connect with each contact
- **Search**: Filter contacts by name, email, or phone
- **Suggestions**: View pending suggestions (empty initially)
- **Session Persistence**: Refresh the page - you stay logged in!

### 🔑 Features Requiring API Keys

To test these features, add the appropriate API keys to your `.env` file:

#### Voice Notes (OpenAI)
```bash
OPENAI_API_KEY=sk-your-key-here
```

#### SMS Notifications (Twilio)
```bash
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-twilio-number
```

#### Email Notifications (SendGrid)
```bash
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@catchup.app
```

#### Calendar Integration (Google)
```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Testing Tips

### Multiple Users
1. Open an incognito/private window
2. Register a different account
3. Test with multiple users simultaneously

### Data Persistence
1. Add several contacts
2. Refresh the page
3. Your contacts are still there!
4. Logout and login again
5. Everything persists

### Timezone Detection
Try these cities to see timezone inference:
- "New York City" → America/New_York
- "London" → Europe/London
- "Tokyo" → Asia/Tokyo
- "San Francisco" → America/Los_Angeles
- "Sydney" → Australia/Sydney

### Frequency Preferences
Set different frequencies for different contacts:
- **Daily**: Very close friends/family
- **Weekly**: Close friends
- **Biweekly**: Good friends
- **Monthly**: Regular contacts
- **Quarterly**: Acquaintances

## API Testing via UI

The UI makes authenticated API calls to:
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/suggestions` - List suggestions

All requests include the JWT token in the Authorization header.

## Browser Developer Tools

Open browser DevTools (F12) to:
- **Console**: See API requests and responses
- **Network**: Monitor API calls
- **Application > Local Storage**: See stored auth token
- **Application > Local Storage**: Clear to force logout

## Troubleshooting

### "Failed to load contacts"
- Check the server is running (should see output in terminal)
- Check browser console for errors
- Verify you're logged in (token in localStorage)

### "Authentication failed"
- Make sure password is at least 6 characters
- Check if email is already registered (try logging in instead)

### Server not responding
- Check terminal for errors
- Verify PostgreSQL is running: `pg_isready`
- Verify Redis is running: `redis-cli ping`
- Restart server: Stop with Ctrl+C, then `npm run dev`

### Port already in use
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

## Next Steps

After testing the UI:

1. **Add more contacts** with different locations and frequencies
2. **Test the API directly** using the curl examples in `TESTING_GUIDE.md`
3. **Add API keys** to test voice notes and notifications
4. **Check the database** to see your data:
   ```bash
   psql -U postgres -d catchup_db -c "SELECT * FROM contacts;"
   ```

## UI Enhancements (Future)

The current UI is functional but basic. Future enhancements could include:
- Drag-and-drop contact grouping
- Calendar view for suggestions
- Voice recording interface
- Rich text notes
- Contact import from CSV
- Bulk operations
- Advanced filtering
- Dashboard with statistics

## Stopping the Server

When you're done testing:
1. Go to the terminal running the server
2. Press `Ctrl+C` to stop
3. Or use: `lsof -ti:3000 | xargs kill -9`

---

**Enjoy testing CatchUp!** 🚀

The UI provides a clean, intuitive interface for managing your relationships and staying connected with the people who matter most.
