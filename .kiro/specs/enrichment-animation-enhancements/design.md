# Design Document: Enrichment Animation Enhancements

## Overview

This design consolidates the enrichment review UI's notification system from two competing toast systems into unified, GPU-accelerated animations. The enhancements provide visual feedback through smooth state transitions, entrance animations, and loading states—eliminating overlapping modals and improving the overall user experience.

The design maintains all existing functionality while replacing text-based notifications with animation-based feedback that guides user attention and reduces visual clutter.

## Architecture

```
Enrichment Animation System
├── Live Toast Animations
│   ├── Entrance: Slide from bottom + fade in (300ms)
│   ├── Success State: Green background + checkmark (200ms hold)
│   ├── Reject State: Gray background + X icon (200ms hold)
│   └── Exit: Slide to bottom + fade out (300ms)
├── Pending Edits Page Animations
│   ├── Row Entrance: Slide from left + fade in (400ms, staggered)
│   ├── Accept State: Green pulse animation (300ms)
│   ├── Reject State: Gray pulse animation (300ms)
│   └── Bulk Actions: Simultaneous animation of all rows
└── Apply Action Animations
    ├── Loading: Spinner animation (600ms cycle)
    ├── Success: Checkmark + fade out (500ms)
    └── Error: Restore button state
```

## Components and Interfaces

### 1. Live Enrichment Toast Animation

**Purpose**: Animate enrichment suggestions in and out with state feedback

**Entrance Animation**:
- Duration: 300ms
- Easing: ease-out
- Transform: `translateY(20px)` → `translateY(0)`
- Opacity: `0` → `1`
- Direction: From bottom

**State Feedback**:
- **Confirm**: Green background (#f0fdf4), checkmark icon (✓)
- **Reject**: Gray background (#fafafa), X icon (✗)
- Duration: 200ms hold before exit

**Exit Animation**:
- Duration: 300ms
- Easing: ease-in
- Transform: `translateY(0)` → `translateY(20px)`
- Opacity: `1` → `0`
- Direction: To bottom

**CSS Classes**:
```css
.enrichment-toast { /* Base state */ }
.enrichment-toast.visible { /* Entrance complete */ }
.enrichment-toast.success { /* Confirm state */ }
.enrichment-toast.rejected { /* Reject state */ }
.enrichment-toast.exiting { /* Exit animation */ }
```

### 2. Pending Edits Page Row Animations

**Purpose**: Animate table rows in with staggered entrance effect

**Entrance Animation**:
- Duration: 400ms per row
- Easing: ease-out
- Transform: `translateX(-20px)` → `translateX(0)`
- Opacity: `0` → `1`
- Stagger: 50-100ms between rows
- Direction: From left

**Stagger Pattern**:
```
Row 1: 0ms delay
Row 2: 50ms delay
Row 3: 100ms delay
Row 4: 150ms delay
Row 5: 200ms delay
... (continue pattern)
```

**CSS Classes**:
```css
.enrichment-item { /* Base state with animation */ }
.enrichment-item:nth-child(1) { animation-delay: 0ms; }
.enrichment-item:nth-child(2) { animation-delay: 50ms; }
/* ... continue pattern ... */
```

### 3. Accept/Reject State Change Animation

**Purpose**: Provide visual feedback when edit state changes

**Accept Animation**:
- Duration: 300ms
- Background: White → Green (#f0fdf4) → Green
- Easing: ease-out
- Effect: Pulse animation

**Reject Animation**:
- Duration: 300ms
- Background: White → Gray (#fafafa) → Gray
- Easing: ease-out
- Effect: Pulse animation

**Bulk Action Animation**:
- All rows in contact group animate simultaneously
- Same duration and easing as individual rows
- No stagger delay

**CSS Keyframes**:
```css
@keyframes acceptPulse {
  0% { background: #ffffff; }
  50% { background: #d1fae5; }
  100% { background: #f0fdf4; }
}

@keyframes rejectPulse {
  0% { background: #ffffff; }
  50% { background: #fee2e2; }
  100% { background: #fafafa; }
}
```

### 4. Apply Action Loading and Success Animation

**Purpose**: Provide feedback during apply process

**Loading State**:
- Button shows spinner icon
- Spinner rotation: 600ms cycle
- Button disabled during processing
- Rows animate out as they complete

**Success State**:
- Checkmark icon appears
- Hold for 500-1000ms
- Fade out and remove

**Error State**:
- Button returns to normal state
- Error message displayed (animation-based or inline)

**CSS Keyframes**:
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes successFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

## Data Models

### Animation State

```typescript
interface AnimationState {
  type: 'entrance' | 'exit' | 'stateChange' | 'loading' | 'success' | 'error';
  duration: number; // milliseconds
  easing: 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  delay?: number; // milliseconds
  transform?: string; // CSS transform value
  opacity?: [number, number]; // [from, to]
}

interface ToastAnimationConfig {
  entrance: AnimationState;
  stateChange: AnimationState;
  exit: AnimationState;
}

interface RowAnimationConfig {
  entrance: AnimationState;
  stateChange: AnimationState;
  stagger: number; // milliseconds between rows
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Toast Animation Sequence Completeness

*For any* enrichment suggestion, when displayed, the animation sequence should complete in the correct order: entrance → state feedback → exit, with no overlapping animations or visual glitches.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Row Entrance Stagger Consistency

*For any* set of pending edits, when the page renders, each row should animate in with a consistent stagger delay (50-100ms), and the total animation time should not exceed the number of rows × stagger delay + 400ms.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: State Change Animation Atomicity

*For any* edit state change (accept/reject), the animation should complete atomically without interruption, and the final visual state should match the data state.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

### Property 4: Bulk Action Synchronization

*For any* bulk action (Accept All/Reject All), all rows in the contact group should animate simultaneously with the same duration and easing, and all rows should reach the final state at the same time.

**Validates: Requirements 3.4, 3.5, 3.6**

### Property 5: Apply Action State Progression

*For any* apply action, the button should progress through states in order: normal → loading → success/error, with appropriate animations at each transition, and the button should return to normal state after completion.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

### Property 6: Animation Performance Consistency

*For any* animation, the frame rate should remain consistent (60fps on desktop, 30fps minimum on mobile), and animations should use only GPU-accelerated properties (`transform`, `opacity`).

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

### Property 7: Reduced Motion Respect

*For any* user with `prefers-reduced-motion` enabled, animations should be disabled or replaced with instant transitions, and the interface should remain fully functional.

**Validates: Requirements 5.6, 7.3, 7.4**

### Property 8: Toast System Consolidation

*For any* enrichment action (confirm/reject/apply), the system should use animation-based feedback only and should NOT call the general `showToast()` function.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

## Error Handling

### Animation Interruption
- If an animation is interrupted by user action, the element should jump to final state
- No visual glitches or incomplete animations should be visible

### Performance Degradation
- If animations cause frame drops, fall back to instant transitions
- Log performance warnings for debugging

### State Mismatch
- If animation state doesn't match data state, force synchronization
- Log warning and re-render if necessary

### Accessibility Issues
- If `prefers-reduced-motion` is detected, disable all animations
- Ensure keyboard navigation works during animations

## Testing Strategy

### Unit Tests

- Test animation timing calculations
- Test stagger delay calculations
- Test state transition logic
- Test animation class application
- Test CSS keyframe definitions

### Property-Based Tests

- **Property 1**: Generate random toast sequences and verify animation order
- **Property 2**: Generate random row counts and verify stagger consistency
- **Property 3**: Generate random state changes and verify animation atomicity
- **Property 4**: Generate random bulk actions and verify synchronization
- **Property 5**: Generate random apply sequences and verify state progression
- **Property 6**: Measure frame rates during animations and verify consistency
- **Property 7**: Test with `prefers-reduced-motion` enabled and verify functionality
- **Property 8**: Verify no `showToast()` calls in enrichment methods

### Integration Tests

- Test full enrichment flow with animations
- Test pending edits page with multiple rows
- Test apply action with loading and success states
- Test keyboard navigation during animations
- Test animations in dark mode
- Test animations on mobile devices

## Visual Specifications

### Animation Timing

| Animation | Duration | Easing | Delay |
|-----------|----------|--------|-------|
| Toast entrance | 300ms | ease-out | 0ms |
| Toast state change | 200ms | ease-out | 0ms |
| Toast exit | 300ms | ease-in | 0ms |
| Row entrance | 400ms | ease-out | staggered |
| State change | 300ms | ease-out | 0ms |
| Apply loading | 600ms | linear | 0ms |
| Apply success | 500ms | ease-out | 0ms |

### Color Palette

| State | Background | Icon | Text |
|-------|-----------|------|------|
| Accept | #f0fdf4 (green) | ✓ | #10b981 |
| Reject | #fafafa (gray) | ✗ | #6b7280 |
| Loading | #ffffff | ⟳ | #7c3aed |
| Success | #f0fdf4 (green) | ✓ | #10b981 |

## Implementation Notes

1. **CSS-Only Animations**: Use CSS keyframes and transitions, no JavaScript animation libraries
2. **GPU Acceleration**: Use `transform` and `opacity` only for animations
3. **Performance**: Test on low-end devices to ensure smooth performance
4. **Accessibility**: Respect `prefers-reduced-motion` media query
5. **Browser Support**: Ensure animations work on Chrome, Firefox, Safari, Edge
6. **Mobile Optimization**: Test animations on various mobile devices
7. **Dark Mode**: Verify animations work correctly in dark mode

