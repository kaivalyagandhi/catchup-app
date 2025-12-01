# Circular Visualizer V2 Migration Guide

## Overview

The new Circular Visualizer V2 addresses the issues with the original implementation:

- **Fixed hover loop bug**: Simplified hover states prevent infinite loops
- **Contacts within zones**: Contacts are positioned between circle borders, not on them
- **Light backgrounds**: Each circle has a subtle colored background for better visual hierarchy
- **No drag-and-drop**: All drag-and-drop functionality removed for cleaner, simpler interaction
- **Better readability**: Easier to see which circle each contact belongs to

## Key Differences

### Visual Changes

1. **Contact Positioning**
   - **Old**: Contacts positioned exactly on circle borders
   - **New**: Contacts positioned within the zone between inner and outer radius

2. **Circle Backgrounds**
   - **Old**: Only circle outlines visible
   - **New**: Light colored backgrounds (8% opacity) fill each zone

3. **Interaction Model**
   - **Old**: Drag-and-drop to move contacts between circles
   - **New**: Click-only interaction (no drag-and-drop)

### API Changes

#### Removed Features

The following features have been removed in V2:

- `enableDragDrop()` / `disableDragDrop()`
- `toggleContactSelection()` / `selectContact()` / `deselectContact()`
- `selectMultipleContacts()` / `clearSelection()` / `getSelectedContacts()`
- `batchDrag` event
- `contactDrag` event
- Group filter UI
- Selection controls UI

#### Retained Features

These features work the same way:

- `render(contacts, groups)` - Render contacts
- `updateContact(contactId, newCircle)` - Update a contact's circle
- `on(event, callback)` / `off(event, callback)` - Event listeners
- `getCircleDistribution()` - Get contact counts per circle
- `contactClick` event

## Migration Steps

### Step 1: Update HTML Include

Replace the old visualizer script:

```html
<!-- Old -->
<script src="circular-visualizer.js"></script>

<!-- New -->
<script src="circular-visualizer-v2.js"></script>
```

### Step 2: Update Class Name

```javascript
// Old
const visualizer = new CircularVisualizer('container-id');

// New
const visualizer = new CircularVisualizerV2('container-id');
```

### Step 3: Update Event Handlers

Remove drag-related event handlers:

```javascript
// Old - REMOVE THESE
visualizer.on('contactDrag', (data) => {
  // Handle drag
});

visualizer.on('batchDrag', (data) => {
  // Handle batch drag
});

// Keep these - they still work
visualizer.on('contactClick', (data) => {
  console.log('Clicked:', data.contact.name);
});

visualizer.on('contactUpdate', (data) => {
  console.log('Updated:', data.contactId);
});
```

### Step 4: Update Circle Movement Logic

If you were using drag-and-drop to move contacts, you'll need to implement an alternative UI:

```javascript
// Example: Add buttons or dropdown to move contacts
visualizer.on('contactClick', (data) => {
  // Show a modal or dropdown to select new circle
  const newCircle = showCircleSelector(data.contact);
  
  if (newCircle && newCircle !== data.contact.circle) {
    // Update via API
    updateContactCircle(data.contactId, newCircle);
    
    // Update visualizer
    visualizer.updateContact(data.contactId, newCircle);
  }
});
```

### Step 5: Remove Selection-Related Code

```javascript
// Old - REMOVE THESE
visualizer.selectContact(contactId);
visualizer.clearSelection();
const selected = visualizer.getSelectedContacts();

// New - Use click events instead
visualizer.on('contactClick', (data) => {
  // Handle individual contact clicks
});
```

## Testing

Open the test page to see the new visualizer in action:

```
public/js/circular-visualizer-v2.test.html
```

## Comparison

### Before (V1)
- Contacts on circle borders (hard to read)
- Hover states could loop infinitely
- Drag-and-drop required (complex interaction)
- No visual distinction between zones

### After (V2)
- Contacts within circle zones (easy to read)
- Simple, stable hover states
- Click-only interaction (simple and clear)
- Light backgrounds show zone boundaries

## Rollback Plan

If you need to rollback to the old visualizer:

1. Keep both files in your project
2. Use feature flags to switch between versions
3. Test thoroughly before removing V1

```javascript
// Feature flag approach
const useV2 = true; // Set to false to use old version

const visualizer = useV2 
  ? new CircularVisualizerV2('container-id')
  : new CircularVisualizer('container-id');
```

## Support

For issues or questions about the migration:

1. Check the test page for working examples
2. Review the simplified API in `circular-visualizer-v2.js`
3. Compare with the old implementation if needed

## Future Enhancements

Potential additions to V2 (not yet implemented):

- Optional drag-and-drop mode (if needed)
- Zoom and pan controls
- Search/filter functionality
- Export as image
- Animation presets
