# Step 3 Group Mapping Handler

## Overview

The `Step3GroupMappingHandler` manages the final step of the onboarding flow where users review AI-generated suggestions for mapping their Google Contact groups to CatchUp groups. This step helps users quickly organize their imported contacts into meaningful groups.

## Features

- **Automatic Navigation**: Navigates to Directory > Groups tab
- **AI-Powered Suggestions**: Displays intelligent mapping suggestions with confidence scores
- **Interactive Review**: Users can accept, reject, or modify each mapping
- **Graceful Degradation**: Handles empty mappings and API failures elegantly
- **Progress Tracking**: Tracks review progress and marks Step 3 complete
- **Completion Celebration**: Shows celebratory modal when onboarding is complete
- **Stone & Clay Theme**: Follows the warm, cozy design system

## Requirements Validated

- **5.1**: Navigate to Directory > Groups tab
- **5.2**: Fetch group mapping suggestions from API
- **5.3**: Display mapping cards with confidence badges
- **5.4**: Handle accept/reject actions with animations
- **5.5**: Mark Step 3 and onboarding complete
- **8.1**: Show completion celebration
- **16.1**: Apply Stone & Clay theme styling

## Usage

### Basic Initialization

```javascript
// Create state manager
const stateManager = new OnboardingStateManager();

// Create handler
const handler = new Step3GroupMappingHandler(stateManager, userId);

// Initialize
await handler.initialize();

// Navigate to step
await handler.navigateToStep();
```

### Integration with Onboarding Flow

```javascript
// In app.js or onboarding controller
if (onboardingState.currentStep === 3) {
  const step3Handler = new Step3GroupMappingHandler(stateManager, userId);
  await step3Handler.initialize();
  await step3Handler.navigateToStep();
}
```

## API Endpoints

### Get Mapping Suggestions

```
GET /api/google-contacts/mapping-suggestions?userId={userId}
Authorization: Bearer {token}

Response:
{
  "suggestions": [
    {
      "id": "mapping-1",
      "googleGroupId": "google-group-123",
      "googleGroupName": "Work Colleagues",
      "memberCount": 25,
      "suggestedGroupId": "catchup-group-456",
      "confidence": 85
    }
  ]
}
```

### Accept Mapping

```
POST /api/google-contacts/accept-mapping
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "userId": "user-123",
  "googleGroupId": "google-group-123",
  "catchupGroupId": "catchup-group-456",
  "mappingId": "mapping-1"
}

Response:
{
  "success": true
}
```

### Reject Mapping

```
POST /api/google-contacts/reject-mapping
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "userId": "user-123",
  "mappingId": "mapping-1"
}

Response:
{
  "success": true
}
```

## UI Components

### Mapping Card

Each mapping suggestion is displayed as a card with:

- **Source**: Google Contact group name and member count
- **Arrow**: Visual indicator of mapping direction
- **Target**: Dropdown to select CatchUp group
- **Confidence Badge**: Color-coded confidence score (high/medium/low)
- **Actions**: Accept and Skip buttons

### Confidence Levels

- **High (≥80%)**: Green badge - Strong recommendation
- **Medium (60-79%)**: Amber badge - Moderate recommendation
- **Low (<60%)**: Gray badge - Weak recommendation

### Empty State

When no mappings are available:
- Shows friendly empty state message
- Provides "Complete Onboarding" button
- Allows users to skip this step

### Completion Celebration

When onboarding is complete:
- 🎉 Celebration icon with animation
- "You're All Set!" message
- List of features now available
- "Get Started" button to begin using the app

## State Management

### State Updates

The handler updates the onboarding state:

```javascript
{
  steps: {
    groups: {
      complete: true,
      mappingsReviewed: 3,
      totalMappings: 3
    }
  },
  isComplete: true
}
```

### Completion Logic

Step 3 is marked complete when:
1. All mappings are reviewed (accepted or rejected), OR
2. User clicks "Skip for Now" or "Complete Onboarding"

When Step 3 is complete:
1. `state.steps.groups.complete = true`
2. `state.isComplete = true`
3. Onboarding indicator is hidden
4. Completion celebration is shown

## Styling

### CSS Files

- `public/css/group-mapping-suggestions.css` - Main styles
- `public/css/stone-clay-theme.css` - Theme variables

### Key CSS Classes

- `.mapping-suggestions` - Main container
- `.mapping-card` - Individual mapping card
- `.confidence-badge` - Confidence score badge
- `.completion-modal` - Celebration modal
- `.btn-accept` - Accept button
- `.btn-reject` - Skip button

### Responsive Design

- **Desktop**: Grid layout with 4 columns
- **Tablet**: 3 columns with adjusted spacing
- **Mobile**: Single column, stacked buttons

## Error Handling

### API Failures

```javascript
// Gracefully handles API errors
try {
  await loadMappingSuggestions();
} catch (error) {
  showToast('Unable to load group mappings. You can skip this step.', 'error');
  handleEmptyMappings();
}
```

### Empty Mappings

```javascript
// Shows friendly empty state
if (mappings.length === 0) {
  handleEmptyMappings();
}
```

### Network Issues

- Displays error toast with helpful message
- Allows user to skip step
- Doesn't block onboarding completion

## Events

### Emitted Events

```javascript
// When onboarding is complete
window.dispatchEvent(new CustomEvent('onboarding-complete', {
  detail: { userId: this.userId }
}));
```

### Listened Events

None - handler is self-contained

## Testing

### Test File

`public/js/step3-group-mapping-handler.test.html`

### Test Scenarios

1. **Render Mappings**: Display mapping suggestions
2. **Empty State**: Show empty state when no mappings
3. **Accept Mapping**: Accept a mapping suggestion
4. **Reject Mapping**: Skip a mapping suggestion
5. **Completion**: Show completion celebration

### Running Tests

1. Open `step3-group-mapping-handler.test.html` in browser
2. Click test buttons to verify functionality
3. Check console for logs and errors

## Integration Checklist

- [ ] Include CSS file in main HTML
- [ ] Include JS file in main HTML
- [ ] Set up API endpoints for mappings
- [ ] Configure authentication tokens
- [ ] Test with real Google Contact groups
- [ ] Verify state persistence
- [ ] Test mobile responsive layout
- [ ] Verify theme switching

## Common Issues

### Mappings Not Loading

**Problem**: API returns empty array
**Solution**: Ensure user has Google Contacts connected and has contact groups

### Accept Button Disabled

**Problem**: Accept button is grayed out
**Solution**: User must select a CatchUp group from dropdown first

### Completion Modal Not Showing

**Problem**: Modal doesn't appear after completing all mappings
**Solution**: Check that `markOnboardingComplete()` is being called

## Next Steps

After Step 3 is complete:
1. User is redirected to home/dashboard
2. Onboarding indicator is hidden
3. User can start using CatchUp features
4. AI suggestions begin based on circles and groups

## Related Files

- `public/js/step3-group-mapping-handler.js` - Main handler
- `public/css/group-mapping-suggestions.css` - Styles
- `public/js/step1-integrations-handler.js` - Step 1 handler
- `public/js/step2-circles-handler.js` - Step 2 handler
- `public/js/onboarding-step-indicator.js` - Sidebar indicator
- `src/contacts/onboarding-state-manager.ts` - State management

## Support

For issues or questions:
1. Check test file for examples
2. Review API endpoint documentation
3. Verify state manager integration
4. Check browser console for errors
