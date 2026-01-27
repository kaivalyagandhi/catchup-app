# Quick Refine Card - Swipe Gesture Guide

## Overview

The Quick Refine Card supports intuitive swipe gestures for rapid contact categorization on mobile devices. This guide explains how the swipe gesture system works and how to use it effectively.

## Swipe Direction Mapping

The component maps swipe directions to Dunbar circles based on distance and direction:

```
        ← Far Left                                    Far Right →
    ┌──────────────┬──────────────┬──────────────┬──────────────┐
    │              │              │              │              │
    │    Inner     │    Close     │   Active     │   Casual     │
    │   Circle     │   Friends    │   Friends    │   Network    │
    │     💜       │     💗       │     💚       │     💙       │
    │              │              │              │              │
    │   < -200px   │  -200 to 0   │   0 to 200   │   > 200px    │
    └──────────────┴──────────────┴──────────────┴──────────────┘
```

### Swipe Zones

| Zone | Distance | Circle | Icon | Capacity |
|------|----------|--------|------|----------|
| Far Left | < -200px | Inner Circle | 💜 | 0-10 |
| Near Left | -200px to 0px | Close Friends | 💗 | 11-25 |
| Near Right | 0px to 200px | Active Friends | 💚 | 26-50 |
| Far Right | > 200px | Casual Network | 💙 | 51-100 |

## How to Swipe

### On Mobile (Touch)

1. **Touch the card** with your finger
2. **Drag left or right** to the desired zone
3. **Release** to assign the contact

**Visual Feedback:**
- Card follows your finger
- Card rotates slightly during swipe
- Card opacity changes when in assignment zone

### On Desktop (Mouse)

1. **Click and hold** on the card
2. **Drag left or right** to the desired zone
3. **Release** to assign the contact

**Note:** Desktop mouse dragging is primarily for testing. The component is optimized for touch gestures.

## Swipe Thresholds

### Minimum Distance
- **100px**: Minimum swipe distance to trigger assignment
- Shorter swipes are ignored and card returns to center

### Minimum Velocity
- **0.5**: Minimum velocity (distance/time) for fast swipes
- Fast swipes can trigger assignment even if distance < 100px

### Example Scenarios

**Scenario 1: Slow, Long Swipe**
- Distance: 250px left
- Time: 1000ms
- Velocity: 0.25
- Result: ✅ Assigned to Inner Circle (distance > 200px)

**Scenario 2: Fast, Short Swipe**
- Distance: 80px right
- Time: 100ms
- Velocity: 0.8
- Result: ✅ Assigned to Active Friends (velocity > 0.5)

**Scenario 3: Slow, Short Swipe**
- Distance: 50px left
- Time: 500ms
- Velocity: 0.1
- Result: ❌ Card returns to center (distance < 100px, velocity < 0.5)

## Visual Feedback

### During Swipe

1. **Card Movement**
   - Card translates horizontally following touch/mouse
   - Card rotates proportionally to distance (deltaX * 0.05 degrees)

2. **Opacity Change**
   - Card opacity reduces to 0.7 when in assignment zone
   - Provides visual confirmation of pending assignment

3. **CSS Classes**
   - `.dragging`: Applied during active drag
   - `.swiping-left`: Applied when swiping left past threshold
   - `.swiping-right`: Applied when swiping right past threshold

### After Assignment

1. **Toast Notification**
   - Success message: "John Doe added to Inner Circle"
   - Error message if assignment fails

2. **Card Transition**
   - Current card slides out
   - Next card slides in with animation

3. **Progress Update**
   - Progress bar advances
   - Remaining count decreases

## Best Practices

### For Users

1. **Start with Far Swipes**
   - Practice swiping to far left/right first
   - Easier to distinguish between zones

2. **Use Quick Swipes**
   - Fast swipes feel more natural
   - Velocity threshold allows shorter distances

3. **Watch Visual Feedback**
   - Card opacity change indicates assignment zone
   - Card rotation shows swipe direction

4. **Use Buttons for Precision**
   - If unsure about swipe zone, use circle buttons
   - Buttons provide exact control

### For Developers

1. **Test on Real Devices**
   - Touch behavior differs from mouse simulation
   - Test on various screen sizes

2. **Adjust Thresholds**
   - Modify `SWIPE_THRESHOLD` (default: 100px)
   - Modify `SWIPE_VELOCITY_THRESHOLD` (default: 0.5)

3. **Customize Zones**
   - Adjust zone boundaries in `handleSwipe()` method
   - Consider user feedback for optimal distances

## Troubleshooting

### Swipe Not Detected

**Problem:** Card doesn't respond to swipe
**Solutions:**
- Ensure touch events are enabled
- Check `touch-action: pan-y` CSS property
- Verify no conflicting event listeners

### Wrong Circle Assigned

**Problem:** Swipe assigns to unexpected circle
**Solutions:**
- Check swipe distance and velocity
- Verify zone boundaries in code
- Test with slower, more deliberate swipes

### Card Stuck in Dragging State

**Problem:** Card remains in dragging state after release
**Solutions:**
- Ensure `touchend` event is firing
- Check for JavaScript errors in console
- Verify `isDragging` flag is reset

### Swipe Too Sensitive

**Problem:** Small movements trigger assignments
**Solutions:**
- Increase `SWIPE_THRESHOLD` value
- Increase `SWIPE_VELOCITY_THRESHOLD` value
- Add minimum time threshold

## Accessibility Considerations

### Alternative Input Methods

1. **Circle Buttons**
   - Always available as alternative to swipes
   - Keyboard accessible
   - Screen reader compatible

2. **Skip Button**
   - Allows skipping contacts without assignment
   - Useful if swipe is difficult

3. **Done for Now**
   - Exit flow at any time
   - Resume later from saved progress

### Touch Target Size

- All buttons: >= 44x44px (WCAG 2.1 Level AAA)
- Card swipe area: Full card height (400px)
- Adequate spacing between buttons

## Performance

### Optimization Techniques

1. **Passive Event Listeners**
   - `touchstart` and `touchend` use `{ passive: true }`
   - Improves scroll performance

2. **Prevent Default Selectively**
   - Only prevent default for horizontal swipes
   - Allows vertical scrolling

3. **CSS Transitions**
   - Hardware-accelerated transforms
   - Smooth 60fps animations

4. **Minimal Reflows**
   - Transform and opacity changes only
   - No layout recalculations during swipe

## Code Example

### Basic Swipe Handler

```javascript
handleTouchStart(event) {
  this.touchStartX = event.touches[0].clientX;
  this.touchStartTime = Date.now();
  this.isDragging = true;
}

handleTouchMove(event) {
  if (!this.isDragging) return;
  
  const deltaX = event.touches[0].clientX - this.touchStartX;
  
  // Update card position
  card.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.05}deg)`;
  
  // Visual feedback
  if (Math.abs(deltaX) > this.SWIPE_THRESHOLD) {
    card.classList.add(deltaX < 0 ? 'swiping-left' : 'swiping-right');
  }
}

handleTouchEnd(event) {
  const deltaX = this.touchEndX - this.touchStartX;
  const deltaTime = Date.now() - this.touchStartTime;
  const velocity = Math.abs(deltaX) / deltaTime;
  
  // Check if swipe is significant
  if (Math.abs(deltaX) > this.SWIPE_THRESHOLD || velocity > this.SWIPE_VELOCITY_THRESHOLD) {
    this.handleSwipe(deltaX);
  } else {
    // Reset card position
    card.style.transform = '';
  }
  
  this.isDragging = false;
}
```

### Swipe Direction Mapping

```javascript
handleSwipe(deltaX) {
  let circle;
  
  if (deltaX < -200) {
    circle = 'inner';      // Far left
  } else if (deltaX < 0) {
    circle = 'close';      // Near left
  } else if (deltaX < 200) {
    circle = 'active';     // Near right
  } else {
    circle = 'casual';     // Far right
  }
  
  this.handleAssignment(circle);
}
```

## Testing Swipe Gestures

### Manual Testing Checklist

- [ ] Swipe far left assigns to Inner Circle
- [ ] Swipe near left assigns to Close Friends
- [ ] Swipe near right assigns to Active Friends
- [ ] Swipe far right assigns to Casual Network
- [ ] Short swipes return card to center
- [ ] Fast swipes trigger assignment
- [ ] Visual feedback appears during swipe
- [ ] Card rotates during swipe
- [ ] Opacity changes in assignment zone
- [ ] Toast notification appears after assignment
- [ ] Progress bar updates correctly
- [ ] Next card appears smoothly

### Test on Multiple Devices

- [ ] iPhone (iOS Safari)
- [ ] Android phone (Chrome Mobile)
- [ ] iPad (iOS Safari)
- [ ] Android tablet
- [ ] Desktop (mouse simulation)

## Related Documentation

- **Component README**: `docs/features/quick-refine/README.md`
- **Quick Reference**: `docs/features/quick-refine/QUICK_REFERENCE.md`
- **Implementation Summary**: `docs/features/quick-refine/IMPLEMENTATION_SUMMARY.md`
- **Test File**: `tests/html/quick-refine-card.test.html`

## Feedback and Improvements

If you have suggestions for improving the swipe gesture system:

1. Test the current implementation
2. Document specific issues or improvements
3. Consider user experience and accessibility
4. Propose threshold adjustments or new features

The swipe gesture system is designed to be intuitive and efficient while maintaining accessibility through alternative input methods.
