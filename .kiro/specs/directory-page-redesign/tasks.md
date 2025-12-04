# Implementation Plan

- [x] 1. Set up Directory page structure and navigation
  - Create new directory.html page or update existing index.html with Directory section
  - Implement tab navigation component (Contacts, Circles, Groups, Tags)
  - Add URL hash routing for tab persistence
  - Style tab sections with modern, clean design
  - _Requirements: 7.1, 7.6_

- [x] 2. Implement ContactsTable component with basic rendering
  - [x] 2.1 Create ContactsTable class with table structure
    - Define table columns: Name, Phone, Email, Location, Timezone, Frequency, Circle, Tags, Groups, Source, Actions
    - Implement basic table rendering with sample data
    - Apply compact spacing and modern styling
    - _Requirements: 1.1, 1.3, 8.1_

  - [ ]* 2.2 Write property test for contact metadata visibility
    - **Property 1: All contact metadata visible without interaction**
    - **Validates: Requirements 1.2**

  - [x] 2.3 Implement source badge rendering
    - Add Google badge for contacts with source='google'
    - Style badge with appropriate colors and icon
    - _Requirements: 1.4_

  - [ ]* 2.4 Write property test for Google source badge display
    - **Property 2: Google source badge display**
    - **Validates: Requirements 1.4**

  - [x] 2.5 Implement tags and groups badge rendering
    - Render tag badges in Tags column
    - Render group badges in Groups column
    - Apply compact badge styling
    - _Requirements: 1.5_

  - [ ]* 2.6 Write property test for tags and groups badge rendering
    - **Property 3: Tags and groups badge rendering**
    - **Validates: Requirements 1.5**

- [x] 3. Implement inline editing functionality
  - [x] 3.1 Create InlineEditCell component
    - Implement click-to-edit behavior
    - Support text, email, phone, dropdown, and multi-select input types
    - Add validation for each input type
    - _Requirements: 2.1_

  - [ ]* 3.2 Write property test for editable cell conversion
    - **Property 4: Editable cell conversion**
    - **Validates: Requirements 2.1**

  - [x] 3.3 Implement save and revert logic
    - Add optimistic UI updates
    - Implement API calls for saving edits
    - Add error handling with revert on failure
    - Display error notifications
    - _Requirements: 2.2, 2.3_

  - [ ]* 3.4 Write property test for inline edit persistence
    - **Property 5: Inline edit persistence**
    - **Validates: Requirements 2.2**

  - [ ]* 3.5 Write property test for edit failure reversion
    - **Property 6: Edit failure reversion**
    - **Validates: Requirements 2.3**

  - [x] 3.6 Implement autocomplete for tags and groups
    - Add autocomplete dropdown for tags cell
    - Add autocomplete dropdown for groups cell
    - Fetch existing tags/groups for suggestions
    - _Requirements: 2.4_

  - [ ]* 3.7 Write property test for autocomplete functionality
    - **Property 7: Autocomplete for tags and groups**
    - **Validates: Requirements 2.4**

  - [x] 3.8 Implement Escape key cancellation
    - Add keyboard event listener for Escape key
    - Cancel edit and restore original value
    - _Requirements: 2.5_

  - [ ]* 3.9 Write property test for Escape key cancellation
    - **Property 8: Escape key cancellation**
    - **Validates: Requirements 2.5**

- [x] 4. Implement A-Z scrollbar navigation
  - [x] 4.1 Create AZScrollbar component
    - Render vertical A-Z letter list
    - Position fixed on right side of table
    - Show only letters that have contacts
    - Hide when <20 contacts
    - _Requirements: 3.1, 3.5_

  - [x] 4.2 Implement letter click navigation
    - Add click handlers for each letter
    - Scroll to first contact with that letter
    - Implement fallback to next available letter
    - Add smooth scroll animation
    - _Requirements: 3.2, 3.3_

  - [ ]* 4.3 Write property test for A-Z letter navigation
    - **Property 9: A-Z scrollbar letter navigation**
    - **Validates: Requirements 3.2**

  - [ ]* 4.4 Write property test for A-Z fallback navigation
    - **Property 10: A-Z scrollbar fallback navigation**
    - **Validates: Requirements 3.3**

  - [x] 4.5 Implement scroll-based highlighting
    - Add scroll event listener
    - Highlight current letter range based on visible contacts
    - _Requirements: 3.4_

  - [ ]* 4.6 Write property test for A-Z scrollbar highlighting
    - **Property 11: A-Z scrollbar highlighting**
    - **Validates: Requirements 3.4**

- [x] 5. Implement search and filtering functionality
  - [x] 5.1 Create SearchFilterBar component
    - Add search input field
    - Implement real-time filtering
    - Add clear filters button
    - _Requirements: 4.1, 4.6_

  - [ ]* 5.2 Write property test for text search filtering
    - **Property 12: Text search filtering**
    - **Validates: Requirements 4.1**

  - [x] 5.3 Implement filter query parsing
    - Parse "tag:X" syntax
    - Parse "group:X" syntax
    - Parse "source:X" syntax
    - Parse "circle:X" syntax (inner, close, active, casual, acquaintance)
    - Parse "location:X" syntax
    - Support multiple filters with AND logic
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 8.4_

  - [ ]* 5.4 Write property test for tag filter application
    - **Property 13: Tag filter application**
    - **Validates: Requirements 4.2**

  - [ ]* 5.5 Write property test for group filter application
    - **Property 14: Group filter application**
    - **Validates: Requirements 4.3**

  - [ ]* 5.6 Write property test for source filter application
    - **Property 15: Source filter application**
    - **Validates: Requirements 4.4**

  - [ ]* 5.7 Write property test for combined filter AND logic
    - **Property 16: Combined filter AND logic**
    - **Validates: Requirements 4.5**

  - [ ]* 5.8 Write property test for search clear restoration
    - **Property 17: Search clear restoration**
    - **Validates: Requirements 4.6**

  - [x] 5.9 Implement autocomplete suggestions for filters
    - Show filter syntax suggestions as user types
    - Display available tags, groups, sources
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 6. Implement add contact functionality
  - [x] 6.1 Add "Add Contact" button
    - Create button with appropriate styling
    - Position above contacts table
    - _Requirements: 5.1_

  - [x] 6.2 Implement new contact row insertion
    - Insert editable row at top of table
    - Pre-fill with empty values
    - Focus on name field
    - _Requirements: 5.1_

  - [x] 6.3 Implement save and cancel for new contacts
    - Add Save and Cancel buttons in new row
    - Validate required fields (name)
    - Create contact via API on save
    - Remove row on cancel
    - _Requirements: 5.2, 5.4, 5.5_

  - [ ]* 6.4 Write property test for new contact save and creation
    - **Property 18: New contact save and creation**
    - **Validates: Requirements 5.2**

  - [x] 6.5 Implement automatic sorting after save
    - Sort new contact into table based on current sort order
    - _Requirements: 5.3_

  - [ ]* 6.6 Write property test for new contact sort insertion
    - **Property 19: New contact sort insertion**
    - **Validates: Requirements 5.3**

- [x] 7. Implement sorting functionality
  - [x] 7.1 Add sort controls
    - Add dropdown for sort order selection (Alphabetical, Recently Added, Recently Met)
    - Set default to Alphabetical
    - _Requirements: 6.1_

  - [x] 7.2 Implement sort order logic
    - Implement alphabetical sort by name
    - Implement Recently Added sort by createdAt
    - Implement Recently Met sort by lastInteractionAt
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 7.3 Write property test for Recently Added sort order
    - **Property 20: Recently Added sort order**
    - **Validates: Requirements 6.2**

  - [ ]* 7.4 Write property test for Recently Met sort order
    - **Property 21: Recently Met sort order**
    - **Validates: Requirements 6.3**

  - [x] 7.5 Implement column header sorting
    - Make column headers clickable
    - Toggle between ascending/descending on click
    - Add visual indicators (arrows)
    - _Requirements: 6.4_

  - [ ]* 7.6 Write property test for column header sort toggle
    - **Property 22: Column header sort toggle**
    - **Validates: Requirements 6.4**

  - [x] 7.7 Implement sort order persistence
    - Save sort order to sessionStorage
    - Restore on page load and after operations
    - _Requirements: 6.5_

  - [ ]* 7.8 Write property test for sort order persistence
    - **Property 23: Sort order persistence**
    - **Validates: Requirements 6.5**

- [x] 8. Checkpoint - Ensure contacts table is fully functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement tab navigation and state management
  - [x] 9.1 Implement tab switching logic
    - Add click handlers for tab buttons
    - Show/hide appropriate tables
    - Update active tab styling
    - _Requirements: 7.2, 7.3_

  - [ ]* 9.2 Write property test for tab switching visibility
    - **Property 24: Tab switching visibility**
    - **Validates: Requirements 7.2, 7.3**

  - [x] 9.3 Implement per-tab filter state preservation
    - Store filter state separately for each tab
    - Restore filter state when switching back to tab
    - _Requirements: 7.4_

  - [ ]* 9.4 Write property test for tab filter state preservation
    - **Property 25: Tab filter state preservation**
    - **Validates: Requirements 7.4**

  - [x] 9.5 Implement URL hash synchronization
    - Update URL hash on tab change
    - Parse hash on page load to restore tab
    - Prevent page reload on hash change
    - _Requirements: 7.5_

  - [ ]* 9.6 Write property test for tab URL hash synchronization
    - **Property 26: Tab URL hash synchronization**
    - **Validates: Requirements 7.5**

- [x] 10. Implement GroupsTable component
  - [x] 10.1 Create GroupsTable class
    - Define table columns: Name, Description, Contact Count, Actions
    - Implement basic table rendering
    - Apply consistent styling with ContactsTable
    - _Requirements: 13.1_

  - [x] 10.2 Implement expandable rows
    - Add expand/collapse icon in Contact Count column
    - Show member contacts when expanded
    - Hide member contacts when collapsed
    - _Requirements: 13.2_

  - [ ]* 10.3 Write property test for group row expansion
    - **Property 27: Group row expansion**
    - **Validates: Requirements 13.2**

  - [x] 10.4 Implement inline editing for groups
    - Enable inline editing for Name and Description columns
    - Use InlineEditCell component
    - Save changes via API
    - _Requirements: 13.3_

  - [ ]* 10.5 Write property test for group name inline edit
    - **Property 28: Group name inline edit**
    - **Validates: Requirements 13.3**

  - [x] 10.6 Implement add group functionality
    - Add "Add Group" button
    - Insert new editable row
    - Save new group via API
    - _Requirements: 13.4_

  - [x] 10.7 Implement group deletion
    - Add delete button in Actions column
    - Confirm deletion with user
    - Remove group and unassign from contacts
    - _Requirements: 13.5_

  - [ ]* 10.8 Write property test for group deletion cascade
    - **Property 29: Group deletion cascade**
    - **Validates: Requirements 13.5**

- [x] 11. Implement TagsTable component
  - [x] 11.1 Create TagsTable class
    - Define table columns: Name, Contact Count, Source, Actions
    - Implement basic table rendering
    - Apply consistent styling
    - _Requirements: 14.1_

  - [x] 11.2 Implement inline editing for tags
    - Enable inline editing for Name column
    - Update tag name for all associated contacts
    - _Requirements: 14.2_

  - [ ]* 11.3 Write property test for tag name global update
    - **Property 30: Tag name global update**
    - **Validates: Requirements 14.2**

  - [x] 11.4 Implement add tag functionality
    - Add "Add Tag" button
    - Insert new editable row
    - Save new tag via API
    - _Requirements: 14.3_

  - [x] 11.5 Implement tag deletion
    - Add delete button in Actions column
    - Confirm deletion with user
    - Remove tag from all associated contacts
    - _Requirements: 14.4_

  - [ ]* 11.6 Write property test for tag deletion cascade
    - **Property 31: Tag deletion cascade**
    - **Validates: Requirements 14.4**

  - [x] 11.7 Implement AI/voice source badge
    - Display badge for tags with source "ai" or "voice"
    - Style badge to indicate automated source
    - _Requirements: 14.5_

  - [ ]* 11.8 Write property test for AI/voice tag badge display
    - **Property 32: AI/voice tag badge display**
    - **Validates: Requirements 14.5**

- [x] 12. Integrate Google Contacts Mappings Review
  - [x] 12.1 Implement red dot indicator on Groups tab
    - Check for pending mappings on page load
    - Display red dot badge on Groups tab header
    - Update indicator when mappings change
    - _Requirements: 15.1_

  - [ ]* 12.2 Write property test for Google mappings red dot indicator
    - **Property 33: Google mappings red dot indicator**
    - **Validates: Requirements 15.1**

  - [x] 12.3 Integrate GoogleMappingsReview component
    - Position above groups table
    - Show only when mappings pending and Groups tab active
    - Use existing GoogleMappingsReview component
    - _Requirements: 15.2, 15.4_

  - [ ]* 12.4 Write property test for Google mappings review UI visibility
    - **Property 34: Google mappings review UI visibility**
    - **Validates: Requirements 15.2**

  - [x] 12.5 Implement mapping completion handling
    - Remove red dot when all mappings reviewed
    - Hide review UI when no mappings pending
    - _Requirements: 15.3, 15.4_

  - [ ]* 12.6 Write property test for mapping completion indicator removal
    - **Property 35: Mapping completion indicator removal**
    - **Validates: Requirements 15.3**

  - [x] 12.7 Implement immediate table updates on mapping actions
    - Refresh groups table after approve/reject
    - Update contact counts
    - _Requirements: 15.5_

  - [ ]* 12.8 Write property test for mapping action immediate update
    - **Property 36: Mapping action immediate update**
    - **Validates: Requirements 15.5**

- [x] 13. Checkpoint - Ensure all tables and integrations work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement modern UI styling
  - [x] 14.1 Apply clean, minimalist design
    - Use ample whitespace
    - Apply subtle borders
    - Use clear typography
    - _Requirements: 16.1, 16.2_

  - [x] 14.2 Implement row hover effects
    - Add hover state styling for all table rows
    - Use subtle background color change
    - _Requirements: 16.3_

  - [ ]* 14.3 Write property test for row hover highlighting
    - **Property 37: Row hover highlighting**
    - **Validates: Requirements 16.3**

  - [x] 14.4 Style badges consistently
    - Apply rounded corners to all badges
    - Use appropriate color coding
    - _Requirements: 16.4_

  - [ ]* 14.5 Write property test for badge styling consistency
    - **Property 38: Badge styling consistency**
    - **Validates: Requirements 16.4**

  - [x] 14.6 Implement dark mode support
    - Apply dark theme CSS variables to all table and visualization elements
    - Test dark mode appearance
    - _Requirements: 16.5_

  - [ ]* 14.7 Write property test for dark mode theme application
    - **Property 39: Dark mode theme application**
    - **Validates: Requirements 16.5**

- [x] 15. Implement responsive mobile design
  - [x] 15.1 Implement mobile card-based layout
    - Transform table to cards on mobile (<768px)
    - Stack columns vertically within cards
    - _Requirements: 17.1, 17.2_

  - [ ]* 15.2 Write property test for mobile responsive layout
    - **Property 40: Mobile responsive layout**
    - **Validates: Requirements 17.1**

  - [ ]* 15.3 Write property test for mobile column stacking
    - **Property 41: Mobile column stacking**
    - **Validates: Requirements 17.2**

  - [x] 15.4 Implement mobile navigation
    - Hide A-Z scrollbar on mobile
    - Make tabs horizontally scrollable
    - _Requirements: 17.3, 17.4_

  - [ ]* 15.5 Write property test for mobile tab horizontal scroll
    - **Property 42: Mobile tab horizontal scroll**
    - **Validates: Requirements 17.4**

  - [x] 15.6 Implement viewport change state preservation
    - Preserve tab and filter state across viewport changes
    - _Requirements: 17.6_

  - [ ]* 15.7 Write property test for viewport change state preservation
    - **Property 43: Viewport change state preservation**
    - **Validates: Requirements 17.6**

- [x] 16. Implement Circle column in Contacts table
  - [x] 16.1 Add Circle column to ContactsTable
    - Render circle badge with appropriate color for each contact
    - Display "Uncategorized" for contacts without circle assignment
    - Use CIRCLE_DEFINITIONS colors from circular-visualizer.js
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 16.2 Write property test for Circle badge display
    - **Property 44: Circle badge display**
    - **Validates: Requirements 8.2**

  - [x] 16.3 Implement circle sorting
    - Add circle to sortable columns
    - Sort order: inner → close → active → casual → acquaintance → uncategorized
    - _Requirements: 8.5_

  - [ ]* 16.4 Write property test for Circle sort order
    - **Property 45: Circle sort order**
    - **Validates: Requirements 8.5**

  - [x] 16.5 Add circle filter to SearchFilterBar
    - Parse "circle:inner", "circle:close", etc. syntax
    - Add circle to autocomplete suggestions
    - _Requirements: 8.4_

  - [ ]* 16.6 Write property test for Circle filter application
    - **Property 46: Circle filter application**
    - **Validates: Requirements 8.4**

- [x] 17. Implement Circles tab with CircularVisualizer
  - [x] 17.1 Create Circles tab container
    - Add Circles tab button to tab navigation
    - Create container div for Circles content
    - Add URL hash support for #directory/circles
    - _Requirements: 7.2, 9.1_

  - [x] 17.2 Integrate CircularVisualizer component
    - Import circular-visualizer.js
    - Initialize CircularVisualizer instance
    - Wire up contact data to visualizer
    - _Requirements: 9.2, 9.3, 9.4_

  - [ ]* 17.3 Write property test for Circles visualization rendering
    - **Property 47: Circles visualization rendering**
    - **Validates: Requirements 9.2, 9.3, 9.4**

  - [x] 17.4 Implement contact click handler
    - Add click event listener for contact dots
    - Show contact details or navigate to contact
    - _Requirements: 9.5_

  - [x] 17.5 Implement circle capacity indicators
    - Display legend with circle names and counts
    - Color-code counts (green/orange/red based on capacity)
    - Show "X / Y" format
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 17.6 Write property test for Circle capacity indicators
    - **Property 48: Circle capacity indicators**
    - **Validates: Requirements 12.2, 12.3, 12.4**

- [x] 18. Implement group filtering in Circles view
  - [x] 18.1 Add group filter dropdown
    - Create dropdown above CircularVisualizer
    - Populate with available groups
    - Hide dropdown if no groups exist
    - _Requirements: 10.1, 10.5_

  - [x] 18.2 Implement group filter logic
    - Call visualizer.showGroupFilter(groupId) on selection
    - Dim non-matching contacts to 20% opacity
    - _Requirements: 10.2, 10.3_

  - [ ]* 18.3 Write property test for group filter in Circles
    - **Property 49: Group filter in Circles view**
    - **Validates: Requirements 10.2, 10.3**

  - [x] 18.4 Implement clear filter functionality
    - Add "Clear filter" option to dropdown
    - Call visualizer.clearGroupFilter() on clear
    - Restore full visibility of all contacts
    - _Requirements: 10.4_

  - [ ]* 18.5 Write property test for group filter clear
    - **Property 50: Group filter clear in Circles**
    - **Validates: Requirements 10.4**

- [x] 19. Implement Manage Circles CTA
  - [x] 19.1 Add "Manage Circles" button
    - Position prominently in Circles tab header
    - Style with primary button appearance
    - _Requirements: 11.1_

  - [x] 19.2 Implement onboarding flow trigger
    - Open onboarding flow on button click
    - Preserve Directory page state during flow
    - _Requirements: 11.2, 11.3_

  - [x] 19.3 Handle onboarding completion
    - Return to Circles tab after completion
    - Refresh CircularVisualizer with updated assignments
    - _Requirements: 11.4_

  - [x] 19.4 Handle onboarding cancellation
    - Return to Circles tab without changes
    - Preserve existing circle assignments
    - _Requirements: 11.5_

- [x] 20. Checkpoint - Ensure Circles integration works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Update navigation and routing
  - [x] 21.1 Update main navigation
    - Replace "Contacts" and "Groups & Tags" nav links with single "Directory" link
    - Update navigation handlers
    - _Requirements: 7.1_

  - [x] 21.2 Update app.js routing
    - Add Directory page to navigation system
    - Remove old Contacts and Groups & Tags pages
    - Update page switching logic
    - _Requirements: 7.1_

- [x] 22. Implement responsive design for Circles
  - [x] 22.1 Implement mobile Circles layout
    - Scale SVG to fit mobile viewport
    - Maintain aspect ratio
    - _Requirements: 17.5_

  - [ ]* 22.2 Write property test for mobile Circles scaling
    - **Property 51: Mobile Circles SVG scaling**
    - **Validates: Requirements 17.5**

- [x] 23. Final checkpoint - Integration testing and polish
  - Ensure all tests pass, ask the user if questions arise.
