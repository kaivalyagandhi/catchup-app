# Implementation Plan: V1 Contact Enrichment Redesign

## Overview

Incremental implementation of the CatchUp v1 redesign across 7 workstreams. The plan starts with codebase cleanup (removing scheduling, SMS/Twilio, stale docs) to simplify the codebase, then builds infrastructure (database migrations, auth fixes, frontend modularization), followed by core backend services (parsers, matching, enrichment), and finally frontend features that consume those services.

## Tasks

- [x] 1. Codebase cleanup — remove scheduling, SMS/Twilio, and stale docs
  - [x] 1.1 Remove the scheduling module
    - Delete the entire `src/scheduling/` directory
    - Delete scheduling API routes from `src/api/routes/`: `scheduling.ts`, `scheduling-availability.ts`, `scheduling-preferences.ts`, `scheduling-notifications.ts`
    - Remove scheduling route imports and `app.use` registrations from `src/api/server.ts`
    - Delete scheduling-related frontend files from `public/js/` (files prefixed with `scheduling-`, `plan-`, `availability-`)
    - Delete `public/availability.html` and the `/availability/:token` route
    - Remove `export * from './scheduling'` from `src/types/index.ts`
    - Verify TypeScript compilation passes with `npm run typecheck`
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

  - [x] 1.2 Remove the SMS/Twilio module
    - Delete the entire `src/sms/` directory
    - Delete SMS/Twilio API routes from `src/api/routes/`: `sms-webhook.ts`, `sms-monitoring.ts`, `sms-performance.ts`, `twilio-test.ts`, `phone-number.ts`
    - Remove SMS/Twilio route imports and `app.use` registrations from `src/api/server.ts`
    - Remove SMS delivery from `src/notifications/`, retaining only email (SendGrid) delivery
    - Delete Twilio testing UI files from `public/` if present
    - Verify TypeScript compilation passes with `npm run typecheck`
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

  - [x] 1.3 Remove stale documentation files
    - Delete all implementation-tracking markdown files from the project root matching patterns: `*_COMPLETE.md`, `*_SUCCESS.md`, `*_FIX.md`, `*_GUIDE.md`, `*_SUMMARY.md`, `*_STATUS.md`, `*_TASK.md`, `*_RESEARCH.md`, `*_CHECKLIST.md`, `*_ANALYSIS.md`, `*_PROGRESS.md`, `*_RESULTS.md`
    - Delete README files in `public/js/` subdirectories that document internal implementation details
    - Preserve root `README.md`, `.env.example`, and config files (`.prettierrc.json`, `.gitignore`, `tsconfig.json`)
    - Preserve documentation in `docs/` referenced by active features
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

  - [x] 1.4 Streamline calendar integration — remove browsing/scheduling routes
    - Remove calendar page from main navigation in frontend
    - Remove or disable availability service (free slot calculation), iCal feed generation, and calendar event generator
    - Remove calendar-specific API routes that expose event browsing, availability, or feed endpoints (retain sync + OAuth routes)
    - Retain `src/calendar/calendar-service.ts` and calendar event storage for background enrichment
    - Verify TypeScript compilation passes
    - _Requirements: 23.4, 23.5, 23.6_

- [x] 2. Checkpoint — Verify cleanup
  - Ensure `npm run typecheck` passes with no errors
  - Ensure `npm test` passes for all remaining tests
  - Ask the user if questions arise

- [x] 3. Database migrations and type system updates
  - [x] 3.1 Migrate contacts `source` field to `sources` array
    - Create SQL migration to add `sources TEXT[]` column to `contacts` table
    - Write migration script to copy existing `source` values into `sources` array
    - Update the `Contact` TypeScript interface in `src/types/index.ts` to add `sources: string[]` and deprecate `source`
    - Update `ContactRepository` and `PostgresContactRepository` to read/write `sources` array
    - Update all service code that references `contact.source` to use `contact.sources`
    - _Requirements: 18.1, 18.6_

  - [x] 3.2 Create `import_records` table
    - Create SQL migration with schema from design (id, user_id, platform, file_name, file_hash, status, failed_phase, error_message, total_participants, auto_matched, likely_matched, unmatched, enrichment_records_created, created_at, completed_at)
    - Add indexes: `idx_import_records_user_id`, `idx_import_records_user_status`
    - Add status CHECK constraint
    - _Requirements: 11.1, 12.1_

  - [x] 3.3 Create `interaction_summaries` table
    - Create SQL migration with schema from design (id, import_record_id, participant_identifier, participant_display_name, identifier_type, platform, message_count, first_message_date, last_message_date, avg_messages_per_month, topics JSONB, sentiment, ai_enrichment_status, created_at)
    - Add indexes: `idx_interaction_summaries_import`, `idx_interaction_summaries_participant`
    - _Requirements: 6.1_

  - [x] 3.4 Create `enrichment_records` table
    - Create SQL migration with schema from design (id, contact_id, user_id, import_record_id, interaction_summary_id, platform, message_count, first_message_date, last_message_date, avg_messages_per_month, topics JSONB, sentiment, raw_data_reference, imported_at)
    - Add indexes: `idx_enrichment_records_contact`, `idx_enrichment_records_user`, `idx_enrichment_records_import`
    - _Requirements: 10.4_

  - [x] 3.5 Create `pending_enrichments` table
    - Create SQL migration with schema from design (id, user_id, import_record_id, interaction_summary_id, participant_identifier, participant_display_name, platform, match_tier, suggested_contact_id, confidence, match_reason, status, message_count, first_message_date, last_message_date, created_at, resolved_at)
    - Add indexes: `idx_pending_enrichments_user`, `idx_pending_enrichments_user_status`, `idx_pending_enrichments_import`
    - _Requirements: 7.1, 8.1_

  - [x] 3.6 Create `sync_back_operations` table
    - Create SQL migration with schema from design (id, user_id, contact_id, field, previous_value, new_value, status, google_etag, conflict_google_value, created_at, resolved_at)
    - Add indexes: `idx_sync_back_user`, `idx_sync_back_user_status`, `idx_sync_back_contact`
    - Add status CHECK constraint
    - _Requirements: 13.1_

  - [x] 3.7 Create `in_app_notifications` table
    - Create SQL migration with schema from design (id, user_id, event_type, title, description, action_url, read, created_at)
    - Add indexes: `idx_notifications_user`, `idx_notifications_user_unread` (partial index where read = FALSE), `idx_notifications_created`
    - _Requirements: 26.4_

  - [x] 3.8 Create `suggestion_signal_weights` table
    - Create SQL migration with schema from design (id, user_id, enrichment_data, interaction_logs, calendar_data, contact_metadata, updated_at)
    - Add weights_sum_check constraint
    - Insert global default row (0.25, 0.35, 0.25, 0.15)
    - _Requirements: 17.4_

  - [x] 3.9 Create `nudge_dismissals` table
    - Create SQL migration with schema from design (id, user_id, nudge_type, dismissed_at, show_again_after)
    - Add UNIQUE constraint on (user_id, nudge_type)
    - _Requirements: 2.5_

- [x] 4. Fix inconsistent API authentication
  - [x] 4.1 Audit and migrate routes to JWT auth
    - Audit all API routes under `/api/` and identify routes using query parameter authentication (`?userId=`)
    - Migrate identified routes to use the existing `requireAuth` JWT middleware
    - Remove query parameter-based user identification from migrated routes; extract userId from JWT payload
    - Split any routes serving both authenticated and unauthenticated access into separate endpoints
    - _Requirements: 22.1, 22.2, 22.3, 22.4_

  - [ ]* 4.2 Write property test for JWT auth enforcement
    - **Property 15: JWT authentication on all import/matching endpoints**
    - Test that all protected API routes return 401 when no valid JWT token is provided
    - **Validates: Requirements 7.7, 22.5**

- [x] 5. Checkpoint — Verify infrastructure
  - Ensure all migrations run cleanly against a fresh database
  - Ensure `npm run typecheck` and `npm test` pass
  - Ask the user if questions arise

- [x] 6. Frontend modularization — break app.js into ES modules
  - [x] 6.1 Extract shared utilities into `public/js/utils.js`
    - Create `public/js/utils.js` with ES module exports: `escapeHtml`, `formatDateTime`, `formatRelativeTime`, `fetchWithAuth`, `showToast`, `showConfirm`
    - Extract these functions from `public/js/app.js` into the new module
    - _Requirements: 27.4_

  - [x] 6.2 Create `public/js/app-shell.js` — core application shell
    - Extract sidebar navigation, page routing, authentication state, theme management from `app.js`
    - Import shared utilities from `utils.js`
    - Export `initAppShell`, `navigateTo`, `getCurrentUser`, `getAuthToken`
    - _Requirements: 27.1, 27.3_

  - [x] 6.3 Create `public/js/directory-page.js` — contacts directory module
    - Extract contacts table rendering, filtering, sorting, column picker from `app.js`
    - Import from `utils.js`
    - Wire into `app-shell.js` page routing
    - _Requirements: 27.1, 27.5_

  - [x] 6.4 Create `public/js/suggestions-page.js` — suggestions module
    - Extract suggestions list rendering and interaction from `app.js`
    - Import from `utils.js`
    - Wire into `app-shell.js` page routing
    - _Requirements: 27.1, 27.5_

  - [x] 6.5 Create `public/js/settings-page.js` — settings module
    - Extract settings/preferences UI from `app.js` (will be expanded in task 16)
    - Import from `utils.js`
    - Wire into `app-shell.js` page routing
    - _Requirements: 27.1, 27.5_

  - [x] 6.6 Update `index.html` to use ES module script tags
    - Replace monolithic `<script src="js/app.js">` with `<script type="module" src="js/app-shell.js">`
    - Ensure all existing functionality works identically after modularization
    - Update sidebar navigation to: Home | Directory | Suggestions | Settings (remove Scheduling and Edits nav items)
    - _Requirements: 27.2, 27.5, 3.8_

- [x] 7. Checkpoint — Verify frontend modularization
  - Ensure all existing pages render and function identically
  - Ensure no console errors in browser
  - Ask the user if questions arise

- [ ] 8. Chat history parsers — platform-specific implementations
  - [ ] 8.1 Create parser infrastructure and common interfaces
    - Create `src/chat-import/` directory
    - Implement `src/chat-import/parser.ts` with `ChatParser` interface, `ParseResult`, `Participant`, `ParsedMessage`, `ParseError` types from design
    - Implement `detectPlatform(fileName, headerBytes)` function using file extension and content signatures
    - Implement `src/chat-import/identifier-normalizer.ts` with phone-to-E.164, email-to-lowercase, username-to-lowercase normalization
    - _Requirements: 5.5, 6.4, 24.7_

  - [ ]* 8.2 Write property tests for platform detection and identifier normalization
    - **Property 7: Platform auto-detection from file signatures**
    - **Validates: Requirements 5.5**
    - **Property 9: Participant identifier normalization**
    - **Validates: Requirements 6.4**

  - [ ] 8.3 Implement WhatsApp parser
    - Create `src/chat-import/whatsapp-parser.ts`
    - Handle native text export format with locale-dependent date patterns (`[MM/DD/YY, HH:MM:SS]`, `[DD/MM/YY, HH:MM:SS]`, `[DD.MM.YY, HH:MM:SS]`)
    - Attempt multiple known date format patterns, select the one producing valid dates for the majority of lines
    - Handle multi-line messages and system messages
    - Return `ParseResult` with participants, messages, and errors
    - _Requirements: 24.1, 24.7, 24.8_

  - [ ] 8.4 Implement Instagram parser
    - Create `src/chat-import/instagram-parser.ts`
    - Handle JSON export format from Instagram's "Download Your Information" feature
    - Extract messages from the `messages` array within each conversation
    - Return `ParseResult` with participants, messages, and errors
    - _Requirements: 24.2, 24.7, 24.8_

  - [ ] 8.5 Implement iMessage parser
    - Create `src/chat-import/imessage-parser.ts`
    - Handle CSV exports (from tools like iMazing) with columns for date, sender, message text, attachment indicators
    - Return `ParseResult` with participants, messages, and errors
    - _Requirements: 24.3, 24.7, 24.8_

  - [ ] 8.6 Implement Facebook Messenger parser
    - Create `src/chat-import/facebook-parser.ts`
    - Handle JSON export format from Facebook's "Download Your Information" feature
    - Extract messages from the `messages` array
    - Return `ParseResult` with participants, messages, and errors
    - _Requirements: 24.4, 24.7, 24.8_

  - [ ] 8.7 Implement X/Twitter DM parser
    - Create `src/chat-import/twitter-parser.ts`
    - Handle JSON export format from Twitter's data download
    - Extract messages from `dmConversation` objects
    - Return `ParseResult` with participants, messages, and errors
    - _Requirements: 24.5, 24.7, 24.8_

  - [ ] 8.8 Implement Google Messages/SMS parser
    - Create `src/chat-import/google-messages-parser.ts`
    - Handle XML files from "SMS Backup & Restore" Android app using SAX-style streaming
    - Extract messages from `<sms>` elements with attributes: `address`, `body`, `date`, `type`, `contact_name`
    - Return `ParseResult` with participants, messages, and errors
    - _Requirements: 24.6, 24.7, 24.8_

  - [ ]* 8.9 Write property tests for parser correctness
    - **Property 8: Parser produces one InteractionSummary per unique participant**
    - **Validates: Requirements 6.1**
    - **Property 41: Platform parsers produce valid ParseResult**
    - **Validates: Requirements 24.1–24.7**
    - **Property 42: Parser graceful degradation**
    - **Validates: Requirements 24.8**
    - **Property 43: ParseResult JSON round-trip**
    - **Validates: Requirements 24.10**

  - [ ] 8.10 Implement InteractionSummary generation from ParseResult
    - Create `src/chat-import/interaction-summary-generator.ts`
    - Generate one InteractionSummary per unique participant from ParseResult
    - Compute message_count, first_message_date, last_message_date, avg_messages_per_month
    - Normalize participant identifiers using identifier-normalizer
    - Store interaction summaries in the `interaction_summaries` table
    - _Requirements: 6.1, 6.4_

  - [ ]* 8.11 Write property test for InteractionSummary round-trip
    - **Property 10: InteractionSummary JSON round-trip**
    - **Validates: Requirements 6.5**

- [ ] 9. Contact matching engine
  - [ ] 9.1 Implement tiered contact matching
    - Create `src/chat-import/matching.ts` with `MatchingEngine` interface from design
    - Implement `matchParticipants(userId, participants)` returning `ContactMatch[]`
    - Auto-match (≥0.7): phone exact match (E.164), email exact match (case-insensitive), social handle exact match
    - Likely match (0.5–0.7): name fuzzy match with nickname/alias support
    - Unmatched (<0.5): no plausible match found
    - Classify each participant into the correct tier based on confidence score
    - _Requirements: 7.1_

  - [ ]* 9.2 Write property tests for matching engine
    - **Property 11: Tiered matching threshold classification**
    - **Validates: Requirements 7.1**
    - **Property 12: Unmatched participants sorted by message frequency**
    - **Validates: Requirements 7.3**
    - **Property 13: High-frequency unmatched participants get smart suggestion**
    - **Validates: Requirements 7.4**
    - **Property 14: Confirmed match creates enrichment record**
    - **Validates: Requirements 7.6**

  - [ ] 9.3 Implement match result persistence
    - Auto-matches: create `enrichment_records` linking interaction_summary to matched contact
    - Likely matches: create `pending_enrichments` with match_tier='likely', suggested_contact_id, confidence, match_reason
    - Unmatched: create `pending_enrichments` with match_tier='unmatched', sorted by message_count descending
    - Flag top 20% unmatched by message count with smart suggestion
    - Update import_record statistics (auto_matched, likely_matched, unmatched counts)
    - _Requirements: 7.1, 7.3, 7.4, 7.6_

- [ ] 10. Chat import pipeline — upload, job processing, and AI enrichment
  - [ ] 10.1 Implement import upload API endpoint
    - Create `src/api/routes/imports.ts` with `POST /api/imports/upload`
    - Accept multipart file upload (max 200MB via streaming middleware)
    - Auto-detect platform using `detectPlatform`
    - Reject files >200MB with user-friendly error
    - Reject unrecognized formats with descriptive error
    - Check concurrent import limit (max 3 per user); reject with `IMPORT_LIMIT_EXCEEDED` if exceeded
    - Check file hash dedup against existing import_records
    - Create `import_record` with status 'processing'
    - Enqueue parse job via Google Cloud Tasks
    - Return `{ jobId, status: 'processing' }`
    - Register route in `src/api/server.ts` with JWT auth
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 11.1, 11.6, 12.6_

  - [ ]* 10.2 Write property test for concurrent import limit
    - **Property 23: Maximum 3 concurrent imports per user**
    - **Validates: Requirements 11.6**

  - [ ] 10.3 Implement import job handler
    - Add import parse job type to `src/api/jobs-handler.ts`
    - Stream-parse the uploaded file using the platform-specific parser
    - Store interaction_summaries in the database
    - Run tiered matching via the matching engine
    - Update import_record status to 'parsed' and statistics
    - Enqueue AI enrichment job via Cloud Tasks
    - Create "import complete" in-app notification
    - _Requirements: 6.1, 6.2, 7.1, 11.3_

  - [ ] 10.4 Implement AI enrichment job handler
    - Add AI enrichment job type to `src/api/jobs-handler.ts`
    - Batch messages (up to 100 per batch) and call Google Gemini API for topic extraction and sentiment analysis
    - Update interaction_summaries with topics and sentiment
    - Update ai_enrichment_status to 'complete' (or 'failed' after retries)
    - Create "AI enrichment ready" in-app notification
    - _Requirements: 6.2, 6.3_

  - [ ] 10.5 Implement import status polling and history endpoints
    - Add `GET /api/imports/:jobId/status` — return current phase, percentage, matched count
    - Add `GET /api/imports/history` — list import_records sorted by date descending
    - Add `DELETE /api/imports/:importId` — delete import and cascade to enrichment_records, pending_enrichments; recalculate affected contacts' lastContactDate
    - Add `POST /api/imports/:importId/reimport` — re-import with new file replacing previous data
    - All endpoints require JWT auth
    - _Requirements: 11.2, 11.3, 11.5, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 10.6 Write property tests for import lifecycle
    - **Property 22: Import completion statistics are consistent**
    - **Validates: Requirements 11.3**
    - **Property 24: Import history sorted by date descending**
    - **Validates: Requirements 12.1**
    - **Property 25: Import deletion cascades correctly**
    - **Validates: Requirements 12.4**
    - **Property 26: Raw message content not persisted**
    - **Validates: Requirements 12.6**

  - [ ] 10.7 Implement match review endpoints
    - Add `GET /api/imports/:importId/matches` — get likely matches for review with participant name, suggested contact, confidence, match reason
    - Add `POST /api/imports/matches/:matchId/confirm` — confirm a likely match, create enrichment_record
    - Add `POST /api/imports/matches/:matchId/reject` — reject a match
    - Add `POST /api/imports/matches/:matchId/skip` — skip for later (remains as pending_enrichment)
    - All endpoints require JWT auth
    - _Requirements: 7.2, 7.5, 7.6, 7.7_

- [ ] 11. Pending enrichment review queue
  - [ ] 11.1 Implement pending enrichment API endpoints
    - Add `GET /api/enrichments/pending` — get pending enrichments grouped by import (platform and date), sorted by message_count descending for unmatched
    - Add `POST /api/enrichments/pending/:id/link` — link pending enrichment to existing contact via searchable contact picker; create enrichment_record
    - Add `POST /api/enrichments/pending/:id/create-contact` — create new contact pre-populated with participant identifiers; link as enrichment_record
    - Add `POST /api/enrichments/pending/:id/dismiss` — mark as dismissed, hide from default view
    - Register routes in `src/api/server.ts` with JWT auth
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 11.2 Write property tests for pending enrichment queue
    - **Property 16: Pending enrichment grouping by import**
    - **Validates: Requirements 8.1**
    - **Property 17: Create contact from pending enrichment pre-populates fields**
    - **Validates: Requirements 8.4**
    - **Property 18: Dismissed pending enrichments hidden from default view**
    - **Validates: Requirements 8.5**
    - **Property 19: Pending enrichment badge count accuracy**
    - **Validates: Requirements 8.6**

- [ ] 12. Checkpoint — Verify chat import pipeline
  - Ensure all parser tests pass
  - Ensure matching engine tests pass
  - Ensure import lifecycle tests pass
  - Ask the user if questions arise

- [ ] 13. Contact enrichment display and data management
  - [ ] 13.1 Implement enrichment record API endpoints
    - Add `GET /api/contacts/:id/enrichments` — get all enrichment records for a contact with per-platform breakdown
    - Add `DELETE /api/contacts/:id/enrichments/:enrichmentId` — delete an enrichment record, revert contact's lastContactDate to next most recent value
    - Implement aggregation logic: sum message counts, use most recent lastMessageDate, produce per-platform breakdown
    - Update contact's lastContactDate when enrichment record has a more recent date
    - Register routes in `src/api/server.ts` with JWT auth
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 13.2 Write property tests for enrichment data integrity
    - **Property 20: Enrichment record aggregation across platforms**
    - **Validates: Requirements 9.3, 9.4, 10.2**
    - **Property 21: lastContactDate reflects most recent interaction across all sources**
    - **Validates: Requirements 10.3, 10.5, 23.9**

  - [ ] 13.3 Add source tracking to contact operations
    - Update contact creation/enrichment flows to add 'chat_import' to sources array on chat import
    - Update contact creation to add 'apple' to sources array on vCard import
    - Ensure sources array never contains duplicates
    - Add `GET /api/contacts?source=` filter parameter for filtering contacts by source
    - _Requirements: 18.2, 18.3, 18.5_

  - [ ]* 13.4 Write property tests for source tracking
    - **Property 5: Contact source badges match sources array**
    - **Validates: Requirements 4.3, 9.5, 18.4**
    - **Property 39: Source array updated on enrichment**
    - **Validates: Requirements 18.2, 18.3**
    - **Property 40: Contact filtering by source**
    - **Validates: Requirements 18.5**

- [ ] 14. Google sync-back service
  - [ ] 14.1 Implement Google sync-back service
    - Create `src/integrations/google-sync-back-service.ts` with `GoogleSyncBackService` interface from design
    - Implement `createSyncBackOperation` — create pending_review operation when user edits name/phone/email/customNotes on a Google-synced contact
    - Implement `getPendingOperations` — get all pending_review operations for a user
    - Implement `approveOperations` — mark as approved, enqueue Cloud Tasks jobs to push to Google People API
    - Implement `skipOperations` — mark as skipped
    - Implement `undoOperation` — revert change locally and on Google Contacts
    - Implement `handleConflict` — fetch latest from Google on 409, update diff, set status to 'conflict'
    - Use googleEtag for optimistic concurrency control
    - _Requirements: 13.1, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [ ] 14.2 Implement sync-back API routes
    - Add `GET /api/sync-back/pending` — get pending sync-back operations with diff view data
    - Add `POST /api/sync-back/approve` — approve selected operations (bulk approve supported)
    - Add `POST /api/sync-back/skip` — skip selected operations
    - Add `POST /api/sync-back/:id/undo` — undo a synced operation
    - Register routes in `src/api/server.ts` with JWT auth
    - _Requirements: 13.2, 13.3, 13.8_

  - [ ] 14.3 Implement incremental OAuth scope upgrade
    - When user first attempts to approve a sync-back, check if current OAuth scope is read-only
    - If read-only, trigger incremental authorization prompt for `https://www.googleapis.com/auth/contacts` (read-write)
    - _Requirements: 13.9_

  - [ ]* 14.4 Write property tests for sync-back service
    - **Property 27: Contact field edit creates sync-back operation**
    - **Validates: Requirements 13.1**
    - **Property 28: Sync-back operation count accuracy**
    - **Validates: Requirements 13.2**
    - **Property 29: Successful sync-back updates etag and timestamp**
    - **Validates: Requirements 13.7**
    - **Property 30: Sync-back undo restores previous value**
    - **Validates: Requirements 13.8**

- [ ] 15. Apple Contacts import/export via vCard
  - [ ] 15.1 Implement vCard parser and printer
    - Create `src/contacts/apple-contacts-service.ts` with `AppleContactsService` interface from design
    - Implement `parseVCard(fileContent)` — parse vCard 3.0 and 4.0 formats, extract FN/N, TEL, EMAIL, ORG, ADR, X-SOCIALPROFILE/IMPP, NOTE
    - Skip malformed entries gracefully, log errors, continue parsing
    - Implement `printVCard(contacts)` — serialize contacts to valid vCard 4.0 format
    - _Requirements: 14.1, 14.2, 14.3, 14.6_

  - [ ] 15.2 Implement vCard import and export endpoints
    - Implement `importVCard(userId, fileContent)` — match imported contacts against existing using matching logic from Req 7, merge for matches, create for new
    - Add 'apple' to sources array for imported contacts
    - Implement `exportToVCard(userId, contactIds?)` — serialize selected or all contacts to vCard 4.0
    - Add `POST /api/contacts/import-vcard` and `GET /api/contacts/export-vcard` routes with JWT auth
    - Register routes in `src/api/server.ts`
    - _Requirements: 14.4, 14.5_

  - [ ]* 15.3 Write property test for vCard round-trip
    - **Property 31: vCard round-trip**
    - **Validates: Requirements 14.7**

- [ ] 16. Contact archival and bulk operations
  - [ ] 16.1 Implement contact archival
    - Add `previewArchival` endpoint returning contacts that would be archived with name, email, phone, groups, circle
    - Implement archive: set `archived_at` timestamp, exclude from default list, suggestions, circle/group views
    - Implement restore: clear `archived_at`, restore to default list with all previous assignments intact
    - Add "Archived Contacts" view endpoint returning archived contacts sorted by `archived_at` descending
    - Add archived count endpoint for badge display
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 16.2 Write property tests for archival
    - **Property 32: Archive/restore round-trip**
    - **Validates: Requirements 15.2, 15.4**
    - **Property 33: Archived contacts excluded from default views**
    - **Validates: Requirements 15.2, 15.3**

  - [ ] 16.3 Implement bulk contact operations
    - Add `POST /api/contacts/bulk` endpoint accepting `{ contactIds: string[], operation: string, params: object }`
    - Implement bulk archive, add tag, assign group, assign circle — all in single database transactions
    - Enforce 200-contact limit per request
    - Roll back entire transaction on any failure, return error identifying which contacts failed
    - Register route in `src/api/server.ts` with JWT auth
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

  - [ ]* 16.4 Write property test for bulk operations
    - **Property 34: Bulk operations apply atomically**
    - **Validates: Requirements 16.3, 16.4, 16.5, 16.6, 16.7**

- [ ] 17. In-app notification system
  - [ ] 17.1 Implement notification service
    - Create `src/notifications/in-app-notification-service.ts` with `InAppNotificationService` interface from design
    - Implement `create`, `getUnread`, `getAll` (paginated), `markAsRead`, `markAllAsRead`, `getUnreadCount`, `deleteOlderThan`
    - Implement `NotificationChannel` abstraction interface with in-app channel as first implementation
    - _Requirements: 26.1, 26.4, 26.8_

  - [ ] 17.2 Implement notification API routes
    - Add `GET /api/notifications` — paginated notification list sorted by timestamp descending
    - Add `GET /api/notifications/unread-count` — unread count for badge
    - Add `POST /api/notifications/:id/read` — mark single notification as read
    - Add `POST /api/notifications/mark-all-read` — mark all as read
    - Register routes in `src/api/server.ts` with JWT auth
    - _Requirements: 26.1, 26.2, 26.5, 26.6_

  - [ ] 17.3 Implement notification event triggers
    - Wire notification creation into: import complete, import failed, AI enrichment ready, sync conflict, pending enrichments reminder (48h after import)
    - Implement export reminder notification (24h after "My export isn't ready yet" from import wizard)
    - Implement auto-delete of notifications older than 30 days via scheduled cleanup
    - _Requirements: 26.3, 26.7_

  - [ ]* 17.4 Write property tests for notification service
    - **Property 45: Notification unread count accuracy**
    - **Validates: Requirements 26.1**
    - **Property 46: Notifications sorted by timestamp descending**
    - **Validates: Requirements 26.2**
    - **Property 47: Mark all as read sets all to read**
    - **Validates: Requirements 26.6**
    - **Property 48: Auto-delete notifications older than 30 days**
    - **Validates: Requirements 26.7**

- [ ] 18. AI suggestion engine — enrichment signals
  - [ ] 18.1 Update AI suggestion engine with enrichment data signals
    - Update `src/matching/suggestion-service.ts` to incorporate enrichment record data (communication frequency, recency, sentiment) as signal factors
    - Implement configurable signal weights from `suggestion_signal_weights` table (defaults: enrichment 0.25, interaction logs 0.35, calendar 0.25, metadata 0.15)
    - When enrichment data exists, use enrichment signal proportional to its weight
    - When no enrichment data exists, re-weight remaining signals proportionally
    - Increase priority score when declining communication frequency detected (current month avg < 50% of 6-month avg)
    - Include sentiment context in suggestion reasoning when negative sentiment trend detected
    - Log which signal weights contributed to each suggestion
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [ ] 18.2 Implement suggestion weights API
    - Add `GET /api/suggestion-weights` — get current signal weights
    - Add `PUT /api/suggestion-weights` — update signal weights (validate sum ≈ 1.0)
    - Register routes in `src/api/server.ts` with JWT auth
    - _Requirements: 17.4_

  - [ ]* 18.3 Write property tests for AI suggestion engine
    - **Property 35: AI suggestion engine handles presence and absence of enrichment data**
    - **Validates: Requirements 17.1, 17.5**
    - **Property 36: Declining frequency increases suggestion priority**
    - **Validates: Requirements 17.2**
    - **Property 37: Negative sentiment included in reasoning**
    - **Validates: Requirements 17.3**
    - **Property 38: Signal weights sum to 1.0**
    - **Validates: Requirements 17.4**

- [ ] 19. Calendar enrichment streamlining
  - [ ] 19.1 Update calendar sync to feed contact enrichment
    - Update `src/calendar/calendar-service.ts` to extract attendee co-occurrence data (who user meets with, frequency, most recent meeting date)
    - Store calendar-derived enrichment on Contact records: meeting count, last meeting date, meeting frequency
    - Use user's stored timezone preference for date calculations (default to UTC if not set)
    - When calendar sync detects a meeting attendee matching an existing contact, update lastContactDate if meeting date is more recent
    - _Requirements: 23.1, 23.2, 23.3, 23.9_

- [ ] 20. Checkpoint — Verify backend services
  - Ensure all backend service tests pass
  - Ensure `npm run typecheck` passes
  - Ask the user if questions arise

- [ ] 21. Progressive onboarding updates
  - [ ] 21.1 Update onboarding service for progressive flow
    - Update `src/contacts/onboarding-service.ts` to make 'welcome' and 'circle_assignment' steps optional post-onboarding activities
    - After Google SSO, trigger Google Contacts sync in background, show loading state
    - On sync complete, redirect to Home Dashboard instead of requiring circle assignment
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [ ] 21.2 Implement nudge dismissal logic
    - Implement nudge visibility logic: "Get deeper insights" (after dashboard view), "Organize your circles" (uncategorized > 10), "Set catchup frequency" (after first circle assignment), "Import more platforms" (after first chat import)
    - Store dismissals in `nudge_dismissals` table with 7-day cooldown
    - Add API endpoint to dismiss a nudge and query visible nudges
    - _Requirements: 2.4, 2.5_

  - [ ]* 21.3 Write property test for nudge dismissal cooldown
    - **Property 1: Nudge dismissal respects 7-day cooldown**
    - **Validates: Requirements 2.5**

- [ ] 22. Dashboard API
  - [ ] 22.1 Implement home dashboard API endpoint
    - Add `GET /api/dashboard` returning:
      - Action items: pending enrichments count, pending sync changes count, active import jobs count, pending likely matches count
      - Relationship insights: total contacts, contacts with enrichment data, top 5 "catch up soon" suggestions, stale relationships count (no interaction in 3+ months)
      - Quick action links
      - Visible nudge cards (from onboarding service)
    - Handle zero state: show total contacts from Google, contacts with phone/email, "Get started" card
    - Require JWT auth
    - Register route in `src/api/server.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.9_

  - [ ]* 22.2 Write property test for dashboard accuracy
    - **Property 2: Dashboard action item counts are accurate**
    - **Validates: Requirements 3.2**

- [ ] 23. Contacts table enrichment columns
  - [ ] 23.1 Add enrichment columns to contacts table API
    - Update contacts list API to include: last interaction date (most recent across all sources, formatted as relative time), relationship health indicator (green/yellow/red/gray), platform source icons, top topic tag
    - Implement health indicator computation: green (within frequency window), yellow (within 1.5×), red (beyond 1.5×), gray (no data)
    - Add sorting by "Last Interaction" column (ascending/descending)
    - Add column configuration endpoint for show/hide enrichment columns
    - Default columns: Name, Last Interaction, Health Indicator, Sources, Circle, Groups
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 23.2 Write property tests for enrichment columns
    - **Property 3: Relationship health indicator is deterministic**
    - **Validates: Requirements 4.2**
    - **Property 4: Relative time formatting is correct**
    - **Validates: Requirements 4.1**
    - **Property 6: Contacts table sorting by last interaction**
    - **Validates: Requirements 4.6**

- [ ] 24. Unified settings page API
  - [ ] 24.1 Implement settings API endpoints
    - Add `GET /api/settings` — return all user settings: profile (name, email, timezone), notification preferences, connected accounts (Google sync status, scope level, calendar status, pending sync count), display preferences (theme, keyboard shortcuts)
    - Add `PUT /api/settings` — update settings with auto-save behavior
    - Implement timezone search by city name or timezone identifier
    - Register routes in `src/api/server.ts` with JWT auth
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

  - [ ]* 24.2 Write property test for timezone search
    - **Property 44: Timezone search returns matching results**
    - **Validates: Requirements 25.4**

- [ ] 25. Checkpoint — Verify all backend APIs
  - Ensure all API endpoints return correct responses
  - Ensure all property tests pass
  - Ensure `npm run typecheck` passes
  - Ask the user if questions arise

- [ ] 26. Landing page redesign
  - [ ] 26.1 Update landing page content and layout
    - Update hero section headline and subtitle to reflect v1 value proposition (relationship intelligence from real conversation data)
    - Remove messaging about scheduling and SMS reminders
    - Update features section to highlight: import chat history, see who you talk to most, AI-powered catchup suggestions, organize contacts into circles/groups, sync across Google and Apple contacts
    - Update "How it works" section: Sign in with Google → See contacts with relationship context → Import chat history → Get catchup suggestions
    - Update testimonials to reflect relationship intelligence value proposition
    - Retain Stone & Clay design system aesthetic, dark/light theme toggle, responsive layout
    - Display "Get Started with Google" primary CTA and "Learn More" secondary CTA
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 27. Home dashboard frontend
  - [ ] 27.1 Create `public/js/home-dashboard.js` module
    - Implement dashboard page rendering consuming `GET /api/dashboard`
    - Render "Action Items" section: pending enrichments, pending sync changes, active imports, pending likely matches — each as a clickable card linking to the relevant view
    - Render "Relationship Insights" section: total contacts, enriched contacts, top 5 "catch up soon" suggestions, stale relationships count
    - Render "Quick Actions" section: Import Chat History, Record Voice Note, View All Contacts, Organize Circles
    - Render contextual nudge cards from progressive onboarding
    - Handle zero state with "Get started" card
    - Update action item counts on page focus without full reload
    - Responsive single-column layout on mobile
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9_

  - [ ] 27.2 Wire dashboard as default authenticated page
    - Update `app-shell.js` routing to make Home Dashboard the default page
    - Move Edits functionality access to dashboard action items and contact detail panel (remove from nav)
    - _Requirements: 3.1, 3.8_

- [ ] 28. Import wizard frontend
  - [ ] 28.1 Create `public/js/import-wizard.js` module
    - Implement platform selection screen with icons for WhatsApp, Instagram, Facebook Messenger, iMessage, X/Twitter DMs, Google Messages/SMS
    - Highlight WhatsApp with "Fastest — export in under a minute" label
    - Implement platform-specific step-by-step export instructions screen
    - Implement "My export isn't ready yet" option — save pending import, trigger 24h email reminder notification
    - Implement drag-and-drop file upload area with auto-detection of platform/format
    - Show inline progress indicator during import (phase, percentage, matched count) polling `GET /api/imports/:jobId/status`
    - Show import summary on completion: total participants, auto-matched, likely matches, unmatched, enrichment records
    - Provide links to: Review Likely Matches, Review Pending Enrichments, View Contacts
    - Show error with retry option on failure
    - Entry points: Home Dashboard quick actions, Directory page, onboarding nudge card
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 11.2, 11.3, 11.4, 11.5_

- [ ] 29. Contact detail panel frontend
  - [ ] 29.1 Create `public/js/contact-detail-panel.js` module
    - Implement slide-out panel from right side when clicking a contact in the table
    - Display core fields (name, phone, email, social handles, location, timezone, notes) with inline edit capability
    - Display "Relationship Summary" section: last interaction date, total message count, frequency trend, overall sentiment
    - Display "Enrichment Sources" section: per-platform cards with icon, message count, date range, topics, sentiment
    - Display source badges for all contributing platforms
    - Display circle assignment, group memberships, tags with edit capability
    - Display sync status indicator (synced / pending changes / has conflicts) with last sync timestamp
    - Display calendar-derived data: meeting count, last meeting date
    - Trap keyboard focus within panel, support Escape to close
    - Support arrow-up/arrow-down keyboard navigation to move between contacts (master-detail pattern)
    - Responsive: full-screen view on mobile
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 10.1, 10.2, 13.10, 23.7_

- [ ] 30. Directory page enrichment updates
  - [ ] 30.1 Update `public/js/directory-page.js` with enrichment columns
    - Add "Last Interaction" column with relative time formatting
    - Add Relationship Health Indicator column (green/yellow/red/gray dots)
    - Add platform source icons next to contact names
    - Add top topic tag column
    - Implement column picker dropdown for show/hide enrichment columns
    - Implement sorting by "Last Interaction" column
    - Add multi-select mode with checkboxes for bulk operations
    - Add bulk action toolbar: Archive, Add Tag, Assign to Group, Assign to Circle
    - Add "Pending Enrichments" badge count on contacts page navigation
    - Add "Archived Contacts" view link with count badge
    - Add source filter dropdown for filtering contacts by source
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.6, 15.5, 16.1, 16.2, 18.5_

  - [ ] 30.2 Implement pending enrichment review UI
    - Add "Pending Enrichments" view showing pending enrichments grouped by import
    - Each entry: participant name/identifier, platform, message count, date range, actions (Link to Contact / Create Contact / Dismiss)
    - "Link to Contact" opens searchable contact picker
    - "Create Contact" creates pre-populated contact
    - "Dismiss" hides from default view with option to show dismissed
    - Show enriched data (topics, sentiment) when AI enrichment completes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7_

  - [ ] 30.3 Implement match review UI
    - Add likely match review list showing chat participant alongside suggested contact with match reason and confidence
    - One-tap Confirm / Reject / Skip actions
    - Smart suggestion for high-frequency unmatched: "[Participant] sent you [N] messages — create a contact or link to someone?"
    - _Requirements: 7.2, 7.4, 7.5_

- [ ] 31. Notification center frontend
  - [ ] 31.1 Create `public/js/notification-center.js` module
    - Implement bell icon in app header/sidebar with unread badge count (polling `GET /api/notifications/unread-count`)
    - Implement scrollable notification list sorted by timestamp descending
    - Each notification: icon (based on event type), title, description, relative timestamp, read/unread state, optional action link
    - Click notification: mark as read, navigate to action_url if present
    - "Mark all as read" action
    - _Requirements: 26.1, 26.2, 26.5, 26.6_

- [ ] 32. Suggestions page enrichment context
  - [ ] 32.1 Update `public/js/suggestions-page.js` with enrichment context
    - Display enrichment context in suggestion card reasoning section
    - Show specific data points from enrichment records (e.g., "You exchanged 847 WhatsApp messages with Sarah in the last 6 months, but haven't talked in 3 weeks")
    - _Requirements: 17.7_

- [ ] 33. Settings page frontend
  - [ ] 33.1 Update `public/js/settings-page.js` with unified settings
    - Implement Profile section: name, email, timezone selection (searchable by city name or timezone identifier)
    - Implement Notification Preferences section: in-app notification types enable/disable
    - Implement Connected Accounts section: Google Contacts sync status with scope level, Google Calendar connection with connect/disconnect, pending sync count
    - Implement Import History section: link to import history view
    - Implement Display Preferences section: theme toggle, keyboard shortcuts
    - Show connected Google account with "Disconnect" option and current OAuth scope level
    - Auto-save on change with confirmation toast
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

  - [ ] 33.2 Implement import history view
    - Display import records sorted by date descending
    - Each record: platform icon, file name, import date, participants, matched, pending, status
    - "Delete Import" with confirmation dialog explaining cascade
    - "Re-import" action opening import wizard pre-configured for same platform
    - _Requirements: 12.1, 12.2, 12.3, 12.5_

  - [ ] 33.3 Implement sync review UI
    - Display diff view for pending sync-back operations: contact name, field changed, CatchUp value, Google value
    - Per-change Approve / Skip checkboxes
    - Bulk "Approve All" / "Skip All" options
    - Handle conflict display when Google value changed (409 scenario)
    - _Requirements: 13.2, 13.3, 13.6_

- [ ] 34. Checkpoint — Verify all frontend modules
  - Ensure all frontend modules load without console errors
  - Ensure page routing works for all pages (Home, Directory, Suggestions, Settings)
  - Ensure contact detail panel opens and displays data correctly
  - Ask the user if questions arise

- [ ] 35. Integration wiring and final assembly
  - [ ] 35.1 Wire all API routes into server.ts
    - Verify all new routes are registered in `src/api/server.ts`: imports, enrichments, sync-back, notifications, settings, dashboard, suggestion-weights, contacts/bulk, contacts/import-vcard, contacts/export-vcard
    - Verify all removed routes (scheduling, SMS, calendar browsing) are no longer registered
    - Verify JWT auth middleware is applied to all new routes
    - _Requirements: 7.7, 22.5_

  - [ ] 35.2 Wire notification triggers into async job handlers
    - Ensure import complete/failed notifications fire from import job handler
    - Ensure AI enrichment ready notification fires from AI enrichment job handler
    - Ensure sync conflict notification fires from sync-back job handler
    - Ensure export reminder fires 24h after "My export isn't ready yet"
    - Ensure pending enrichments reminder fires 48h after import with unresolved items
    - _Requirements: 26.3_

  - [ ] 35.3 Wire calendar enrichment into contact profiles
    - Ensure calendar sync updates contact lastContactDate when meeting attendee matches
    - Ensure calendar data appears in Contact Detail Panel enrichment sources
    - Ensure calendar co-attendance feeds into AI suggestion engine
    - _Requirements: 23.2, 23.7, 23.8, 23.9_

- [ ] 36. Final checkpoint — Ensure all tests pass
  - Run `npm run typecheck` — no TypeScript errors
  - Run `npm test` — all unit and property tests pass
  - Verify all 27 requirements have implementing tasks
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at natural breakpoints
- Property tests validate universal correctness properties from the design document (48 properties mapped to sub-tasks)
- Unit tests validate specific examples and edge cases
- Frontend modules are created as separate files from the start per Req 27.6
- Codebase cleanup (tasks 1–2) runs first to simplify the codebase before building new features
- Database migrations (task 3) establish the data layer before services that depend on it
- Backend services (tasks 8–19) are built before frontend features (tasks 26–33) that consume their APIs
