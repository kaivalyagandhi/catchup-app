# Implementation Plan: Edits UI Redesign

## Overview

This plan breaks down the edits UI redesign into discrete, manageable coding tasks. The implementation follows a bottom-up approach: first building the compact component styles and data structures, then integrating them into the existing edits menu, and finally adding interactivity and polish.

---

## Phase 1: Styling and Layout Foundation

- [x] 1. Create compact CSS variables and base styles
  - Define color palette for edit types (green, red, blue, purple)
  - Define confidence score colors (red, yellow, green)
  - Define spacing variables (8px, 12px, 16px)
  - Define typography scales (11px, 12px, 13px, 14px)
  - Create base classes for compact layout
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Implement contact group header styles
  - Create `.contact-group-header` class with 40px height
  - Add contact avatar styling (24x24px)
  - Add contact name and edit count display
  - Add expansion toggle (chevron icon)
  - Add hover state with bulk action buttons
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 3. Implement compact edit item styles
  - Create `.edit-item-compact` class with 36-44px height
  - Add icon styling (16x16px, color-coded by type)
  - Add value display with truncation
  - Add confidence badge styling (color-coded)
  - Add source badge styling (compact)
  - Add action button styling (icon-only, 24x24px)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Implement confidence indicator styles
  - Create `.confidence-badge` class with color coding
  - Add percentage display (12px, bold)
  - Add hover tooltip styling
  - Add color transitions for different ranges
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Implement source attribution styles
  - Create `.source-badge` class (compact, 11px)
  - Add source type display (Voice, Manual, etc.)
  - Add transcript excerpt styling (italic, truncated)
  - Add expandable details styling
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 6. Implement action button styles
  - Create `.action-btn-accept` and `.action-btn-reject` classes
  - Add icon styling (checkmark, X)
  - Add hover and active states
  - Add disabled state styling
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 7. Implement bulk action button styles
  - Create `.bulk-action-btn` class
  - Add "Accept All" and "Reject All" styling
  - Add hover and active states
  - Add animation on click
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 8. Implement responsive design styles
  - Add media queries for mobile (< 480px)
  - Stack action buttons vertically on mobile
  - Reduce font sizes by 10-15% on mobile
  - Use full-width edit items on mobile
  - Hide source attribution by default on mobile
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

---

## Phase 2: Data Structure and Grouping Logic

- [x] 9. Create contact grouping utility function
  - Implement `groupEditsByContact(edits)` function
  - Return array of `ContactGroup` objects
  - Calculate accepted/rejected counts per group
  - Sort groups by contact name
  - _Requirements: 1.1, 1.2_

- [x] 10. Implement edit state management
  - Create `EditState` enum (pending, accepted, rejected)
  - Add state transition logic
  - Add state persistence to data model
  - Add state change event emission
  - _Requirements: 3.4, 3.5, 3.7_

- [x] 11. Implement confidence score validation
  - Create `validateConfidenceScore(score)` function
  - Clamp scores to 0-1 range
  - Return color code based on score range
  - Add logging for out-of-range scores
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 12. Implement edit count calculation
  - Create `calculateEditCounts(edits)` function
  - Return { total, accepted, rejected }
  - Update counts when edit state changes
  - Verify counts sum correctly
  - _Requirements: 1.3, 1.6_

---

## Phase 3: Component Refactoring

- [x] 13. Refactor EditsMenu to use contact grouping
  - Update `renderPendingEdits()` to group by contact
  - Replace table layout with grouped layout
  - Add contact group headers
  - Add expansion/collapse toggle
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 14. Refactor edit item rendering for compact layout
  - Update `createEditItem()` to use compact layout
  - Use single-line layout for simple edits
  - Use two-line layout for long values
  - Add icon-only action buttons
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 15. Implement contact group expansion/collapse
  - Add click handler to contact group header
  - Toggle `.expanded` class on group
  - Animate chevron rotation
  - Persist expansion state (optional)
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 16. Implement edit state UI updates
  - Update edit item styling when accepted (green background)
  - Update edit item styling when rejected (muted/strikethrough)
  - Add checkmark/X icon to action buttons
  - Update contact group summary on state change
  - _Requirements: 3.4, 3.5, 3.6, 3.7_

---

## Phase 4: Interactivity and Actions

- [x] 17. Implement accept/reject button handlers
  - Add click handler to accept button
  - Add click handler to reject button
  - Update edit state in data model
  - Trigger UI update
  - Emit state change event
  - _Requirements: 3.4, 3.5, 3.8_

- [x] 18. Implement bulk action handlers
  - Add click handler to "Accept All" button
  - Add click handler to "Reject All" button
  - Update all edits in contact group
  - Update contact group summary
  - Add undo functionality (5-second window)
  - _Requirements: 8.2, 8.3, 8.4, 8.6_

- [x] 19. Implement source attribution expansion
  - Add click handler to source badge
  - Show expanded view (tooltip or inline)
  - Display full context and timestamp
  - Add click-outside handler to collapse
  - _Requirements: 7.3, 7.4, 7.5_

- [ ] 20. Implement edit value modification
  - Add click handler to edit value
  - Show inline text input
  - Add Save and Cancel buttons
  - Validate new value on save
  - Display error message on validation failure
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 21. Implement keyboard shortcuts
  - Enter key to save edit value
  - Escape key to cancel edit
  - Tab to navigate between edits
  - _Requirements: 10.6, 10.7_

---

## Phase 5: Polish and Optimization

- [ ] 22. Add hover and focus states
  - Add subtle background highlight on edit item hover
  - Add color change on action button hover
  - Add focus outline for keyboard navigation
  - Add active state animation on button click
  - _Requirements: 4.5, 4.6_

- [ ] 23. Add animations and transitions
  - Add 200-300ms transition for state changes
  - Add smooth expansion/collapse animation
  - Add fade-in animation for new edits
  - Add scale animation for bulk actions
  - _Requirements: 4.8_

- [ ] 24. Implement sticky contact headers
  - Make contact group headers sticky when scrolling
  - Maintain context while scrolling through edits
  - Add subtle shadow to sticky header
  - _Requirements: 5.6_

- [ ] 25. Optimize performance
  - Use event delegation for edit item interactions
  - Minimize DOM reflows during state changes
  - Debounce rapid state changes
  - Use CSS transforms for animations
  - _Requirements: 5.1, 5.2_

---

## Phase 6: Testing

- [ ]* 26. Write unit tests for grouping logic
  - Test `groupEditsByContact()` with various inputs
  - Test count calculations
  - Test state transitions
  - **Property 1: Contact Grouping Consistency**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 27. Write unit tests for confidence scoring
  - Test confidence score validation
  - Test color coding for all ranges
  - Test out-of-range handling
  - **Property 4: Confidence Score Validity**
  - **Validates: Requirements 6.2, 6.3, 6.4**

- [ ]* 28. Write property tests for edit state management
  - Generate random accept/reject sequences
  - Verify state persistence
  - Verify UI updates match state
  - **Property 3: Accept/Reject State Persistence**
  - **Validates: Requirements 3.4, 3.5, 3.8**

- [ ]* 29. Write property tests for bulk actions
  - Generate random bulk action sequences
  - Verify all edits in group have same state
  - Verify atomicity (all or nothing)
  - **Property 5: Bulk Action Atomicity**
  - **Validates: Requirements 8.2, 8.3**

- [ ]* 30. Write integration tests for full flow
  - Test create edits → group → accept/reject → verify
  - Test navigation from edit items
  - Test source attribution expansion
  - Test edit modification with validation
  - **Property 2: Edit Count Accuracy**
  - **Validates: Requirements 1.3, 1.6**

- [ ]* 31. Write responsive design tests
  - Test layout on various viewport sizes
  - Verify button stacking on mobile
  - Verify no horizontal scrolling
  - **Property 8: Responsive Stacking**
  - **Validates: Requirements 9.1, 9.6**

---

## Phase 7: Integration and Verification

- [ ] 32. Integrate with existing EditsMenu component
  - Update EditsMenu to use new compact layout
  - Ensure backward compatibility with existing data
  - Test with real pending edits data
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 33. Verify space efficiency improvements
  - Measure layout height for various edit counts
  - Compare with previous design
  - Verify 40-50% space reduction
  - _Requirements: 5.1, 5.2, 5.5_

- [ ] 34. Test accessibility
  - Verify keyboard navigation works
  - Verify screen reader compatibility
  - Verify color contrast meets WCAG standards
  - Add ARIA labels to interactive elements
  - _Requirements: 4.1, 4.2_

- [ ] 35. Test cross-browser compatibility
  - Test on Chrome, Firefox, Safari, Edge
  - Verify CSS animations work correctly
  - Verify responsive design on all browsers
  - _Requirements: 4.1, 4.8_

- [ ] 36. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 8: Documentation and Cleanup

- [ ]* 37. Update component documentation
  - Document new compact layout structure
  - Document CSS variables and classes
  - Document data structures and interfaces
  - Add usage examples

- [ ]* 38. Update user-facing documentation
  - Document new UI features
  - Add screenshots of new layout
  - Document keyboard shortcuts
  - Add troubleshooting guide

- [ ]* 39. Clean up old CSS and code
  - Remove old table-based styles
  - Remove unused CSS classes
  - Remove deprecated functions
  - Update imports and references

---

## Notes

- All styling should use CSS custom properties for maintainability
- Use semantic HTML for accessibility
- Maintain backward compatibility with existing data structures
- Test on mobile devices early and often
- Consider performance implications of animations
- Use event delegation to minimize DOM listeners

</content>
</invoke>