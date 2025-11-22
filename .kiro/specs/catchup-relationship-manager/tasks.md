# Implementation Plan

- [x] 1. Project setup and infrastructure
  - [x] 1.1 Initialize Node.js/TypeScript project with package.json
    - Set up TypeScript configuration with strict mode
    - Configure ESLint and Prettier for code quality
    - Add scripts for build, test, and development
    - _Requirements: All (foundational)_

  - [x] 1.2 Set up PostgreSQL database and connection
    - Configure database connection with connection pooling
    - Set up environment variable management (.env files)
    - Create database initialization scripts
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

  - [x] 1.3 Set up testing framework with fast-check for property-based testing
    - Install Jest or Vitest for unit testing
    - Install fast-check for property-based testing
    - Configure test runners and coverage reporting
    - Set minimum 100 iterations for all property tests
    - _Requirements: All (testing foundation)_

  - [x] 1.4 Create project directory structure
    - Create /src with subdirectories: /calendar, /contacts, /notifications, /matching, /voice, /integrations, /db, /utils, /types
    - Set up module boundaries and exports
    - _Requirements: All (code organization)_

- [x] 2. Database schema and models
  - [x] 2.1 Define TypeScript interfaces for all data models
    - Create Contact, Group, Tag, Suggestion, InteractionLog, GoogleCalendar, VoiceNote, AvailabilityParams, NotificationPreferences interfaces
    - Define enums for FrequencyOption, trigger types, interaction types
    - _Requirements: 1.1-1.7, 2.1-2.7, 3.1-3.14, 4.1-4.5, 5.1-5.5_

  - [x] 2.2 Create database migration for core tables
    - Create tables: users, contacts, groups, contact_groups, tags, contact_tags
    - Add indexes on frequently queried fields (userId, contactId, createdAt)
    - Set up foreign key constraints and cascading deletes
    - _Requirements: 1.1-1.7, 2.1-2.7, 4.1-4.5_

  - [x] 2.3 Create database migration for interaction and suggestion tables
    - Create tables: interaction_logs, suggestions, voice_notes, google_calendars
    - Add indexes for efficient querying
    - _Requirements: 5.1-5.5, 9.1-9.5, 10.1-10.5, 21.1-21.4_

  - [x] 2.4 Create database migration for user preferences and configuration
    - Create tables: availability_params, notification_preferences
    - Add user settings and OAuth token storage
    - _Requirements: 7.1-7.8, 12.1-12.5, 20.1-20.5_

  - [ ]* 2.5 Write property test for database persistence
    - **Property 66: Immediate entity persistence**
    - **Validates: Requirements 21.1**

- [x] 3. Contact Service implementation
  - [x] 3.1 Implement Contact CRUD operations
    - Create createContact, updateContact, getContact, listContacts, deleteContact, archiveContact functions
    - Implement repository pattern for database access
    - Add input validation for phone, email, social media handles
    - _Requirements: 1.1, 1.6, 1.7, 18.4, 18.5_

  - [ ]* 3.2 Write property test for contact field persistence
    - **Property 1: Contact field persistence**
    - **Validates: Requirements 1.1, 1.6**

  - [ ]* 3.3 Write property test for complete contact deletion
    - **Property 5: Complete contact deletion**
    - **Validates: Requirements 1.7**

  - [x] 3.4 Create static city timezone dataset
    - Create JSON file with top 100 cities worldwide
    - Include city name, country, IANA timezone identifier, and aliases
    - Cover major cities across all continents and timezones
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 3.5 Implement timezone inference from location
    - Create location-to-timezone mapping service using static dataset
    - Implement fuzzy string matching for location lookups (Levenshtein distance)
    - Handle timezone updates when location changes
    - Add fallback for manual timezone selection when location not found
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ]* 3.6 Write property test for timezone inference
    - **Property 2: Timezone inference from location**
    - **Property 2.1: Manual timezone fallback**
    - **Validates: Requirements 1.2, 1.3, 1.4**

  - [x] 3.7 Implement group management operations
    - Create createGroup, updateGroup, archiveGroup functions
    - Implement assignContactToGroup, bulkAssignContactsToGroup, bulkRemoveContactsFromGroup
    - Create default groups on user initialization
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.8 Write property test for group operations
    - **Property 3: Multiple group membership**
    - **Validates: Requirements 1.5**

  - [ ]* 3.9 Write property test for group name propagation
    - **Property 7: Group name propagation**
    - **Validates: Requirements 2.2**

  - [ ]* 3.10 Write property test for bulk group operations
    - **Property 7.1: Bulk group assignment**
    - **Property 7.2: Bulk group removal**
    - **Validates: Requirements 2.3, 2.4**

  - [x] 3.11 Implement tag management operations
    - Create addTag, removeTag, updateTag, deduplicateTags, promoteTagToGroup functions
    - Implement semantic similarity matching for tag deduplication (cosine similarity, threshold 0.85)
    - Track tag source (voice_memo, manual, notification_reply)
    - _Requirements: 3.13, 3.14, 4.1, 4.2, 4.3, 4.4, 4.5, 2.7_

  - [ ]* 3.12 Write property test for tag deduplication
    - **Property 16: Tag deduplication**
    - **Validates: Requirements 3.14, 4.4**

  - [x] 3.13 Implement interaction logging
    - Create logInteraction and getInteractionHistory functions
    - Update last contact date on interaction logging
    - Support manual and automatic interaction logging
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 3.14 Write property test for interaction logging
    - **Property 20: Interaction logging from suggestion acceptance**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 3.15 Implement frequency preference management
    - Create setFrequencyPreference function
    - Support Daily, Weekly, Monthly, Yearly, Flexible options
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 3.16 Write property test for frequency preference effects
    - **Property 25: Frequency preference affects timing**
    - **Validates: Requirements 6.4, 6.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 5. Google Calendar integration
  - [x] 5.1 Implement Google Calendar OAuth flow
    - Set up OAuth client with read-only permissions
    - Create connectGoogleCalendar function
    - Handle OAuth token storage and refresh
    - _Requirements: 7.1_

  - [x] 5.2 Implement calendar listing and selection
    - Create listUserCalendars function to fetch all user calendars
    - Implement setSelectedCalendars to store user's calendar preferences
    - Add UI support for multi-calendar selection
    - _Requirements: 7.2, 7.3, 7.4_

  - [ ]* 5.3 Write property test for calendar selection
    - **Property 26.1: Calendar selection**
    - **Validates: Requirements 7.3**

  - [x] 5.4 Implement free time slot detection
    - Create getFreeTimeSlots function to scan selected calendars
    - Identify gaps between existing events
    - Handle calendar refresh on data changes
    - _Requirements: 7.5, 7.8_

  - [ ]* 5.5 Write property test for free time slot detection
    - **Property 26.3: Free time slot detection**
    - **Validates: Requirements 7.5**

  - [x] 5.6 Implement availability parameter configuration
    - Create availability parameter storage and retrieval
    - Implement applyAvailabilityParameters to filter time slots
    - Support manual time blocks, commute times, nighttime patterns
    - _Requirements: 7.6, 7.7, 20.1, 20.2, 20.3, 20.4_

  - [ ]* 5.7 Write property test for availability parameter application
    - **Property 28: Availability parameter application**
    - **Validates: Requirements 7.7, 20.4**

  - [x] 5.8 Implement calendar feed publishing
    - Create publishSuggestionFeed function to generate iCal format
    - Support both iCal and Google Calendar subscription formats
    - Implement updateFeedEvent for real-time feed updates
    - Use signed URLs with expiration for security
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 5.9 Write property test for feed updates
    - **Property 31: Feed update on status change**
    - **Validates: Requirements 8.3**

- [-] 6. Voice processing service
  - [x] 6.1 Implement audio transcription
    - Integrate with OpenAI Whisper or Google Speech-to-Text
    - Create transcribeAudio function
    - Store audio files in object storage (S3 or similar)
    - Handle transcription failures gracefully
    - _Requirements: 3.1_

  - [ ]* 6.2 Write property test for voice transcription
    - **Property 10: Voice transcription**
    - **Validates: Requirements 3.1**

  - [x] 6.3 Implement contact disambiguation
    - Create disambiguateContact function using NLP
    - Match transcript mentions to user's contact list
    - Return null for failed disambiguation and continue processing
    - _Requirements: 3.2, 3.3_

  - [ ]* 6.4 Write property test for contact disambiguation
    - **Property 11: Contact disambiguation**
    - **Property 11.1: Contact selection on failed disambiguation**
    - **Validates: Requirements 3.2, 3.3**

  - [x] 6.5 Implement entity extraction from transcripts
    - Create extractEntities function using OpenAI GPT or similar NLP
    - Extract contact fields, tags, groups, last contact date
    - Handle extraction errors with manual entry fallback
    - _Requirements: 3.4_

  - [ ]* 6.6 Write property test for entity extraction
    - **Property 12: Entity extraction**
    - **Validates: Requirements 3.4**

  - [x] 6.7 Implement enrichment confirmation workflow
    - Create generateEnrichmentConfirmation function
    - Present atomic enrichment items for individual review
    - Support contact selection when disambiguation fails
    - Allow editing of field values, tags, and groups before application
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ]* 6.8 Write property test for enrichment confirmation
    - **Property 13: Enrichment confirmation generation**
    - **Property 13.2: Atomic enrichment item presentation**
    - **Validates: Requirements 3.5, 3.6, 3.8**

  - [x] 6.9 Implement enrichment application
    - Create applyEnrichment function
    - Update contact fields, generate and associate tags (1-3 words each)
    - Update group memberships
    - Prefer existing similar tags over creating new ones
    - _Requirements: 3.10, 3.11, 3.12, 3.13_

  - [ ]* 6.10 Write property test for enrichment application
    - **Property 15: Enrichment application**
    - **Property 15.1: Existing tag preference**
    - **Validates: Requirements 3.10, 3.11, 3.12, 3.13**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Suggestion engine implementation
  - [x] 8.1 Implement priority calculation with recency decay
    - Create calculatePriority function
    - Implement applyRecencyDecay based on time since last contact and frequency preference
    - _Requirements: 11.1_

  - [ ]* 8.2 Write property test for priority calculation
    - **Property 41: Priority calculation with recency decay**
    - **Validates: Requirements 11.1**

  - [x] 8.3 Implement contact-to-timeslot matching logic
    - Create matchContactsToTimeslot function
    - Consider availability parameters, proximity, shared interests
    - Prioritize Close Friends group members
    - Respect communication preferences (IRL vs URL)
    - _Requirements: 11.2, 11.3, 11.4_

  - [ ]* 8.4 Write property test for Close Friends prioritization
    - **Property 43: Close Friends prioritization**
    - **Validates: Requirements 11.3**

  - [x] 8.5 Implement timebound suggestion generation
    - Create generateTimeboundSuggestions function
    - Generate suggestions when time since last contact exceeds frequency threshold
    - Match suggestions to available calendar slots
    - Mark trigger type as "timebound"
    - _Requirements: 10.1, 10.2, 10.5_

  - [ ]* 8.6 Write property test for timebound suggestion generation
    - **Property 38: Timebound suggestion generation**
    - **Validates: Requirements 10.1, 10.2**

  - [x] 8.7 Implement shared activity suggestion generation
    - Create generateSharedActivitySuggestions function
    - Detect calendar events suitable for friend invitations
    - Match contacts based on shared interests, proximity, and recency
    - Include event details and reasoning
    - Mark trigger type as "shared_activity"
    - _Requirements: 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 8.8 Write property test for shared activity matching
    - **Property 34: Shared activity interest matching**
    - **Validates: Requirements 9.1**

  - [x] 8.9 Implement suggestion lifecycle management
    - Create acceptSuggestion, dismissSuggestion, snoozeSuggestion functions
    - Generate draft messages on acceptance
    - Add accepted suggestions to calendar feed
    - Create interaction logs on acceptance
    - Store dismissal reasons and update contact data for "met too recently"
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 17.1, 17.2, 17.3, 17.5, 17.6, 17.7_

  - [ ]* 8.10 Write property test for suggestion acceptance
    - **Property 57: Acceptance draft message generation**
    - **Validates: Requirements 16.1**

  - [ ]* 8.11 Write property test for dismissal handling
    - **Property 60: "Met too recently" dismissal handling**
    - **Validates: Requirements 17.5**

  - [x] 8.12 Implement suggestion feed display
    - Create getPendingSuggestions function
    - Display contact name, proposed timeslot, reasoning
    - Support filtering and sorting
    - Handle snoozed suggestions with resurface timing
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 8.13 Write property test for suggestion feed behavior
    - **Property 54: Feed displays pending suggestions**
    - **Property 56: Suggestion snooze behavior**
    - **Validates: Requirements 15.1, 15.2, 15.5**

- [x] 9. Notification service implementation
  - [x] 9.1 Set up SMS integration with Twilio
    - Configure Twilio client with API credentials
    - Implement SMS sending with retry logic
    - Handle delivery failures and logging
    - _Requirements: 12.4, 12.5, 13.3, 13.4_

  - [x] 9.2 Set up email integration with SendGrid
    - Configure SendGrid client with API credentials
    - Implement email sending with retry logic
    - Handle delivery failures and logging
    - _Requirements: 12.5, 13.4_

  - [x] 9.3 Implement notification content generation
    - Create generateNotificationText function
    - Include timeslot, contact name, reasoning, action options
    - Format concisely for SMS delivery
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ]* 9.4 Write property test for notification content
    - **Property 47: Notification content completeness**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4**

  - [x] 9.5 Implement batch notification delivery
    - Create sendBatchNotification function
    - Schedule based on user preferences (default: Sunday 9am)
    - Send for all pending suggestions without calendar events
    - Use job queue (Bull) for reliable delivery
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]* 9.6 Write property test for batch notification delivery
    - **Property 44: Batch notification delivery**
    - **Validates: Requirements 12.1, 12.4, 12.5**

  - [x] 9.7 Implement real-time notification delivery
    - Create sendRealtimeNotification function
    - Trigger immediately for event-tied suggestions
    - Publish to in-app feed simultaneously
    - _Requirements: 13.1, 13.2, 13.5_

  - [ ]* 9.8 Write property test for real-time notification delivery
    - **Property 46: Real-time notification delivery**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**

  - [x] 9.9 Implement notification reply processing
    - Create processIncomingSMS and processIncomingEmail functions
    - Parse replies for suggestion actions (accept, dismiss, snooze)
    - Extract contact metadata from replies using NLP
    - Generate enrichment confirmations for metadata updates
    - Support modification requests via follow-up replies
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.12, 22.13, 22.14, 22.15, 22.16_

  - [ ]* 9.10 Write property test for reply metadata extraction
    - **Property 48: Reply metadata extraction**
    - **Validates: Requirements 22.1, 22.2, 22.3**

  - [ ]* 9.11 Write property test for reply suggestion action processing
    - **Property 52: Reply suggestion action processing**
    - **Validates: Requirements 22.12, 22.13, 22.14**

  - [x] 9.12 Implement notification preferences management
    - Create setNotificationPreferences function
    - Support SMS/email channel configuration
    - Store batch timing preferences
    - _Requirements: 12.2, 12.3, 18.8_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Contact import and onboarding
  - [x] 11.1 Implement Google Contacts import
    - Set up Google Contacts OAuth integration
    - Create importFromGoogleContacts function
    - Extract name, phone, email, and other available fields
    - Deduplicate based on email and phone number
    - _Requirements: 18.1, 19.1, 19.2, 19.3_

  - [ ]* 11.2 Write property test for contact deduplication
    - **Property 63: Contact deduplication**
    - **Validates: Requirements 19.3**

  - [x] 11.3 Implement contact archival for import
    - Display imported contacts with checkboxes
    - Allow marking contacts as not relevant
    - Archive marked contacts while preserving records
    - Maintain restoration capability
    - _Requirements: 18.2, 18.3, 18.4, 18.5_

  - [ ]* 11.4 Write property test for contact archival
    - **Property 65: Contact archival on import**
    - **Validates: Requirements 18.4, 18.5**

  - [x] 11.5 Implement calendar-based friend identification
    - Optionally analyze calendar events for frequent contacts
    - Suggest contacts based on event frequency
    - _Requirements: 19.6_

  - [x] 11.6 Implement initial setup flow
    - Create guided onboarding process
    - Prompt for contact import or manual entry
    - Prompt for Google Calendar connection
    - Prompt for availability parameters
    - Prompt for notification preferences
    - _Requirements: 18.1, 18.6, 18.7, 18.8_

- [x] 12. Account management
  - [x] 12.1 Implement account deletion
    - Create deleteUserAccount function
    - Cascade delete all user data: contacts, groups, tags, suggestions, interactions, voice notes, calendar connections, preferences
    - Send confirmation to user
    - _Requirements: 23.1, 23.2, 23.3_

  - [ ]* 12.2 Write property test for complete account deletion
    - **Property 71: Complete account deletion**
    - **Validates: Requirements 23.1, 23.2**

  - [x] 12.3 Implement test user support
    - Create test user creation functionality
    - Ensure data isolation from production users
    - Support all standard user functionality
    - _Requirements: 24.1, 24.2_

  - [ ]* 12.4 Write property test for test user isolation
    - **Property 74: Test user isolation**
    - **Validates: Requirements 24.2**

- [x] 13. Background jobs and scheduling
  - [x] 13.1 Set up job queue with Bull
    - Configure Redis for job queue
    - Create job processors for suggestion generation, batch notifications, calendar sync
    - Implement retry logic with exponential backoff
    - _Requirements: All (infrastructure)_

  - [x] 13.2 Implement suggestion generation job
    - Schedule to run every 6 hours
    - Generate suggestions for all users in batches
    - Cache suggestions until status changes
    - _Requirements: 9.1-11.4_

  - [x] 13.3 Implement batch notification job
    - Schedule based on user preferences
    - Process all users with pending notifications
    - Track delivery status
    - _Requirements: 12.1-12.5_

  - [x] 13.4 Implement calendar sync job
    - Schedule to run every 30 minutes per user
    - Refresh calendar data from Google Calendar
    - Update availability predictions
    - _Requirements: 7.8, 8.1_

- [x] 14. API layer and web interface
  - [x] 14.1 Create REST API endpoints for contact management
    - POST /contacts, PUT /contacts/:id, GET /contacts/:id, GET /contacts, DELETE /contacts/:id
    - POST /groups, PUT /groups/:id, POST /contacts/bulk/groups
    - POST /tags, PUT /tags/:id, DELETE /tags/:id
    - _Requirements: 1.1-1.7, 2.1-2.7, 4.1-4.5_

  - [x] 14.2 Create REST API endpoints for suggestions
    - GET /suggestions, POST /suggestions/:id/accept, POST /suggestions/:id/dismiss, POST /suggestions/:id/snooze
    - _Requirements: 15.1-15.5, 16.1-16.4, 17.1-17.7_

  - [x] 14.3 Create REST API endpoints for calendar integration
    - POST /calendar/connect, GET /calendar/calendars, PUT /calendar/calendars/selection
    - GET /calendar/feed (iCal subscription)
    - _Requirements: 7.1-7.8, 8.1-8.5_

  - [x] 14.4 Create REST API endpoints for voice notes
    - POST /voice-notes (upload), GET /voice-notes/:id, POST /voice-notes/:id/enrichment
    - _Requirements: 3.1-3.14_

  - [x] 14.5 Create REST API endpoints for preferences
    - PUT /preferences/availability, PUT /preferences/notifications
    - _Requirements: 7.6, 12.2, 20.1-20.5_

  - [x] 14.6 Build web interface for contact management
    - Create contact list view with filtering and search
    - Create contact detail view with all metadata
    - Create group management interface
    - Create tag management interface
    - _Requirements: 1.1-1.7, 2.1-2.7, 4.1-4.5_

  - [x] 14.7 Build web interface for suggestion feed
    - Create suggestion list view with filtering
    - Display contact name, timeslot, reasoning
    - Add accept, dismiss, snooze action buttons
    - _Requirements: 15.1-15.5_

  - [x] 14.8 Build web interface for voice note capture
    - Create audio recording interface
    - Display enrichment confirmation with atomic item review
    - Support contact selection when disambiguation fails
    - Allow editing of enrichment items before application
    - _Requirements: 3.1-3.14_

  - [x] 14.9 Build web interface for onboarding
    - Create guided setup flow
    - Implement contact import with checkbox selection
    - Implement calendar connection flow
    - Implement preference configuration
    - _Requirements: 18.1-18.8_

- [x] 15. Error handling and edge cases
  - [x] 15.1 Implement input validation
    - Validate phone numbers, emails, social media handles
    - Validate location and timezone data
    - Handle invalid calendar data gracefully
    - _Requirements: All (data quality)_

  - [x] 15.2 Implement error handling for external services
    - Handle Google Calendar API failures with cached data
    - Handle SMS/email delivery failures with retries
    - Handle transcription service failures with manual entry fallback
    - Handle NLP service failures gracefully
    - _Requirements: All (reliability)_

  - [x] 15.3 Implement edge case handling
    - Handle contacts without location (manual timezone entry)
    - Handle daylight saving time transitions
    - Handle cross-timezone suggestions (display in both timezones)
    - Handle contacts with no interaction history (use account creation date)
    - Handle contacts with no frequency preference (default to Monthly)
    - Handle calendars with no free slots (notify user)
    - _Requirements: All (robustness)_

  - [x] 15.4 Implement concurrent update handling
    - Use optimistic locking for contact updates
    - Prevent double-booking on concurrent suggestion acceptance
    - Use idempotency keys for notification delivery
    - _Requirements: All (data consistency)_

- [x] 16. Performance optimization and caching
  - [x] 16.1 Implement caching strategy
    - Cache contact lists and profiles (TTL: 5 minutes)
    - Cache calendar free slots (TTL: 1 hour)
    - Cache suggestion lists (invalidate on status change)
    - Use Redis for distributed caching
    - _Requirements: All (performance)_

  - [x] 16.2 Optimize database queries
    - Add indexes on frequently queried fields
    - Implement connection pooling
    - Use read replicas for query-heavy operations
    - _Requirements: All (scalability)_

  - [x] 16.3 Implement rate limiting
    - Add API rate limits per user
    - Handle external API rate limits with backoff
    - Add notification rate limits to prevent spam
    - Add voice upload size and frequency limits
    - _Requirements: All (abuse prevention)_

- [x] 17. Security and privacy
  - [x] 17.1 Implement data encryption
    - Encrypt sensitive data at rest (contact info, notes)
    - Use HTTPS for all API communication
    - Secure OAuth token storage
    - _Requirements: All (security)_

  - [x] 17.2 Implement authentication and authorization
    - Set up user authentication system
    - Implement role-based access control
    - Secure API endpoints with authentication middleware
    - _Requirements: All (security)_

  - [x] 17.3 Implement audit logging
    - Log sensitive operations (account deletion, data export)
    - Track OAuth consent and revocation
    - Monitor for suspicious activity
    - _Requirements: All (compliance)_

- [x] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Documentation and deployment preparation
  - [x] 19.1 Write API documentation
    - Document all REST endpoints with request/response examples
    - Document authentication and authorization
    - Document rate limits and error codes
    - _Requirements: All (developer experience)_

  - [x] 19.2 Write deployment documentation
    - Document environment variables and configuration
    - Document database setup and migrations
    - Document external service setup (Google, Twilio, SendGrid)
    - Document scaling considerations
    - _Requirements: All (operations)_

  - [x] 19.3 Create data export functionality
    - Implement complete user data export for GDPR compliance
    - Support JSON and CSV formats
    - _Requirements: All (compliance)_
