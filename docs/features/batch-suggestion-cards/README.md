# Batch Suggestion Cards Feature

## Overview

The Batch Suggestion Cards feature provides a UI component for displaying and managing batches of contacts grouped by relationship signal strength during the onboarding flow. Users can accept entire batches, review individual contacts, or skip batches.

## Requirements Implemented

- **6.3**: Display batch summary with count and suggested circle
- **6.4**: Implement expand/collapse for individual contacts
- **6.5**: Accept Batch functionality with API integration
- **6.6**: Individual contact selection within batches
- **6.7**: Skip Batch functionality
- **6.8**: Show undo toast after batch acceptance
- **6.9**: Update progress bar (20-30% per batch)

## Files Created

### Frontend Components

1. **`public/js/batch-suggestion-card.js`**
   - Main component class
   - Handles batch display, expansion, acceptance, and skipping
   - Integrates with UndoToast for undo functionality
   - Manages individual contact selection

2. **`public/css/batch-suggestion-card.css`**
   - Complete styling for batch cards
   - Responsive design (mobile-first)
   - Dark mode support
   - Accessibility features (reduced motion, focus states)

3. **`tests/html/batch-suggestion-card.test.html`**
   - Manual test file for component testing
   - Mock data for three batch types (high/medium/low signal)
   - Progress tracking demonstration
   - Console logging for debugging

### Backend Endpoints

1. **`src/api/routes/circles.ts`** (updated)
   - Added `POST /api/contacts/circles/batch-remove` endpoint
   - Supports undo functionality by removing circle assignments

## Component API

### Constructor

```javascript
new BatchSuggestionCard(batch, options)
```

**Parameters:**
- `batch` (Object): Batch data from API
  - `id` (string): Unique batch identifier
  - `name` (string): Batch display name
  - `description` (string): Batch description
  - `suggestedCircle` (string): Suggested circle ('inner', 'close', 'active', 'casual')
  - `contacts` (Array): Array of contact objects
  - `signalStrength` (string): 'high', 'medium', or 'low'
  - `signalType` (string): 'calendar', 'metadata', 'communication', or 'mixed'

- `options` (Object): Configuration options
  - `onAccept` (Function): Callback when batch is accepted
  - `onSkip` (Function): Callback when batch is skipped
  - `onProgressUpdate` (Function): Callback for progress updates

### Methods

#### `render()`
Renders the batch card and returns the DOM element.

**Returns:** HTMLElement

#### `toggleExpand()`
Toggles the expand/collapse state of the contact list.

#### `handleAccept()`
Handles the Accept Batch action:
1. Validates selected contacts
2. Calls batch-accept API endpoint
3. Shows undo toast
4. Updates progress
5. Triggers callbacks

#### `handleSkip()`
Handles the Skip Batch action:
1. Marks card as skipped
2. Disables buttons
3. Triggers callback

#### `destroy()`
Cleans up and removes the card from DOM.

## Usage Example

```javascript
// Fetch batch suggestions from API
const response = await fetch('/api/ai/batch-suggestions?userId=123');
const data = await response.json();

// Create cards for each batch
data.batches.forEach(batch => {
  const card = new BatchSuggestionCard(batch, {
    onAccept: async (acceptData) => {
      console.log('Batch accepted:', acceptData);
      // Update UI, refresh contacts, etc.
    },
    onSkip: (skipData) => {
      console.log('Batch skipped:', skipData);
      // Move to next batch
    },
    onProgressUpdate: (increment) => {
      // Update progress bar
      currentProgress += increment;
      updateProgressBar(currentProgress);
    }
  });
  
  const cardElement = card.render();
  container.appendChild(cardElement);
});
```

## API Integration

### Batch Accept Endpoint

**POST** `/api/contacts/circles/batch-accept`

**Request Body:**
```json
{
  "userId": "user-id",
  "batchId": "high-signal",
  "circle": "close",
  "contactIds": ["contact-1", "contact-2", "contact-3"]
}
```

**Response:**
```json
{
  "success": true,
  "batchId": "high-signal",
  "assignedCount": 3,
  "circle": "close"
}
```

### Batch Remove Endpoint (Undo)

**POST** `/api/contacts/circles/batch-remove`

**Request Body:**
```json
{
  "userId": "user-id",
  "contactIds": ["contact-1", "contact-2", "contact-3"]
}
```

**Response:**
```json
{
  "success": true,
  "removedCount": 3
}
```

## Features

### Expand/Collapse
- Click the expand button to view individual contacts
- Contacts show name, email, calendar event count, and metadata score
- Checkboxes allow individual contact selection/deselection

### Batch Acceptance
- Accept all selected contacts in one action
- Atomic transaction (all succeed or all fail)
- Shows undo toast with 10-second window
- Updates progress bar (20-30% per batch)
- Triggers contacts-updated event

### Undo Functionality
- 10-second window to undo batch acceptance
- Calls batch-remove endpoint to revert assignments
- Restores card to original state
- Shows success/error feedback

### Skip Functionality
- Skip entire batch without assigning
- Marks card as skipped (visual feedback)
- Disables buttons to prevent duplicate actions
- Moves to next batch

### Progress Tracking
- Each batch contributes 20-30% to overall progress
- Progress calculated based on selected contacts vs. total
- Visual progress bar updates in real-time

## Styling

### Circle Badges
- **Inner Circle**: Purple background (#8b5cf6)
- **Close Friends**: Blue background (#3b82f6)
- **Active Friends**: Green background (#10b981)
- **Casual Network**: Gray background (#6b7280)

### Signal Strength Indicators
- **High**: Green (#059669)
- **Medium**: Orange (#d97706)
- **Low**: Gray (#4b5563)

### States
- **Default**: White background with shadow
- **Hover**: Increased shadow
- **Accepted**: 70% opacity, green border
- **Skipped**: 50% opacity, gray border

## Accessibility

- Semantic HTML structure
- ARIA labels for buttons and checkboxes
- Keyboard navigation support
- Focus indicators
- Reduced motion support
- Screen reader friendly

## Mobile Responsive

- Stacks buttons vertically on mobile
- Adjusts padding and spacing
- Touch-friendly tap targets (44x44px minimum)
- Scrollable contact list with max height
- Flexible layout for small screens

## Testing

### Manual Testing

1. Open `tests/html/batch-suggestion-card.test.html` in browser
2. Test expand/collapse functionality
3. Test individual contact selection
4. Test Accept Batch with undo
5. Test Skip Batch
6. Verify progress updates
7. Check console output for API calls

### Test Scenarios

1. **Expand/Collapse**
   - Click expand button
   - Verify contact list appears
   - Click again to collapse

2. **Individual Selection**
   - Expand a batch
   - Uncheck some contacts
   - Verify accept button updates count

3. **Accept Batch**
   - Click Accept Batch
   - Verify undo toast appears
   - Verify progress bar updates
   - Check console for API call

4. **Undo**
   - Accept a batch
   - Click Undo within 10 seconds
   - Verify card returns to original state

5. **Skip Batch**
   - Click Skip button
   - Verify card is marked as skipped
   - Verify buttons are disabled

## Integration with Onboarding Flow

The BatchSuggestionCard component is designed to be used in Step 2 of the onboarding flow:

1. User completes Quick Start (Step 1)
2. Batch suggestions are fetched from `/api/ai/batch-suggestions`
3. Cards are rendered for each batch (high/medium/low signal)
4. User accepts or skips batches
5. Progress bar shows completion percentage
6. After all batches, user proceeds to Quick Refine or completes onboarding

## Dependencies

- **UndoToast**: For undo functionality
- **showToast**: Global toast notification function
- **localStorage**: For auth token storage
- **window.userId**: Global user ID variable

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

1. Drag-and-drop contact reordering
2. Batch editing (change suggested circle)
3. Contact preview on hover
4. Batch filtering/sorting
5. Keyboard shortcuts
6. Batch statistics (average score, signal breakdown)
7. Export batch data
8. Batch comparison view

## Related Documentation

- [Quick Start Flow](../quick-start-flow/README.md)
- [Undo Toast Component](../undo-toast/README.md)
- [Circle Assignment Service](../../backend/circle-assignment/README.md)
- [AI Batch Suggestions API](../../api/ai-batch-suggestions.md)
