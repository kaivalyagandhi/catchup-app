# Implementation Plan: Group Scheduling Feature

## Overview

This implementation plan breaks down the Group Scheduling feature into discrete, incremental coding tasks. Each task builds on previous tasks and includes testing sub-tasks where appropriate. The implementation follows a bottom-up approach: database schema → backend services → API routes → frontend components.

## Tasks

- [x] 1. Database Schema and Types
  - [x] 1.1 Create database migration for scheduling tables
    - Create `catchup_plans` table with all columns and constraints
    - Create `plan_invitees` table with foreign keys
    - Create `invitee_availability` table
    - Create `initiator_availability` table
    - Create `invite_links` table with unique token constraint
    - Create `scheduling_preferences` table
    - Create `scheduling_notifications` table
    - Create `calendar_sharing_settings` table
    - Add all indexes for performance
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

  - [x] 1.2 Create TypeScript type definitions
    - Add all types to `src/types/scheduling.ts`
    - Export types from `src/types/index.ts`
    - _Requirements: 14.1-14.8_

- [x] 2. Backend Repositories
  - [x] 2.1 Implement scheduling repository
    - Create `src/scheduling/scheduling-repository.ts`
    - Implement `createPlan()`, `getPlanById()`, `getPlansByUser()`
    - Implement `updatePlan()`, `updatePlanStatus()`, `finalizePlan()`
    - Implement `addInvitee()`, `getInviteesByPlan()`
    - _Requirements: 2.14, 9.6, 9.7, 10.1, 12.1, 12.2_

  - [x] 2.2 Implement invite link repository
    - Create `src/scheduling/invite-link-repository.ts`
    - Implement `createLink()`, `getLinkByToken()`, `getLinksForPlan()`
    - Implement `trackAccess()`, `markSubmitted()`, `invalidateLink()`
    - _Requirements: 3.1, 3.8, 3.9, 3.10_

  - [x] 2.3 Implement availability repository
    - Create `src/scheduling/availability-repository.ts`
    - Implement `saveAvailability()`, `getAvailabilityForPlan()`
    - Implement `saveInitiatorAvailability()`, `getInitiatorAvailability()`
    - _Requirements: 4.10, 5.1, 5.4, 6.1_

  - [x] 2.4 Implement scheduling preferences repository
    - Create `src/scheduling/preferences-repository.ts`
    - Implement `getPreferences()`, `savePreferences()`
    - _Requirements: 16.7, 16.11_

  - [x] 2.5 Implement notification repository
    - Create `src/scheduling/notification-repository.ts`
    - Implement `createNotification()`, `getNotificationsByUser()`
    - Implement `markAsRead()`, `getUnreadCount()`
    - _Requirements: 13.5, 13.6, 13.7_

- [x] 3. Backend Services
  - [x] 3.1 Implement scheduling service
    - Create `src/scheduling/scheduling-service.ts`
    - Implement `createPlan()` with validation and invite link generation
    - Implement `getPlansByUser()` with filtering
    - Implement `getPlanById()` with ownership check
    - Implement `finalizePlan()` with notification
    - Implement `cancelPlan()` with link invalidation
    - Implement `updatePlan()` and `extendDateRange()`
    - _Requirements: 2.14, 2.15, 2.16, 2.17, 9.6, 9.7, 10.1, 12.1-12.8_

  - [ ]* 3.2 Write property test for date range validation
    - **Property 18: Date Range Validation**
    - Test that date ranges cannot exceed 14 days
    - Test that end date must be after start date
    - **Validates: Requirements 2.11, 12.8**

  - [x] 3.3 Implement invite link service
    - Create `src/scheduling/invite-link-service.ts`
    - Implement `generateInviteLink()` with secure token
    - Implement `validateInviteLink()` with expiry check
    - Implement `regenerateInviteLink()` with old link invalidation
    - Implement `invalidateLinksForPlan()`
    - _Requirements: 3.1, 3.2, 3.3, 3.8, 3.9, 3.10_

  - [ ]* 3.4 Write property test for invite link generation
    - **Property 2: Invite Link Uniqueness and Validity**
    - Test that N invitees generate N unique links
    - Test token format and expiry date
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 3.5 Implement availability collection service
    - Create `src/scheduling/availability-collection-service.ts`
    - Implement `submitAvailability()` with validation
    - Implement `getAvailabilityForPlan()`
    - Implement `calculateOverlaps()` for dashboard
    - Implement `getInitiatorAvailabilityFromCalendar()`
    - _Requirements: 4.10, 5.2, 5.3, 6.3, 6.4, 6.5_

  - [ ]* 3.6 Write property test for availability overlap calculation
    - **Property 8: Availability Overlap Calculation**
    - Test correct identification of perfect overlaps
    - Test correct counting of available participants
    - **Validates: Requirements 6.3, 6.4, 6.5**

  - [x] 3.7 Implement conflict resolution service
    - Create `src/scheduling/conflict-resolution-service.ts`
    - Implement `analyzeConflicts()` to find overlaps
    - Implement `generateAISuggestions()` using Gemini
    - Implement `rankSuggestions()` for ordering
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11_

  - [ ]* 3.8 Write property test for AI suggestions validity
    - **Property 9: AI Suggestions Within Date Range**
    - Test that suggested times fall within plan date range
    - **Validates: Requirements 7.4, 7.7**

  - [x] 3.9 Implement scheduling preferences service
    - Create `src/scheduling/scheduling-preferences-service.ts`
    - Implement `getPreferences()`, `savePreferences()`
    - Implement `applyPreferencesToPlan()`
    - _Requirements: 16.1-16.12_

  - [ ]* 3.10 Write property test for preferences round-trip
    - **Property 15: Scheduling Preferences Round-Trip**
    - Test that saved preferences are retrievable unchanged
    - **Validates: Requirements 16.7, 16.11**

  - [x] 3.11 Implement notification service
    - Create `src/scheduling/scheduling-notification-service.ts`
    - Implement `notifyAvailabilitySubmitted()`
    - Implement `notifyPlanReady()`
    - Implement `notifyPlanFinalized()`
    - Implement `notifyPlanCancelled()`
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ]* 3.12 Write property test for notification creation
    - **Property 14: Notification Creation on Events**
    - Test that each event type creates correct notification
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**

- [x] 4. Checkpoint - Backend Services Complete
  - Ensure all backend services compile without errors
  - Run all property tests
  - Ask the user if questions arise

- [x] 5. API Routes
  - [x] 5.1 Create scheduling API routes
    - Create `src/api/routes/scheduling.ts`
    - POST `/api/scheduling/plans` - Create plan
    - GET `/api/scheduling/plans` - List plans with filters
    - GET `/api/scheduling/plans/:id` - Get plan details
    - PUT `/api/scheduling/plans/:id` - Update plan
    - POST `/api/scheduling/plans/:id/finalize` - Finalize plan
    - DELETE `/api/scheduling/plans/:id` - Cancel plan
    - GET `/api/scheduling/plans/:id/ai-suggestions` - Get AI suggestions
    - _Requirements: 2.14, 9.1-9.10, 10.1-10.10, 12.1-12.8_

  - [x] 5.2 Create availability API routes
    - GET `/api/scheduling/availability/:token` - Get plan info for public page
    - POST `/api/scheduling/availability/:token` - Submit availability
    - POST `/api/scheduling/plans/:id/initiator-availability` - Save initiator availability
    - GET `/api/scheduling/plans/:id/availability` - Get all availability for dashboard
    - _Requirements: 4.1-4.14, 5.1-5.7, 6.1-6.10_

  - [x] 5.3 Create preferences API routes
    - GET `/api/scheduling/preferences` - Get user preferences
    - PUT `/api/scheduling/preferences` - Save user preferences
    - _Requirements: 16.1-16.12_

  - [x] 5.4 Create notification API routes
    - GET `/api/scheduling/notifications` - Get user notifications
    - POST `/api/scheduling/notifications/:id/read` - Mark as read
    - GET `/api/scheduling/notifications/unread-count` - Get badge count
    - _Requirements: 13.5, 13.6, 13.7_

  - [x] 5.5 Register routes in main app
    - Import and register scheduling routes in `src/api/index.ts`
    - _Requirements: All API requirements_

- [x] 6. Frontend - Core Components
  - [x] 6.1 Create scheduling page CSS
    - Create `public/css/scheduling.css`
    - Style scheduling page layout, cards, filters
    - Style calendar and list views
    - Style availability grid and dashboard
    - Ensure dark mode support using CSS variables
    - _Requirements: 1.1-1.8, 15.1-15.7_

  - [x] 6.2 Create public availability page CSS
    - Create `public/css/availability-public.css`
    - Style lightweight availability page
    - Style calendar grid for time slot selection
    - Ensure mobile responsiveness
    - _Requirements: 4.1-4.14, 15.1-15.7_

  - [x] 6.3 Implement scheduling page component
    - Create `public/js/scheduling-page.js`
    - Implement page initialization and rendering
    - Implement view toggle (calendar/list) with localStorage persistence
    - Implement filter buttons and filtering logic
    - Implement plan card rendering
    - Implement quick action buttons for circles
    - _Requirements: 1.1-1.8, 10.1-10.10, 17.1-17.6_

  - [ ]* 6.4 Write property test for view preference persistence
    - **Property 17: View Preference Persistence**
    - Test localStorage save and restore
    - **Validates: Requirements 1.7**

  - [x] 6.5 Implement contact picker component
    - Create `public/js/contact-picker.js`
    - Implement search with debounce (300ms)
    - Implement circle filter buttons
    - Implement group filter dropdown
    - Implement "Add all" functionality for circles/groups
    - Implement multi-select with badges
    - _Requirements: 2.2-2.8, 17.3, 17.4_

  - [ ]* 6.6 Write property test for contact filtering
    - **Property 1: Contact Search and Filter Accuracy**
    - Test search results match query
    - Test circle/group filters work correctly
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**

  - [x] 6.7 Implement plan creation modal
    - Create `public/js/plan-creation-modal.js`
    - Implement multi-step form (contacts → details → links)
    - Integrate contact picker component
    - Implement activity type, duration, date range inputs
    - Implement attendance type toggle (must-attend/nice-to-have)
    - Implement preferences application
    - Implement invite link display with copy functionality
    - _Requirements: 2.1-2.17, 3.4-3.7_

- [x] 7. Checkpoint - Core Frontend Complete
  - Ensure scheduling page renders correctly
  - Test plan creation flow end-to-end
  - Ask the user if questions arise

- [x] 8. Frontend - Availability Components
  - [x] 8.1 Create public availability page HTML
    - Create `public/availability.html`
    - Lightweight page structure (no app shell)
    - Calendar grid container
    - Name input and submit button
    - _Requirements: 4.1-4.3_

  - [x] 8.2 Implement public availability page JS
    - Create `public/js/availability-public.js`
    - Implement token extraction from URL
    - Implement plan data loading
    - Implement timezone detection
    - Implement calendar grid rendering with 30-min slots
    - Implement time slot selection (click/tap)
    - Implement availability submission
    - Implement success/error states
    - _Requirements: 4.1-4.14_

  - [ ]* 8.3 Write property test for calendar grid generation
    - **Property 5: Calendar Grid Time Slot Generation**
    - Test correct number of slots for date range
    - Test 30-minute increments
    - **Validates: Requirements 4.5, 4.6, 4.7**

  - [x] 8.4 Implement availability dashboard component
    - Create `public/js/availability-dashboard.js`
    - Implement participant legend
    - Implement availability grid with overlap visualization
    - Implement overlap calculation and highlighting
    - Implement must-attend vs nice-to-have distinction
    - Implement response status tracking
    - Implement AI suggestions panel
    - _Requirements: 6.1-6.10, 7.10, 7.11_

  - [x] 8.5 Implement plan calendar view component
    - Create `public/js/plan-calendar-view.js`
    - Implement monthly calendar display
    - Implement plan event rendering on dates
    - Implement date navigation
    - _Requirements: 10.2, 10.3_

- [x] 9. Frontend - Preferences and Notifications
  - [x] 9.1 Implement scheduling preferences panel
    - Create `public/js/scheduling-preferences.js`
    - Implement preferred days selection
    - Implement preferred time ranges
    - Implement preferred durations
    - Implement favorite locations management
    - Implement default activity type
    - Implement apply-by-default toggle
    - _Requirements: 16.1-16.12_

  - [x] 9.2 Implement notification badge in sidebar
    - Update sidebar navigation to include Scheduling item
    - Add badge component for unread notification count
    - Implement badge update on notification changes
    - _Requirements: 1.2, 1.3, 13.5_

  - [x] 9.3 Implement notification dropdown/panel
    - Create notification list component
    - Implement mark-as-read functionality
    - _Requirements: 13.6, 13.7_

- [x] 10. Frontend - Privacy and Settings
  - [x] 10.1 Implement privacy controls
    - Add privacy settings to scheduling preferences
    - Implement Inner Circle sharing toggle
    - Display privacy indicator on scheduling page
    - _Requirements: 8.1-8.9_

  - [ ]* 10.2 Write property test for privacy enforcement
    - **Property 10: Privacy Setting Enforcement**
    - Test that event details are never exposed
    - Test free/busy only visibility
    - **Validates: Requirements 8.1, 8.3, 8.4**

- [x] 11. Integration and Wiring
  - [x] 11.1 Add scheduling page to main app
    - Update `public/index.html` to include scheduling page container
    - Add scheduling CSS imports
    - Add scheduling JS imports
    - _Requirements: 1.1, 1.4_

  - [x] 11.2 Update sidebar navigation
    - Add "Scheduling" nav item between "Suggestions" and "Edits"
    - Add calendar icon
    - Wire up navigation click handler
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 11.3 Wire up page routing
    - Update app router to handle scheduling page
    - Initialize scheduling page on navigation
    - _Requirements: 1.4_

  - [x] 11.4 Add public availability route
    - Configure Express to serve `availability.html` for `/availability/:token`
    - Ensure no authentication required
    - _Requirements: 4.1, 4.2_

- [x] 12. Final Checkpoint - Feature Complete
  - Ensure all tests pass
  - Test complete user flows:
    - Create plan → Share links → Collect availability → View dashboard → Finalize
    - Public availability page flow
    - Preferences save/load
    - Notification flow
  - Ask the user if questions arise

- [x] 13. Integration and Polish - Phase 2
  - [x] 13.1 Add access to Scheduling Preferences from UI
    - Add "Preferences" button/link on the Scheduling page header
    - Create modal or panel to display SchedulingPreferences component
    - Wire up save/load functionality
    - _Requirements: 16.1, 16.11, 16.12_

  - [x] 13.2 Add access to Privacy Settings from UI
    - Add "Privacy" settings section accessible from Scheduling page
    - Integrate SchedulingPrivacy component into preferences modal
    - Display current privacy status indicator on scheduling page
    - _Requirements: 8.5, 8.6_

  - [x] 13.3 Integrate Availability Dashboard into Plan Details
    - When viewing a plan in "collecting_availability" status, show AvailabilityDashboard
    - Replace simple time selector with full dashboard view
    - Enable slot selection from dashboard for finalization
    - _Requirements: 6.1, 6.2, 6.7_

  - [x] 13.4 Add AI Suggestions button and display
    - Add "Get AI Help" button on availability dashboard
    - Display AI suggestions in a clear, actionable panel
    - Allow applying suggestions with one click
    - _Requirements: 7.10, 7.11_

  - [x] 13.5 Implement initiator availability marking
    - After plan creation, prompt initiator to mark their availability
    - Add "Mark Your Availability" button on plan details
    - Integrate with Google Calendar free/busy if connected
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 13.6 Add notification panel/dropdown
    - Create notification dropdown accessible from scheduling page
    - Show list of recent notifications with read/unread status
    - Allow marking notifications as read
    - _Requirements: 13.5, 13.6, 13.7_

  - [x] 13.7 Implement plan edit functionality
    - Add "Edit Plan" button for non-finalized plans
    - Allow editing date range, activity type, duration, location
    - Allow adding/removing invitees before finalization
    - _Requirements: 12.1, 12.2, 12.7_

  - [x] 13.8 Implement plan cancellation flow
    - Add "Cancel Plan" button with confirmation dialog
    - Invalidate all invite links on cancellation
    - Send cancellation notifications to participants
    - _Requirements: 12.2, 12.3, 12.4_

  - [x] 13.9 Add reminder functionality
    - Add "Send Reminders" button for pending invitees
    - Track which invitees haven't responded
    - Create reminder notifications
    - _Requirements: 12.5_

  - [x] 13.10 Implement plan archiving
    - Auto-archive completed plans after 7 days
    - Add "Past" filter to show archived plans
    - _Requirements: 10.10_

- [x] 14. UX Improvements and Edge Cases
  - [x] 14.1 Improve plan details modal
    - Show full participant list with response status
    - Display invite links with copy buttons
    - Show availability summary when available
    - _Requirements: 6.6, 6.9, 6.10_

  - [x] 14.2 Add loading states and error handling
    - Add loading spinners during API calls
    - Show user-friendly error messages
    - Implement retry logic for failed requests
    - _Requirements: General UX_

  - [x] 14.3 Improve mobile responsiveness
    - Test and fix scheduling page on mobile viewports
    - Ensure touch-friendly interactions
    - Adapt calendar view for small screens
    - _Requirements: 15.1-15.7_

  - [x] 14.4 Add empty state guidance
    - Show helpful message when no plans exist
    - Guide users to create their first plan
    - _Requirements: General UX_

  - [x] 14.5 Implement individual plan support
    - Simplify flow for single-contact plans
    - Skip must-attend/nice-to-have for individual plans
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 14.6 Add plan conversion (individual to group)
    - Allow adding more contacts to an individual plan
    - Convert to group plan automatically
    - _Requirements: 11.6_

- [x] 15. Testing and Documentation
  - [x] 15.1 Create manual test file for scheduling page
    - Create `tests/html/scheduling-page.test.html`
    - Test plan creation flow
    - Test view toggle and filters
    - _Requirements: Testing_

  - [x] 15.2 Create manual test file for availability page
    - Create `tests/html/availability-public.test.html`
    - Test time slot selection
    - Test submission flow
    - _Requirements: Testing_

  - [x] 15.3 Update documentation
    - Add scheduling feature to docs/features/
    - Document API endpoints
    - Add user guide for scheduling
    - _Requirements: Documentation_

- [x] 16. Final Integration Checkpoint
  - Test complete end-to-end flows
  - Verify all UI components are accessible
  - Ensure preferences and privacy settings work
  - Verify AI suggestions integration
  - Test notification flow
  - Ask user for feedback

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: database → services → API → frontend
