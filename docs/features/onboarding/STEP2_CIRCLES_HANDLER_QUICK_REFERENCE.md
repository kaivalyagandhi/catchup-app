# Step 2 Circles Handler - Quick Reference

## Quick Start

```javascript
// Handler is auto-initialized when user is on Step 2 and navigates to Circles tab
// No manual initialization needed in most cases

// Manual usage if needed:
const handler = new Step2CirclesHandler(onboardingState);
await handler.openManageCirclesFlow();
```

## Key Methods

### `navigateToStep()`
Navigate to Circles tab and auto-open Manage Circles flow
```javascript
await handler.navigateToStep();
```

### `openManageCirclesFlow()`
Open the Manage Circles modal with AI suggestions
```javascript
await handler.openManageCirclesFlow();
```

### `fetchContacts()`
Fetch contacts from API
```javascript
await handler.fetchContacts();
// Result stored in handler.contacts
```

### `fetchAISuggestions()`
Fetch AI circle suggestions (gracefully handles failures)
```javascript
await handler.fetchAISuggestions();
// Result stored in handler.aiSuggestions
```

### `checkProgressMilestones()`
Check and display progress milestones
```javascript
handler.checkProgressMilestones();
// Shows toasts at 25%, 50%, 75%, 100%
```

### `checkCapacityWarnings()`
Check and display capacity warnings
```javascript
handler.checkCapacityWarnings();
// Shows warnings when circles exceed capacity
```

## Progress Milestones

| Progress | Message |
|----------|---------|
| 25% | 🎉 Great start! You're 25% done organizing your circles. |
| 50% | 🌟 Halfway there! Keep going! |
| 75% | ✨ Almost done! Just a bit more! |
| 100% | 🎊 Congratulations! All contacts categorized! |

## Circle Capacities

| Circle | Capacity | Warning Threshold |
|--------|----------|-------------------|
| Inner Circle | 10 | > 10 |
| Close Friends | 25 | > 25 |
| Active Friends | 50 | > 50 |
| Casual Network | 100 | > 100 |

## AI Suggestion Confidence

| Confidence | Behavior |
|------------|----------|
| ≥ 80% | Pre-selected automatically |
| < 80% | Shown as suggestion only |

## API Endpoints

### Get Contacts
```
GET /api/contacts?userId={userId}
Authorization: Bearer {token}
```

### Get AI Suggestions
```
POST /api/ai/circle-suggestions
Authorization: Bearer {token}
Body: { userId, contactIds }
```

### Save Circle Assignment
```
POST /api/contacts/{contactId}/circle
Authorization: Bearer {token}
Body: { circle, assignedBy }
```

## Events

### Listens For
- `circle-assigned`: Contact assigned to circle

### Emits Through ManageCirclesFlow
- Various UI events

## State Updates

```javascript
// Update onboarding state
const currentState = window.onboardingIndicator.state;
currentState.steps.circles.complete = true;
currentState.steps.circles.contactsCategorized = count;
currentState.steps.circles.totalContacts = total;
currentState.currentStep = 3;
window.onboardingIndicator.updateState(currentState);
```

## Error Handling

```javascript
// AI suggestions fail gracefully
try {
  await handler.fetchAISuggestions();
} catch (error) {
  // Continues without AI suggestions
  console.warn('AI suggestions unavailable');
}

// Contact fetch shows error
try {
  await handler.fetchContacts();
} catch (error) {
  showToast('Failed to load contacts', 'error');
}
```

## Testing

```bash
# Open test file in browser
open public/js/step2-circles-handler.test.html
```

## Common Issues

### Handler not initializing
- Check user is on Step 2: `savedState.currentStep === 2`
- Check user is on Circles tab: `currentDirectoryTab === 'circles'`
- Check Step2CirclesHandler is loaded: `typeof Step2CirclesHandler !== 'undefined'`

### AI suggestions not showing
- Check API endpoint is available
- Check network connectivity
- AI failures are graceful - handler continues without suggestions

### Progress not updating
- Check onboardingIndicator is initialized: `window.onboardingIndicator`
- Check state is being saved to localStorage
- Check circle assignments are being saved to backend

## Files

| File | Purpose |
|------|---------|
| `public/js/step2-circles-handler.js` | Main handler class |
| `public/js/step2-circles-handler.test.html` | Test suite |
| `public/css/manage-circles-flow.css` | Celebration modal styles |
| `public/js/app.js` | Integration and initialization |
| `public/index.html` | Script inclusion |

## Dependencies

- OnboardingStepIndicator
- ManageCirclesFlow
- showToast
- navigateTo, switchDirectoryTab

## Requirements

- **3.1, 3.2**: Auto-trigger on Circles tab
- **8.1, 8.2, 8.3**: AI suggestions
- **9.3, 10.5**: Capacity warnings
- **9.4**: Progress milestones
