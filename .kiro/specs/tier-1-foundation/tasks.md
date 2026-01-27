# Implementation Plan: Tier 1 Foundation

## Overview

This implementation plan covers the four critical path features for CatchUp's Tier 1 Foundation. Tasks are organized to enable incremental progress with early validation of core functionality. The plan prioritizes the Simplified "Manage Circles" Flow as it has the highest impact on user onboarding.

**Estimated Timeline**: 4-6 weeks
**Target Metrics**:
- Landing page conversion rate > 10%
- Onboarding completion rate > 60%
- Time to first circle assignment < 30 seconds

## Tasks

- [x] 1. Database Schema Updates
  - [x] 1.1 Add timezone column to users table
    - Run migration: `ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'`
    - _Requirements: 11.1_
  - [x] 1.2 Add archived_at column to contacts table
    - Run migration: `ALTER TABLE contacts ADD COLUMN archived_at TIMESTAMP DEFAULT NULL`
    - Create index: `CREATE INDEX idx_contacts_archived ON contacts(user_id, archived_at)`
    - _Requirements: 15.1_

- [x] 2. Timezone Preferences Feature
  - [x] 2.1 Create TimezoneService
    - Create `src/calendar/timezone-service.ts`
    - Implement toUserTimezone, fromUserTimezone, formatInUserTimezone methods
    - Use date-fns-tz library for conversions
    - _Requirements: 13.1, 13.4_

  - [ ]* 2.2 Write property test for timezone round-trip conversion
    - **Property 9: Timezone Conversion Round-Trip**
    - **Validates: Requirements 13.1, 13.4**
  - [x] 2.3 Create UserPreferencesService
    - Create `src/users/preferences-service.ts`
    - Implement getTimezone, setTimezone methods
    - Add IANA timezone validation
    - _Requirements: 11.2, 11.4, 11.5_
  - [ ]* 2.4 Write property test for IANA timezone validation
    - **Property 8: IANA Timezone Validation**
    - **Validates: Requirements 11.2**
  - [x] 2.5 Create TimezoneSelector frontend component
    - Create `public/js/timezone-selector.js`
    - Implement searchable dropdown with region groups
    - Add browser timezone auto-detection
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 2.6 Update calendar services to use user timezone
    - Modify `src/calendar/availability-service.ts` line 197
    - Modify `src/calendar/calendar-service.ts` line 426
    - Modify `src/calendar/calendar-event-generator.ts` line 169
    - _Requirements: 13.1, 13.2, 13.3, 13.5_
  - [x] 2.7 Add timezone settings to Preferences page
    - Add timezone selector to existing Preferences page (`#preferences`)
    - Place in a "Display Settings" or "Calendar Settings" section
    - Auto-detect and pre-fill timezone on first visit
    - Wire up API calls to save timezone preference via UserPreferencesService
    - Update existing `loadPreferences()` function in app.js to load timezone
    - _Requirements: 12.6_
  - [x] 2.8 Add timezone API endpoints
    - Add GET /api/users/preferences/timezone endpoint
    - Add PUT /api/users/preferences/timezone endpoint
    - Follow existing auth patterns with `authenticate` middleware
    - _Requirements: 11.4, 11.5_

- [ ] 3. Checkpoint - Timezone Feature Complete
  - Ensure all timezone tests pass, ask the user if questions arise.

- [x] 4. Contact Archival Feature
  - [x] 4.1 Update ContactRepository with archive methods
    - Add previewArchival method to `src/contacts/repository.ts`
    - Add archiveContacts method with soft delete
    - Add restoreContacts method
    - Add findArchived method
    - Update findAll to exclude archived by default
    - Ensure compatibility with existing `findUncategorized` method
    - _Requirements: 14.1, 15.1, 15.2, 16.4_

  - [ ]* 4.2 Write property test for preview invariant
    - **Property 10: Preview Does Not Modify Data**
    - **Validates: Requirements 14.5**
  - [ ]* 4.3 Write property test for archived exclusion
    - **Property 11: Archived Contacts Exclusion**
    - **Validates: Requirements 15.2, 15.3, 15.4**
  - [ ]* 4.4 Write property test for archive/restore round-trip
    - **Property 12: Restore Clears Archived Timestamp**
    - **Validates: Requirements 16.4, 16.5**
  - [x] 4.5 Create archive API endpoints
    - Create `src/api/routes/contacts-archive.ts`
    - Implement GET /api/contacts/archived
    - Implement POST /api/contacts/archive/preview
    - Implement POST /api/contacts/archive
    - Implement POST /api/contacts/:id/restore
    - Implement POST /api/contacts/restore/bulk
    - _Requirements: 14.1, 14.3, 15.1, 16.3, 16.6_
  - [x] 4.6 Create ArchivedContactsView frontend component
    - Create `public/js/archived-contacts-view.js`
    - Implement table view with restore buttons
    - Add bulk selection and bulk restore
    - Follow existing `contacts-table.js` patterns for consistency
    - _Requirements: 16.1, 16.2, 16.3, 16.6, 16.7_
  - [x] 4.7 Integrate archive functionality into Directory page
    - Add "Archive Contacts" action to contact management menu
    - Add "Archived Contacts" view accessible from Directory
    - Display archived count badge
    - Integrate with existing `loadDirectory()` and `switchDirectoryTab()` functions
    - Add new tab or section following existing tab pattern (contacts, circles, groups, tags)
    - _Requirements: 14.2_

- [ ] 5. Checkpoint - Archival Feature Complete
  - Ensure all archival tests pass, ask the user if questions arise.

- [x] 6. Enhanced AI Suggestion Service for Onboarding
  - [x] 6.1 Add calendar event scoring to AI suggestion service
    - Modify `src/contacts/ai-suggestion-service.ts`
    - Add calculateCalendarEventScore method
    - Fetch calendar events and count shared attendees
    - _Requirements: 5.2, 5.3_

  - [x] 6.2 Add metadata richness scoring
    - Add calculateMetadataRichnessScore method
    - Score based on populated fields (birthday, email, phone, etc.)
    - _Requirements: 5.4_
  - [ ]* 6.3 Write property test for metadata richness calculation
    - **Property 4: Metadata Richness Calculation**
    - **Validates: Requirements 5.4**
  - [x] 6.4 Add contact age scoring
    - Add calculateContactAgeScore method
    - Score based on how long contact has existed
    - _Requirements: 5.2_
  - [x] 6.5 Create analyzeContactForOnboarding method
    - Combine all new factors with adjusted weights
    - Calendar events (35%), metadata (30%), age (15%), frequency (10%), recency (10%)
    - _Requirements: 5.2_
  - [ ]* 6.6 Write property test for weighted score calculation
    - **Property 1: Suggestion Scoring Weighted Calculation**
    - **Validates: Requirements 5.2**
  - [ ]* 6.7 Write property test for calendar event prioritization
    - **Property 3: Calendar Event Prioritization**
    - **Validates: Requirements 5.3**

- [x] 7. Quick Start Suggestions API
  - [x] 7.1 Create quick-start-suggestions endpoint
    - Create `src/api/routes/ai-quick-start.ts`
    - Implement GET /api/ai/quick-start-suggestions
    - Return top 10 contacts with >= 85% confidence
    - Include confidence scores and reasoning
    - _Requirements: 5.1, 5.5, 5.6, 17.1, 17.4_
  - [ ]* 7.2 Write property test for confidence threshold filtering
    - **Property 2: Confidence Threshold Filtering**
    - **Validates: Requirements 5.5, 5.13**

- [x] 8. Batch Suggestions API
  - [x] 8.1 Create batch-suggestions endpoint
    - Create `src/api/routes/ai-batch.ts`
    - Implement GET /api/ai/batch-suggestions
    - Group contacts by signal strength (high/medium/low)
    - Return batches with suggested circles
    - _Requirements: 6.1, 6.2, 17.2, 17.5_

  - [ ]* 8.2 Write property test for batch assignment logic
    - **Property 5: Batch Assignment Signal Strength Mapping**
    - **Validates: Requirements 6.1, 6.2**
  - [x] 8.3 Create batch-accept endpoint
    - Add POST /api/contacts/circles/batch-accept to existing routes
    - Use existing batchAssign() from circle-assignment-service
    - Implement atomic transaction (all or nothing)
    - _Requirements: 17.3, 17.6, 17.7_
  - [ ]* 8.4 Write property test for batch atomicity
    - **Property 13: Batch Accept Atomicity**
    - **Validates: Requirements 17.6**

- [ ] 9. Checkpoint - Backend APIs Complete
  - Ensure all API tests pass, ask the user if questions arise.

- [x] 10. Quick Start Flow Frontend
  - [x] 10.1 Create QuickStartFlow component
    - Create `public/js/quick-start-flow.js`
    - Fetch and display top 10 AI suggestions
    - Show contact name, confidence score, and reasoning
    - _Requirements: 5.1, 5.6_
  - [x] 10.2 Implement Accept All functionality
    - Call batch-accept endpoint with all 10 contacts
    - Update circular visualizer in real-time
    - _Requirements: 5.7, 5.10, 5.12_
  - [x] 10.3 Implement Review Individually mode
    - Expand to show individual contact cards
    - Allow per-contact circle selection
    - _Requirements: 5.8_
  - [x] 10.4 Implement Skip for Now
    - Save progress and proceed to next step
    - _Requirements: 5.9, 10.1_

- [x] 11. Undo Toast Component
  - [x] 11.1 Create UndoToast component
    - Create `public/js/undo-toast.js`
    - Display toast with countdown timer
    - Handle undo click within 10-second window
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 11.2 Implement undo state management
    - Store previous state before bulk actions
    - Restore state on undo
    - Clear undo stack after timeout
    - _Requirements: 8.4, 8.5, 8.6_
  - [ ]* 11.3 Write property test for undo round-trip
    - **Property 6: Undo Restores Previous State**
    - **Validates: Requirements 8.4**

- [x] 12. Batch Suggestion Cards Frontend
  - [x] 12.1 Create BatchSuggestionCard component
    - Create `public/js/batch-suggestion-card.js`
    - Display batch summary with count and suggested circle
    - Implement expand/collapse for individual contacts
    - _Requirements: 6.3, 6.4, 6.5, 6.6_
  - [x] 12.2 Implement Accept Batch functionality
    - Call batch-accept endpoint
    - Show undo toast
    - Update progress bar (20-30% per batch)
    - _Requirements: 6.5, 6.8, 6.9_
  - [x] 12.3 Implement Skip Batch
    - Move to next batch without assigning
    - _Requirements: 6.7_

- [x] 13. Quick Refine Interface
  - [x] 13.1 Create QuickRefineCard component
    - Create `public/js/quick-refine-card.js`
    - Display single contact card with circle buttons
    - Show remaining count
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.8_
  - [x] 13.2 Implement swipe gestures for mobile
    - Map swipe directions to circle assignments
    - _Requirements: 7.4, 20.5_
  - [x] 13.3 Implement Done for Now
    - Save progress and exit flow
    - _Requirements: 7.6, 7.7_

- [x] 14. Progress Tracking UI
  - [x] 14.1 Update progress bar component
    - Display percentage and absolute numbers
    - Show estimated time remaining
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 14.2 Write property test for progress calculation
    - **Property 7: Progress Percentage Calculation**
    - **Validates: Requirements 9.1, 9.2**
  - [x] 14.3 Implement milestone celebrations
    - Show celebration animation at 25%, 50%, 75%, 100%
    - Display encouraging messages
    - _Requirements: 9.5, 9.6_
  - [x] 14.4 Add circle capacity indicators
    - Show fill level for each circle
    - Update in real-time
    - _Requirements: 9.4, 9.7_

- [x] 15. Integrate New Flow into Onboarding
  - [x] 15.1 Update Step2CirclesHandler
    - Modify `public/js/step2-circles-handler.js`
    - Replace current flow with QuickStartFlow → BatchSuggestions → QuickRefine
    - Ensure integration with existing `initializeStep2Handler()` in app.js
    - Maintain compatibility with `OnboardingStepIndicator` state management
    - _Requirements: 5.1, 6.1, 7.1_
  - [x] 15.2 Update ManageCirclesFlow for post-onboarding
    - Modify `public/js/manage-circles-flow.js`
    - Add entry point for "Continue Organizing" from Directory
    - Integrate with existing `loadDirectory()` function in app.js
    - Add "Uncategorized" badge to Directory nav using existing `updatePendingEditCounts` pattern
    - _Requirements: 10.3, 10.4, 10.5_
  - [x] 15.3 Add contextual education tips
    - Display tips at each step (progressive disclosure)
    - Explain Dunbar's circles concept
    - Show capacity warnings
    - Integrate with existing `educational-features.js` patterns
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_
  - [x] 15.4 Update OnboardingController integration
    - Ensure new flow works with existing `onboarding-controller.js`
    - Update `ONBOARDING_STEPS` if needed
    - Maintain localStorage state persistence pattern
    - _Requirements: 10.2, 10.5_

- [ ] 16. Checkpoint - Circle Assignment Flow Complete
  - Ensure all circle assignment tests pass, ask the user if questions arise.

- [x] 17. Landing Page
  - [x] 17.1 Create landing page HTML structure
    - Create `public/landing.html`
    - Implement hero section with value proposition
    - Add semantic HTML with proper heading hierarchy
    - _Requirements: 1.1, 1.2, 1.3, 4.2_
  - [x] 17.2 Create landing page styles
    - Create `public/css/landing.css`
    - Implement mobile-first responsive design
    - Style hero, features, testimonials, and CTA sections
    - _Requirements: 1.6, 1.7, 20.1_
  - [x] 17.3 Implement features section
    - Add Dunbar's circles explanation
    - Add feature highlights with icons
    - Explain voice-first capture and smart scheduling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 17.4 Implement social proof section
    - Add testimonials or placeholder content
    - Style with attribution
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 17.5 Add SEO meta tags
    - Add title, description, og:image meta tags
    - Add alt text for all images
    - _Requirements: 4.1, 4.6_
  - [x] 17.6 Integrate auth flow CTAs
    - Link sign-up button to Google SSO authorize endpoint (`/api/auth/google/authorize`)
    - Handle logged-in state (show "Go to Dashboard")
    - Follow existing `google-sso.js` patterns for auth state detection
    - _Requirements: 1.4, 1.5, 18.1, 18.2, 18.5, 18.6_
  - [x] 17.7 Add server route for landing page
    - Update `src/api/index.ts` to serve landing.html at root for unauthenticated users
    - Redirect authenticated users to dashboard (check JWT token)
    - Follow existing route patterns in the Express app
    - _Requirements: 18.3, 18.4_

- [x] 18. Mobile Responsiveness
  - [x] 18.1 Ensure Quick Start flow is mobile-responsive
    - Test and fix layout on viewport >= 320px
    - Use touch-friendly button sizes (44x44px minimum)
    - _Requirements: 20.1, 20.4_
  - [x] 18.2 Ensure Batch Suggestions are mobile-responsive
    - Test and fix layout on mobile viewports
    - _Requirements: 20.2, 20.4_
  - [x] 18.3 Ensure Quick Refine is mobile-responsive
    - Test swipe gestures on touch devices
    - Adapt circular visualizer for smaller screens
    - _Requirements: 20.3, 20.5, 20.6_

- [x] 19. Final Checkpoint - All Features Complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify landing page Lighthouse scores (performance >= 80, accessibility >= 90)
  - Test complete onboarding flow end-to-end
  - Verify time to first circle assignment < 30 seconds

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation order prioritizes backend APIs first, then frontend components
- Timezone and Archival features are independent and can be developed in parallel
- The Circle Assignment flow depends on the enhanced AI Suggestion Service

## Integration Points with Existing Code

**Frontend Integration**:
- New components follow existing patterns in `public/js/` (class-based, event-driven)
- Use existing `showToast()` function for notifications
- Use existing `API_BASE` constant for API calls
- Follow existing auth token pattern (`localStorage.getItem('authToken')`)
- Integrate with `OnboardingStepIndicator` for onboarding state
- Use existing `navigateTo()` function for page navigation

**Backend Integration**:
- New routes follow existing Express router patterns in `src/api/routes/`
- Use existing `authenticate` middleware for protected routes
- Use existing `PostgresContactRepository` patterns for database access
- Follow existing error handling patterns with try/catch and proper HTTP status codes

**State Management**:
- Use existing localStorage patterns for client-side state persistence
- Sync with backend via existing API patterns
- Follow existing event emission patterns (`window.dispatchEvent`)

**Styling**:
- Use existing CSS custom properties from `public/css/styles.css`
- Follow existing responsive breakpoints
- Use existing component class naming conventions
