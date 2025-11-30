# Mobile-Responsive Design Guide

## Overview

The Contact Onboarding feature includes comprehensive mobile-responsive design that provides an optimal experience across all device sizes and orientations. This guide covers the mobile-specific features and best practices.

## Features

### 1. Touch-Optimized Circular Visualization

The circular visualizer is fully optimized for touch interactions:

**Touch Gestures:**
- **Tap**: Select a contact (shows details)
- **Long-press** (500ms): Toggle contact selection for batch operations
- **Drag**: Move contact(s) between circles
- **Pinch**: (Future enhancement for zoom)

**Touch Target Sizes:**
- Contact dots: Minimum 36px diameter on mobile (44px on tablets)
- Buttons: Minimum 44x44px (iOS/Android standard)
- Interactive elements: Adequate spacing to prevent mis-taps

**Visual Feedback:**
- Haptic feedback on selection (if device supports)
- Visual highlight on touch
- Smooth animations for drag operations

### 2. Responsive Layout

The interface adapts to different screen sizes:

**Breakpoints:**
- **Desktop** (>1024px): Full layout with all features
- **Tablet** (768px-1024px): Optimized layout with adjusted spacing
- **Mobile** (480px-768px): Compact layout with stacked elements
- **Small Mobile** (<480px): Minimal layout with essential features only

**Adaptive Elements:**
- Circle legend: Wraps to multiple rows on small screens
- Group filters: Stack vertically on mobile
- Selection controls: Full-width buttons on mobile
- Contact dots: Smaller size on small screens (32-36px)

### 3. Mobile Autocomplete

Touch-friendly autocomplete for contact search:

**Features:**
- Large touch targets (minimum 60px height per result)
- Smooth scrolling with momentum
- Keyboard navigation support
- Debounced search (300ms) to reduce API calls
- Clear visual feedback on selection

**Usage:**
```javascript
const autocomplete = new MobileAutocomplete(inputElement, {
  minChars: 1,
  maxResults: 10,
  touchOptimized: true,
  onSearch: async (query) => {
    // Return array of matching contacts
    return await searchContacts(query);
  },
  onSelect: (contact) => {
    // Handle contact selection
    console.log('Selected:', contact);
  }
});
```

**Mobile Optimizations:**
- Font size: 16px minimum (prevents iOS zoom)
- Input attributes: `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"`
- Touch-friendly result items with large tap areas
- Smooth animations for dropdown appearance

### 4. Orientation Change Handling

State preservation across orientation changes:

**Preserved State:**
- Selected contacts
- Active group filter
- Scroll position
- Current onboarding step
- Form input values

**Implementation:**
```javascript
// Automatic state preservation
window.addEventListener('orientationchange', () => {
  visualizer.handleOrientationChange();
});

// Manual state save/restore
const state = visualizer.saveState();
// ... orientation change ...
visualizer.restoreState(state);
```

**Behavior:**
- Detects orientation change
- Saves current state
- Waits for layout reflow (100ms)
- Restores state
- Re-renders with preserved data

### 5. Performance Optimizations

Mobile-specific performance enhancements:

**Rendering:**
- Virtual scrolling for large contact lists (>100 contacts)
- Debounced resize handlers
- Optimized SVG rendering
- CSS transforms for animations (GPU-accelerated)

**Touch Events:**
- Passive event listeners where possible
- Touch event delegation
- Throttled drag updates
- Optimized hit detection

**Memory:**
- Cleanup on component destroy
- Event listener removal
- Cached calculations
- Lazy loading of non-critical features

## CSS Media Queries

### Desktop (Default)
```css
.circular-visualizer {
  /* Full desktop layout */
}
```

### Tablet (≤768px)
```css
@media (max-width: 768px) {
  .visualizer-controls {
    padding: 15px;
  }
  
  .circle-legend {
    gap: 10px;
  }
  
  .visualizer-canvas {
    min-height: 400px;
  }
}
```

### Mobile (≤480px)
```css
@media (max-width: 480px) {
  .circular-visualizer {
    border-radius: 0;
  }
  
  .legend-item {
    flex: 1 1 calc(50% - 4px);
  }
  
  .visualizer-canvas {
    min-height: 350px;
  }
}
```

### Landscape Orientation
```css
@media (max-height: 500px) and (orientation: landscape) {
  .visualizer-controls {
    padding: 10px;
  }
  
  .visualizer-canvas {
    min-height: 300px;
  }
}
```

## Mobile Detection

The visualizer automatically detects mobile devices:

```javascript
detectMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth <= 768);
}
```

When mobile is detected:
- Touch-optimized styles are applied
- Hover effects are disabled
- Touch target sizes are increased
- Momentum scrolling is enabled

## Best Practices

### 1. Touch Targets
- Minimum 44x44px for all interactive elements
- Adequate spacing between touch targets (8px minimum)
- Visual feedback on touch (active states)

### 2. Typography
- Minimum 16px font size for inputs (prevents iOS zoom)
- Readable font sizes for all text (14px minimum)
- Adequate line height for readability (1.5 minimum)

### 3. Performance
- Debounce expensive operations (search, resize)
- Use CSS transforms for animations
- Minimize reflows and repaints
- Lazy load non-critical features

### 4. Accessibility
- Support both touch and keyboard navigation
- Provide visual feedback for all interactions
- Maintain focus management
- Support screen readers

### 5. Testing
- Test on real devices (iOS and Android)
- Test in both portrait and landscape
- Test with different screen sizes
- Test touch gestures thoroughly

## Browser Support

**Supported Browsers:**
- iOS Safari 12+
- Chrome for Android 80+
- Samsung Internet 10+
- Firefox for Android 68+

**Required Features:**
- Touch Events API
- CSS Transforms
- SVG support
- Flexbox
- CSS Grid (for layout)

## Troubleshooting

### Issue: Zoom on Input Focus (iOS)
**Solution:** Set input font-size to 16px minimum
```css
input {
  font-size: 16px;
}
```

### Issue: Scroll Lag on iOS
**Solution:** Enable momentum scrolling
```css
.scrollable-element {
  -webkit-overflow-scrolling: touch;
}
```

### Issue: Touch Events Not Working
**Solution:** Check for passive event listeners
```javascript
element.addEventListener('touchstart', handler, { passive: false });
```

### Issue: Orientation Change Glitches
**Solution:** Add delay before re-rendering
```javascript
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    handleResize();
  }, 100);
});
```

## Examples

### Example 1: Basic Mobile Setup
```javascript
// Initialize visualizer
const visualizer = new CircularVisualizer('container');

// Render contacts
visualizer.render(contacts, groups);

// Listen for touch events
visualizer.on('contactDrag', (data) => {
  console.log('Contact dragged:', data);
});
```

### Example 2: Mobile Autocomplete
```javascript
// Initialize autocomplete
const autocomplete = new MobileAutocomplete(input, {
  touchOptimized: true,
  onSearch: async (query) => {
    const response = await fetch(`/api/contacts/search?q=${query}`);
    return await response.json();
  },
  onSelect: (contact) => {
    // Handle selection
    selectContact(contact);
  }
});
```

### Example 3: Orientation Handling
```javascript
// Save state before orientation change
let savedState = null;

window.addEventListener('orientationchange', () => {
  savedState = visualizer.saveState();
  
  setTimeout(() => {
    visualizer.handleResize();
    if (savedState) {
      visualizer.restoreState(savedState);
    }
  }, 100);
});
```

## Testing

Use the provided test file to verify mobile functionality:

```bash
# Open in browser
open public/js/mobile-responsive.test.html

# Or serve with a local server
python -m http.server 8000
# Then visit: http://localhost:8000/public/js/mobile-responsive.test.html
```

**Test Checklist:**
- [ ] Touch gestures work (tap, long-press, drag)
- [ ] Layout adapts to screen size
- [ ] Autocomplete is touch-friendly
- [ ] Orientation changes preserve state
- [ ] Touch targets meet minimum size (44x44px)
- [ ] No zoom on input focus (iOS)
- [ ] Smooth scrolling and animations
- [ ] Haptic feedback works (if supported)

## Future Enhancements

**Planned Features:**
- Pinch-to-zoom for circular visualization
- Swipe gestures for navigation
- Voice input for contact search
- Offline support with service workers
- Progressive Web App (PWA) capabilities
- Dark mode support
- Accessibility improvements (ARIA labels, screen reader support)

## Resources

- [iOS Human Interface Guidelines - Touch](https://developer.apple.com/design/human-interface-guidelines/ios/user-interaction/touch/)
- [Material Design - Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)
- [MDN - Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [Web.dev - Mobile Performance](https://web.dev/mobile/)
