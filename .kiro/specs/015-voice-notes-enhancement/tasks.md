# Implementation Plan

## Overview
This implementation plan breaks down the Voice Notes Enhancement feature into discrete, manageable tasks. Each task builds incrementally on previous work, with checkpoints to ensure tests pass before proceeding.

## Using Context7 for API Integration
Tasks involving external API integrations (Google Cloud Speech-to-Text, Google Gemini API, MediaRecorder API, WebSocket) include **Context7 guidance** with specific search terms. Use Context7 to get:
- Up-to-date API documentation
- Code examples and implementation patterns
- Best practices and configuration options
- Troubleshooting guidance

This ensures you have the latest API information during implementation.

## Task List

- [x] 1. Set up Google Cloud integrations and database schema
- [x] 1.1 Configure Google Cloud Speech-to-Text API credentials
  - Set up service account or API key in environment variables
  - Install `@google-cloud/speech` npm package
  - Create configuration module for Speech-to-Text client
  - _Requirements: 10.1, 10.2_

- [x] 1.2 Configure Google Gemini API credentials
  - Set up API key in environment variables
  - Install `@google/generative-ai` npm package
  - Create configuration module for Gemini client
  - _Requirements: 11.1_

- [x] 1.3 Create database migrations for voice notes schema
  - Create `voice_notes` table with status tracking
  - Create `voice_note_contacts` junction table
  - Create `enrichment_items` table
  - Add indexes for performance
  - _Requirements: 13.1, 13.2, 13.3_

- [x] 1.4 Enhance suggestions schema for group support
  - Add `type` column to suggestions table ('individual' | 'group')
  - Add `shared_context` JSONB column
  - Create `suggestion_contacts` junction table
  - Add indexes for performance
  - _Requirements: 8.1, 8.3_


- [x] 2. Implement Transcription Service with Google Speech-to-Text
- [x] 2.1 Create TranscriptionService class with streaming support
  - **Use Context7**: Get Google Cloud Speech-to-Text streaming examples
  - Search: "Google Cloud Speech-to-Text streaming recognition Node.js"
  - Implement `startStream()` method with LINEAR16 config
  - Implement `sendAudioChunk()` method
  - Implement `closeStream()` method
  - Add event handlers for interim and final results
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [x] 2.2 Add error handling and reconnection logic
  - Implement exponential backoff for retries
  - Handle stream disconnections gracefully
  - Buffer audio chunks during reconnection
  - _Requirements: 10.6_

- [ ]* 2.3 Write unit tests for TranscriptionService
  - Test stream initialization
  - Test audio chunk processing
  - Test interim and final result callbacks
  - Test error recovery
  - _Requirements: 10.1-10.8_

- [x] 3. Implement Entity Extraction Service with Google Gemini API
- [x] 3.1 Create EntityExtractionService class
  - **Use Context7**: Get Gemini API structured output examples
  - Search: "Google Gemini API structured output JSON schema Node.js"
  - Define JSON schema for entity structure
  - Implement `extractForContact()` method
  - Implement `extractGeneric()` method
  - Implement `extractForMultipleContacts()` method
  - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 3.2 Configure Gemini API calls with structured output
  - **Use Context7**: Get Gemini API configuration examples
  - Search: "Google Gemini API responseMimeType responseJsonSchema"
  - Set `responseMimeType` to 'application/json'
  - Pass JSON schema in `responseJsonSchema`
  - Parse and validate JSON responses
  - _Requirements: 11.4, 11.7, 11.9_

- [x] 3.3 Add error handling for extraction failures
  - Return empty entities on API failures
  - Log errors for debugging
  - Handle invalid JSON responses
  - _Requirements: 11.8_

- [ ]* 3.4 Write unit tests for EntityExtractionService
  - Test entity extraction with mock Gemini responses
  - Test JSON schema validation
  - Test error handling
  - Test multi-contact extraction
  - _Requirements: 11.1-11.9_


- [x] 4. Implement Contact Disambiguation Service
- [x] 4.1 Create ContactDisambiguationService class
  - Implement `disambiguate()` method using Gemini
  - Implement `identifyContactNames()` method
  - Implement `matchToContacts()` with fuzzy matching
  - Support identifying multiple contacts
  - _Requirements: 2.1, 2.2_

- [x] 4.2 Add fallback to manual selection
  - Return empty array when no matches found
  - Return partial matches for user review
  - _Requirements: 2.3_

- [ ]* 4.3 Write property test for multi-contact identification
  - **Property 1: Multi-contact association completeness**
  - **Validates: Requirements 2.2**
  - Test that all identified contacts are returned
  - _Requirements: 2.1, 2.2_

- [x] 5. Implement Voice Note Repository
- [x] 5.1 Create VoiceNoteRepository class
  - Implement `create()` method
  - Implement `update()` method
  - Implement `getById()` method
  - Implement `listByUserId()` with filters
  - Implement `delete()` method
  - _Requirements: 13.1-13.8_

- [x] 5.2 Implement multi-contact association methods
  - Implement `associateContacts()` for junction table
  - Implement `getAssociatedContacts()` method
  - Implement `removeContactAssociation()` method
  - _Requirements: 2.2, 2.6_

- [ ]* 5.3 Write property test for voice note persistence
  - **Property 10: Voice note persistence round-trip**
  - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
  - Test create and retrieve returns equivalent data
  - _Requirements: 13.1-13.4_


- [x] 6. Implement Enrichment Service with multi-contact support
- [x] 6.1 Create EnrichmentService class
  - Implement `generateProposal()` for multiple contacts
  - Implement `applyEnrichment()` method
  - Implement `applyTags()` with creation and association
  - Implement `applyGroups()` with creation and assignment
  - Implement `applyFieldUpdates()` with validation
  - _Requirements: 3.5, 4.8, 4.9, 4.10, 4.11_

- [x] 6.2 Add transaction management for enrichment application
  - Wrap enrichment operations in database transactions
  - Rollback on failures
  - Return success/failure summary
  - _Requirements: 4.8_

- [ ]* 6.3 Write property test for entity extraction per contact
  - **Property 2: Entity extraction per contact**
  - **Validates: Requirements 3.1, 3.5**
  - Test N contacts produce N entity results
  - _Requirements: 3.1, 3.5_

- [ ]* 6.4 Write property test for shared information propagation
  - **Property 3: Shared information propagation**
  - **Validates: Requirements 3.3**
  - Test shared info appears in all contact proposals
  - _Requirements: 3.3_

- [ ]* 6.5 Write property test for enrichment item acceptance filtering
  - **Property 11: Enrichment item acceptance filtering**
  - **Validates: Requirements 4.8**
  - Test only accepted items are applied
  - _Requirements: 4.8_

- [ ]* 6.6 Write property tests for tag, group, and field application
  - **Property 13: Tag enrichment application**
  - **Property 14: Group enrichment application**
  - **Property 15: Field enrichment application**
  - **Validates: Requirements 4.9, 4.10, 4.11**
  - Test tags are created and associated
  - Test groups are created and contacts assigned
  - Test fields are updated correctly
  - _Requirements: 4.9, 4.10, 4.11_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [x] 8. Implement Group Matching Service
- [x] 8.1 Create GroupMatchingService class
  - Implement `calculateSharedContext()` scoring algorithm
  - Implement `findPotentialGroups()` method
  - Implement `analyzeVoiceNoteCoMentions()` method
  - _Requirements: 8.3, 8.4, 8.5, 8.6_

- [x] 8.2 Implement shared context scoring algorithm
  - Score common group memberships (30 points max)
  - Score shared tags/interests (30 points max)
  - Score co-mentions in voice notes (25 points max)
  - Score recent group interactions (15 points max)
  - Set threshold at 50 points for group suggestions
  - _Requirements: 8.4, 8.5, 8.6, 9.3, 9.4_

- [ ]* 8.3 Write property test for shared context identification
  - **Property 4: Shared context identification**
  - **Validates: Requirements 8.4, 8.5, 8.6**
  - Test score reflects all factors correctly
  - _Requirements: 8.4, 8.5, 8.6_

- [ ]* 8.4 Write property test for group size constraints
  - **Property 5: Group suggestion membership constraints**
  - **Validates: Requirements 8.3, 9.7**
  - Test groups have 2-3 contacts
  - _Requirements: 8.3, 9.7_

- [x] 9. Enhance Suggestion Service for group support
- [x] 9.1 Update SuggestionService class
  - Implement `generateGroupSuggestion()` method
  - Update `generateSuggestions()` to include groups
  - Implement `balanceSuggestions()` method
  - _Requirements: 8.1, 8.2, 9.1, 9.2_

- [x] 9.2 Implement suggestion balancing logic
  - Generate both individual and group suggestions
  - Sort by priority score
  - Ensure contact uniqueness per batch
  - Apply shared context threshold
  - _Requirements: 8.2, 9.2, 9.5, 9.6, 9.9_

- [x] 9.3 Add group suggestion validation
  - Verify all contacts meet frequency thresholds
  - Match to appropriate calendar slots
  - Validate timeslot accommodates all contacts
  - _Requirements: 8.7, 8.8_

- [ ]* 9.4 Write property test for group frequency validation
  - **Property 6: Group suggestion frequency validation**
  - **Validates: Requirements 8.7**
  - Test all group members exceed frequency threshold
  - _Requirements: 8.7_

- [ ]* 9.5 Write property test for suggestion type balance
  - **Property 7: Suggestion type balance**
  - **Validates: Requirements 8.1, 9.1**
  - Test both types present when eligible
  - _Requirements: 8.1, 9.1_

- [ ]* 9.6 Write property test for shared context threshold
  - **Property 8: Shared context threshold enforcement**
  - **Validates: Requirements 9.5, 9.6, 8.12**
  - Test threshold determines group vs individual
  - _Requirements: 9.5, 9.6, 8.12_

- [ ]* 9.7 Write property test for contact uniqueness
  - **Property 9: Contact uniqueness in suggestion batch**
  - **Validates: Requirements 9.9**
  - Test no contact in multiple suggestions
  - _Requirements: 9.9_


- [x] 10. Implement Voice Note Service orchestration
- [x] 10.1 Create VoiceNoteService class
  - Implement `createSession()` method
  - Implement `processAudioChunk()` method
  - Implement `finalizeVoiceNote()` method
  - Orchestrate transcription → disambiguation → extraction → proposal
  - _Requirements: 1.1-1.9, 2.1-2.6, 3.1-3.6_

- [x] 10.2 Add WebSocket support for real-time updates
  - Set up WebSocket server for audio streaming
  - Emit interim transcript events
  - Emit final transcript events
  - Emit status change events
  - _Requirements: 1.4, 1.5, 7.7_

- [ ]* 10.3 Write integration tests for end-to-end flow
  - Test complete flow: record → transcribe → extract → propose
  - Test with single contact
  - Test with multiple contacts
  - Test with disambiguation failure
  - _Requirements: 1.1-3.6_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement frontend audio recording interface
- [x] 12.1 Create VoiceNoteRecorder React component
  - **Use Context7**: Get browser MediaRecorder API examples
  - Search: "MediaRecorder API getUserMedia microphone React"
  - Implement microphone permission request
  - Implement MediaRecorder setup with LINEAR16
  - Implement record/stop button with visual indicator
  - Implement audio waveform visualization
  - Implement duration timer
  - _Requirements: 1.1, 1.2, 1.8, 12.1-12.8_

- [x] 12.2 Add WebSocket client for real-time transcription
  - **Use Context7**: Get WebSocket client examples for React
  - Search: "WebSocket client React real-time streaming"
  - Connect to backend WebSocket
  - Stream audio chunks to backend
  - Display interim transcripts (gray text)
  - Display final transcripts (black text)
  - _Requirements: 1.4, 1.5, 1.6_

- [x] 12.3 Add error handling and status indicators
  - Handle microphone permission denied
  - Display processing status indicators
  - Show error messages
  - Provide browser compatibility warnings
  - _Requirements: 7.1-7.8, 12.7_


- [x] 13. Implement enrichment review interface
- [x] 13.1 Create EnrichmentReview React component
  - Display proposals grouped by contact
  - Show contact avatars and names
  - Implement expandable/collapsible sections
  - Display enrichment items with checkboxes
  - Show item type, action, field, and value
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 13.2 Add inline editing for enrichment items
  - Implement inline edit mode for values
  - Add field validation based on type
  - Show validation errors
  - _Requirements: 4.5, 4.6_

- [x] 13.3 Add bulk actions and apply functionality
  - Implement Accept All button
  - Implement Reject All button
  - Implement Apply Selected button
  - Show confirmation with change summary
  - _Requirements: 4.7, 4.8, 4.12_

- [x] 14. Implement contact selection UI
- [x] 14.1 Create ContactSelector React component
  - Display contact list with search
  - Implement multi-select checkboxes
  - Show contact cards with avatars, groups, tags
  - Add filter by group or tag
  - Show selected contacts counter
  - Add confirm selection button
  - _Requirements: 5.1-5.7_

- [x] 15. Implement voice notes history view
- [x] 15.1 Create VoiceNotesHistory React component
  - Display voice notes in reverse chronological order
  - Show transcript preview (first 100 chars)
  - Display associated contacts with avatars
  - Show recording date/time
  - Display status badge
  - Show enrichment summary
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 15.2 Add expand/collapse and details view
  - Implement expand to show full transcript
  - Display all enrichment items applied
  - Show which contact each item was applied to
  - _Requirements: 6.4, 6.5, 6.6_

- [x] 15.3 Add filtering and search
  - Implement filter by contact
  - Implement filter by date range
  - Implement filter by status
  - Implement search across transcripts
  - Add delete voice note action
  - _Requirements: 6.7, 6.8_


- [x] 16. Enhance suggestions feed UI for group support
- [x] 16.1 Update SuggestionCard component for group display
  - Add visual distinction for group suggestions
  - Display multiple overlapping avatar circles
  - Show all contact names (e.g., "John, Jane, and Mike")
  - Display shared context badge
  - Show reasoning text explaining grouping
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.7_

- [x] 16.2 Add contact tooltips and interaction
  - Implement hover tooltips for each contact
  - Show contact details in tooltip
  - _Requirements: 14.5_

- [x] 16.3 Add group suggestion actions
  - Implement Accept button with multi-contact draft message
  - Implement Dismiss button with options
  - Add "Remove from group" dropdown for each contact
  - Handle group-to-individual conversion
  - _Requirements: 14.6, 14.7, 14.8, 14.9_

- [x] 16.4 Update suggestions feed layout
  - Intermix group and individual suggestions
  - Sort by priority
  - Ensure proper spacing and visual hierarchy
  - _Requirements: 14.10_

- [ ]* 16.5 Write property test for group contact removal
  - **Property 12: Group suggestion contact removal**
  - **Validates: Requirements 14.8, 14.9**
  - Test removal updates group correctly
  - Test conversion to individual when one remains
  - _Requirements: 14.8, 14.9_

- [x] 17. Implement API endpoints
- [x] 17.1 Create voice note endpoints
  - POST /api/voice-notes/sessions - Create recording session
  - POST /api/voice-notes/:sessionId/finalize - Finalize voice note
  - GET /api/voice-notes/:id - Get voice note by ID
  - GET /api/voice-notes - List voice notes with filters
  - DELETE /api/voice-notes/:id - Delete voice note
  - _Requirements: 1.1-1.9, 6.1-6.8, 13.1-13.8_

- [x] 17.2 Create enrichment endpoints
  - POST /api/voice-notes/:id/enrichment/apply - Apply enrichment
  - PATCH /api/voice-notes/:id/contacts - Update contact associations
  - _Requirements: 4.8, 4.9, 4.10, 4.11_

- [x] 17.3 Update suggestion endpoints for groups
  - Update GET /api/suggestions to include group suggestions
  - Update suggestion response format to include multiple contacts
  - Add shared context data to response
  - _Requirements: 8.1-8.12, 14.1-14.10_


- [ ] 18. Integration and end-to-end testing
- [ ]* 18.1 Write integration tests for Google APIs
  - Test Speech-to-Text streaming with real audio
  - Test Gemini entity extraction with real transcripts
  - Test error handling and retries
  - _Requirements: 10.1-10.8, 11.1-11.9_

- [ ]* 18.2 Write integration tests for database operations
  - Test voice note CRUD with multi-contact associations
  - Test enrichment application transactions
  - Test suggestion generation with groups
  - _Requirements: 13.1-13.8, 4.8-4.11, 8.1-8.12_

- [ ]* 18.3 Write UI component tests
  - Test VoiceNoteRecorder interactions
  - Test EnrichmentReview interactions
  - Test ContactSelector multi-select
  - Test SuggestionCard group display
  - _Requirements: 1.1-1.9, 4.1-4.12, 5.1-5.7, 14.1-14.10_

- [x] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Documentation and deployment preparation
- [x] 20.1 Update API documentation
  - Document new voice note endpoints
  - Document enrichment endpoints
  - Document updated suggestion endpoints
  - Include request/response examples

- [x] 20.2 Update environment configuration guide
  - Document Google Cloud Speech-to-Text setup
  - Document Google Gemini API setup
  - Document required environment variables
  - Include troubleshooting guide

- [x] 20.3 Create user guide for voice notes feature
  - Document recording voice notes
  - Document enrichment review process
  - Document contact selection
  - Document voice notes history
  - Document group suggestions

