# Implementation Plan: Enrichment Animation Enhancements

## Overview

This plan breaks down the enrichment animation enhancements into discrete, manageable coding tasks. The implementation integrates into the existing edits-ui-redesign Phase 5 (Polish and Optimization) as an expansion of Task 23.

---

## Phase 1: CSS Foundation and Animation Variables

- [ ] 1. Add animation timing CSS variables
  - Define `--animation-fast: 200ms` for state changes
  - Define `--animation-normal: 300ms` for entrance/exit
  - Define `--animation-slow: 400ms` for row entrance
  - Define `--animation-loading: 600ms` for spinner
  - Add to `:root` in `public/css/edits.css`
  - _Requirements: 5.1, 5.2_

- [ ] 2. Add animation easing CSS variables
  - Define `--ease-in: ease-in`
  - Define `--ease-out: ease-out`
  - Define `--ease-in-out: ease-in-out`
  - Define `--ease-linear: linear`
  - Add to `:root` in `public/css/edits.css`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 3. Add animation keyframes to enrichment-review.js styles
  - Create `@keyframes slideInFromBottom` for toast entrance
  - Create `@keyframes slideOutToBottom` for toast exit
  - Create `@keyframes slideInFromLeft` for row entrance
  - Create `@keyframes acceptPulse` for accept state
  - Create `@keyframes rejectPulse` for reject state
  - Create `@keyframes spin` for loading spinner
  - Create `@keyframes successFadeIn` for success state
  - _Requirements: 1.1, 1.4, 2.1, 3.1, 3.2, 4.1, 4.4_

---

## Phase 2: Live Toast Animation Enhancement

- [ ] 4. Enhance toast entrance animation
  - Update `.enrichment-toast` base styles
  - Add initial state: `opacity: 0; transform: translateY(20px);`
  - Add transition: `all 300ms ease-out`
  - Update `.enrichment-toast.visible` to: `opacity: 1; transform: translateY(0);`
  - Test animation timing and smoothness
  - _Requirements: 1.1, 5.1, 5.3_

- [ ] 5. Implement toast success state animation
  - Add `.enrichment-toast.success` class styles
  - Set background to green (#f0fdf4)
  - Hide message content
  - Show checkmark icon (✓) centered
  - Add 200ms hold before exit
  - Update `confirmToastSuggestion()` to add success class
  - _Requirements: 1.2, 3.1, 4.1_

- [ ] 6. Implement toast reject state animation
  - Add `.enrichment-toast.rejected` class styles
  - Set background to gray (#fafafa)
  - Hide message content
  - Show X icon (✗) centered
  - Add 200ms hold before exit
  - Update `rejectToastSuggestion()` to add rejected class
  - _Requirements: 1.3, 3.2, 4.1_

- [ ] 7. Implement toast exit animation
  - Add `.enrichment-toast.exiting` class styles
  - Set `opacity: 0; transform: translateY(20px);`
  - Update `removeToast()` to add exiting class
  - Wait for animation to complete before removing DOM
  - _Requirements: 1.4, 5.1, 5.3_

- [ ] 8. Remove general toast calls from enrichment methods
  - Remove `showToast()` call from `confirmToastSuggestion()`
  - Remove `showToast()` call from `rejectToastSuggestion()`
  - Verify no other enrichment methods call `showToast()`
  - Test that no toasts appear after confirm/reject
  - _Requirements: 1.5, 1.7, 8.1, 8.2, 8.3_

---

## Phase 3: Pending Edits Page Row Animations

- [ ] 9. Add row entrance animation to render method
  - Update `render()` method to add animation classes to rows
  - Add `.enrichment-item` base class with animation
  - Calculate stagger delay based on row index
  - Apply inline `animation-delay` style to each row
  - Test stagger timing (50-100ms between rows)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 10. Implement row entrance keyframes
  - Create `@keyframes slideInLeft` animation
  - Start: `opacity: 0; transform: translateX(-20px);`
  - End: `opacity: 1; transform: translateX(0);`
  - Duration: 400ms
  - Easing: ease-out
  - Apply to `.enrichment-item` class
  - _Requirements: 2.1, 2.5, 2.6_

- [ ] 11. Verify animation performance
  - Test row entrance on page with 10+ rows
  - Verify no layout shifts (transform/opacity only)
  - Measure frame rate during animation
  - Verify 60fps on desktop, 30fps minimum on mobile
  - _Requirements: 2.5, 5.5, 5.6, 5.7_

---

## Phase 4: Accept/Reject State Change Animations

- [ ] 12. Implement accept state animation
  - Add `.enrichment-item.accepted` animation
  - Create `@keyframes acceptPulse` keyframes
  - Duration: 300ms
  - Easing: ease-out
  - Color transition: white → light green → final green
  - Update `toggleItem()` to trigger animation
  - _Requirements: 3.1, 3.3, 5.1, 5.3_

- [ ] 13. Implement reject state animation
  - Add `.enrichment-item.rejected` animation
  - Create `@keyframes rejectPulse` keyframes
  - Duration: 300ms
  - Easing: ease-out
  - Color transition: white → light gray → final gray
  - Update `toggleItem()` to trigger animation
  - _Requirements: 3.2, 3.3, 5.1, 5.3_

- [ ] 14. Implement bulk accept animation
  - Update `acceptAll()` method
  - Apply animation to all rows simultaneously (no stagger)
  - Update contact group summary with animation
  - Verify all rows reach final state at same time
  - _Requirements: 3.4, 3.6, 4.2_

- [ ] 15. Implement bulk reject animation
  - Update `rejectAll()` method
  - Apply animation to all rows simultaneously (no stagger)
  - Update contact group summary with animation
  - Verify all rows reach final state at same time
  - _Requirements: 3.5, 3.6, 4.2_

- [ ] 16. Verify state animation atomicity
  - Test that animations complete without interruption
  - Test that final visual state matches data state
  - Test rapid state changes (accept then reject)
  - Verify no visual glitches or incomplete animations
  - _Requirements: 3.7, 5.3_

---

## Phase 5: Apply Action Loading and Success Animation

- [ ] 17. Implement apply button loading state
  - Add `.btn-primary.loading` class styles
  - Create `@keyframes spin` for spinner rotation
  - Show spinner icon during processing
  - Disable button during loading
  - Duration: 600ms rotation cycle
  - _Requirements: 4.1, 4.2, 5.1_

- [ ] 18. Implement row exit animation during apply
  - Create `@keyframes slideOutRight` for row exit
  - Add `.enrichment-item.exiting` class
  - Animate rows out as they're applied
  - Duration: 300ms per row
  - Easing: ease-in
  - _Requirements: 4.3, 5.1, 5.3_

- [ ] 19. Implement apply success state animation
  - Create `@keyframes successFadeIn` for success state
  - Show checkmark icon with fade-in
  - Hold success state for 500-1000ms
  - Fade out and remove from DOM
  - Update `applySelected()` method
  - _Requirements: 4.4, 4.5, 4.6_

- [ ] 20. Implement apply error state handling
  - Restore button to normal state on error
  - Show error feedback (animation-based or inline)
  - Verify button is re-enabled for retry
  - _Requirements: 4.7_

- [ ] 21. Remove general toast from apply method
  - Remove `showToast()` call from `applySelected()`
  - Verify success/error feedback uses animations only
  - Test that no toasts appear during apply
  - _Requirements: 8.1, 8.4_

---

## Phase 6: Accessibility and Performance

- [ ] 22. Implement prefers-reduced-motion support
  - Add media query: `@media (prefers-reduced-motion: reduce)`
  - Disable all animations when preference is set
  - Use instant transitions instead
  - Test with `prefers-reduced-motion` enabled
  - _Requirements: 5.6, 7.3, 7.4_

- [ ] 23. Verify keyboard navigation during animations
  - Test tab navigation during toast animation
  - Test button clicks during row animation
  - Test form submission during apply animation
  - Verify focus management is not affected
  - _Requirements: 7.1, 7.2_

- [ ] 24. Verify screen reader compatibility
  - Test ARIA attributes during animations
  - Verify announcements are not interrupted
  - Test with screen reader enabled
  - Update ARIA attributes for state changes
  - _Requirements: 7.4, 7.5_

- [ ] 25. Optimize animation performance
  - Use CSS transforms only (no layout properties)
  - Use opacity for fade effects
  - Avoid JavaScript animation loops
  - Test on low-end mobile devices
  - _Requirements: 5.3, 5.4, 5.5, 5.7_

---

## Phase 7: Testing

- [ ]* 26. Write unit tests for animation timing
  - Test stagger delay calculations
  - Test animation duration values
  - Test CSS variable definitions
  - **Property 2: Row Entrance Stagger Consistency**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [ ]* 27. Write property tests for animation sequences
  - Generate random toast sequences and verify order
  - Verify no overlapping animations
  - Verify animation completion
  - **Property 1: Toast Animation Sequence Completeness**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ]* 28. Write property tests for state change animations
  - Generate random state changes and verify atomicity
  - Verify final state matches data state
  - Verify animation completes without interruption
  - **Property 3: State Change Animation Atomicity**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

- [ ]* 29. Write property tests for bulk actions
  - Generate random bulk action sequences
  - Verify all rows animate simultaneously
  - Verify all rows reach final state at same time
  - **Property 4: Bulk Action Synchronization**
  - **Validates: Requirements 3.4, 3.5, 3.6**

- [ ]* 30. Write property tests for apply action
  - Generate random apply sequences
  - Verify state progression: normal → loading → success/error
  - Verify button returns to normal state
  - **Property 5: Apply Action State Progression**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

- [ ]* 31. Write performance tests for animations
  - Measure frame rate during animations
  - Verify 60fps on desktop, 30fps minimum on mobile
  - Verify no layout shifts
  - **Property 6: Animation Performance Consistency**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

- [ ]* 32. Write accessibility tests
  - Test with `prefers-reduced-motion` enabled
  - Test keyboard navigation during animations
  - Test screen reader compatibility
  - **Property 7: Reduced Motion Respect**
  - **Validates: Requirements 5.6, 7.3, 7.4**

- [ ]* 33. Write integration tests for toast consolidation
  - Verify no `showToast()` calls in enrichment methods
  - Verify animation-based feedback only
  - Test full enrichment flow with animations
  - **Property 8: Toast System Consolidation**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

---

## Phase 8: Integration and Verification

- [ ] 34. Integrate animations with edits-ui-redesign
  - Verify animations work with compact layout
  - Test with contact grouping
  - Test with confidence indicators
  - Test with source attribution
  - _Requirements: All_

- [ ] 35. Test animations in dark mode
  - Verify colors are appropriate in dark mode
  - Test contrast ratios meet accessibility standards
  - Verify animations are visible in dark mode
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 36. Test animations on mobile devices
  - Test on iOS Safari
  - Test on Android Chrome
  - Verify touch interactions work during animations
  - Verify 30fps minimum performance
  - _Requirements: 5.7, 7.1, 7.2_

- [ ] 37. Test animations on low-end devices
  - Test on older browsers
  - Test on low-end mobile devices
  - Verify graceful degradation
  - Verify functionality without animations
  - _Requirements: 5.5, 5.7_

- [ ] 38. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 9: Documentation and Cleanup

- [ ]* 39. Update component documentation
  - Document animation classes and keyframes
  - Document CSS variables for animations
  - Document animation timing specifications
  - Add usage examples

- [ ]* 40. Update user-facing documentation
  - Document animation behavior
  - Add screenshots of animations
  - Document accessibility features
  - Add troubleshooting guide

- [ ]* 41. Clean up old toast system code
  - Remove unused toast-related code
  - Remove old animation styles
  - Update imports and references
  - Verify no dead code remains

---

## Notes

- All animations use CSS keyframes and transitions (no JavaScript libraries)
- Use `transform` and `opacity` only for GPU acceleration
- Respect `prefers-reduced-motion` for accessibility
- Test on multiple devices and browsers
- Verify animations don't cause layout shifts
- Maintain backward compatibility with existing functionality
- Use CSS custom properties for maintainability

