# Weekly Catchup UI Component

A progressive contact review system that breaks contact management into manageable weekly sessions of 10-15 contacts.

## Features

- **Progressive Review**: Review 10-15 contacts per week instead of being overwhelmed by hundreds
- **Smart Prioritization**: Automatically prioritizes uncategorized contacts, maintenance checks, and pruning candidates
- **Progress Tracking**: Visual progress bar with estimated time remaining
- **Flexible Actions**: Keep, archive, or update circle assignments for each contact
- **Session Management**: Skip sessions with automatic rescheduling of unreviewed contacts
- **Celebration**: Positive feedback when completing weekly sessions

## Requirements

This component implements Requirements 7.1-7.5 from the Contact Onboarding specification:

- **7.1**: Generate weekly sessions with 10-15 contacts
- **7.2**: Display progress indicators and estimated time
- **7.3**: Celebrate session completion
- **7.4**: Reschedule unreviewed contacts when skipping
- **7.5**: Focus on relationship maintenance after initial categorization

## Installation

1. Include the script in your HTML:

```html
<script src="/js/weekly-catchup.js"></script>
```

2. Add a container element:

```html
<div id="weekly-catchup-container"></div>
```

3. Initialize the component:

```javascript
const weeklyCatchupUI = new WeeklyCatchupUI('weekly-catchup-container');
```

## API Endpoints

The component uses the following API endpoints:

### Start Session
```
POST /api/weekly-catchup/start
```

Starts a new weekly catchup session or returns existing incomplete session.

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "weekNumber": 48,
    "year": 2025,
    "contactsToReview": [...],
    "progress": {
      "totalContacts": 12,
      "reviewedContacts": 0,
      "percentComplete": 0,
      "estimatedTimeRemaining": 24
    }
  }
}
```

### Get Current Session
```
GET /api/weekly-catchup/current
```

Returns the current active session if one exists.

### Get Next Contact
```
GET /api/weekly-catchup/:sessionId/next
```

Returns the next contact to review in the session.

**Response:**
```json
{
  "success": true,
  "contact": {
    "contactId": "uuid",
    "reviewType": "categorize",
    "lastInteraction": "2025-01-15T10:00:00Z",
    "suggestedAction": "Assign to a circle"
  }
}
```

### Review Contact
```
POST /api/weekly-catchup/:sessionId/review
```

Marks a contact as reviewed and applies the specified action.

**Request Body:**
```json
{
  "contactId": "uuid",
  "action": "update_circle",
  "circle": "close",
  "frequencyPreference": "weekly"
}
```

**Actions:**
- `keep`: Keep contact as-is
- `archive`: Archive the contact
- `update_circle`: Move to a different circle
- `set_preference`: Update frequency preference

### Complete Session
```
POST /api/weekly-catchup/:sessionId/complete
```

Marks the session as complete and triggers celebration.

### Skip Session
```
POST /api/weekly-catchup/:sessionId/skip
```

Skips the current session. Unreviewed contacts will be included in next week's session.

### Get Progress
```
GET /api/weekly-catchup/:sessionId/progress
```

Returns current progress for the session.

## Usage Examples

### Basic Usage

```javascript
// Initialize the UI
const weeklyCatchupUI = new WeeklyCatchupUI('weekly-catchup-container');

// The UI will automatically:
// 1. Check for an active session
// 2. Load the next contact to review
// 3. Display progress
```

### Manual Session Control

```javascript
// Start a new session
await weeklyCatchupUI.startNewSession();

// Skip the current session
await weeklyCatchupUI.skipSession();

// Complete the session
await weeklyCatchupUI.completeSession();
```

### Custom Actions

```javascript
// Review contact with custom action
await weeklyCatchupUI.reviewContact('update_circle', {
  circle: 'inner'
});

// Archive contact
await weeklyCatchupUI.reviewContact('archive');

// Keep contact as-is
await weeklyCatchupUI.reviewContact('keep');
```

## Review Types

The system categorizes contacts into three review types:

### 1. Categorize
Contacts that haven't been assigned to a circle yet.

**Actions:**
- Assign to any of the 5 Dunbar circles
- Archive if no longer relevant

### 2. Maintain
Contacts that haven't been contacted recently (30+ days).

**Actions:**
- Keep as-is
- Move to different circle
- Archive

### 3. Prune
Contacts with no interaction in 180+ days.

**Actions:**
- Keep contact
- Archive contact

## Styling

The component uses CSS classes that can be customized:

```css
/* Main containers */
.weekly-catchup-empty
.weekly-catchup-complete
.weekly-catchup-review

/* Progress bar */
.weekly-catchup-progress
.progress-bar
.progress-fill

/* Contact card */
.contact-review-card
.contact-header
.contact-avatar
.contact-details

/* Actions */
.review-actions
.circle-buttons

/* Celebration */
.celebration-overlay
.celebration-content
```

## Integration with Onboarding

The Weekly Catchup feature integrates seamlessly with the onboarding flow:

1. After initial onboarding, users can start their first weekly catchup
2. Uncategorized contacts are prioritized in weekly sessions
3. Progress is tracked in the onboarding state
4. Completion updates gamification metrics

## Session Generation Logic

The system generates sessions with the following priority:

1. **Unreviewed contacts from skipped sessions** (highest priority)
2. **Uncategorized contacts** (need circle assignment)
3. **Maintenance contacts** (no contact in 30+ days)
4. **Pruning candidates** (no contact in 180+ days)

Sessions are limited to 10-15 contacts to keep them manageable.

## Progress Tracking

Progress is calculated as:
- **Total Contacts**: Number of contacts in the session
- **Reviewed Contacts**: Number of contacts that have been reviewed
- **Percent Complete**: (Reviewed / Total) × 100
- **Estimated Time**: Remaining contacts × 2 minutes per contact

## Celebration

When a session is completed, the UI shows a celebration animation with:
- Confetti or emoji animation
- Congratulatory message
- Network health feedback
- Automatic return to dashboard after 3 seconds

## Error Handling

The component handles errors gracefully:

- Network errors show toast notifications
- Failed API calls are logged to console
- Users can retry actions
- Session state is preserved across errors

## Mobile Support

The UI is fully responsive and works on mobile devices:
- Touch-optimized buttons
- Responsive layouts
- Swipe gestures (future enhancement)
- Mobile-friendly progress indicators

## Accessibility

The component follows accessibility best practices:
- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast colors
- Focus indicators

## Testing

A test page is available at `/js/weekly-catchup.test.html` that demonstrates:
- No session state
- Active review UI
- Session complete state
- Celebration animation
- Error notifications

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android

## Performance

- Lazy loading of contact details
- Efficient DOM updates
- Minimal re-renders
- Optimized animations
- Caching of contact data

## Future Enhancements

Potential improvements for future versions:

1. **Batch Actions**: Review multiple contacts at once
2. **Undo**: Undo recent review actions
3. **Filters**: Filter contacts by type or circle
4. **Search**: Search within session contacts
5. **Notes**: Add quick notes during review
6. **Reminders**: Set reminders for specific contacts
7. **Analytics**: Track review patterns and insights
8. **Gamification**: Streaks, badges, and achievements

## Support

For issues or questions:
- Check the integration example: `/js/weekly-catchup-integration-example.js`
- Review the test page: `/js/weekly-catchup.test.html`
- Consult the API documentation: `/docs/ONBOARDING_API.md`

## License

Part of the CatchUp application. See main LICENSE file for details.
