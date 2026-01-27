# Progress Tracking UI

## Overview

The Progress Tracking UI provides real-time feedback to users during the contact organization process. It displays progress percentage, absolute numbers, estimated time remaining, milestone celebrations, and circle capacity indicators.

**Requirements**: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7

## Features

### 1. Progress Bar with Percentage
- Visual progress bar showing completion percentage
- Animated fill with shimmer effect
- Percentage displayed in center of bar
- Smooth transitions when progress updates

### 2. Absolute Numbers Display
- Shows "X of Y contacts" categorized
- Displays remaining count
- Updates in real-time

### 3. Estimated Time Remaining
- Calculates average time per contact
- Displays estimated time to completion
- Formats time intelligently (minutes, hours)
- Shows "Estimating..." when insufficient data
- Shows "Complete!" when finished

### 4. Milestone Celebrations
- Triggers at 25%, 50%, 75%, and 100% completion
- Animated modal with bounce effects
- Encouraging messages for each milestone
- Auto-dismisses after 5 seconds
- Manual close option

**Milestone Messages**:
- 25%: "Great start! You're 25% done!" 🌟
- 50%: "Halfway there! Keep going!" 🎯
- 75%: "Almost done! You're doing great!" 🚀
- 100%: "🎉 All contacts organized! Amazing work!" 🎉

### 5. Circle Capacity Indicators
- Visual capacity bars for each Dunbar circle
- Color-coded by circle type:
  - Inner Circle (💜): Purple gradient
  - Close Friends (💙): Blue gradient
  - Active Friends (💚): Green gradient
  - Casual Network (💛): Yellow gradient
- Real-time updates as contacts are assigned
- Warning states when near/at capacity
- Current/max count display

## Component API

### Constructor Options

```javascript
const progressTracker = new ProgressTracker({
  containerId: 'progress-tracker-container',  // Required: DOM element ID
  totalContacts: 100,                         // Total number of contacts
  categorizedContacts: 0,                     // Number of categorized contacts
  startTime: Date.now(),                      // Start time for pace calculation
  circleCapacities: {                         // Circle capacity data
    inner: { current: 0, max: 10 },
    close: { current: 0, max: 25 },
    active: { current: 0, max: 50 },
    casual: { current: 0, max: 100 }
  },
  onMilestone: (milestone) => {               // Callback when milestone reached
    console.log('Milestone:', milestone);
  }
});
```

### Methods

#### `render()`
Renders the progress tracker to the DOM.

```javascript
progressTracker.render();
```

#### `update(categorizedContacts, totalContacts, circleCapacities)`
Updates progress and re-renders. Checks for milestone achievements.

```javascript
progressTracker.update(25, 100, {
  inner: { current: 10, max: 10 },
  close: { current: 15, max: 25 },
  active: { current: 0, max: 50 },
  casual: { current: 0, max: 100 }
});
```

#### `updateCircleCapacities(circleCapacities)`
Updates only circle capacity indicators.

```javascript
progressTracker.updateCircleCapacities({
  inner: { current: 8, max: 10 },
  close: { current: 20, max: 25 },
  active: { current: 30, max: 50 },
  casual: { current: 50, max: 100 }
});
```

#### `reset()`
Resets progress tracker to initial state.

```javascript
progressTracker.reset();
```

#### `destroy()`
Removes component from DOM and cleans up.

```javascript
progressTracker.destroy();
```

## Usage Example

### Basic Setup

```javascript
// Initialize progress tracker
const progressTracker = new ProgressTracker({
  containerId: 'progress-tracker-container',
  totalContacts: 100,
  categorizedContacts: 0,
  onMilestone: (milestone) => {
    console.log(`Milestone reached: ${milestone.threshold}%`);
    // Track analytics, show additional UI, etc.
  }
});

// Render initial state
progressTracker.render();
```

### Updating Progress

```javascript
// When a contact is categorized
function onContactCategorized(contactId, circle) {
  // Update counts
  categorizedCount++;
  circleCapacities[circle].current++;
  
  // Update progress tracker
  progressTracker.update(
    categorizedCount,
    totalContacts,
    circleCapacities
  );
}
```

### Integration with Onboarding Flow

```javascript
// In onboarding controller
const progressTracker = new ProgressTracker({
  containerId: 'progress-tracker-container',
  totalContacts: contacts.length,
  categorizedContacts: 0,
  startTime: Date.now(),
  onMilestone: (milestone) => {
    // Track milestone achievement
    analytics.track('Onboarding Milestone', {
      threshold: milestone.threshold,
      message: milestone.message
    });
  }
});

// Update on each assignment
circleAssignmentService.on('contactAssigned', (contact, circle) => {
  const progress = onboardingController.getProgress();
  progressTracker.update(
    progress.categorizedContacts,
    progress.totalContacts,
    progress.circleCapacities
  );
});
```

## Styling

The component uses CSS custom properties for theming:

```css
/* Progress bar colors */
--bg-surface: Background color for container
--bg-tertiary: Background color for empty progress bar
--text-primary: Primary text color
--text-secondary: Secondary text color
--border-subtle: Border color

/* Circle capacity colors */
/* Automatically uses gradients for each circle type */
```

## Accessibility

- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode compatible
- Focus indicators on interactive elements

## Mobile Responsive

- Stacks vertically on mobile devices
- Touch-friendly button sizes
- Optimized animations for mobile performance
- Reduced motion support

## Performance

- Efficient DOM updates (only re-renders changed sections)
- GPU-accelerated animations
- Debounced updates for rapid changes
- Minimal memory footprint

## Testing

Manual test file: `tests/html/progress-tracker.test.html`

### Test Scenarios

1. **Progress Updates**
   - Add 5, 10, 25 contacts
   - Verify percentage calculation
   - Check absolute numbers display
   - Validate time estimate

2. **Milestone Celebrations**
   - Trigger 25% milestone
   - Trigger 50% milestone
   - Trigger 75% milestone
   - Trigger 100% milestone
   - Verify animations and messages

3. **Circle Capacity Indicators**
   - Fill circles to various levels
   - Test warning states (>90% full)
   - Test at-capacity state (100% full)
   - Verify color coding

4. **Edge Cases**
   - Zero contacts
   - One contact
   - All contacts categorized
   - Reset functionality

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Related Components

- `QuickStartFlow`: Uses progress tracker for initial onboarding
- `BatchSuggestionCard`: Updates progress on batch accept
- `QuickRefineCard`: Updates progress on individual assignments
- `OnboardingController`: Manages overall progress state

## Future Enhancements

- [ ] Animated confetti for 100% milestone
- [ ] Sound effects for milestones (optional)
- [ ] Progress history graph
- [ ] Undo/redo progress tracking
- [ ] Export progress report
- [ ] Customizable milestone thresholds
- [ ] Pace comparison (vs. average user)

## Troubleshooting

### Progress not updating
- Verify `update()` is called with correct parameters
- Check that `categorizedContacts` <= `totalContacts`
- Ensure container element exists in DOM

### Milestone not triggering
- Verify percentage crosses threshold (not just equals)
- Check that milestone hasn't already been reached
- Ensure `onMilestone` callback is provided

### Circle capacities not showing
- Verify `circleCapacities` object structure
- Check that current values are within max limits
- Ensure `updateCircleCapacities()` is called

### Time estimate inaccurate
- Requires at least 1 categorized contact
- Accuracy improves with more data points
- Based on average pace, not predictive

## License

Part of the CatchUp application. See main LICENSE file.
