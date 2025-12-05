# Implementation Plan

- [ ] 1. Database schema updates and migrations
  - Create onboarding_state table with user_id, step completion flags, and progress tracking
  - Add circle column to contacts table (inner, close, active, casual)
  - Add AI suggestion columns (circle_ai_suggestion, circle_ai_confidence, circle_assigned_by)
  - Create group_mapping_suggestions table for Step 3
  - _Requirements: All requirements (data foundation)_

- [ ] 2. Onboarding state management service
  - [ ] 2.1 Create OnboardingStateManager class
    - Implement state initialization for new users
    - Implement state persistence to localStorage and database
    - Implement state loading with fallback chain (localStorage → sessionStorage → memory)
    - _Requirements: 1.1, 1.5, 12.2, 12.4_
  
  - [ ]* 2.2 Write property test for state persistence
    - **Property 4: Dismiss and Resume Round-Trip**
    - **Validates: Requirements 1.5, 12.2, 12.4**
  
  - [ ] 2.3 Implement step completion logic
    - Create methods to check and update step completion
    - Implement Step 1 completion (both integrations connected)
    - Implement Step 2 completion (50%+ contacts categorized)
    - Implement Step 3 completion (all mappings reviewed)
    - _Requirements: 2.5, 3.5, 5.5_
  
  - [ ]* 2.4 Write property test for integration completion
    - **Property 5: Integration Completion Logic**
    - **Validates: Requirements 2.5**
  
  - [ ]* 2.5 Write property test for circle progress
    - **Property 6: Circle Progress Calculation**
    - **Validates: Requirements 3.5**

- [ ] 3. Sidebar Step Indicator component
  - [ ] 3.1 Create OnboardingStepIndicator component
    - Implement render method with 3 steps
    - Implement step status rendering (complete, active, incomplete)
    - Add visual icons (✓ for complete, → for active, number for incomplete)
    - Apply Stone & Clay theme styling
    - _Requirements: 1.1, 1.2, 16.1, 17.1_
  
  - [ ]* 3.2 Write property test for indicator visibility
    - **Property 1: Onboarding Indicator Visibility**
    - **Validates: Requirements 1.1**
  
  - [ ]* 3.3 Write property test for step status rendering
    - **Property 2: Step Status Rendering**
    - **Validates: Requirements 1.2**
  
  - [ ] 3.4 Implement step navigation
    - Add click handlers for each step
    - Navigate to correct page/section (Step 1 → Preferences, Step 2 → Circles, Step 3 → Groups)
    - _Requirements: 1.3, 2.1_
  
  - [ ]* 3.5 Write property test for step navigation
    - **Property 3: Step Navigation**
    - **Validates: Requirements 1.3**
  
  - [ ] 3.6 Implement dismiss functionality
    - Add dismiss button with X icon
    - Save state on dismiss
    - Show resume CTA button when dismissed
    - _Requirements: 1.5, 12.1_
  
  - [ ] 3.7 Integrate indicator into sidebar
    - Add indicator below title section in app.js
    - Show/hide based on onboarding completion
    - _Requirements: 1.1, 1.4_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 5. Manage Circles Flow component
  - [ ] 5.1 Create ManageCirclesFlow class
    - Implement modal structure with header, content, and actions
    - Implement educational tips panel with Dunbar & Aristotle content
    - Add collapsible "Learn more" section
    - Apply Stone & Clay theme styling with warm colors
    - _Requirements: 3.1, 3.4, 7.1, 7.4, 16.1, 18.1_
  
  - [ ] 5.2 Implement search bar
    - Create search input with icon
    - Implement real-time filtering of contact grid
    - Show "no results" message when empty
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [ ]* 5.3 Write property test for contact search
    - **Property 7: Contact Search Filtering**
    - **Validates: Requirements 4.2**
  
  - [ ] 5.3 Implement progress tracking
    - Display "X/Y contacts categorized" label
    - Render progress bar with percentage
    - Update in real-time as contacts are assigned
    - _Requirements: 9.1, 9.2_
  
  - [ ] 5.4 Implement circle capacities display
    - Show 4 circles with names and capacities (10, 25, 50, 100)
    - Display current count vs. capacity for each circle
    - Show warning icon when over capacity
    - _Requirements: 3.3, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 5.5 Implement contact grid
    - Create grid layout with responsive columns
    - Render contact cards with avatars (warm pastel colors)
    - Add circle selection dropdown for each contact
    - Display AI suggestions with confidence scores
    - _Requirements: 4.3, 4.4, 6.1, 8.1, 8.2, 8.3, 18.1, 18.2_
  
  - [ ] 5.6 Implement circle assignment logic
    - Handle dropdown selection changes
    - Update contact circle in state and database
    - Update circle counts immediately
    - Emit events for progress tracking
    - _Requirements: 3.5, 14.1, 14.2_
  
  - [ ]* 5.7 Write property test for circle counts
    - **Property 12: Circle Count Accuracy**
    - **Validates: Requirements 14.1, 14.2**
  
  - [ ] 5.8 Implement save and skip actions
    - Add "Save & Continue" button to complete Step 2
    - Add "Skip for Now" button to save progress
    - Show success toast and prompt for Step 3
    - _Requirements: 6.3, 6.4, 12.1_
  
  - [ ] 5.9 Implement mobile responsive layout
    - Switch to single-column grid on mobile (<768px)
    - Stack action buttons vertically
    - Adjust spacing and sizing for touch
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 16.4_
  
  - [ ]* 5.10 Write property test for mobile layout
    - **Property 15: Mobile Responsive Layout**
    - **Validates: Requirements 11.3**

- [ ] 6. Step 1: Integration Connection Handler
  - [ ] 6.1 Create Step1IntegrationsHandler class
    - Implement navigation to Preferences page
    - Highlight Google Calendar and Contacts sections
    - Add pulsing border animation for highlights
    - _Requirements: 2.1, 2.2_
  
  - [ ] 6.2 Implement connection listeners
    - Listen for google-calendar-connected event
    - Listen for google-contacts-connected event
    - Update onboarding state on successful connections
    - _Requirements: 2.3, 2.4, 13.1, 13.2_
  
  - [ ] 6.3 Implement step completion check
    - Check if both integrations are connected
    - Mark Step 1 complete when both are done
    - Enable Step 2 in the indicator
    - Show success message and prompt for Step 2
    - _Requirements: 2.5, 13.3, 13.5_
  
  - [ ] 6.4 Implement error handling
    - Handle OAuth failures with clear messages
    - Provide retry buttons for failed connections
    - Show troubleshooting guidance
    - _Requirements: 13.4_

- [ ] 7. Step 2: Circles Organization Handler
  - [ ] 7.1 Create Step2CirclesHandler class
    - Implement navigation to Directory > Circles tab
    - Auto-trigger Manage Circles flow on arrival
    - _Requirements: 3.1, 3.2_
  
  - [ ] 7.2 Implement AI circle suggestions
    - Fetch AI suggestions from backend
    - Display suggestions with confidence scores
    - Pre-select high-confidence suggestions
    - Handle AI service failures gracefully
    - _Requirements: 8.1, 8.2, 8.3, 9.4_
  
  - [ ]* 7.3 Write property test for AI suggestion structure
    - **Property 10: AI Suggestion Structure**
    - **Validates: Requirements 8.2**
  
  - [ ] 7.4 Implement capacity warnings
    - Show visual warning when circle exceeds capacity
    - Allow assignments to continue despite warning
    - Provide gentle suggestions to rebalance
    - _Requirements: 9.3, 10.5_
  
  - [ ]* 7.5 Write property test for capacity warnings
    - **Property 11: Circle Capacity Warning**
    - **Validates: Requirements 9.3**
  
  - [ ] 7.6 Implement progress milestones
    - Show encouraging messages at 25%, 50%, 75%
    - Display completion celebration at 100%
    - _Requirements: 9.4_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 9. Step 3: Group Mapping Review Handler
  - [ ] 9.1 Create Step3GroupMappingHandler class
    - Implement navigation to Directory > Groups tab
    - Fetch group mapping suggestions from API
    - Handle empty mappings gracefully
    - _Requirements: 5.1, 5.2_
  
  - [ ] 9.2 Implement mapping suggestions UI
    - Render mapping cards with source and target groups
    - Display confidence badges (high/medium/low)
    - Show member counts for each group
    - Add group selection dropdowns
    - Apply Stone & Clay theme styling
    - _Requirements: 5.3, 16.1_
  
  - [ ] 9.3 Implement mapping actions
    - Add "Accept" button to apply mapping
    - Add "Skip" button to reject mapping
    - Update state when mapping is reviewed
    - Remove card with fade animation
    - _Requirements: 5.4_
  
  - [ ]* 9.4 Write property test for mapping completion
    - **Property 8: Mapping Review Completion**
    - **Validates: Requirements 5.5**
  
  - [ ] 9.5 Implement completion logic
    - Check if all mappings are reviewed
    - Mark Step 3 complete when done
    - Mark onboarding as complete
    - Hide onboarding indicator
    - _Requirements: 5.5_
  
  - [ ] 9.6 Implement completion celebration
    - Show modal with 🎉 icon
    - Display "You're All Set!" message
    - Explain what happens next
    - Add "Get Started" button
    - _Requirements: 8.1_

- [ ] 10. Backend API endpoints
  - [ ] 10.1 Create onboarding state endpoints
    - POST /api/onboarding/init - Initialize onboarding for new user
    - GET /api/onboarding/state - Get current onboarding state
    - PUT /api/onboarding/state - Update onboarding state
    - POST /api/onboarding/sync - Sync local state to server
    - _Requirements: All requirements (state management)_
  
  - [ ] 10.2 Create circle assignment endpoints
    - POST /api/contacts/:id/circle - Assign contact to circle
    - GET /api/contacts/circles/counts - Get circle counts
    - POST /api/contacts/circles/bulk - Bulk assign contacts
    - _Requirements: 3.5, 14.1, 14.2_
  
  - [ ] 10.3 Create AI suggestion endpoint
    - POST /api/ai/circle-suggestions - Generate circle suggestions
    - Analyze communication frequency, recency, calendar co-attendance
    - Return suggestions with confidence scores and reasons
    - Handle timeouts and errors gracefully
    - _Requirements: 8.1, 8.2, 8.3, 9.1_
  
  - [ ] 10.4 Create group mapping endpoints
    - GET /api/google-contacts/mapping-suggestions - Get mapping suggestions
    - POST /api/google-contacts/accept-mapping - Accept a mapping
    - POST /api/google-contacts/reject-mapping - Reject a mapping
    - _Requirements: 5.2, 5.3, 5.4_

- [ ] 11. Integration with existing features
  - [ ] 11.1 Update Preferences page
    - Add data attributes for integration sections
    - Emit events on successful connections
    - Support onboarding highlight styling
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 11.2 Update Directory page Circles tab
    - Add "Manage Circles" button
    - Trigger Manage Circles flow on button click
    - Reuse same flow as Step 2
    - _Requirements: 6.1, 6.2_
  
  - [ ]* 11.3 Write property test for component reuse
    - **Property 9: Manage Circles Component Reuse**
    - **Validates: Requirements 6.2**
  
  - [ ] 11.4 Update Directory page Groups tab
    - Add container for group mapping suggestions
    - Integrate with Step 3 handler
    - _Requirements: 5.1, 5.2_
  
  - [ ] 11.5 Update app.js initialization
    - Check onboarding state on app load
    - Show/hide indicator based on completion
    - Initialize appropriate step handler
    - _Requirements: 1.1, 1.4_

- [ ] 12. Theme integration and styling
  - [ ] 12.1 Create onboarding CSS file
    - Define styles for step indicator
    - Define styles for Manage Circles modal
    - Define styles for educational tips
    - Define styles for mapping suggestions
    - Use Stone & Clay CSS custom properties throughout
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [ ]* 12.2 Write property test for design system compliance
    - **Property 14: Design System Compliance**
    - **Validates: Requirements 16.1, 18.1**
  
  - [ ] 12.3 Implement theme toggle support
    - Ensure all onboarding elements update on theme change
    - Test Latte and Espresso modes
    - Verify warm color palette in both modes
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [ ]* 12.4 Write property test for theme propagation
    - **Property 13: Theme Propagation**
    - **Validates: Requirements 17.1**
  
  - [ ] 12.5 Implement responsive styles
    - Add mobile breakpoints (<768px)
    - Add tablet breakpoints (768-1023px)
    - Ensure touch-friendly sizing
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 16.4_

- [ ] 13. Error handling and edge cases
  - [ ] 13.1 Implement localStorage fallbacks
    - Try localStorage first
    - Fall back to sessionStorage
    - Fall back to memory storage
    - Show appropriate user messages
    - _Requirements: 12.2_
  
  - [ ] 13.2 Implement network error handling
    - Detect offline status
    - Queue state updates for sync
    - Sync when back online
    - Show offline indicators
    - _Requirements: All requirements (reliability)_
  
  - [ ] 13.3 Implement API error handling
    - Handle integration connection failures
    - Handle AI service timeouts
    - Handle group mapping API errors
    - Provide retry mechanisms
    - _Requirements: 13.4_
  
  - [ ] 13.4 Implement validation
    - Validate circle assignments
    - Validate onboarding state updates
    - Show validation errors clearly
    - _Requirements: All requirements (data integrity)_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Documentation and polish
  - [ ] 15.1 Create user-facing documentation
    - Write guide explaining the 3-step onboarding
    - Document circle definitions and Dunbar's research
    - Explain Aristotle's friendship types
    - Add screenshots and examples
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 15.2 Create developer documentation
    - Document OnboardingStateManager API
    - Document component interfaces
    - Document backend API endpoints
    - Add code examples
    - _Requirements: All requirements (maintainability)_
  
  - [ ] 15.3 Add accessibility features
    - Ensure keyboard navigation works
    - Add ARIA labels and roles
    - Test with screen readers
    - Verify color contrast ratios
    - _Requirements: All requirements (accessibility)_
  
  - [ ] 15.4 Polish animations and transitions
    - Add smooth transitions for step changes
    - Add fade animations for card removal
    - Add pulsing animation for highlights
    - Ensure 60fps performance
    - _Requirements: 1.2, 3.5, 9.4_
  
  - [ ] 15.5 Add analytics tracking
    - Track onboarding start
    - Track step completions
    - Track dismissals and resumes
    - Track completion rate
    - _Requirements: All requirements (product insights)_
