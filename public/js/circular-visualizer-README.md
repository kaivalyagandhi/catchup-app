# Circular Visualizer Component

## Overview

The CircularVisualizer is an SVG-based component that displays contacts organized in concentric circles based on Dunbar's number theory. It provides an intuitive, interactive visualization with drag-and-drop support, animations, and responsive design.

## Features

- **SVG-based rendering** with smooth animations
- **Drag-and-drop** contacts between circles (desktop and mobile)
- **Batch drag operations** for moving multiple selected contacts at once
- **Multi-select support** with Ctrl/Cmd+Click or long-press on mobile
- **Responsive sizing** adapts to different screen sizes
- **Circle capacity indicators** with color-coded status
- **Contact tooltips** showing detailed information
- **Group filtering** to view specific contact groups
- **AI suggestion indicators** for contacts with high-confidence suggestions
- **Milestone celebrations** with animated overlays
- **Touch gesture support** for mobile devices with long-press selection

## Circle Definitions

The visualizer uses five concentric circles based on Dunbar's number:

1. **Inner Circle** (5 contacts) - Closest relationships
2. **Close Friends** (15 contacts) - Good friends you see regularly
3. **Active Friends** (50 contacts) - Regular contact maintenance
4. **Casual Network** (150 contacts) - Occasional contacts
5. **Acquaintances** (500+ contacts) - Rarely interact

## Usage

### Basic Setup

```javascript
// Create visualizer instance
const visualizer = new CircularVisualizer('container-id');

// Prepare contact data
const contacts = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '+1-555-0101',
    circle: 'inner',
    groups: ['family'],
    color: '#8b5cf6', // Optional custom color
    aiSuggestion: {
      circle: 'inner',
      confidence: 0.95,
      reason: 'High interaction frequency'
    }
  },
  // ... more contacts
];

// Render contacts
visualizer.render(contacts);
```

### Event Listeners

```javascript
// Listen for single contact drag events
visualizer.on('contactDrag', (data) => {
  console.log(`Contact ${data.contactId} moved from ${data.fromCircle} to ${data.toCircle}`);
  // Update backend
  updateContactCircle(data.contactId, data.toCircle);
});

// Listen for batch drag events (multiple contacts)
visualizer.on('batchDrag', (data) => {
  console.log(`${data.contactIds.length} contacts moved to ${data.toCircle}`);
  // Update backend with batch operation
  batchUpdateContactCircles(data.contactIds, data.toCircle);
});

// Listen for contact clicks
visualizer.on('contactClick', (data) => {
  console.log(`Clicked contact:`, data.contact);
  // Show contact details modal
  showContactDetails(data.contact);
});

// Listen for circle hover
visualizer.on('circleHover', (data) => {
  if (data.isHovering) {
    console.log(`Hovering over ${data.circle.name}`);
    // Show circle information
  }
});

// Listen for contact updates
visualizer.on('contactUpdate', (data) => {
  console.log(`Contact ${data.contactId} updated`);
});
```

### Methods

#### Rendering

```javascript
// Render contacts with optional groups
visualizer.render(contacts, groups);

// Update a single contact's circle
visualizer.updateContact(contactId, newCircle);

// Update multiple contacts at once (batch operation)
visualizer.updateMultipleContacts([
  { contactId: 'id1', newCircle: 'close' },
  { contactId: 'id2', newCircle: 'inner' }
]);
```

#### Selection Management

```javascript
// Toggle selection state of a contact
visualizer.toggleContactSelection(contactId);

// Select a contact
visualizer.selectContact(contactId);

// Deselect a contact
visualizer.deselectContact(contactId);

// Select multiple contacts at once
visualizer.selectMultipleContacts(['id1', 'id2', 'id3']);

// Clear all selections
visualizer.clearSelection();

// Get array of selected contact IDs
const selected = visualizer.getSelectedContacts();

// Check if a contact is selected
const isSelected = visualizer.isContactSelected(contactId);
```

#### Drag & Drop Control

```javascript
// Enable drag and drop (default)
visualizer.enableDragDrop();

// Disable drag and drop
visualizer.disableDragDrop();
```

#### Group Filtering

```javascript
// Show only contacts in a specific group
visualizer.showGroupFilter(groupId);

// Clear group filter
visualizer.clearGroupFilter();
```

#### Visual Effects

```javascript
// Highlight a specific circle
visualizer.highlightCircle('inner');

// Celebrate a milestone
visualizer.celebrateMilestone('First 5 contacts categorized! 🎉');

// Animate transition between circles
visualizer.animateTransition(contactId, fromCircle, toCircle);
```

#### Utility Methods

```javascript
// Get current distribution of contacts across circles
const distribution = visualizer.getCircleDistribution();
// Returns: { inner: 3, close: 8, active: 15, casual: 25, acquaintance: 50 }

// Get capacity information for a circle
const capacity = visualizer.getCircleCapacity('inner');
// Returns: { circle: 'inner', currentSize: 3, recommendedSize: 5, maxSize: 5, status: 'optimal' }
```

## Contact Data Format

```typescript
interface Contact {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  email?: string;                // Optional email
  phone?: string;                // Optional phone
  circle?: string;               // Current circle assignment
  dunbarCircle?: string;         // Alternative circle field name
  groups?: string[];             // Group memberships
  color?: string;                // Custom color (hex)
  aiSuggestion?: {
    circle: string;              // Suggested circle
    confidence: number;          // 0-1 confidence score
    reason: string;              // Explanation
  };
}
```

## Styling

The component includes built-in styles that can be customized by overriding CSS classes:

```css
/* Customize circle colors */
.circle-ring.circle-inner { stroke: #8b5cf6; }
.circle-ring.circle-close { stroke: #3b82f6; }

/* Customize contact dots */
.contact-dot { cursor: grab; }
.contact-dot:hover { transform: scale(1.1); }

/* Customize tooltips */
.contact-tooltip {
  background: rgba(0, 0, 0, 0.9);
  color: white;
}

/* Customize legend */
.legend-item {
  background: #f9fafb;
  border-radius: 8px;
}
```

## Responsive Design

The visualizer automatically adapts to different screen sizes:

- **Desktop**: Full-featured with mouse interactions
- **Tablet**: Touch-optimized with gesture support
- **Mobile**: Compact layout with simplified interactions

The SVG viewBox automatically scales to fit the container while maintaining aspect ratio.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with touch support

## Testing

- **Basic Test**: Open `circular-visualizer.test.html` in a browser to see the component in action with sample data and interactive controls.
- **Drag & Drop Test**: Open `circular-visualizer-drag-test.html` for comprehensive testing of drag-and-drop functionality including:
  - Single contact dragging
  - Multi-select with Ctrl/Cmd+Click
  - Batch drag operations
  - Touch gestures on mobile
  - Event logging and debugging

See `circular-visualizer-drag-drop-guide.md` for detailed documentation on drag-and-drop features.

## Integration with Onboarding Flow

```javascript
// Initialize in onboarding controller
const visualizer = new CircularVisualizer('onboarding-visualizer');

// Load user's contacts
const contacts = await fetchUserContacts();
visualizer.render(contacts);

// Handle circle assignments
visualizer.on('contactDrag', async (data) => {
  try {
    // Update backend
    await assignContactToCircle(data.contactId, data.toCircle);
    
    // Update local state
    visualizer.updateContact(data.contactId, data.toCircle);
    
    // Update progress
    onboardingController.addCategorizedContact(data.contactId);
    
    // Check for milestones
    const progress = onboardingController.getProgress();
    if (progress.categorizedContacts === 5) {
      visualizer.celebrateMilestone('First 5 contacts categorized! 🎉');
    }
  } catch (error) {
    console.error('Failed to assign contact:', error);
    // Revert visual change
    visualizer.render(contacts);
  }
});
```

## Performance Considerations

- Efficiently handles up to 500 contacts
- Uses SVG for crisp rendering at any scale
- Debounced resize handling
- Optimized drag-and-drop with minimal reflows
- Virtual positioning calculations

## Accessibility

- Keyboard navigation support (planned)
- Screen reader compatible labels (planned)
- High contrast mode support
- Touch-friendly hit targets (40px minimum)
- Clear visual feedback for all interactions
