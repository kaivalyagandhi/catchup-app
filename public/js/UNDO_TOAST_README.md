# Undo Toast Component

## Overview

The Undo Toast component provides a user-friendly way to undo bulk actions within a 10-second window. It displays a toast notification with a countdown timer and an undo button, allowing users to recover from mistakes without losing progress.

**Requirements Implemented**: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6

## Components

### 1. UndoToast (`public/js/undo-toast.js`)

A specialized toast component that displays:
- A message describing the action
- An undo button
- A countdown timer (default: 10 seconds)
- Visual urgency indicators when time is running out

### 2. UndoStateManager (`public/js/undo-state-manager.js`)

Manages the undo state for bulk actions:
- Stores previous state before actions
- Handles state restoration
- Manages the undo stack (only most recent action)
- Provides helper methods for state capture

## Usage

### Basic Usage

```javascript
// 1. Create an undo toast
const undoToast = new UndoToast({
  message: '5 contacts added to Inner Circle',
  onUndo: () => {
    // Handle undo logic
    console.log('Undo clicked!');
  },
  duration: 10000 // Optional: default is 10 seconds
});

// 2. Show the toast
undoToast.show();
```

### Complete Integration with State Management

```javascript
// 1. Capture current state before making changes
const previousState = undoStateManager.captureContactState(contacts);

// 2. Define restore function
const restoreFunction = async (previousValues, affectedContacts) => {
  // Restore each contact's previous state
  for (const contact of affectedContacts) {
    contact.dunbarCircle = previousValues[contact.id];
  }
  
  // Call API to persist changes
  await fetch('/api/contacts/restore', {
    method: 'POST',
    body: JSON.stringify({ previousValues })
  });
  
  // Refresh UI
  refreshUI();
};

// 3. Save state before action
const state = undoStateManager.createBulkAssignmentState(
  'bulk-assign',
  contacts,
  restoreFunction,
  { circle: 'inner', contactCount: contacts.length }
);

undoStateManager.saveState(state);

// 4. Perform the bulk action
await performBulkAssignment(contacts, 'inner');

// 5. Show undo toast
const undoToast = new UndoToast({
  message: `${contacts.length} contacts added to Inner Circle`,
  onUndo: async () => {
    const result = await undoStateManager.restoreState();
    
    if (result.success) {
      showToast('Successfully undone', 'success');
    } else {
      showToast(`Failed to undo: ${result.error}`, 'error');
    }
  }
});

undoToast.show();
```

## API Reference

### UndoToast

#### Constructor Options

```typescript
{
  message: string;        // Message to display
  onUndo: Function;       // Callback when undo is clicked
  duration?: number;      // Duration in ms (default: 10000)
}
```

#### Methods

- `show()`: Display the toast with countdown
- `hide()`: Hide the toast immediately
- `handleUndo()`: Trigger undo action
- `finalize()`: Finalize action when timer expires
- `isToastActive()`: Check if toast is currently active
- `getRemainingTime()`: Get remaining time in milliseconds

### UndoStateManager

#### Methods

##### `saveState(state)`

Store state before a bulk action.

```typescript
{
  actionType: string;           // Type of action
  contacts: Array;              // Affected contacts
  previousValues: Object;       // Previous values map
  restoreFunction: Function;    // Function to restore state
  metadata?: Object;            // Additional metadata
}
```

##### `restoreState()`

Restore the previous state (undo the action).

Returns:
```typescript
{
  success: boolean;
  actionType?: string;
  contactsRestored?: number;
  error?: string;
}
```

##### `clearUndoStack()`

Clear the undo stack (called after timeout or successful undo).

##### `canUndo()`

Check if undo is available.

Returns: `boolean`

##### `getUndoInfo()`

Get information about the current undo state.

Returns:
```typescript
{
  actionType: string;
  contactCount: number;
  timestamp: number;
  metadata: Object;
} | null
```

##### `captureContactState(contacts, field?)`

Helper to capture current state of contacts.

Parameters:
- `contacts`: Array of contact objects
- `field`: Field to capture (default: 'dunbarCircle')

Returns: Object mapping contact ID to field value

##### `createBulkAssignmentState(actionType, contacts, restoreFunction, metadata?)`

Helper to create a complete state object.

Returns: State object ready for `saveState()`

## Requirements Validation

### Requirement 8.1: Display Undo Toast
✅ Toast is displayed when bulk actions are performed

### Requirement 8.2: 10-Second Window
✅ Default duration is 10 seconds (configurable)

### Requirement 8.3: Countdown Timer
✅ Countdown timer displays remaining seconds

### Requirement 8.4: Undo Restores State
✅ Clicking undo calls restore function and reverts changes

### Requirement 8.5: Auto-Dismiss After Timeout
✅ Toast automatically dismisses after duration expires

### Requirement 8.6: Most Recent Action Only
✅ Only the most recent bulk action can be undone

## Styling

The component uses CSS custom properties for theming:

```css
--accent-primary: Primary button color
--status-warning-bg: Toast background color
--status-warning-text: Toast text color
--status-warning: Toast border color
```

Styles are defined in `public/css/undo-toast.css`.

## Testing

Manual test file: `tests/html/undo-toast.test.html`

Run the test file to verify:
1. Basic undo toast display
2. Countdown timer functionality
3. Undo state management
4. Multiple actions (only most recent undoable)
5. Urgent countdown animation

## Integration Examples

See `public/js/undo-integration-example.js` for complete integration examples:

1. Accept All Quick Start Suggestions
2. Accept Batch Suggestions
3. Simple Undo Integration Pattern
4. Check Undo Availability

## Browser Support

- Modern browsers with ES6 support
- CSS custom properties support
- Flexbox support

## Accessibility

- ARIA labels on undo button
- ARIA live region for countdown updates
- Keyboard accessible
- Reduced motion support
- Focus management

## Notes

- Only one undo action is supported at a time (Requirement 8.6)
- Undo state is cleared after successful undo or timeout
- Toast automatically positions in top-right corner
- Mobile responsive with adjusted sizing
- Dark mode support included
