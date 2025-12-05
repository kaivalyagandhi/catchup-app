# Step 1 Integrations Handler

## Overview

The Step 1 Integrations Handler manages the first step of the onboarding flow, guiding users to connect their Google Calendar and Google Contacts integrations.

## Features

### 1. Navigation & Highlighting
- Automatically navigates to the Preferences page
- Highlights Google Calendar and Contacts sections with pulsing animation
- Adds helpful tooltips to guide users
- Scrolls to the first highlighted section

### 2. Connection Monitoring
- Listens for `google-calendar-connected` and `google-contacts-connected` events
- Checks current connection status on initialization
- Updates onboarding state when connections succeed
- Removes highlights as integrations are connected

### 3. Error Handling
- Listens for connection error events
- Provides user-friendly error messages with troubleshooting guidance
- Shows retry buttons for failed connections
- Handles common error scenarios (popups blocked, permissions denied, network issues)

### 4. Step Completion
- Automatically detects when both integrations are connected
- Marks Step 1 as complete in onboarding state
- Shows completion celebration message
- Prompts user to continue to Step 2 (Circles)

## Requirements Satisfied

- **2.1**: Navigate to Preferences page
- **2.2**: Highlight Google Calendar and Contacts sections
- **2.3**: Mark calendar portion complete on successful connection
- **2.4**: Mark contacts portion complete on successful connection
- **2.5**: Mark Step 1 fully complete when both integrations connected
- **13.1**: Display success message for calendar connection
- **13.2**: Display success message for contacts connection
- **13.3**: Show visual indicator that Step 1 is complete
- **13.4**: Handle integration connection failures with clear messages
- **13.5**: Enable Step 2 and provide prompt to continue

## Usage

### Initialization

The handler is automatically initialized when:
1. User is authenticated
2. User is on Step 1 of onboarding
3. User navigates to the Preferences page

```javascript
// Automatic initialization in app.js
async function initializeStep1Handler() {
    if (typeof Step1IntegrationsHandler === 'undefined' || !window.userId) {
        return;
    }
    
    const savedState = OnboardingStepIndicator.loadState();
    if (!savedState || savedState.isComplete || savedState.currentStep !== 1) {
        return;
    }
    
    const isOnPreferences = window.location.hash === '#preferences';
    
    if (isOnPreferences) {
        const stateManager = getOnboardingStateManagerForUI();
        step1Handler = new Step1IntegrationsHandler(stateManager, window.userId);
        await step1Handler.initialize();
        
        setTimeout(() => {
            step1Handler.highlightIntegrationSections();
            step1Handler.setupConnectionListeners();
        }, 500);
    }
}
```

### Manual Usage

```javascript
// Create handler
const stateManager = getOnboardingStateManagerForUI();
const handler = new Step1IntegrationsHandler(stateManager, userId);

// Initialize
await handler.initialize();

// Navigate to step
await handler.navigateToStep();

// Clean up when done
handler.destroy();
```

## Events

### Dispatched Events

**`onboarding-step1-complete`**
- Fired when both integrations are successfully connected
- Detail: `{ userId: string }`

### Listened Events

**`google-calendar-connected`**
- Fired when Google Calendar is successfully connected
- Detail: `{ email: string, timestamp: Date }`

**`google-contacts-connected`**
- Fired when Google Contacts is successfully connected
- Detail: `{ email: string, timestamp: Date }`

**`google-calendar-error`**
- Fired when Google Calendar connection fails
- Detail: `{ integration: 'google-calendar', error: string }`

**`google-contacts-error`**
- Fired when Google Contacts connection fails
- Detail: `{ integration: 'google-contacts', error: string }`

## Integration Points

### Google Calendar Integration

The handler expects the Google Calendar OAuth callback to dispatch the connection event:

```javascript
// In handleCalendarOAuthCallback()
window.dispatchEvent(new CustomEvent('google-calendar-connected', {
    detail: { 
        email: data.email,
        timestamp: new Date()
    }
}));
```

### Google Contacts Integration

The handler expects the Google Contacts OAuth callback to dispatch the connection event:

```javascript
// In handleGoogleContactsOAuthCallback()
window.dispatchEvent(new CustomEvent('google-contacts-connected', {
    detail: { 
        email: result.email,
        timestamp: new Date()
    }
}));
```

## Styling

The handler uses CSS classes defined in `onboarding-indicator.css`:

### Highlight Animation
```css
.onboarding-highlight {
    position: relative;
    animation: pulse-highlight 2s ease-in-out infinite;
}

.onboarding-highlight::before {
    content: '';
    position: absolute;
    inset: -4px;
    border: 2px solid var(--accent-primary);
    border-radius: 12px;
    pointer-events: none;
}
```

### Tooltip
```css
.onboarding-highlight-tooltip {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent-primary);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
}
```

## Testing

A comprehensive test page is available at `public/js/step1-integrations-handler.test.html`.

### Test Features
- Initialize handler
- Navigate to Step 1
- Simulate successful connections
- Simulate connection errors
- View current state
- Monitor event log
- Reset state

### Running Tests

1. Open `http://localhost:3000/js/step1-integrations-handler.test.html`
2. Click "Initialize Handler"
3. Click "Navigate to Step 1" to see highlights
4. Use simulation buttons to test different scenarios
5. Monitor the event log and state display

## Error Messages

The handler provides context-specific error messages:

| Error Type | Message |
|------------|---------|
| Popup blocked | "Connection failed. Please allow popups and try again." |
| Permission denied | "Connection failed. Please grant the required permissions." |
| Network error | "Connection failed. Please check your internet connection and try again." |
| Generic error | "Connection failed. Try: 1) Refresh the page 2) Clear browser cache 3) Try a different browser" |

## State Management

The handler integrates with the onboarding state manager to track progress:

```javascript
// State structure
{
    userId: string,
    currentStep: 1,
    steps: {
        integrations: {
            complete: boolean,
            googleCalendar: boolean,
            googleContacts: boolean
        }
    }
}
```

### State Updates

1. **Calendar Connected**: `updateGoogleCalendarConnection(userId, true)`
2. **Contacts Connected**: `updateGoogleContactsConnection(userId, true)`
3. **Step Complete**: `markStep1Complete(userId, true, true)`

## Files

- **Handler**: `public/js/step1-integrations-handler.js`
- **Styles**: `public/css/onboarding-indicator.css`
- **Test Page**: `public/js/step1-integrations-handler.test.html`
- **Integration**: `public/js/app.js` (initialization)
- **HTML**: `public/index.html` (script loading)

## Dependencies

- `OnboardingStepIndicator` - For state management
- `showToast()` - For user notifications
- `navigateTo()` - For page navigation
- Stone & Clay theme CSS variables

## Browser Support

- Modern browsers with ES6+ support
- CustomEvent API
- localStorage/sessionStorage
- CSS animations

## Future Enhancements

1. Add progress indicators during OAuth flow
2. Support for additional integrations (Outlook, Apple Calendar)
3. Animated transitions between highlights
4. Keyboard navigation support
5. Screen reader announcements for accessibility
