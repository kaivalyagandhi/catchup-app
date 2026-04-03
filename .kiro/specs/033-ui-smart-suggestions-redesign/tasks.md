# Implementation Plan: Smart Suggestions Redesign

## Overview

Incrementally build the smart suggestions redesign across the full stack: database migration, new backend services (feedback, goals, pause), modified suggestion scoring with goal-aware 5th signal, new API routes, and a reworked dashboard frontend with tabs, structured feedback, conversation starters, post-interaction reviews, and weekly digest. Each task builds on the previous, with property-based tests validating correctness properties from the design.

## Tasks

- [x] 1. Database migration and TypeScript types
  - [x] 1.1 Create migration `scripts/migrations/059_smart_suggestions_redesign.sql`
    - Create `suggestion_feedback` table with preset CHECK constraint and indexes
    - Create `suggestion_exclusions` table with UNIQUE(user_id, contact_id) and index
    - Create `suggestion_pauses` table with UNIQUE(user_id)
    - Create `connection_goals` table with status CHECK, keywords TEXT[], and indexes
    - ALTER `suggestions` to add `review_prompt_after`, `review_outcome`, `review_reschedule_count`, `conversation_starter`, `goal_relevance_score`
    - ALTER `user_preferences` to add `last_digest_viewed_at`
    - _Requirements: 4.6, 8.1, 9.4, 11.3, 15.3_

  - [x] 1.2 Add new types to `src/types/index.ts`
    - Add `FeedbackPreset` union type, `ReviewOutcome` union type
    - Add `ConnectionGoal` interface, `SuggestionPause` interface
    - Add `ExtendedSignalContribution` interface extending `SignalContribution` with `goalRelevanceScore`
    - _Requirements: 4.5, 13.3, 15.3, 16.8_

- [x] 2. Checkpoint — Verify migration and types
  - Ensure migration SQL is syntactically valid and types compile. Run `npm run typecheck`. Ask the user if questions arise.

- [x] 3. Implement SuggestionPauseService
  - [x] 3.1 Create `src/matching/suggestion-pause-service.ts`
    - Implement `createPause(userId, weeks)` — validate weeks 1–4, insert into `suggestion_pauses`, return `SuggestionPause`
    - Implement `getActivePause(userId)` — SELECT where `pause_end > NOW()`, return record or null; clean up expired records
    - Implement `resumeEarly(userId)` — DELETE active pause record
    - Implement `isPaused(userId)` — return boolean based on `getActivePause`
    - _Requirements: 11.3, 11.4, 11.6, 11.7, 11.8, 11.9, 11.10_

  - [ ]* 3.2 Write property test: Pause creation round-trip (Property 18)
    - **Property 18: Pause creation round-trip**
    - Generate random week values (1–4), verify `pauseEnd = pauseStart + weeks * 7 days`
    - **Validates: Requirements 11.3, 11.8, 11.10**

  - [ ]* 3.3 Write property test: Expired pause auto-resumes (Property 21)
    - **Property 21: Expired pause auto-resumes**
    - Generate random past dates for `pauseEnd`, verify `isPaused` returns false
    - **Validates: Requirements 11.7**

  - [ ]* 3.4 Write unit tests for SuggestionPauseService
    - Test pause with weeks outside 1–4 is rejected
    - Test creating pause when already paused returns 409
    - Test resume when not paused returns 404
    - _Requirements: 11.3, 11.6_

- [x] 4. Implement ConnectionGoalService
  - [x] 4.1 Create `src/matching/connection-goal-service.ts`
    - Implement `extractKeywords(text)` — split text, filter stopwords and short words, return string array; fallback to whitespace split if empty
    - Implement `createGoal(userId, text)` — enforce max 2 active goals, extract keywords, INSERT into `connection_goals`
    - Implement `getActiveGoals(userId)` — SELECT where `status = 'active'`
    - Implement `archiveGoal(goalId, userId)` — UPDATE status to `'archived'`
    - Implement `computeGoalRelevance(contact, goals)` — +30 per tag/group keyword match (Levenshtein ≤ 2), +20 per enrichment topic overlap, +25 for Dunbar circle match to goal nature, cap at 100
    - _Requirements: 15.3, 15.4, 15.8, 16.1, 16.3, 16.4, 16.5, 16.6_

  - [ ]* 4.2 Write property test: Goal keyword extraction (Property 34)
    - **Property 34: Goal persistence with keyword extraction**
    - Generate random goal text strings, verify non-empty keywords array
    - **Validates: Requirements 15.3**

  - [ ]* 4.3 Write property test: Maximum 2 active goals (Property 35)
    - **Property 35: Maximum 2 active goals invariant**
    - Generate sequences of goal creation attempts, verify 3rd active goal is rejected
    - **Validates: Requirements 15.4**

  - [ ]* 4.4 Write property test: Goal relevance bounded [0, 100] (Property 37)
    - **Property 37: Goal relevance score bounded [0, 100]**
    - Generate random contacts and goals, verify score in [0, 100]
    - **Validates: Requirements 16.1**

  - [ ]* 4.5 Write property test: Goal relevance formula (Property 38)
    - **Property 38: Goal relevance scoring formula**
    - Generate contacts with known tags/groups/topics, verify score matches formula (+30 tag, +20 topic, +25 circle, cap 100)
    - **Validates: Requirements 16.3, 16.4, 16.5, 16.6**

  - [ ]* 4.6 Write unit tests for ConnectionGoalService
    - Test goal creation with empty text is rejected
    - Test archival sets status to 'archived' and removes from active list
    - Test Levenshtein distance ≤ 2 matching for keywords
    - _Requirements: 15.3, 15.4, 15.8_

- [x] 5. Implement FeedbackService
  - [x] 5.1 Create `src/matching/feedback-service.ts`
    - Define `VALID_PRESETS` array and `FeedbackRecord`, `ReviewRecord`, `FeedbackSummary` interfaces
    - Implement `submitFeedback(suggestionId, userId, preset, comment?)` — validate preset, BEGIN transaction: INSERT into `suggestion_feedback`, UPDATE suggestion status to 'dismissed', handle 'dont_suggest_contact' by inserting into `suggestion_exclusions`, COMMIT; rollback on failure
    - Implement `getFeedbackSummary(userId)` — aggregate feedback counts grouped by preset
    - Implement `adjustWeightsFromFeedback(userId)` — query 30-day feedback counts, apply threshold rules (5× not_relevant → contactMetadata −10%, 5× timing_off → calendarData −10%, 3× already_in_touch → interactionLogs +10%), normalize to sum 1.0, clamp [0.05, 0.60], UPSERT into `suggestion_signal_weights`
    - Implement `submitReview(suggestionId, userId, outcome)` — validate outcome, handle 'went_well' (+5% contributing weights), 'not_great' (−5%), 'not_yet' (reschedule +48h, max 2), 'skip' (no-op); normalize weights after adjustment
    - Implement `getPendingReviews(userId)` — SELECT accepted suggestions where `review_prompt_after < NOW()` and no review submitted and accepted within last 7 days
    - _Requirements: 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.4, 8.1, 13.1, 13.4, 13.5, 13.6, 13.8_

  - [ ]* 5.2 Write property test: Feedback submission atomically dismisses (Property 8)
    - **Property 8: Feedback submission atomically dismisses the suggestion**
    - Generate valid presets and pending suggestions, verify both FeedbackRecord created and suggestion status set to 'dismissed'
    - **Validates: Requirements 4.4, 7.4**

  - [ ]* 5.3 Write property test: Weight adjustment thresholds (Property 10)
    - **Property 10: Feedback-driven weight adjustment thresholds**
    - Generate feedback histories meeting threshold counts, verify corresponding weight adjustments
    - **Validates: Requirements 5.1, 5.2, 5.4**

  - [ ]* 5.4 Write property test: Signal weights invariants (Property 11)
    - **Property 11: Signal weights invariants after adjustment**
    - Generate random weight adjustments, verify all weights in [0.05, 0.60] and sum = 1.0 (±0.001)
    - **Validates: Requirements 5.5, 5.6**

  - [ ]* 5.5 Write property test: Feedback summary aggregation (Property 15)
    - **Property 15: Feedback summary correctly aggregates counts**
    - Generate N feedback records with various presets, verify counts sum to N
    - **Validates: Requirements 7.3**

  - [ ]* 5.6 Write property test: Bulk dismiss (Property 17)
    - **Property 17: Bulk dismiss sets all pending to dismissed with default preset**
    - Generate random pending suggestion sets, verify all dismissed with 'not_relevant' preset
    - **Validates: Requirements 10.3, 10.4**

  - [ ]* 5.7 Write unit tests for FeedbackService
    - Test invalid preset returns error
    - Test 'dont_suggest_contact' creates exclusion record
    - Test review 'not_yet' with reschedule_count = 2 does not reschedule
    - Test review auto-dismiss after 7 days (not in getPendingReviews)
    - _Requirements: 4.4, 5.3, 13.6, 13.8_

- [x] 6. Checkpoint — Verify all three new services
  - Ensure all tests pass (`npm test`), run `npm run typecheck`. Ask the user if questions arise.

- [x] 7. Modify SuggestionService for goal-aware scoring, conversation starters, and pause checks
  - [x] 7.1 Add goal-aware scoring to `src/matching/suggestion-service.ts`
    - Import `ConnectionGoalService` and `SuggestionPauseService`
    - Implement `computeGoalAwareScore(contact, enrichment, weights, goals, currentDate)` — when goals are active, multiply each original weight by 0.80, add `goalRelevance` weight of 0.20, call `computeWeightedScore` with redistributed weights and inject goal relevance as 5th signal
    - Modify `getPendingSuggestions` to check `SuggestionPauseService.isPaused(userId)` — return empty array if paused
    - Modify `getPendingSuggestions` to filter out contacts in `suggestion_exclusions` table
    - Add `signalContribution` (with `goalRelevanceScore`) to each suggestion in the response
    - _Requirements: 8.2, 11.4, 16.1, 16.2, 16.8, 16.9_

  - [x] 7.2 Add conversation starter generation to `src/matching/suggestion-service.ts`
    - Implement `generateConversationStarter(contact, suggestion, enrichment)` — returns a string
    - When shared interests/tags present: reference overlapping tags (e.g., "You both follow hiking — ask about their recent trail")
    - When calendar event context: reference event title (e.g., "You're both attending the product meetup Thursday")
    - When frequency decay with enrichment topics: reference last known topic (e.g., "Last time you talked about their job search")
    - Fallback: "It's been a while — a simple 'how are you?' goes a long way"
    - Include `conversationStarter` field in suggestion API response
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 7.3 Add goal-boosted reasoning to suggestion reasoning generation
    - When `goalRelevanceScore > 0`, append goal reference to Reasoning_Summary (e.g., "Relevant to your goal: Grow professional network")
    - When frequency decay is primary signal, include frequency preference and days since last contact in reasoning
    - When declining frequency, state that messaging frequency has dropped
    - _Requirements: 3.2, 3.3, 16.7_

  - [x] 7.4 Add acceptance review scheduling to `acceptSuggestion`
    - When a suggestion is accepted, set `review_prompt_after` to 48 hours after acceptance timestamp
    - _Requirements: 13.1_

  - [ ]* 7.5 Write property test: Suggestions sorted descending (Property 4)
    - **Property 4: Suggestions are sorted by weighted score descending**
    - Generate random score arrays, sort, verify each score ≥ next
    - **Validates: Requirements 2.3**

  - [ ]* 7.6 Write property test: Excluded contacts never appear (Property 12)
    - **Property 12: Excluded contacts never appear in suggestions**
    - Generate random contact lists with exclusions, verify excluded contacts absent from results
    - **Validates: Requirements 5.3, 8.1, 8.2**

  - [ ]* 7.7 Write property test: Paused users receive no suggestions (Property 19)
    - **Property 19: Paused users receive no suggestions**
    - Generate random active pause states, verify `getPendingSuggestions` returns empty array
    - **Validates: Requirements 11.4**

  - [ ]* 7.8 Write property test: Conversation starter fallback (Property 25)
    - **Property 25: Conversation starter fallback is always non-empty**
    - Generate contacts with no tags, no calendar context, no enrichment topics, verify non-empty starter string
    - **Validates: Requirements 12.5**

  - [ ]* 7.9 Write property test: Five-signal weight redistribution (Property 39)
    - **Property 39: Five-signal weight redistribution when goals active**
    - Generate random base 4-signal weights summing to 1.0, verify redistributed weights: each × 0.80 + goalRelevance 0.20, all 5 sum to 1.0 (±0.001)
    - **Validates: Requirements 16.2, 16.9**

- [x] 8. Checkpoint — Verify modified SuggestionService
  - Ensure all tests pass (`npm test`), run `npm run typecheck`. Ask the user if questions arise.

- [x] 9. Create suggestion feedback API routes
  - [x] 9.1 Create `src/api/routes/suggestion-feedback.ts`
    - `POST /api/suggestions/:id/feedback` — validate preset against `VALID_PRESETS`, return 400 for invalid; check suggestion exists and belongs to user, return 404 if not; call `FeedbackService.submitFeedback`; return created FeedbackRecord
    - `GET /api/suggestions/feedback/summary` — call `FeedbackService.getFeedbackSummary(userId)`; return aggregated counts
    - `POST /api/suggestions/:id/review` — validate outcome, return 400 for invalid; check suggestion is accepted, return 400 if not; call `FeedbackService.submitReview`; return ReviewRecord
    - `POST /api/suggestions/dismiss-all` — query all pending suggestions for user, call `FeedbackService.submitFeedback` with preset 'not_relevant' for each; return `{ dismissed: count }`
    - `GET /api/suggestions/exclusions` — query `suggestion_exclusions` for user, join with contacts for names; return list
    - `DELETE /api/suggestions/exclusions/:contactId` — delete exclusion record, return 404 if not found
    - All routes use `authenticate` middleware
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.3, 8.4, 10.3, 10.4, 13.7_

  - [ ]* 9.2 Write unit tests for suggestion feedback routes
    - Test invalid preset returns 400
    - Test non-existent suggestion returns 404
    - Test feedback on non-pending suggestion returns 400
    - Test bulk dismiss with zero pending returns `{ dismissed: 0 }`
    - Test exclusion removal for non-existent exclusion returns 404
    - _Requirements: 7.2, 7.5, 10.4_

- [x] 10. Create suggestion goals API routes
  - [x] 10.1 Create `src/api/routes/suggestion-goals.ts`
    - `POST /api/suggestions/goals` — validate `text` is non-empty, return 400 if empty; call `ConnectionGoalService.createGoal`, return 409 if max 2 active goals exceeded; return created goal
    - `GET /api/suggestions/goals` — call `ConnectionGoalService.getActiveGoals(userId)`; return goals array
    - `DELETE /api/suggestions/goals/:goalId` — call `ConnectionGoalService.archiveGoal`, return 404 if not found
    - All routes use `authenticate` middleware
    - _Requirements: 15.6, 15.7, 15.8_

  - [ ]* 10.2 Write unit tests for suggestion goals routes
    - Test goal creation with empty text returns 400
    - Test goal creation when 2 active goals exist returns 409
    - Test archive non-existent goal returns 404
    - _Requirements: 15.4, 15.6, 15.8_

- [x] 11. Create suggestion pause API routes
  - [x] 11.1 Create `src/api/routes/suggestion-pause.ts`
    - `POST /api/suggestions/pause` — validate `weeks` is integer 1–4, return 400 if invalid; call `SuggestionPauseService.createPause`, return 409 if already paused; return pause record
    - `GET /api/suggestions/pause` — call `SuggestionPauseService.getActivePause(userId)`; return pause state or `{ active: false }`
    - `DELETE /api/suggestions/pause` — call `SuggestionPauseService.resumeEarly`, return 404 if no active pause
    - All routes use `authenticate` middleware
    - _Requirements: 11.8, 11.9, 11.10_

  - [ ]* 11.2 Write unit tests for suggestion pause routes
    - Test pause with weeks = 0 or 5 returns 400
    - Test pause when already paused returns 409
    - Test resume when not paused returns 404
    - _Requirements: 11.8, 11.9_

- [x] 12. Register new routes and modify backward-compatible endpoints
  - [x] 12.1 Register new route modules in `src/api/server.ts`
    - Import and mount `suggestion-feedback` routes at `/api/suggestions`
    - Import and mount `suggestion-goals` routes at `/api/suggestions`
    - Import and mount `suggestion-pause` routes at `/api/suggestions`
    - Ensure new routes are registered before the existing `suggestionsRouter` to avoid `:id` param conflicts
    - _Requirements: 7.1, 11.8, 15.6_

  - [x] 12.2 Modify existing dismiss endpoint for backward compatibility
    - In the existing `POST /api/suggestions/:id/dismiss` route, when no feedback preset is provided, create a FeedbackRecord with preset 'not_relevant' via FeedbackService
    - Ensure existing `GET /api/suggestions/all` response includes `signalContribution` field on each suggestion
    - _Requirements: 9.1, 9.2_

  - [ ]* 12.3 Write unit tests for backward compatibility
    - Test old dismiss endpoint creates 'not_relevant' feedback record
    - Test `GET /api/suggestions/all` includes `signalContribution` field
    - _Requirements: 9.1, 9.2_

- [x] 13. Augment dashboard API response
  - [x] 13.1 Modify `src/api/routes/dashboard.ts`
    - Import `SuggestionPauseService`, `ConnectionGoalService`, `FeedbackService`, and suggestion service functions
    - Augment `GET /api/dashboard` response with: `suggestions` (top scored pending, with signalContribution, conversationStarter, goalRelevanceScore), `activeGoals`, `pauseState`, `pendingReviews`, and `weeklyDigest`
    - Weekly digest logic: check `last_digest_viewed_at` against most recent Monday 00:00 UTC; include top 3 suggestion summaries if applicable; suppress if paused or zero pending
    - Update `last_digest_viewed_at` when digest is served
    - _Requirements: 2.1, 2.3, 3.5, 3.6, 14.1, 14.2, 14.5, 14.6_

  - [ ]* 13.2 Write unit tests for augmented dashboard response
    - Test dashboard response includes suggestions, goals, pause state fields
    - Test weekly digest suppressed when paused
    - Test weekly digest suppressed when zero pending suggestions
    - Test weekly digest contains at most 3 entries
    - _Requirements: 14.1, 14.2, 14.6_

- [x] 14. Checkpoint — Verify all API routes and backend integration
  - Ensure all tests pass (`npm test`), run `npm run typecheck`. Ask the user if questions arise.

- [x] 15. Implement dashboard tab system and suggestion card rendering
  - [x] 15.1 Add tab bar and tab switching to `public/js/home-dashboard.js`
    - Render tab bar with "Overview" and "Suggestions" tabs following the `switchDirectoryTab` pattern
    - Implement `switchDashboardTab(tabName)` — show/hide tab content, persist to localStorage, update URL hash (`#dashboard/overview`, `#dashboard/suggestions`)
    - On page load, restore tab from URL hash or localStorage
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 15.2 Implement suggestion card rendering in `public/js/home-dashboard.js`
    - Render `renderSuggestionsTab()` — fetch from augmented dashboard API
    - Display max 3 pending suggestion cards by default; "Show more" control reveals next batch of 3
    - Each card: avatar, contact name, type label ("One-on-One" / "Group Catchup" as subtle label), Reasoning_Summary, conversation starter (💬 italic), expandable "Details" section with signal contribution breakdown, action buttons
    - Group cards: overlapping avatars for up to 3 contacts, "+N" indicator for additional
    - Empty state: "You're all caught up. No suggestions right now."
    - Promote next suggestion into visible set when one is acted on (no full page reload)
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 12.1_

  - [x] 15.3 Implement structured feedback UI in `public/js/home-dashboard.js`
    - "Not now" button triggers inline preset feedback options (not `prompt()`)
    - Render preset options: "Already in touch", "Not relevant right now", "Timing is off", "Don't suggest this contact", "Other"
    - "Other" reveals text input for free-text feedback
    - Selecting any preset submits feedback via `POST /api/suggestions/:id/feedback` and dismisses the card
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 15.4 Implement goal banner, pause banner, and controls in `public/js/home-dashboard.js`
    - Goal banner: show "Set a goal" prompt when no active goals; show active goal(s) as compact banner with "Change" / "Clear" controls; goal input form with presets and free-text
    - Pause banner: "Pause suggestions" control in tab header; duration picker (1–4 weeks); paused state banner with remaining duration and "Resume suggestions" button
    - "Dismiss all" control in tab header when pending suggestions exist; confirmation prompt before bulk dismiss
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 11.1, 11.2, 11.5, 15.1, 15.2, 15.5_

  - [x] 15.5 Implement post-interaction reviews and weekly digest in `public/js/home-dashboard.js`
    - Post-interaction review: render lightweight banner for suggestions with passed `reviewPromptAfter`; options: "Yes, it went well", "Yes, but it wasn't great", "Not yet", "Skip"; submit via `POST /api/suggestions/:id/review`
    - Weekly digest: render banner at top of Suggestions tab with top 3 suggestion summaries; "View all" link scrolls to cards; "Dismiss digest" hides for current week
    - _Requirements: 13.2, 13.3, 14.1, 14.2, 14.3, 14.4_

- [x] 16. Deprecate standalone suggestions page
  - [x] 16.1 Modify `public/js/suggestions-page.js` to redirect to dashboard suggestions tab
    - Replace `loadSuggestions` with a redirect: `navigateTo('dashboard')` and set hash to `#dashboard/suggestions`
    - Keep backward-compatible window exports as no-ops or redirects
    - _Requirements: 1.1_

- [x] 17. Checkpoint — Verify full frontend integration
  - Ensure `npm run typecheck` passes. Manually verify tab switching, suggestion card rendering, feedback flow, goal/pause controls, and weekly digest in browser. Ask the user if questions arise.

- [x] 18. Create manual UI test files
  - [x] 18.1 Create `tests/html/dashboard-tabs.html`
    - Tab switching, localStorage persistence, URL hash sync test page
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 18.2 Create `tests/html/suggestion-cards.html`
    - Card rendering, feedback flow, conversation starters, signal details expansion test page
    - _Requirements: 3.1, 4.1, 6.1, 12.1_

  - [x] 18.3 Create `tests/html/suggestion-pause.html`
    - Pause/resume flow, banner display, duration countdown test page
    - _Requirements: 11.1, 11.5_

- [x] 19. Final checkpoint — Ensure all tests pass
  - Run `npm test` and `npm run typecheck`. Verify no regressions. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (14 key properties)
- Unit tests validate specific examples and edge cases
- Manual HTML test files in `tests/html/` for browser-based UI verification
