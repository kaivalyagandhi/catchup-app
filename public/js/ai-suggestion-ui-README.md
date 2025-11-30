# AI Suggestion UI Component

## Overview

The AI Suggestion UI component displays AI-powered circle assignment suggestions for contacts during the onboarding process. It provides:

- **Confidence indicators** showing how confident the AI is in its suggestion
- **One-click acceptance** buttons for quick assignment
- **Override tracking** to record when users choose different circles
- **Alternative suggestions** showing other possible circles
- **Explanation tooltips** describing why a circle was suggested

## Features

### Confidence Levels

The component displays three confidence levels with visual indicators:

- **High Confidence (≥70%)**: Green border, pre-selected for one-click acceptance
- **Medium Confidence (30-69%)**: Orange border, suggested but easy to override
- **Low Confidence (<30%)**: Gray border, multiple options presented

### Visual Elements

1. **Primary Suggestion Card**
   - Circle badge with color coding
   - Circle name and description tooltip
   - Confidence bar and percentage
   - Accept and override buttons

2. **Explanation Section** (when available)
   - List of factors contributing to the suggestion
   - Communication frequency, recency, consistency, etc.
   - Weighted importance of each factor

3. **Alternative Circles** (when available)
   - Other possible circle assignments
   - Confidence scores for each alternative
   - Click to select an alternative

## Usage

### Basic Setup

```html
<!-- Include the component -->
<script src="ai-suggestion-ui.js"></script>

<!-- Create a container -->
<div id="ai-suggestion-container"></div>

<script>
  // Initialize the component
  const aiSuggestionUI = new AISuggestionUI('ai-suggestion-container');
  
  // Set authentication token
  aiSuggestionUI.initialize('your-jwt-token');
</script>
```

### Display a Suggestion

```javascript
// With a contact object (will fetch suggestion from API)
const contact = {
  id: 'contact-123',
  name: 'Alice Johnson'
};

await aiSuggestionUI.displaySuggestion(contact);
```

### Display with Pre-fetched Suggestion

```javascript
// With both contact and suggestion
const contact = {
  id: 'contact-123',
  name: 'Alice Johnson'
};

const suggestion = {
  contactId: 'contact-123',
  suggestedCircle: 'inner',
  confidence: 0.85,
  factors: [
    {
      type: 'communication_frequency',
      weight: 0.4,
      value: 0.9,
      description: 'You communicate with Alice daily'
    }
  ],
  alternativeCircles: [
    {
      circle: 'close',
      confidence: 0.45
    }
  ]
};

await aiSuggestionUI.displaySuggestion(contact, suggestion);
```

### Event Handling

```javascript
// Listen for accept events
aiSuggestionUI.on('accept', (data) => {
  console.log('User accepted suggestion:', data);
  // data contains: contactId, contact, circle, suggestion, isOverride
  
  // Assign contact to circle
  assignContactToCircle(data.contactId, data.circle);
});

// Listen for override events
aiSuggestionUI.on('override', (data) => {
  console.log('User wants to override:', data);
  // data contains: contactId, contact, suggestedCircle, suggestion
  
  // Show circle selection UI
  showCircleSelector(data.contact);
});

// Listen for errors
aiSuggestionUI.on('error', (error) => {
  console.error('Error:', error);
  showErrorMessage(error.message);
});
```

## API Integration

The component integrates with the following API endpoints:

### POST /api/ai/suggest-circle

Fetch AI suggestion for a single contact.

**Request:**
```json
{
  "contactId": "contact-123"
}
```

**Response:**
```json
{
  "contactId": "contact-123",
  "suggestedCircle": "inner",
  "confidence": 0.85,
  "factors": [
    {
      "type": "communication_frequency",
      "weight": 0.4,
      "value": 0.9,
      "description": "You communicate with this contact daily"
    }
  ],
  "alternativeCircles": [
    {
      "circle": "close",
      "confidence": 0.45
    }
  ]
}
```

### POST /api/ai/record-override

Record when a user overrides an AI suggestion.

**Request:**
```json
{
  "contactId": "contact-123",
  "suggestedCircle": "inner",
  "actualCircle": "close"
}
```

**Response:** 204 No Content

## Suggestion Object Format

```typescript
interface CircleSuggestion {
  contactId: string;
  suggestedCircle: 'inner' | 'close' | 'active' | 'casual' | 'acquaintance';
  confidence: number; // 0-1
  factors: SuggestionFactor[];
  alternativeCircles: AlternativeCircle[];
}

interface SuggestionFactor {
  type: 'communication_frequency' | 'recency' | 'consistency' | 
        'calendar_events' | 'response_time' | 'multi_channel';
  weight: number; // 0-1
  value: number; // 0-1
  description: string;
}

interface AlternativeCircle {
  circle: 'inner' | 'close' | 'active' | 'casual' | 'acquaintance';
  confidence: number; // 0-1
}
```

## Methods

### initialize(authToken)

Initialize the component with an authentication token.

```javascript
aiSuggestionUI.initialize('jwt-token');
```

### displaySuggestion(contact, suggestion?)

Display a suggestion for a contact. If suggestion is not provided, it will be fetched from the API.

```javascript
await aiSuggestionUI.displaySuggestion(contact);
// or
await aiSuggestionUI.displaySuggestion(contact, suggestion);
```

### showLoading()

Show loading state.

```javascript
aiSuggestionUI.showLoading();
```

### showError(message)

Show error state with a message.

```javascript
aiSuggestionUI.showError('Failed to load suggestion');
```

### showEmpty()

Show empty state.

```javascript
aiSuggestionUI.showEmpty();
```

### clear()

Clear the UI and reset state.

```javascript
aiSuggestionUI.clear();
```

### on(event, callback)

Register an event listener.

```javascript
aiSuggestionUI.on('accept', (data) => {
  // Handle accept
});
```

### off(event, callback)

Unregister an event listener.

```javascript
aiSuggestionUI.off('accept', callback);
```

## Events

### accept

Fired when user accepts a suggestion (either primary or alternative).

**Data:**
```javascript
{
  contactId: string,
  contact: object,
  circle: string,
  suggestion: object,
  isOverride: boolean // true if alternative was selected
}
```

### override

Fired when user clicks "Choose Different" button.

**Data:**
```javascript
{
  contactId: string,
  contact: object,
  suggestedCircle: string,
  suggestion: object
}
```

### error

Fired when an error occurs.

**Data:**
```javascript
Error object
```

## Styling

The component includes comprehensive CSS styling. All styles are scoped with the `.ai-suggestion-` prefix to avoid conflicts.

### Customization

You can override styles by adding your own CSS after the component is loaded:

```css
/* Customize primary suggestion card */
.ai-suggestion-primary {
  border-radius: 12px;
  padding: 20px;
}

/* Customize accept button */
.ai-suggestion-btn-accept {
  background: #your-color;
}

/* Customize confidence bar colors */
.confidence-fill.high {
  background: #your-high-color;
}
```

## Mobile Support

The component is fully responsive and includes:

- Touch-optimized buttons
- Responsive layout for small screens
- Stacked layout on mobile devices
- Full-width buttons on mobile

## Accessibility

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast colors
- Focus indicators

## Testing

Open `ai-suggestion-ui.test.html` in a browser to test the component with various scenarios:

- High confidence suggestions
- Medium confidence suggestions
- Low confidence suggestions
- Suggestions with explanation factors
- Suggestions with alternatives
- Complete suggestions with all features
- Loading, error, and empty states

## Integration with Onboarding Flow

```javascript
// In your onboarding controller
const aiSuggestionUI = new AISuggestionUI('ai-suggestion-container');
aiSuggestionUI.initialize(authToken);

// When showing a contact for categorization
async function showContactForCategorization(contact) {
  // Display AI suggestion
  await aiSuggestionUI.displaySuggestion(contact);
}

// Handle acceptance
aiSuggestionUI.on('accept', async (data) => {
  // Assign contact to circle
  await circleAssignmentService.assignToCircle(
    userId,
    data.contactId,
    data.circle
  );
  
  // Update onboarding progress
  onboardingController.addCategorizedContact(data.contactId);
  
  // Move to next contact
  showNextContact();
});

// Handle override
aiSuggestionUI.on('override', (data) => {
  // Show manual circle selection UI
  showCircleSelector(data.contact, data.suggestedCircle);
});
```

## Requirements Validation

This component satisfies the following requirements from the design document:

- **Requirement 2.3**: Display AI-suggested circles with confidence indicators ✓
- **Requirement 2.4**: Add one-click acceptance buttons ✓
- **Requirement 2.5**: Implement override tracking ✓
- **Requirement 9.2**: Show the suggested circle with a confidence score ✓
- **Requirement 9.3**: Pre-select suggestions when confidence is high ✓
- **Requirement 9.4**: Present multiple options when confidence is low ✓

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

None. The component is vanilla JavaScript with no external dependencies.

## License

Part of the CatchUp application.
