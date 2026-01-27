# Quick Refine Card Component

## Overview

The Quick Refine Card is a swipe-style interface for rapidly categorizing uncategorized contacts into Dunbar circles. It displays contacts one at a time with intuitive circle assignment buttons and supports touch gestures for mobile devices.

## Features

- **Card-based UI**: Single contact display with smooth transitions
- **Touch Gestures**: Swipe left/right to assign contacts (mobile-optimized)
- **Circle Buttons**: Four buttons for Inner, Close, Active, and Casual circles
- **Progress Tracking**: Visual progress bar showing remaining contacts
- **Skip Functionality**: Skip contacts to review later
- **Done for Now**: Exit flow and save progress for resumption
- **Contact Metadata**: Display email, company, phone, and last contact date
- **Responsive Design**: Mobile-first with touch-friendly tap targets (44x44px minimum)

## Requirements Validation

### Requirement 7.1: Display Uncategorized Contacts
✅ Displays only uncategorized or low-confidence contacts one at a time

### Requirement 7.2: Card-Based Interface
✅ Single contact card with circle assignment buttons below

### Requirement 7.3: Circle Assignment Buttons
✅ Four buttons for Inner (💜), Close (💗), Active (💚), and Casual (💙) circles

### Requirement 7.4: Swipe Gestures
✅ Touch gesture support with swipe mapping:
- Far left swipe (< -200px): Inner Circle
- Near left swipe (< 0px): Close Friends
- Near right swipe (< 200px): Active Friends
- Far right swipe (> 200px): Casual Network

### Requirement 7.5: Remaining Count Display
✅ Shows "X contacts remaining" with progress bar

### Requirement 7.6: Done for Now Button
✅ Exits flow at any point with progress saved

### Requirement 7.7: Progress Persistence
✅ Saves progress to localStorage for resumption

### Requirement 7.8: Last Contact Date Display
✅ Shows time since last contact (e.g., "3 months ago")

### Requirement 20.3: Mobile Responsive
✅ Adapts layout for mobile viewports (>= 320px)

### Requirement 20.5: Touch Gestures
✅ Swipe gestures work on touch devices

### Requirement 20.6: Circular Visualizer Adaptation
✅ Component designed to work with existing circular visualizer

## Usage

### Basic Initialization

```javascript
const quickRefine = new QuickRefineCard(contacts, {
  containerId: 'quick-refine-container',
  userId: 'user-123',
  onAssign: (contactId, circle) => {
    console.log(`Contact ${contactId} assigned to ${circle}`);
  },
  onDone: (progress) => {
    console.log('User exited flow', progress);
  },
  onProgress: (progress) => {
    console.log(`Progress: ${progress.current}/${progress.total}`);
  }
});

quickRefine.render();
```

### Constructor Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `contacts` | Array | Yes | Array of uncategorized contacts |
| `options.containerId` | string | No | Container element ID (default: 'quick-refine-container') |
| `options.userId` | string | Yes | User ID for API calls |
| `options.onAssign` | Function | No | Callback when contact is assigned (contactId, circle) |
| `options.onDone` | Function | No | Callback when user exits flow (progress) |
| `options.onProgress` | Function | No | Callback for progress updates |

### Contact Object Structure

```javascript
{
  id: string,              // Contact ID
  name: string,            // Contact name
  email?: string,          // Email address (optional)
  phone?: string,          // Phone number (optional)
  company?: string,        // Company name (optional)
  lastContactDate?: string // ISO date string (optional)
}
```

### API Integration

The component calls the following API endpoint for circle assignment:

**POST /api/circles/assign**
```json
{
  "contactId": "contact-456",
  "circle": "inner"
}
```

## Swipe Gesture Mapping

The component maps swipe directions to circle assignments:

| Swipe Direction | Distance | Circle Assignment |
|----------------|----------|-------------------|
| Far Left | < -200px | Inner Circle (💜) |
| Near Left | -200px to 0px | Close Friends (💗) |
| Near Right | 0px to 200px | Active Friends (💚) |
| Far Right | > 200px | Casual Network (💙) |

### Swipe Thresholds

- **Minimum Distance**: 100px
- **Minimum Velocity**: 0.5 (distance/time)
- **Visual Feedback**: Card rotates and translates during swipe

## Progress Persistence

Progress is automatically saved to localStorage:

```javascript
{
  currentIndex: number,    // Current position in contact list
  totalContacts: number,   // Total number of contacts
  timestamp: number        // Unix timestamp
}
```

To resume from saved progress:

```javascript
const savedProgress = JSON.parse(localStorage.getItem('quick-refine-progress'));
if (savedProgress) {
  const remainingContacts = contacts.slice(savedProgress.currentIndex);
  const quickRefine = new QuickRefineCard(remainingContacts, options);
  quickRefine.render();
}
```

## Styling

The component uses CSS custom properties for theming:

```css
:root {
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --bg-secondary: #ffffff;
  --bg-tertiary: #e5e7eb;
  --border-color: #e5e7eb;
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
}
```

### Mobile Responsive Breakpoints

- **Desktop**: Full layout with 600px max-width
- **Tablet**: Adjusted padding and font sizes
- **Mobile** (< 768px): Compact layout with touch-friendly buttons

## Events

### onAssign(contactId, circle)
Fired when a contact is assigned to a circle.

**Parameters:**
- `contactId` (string): ID of the assigned contact
- `circle` (string): Circle name ('inner', 'close', 'active', 'casual')

### onDone(progress)
Fired when user clicks "Done for Now" or completes all contacts.

**Parameters:**
- `progress` (object): Progress information
  - `currentIndex` (number): Current position
  - `totalContacts` (number): Total contacts
  - `timestamp` (number): Unix timestamp

### onProgress(progress)
Fired after each contact assignment.

**Parameters:**
- `progress` (object): Progress update
  - `current` (number): Current contact number
  - `total` (number): Total contacts
  - `assigned` (string): Circle assigned

## Testing

### Manual Testing

Open `tests/html/quick-refine-card.test.html` in a browser to test:

1. **Desktop Testing**: Use mouse to drag cards or click buttons
2. **Mobile Testing**: Use touch gestures to swipe cards
3. **Progress Tracking**: Verify progress bar updates correctly
4. **Skip Functionality**: Test skip button behavior
5. **Done for Now**: Verify progress is saved to localStorage

### Test Scenarios

1. **Basic Assignment**: Click circle buttons to assign contacts
2. **Swipe Gestures**: Swipe left/right to assign (mobile)
3. **Skip Contact**: Click skip button to move to next contact
4. **Exit Flow**: Click "Done for Now" and verify progress saved
5. **Complete Flow**: Assign all contacts and verify completion screen
6. **Resume Flow**: Reload page and verify progress restoration

## Integration with Onboarding Flow

The Quick Refine Card is part of the Simplified "Manage Circles" Flow:

1. **Quick Start Flow**: AI suggests top 10 contacts for Inner Circle
2. **Batch Suggestions**: Group remaining contacts by signal strength
3. **Quick Refine**: Rapidly categorize remaining uncategorized contacts ← You are here

### Integration Example

```javascript
// After batch suggestions are complete
const uncategorizedContacts = await fetchUncategorizedContacts(userId);

if (uncategorizedContacts.length > 0) {
  const quickRefine = new QuickRefineCard(uncategorizedContacts, {
    userId: userId,
    onAssign: (contactId, circle) => {
      // Update circular visualizer
      window.dispatchEvent(new CustomEvent('contacts-updated'));
    },
    onDone: (progress) => {
      // Navigate to next step or dashboard
      navigateTo('/dashboard');
    }
  });
  
  quickRefine.render();
}
```

## Accessibility

- **Keyboard Navigation**: All buttons are keyboard accessible
- **ARIA Labels**: Proper labels for screen readers
- **Touch Targets**: Minimum 44x44px for mobile (WCAG 2.1 Level AAA)
- **Visual Feedback**: Clear hover and active states
- **Progress Indicators**: Screen reader accessible progress updates

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile, Samsung Internet
- **Touch Events**: Full support for touch gestures
- **Fallback**: Mouse events work on desktop for testing

## Performance

- **Lightweight**: ~15KB minified
- **No Dependencies**: Pure JavaScript, no external libraries
- **Efficient Rendering**: Only renders current contact
- **Smooth Animations**: CSS transitions for card movements
- **Memory Efficient**: Destroys previous card before rendering next

## Known Limitations

1. **Single Contact Display**: Only shows one contact at a time (by design)
2. **No Undo**: Once assigned, contact moves to next (use undo toast separately)
3. **Linear Flow**: Cannot go back to previous contacts
4. **localStorage Dependency**: Progress persistence requires localStorage

## Future Enhancements

- [ ] Undo last assignment
- [ ] Keyboard shortcuts for circle assignment
- [ ] Batch mode (show multiple cards)
- [ ] Custom swipe mappings
- [ ] Animation customization
- [ ] Voice commands for assignment

## Related Components

- **QuickStartFlow**: AI-powered initial suggestions
- **BatchSuggestionCard**: Smart batching by signal strength
- **UndoToast**: Undo capability for bulk actions
- **CircularVisualizer**: Visual representation of circles

## API Reference

See `docs/API.md` for complete API documentation:
- POST /api/contacts/circles/assign
- GET /api/contacts/uncategorized

## Support

For issues or questions:
1. Check the test file: `tests/html/quick-refine-card.test.html`
2. Review the design document: `.kiro/specs/tier-1-foundation/design.md`
3. Check requirements: `.kiro/specs/tier-1-foundation/requirements.md`
