# Step 1 Integrations Handler - Quick Reference

## Quick Start

```javascript
// Handler is auto-initialized when user is on Step 1 and visits Preferences page
// No manual initialization needed in normal flow
```

## Key Methods

### `navigateToStep()`
Navigate to Preferences page and highlight integration sections
```javascript
await handler.navigateToStep();
```

### `highlightIntegrationSections()`
Add pulsing highlights to Google Calendar and Contacts sections
```javascript
handler.highlightIntegrationSections();
```

### `setupConnectionListeners()`
Set up event listeners for connection success/failure
```javascript
handler.setupConnectionListeners();
```

### `checkStepCompletion()`
Check if both integrations are connected and mark step complete
```javascript
await handler.checkStepCompletion();
```

### `destroy()`
Clean up event listeners and remove highlights
```javascript
handler.destroy();
```

## Events to Dispatch

### From Google Calendar Integration
```javascript
// On success
window.dispatchEvent(new CustomEvent('google-calendar-connected', {
    detail: { email: 'user@example.com', timestamp: new Date() }
}));

// On error
window.dispatchEvent(new CustomEvent('google-calendar-error', {
    detail: { integration: 'google-calendar', error: 'Error message' }
}));
```

### From Google Contacts Integration
```javascript
// On success
window.dispatchEvent(new CustomEvent('google-contacts-connected', {
    detail: { email: 'user@example.com', timestamp: new Date() }
}));

// On error
window.dispatchEvent(new CustomEvent('google-contacts-error', {
    detail: { integration: 'google-contacts', error: 'Error message' }
}));
```

## CSS Classes

### Highlight
```html
<div class="onboarding-highlight" data-onboarding-highlight="true">
    <!-- Integration section -->
</div>
```

### Tooltip
```html
<div class="onboarding-highlight-tooltip">
    Connect your Google Calendar to enable smart scheduling
</div>
```

### Retry Button
```html
<button class="onboarding-retry-btn accent">
    Retry Connection
</button>
```

## Data Attributes

### Integration Sections
```html
<!-- Google Calendar -->
<div data-integration="google-calendar">...</div>

<!-- Google Contacts -->
<div data-integration="google-contacts">...</div>
```

## State Structure

```javascript
{
    userId: 'user-123',
    currentStep: 1,
    steps: {
        integrations: {
            complete: false,      // true when both connected
            googleCalendar: false, // true when calendar connected
            googleContacts: false  // true when contacts connected
        }
    }
}
```

## Common Patterns

### Check if Step 1 is Active
```javascript
const state = OnboardingStepIndicator.loadState();
const isStep1Active = state && !state.isComplete && state.currentStep === 1;
```

### Manually Trigger Step 1
```javascript
const stateManager = getOnboardingStateManagerForUI();
const handler = new Step1IntegrationsHandler(stateManager, userId);
await handler.initialize();
await handler.navigateToStep();
```

### Listen for Step Completion
```javascript
window.addEventListener('onboarding-step1-complete', (e) => {
    console.log('Step 1 complete for user:', e.detail.userId);
    // Navigate to Step 2 or show celebration
});
```

## Troubleshooting

### Highlights Not Showing
1. Check if sections have `data-integration` attribute
2. Verify handler is initialized
3. Check if `highlightIntegrationSections()` was called

### Events Not Firing
1. Verify event names match exactly
2. Check if listeners are set up before events dispatch
3. Look for errors in browser console

### State Not Updating
1. Check if state manager is properly initialized
2. Verify userId is set
3. Check localStorage for saved state

## Testing

```bash
# Open test page
open http://localhost:3000/js/step1-integrations-handler.test.html
```

## Files

| File | Purpose |
|------|---------|
| `step1-integrations-handler.js` | Main handler class |
| `onboarding-indicator.css` | Highlight styles |
| `app.js` | Auto-initialization |
| `google-contacts.js` | Contacts event dispatch |
| `app.js` (calendar section) | Calendar event dispatch |

## Requirements Mapping

| Requirement | Implementation |
|-------------|----------------|
| 2.1 | `navigateToStep()` navigates to Preferences |
| 2.2 | `highlightIntegrationSections()` adds highlights |
| 2.3 | `handleCalendarConnected()` updates state |
| 2.4 | `handleContactsConnected()` updates state |
| 2.5 | `checkStepCompletion()` marks complete |
| 13.1-13.2 | Success toasts in event handlers |
| 13.3 | Completion modal in `showCompletionMessage()` |
| 13.4 | Error handling in `handleConnectionError()` |
| 13.5 | Step 2 prompt in `promptForStep2()` |
