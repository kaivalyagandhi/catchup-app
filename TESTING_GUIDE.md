# CatchUp Testing Guide with Mock Data

## Quick Start - Test the Application

The server is running at `http://localhost:3000`. Here's how to test all the features:

## 1. Test Pages (No Auth Required)

Open these URLs in your browser to test the UI components:

### Contact Onboarding & Circular Visualizer
```
http://localhost:3000/circular-visualizer.test.html
```
**What to test:**
- Circular visualization of Dunbar's Number circles
- Drag and drop contacts between circles
- Visual feedback and animations
- Circle capacity indicators

### Onboarding Flow
```
http://localhost:3000/onboarding-controller.test.html
```
**What to test:**
- Complete onboarding workflow
- Contact import preview
- Circle assignment interface
- Progress tracking

### Gamification Features
```
http://localhost:3000/gamification-ui.test.html
```
**What to test:**
- Achievement badges
- Progress tracking
- Streak counters
- Level progression

### Weekly Catchup
```
http://localhost:3000/weekly-catchup.test.html
```
**What to test:**
- Weekly contact suggestions
- Review and dismiss functionality
- Contact prioritization

### Privacy Features
```
http://localhost:3000/privacy-features.test.html
```
**What to test:**
- Data export
- Contact visibility controls
- Privacy settings

### Educational Features
```
http://localhost:3000/educational-features.test.html
```
**What to test:**
- Dunbar's Number explanation
- Interactive tutorials
- Tooltips and help text

### Accessibility Features
```
http://localhost:3000/accessibility-enhancements.test.html
```
**What to test:**
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

## 2. Generate Test Data (Requires Auth)

### Option A: Use the Browser Console

1. Open any test page (e.g., `http://localhost:3000/circular-visualizer.test.html`)
2. Open browser DevTools (F12)
3. Go to Console tab
4. Run this code:

```javascript
// Generate test data
fetch('/api/test-data/seed', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token' // Mock token for testing
  },
  body: JSON.stringify({
    contactCount: 50,
    includeCalendarEvents: true,
    includeSuggestions: true,
    includeVoiceNotes: false
  })
})
.then(r => r.json())
.then(data => console.log('Test data created:', data))
.catch(err => console.error('Error:', err));
```

### Option B: Create a Test User First

The test pages include mock authentication. Just start using them - they'll create a test user automatically.

## 3. Test Individual Features

### Test Circular Visualizer
1. Go to `http://localhost:3000/circular-visualizer.test.html`
2. Click "Load Test Data" button
3. Try dragging contacts between circles
4. Test the filter and search functionality
5. Check circle capacity warnings

### Test Drag & Drop
1. Go to `http://localhost:3000/circular-visualizer-drag-test.html`
2. Drag contacts from one circle to another
3. Verify visual feedback during drag
4. Check that changes persist

### Test Group Filtering
1. Go to `http://localhost:3000/circular-visualizer-group-filter.test.html`
2. Use the group filter dropdown
3. Verify contacts are filtered correctly
4. Test "All Groups" option

### Test AI Suggestions
1. Go to `http://localhost:3000/ai-suggestion-ui.test.html`
2. View AI-generated suggestions
3. Accept or dismiss suggestions
4. Check suggestion reasoning

### Test Preference Settings
1. Go to `http://localhost:3000/preference-setting-ui.test.html`
2. Set contact frequency preferences
3. Test batch preference updates
4. Verify preferences are saved

## 4. Test API Endpoints

### Check Server Status
```bash
curl http://localhost:3000/api/health
```

### Get Test Data Status
```bash
curl http://localhost:3000/api/test-data/status
```

### Get Contacts (requires auth)
```bash
curl -H "Authorization: Bearer test-token" \
  http://localhost:3000/api/contacts
```

### Get Groups
```bash
curl -H "Authorization: Bearer test-token" \
  http://localhost:3000/api/contacts/groups
```

## 5. Test WebSocket (Voice Notes)

The voice notes feature uses WebSocket. To test:

1. Open browser console on any page
2. Run this code:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/voice-notes');

ws.onopen = () => {
  console.log('WebSocket connected');
  
  // Start a session
  ws.send(JSON.stringify({
    type: 'start_session',
    data: {
      languageCode: 'en-US',
      userContacts: []
    }
  }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

## 6. Common Test Scenarios

### Scenario 1: New User Onboarding
1. Open `http://localhost:3000/onboarding-controller.test.html`
2. Click "Start Onboarding"
3. Follow the wizard steps
4. Assign contacts to circles
5. Complete onboarding

### Scenario 2: Managing Contacts
1. Open `http://localhost:3000/circular-visualizer.test.html`
2. View contacts in circles
3. Drag contacts to different circles
4. Set frequency preferences
5. View contact details

### Scenario 3: Weekly Review
1. Open `http://localhost:3000/weekly-catchup.test.html`
2. Review suggested contacts
3. Mark contacts as "caught up"
4. Dismiss suggestions
5. Check updated suggestions

### Scenario 4: Achievement Progress
1. Open `http://localhost:3000/gamification-ui.test.html`
2. View current achievements
3. Check progress bars
4. See unlocked badges
5. Track streaks

## 7. Troubleshooting

### No Data Showing
- Check browser console for errors
- Verify server is running (check terminal)
- Try clicking "Load Test Data" button on test pages

### API Errors
- Check server logs in terminal
- Verify database is running: `npm run db:test`
- Check `.env` file has correct settings

### WebSocket Connection Failed
- Verify server is running
- Check for port conflicts
- Look for errors in browser console

## 8. Next Steps

Once you've tested with mock data:

1. **Set up Google OAuth** to test real Google Contacts integration
   - See `GOOGLE_CLOUD_SETUP_GUIDE.md`
   - Update `.env` with real credentials

2. **Test Calendar Integration**
   - Connect Google Calendar
   - View availability
   - Generate suggestions based on calendar

3. **Test Voice Notes**
   - Set up Google Speech-to-Text API
   - Record voice notes
   - Test transcription and entity extraction

## Test Data Details

The test data generator creates:
- **50 contacts** with realistic names, emails, phones
- **5 groups** (Family, Work, College Friends, etc.)
- **10 tags** (interests like "hiking", "cooking", etc.)
- **Calendar events** (meetings, availability blocks)
- **Suggestions** (AI-generated connection suggestions)
- **Interaction logs** (simulated past interactions)

All test data is isolated per user and can be cleared/regenerated anytime.
