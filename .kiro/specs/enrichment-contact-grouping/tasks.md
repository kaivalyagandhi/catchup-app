# Implementation Plan: Enrichment Contact Grouping

## Overview

This implementation plan converts the enrichment contact grouping design into actionable coding tasks. The plan follows a logical progression from backend grouping through frontend modal management, ensuring each step builds on previous work.

## Task List

- [x] 1. Backend Suggestion Grouping
  - [x] 1.1 Modify voice-note-service to group suggestions by contact
    - Update `analyzeForEnrichment()` to group suggestions by `contactHint`
    - Create grouped suggestions structure before emission
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_
  
  - [ ]* 1.2 Write property test for backend grouping
    - **Property 1: Backend Grouping Correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6**
  
  - [x] 1.3 Update enrichment_update event emission
    - Emit one event per contact instead of flat array
    - Include contactId and contactName in event payload
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. WebSocket Message Structure
  - [x] 2.1 Update websocket-handler to preserve contact grouping
    - Modify message structure to include contactId and contactName
    - Validate message structure before sending
    - _Requirements: 7.1, 7.2, 7.5, 7.6_
  
  - [ ]* 2.2 Write property test for message structure validity
    - **Property 7: Message Structure Validity**
    - **Validates: Requirements 7.1, 7.2, 7.5, 7.6**
  
  - [x] 2.3 Add message validation logic
    - Verify contactId is not null/empty
    - Verify contactName is not null/empty
    - Verify suggestions is an array
    - Log errors for invalid messages
    - _Requirements: 7.5, 7.6_

- [x] 3. Frontend Modal State Management
  - [x] 3.1 Add contact modal map to EnrichmentReview class
    - Create `contactModals: Map<string, ModalState>`
    - Define ModalState interface with all required fields
    - _Requirements: 1.1, 1.2, 2.1, 2.2_
  
  - [x] 3.2 Implement getOrCreateContactModal method
    - Check if modal exists for contact
    - Create new modal if needed
    - Return modal state
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.3 Implement addSuggestionToModal method
    - Add suggestion to existing modal
    - Deduplicate suggestions
    - Update modal display
    - _Requirements: 1.2, 5.1, 9.1, 9.2, 9.3_
  
  - [ ]* 3.4 Write property test for modal uniqueness
    - **Property 1: Contact Modal Uniqueness**
    - **Validates: Requirements 1.1, 1.2, 1.6**
  
  - [ ]* 3.5 Write property test for suggestion deduplication
    - **Property 9: Suggestion Deduplication**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [x] 4. Auto-Dismiss Timer Management
  - [x] 4.1 Implement resetAutoRemoveTimer method
    - Clear existing timer if present
    - Start new 10-second timer
    - Remove modal on timer expiration
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 4.2 Implement removeContactModal method
    - Clear timer
    - Remove modal from DOM
    - Remove from contactModals map
    - _Requirements: 2.4, 2.5_
  
  - [ ]* 4.3 Write property test for auto-dismiss timer reset
    - **Property 2: Auto-Dismiss Timer Reset**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.6**

- [x] 5. Modal UI Rendering
  - [x] 5.1 Create contact modal HTML template
    - Header with avatar, name, and close button
    - Scrollable suggestions list
    - Bulk action buttons (Confirm All / Reject All)
    - _Requirements: 1.3, 1.4, 1.5, 4.1, 4.2_
  
  - [x] 5.2 Implement showContactModal method
    - Render modal HTML
    - Append to DOM
    - Apply entrance animation
    - _Requirements: 1.3, 1.4, 1.5_
  
  - [x] 5.3 Add CSS styling for contact modals
    - Modal container and positioning
    - Header styling with avatar
    - Suggestions list styling
    - Action buttons styling
    - Responsive design for mobile
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 5.4 Write property test for modal stack consistency
    - **Property 3: Modal Stack Consistency**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.6**

- [x] 6. Bulk Action Implementation
  - [x] 6.1 Implement confirmAllSuggestions method
    - Mark all suggestions as accepted
    - Update modal display
    - Trigger modal removal
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 6.2 Implement rejectAllSuggestions method
    - Mark all suggestions as rejected
    - Update modal display
    - Trigger modal removal
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 6.3 Add bulk action button event handlers
    - Wire up Confirm All button
    - Wire up Reject All button
    - Prevent duplicate actions
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 6.4 Write property test for bulk action atomicity
    - **Property 4: Bulk Action Atomicity**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 7. Individual Suggestion Management
  - [ ] 7.1 Add checkbox for each suggestion
    - Render checkbox in suggestion item
    - Wire up change event
    - Update suggestion accepted state
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 7.2 Implement inline suggestion editing
    - Add edit button to each suggestion
    - Show input field for editing
    - Validate edited value
    - Update suggestion value
    - _Requirements: 5.4, 5.5_
  
  - [ ] 7.3 Ensure modal stays open during individual actions
    - Don't dismiss modal on individual suggestion changes
    - Keep auto-dismiss timer running
    - _Requirements: 5.6_
  
  - [ ]* 7.4 Write property test for individual suggestion independence
    - **Property 5: Individual Suggestion Independence**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.6**

- [ ] 8. Contact Information Handling
  - [ ] 8.1 Extract contact name from suggestion payload
    - Use contactName from WebSocket message
    - Handle null/empty contact names
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 8.2 Generate contact avatar
    - Use initials from contact name
    - Generate consistent color based on contact ID
    - Handle unknown contacts
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 8.3 Display contact information in modal header
    - Show avatar and name prominently
    - Update on contact information changes
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ]* 8.4 Write property test for contact information accuracy
    - **Property 8: Contact Information Accuracy**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.6**

- [x] 9. Frontend Event Handler Integration
  - [x] 9.1 Update handleEnrichmentUpdate in voice-notes.js
    - Receive grouped suggestions from WebSocket
    - Extract contactId, contactName, suggestions
    - Pass to enrichment review
    - _Requirements: 1.1, 1.2, 6.1, 6.2_
  
  - [x] 9.2 Remove old toast-based enrichment display
    - Remove individual toast creation
    - Remove old addLiveSuggestion calls
    - Clean up old enrichment display logic
    - _Requirements: 1.1, 1.2_
  
  - [x] 9.3 Wire up new modal-based display
    - Call getOrCreateContactModal
    - Call addSuggestionToModal
    - Call showContactModal
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 10. Accessibility and Keyboard Navigation
  - [ ] 10.1 Add keyboard navigation to modals
    - Tab through buttons and checkboxes
    - Enter to activate buttons
    - Escape to close modal
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 10.2 Implement focus management
    - Set focus to first interactive element when modal opens
    - Restore focus when modal closes
    - Manage focus between multiple modals
    - _Requirements: 10.4, 10.5, 10.6_
  
  - [ ] 10.3 Add ARIA attributes
    - Add role="dialog" to modal
    - Add aria-label for modal header
    - Add aria-checked for checkboxes
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ]* 10.4 Write property test for keyboard navigation accessibility
    - **Property 10: Keyboard Navigation Accessibility**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Integration Testing
  - [ ] 12.1 Test full enrichment flow with grouped modals
    - Record voice note with multiple contacts
    - Verify suggestions are grouped by contact
    - Verify modals display correctly
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 12.2 Test multiple contacts with simultaneous suggestions
    - Send suggestions for multiple contacts
    - Verify separate modals are created
    - Verify modals stack correctly
    - _Requirements: 1.4, 3.1, 3.2, 3.3_
  
  - [ ] 12.3 Test auto-dismiss with rapid suggestions
    - Send rapid suggestions for same contact
    - Verify timer resets
    - Verify modal doesn't dismiss prematurely
    - _Requirements: 2.1, 2.2, 2.3, 2.6_
  
  - [ ] 12.4 Test user interactions
    - Test individual suggestion confirm/reject
    - Test bulk confirm/reject
    - Test inline editing
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 12.5 Test keyboard navigation
    - Navigate with Tab key
    - Activate buttons with Enter
    - Close modal with Escape
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 12.6 Test mobile layout
    - Verify modals adapt to small screens
    - Verify stacking works on mobile
    - Verify touch interactions work
    - _Requirements: 3.4, 3.5_

- [ ] 13. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Documentation and Cleanup
  - [ ] 14.1 Update code comments
    - Document modal state management
    - Document auto-dismiss logic
    - Document grouping strategy
    - _Requirements: All_
  
  - [ ] 14.2 Remove old enrichment toast code
    - Remove unused toast methods
    - Remove old enrichment display logic
    - Clean up old CSS
    - _Requirements: 1.1, 1.2_
  
  - [ ] 14.3 Update README or documentation
    - Document new enrichment grouping feature
    - Document modal behavior
    - Document keyboard shortcuts
    - _Requirements: All_

