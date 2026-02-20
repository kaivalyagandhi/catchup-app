# Implementation Plan: Onboarding Flow Improvements

## Overview

This implementation plan covers the improvements to the CatchUp contact onboarding flow, including removing Smart Batching, adding contact search in AI Quick Start, implementing archive in Quick Refine, and adding a mode toggle with manual CircleListView.

## Tasks

- [x] 1. Remove Smart Batching from onboarding flow
  - [x] 1.1 Remove `startBatchSuggestionsFlow()` method from step2-circles-handler.js
    - Delete the entire `startBatchSuggestionsFlow()` method
    - Remove batch-related imports and references
    - _Requirements: 1.1, 1.4_
  
  - [x] 1.2 Update `handleQuickStartComplete()` to skip directly to Quick Refine
    - Modify to call `startQuickRefineFlow()` directly instead of `startBatchSuggestionsFlow()`
    - _Requirements: 1.2_
  
  - [x] 1.3 Update step indicators to show 2 steps instead of 3
    - Change header text from "Step X of 3" to "Step X of 2"
    - Update step numbering throughout the flow
    - _Requirements: 1.3, 1.7_
  
  - [x] 1.4 Remove Smart Batching education tip content
    - Remove batching-related content from `getEducationContent()` method
    - Update education tip in Quick Start to not reference batching
    - _Requirements: 1.5_

- [x] 2. Checkpoint - Verify Smart Batching removal
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Add Inner Circle capacity check and skip logic
  - [x] 3.1 Add `checkInnerCircleCapacity()` method to step2-circles-handler.js
    - Fetch circle counts from `/api/contacts/circle-counts` endpoint
    - Return object with count, capacity, isFull, and remaining properties
    - _Requirements: 3.1_
  
  - [x] 3.2 Add API endpoint for circle counts (if not exists)
    - Create GET `/api/contacts/circle-counts` endpoint
    - Return counts for all four circles
    - _Requirements: 3.1_
  
  - [x] 3.3 Update `openManageCirclesFlow()` to check capacity and skip AI Quick Start
    - Call `checkInnerCircleCapacity()` before starting flow
    - If Inner Circle >= 10, show notification and skip to Quick Refine
    - If Inner Circle 8-9, pass remaining capacity to Quick Start
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 4. Add contact search functionality to AI Quick Start
  - [x] 4.1 Create ContactSearchModal component
    - Create new file `public/js/contact-search-modal.js`
    - Implement search input with 300ms debounce
    - Implement contact list with checkboxes
    - Implement capacity indicator display
    - Implement selection management
    - _Requirements: 2.2, 2.3, 2.4, 2.6, 2.7_
  
  - [x] 4.2 Add "Search & Add More" button to quick-start-flow.js
    - Add button to `renderActions()` method
    - Implement `handleSearchAddMore()` method
    - Implement `addContactsToSuggestions()` method
    - _Requirements: 2.1, 2.8_
  
  - [x] 4.3 Implement search filtering and exclusion logic
    - Filter contacts by name (case-insensitive)
    - Exclude contacts already in AI suggestions
    - Enforce capacity limit on selections
    - _Requirements: 2.4, 2.9, 2.11_
  
  - [x] 4.4 Add CSS styles for ContactSearchModal
    - Add styles to `public/css/onboarding.css` or create new file
    - Ensure mobile responsiveness (viewport >= 320px)
    - _Requirements: 8.1_

- [x] 5. Checkpoint - Verify AI Quick Start improvements
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add archive functionality to Quick Refine
  - [x] 6.1 Add Archive button to quick-refine-card.js
    - Add Archive button to `renderCard()` method
    - Style button distinctly from circle buttons (gray/red color)
    - Ensure minimum 44x44px tap target
    - _Requirements: 4.1, 4.2, 8.2_
  
  - [x] 6.2 Implement `handleArchive()` method
    - Call POST `/api/contacts/:id/archive` endpoint
    - Store archived contact for undo
    - Move to next contact after archive
    - Update remaining count
    - _Requirements: 4.3, 4.4, 4.9_
  
  - [x] 6.3 Implement undo functionality for archive
    - Show toast with undo button (5-second window)
    - Implement `handleUndoArchive()` method
    - Call POST `/api/contacts/:id/restore` endpoint on undo
    - Return to archived contact's position on undo
    - _Requirements: 4.5, 4.6, 4.7_
  
  - [x] 6.4 Add keyboard shortcut "A" for archive
    - Add "A" key handler to `attachKeyboardListeners()`
    - _Requirements: 4.8_
  
  - [x] 6.5 Add swipe gesture for archive on touch devices
    - Implement swipe-up or swipe-down gesture for archive
    - _Requirements: 8.5_

- [x] 7. Checkpoint - Verify archive functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create Mode Toggle component
  - [x] 8.1 Create ModeToggle component
    - Create new file `public/js/mode-toggle.js`
    - Implement segmented control UI with "AI-Assisted" and "Manual" options
    - Implement mode switching logic
    - Implement localStorage persistence
    - _Requirements: 6.1, 6.2, 6.3, 6.6_
  
  - [x] 8.2 Add CSS styles for ModeToggle
    - Style as pill/segmented control
    - Ensure keyboard accessibility
    - Ensure mobile responsiveness
    - _Requirements: 6.7, 6.9, 8.3_

- [x] 9. Create CircleListView component for Manual Mode
  - [x] 9.1 Create CircleListView component
    - Create new file `public/js/circle-list-view.js`
    - Implement search bar at top
    - Implement circle sections with contact chips
    - Implement remove (×) buttons on contacts
    - Implement quick-assign buttons in search results
    - Implement uncategorized section
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [x] 9.2 Implement contact move and remove functionality
    - Implement `moveContact()` method to change circle
    - Implement `removeFromCircle()` method to uncategorize
    - Call existing circle assignment API
    - _Requirements: 5.4_
  
  - [x] 9.3 Add CSS styles for CircleListView
    - Style contact chips with remove buttons
    - Style circle sections with capacity indicators
    - Ensure single-column layout on mobile
    - _Requirements: 8.4_

- [x] 10. Integrate Mode Toggle and CircleListView into flow
  - [x] 10.1 Add mode toggle to circle management modal header
    - Render ModeToggle at top of modal in step2-circles-handler.js
    - Handle mode change events
    - _Requirements: 6.1_
  
  - [x] 10.2 Implement mode switching logic
    - When "Manual" selected, render CircleListView
    - When "AI-Assisted" selected, render AI Quick Start flow
    - Preserve progress when switching modes
    - _Requirements: 6.4, 6.5, 6.8_
  
  - [x] 10.3 Add "Switch to Manual Mode" link in AI-assisted flow
    - Add link at each step of AI flow
    - Handle click to switch mode toggle
    - _Requirements: 5.11_

- [x] 11. Update progress indicators
  - [x] 11.1 Update step indicator to be dynamic
    - Show step names instead of just numbers
    - Highlight current step
    - Show checkmark for completed steps
    - _Requirements: 7.1, 7.4, 7.5, 7.6_
  
  - [x] 11.2 Handle skipped steps in indicator
    - When AI Quick Start is skipped, update indicator
    - Dynamically adjust based on user's path
    - _Requirements: 7.2, 7.3, 7.7_

- [x] 12. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Test full flow: AI-Assisted mode with search, archive, and mode switching
  - Test Manual mode with CircleListView
  - Test Inner Circle capacity skip logic

## Notes

- Tasks build incrementally - each checkpoint verifies the previous work
- Smart Batching removal is done first to simplify the flow before adding new features
- The CircleListView replaces the old ManageCirclesFlow grid for a cleaner experience
- Mode preference is stored in localStorage for persistence across sessions
