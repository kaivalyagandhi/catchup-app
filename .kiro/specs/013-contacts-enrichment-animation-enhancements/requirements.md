# Requirements Document: Enrichment Animation Enhancements

## Introduction

The enrichment review UI currently uses two separate toast notification systems that can overlap and compete for screen space. This feature consolidates the notification system into unified, animated state transitions that provide visual feedback without modal overlap. The enhancements improve user experience by replacing text-based notifications with smooth animations that guide user attention and reduce visual clutter.

## Glossary

- **Live Enrichment Toast**: Popup notification that appears during voice recording with confirm/reject buttons
- **General Toast**: System notification that appears after user actions (success/error messages)
- **State Animation**: Visual transition when an edit changes state (pending → accepted/rejected)
- **Stagger Animation**: Sequential animation of multiple elements with time delays between each
- **GPU-Accelerated**: Animations using CSS `transform` and `opacity` for optimal performance
- **Entrance Animation**: Visual effect when an element first appears on screen
- **Exit Animation**: Visual effect when an element leaves the screen
- **Pulse Animation**: Brief color/scale change to draw attention to state changes

## Requirements

### Requirement 1: Unified Toast Animation System

**User Story:** As a user, I want enrichment suggestions to animate smoothly without overlapping notifications, so that I can clearly see and interact with suggestions without distraction.

#### Acceptance Criteria

1. WHEN a live enrichment suggestion appears THEN the System SHALL animate it in from the bottom with fade effect (300ms)
2. WHEN the user confirms a suggestion THEN the System SHALL show a success state (green background + checkmark) before animating out
3. WHEN the user rejects a suggestion THEN the System SHALL show a reject state (gray background + X icon) before animating out
4. WHEN a suggestion animates out THEN the System SHALL slide it down and fade it out (300ms)
5. WHEN a suggestion is displayed THEN the System SHALL NOT show a separate general toast notification
6. WHEN multiple suggestions appear THEN the System SHALL stack them vertically without overlapping
7. WHEN a suggestion is confirmed or rejected THEN the System SHALL remove the general toast system call

### Requirement 2: Pending Edits Page Row Animations

**User Story:** As a user, I want to see edits appear with smooth animations on the pending review page, so that the interface feels responsive and polished.

#### Acceptance Criteria

1. WHEN the pending edits page renders THEN the System SHALL animate each row in from the left with fade effect
2. WHEN rows animate in THEN the System SHALL stagger them with 50-100ms delay between each row
3. WHEN the first row appears THEN the System SHALL start animation immediately (0ms delay)
4. WHEN rows are displayed THEN the System SHALL use 400ms animation duration for entrance
5. WHEN the page has many rows THEN the System SHALL maintain smooth performance without jank
6. WHEN a row animates in THEN the System SHALL use `transform` and `opacity` only (no layout shifts)

### Requirement 3: Accept/Reject State Change Animations

**User Story:** As a user, I want visual feedback when I accept or reject an edit, so that I know my action was registered.

#### Acceptance Criteria

1. WHEN the user clicks accept on an edit THEN the System SHALL animate the row background to green (300ms)
2. WHEN the user clicks reject on an edit THEN the System SHALL animate the row background to gray (300ms)
3. WHEN a row state changes THEN the System SHALL show a pulse animation (color transition)
4. WHEN the user clicks "Accept All" THEN the System SHALL animate all rows in the contact group to green simultaneously
5. WHEN the user clicks "Reject All" THEN the System SHALL animate all rows in the contact group to gray simultaneously
6. WHEN a bulk action completes THEN the System SHALL update the contact group summary count with animation
7. WHEN a row state changes THEN the System SHALL NOT cause layout shifts or reflows

### Requirement 4: Apply Action Loading and Success Animation

**User Story:** As a user, I want to see visual feedback during the apply process, so that I know the system is processing my changes.

#### Acceptance Criteria

1. WHEN the user clicks "Apply Selected" THEN the System SHALL show a loading spinner on the button
2. WHEN the apply process is running THEN the System SHALL disable the button and show loading state
3. WHEN edits are being applied THEN the System SHALL animate rows out from the right as they complete
4. WHEN all edits are applied THEN the System SHALL show a success state with checkmark icon
5. WHEN the success state is shown THEN the System SHALL hold it for 500-1000ms before fading out
6. WHEN the apply process completes THEN the System SHALL NOT show a separate general toast notification
7. WHEN the apply process fails THEN the System SHALL restore the button to normal state and show error feedback

### Requirement 5: Animation Timing and Performance

**User Story:** As a user, I want animations to feel smooth and responsive, so that the interface doesn't feel sluggish or distracting.

#### Acceptance Criteria

1. WHEN animations play THEN the System SHALL use 200-300ms duration for state changes
2. WHEN animations play THEN the System SHALL use 300-400ms duration for entrance effects
3. WHEN animations play THEN the System SHALL use GPU-accelerated properties (`transform`, `opacity`)
4. WHEN animations play THEN the System SHALL NOT use JavaScript animation libraries
5. WHEN animations play THEN the System SHALL respect `prefers-reduced-motion` media query
6. WHEN the user has reduced motion preference THEN the System SHALL skip animations or use instant transitions
7. WHEN animations play on mobile THEN the System SHALL maintain 60fps performance

### Requirement 6: Animation Easing and Visual Polish

**User Story:** As a user, I want animations to feel natural and polished, so that the interface feels professional.

#### Acceptance Criteria

1. WHEN elements enter the screen THEN the System SHALL use ease-out easing for smooth deceleration
2. WHEN elements exit the screen THEN the System SHALL use ease-in easing for smooth acceleration
3. WHEN state changes occur THEN the System SHALL use ease-out easing for visual feedback
4. WHEN rows stagger in THEN the System SHALL use linear easing for consistent timing
5. WHEN animations complete THEN the System SHALL use cubic-bezier for bounce effect on entrance (optional)
6. WHEN animations play THEN the System SHALL use consistent easing across all transitions

### Requirement 7: Accessibility and Keyboard Navigation

**User Story:** As a user, I want animations to not interfere with keyboard navigation or screen readers, so that the interface remains accessible.

#### Acceptance Criteria

1. WHEN the user navigates with keyboard THEN the System SHALL NOT block focus during animations
2. WHEN animations play THEN the System SHALL NOT prevent form submission or button clicks
3. WHEN the user has `prefers-reduced-motion` enabled THEN the System SHALL disable animations
4. WHEN animations play THEN the System SHALL NOT interfere with screen reader announcements
5. WHEN a row state changes THEN the System SHALL update ARIA attributes for screen readers
6. WHEN animations complete THEN the System SHALL maintain proper tab order and focus management

### Requirement 8: Toast System Consolidation

**User Story:** As a developer, I want a single animation-based feedback system, so that the codebase is simpler and less error-prone.

#### Acceptance Criteria

1. WHEN enrichment actions complete THEN the System SHALL NOT call the general `showToast()` function
2. WHEN enrichment suggestions are confirmed THEN the System SHALL use animation-based feedback only
3. WHEN enrichment suggestions are rejected THEN the System SHALL use animation-based feedback only
4. WHEN the enrichment system is refactored THEN the System SHALL remove all `showToast()` calls from enrichment methods
5. WHEN the toast system is consolidated THEN the System SHALL verify no other code depends on enrichment toasts
6. WHEN the consolidation is complete THEN the System SHALL have a single feedback mechanism for enrichment actions

