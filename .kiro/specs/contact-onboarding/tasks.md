# Implementation Plan

- [x] 1. Set up database schema and core data models
  - Create database migrations for onboarding tables (onboarding_state, circle_assignments, ai_circle_overrides, weekly_catchup_sessions, onboarding_achievements, network_health_scores)
  - Add circle-related columns to contacts table (dunbar_circle, circle_assigned_at, circle_confidence, ai_suggested_circle)
  - Create indexes for performance optimization
  - Write database migration scripts
  - _Requirements: 1.1, 1.5, 2.2, 3.3, 7.1, 8.3, 8.5, 15.2_

- [ ]* 1.1 Write property test for database schema integrity
  - **Feature: contact-onboarding, Property 2: Onboarding state persistence**
  - **Validates: Requirements 1.5**

- [x] 2. Implement backend repositories
  - Create OnboardingRepository with CRUD operations for onboarding state
  - Extend ContactRepository with circle assignment methods
  - Create CircleAssignmentRepository for assignment history
  - Create WeeklyCatchupRepository for session management
  - Create AchievementRepository for gamification data
  - _Requirements: 1.5, 3.3, 7.1, 8.3, 12.2, 12.5_

- [ ]* 2.1 Write property test for contact metadata preservation
  - **Feature: contact-onboarding, Property 1: Contact metadata preservation during import**
  - **Validates: Requirements 2.2**

- [ ]* 2.2 Write property test for archive data preservation
  - **Feature: contact-onboarding, Property 13: Archive data preservation**
  - **Validates: Requirements 12.2**

- [ ]* 2.3 Write property test for archive-reactivate round trip
  - **Feature: contact-onboarding, Property 14: Archive-reactivate round trip**
  - **Validates: Requirements 12.5**

- [x] 3. Implement CircleAssignmentService
  - Create service for assigning contacts to circles
  - Implement circle capacity validation logic
  - Add circle distribution calculation methods
  - Implement batch assignment with transaction support
  - Add rebalancing suggestion generation
  - _Requirements: 3.3, 4.3, 5.3, 5.5, 14.4_

- [ ]* 3.1 Write property test for circle assignment immediacy
  - **Feature: contact-onboarding, Property 3: Circle assignment immediacy**
  - **Validates: Requirements 3.3, 5.3**

- [ ]* 3.2 Write property test for batch operation atomicity
  - **Feature: contact-onboarding, Property 5: Batch operation atomicity**
  - **Validates: Requirements 5.5**

- [ ]* 3.3 Write property test for circle count consistency
  - **Feature: contact-onboarding, Property 15: Circle count consistency**
  - **Validates: Requirements 12.4**

- [ ]* 3.4 Write property test for imbalance detection
  - **Feature: contact-onboarding, Property 22: Imbalance detection and suggestion**
  - **Validates: Requirements 14.4**

- [x] 4. Implement AISuggestionService
  - Create service for analyzing contacts and generating circle suggestions
  - Implement communication pattern analysis (frequency, recency, consistency)
  - Add confidence score calculation logic
  - Implement user override recording and learning
  - Add suggestion caching for performance
  - _Requirements: 1.3, 2.3, 2.5, 9.1, 9.2, 9.5_

- [ ]* 4.1 Write property test for AI suggestion generation
  - **Feature: contact-onboarding, Property 9: AI suggestion generation completeness**
  - **Validates: Requirements 1.3, 9.1, 9.2**

- [ ]* 4.2 Write property test for AI learning from corrections
  - **Feature: contact-onboarding, Property 10: AI learning from corrections**
  - **Validates: Requirements 2.5, 9.5**

- [x] 5. Implement OnboardingService
  - Create service for managing onboarding flow and state
  - Implement onboarding initialization for different triggers (new_user, post_import, manage)
  - Add progress tracking and milestone detection
  - Implement state persistence and resumption logic
  - Add completion handling and cleanup
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 3.2, 11.1, 11.5_

- [ ]* 5.1 Write property test for onboarding state persistence
  - **Feature: contact-onboarding, Property 2: Onboarding state persistence**
  - **Validates: Requirements 1.5**

- [ ]* 5.2 Write property test for new contact flagging
  - **Feature: contact-onboarding, Property 17: New contact flagging**
  - **Validates: Requirements 11.5**

- [x] 6. Implement backend API routes
  - Create POST /api/onboarding/initialize endpoint
  - Create GET /api/onboarding/state endpoint
  - Create PUT /api/onboarding/progress endpoint
  - Create POST /api/onboarding/complete endpoint
  - Create POST /api/circles/assign endpoint
  - Create POST /api/circles/batch-assign endpoint
  - Create GET /api/circles/distribution endpoint
  - Create POST /api/ai/suggest-circle endpoint
  - Create POST /api/ai/batch-suggest endpoint
  - Add authentication and authorization middleware
  - _Requirements: 1.1, 1.5, 3.3, 5.3, 9.1_

- [ ]* 6.1 Write integration tests for API endpoints
  - Test authentication and authorization
  - Test error responses and status codes
  - Test concurrent requests
  - _Requirements: 1.1, 3.3, 5.3_

- [x] 7. Implement frontend OnboardingController
  - Create state management for onboarding flow
  - Implement step navigation (next, previous, skip)
  - Add progress tracking and calculation
  - Implement state persistence to backend
  - Add exit and resume functionality
  - _Requirements: 1.1, 1.4, 1.5, 8.1_

- [ ]* 7.1 Write unit tests for OnboardingController
  - Test state transitions
  - Test progress calculations
  - Test navigation logic
  - _Requirements: 1.1, 1.5, 8.1_

- [x] 8. Implement CircularVisualizer component
  - Create SVG-based circular visualization with concentric circles
  - Implement contact dot rendering with initials and colors
  - Add circle labels and capacity indicators
  - Implement responsive sizing for different screen sizes
  - Add smooth animations for transitions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 13.3_

- [ ]* 8.1 Write unit tests for CircularVisualizer
  - Test rendering with various contact counts
  - Test circle capacity calculations
  - Test responsive behavior
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Implement drag-and-drop functionality
  - Add drag event handlers to contact dots
  - Implement drop zone highlighting
  - Add drag preview and ghost element
  - Implement drop handling and circle assignment
  - Add cancel handling with state restoration
  - Support batch drag for multiple selected contacts
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 9.1 Write property test for drag operation cancellation
  - **Feature: contact-onboarding, Property 4: Drag operation cancellation**
  - **Validates: Requirements 5.4**

- [ ]* 9.2 Write integration tests for drag-and-drop
  - Test single contact drag
  - Test batch drag operations
  - Test cancel behavior
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Implement group overlay and filtering
  - Add group filter UI controls
  - Implement group-based contact filtering
  - Add visual indicators for group membership
  - Implement group distribution display
  - Add toggle for group view on/off
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 10.1 Write property test for group filter correctness
  - **Feature: contact-onboarding, Property 6: Group filter correctness**
  - **Validates: Requirements 6.2**

- [ ]* 10.2 Write property test for UI state round-trip
  - **Feature: contact-onboarding, Property 7: UI state round-trip preservation**
  - **Validates: Requirements 6.4**

- [x] 11. Implement AI suggestion UI
  - Display AI-suggested circles with confidence indicators
  - Add one-click acceptance buttons
  - Implement override tracking
  - Show alternative suggestions
  - Add explanation tooltips for suggestions
  - _Requirements: 2.3, 2.4, 2.5, 9.2, 9.3, 9.4_

- [ ]* 11.1 Write unit tests for AI suggestion UI
  - Test confidence indicator display
  - Test acceptance flow
  - Test override tracking
  - _Requirements: 2.3, 2.4, 9.2_

- [x] 12. Implement preference setting UI
  - Create preference prompts for Inner Circle and Close Friends
  - Add smart default suggestions based on circle
  - Implement preference save functionality
  - Add skip option with default application
  - Allow later completion of incomplete preferences
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 12.1 Write property test for preference inheritance
  - **Feature: contact-onboarding, Property 11: Preference inheritance from circle assignment**
  - **Validates: Requirements 10.2, 10.4**

- [ ]* 12.2 Write property test for preference influence
  - **Feature: contact-onboarding, Property 12: Preference influence on suggestions**
  - **Validates: Requirements 10.3**

- [x] 13. Implement gamification features
  - Create progress bar component with animations
  - Implement milestone detection and celebration
  - Add achievement badge system
  - Create streak tracking functionality
  - Implement network health score calculation and display
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 13.1 Write property test for gamification metric consistency
  - **Feature: contact-onboarding, Property 18: Gamification metric consistency**
  - **Validates: Requirements 8.1, 8.2, 8.4, 8.5**

- [ ]* 13.2 Write unit tests for gamification components
  - Test progress calculations
  - Test milestone detection
  - Test achievement awarding
  - Test streak tracking
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 14. Implement Weekly Catchup feature
  - Create WeeklyCatchupManager service
  - Implement session generation logic (10-15 contacts per week)
  - Add contact review UI with progress tracking
  - Implement session completion and celebration
  - Add skip functionality with contact rescheduling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 14.1 Write property test for contact rescheduling
  - **Feature: contact-onboarding, Property 8: Weekly catchup contact rescheduling**
  - **Validates: Requirements 7.4**

- [ ]* 14.2 Write unit tests for Weekly Catchup
  - Test session generation
  - Test progress tracking
  - Test completion flow
  - Test skip behavior
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 15. Implement uncategorized contact tracking
  - Add uncategorized contact count display
  - Create visual indicator for incomplete onboarding
  - Implement prioritization of uncategorized contacts in management mode
  - Add completion status display
  - Implement automatic flagging of new contacts
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 15.1 Write property test for uncategorized contact prioritization
  - **Feature: contact-onboarding, Property 16: Uncategorized contact prioritization**
  - **Validates: Requirements 11.3**

- [x] 16. Implement contact pruning features
  - Add archive and remove options to contact review UI
  - Implement archive functionality with data preservation
  - Add confirmation dialog for contact removal
  - Implement circle count updates after pruning
  - Add reactivation functionality for archived contacts
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 16.1 Write unit tests for contact pruning
  - Test archive flow
  - Test removal flow
  - Test reactivation flow
  - Test count updates
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 17. Implement mobile-responsive design
  - Create touch-optimized circular visualization
  - Implement touch gesture support (tap, long-press, drag)
  - Add responsive layout for small screens
  - Implement autocomplete for mobile text input
  - Add orientation change handling with state preservation
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ]* 17.1 Write property test for mobile touch gestures
  - **Feature: contact-onboarding, Property 19: Mobile touch gesture support**
  - **Validates: Requirements 13.2**

- [ ]* 17.2 Write property test for orientation change preservation
  - **Feature: contact-onboarding, Property 20: Orientation change state preservation**
  - **Validates: Requirements 13.5**

- [ ]* 17.3 Write integration tests for mobile features
  - Test touch interactions
  - Test responsive layouts
  - Test orientation changes
  - _Requirements: 13.1, 13.2, 13.3, 13.5_

- [x] 18. Implement educational features
  - Add educational tooltips for first-time users
  - Create circle information display on hover/tap
  - Add help button with detailed explanations
  - Implement gentle suggestions for imbalanced circles
  - Create network structure summary for completion
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ]* 18.1 Write property test for circle information display
  - **Feature: contact-onboarding, Property 21: Circle information display**
  - **Validates: Requirements 14.2**

- [ ]* 18.2 Write unit tests for educational features
  - Test tooltip display
  - Test help content
  - Test suggestion generation
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 19. Implement privacy and security features
  - Add privacy notice display at onboarding start
  - Implement data isolation with user_id filtering
  - Add data export functionality
  - Implement account deletion with complete data removal
  - Add audit logging for sensitive operations
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 19.1 Write property test for data privacy isolation
  - **Feature: contact-onboarding, Property 23: Data privacy isolation**
  - **Validates: Requirements 15.2**

- [ ]* 19.2 Write property test for data export completeness
  - **Feature: contact-onboarding, Property 24: Data export completeness**
  - **Validates: Requirements 15.4**

- [ ]* 19.3 Write property test for account deletion completeness
  - **Feature: contact-onboarding, Property 25: Account deletion completeness**
  - **Validates: Requirements 15.5**

- [x] 20. Integrate with existing contact management
  - Add "Manage" button to Contacts page
  - Implement onboarding trigger on Google Contacts sync
  - Add automatic onboarding for new users with zero contacts
  - Integrate circle data with contact display
  - Update contact list to show circle assignments
  - _Requirements: 1.1, 2.1, 3.1, 3.2, 3.4_

- [ ]* 20.1 Write integration tests for contact management
  - Test "Manage" button flow
  - Test sync trigger
  - Test new user trigger
  - Test data integration
  - _Requirements: 1.1, 2.1, 3.1, 3.2_

- [x] 21. Implement error handling and validation
  - Add input validation for all API endpoints
  - Implement graceful degradation for AI service failures
  - Add conflict resolution for concurrent modifications
  - Implement timeout handling with retry logic
  - Add error logging and monitoring
  - _Requirements: All requirements (error handling is cross-cutting)_

- [ ]* 21.1 Write unit tests for error handling
  - Test validation logic
  - Test AI service fallbacks
  - Test conflict resolution
  - Test timeout handling
  - _Requirements: All requirements_

- [x] 22. Performance optimization
  - Implement pagination for large contact lists
  - Add virtual scrolling for circular visualization
  - Optimize AI batch analysis requests
  - Add caching for frequently accessed data
  - Implement lazy loading for onboarding steps
  - _Requirements: 4.2, 9.1, 11.1_

- [ ]* 22.1 Write performance tests
  - Test with 10, 50, 100, 500, 1000 contacts
  - Measure render times
  - Measure API response times
  - Identify bottlenecks
  - _Requirements: 4.2, 9.1_

- [x] 23. Accessibility improvements
  - Add ARIA labels to all interactive elements
  - Implement keyboard navigation for circular visualization
  - Add screen reader support
  - Ensure color contrast meets WCAG standards
  - Add focus indicators for keyboard users
  - _Requirements: All UI requirements (accessibility is cross-cutting)_

- [ ]* 23.1 Write accessibility tests
  - Test keyboard navigation
  - Test screen reader compatibility
  - Test color contrast
  - Test focus management
  - _Requirements: All UI requirements_

- [x] 24. Documentation and user guides
  - Create user guide for onboarding feature
  - Document API endpoints
  - Add inline code documentation
  - Create troubleshooting guide
  - Document Dunbar's number theory for users
  - _Requirements: 14.1, 14.2, 14.3_

- [ ]* 25. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 26. End-to-end testing
  - Test complete onboarding flow from start to finish
  - Test resuming interrupted onboarding
  - Test management mode modifications
  - Test Weekly Catchup flow
  - Test mobile experience
  - _Requirements: All requirements_

- [ ]* 26.1 Write end-to-end test suite
  - Test new user onboarding
  - Test post-import onboarding
  - Test management mode
  - Test Weekly Catchup
  - Test mobile flows
  - _Requirements: All requirements_

- [ ] 27. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
