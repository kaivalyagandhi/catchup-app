# Implementation Plan

- [x] 1. Create backend API routes for groups and tags management
  - Create new file `src/api/routes/groups-tags.ts` with all CRUD endpoints
  - Implement GET endpoints for listing groups and tags with contact counts
  - Implement GET endpoints for retrieving specific group/tag details
  - Implement POST endpoints for creating groups and tags
  - Implement PUT endpoints for updating groups and tags
  - Implement DELETE endpoints for deleting groups and tags
  - Implement endpoints for managing contact associations (add/remove)
  - Add authentication middleware to all routes
  - Register routes in main server file
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1-2.5, 3.1-3.5, 4.1-4.5, 5.1-5.5, 6.1-6.5, 7.1-7.5, 8.1-8.4, 9.1-9.4, 10.1-10.5, 11.1-11.5, 12.1-12.5, 13.1-13.5_

- [ ]* 1.1 Write property test for group name validation
  - **Property 1: Group name validation consistency**
  - **Validates: Requirements 2.2, 4.2**

- [ ]* 1.2 Write property test for tag name validation
  - **Property 2: Tag name validation consistency**
  - **Validates: Requirements 3.2, 5.2**

- [x] 2. Extend repository layer with contact count queries
  - Add `getGroupWithContactCount` method to GroupRepository
  - Add `listGroupsWithContactCounts` method to GroupRepository
  - Add `getGroupContacts` method to GroupRepository
  - Add `getTagWithContactCount` method to TagRepository
  - Add `listTagsWithContactCounts` method to TagRepository
  - Add `getTagContacts` method to TagRepository
  - Implement efficient SQL queries with JOINs for counts
  - _Requirements: 1.3, 1.4, 8.1-8.4, 9.1-9.4_

- [ ]* 2.1 Write property test for group persistence
  - **Property 3: Group persistence consistency**
  - **Validates: Requirements 2.3, 2.4**

- [ ]* 2.2 Write property test for tag persistence
  - **Property 4: Tag persistence consistency**
  - **Validates: Requirements 3.3, 3.4**

- [ ]* 2.3 Write property test for contact count accuracy
  - **Property 9: Contact count accuracy for groups**
  - **Property 10: Contact count accuracy for tags**
  - **Validates: Requirements 1.3, 1.4**

- [x] 3. Create frontend navigation and page structure
  - Add "Groups & Tags" navigation link in header
  - Create new page section in `public/index.html` for groups and tags management
  - Add CSS styles for management view layout
  - Implement navigation function to show/hide management view
  - Position management view adjacent to contacts view
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 4. Implement groups list view
  - Create `loadGroups()` function to fetch groups from API
  - Create `renderGroups()` function to display groups with contact counts
  - Add click handlers to show group details
  - Display empty state when no groups exist
  - Add loading indicators during data fetch
  - _Requirements: 1.1, 1.3_

- [x] 5. Implement tags list view
  - Create `loadTags()` function to fetch tags from API
  - Create `renderTags()` function to display tags with contact counts
  - Add click handlers to show tag details
  - Display empty state when no tags exist
  - Add loading indicators during data fetch
  - _Requirements: 1.2, 1.4_

- [x] 6. Create group management modals
  - Create HTML structure for create/edit group modal
  - Implement `showCreateGroupModal()` function
  - Implement `showEditGroupModal(groupId)` function
  - Implement `saveGroup(event)` form handler with validation
  - Implement `deleteGroup(groupId)` with confirmation dialog
  - Add error display for validation failures
  - Add success messages for operations
  - _Requirements: 2.1-2.5, 4.1-4.5, 6.1-6.5_

- [ ]* 6.1 Write property test for group updates
  - **Property 5: Group update reflection**
  - **Validates: Requirements 4.3, 4.4**

- [ ]* 6.2 Write property test for group deletion
  - **Property 7: Group deletion removes associations**
  - **Validates: Requirements 6.2, 6.3, 6.4**

- [x] 7. Create tag management modals
  - Create HTML structure for create/edit tag modal
  - Implement `showCreateTagModal()` function
  - Implement `showEditTagModal(tagId)` function
  - Implement `saveTag(event)` form handler with validation
  - Implement `deleteTag(tagId)` with confirmation dialog
  - Add error display for validation failures
  - Add success messages for operations
  - _Requirements: 3.1-3.5, 5.1-5.5, 7.1-7.5_

- [ ]* 7.1 Write property test for tag updates
  - **Property 6: Tag update reflection**
  - **Validates: Requirements 5.3, 5.4**

- [ ]* 7.2 Write property test for tag deletion
  - **Property 8: Tag deletion removes associations**
  - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 8. Implement group contact association management
  - Create `showGroupContacts(groupId)` function to display contacts in group
  - Create modal for viewing group contacts
  - Implement `showAddContactsToGroupModal(groupId)` function
  - Create contact selection interface with search/filter
  - Implement `addContactsToGroup(groupId, contactIds)` function
  - Implement `removeContactFromGroup(groupId, contactId)` with confirmation
  - Update contact counts after operations
  - _Requirements: 8.1-8.4, 10.1-10.5, 12.1-12.5_

- [ ]* 8.1 Write property test for adding contacts to groups
  - **Property 11: Contact addition to group**
  - **Validates: Requirements 10.3, 10.4**

- [ ]* 8.2 Write property test for removing contacts from groups
  - **Property 13: Contact removal from group**
  - **Validates: Requirements 12.3, 12.4**

- [x] 9. Implement tag contact association management
  - Create `showTagContacts(tagId)` function to display contacts with tag
  - Create modal for viewing tag contacts
  - Implement `showAddContactsToTagModal(tagId)` function
  - Create contact selection interface with search/filter
  - Implement `addContactsToTag(tagId, contactIds)` function
  - Implement `removeContactFromTag(tagId, contactId)` with confirmation
  - Update contact counts after operations
  - _Requirements: 9.1-9.4, 11.1-11.5, 13.1-13.5_

- [ ]* 9.1 Write property test for adding contacts to tags
  - **Property 12: Contact addition to tag**
  - **Validates: Requirements 11.3, 11.4**

- [ ]* 9.2 Write property test for removing contacts from tags
  - **Property 14: Contact removal from tag**
  - **Validates: Requirements 13.3, 13.4**

- [x] 10. Implement loading states and user feedback
  - Add loading spinners for all async operations
  - Implement success toast notifications with auto-dismiss
  - Implement error message display with persistence
  - Add loading states to buttons during operations
  - Ensure all operations provide visual feedback
  - _Requirements: 15.1-15.5_

- [ ]* 10.1 Write property test for operation feedback
  - **Property 15: Operation success feedback**
  - **Property 16: Operation failure feedback**
  - **Validates: Requirements 15.4, 15.5**

- [x] 11. Add responsive design and mobile support
  - Add CSS media queries for mobile devices
  - Add CSS media queries for tablets
  - Optimize layout for different screen sizes
  - Test touch interactions on mobile devices
  - Ensure modals work well on small screens
  - _Requirements: 14.1-14.5_

- [x] 12. Implement error handling and edge cases
  - Handle network errors with retry options
  - Handle 401 errors with redirect to login
  - Handle 404 errors with appropriate messages
  - Handle empty states for groups and tags
  - Handle concurrent operations gracefully
  - Add input sanitization for XSS prevention
  - _Requirements: All requirements (error handling)_

- [ ]* 12.1 Write unit tests for error handling
  - Test validation error display
  - Test network error handling
  - Test authorization error handling
  - Test empty state rendering
  - _Requirements: 2.5, 3.5, 10.5, 11.5_

- [ ]* 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Update existing contacts view integration
  - Ensure groups and tags display correctly in contacts list
  - Verify contact modal group/tag management still works
  - Test data consistency between contacts and management views
  - Refresh management view when contacts are updated
  - _Requirements: Integration with existing features_

- [ ]* 14.1 Write integration tests for view synchronization
  - Test that creating group in management view updates contacts view
  - Test that deleting tag in management view updates contacts view
  - Test that contact changes reflect in management view
  - _Requirements: Integration testing_

- [ ]* 15. Final testing and polish
  - Perform manual testing of all workflows
  - Test keyboard navigation and accessibility
  - Verify responsive design on multiple devices
  - Check for console errors and warnings
  - Optimize performance for large datasets
  - _Requirements: All requirements (final validation)_
