# Implementation Plan

- [x] 1. Create Test Data Management UI in Preferences Panel
  - Add "Test Data Management" section to preferences page
  - Create status panel component showing test vs real counts for each data type
  - Create controls panel with Generate/Remove buttons for each data type
  - Implement API calls to fetch current status
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 1.1 Write property test for status panel display
  - **Feature: test-data-generation-ui, Property 1: Status panel displays all data types**
  - **Validates: Requirements 1.2**

- [x] 1.2 Write property test for test count accuracy
  - **Feature: test-data-generation-ui, Property 2: Status counts match database**
  - **Validates: Requirements 1.4**

- [x] 1.3 Write property test for real count accuracy
  - **Feature: test-data-generation-ui, Property 3: Real counts match database**
  - **Validates: Requirements 1.5**

- [x] 1.4 Write property test for button presence
  - **Feature: test-data-generation-ui, Property 4: Generate/Remove buttons present for all types**
  - **Validates: Requirements 1.6**

- [x] 2. Implement granular test data generation endpoints
  - Create separate endpoints for each data type under /api/test-data
  - POST /api/test-data/generate/contacts
  - POST /api/test-data/generate/calendar-events
  - POST /api/test-data/generate/suggestions
  - POST /api/test-data/generate/group-suggestions
  - POST /api/test-data/generate/voice-notes
  - Add authentication and user ID validation to all endpoints
  - Use database transactions for atomicity
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 2.1 Write property test for authentication requirement
  - **Feature: test-data-generation-ui, Property 30: Authentication requirement**
  - **Validates: Requirements 9.2**

- [x] 2.2 Write property test for user ID validation
  - **Feature: test-data-generation-ui, Property 31: User ID validation**
  - **Validates: Requirements 9.3**

- [x] 3. Implement contact generation endpoint
  - Create generateContacts method in TestDataService
  - Generate realistic contact data with varied attributes
  - Assign tags and groups to contacts
  - Infer timezones from locations
  - Mark all generated data as test data
  - Return count of created contacts
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3.1 Write property test for contact data validity
  - **Feature: test-data-generation-ui, Property 5: Test contact data validity**
  - **Validates: Requirements 2.2**

- [x] 3.2 Write property test for contact date variance
  - **Feature: test-data-generation-ui, Property 6: Test contact date variance**
  - **Validates: Requirements 2.3**

- [x] 3.3 Write property test for contact tags presence
  - **Feature: test-data-generation-ui, Property 7: Test contact tags presence**
  - **Validates: Requirements 2.4**

- [x] 3.4 Write property test for contact group assignment
  - **Feature: test-data-generation-ui, Property 8: Test contact group assignment**
  - **Validates: Requirements 2.5**

- [x] 3.5 Write property test for timezone inference
  - **Feature: test-data-generation-ui, Property 9: Timezone inference correctness**
  - **Validates: Requirements 2.6**

- [x] 4. Implement calendar event generation endpoint
  - Create generateCalendarEvents method in TestDataService
  - Generate availability slots across multiple days
  - Include both weekday and weekend slots
  - Vary times of day (morning, afternoon, evening)
  - Store events with source='test'
  - Return count of created calendar events
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.1 Write property test for calendar events creation
  - **Feature: test-data-generation-ui, Property 10: Calendar events creation**
  - **Validates: Requirements 3.1**

- [x] 4.2 Write property test for multi-day span
  - **Feature: test-data-generation-ui, Property 11: Calendar events span multiple days**
  - **Validates: Requirements 3.2**

- [x] 4.3 Write property test for weekday/weekend inclusion
  - **Feature: test-data-generation-ui, Property 12: Calendar events include weekdays and weekends**
  - **Validates: Requirements 3.3**

- [x] 4.4 Write property test for time variance
  - **Feature: test-data-generation-ui, Property 13: Calendar events time variance**
  - **Validates: Requirements 3.4**

- [x] 5. Implement suggestions generation endpoint
  - Create generateSuggestions method in TestDataService
  - Use existing contacts and calendar events
  - Apply matching algorithm to pair contacts with time slots
  - Include reasoning for each suggestion
  - Respect contact frequency preferences
  - Mark suggestions with source='test'
  - Return count of created suggestions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.1 Write property test for suggestion generation completeness
  - **Feature: test-data-generation-ui, Property 14: Suggestion generation completeness**
  - **Validates: Requirements 4.2**

- [x] 5.2 Write property test for suggestion reasoning
  - **Feature: test-data-generation-ui, Property 15: Suggestion reasoning presence**
  - **Validates: Requirements 4.3**

- [x] 5.3 Write property test for suggestion count accuracy
  - **Feature: test-data-generation-ui, Property 16: Suggestion count accuracy**
  - **Validates: Requirements 4.5**

- [x] 6. Implement group suggestions generation endpoint
  - Create generateGroupSuggestions method in TestDataService
  - Find contacts with strong shared context (groups, tags)
  - Create group suggestions with 2-3 contacts per group
  - Calculate and store shared context scores
  - Include reasoning based on common groups, shared tags, and co-mentions
  - Mark suggestions with type='group' and source='test'
  - Return count of created group suggestions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6.1 Write property test for group suggestion membership
  - **Feature: test-data-generation-ui, Property 17: Group suggestion contact membership**
  - **Validates: Requirements 5.2**

- [x] 6.2 Write property test for shared context scores
  - **Feature: test-data-generation-ui, Property 18: Group suggestion shared context**
  - **Validates: Requirements 5.3**

- [x] 7. Implement voice notes generation endpoint
  - Create generateVoiceNotes method in TestDataService
  - Create sample voice notes with realistic transcriptions
  - Associate voice notes with test contacts
  - Include transcriptions and extracted entities
  - Create co-mentions (multiple contacts in same voice note)
  - Vary recording timestamps across multiple days
  - Mark voice notes with source='test'
  - Return count of created voice notes
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7.1 Write property test for voice note associations
  - **Feature: test-data-generation-ui, Property 19: Voice note contact associations**
  - **Validates: Requirements 6.2**

- [x] 7.2 Write property test for voice note co-mentions
  - **Feature: test-data-generation-ui, Property 20: Voice note co-mentions**
  - **Validates: Requirements 6.4**

- [x] 7.3 Write property test for voice note timestamp variance
  - **Feature: test-data-generation-ui, Property 21: Voice note timestamp variance**
  - **Validates: Requirements 6.5**

- [x] 8. Implement granular test data removal endpoints
  - Create separate endpoints for each data type under /api/test-data
  - POST /api/test-data/remove/contacts
  - POST /api/test-data/remove/calendar-events
  - POST /api/test-data/remove/suggestions
  - POST /api/test-data/remove/group-suggestions
  - POST /api/test-data/remove/voice-notes
  - Add authentication and user ID validation
  - Use database transactions for atomicity
  - Maintain referential integrity during deletion
  - Return count of deleted items
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 8.1 Write property test for test data removal completeness
  - **Feature: test-data-generation-ui, Property 22: Test data removal completeness**
  - **Validates: Requirements 7.1**

- [x] 8.2 Write property test for cascading deletion
  - **Feature: test-data-generation-ui, Property 23: Cascading deletion for contacts**
  - **Validates: Requirements 7.2**

- [x] 8.3 Write property test for real data preservation
  - **Feature: test-data-generation-ui, Property 24: Real data preservation**
  - **Validates: Requirements 7.6**

- [x] 9. Implement status endpoint
  - Create getStatus method in TestDataService
  - Query database for test vs real counts for each data type
  - Return StatusResult with all counts
  - _Requirements: 1.2, 1.4, 1.5_

- [x] 10. Implement UI feedback and status updates
  - Add loading indicators to Generate/Remove buttons
  - Display success messages with item counts after operations
  - Display error messages on failures
  - Auto-refresh status counts after operations
  - Show updated counts immediately on preferences page
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10.1 Write property test for status refresh
  - **Feature: test-data-generation-ui, Property 25: Status counts refresh after operations**
  - **Validates: Requirements 8.4**

- [x] 11. Add environment-based endpoint control
  - Add ENABLE_TEST_DATA_ENDPOINTS environment variable
  - Check environment variable in test-data route registration
  - Return 403 Forbidden when endpoints are disabled in production
  - Document environment variable in .env.example
  - _Requirements: 9.5_

- [x] 11.1 Write property test for production endpoint disabling
  - **Feature: test-data-generation-ui, Property 32: Production endpoint disabling**
  - **Validates: Requirements 9.5**

- [x] 12. Implement test data idempotency
  - Check for existing test data before generation
  - Prevent duplicate contacts (same name/email)
  - Prevent duplicate calendar events (same timestamp)
  - Use unique constraints where applicable
  - Return appropriate error messages for duplicates
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12.1 Write property test for idempotency
  - **Feature: test-data-generation-ui, Property 26: Test data idempotency**
  - **Validates: Requirements 10.1**

- [x] 12.2 Write property test for metadata tracking
  - **Feature: test-data-generation-ui, Property 27: Test data metadata tracking**
  - **Validates: Requirements 10.3**

- [x] 12.3 Write property test for selective removal
  - **Feature: test-data-generation-ui, Property 28: Selective test data removal**
  - **Validates: Requirements 10.5**

- [x] 13. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Manual testing and verification
  - Navigate to preferences and verify Test Data Management section appears
  - Verify status panel shows correct counts for all data types
  - Test generating contacts independently and verify counts update
  - Test generating calendar events independently and verify counts update
  - Test generating suggestions independently and verify counts update
  - Test generating group suggestions independently and verify counts update
  - Test generating voice notes independently and verify counts update
  - Test removing each data type independently and verify counts reset
  - Test that removing one type doesn't affect other types
  - Verify error handling and loading states
  - Test in production mode with ENABLE_TEST_DATA_ENDPOINTS=false
  - _Requirements: All_
