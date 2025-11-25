# Implementation Plan

- [x] 1. Consolidate and reorganize test data endpoints
  - Move test data generation logic from suggestions.ts to test-data.ts
  - Remove duplicate code between the two files
  - Ensure proper route registration under /api/test-data
  - Add authentication middleware to all test data endpoints
  - _Requirements: 6.1, 6.2_

- [ ]* 1.1 Write property test for authentication requirement
  - **Property 16: Authentication requirement**
  - **Validates: Requirements 6.2**

- [ ]* 1.2 Write property test for user ID validation
  - **Property 17: User ID validation**
  - **Validates: Requirements 6.3**

- [x] 2. Implement test data generator service
  - Create TestDataGenerator class with seedTestData, generateSuggestions, and clearTestData methods
  - Implement contact generation with varied attributes (names, emails, locations, frequency preferences)
  - Implement group creation and contact-to-group assignment
  - Implement tag creation and contact-to-tag assignment
  - Use database transactions for atomicity
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.4_

- [ ]* 2.1 Write property test for contact data validity
  - **Property 1: Test contact data validity**
  - **Validates: Requirements 1.2**

- [ ]* 2.2 Write property test for contact date variance
  - **Property 2: Test contact date variance**
  - **Validates: Requirements 1.3**

- [ ]* 2.3 Write property test for contact tags presence
  - **Property 3: Test contact tags presence**
  - **Validates: Requirements 1.4**

- [ ]* 2.4 Write property test for contact group assignment
  - **Property 4: Test contact group assignment**
  - **Validates: Requirements 1.5**

- [ ]* 2.5 Write property test for timezone inference
  - **Property 5: Timezone inference correctness**
  - **Validates: Requirements 1.6**

- [ ]* 2.6 Write property test for test data idempotency
  - **Property 13: Test data idempotency**
  - **Validates: Requirements 4.1**

- [ ]* 2.7 Write property test for cleanup completeness
  - **Property 14: Test data cleanup completeness**
  - **Validates: Requirements 4.4**

- [x] 3. Implement calendar event generator
  - Create CalendarEventGenerator class
  - Implement generateAvailabilitySlots method
  - Generate slots across multiple days (weekdays and weekends)
  - Vary times of day (morning, afternoon, evening)
  - Store events in calendar_events table
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 3.1 Write property test for calendar events creation
  - **Property 6: Calendar events creation**
  - **Validates: Requirements 2.1**

- [ ]* 3.2 Write property test for multi-day span
  - **Property 7: Calendar events span multiple days**
  - **Validates: Requirements 2.2**

- [ ]* 3.3 Write property test for weekday/weekend inclusion
  - **Property 8: Calendar events include weekdays and weekends**
  - **Validates: Requirements 2.3**

- [ ]* 3.4 Write property test for time variance
  - **Property 9: Calendar events time variance**
  - **Validates: Requirements 2.4**

- [x] 4. Integrate calendar event generation with test data seeding
  - Update seedTestData to call calendar event generator
  - Pass generated calendar events to suggestion generation
  - Update API response to include calendar event counts
  - _Requirements: 2.1, 3.1_

- [ ]* 4.1 Write property test for suggestion generation completeness
  - **Property 10: Suggestion generation completeness**
  - **Validates: Requirements 3.2**

- [ ]* 4.2 Write property test for suggestion reasoning
  - **Property 11: Suggestion reasoning presence**
  - **Validates: Requirements 3.3**

- [ ]* 4.3 Write property test for suggestion count accuracy
  - **Property 12: Suggestion count accuracy**
  - **Validates: Requirements 3.5**

- [ ]* 4.4 Write property test for API response format
  - **Property 15: API response format consistency**
  - **Validates: Requirements 4.5**

- [x] 5. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Fix suggestion filtering in UI
  - Update loadSuggestions function to properly filter by status
  - Fix filterSuggestions function to correctly apply filters
  - Ensure filter buttons update active state correctly
  - Test all filter options (all, pending, accepted, dismissed, snoozed)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ]* 6.1 Write property test for suggestion filtering
  - **Property 18: Suggestion filtering correctness**
  - **Validates: Requirements 7.1**

- [x] 7. Implement tag and group display in contact cards
  - Update renderContacts function to display tags
  - Update renderContacts function to display groups
  - Add CSS styling for tag badges
  - Add CSS styling for group badges
  - Hide empty tag/group sections when no tags/groups exist
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 7.1 Write property test for tag display
  - **Property 19: Tag display completeness**
  - **Validates: Requirements 8.1**

- [ ]* 7.2 Write property test for group display
  - **Property 20: Group display completeness**
  - **Validates: Requirements 8.2**

- [ ]* 7.3 Write property test for empty section hiding
  - **Property 21: Empty tag/group section hiding**
  - **Validates: Requirements 8.5**

- [x] 8. Implement tag and group management in contact form
  - Add tag input field to contact modal
  - Add group selection dropdown to contact modal
  - Implement addTag function to call /api/contacts/tags endpoint
  - Implement removeTag function to call DELETE /api/contacts/tags/:id
  - Implement assignGroup function to call /api/contacts/bulk/groups
  - Implement removeGroup function to call /api/contacts/bulk/groups
  - Update saveContact to handle tags and groups
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 8.1 Write property test for tag persistence
  - **Property 22: Tag persistence**
  - **Validates: Requirements 9.3**

- [ ]* 8.2 Write property test for group assignment persistence
  - **Property 23: Group assignment persistence**
  - **Validates: Requirements 9.4**

- [ ]* 8.3 Write property test for tag/group removal
  - **Property 24: Tag/group removal persistence**
  - **Validates: Requirements 9.5**

- [x] 9. Update test data UI controls
  - Ensure "Seed Test Data" button calls /api/test-data/seed
  - Ensure "Generate Suggestions" button calls /api/test-data/generate-suggestions
  - Add "Clear Test Data" button that calls /api/test-data/clear
  - Display loading indicators during operations
  - Display success messages with counts after operations
  - Display error messages on failures
  - Auto-refresh relevant UI sections after operations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Add environment-based test data endpoint control
  - Add ENABLE_TEST_DATA_ENDPOINTS environment variable
  - Check environment variable in test-data route registration
  - Return 403 Forbidden when endpoints are disabled
  - Document environment variable in .env.example
  - _Requirements: 6.5_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Manual testing and verification
  - Test seed test data button creates contacts with tags and groups
  - Test generate suggestions button creates suggestions
  - Test clear test data button removes all test data
  - Test suggestion filters work correctly for all statuses
  - Test tag and group display in contact cards
  - Test adding and removing tags through UI
  - Test adding and removing groups through UI
  - Verify error handling and loading states
  - _Requirements: All_
