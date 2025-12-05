# Step 2: Circles Organization Handler

## Overview

The `Step2CirclesHandler` manages Step 2 of the contact onboarding flow, which focuses on organizing contacts into 4 simplified social circles. It automatically triggers the Manage Circles flow when users navigate to the Circles tab during onboarding.

## Features

### Core Functionality

1. **Auto-trigger Manage Circles Flow**
   - Automatically opens when user navigates to Circles tab during Step 2
   - Seamlessly integrates with existing directory navigation

2. **AI Circle Suggestions**
   - Fetches AI-generated circle suggestions from backend
   - Displays suggestions with confidence scores
   - Pre-selects high-confidence suggestions (≥80%)
   - Handles AI service failures gracefully

3. **Progress Tracking**
   - Shows encouraging messages at 25%, 50%, 75% milestones
   - Displays completion celebration at 100%
   - Updates onboarding state in real-time

4. **Capacity Warnings**
   - Shows visual warnings when circles exceed recommended capacity
   - Allows assignments to continue despite warnings
   - Provides gentle suggestions to rebalance

## Requirements Addressed

- **3.1, 3.2**: Navigate to Circles tab and auto-trigger Manage Circles flow
- **8.1, 8.2, 8.3**: Fetch and display AI circle suggestions with confidence scores
- **9.3, 10.5**: Show capacity warnings when circles exceed limits
- **9.4**: Display progress milestones and completion celebration

## Usage

### Initialization

The handler is automatically initialized when:
1. User is on Step 2 of onboarding
2. User navigates to Directory > Circles tab

```javascript
// Automatic initialization in app.js
async function initializeStep2Handler() {
    if (typeof Step2CirclesHandler === 'undefined' || !window.userId) {
        return;
    }
    
    const savedState = OnboardingStepIndicator.loadState();
    if (!savedState || savedState.isComplete || savedState.currentStep !== 2) {
        return;
    }
    
    const isOnCircles = window.location.hash === '#directory/circles' || 
                        (currentPage === 'directory' && currentDirectoryTab === 'circles');
    
    if (isOnCircles) {
        if (!step2Handler) {
            step2Handler = new Step2CirclesHandler(savedState);
        }
        
        setTimeout(async () => {
            await step2Handler.openManageCirclesFlow();
        }, 500);
    }
}
```

### Manual Usage

```javascript
// Create handler with onboarding state
const handler = new Step2CirclesHandler(onboardingState);

// Open Manage Circles flow
await handler.openManageCirclesFlow();

// Navigate to Step 2
await handler.navigateToStep();

// Clean up
handler.destroy();
```

## API Integration

### Fetch Contacts

```javascript
GET /api/contacts?userId={userId}
Authorization: Bearer {token}

Response:
[
  {
    id: 1,
    name: "John Doe",
    circle: "inner",
    dunbarCircle: "inner"
  },
  ...
]
```

### Fetch AI Suggestions

```javascript
POST /api/ai/circle-suggestions
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user-123",
  "contactIds": [1, 2, 3, ...]
}

Response:
{
  "suggestions": [
    {
      "contactId": 1,
      "suggestedCircle": "inner",
      "confidence": 85,
      "reason": "Frequent communication and calendar co-attendance"
    },
    ...
  ]
}
```

### Save Circle Assignment

```javascript
POST /api/contacts/{contactId}/circle
Authorization: Bearer {token}
Content-Type: application/json

{
  "circle": "inner",
  "assignedBy": "user"
}
```

## Progress Milestones

The handler tracks progress and shows encouraging messages:

- **25%**: "🎉 Great start! You're 25% done organizing your circles."
- **50%**: "🌟 Halfway there! Keep going!"
- **75%**: "✨ Almost done! Just a bit more!"
- **100%**: Shows completion celebration modal

## Capacity Warnings

Warnings are shown when circles exceed recommended capacity:

- **Inner Circle**: 10 contacts
- **Close Friends**: 25 contacts
- **Active Friends**: 50 contacts
- **Casual Network**: 100 contacts

Example warning:
```
⚠️ Inner Circle is over capacity (12/10). Consider rebalancing for better relationship management.
```

## Completion Celebration

When all contacts are categorized, a celebration modal is shown:

```
🎉 Amazing Work!

You've successfully organized all your contacts into circles.
Your relationship network is now ready for intelligent suggestions!

[Continue to Next Step]
```

## Event Handling

The handler listens for and emits events:

### Listens For

- `circle-assigned`: When a contact is assigned to a circle
  ```javascript
  window.dispatchEvent(new CustomEvent('circle-assigned', {
    detail: { contactId: 1, circle: 'inner' }
  }));
  ```

### Emits

Events are emitted through the ManageCirclesFlow component.

## State Management

The handler updates onboarding state through the global `onboardingIndicator`:

```javascript
const currentState = window.onboardingIndicator.state;
currentState.steps.circles.complete = true;
currentState.steps.circles.contactsCategorized = categorized;
currentState.steps.circles.totalContacts = total;
currentState.currentStep = 3;

window.onboardingIndicator.updateState(currentState);
```

## Error Handling

### AI Service Failures

AI suggestions are optional and failures are handled gracefully:

```javascript
try {
  await this.fetchAISuggestions();
} catch (error) {
  console.warn('Failed to fetch AI suggestions:', error);
  this.aiSuggestions = [];
  // Continue without AI suggestions
}
```

### Contact Fetch Failures

```javascript
try {
  await this.fetchContacts();
} catch (error) {
  console.error('Error opening Manage Circles flow:', error);
  showToast('Failed to load circle organization', 'error');
}
```

## Testing

Run the test suite:

```bash
# Open in browser
open public/js/step2-circles-handler.test.html
```

Test coverage includes:
- Handler initialization
- Contact fetching
- AI suggestions application
- Progress milestones
- Capacity warnings
- Manage Circles flow opening

## Integration with Manage Circles Flow

The handler creates a ManageCirclesFlow instance with onboarding-specific options:

```javascript
this.manageCirclesFlow = new ManageCirclesFlow(this.contacts, this.currentAssignments, {
  isOnboarding: true,
  onSave: () => this.handleSaveAndContinue(),
  onSkip: () => this.handleSkip(),
  onClose: () => this.handleClose()
});
```

## Navigation Flow

```
Step 1 Complete
    ↓
User clicks Step 2 in indicator
    ↓
Navigate to Directory > Circles tab
    ↓
Step2CirclesHandler.navigateToStep()
    ↓
Auto-open Manage Circles flow
    ↓
User assigns contacts to circles
    ↓
Progress tracked with milestones
    ↓
Capacity warnings shown if needed
    ↓
User clicks "Save & Continue"
    ↓
Mark Step 2 complete
    ↓
Prompt to continue to Step 3
```

## Files

- **Handler**: `public/js/step2-circles-handler.js`
- **Tests**: `public/js/step2-circles-handler.test.html`
- **Styles**: `public/css/manage-circles-flow.css` (celebration modal)
- **Integration**: `public/js/app.js` (initialization)

## Dependencies

- `OnboardingStepIndicator`: For state management
- `ManageCirclesFlow`: For the circles organization UI
- `showToast`: For notifications
- `navigateTo`, `switchDirectoryTab`: For navigation

## Browser Support

- Modern browsers with ES6+ support
- localStorage/sessionStorage for state persistence
- Fetch API for backend communication

## Accessibility

- Keyboard navigation supported through ManageCirclesFlow
- ARIA labels on interactive elements
- Screen reader friendly notifications
- High contrast color ratios

## Performance

- Debounced state updates
- Efficient contact filtering
- Lazy loading of AI suggestions
- Minimal DOM manipulation

## Future Enhancements

1. Batch AI suggestion requests
2. Offline support with service workers
3. Undo/redo functionality
4. Bulk circle assignment
5. Import/export circle assignments
6. Circle assignment history
