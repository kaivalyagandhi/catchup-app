# Implementation Tasks

## Task 1: Database Migrations & Backend Data Foundations
Requirements: 1

- [x] 1.1 Create database migration for `group_suggestion_feedback` table with columns: id (UUID PK), user_id (FK), contact_id (FK), group_id (FK), suggestion_type (VARCHAR), feedback (VARCHAR CHECK), created_at (TIMESTAMPTZ), UNIQUE(user_id, contact_id, group_id), and indexes on (user_id, contact_id) and (user_id, group_id)
- [x] 1.2 Create database migration for `user_preferences` table with columns: id (UUID PK), user_id (FK), preference_key (VARCHAR), preference_value (JSONB), updated_at (TIMESTAMPTZ), UNIQUE(user_id, preference_key), and index on (user_id, preference_key)
- [x] 1.3 Add `countByUserId(userId: string): Promise<number>` method to `InteractionRepository` interface and `PostgresInteractionRepository` in `src/contacts/interaction-repository.ts`, querying `SELECT COUNT(*) FROM interaction_logs WHERE user_id = $1`
- [x] 1.4 Create `src/users/user-preferences-repository.ts` with `UserPreferencesRepository` interface and `PostgresUserPreferencesRepository` class implementing `get(userId, key)`, `set(userId, key, value)`, and `delete(userId, key)` methods against the `user_preferences` table
- [x] 1.5 Create `src/matching/group-suggestion-feedback-repository.ts` with `GroupSuggestionFeedbackRepository` interface and `PostgresGroupSuggestionFeedbackRepository` class implementing `recordFeedback()`, `getRejectedGroups()`, and `getFeedbackForContact()` methods

## Task 2: Backend API Endpoints
Requirements: 1, 9

- [x] 2.1 Add `GET /api/contacts/ungrouped-count` route in `src/contacts/` routes (or `src/api/`) that queries contacts with no group assignments and returns `{ count: number }`, protected by `authMiddleware`
- [x] 2.2 Add `POST /api/contacts/:id/groups/:groupId` route that calls `GroupRepository.assignContact()` and returns `{ success: true }`, protected by `authMiddleware`
- [x] 2.3 Add `DELETE /api/contacts/:id/groups/:groupId` route that calls `GroupRepository.removeContact()` and returns `{ success: true }`, protected by `authMiddleware`
- [x] 2.4 Add `GET /api/users/preferences/:key` route that calls `UserPreferencesRepository.get()` and returns `{ key, value }` or 404, protected by `authMiddleware`
- [x] 2.5 Add `PUT /api/users/preferences/:key` route that calls `UserPreferencesRepository.set()` with request body `{ value }` and returns `{ key, value, updatedAt }`, protected by `authMiddleware`

## Task 3: Group AI Suggestion Service
Requirements: 2

- [x] 3.1 Create `src/matching/group-ai-suggestion-service.ts` with `GroupAISuggestionService` interface defining `suggestGroupsForContact(userId, contactId): Promise<GroupSuggestion[]>` and `batchSuggestGroups(userId, contactIds): Promise<Record<string, GroupSuggestion[]>>`
- [x] 3.2 Implement `PostgresGroupAISuggestionService` class with weighted signal computation: Google Contact Group name matching (35%), interaction frequency (20%), calendar co-attendance (20%), shared tags (15%), contact metadata (10%)
- [x] 3.3 Implement Google Contact Group label matching: compare contact's synced Google group labels against CatchUp group names using case-insensitive fuzzy matching, assigning full 35% weight on exact/near-exact match
- [x] 3.4 Implement rejection filtering in `suggestGroupsForContact()` by querying `GroupSuggestionFeedbackRepository.getRejectedGroups()` and excluding those group IDs from results
- [x] 3.5 Implement `batchSuggestGroups()` that iterates over contact IDs and calls `suggestGroupsForContact()` for each, returning a map of contactId to suggestions
- [x] 3.6 Add `GET /api/contacts/:id/group-suggestions` route that calls `GroupAISuggestionService.suggestGroupsForContact()` and returns `{ suggestions }`, protected by `authMiddleware`
- [x] 3.7 Add `POST /api/contacts/batch-group-suggestions` route that accepts `{ contactIds }` body, calls `GroupAISuggestionService.batchSuggestGroups()`, and returns `{ results }`, protected by `authMiddleware`
- [x] 3.8 Write unit tests in `src/matching/group-ai-suggestion-service.test.ts`: confidence bounds (0-100), signal weight sum (1.0), rejection exclusion, batch equivalence with individual calls, Google group label matching
  - [x] 3.8.1 [PBT] Property test: for any random signal inputs, confidence score is always within [0, 100]
  - [x] 3.8.2 [PBT] Property test: signal weights always sum to 1.0 regardless of configuration

## Task 4: Circle AI Cold Start Improvements
Requirements: 3

- [x] 4.1 Add private `isColdStart(userId: string): Promise<boolean>` method to `PostgresAISuggestionService` in `src/contacts/ai-suggestion-service.ts` that calls `InteractionRepository.countByUserId()` and returns `true` when count < 10
- [x] 4.2 Modify `calculateFactors()` in `PostgresAISuggestionService` to check `isColdStart()` and adjust weights: calendar co-attendance from 15% to 30%, contact metadata from 10% to 25%, confidence threshold from 40 to 20
- [x] 4.3 Add cold-start targeting logic to `analyzeContact()` and `batchAnalyze()` to aim for minimum 3 suggestions per Dunbar tier when in cold-start mode
- [x] 4.4 Write unit tests in `src/contacts/ai-suggestion-service.test.ts` for cold-start: threshold boundary (9 vs 10 interactions), weight adjustments, unchanged behavior at >= 10 interactions
  - [x] 4.4.1 [PBT] Property test: cold start activates if and only if interaction count < 10 (generate random counts 0-20, verify threshold)

## Task 5: Context Toggle Component
Requirements: 4, 12

- [x] 5.1 Create `public/js/context-toggle.js` with `ContextToggle` class: constructor accepts `{ defaultContext, onContextChange }`, renders segmented control with `role="tablist"`, each option has `role="tab"` and `aria-selected`
- [x] 5.2 Implement keyboard navigation: ArrowLeft/ArrowRight to move between options, Enter/Space to select, emitting `context-changed` CustomEvent with `detail.context`
- [x] 5.3 Implement localStorage persistence: save to `organize-contacts-context` on change, restore on construction
- [x] 5.4 Add visible focus indicators with minimum 3:1 contrast ratio on all interactive elements
- [x] 5.5 Create manual test file `tests/html/context-toggle-test.html` for visual and keyboard testing of the ContextToggle component

## Task 6: Step2CirclesHandler Modal Extension
Requirements: 5, 10, 12

- [x] 6.1 Extend `Step2CirclesHandler.openManageCirclesFlow()` in `public/js/step2-circles-handler.js` to accept optional `entryContext` parameter (default `'circles'`), fetch groups when `entryContext === 'groups'`, and pass both to `createModalWithModeToggle()`
- [x] 6.2 Extend `createModalWithModeToggle(initialMode, entryContext, groups)` to instantiate and render `ContextToggle` in the modal header between the title and the existing ModeToggle, set initial context from `entryContext`, and conditionally set title ("Organize Your Circles" for circles, "Organize Contacts" for groups)
- [x] 6.3 Add `handleContextChange(context)` method to Step2CirclesHandler that swaps the mode content container between circles and groups views, preserving any unsaved assignment state in a context-keyed store
- [x] 6.4 Add `loadGroupOrganizeModeContent(contentContainer)` method that loads CircleListView with `context: 'groups'` and group data, mirroring the pattern of `loadOrganizeModeContent()`
- [x] 6.5 Add `loadGroupSwipeModeContent(contentContainer)` method that loads QuickRefineCard with `context: 'groups'`, group data, and keyboard shortcuts, mirroring the pattern of `loadSwipeModeContent()`
- [x] 6.6 Implement context-aware `ProgressIndicator` rendering: circles shows "X/Y contacts in circles" with percentage bar (existing), groups shows "X contacts in groups" as simple count
- [x] 6.7 Ensure focus trapping within the modal boundary when open (Tab/Shift+Tab cycle within modal elements) — verify existing behavior is preserved
- [x] 6.8 Verify that when `entryContext` is `'circles'` or omitted, the modal renders identically to current production behavior (no regressions) — all existing `loadOrganizeModeContent()`, `loadSwipeModeContent()`, ModeToggle behavior unchanged

## Task 7: Groups Support in CircleListView
Requirements: 6

- [x] 7.1 Extend `CircleListView` constructor in `public/js/circle-list-view.js` to accept `context` option (default `'circles'`), storing as instance property
- [x] 7.2 Add `renderGroupSection(group)` method that renders a collapsible section for a group with its contacts as chips, plus AI suggestion pills from `GroupAISuggestionService`
- [x] 7.3 Override `render()` to branch on `this.context`: circles path calls existing rendering unchanged, groups path calls `renderGroupSection()` for each group plus `renderUngroupedSection()` for contacts with no groups
- [x] 7.4 Implement multi-group display: contacts belonging to multiple groups appear as chips in each group section
- [x] 7.5 Add `acceptGroupSuggestion(contactId, groupId)` method: POST to `/api/contacts/:id/groups/:groupId`, record accepted feedback, move contact chip into group section
- [x] 7.6 Add `rejectGroupSuggestion(contactId, groupId)` method: POST rejection to feedback API, remove suggestion pill from UI
- [x] 7.7 Extend `handleSearchInput()` to filter contacts across all group sections when in groups context, showing only matching contacts

## Task 8: Groups Support in QuickRefineCard
Requirements: 7, 12

- [x] 8.1 Extend `QuickRefineCard` constructor in `public/js/quick-refine-card.js` to accept `context` (default `'circles'`), `groups` (default `[]`), and `shortcuts` (default `{}`) options
- [x] 8.2 Modify `renderCard()` to branch on `this.context`: circles path renders existing circle buttons unchanged, groups path renders group buttons with shortcut labels (0-9) and an "Add Another" button
- [x] 8.3 Add `handleGroupAssignment(groupId)` method: POST to `/api/contacts/:id/groups/:groupId` with optimistic update, support multi-group via "Add Another" (stays on same contact)
- [x] 8.4 Extend `attachKeyboardListeners()` to handle numeric keys 0-9 for group shortcuts when `context` is `'groups'`, mapping to group IDs via `this.shortcuts`
- [x] 8.5 Ensure shared shortcuts A (archive), S (save for later), D (done) work identically in both contexts
- [x] 8.6 Ensure touch swipe gestures trigger group assignment in groups context (reuse existing swipe logic with group target)
- [x] 8.7 Add `aria-live="polite"` region that announces contact name and position (e.g., "Contact 3 of 15") on card transitions

## Task 9: Keyboard Shortcut Preferences Component
Requirements: 8

- [x] 9.1 Create `public/js/keyboard-shortcut-preferences.js` with `KeyboardShortcutPreferences` class: constructor accepts groups array and options `{ onSave }`
- [x] 9.2 Implement `render()` to display a popover with group list, each with a dropdown for shortcut assignment (0-9 or unassigned)
- [x] 9.3 Implement `autoAssign()` that sequentially assigns shortcuts 0-9 to groups when user has 10 or fewer groups
- [x] 9.4 Implement `validate()` that checks for duplicate shortcut assignments and returns validation errors
- [x] 9.5 Implement `save()` that PUTs shortcut mappings to `/api/users/preferences/keyboard-shortcuts`
- [x] 9.6 Add gear icon button to QuickRefineCard header (groups context only) that opens the KeyboardShortcutPreferences popover
- [x] 9.7 Write property-based test: for any set of groups (1-10), auto-assign produces unique shortcuts with no duplicates
  - [x] 9.7.1 [PBT] Property test: generate random group arrays of size 1-10, verify autoAssign() produces all unique shortcut values

## Task 10: Entry Points & App Integration
Requirements: 9

- [x] 10.1 Modify `openManageCirclesFromDirectory()` in `public/js/app.js` to accept optional `entryContext` parameter (default `'circles'`) and pass it through to `Step2CirclesHandler.openManageCirclesFlow(entryContext)`
- [x] 10.2 Keep existing Circles tab banner behavior (conditional when uncategorized > 0, calls `openManageCirclesFromDirectory('circles')`); keep existing permanent "Manage Circles" button (calls `openManageCirclesFromDirectory('circles')`)
- [x] 10.3 Add Groups tab banner rendering in `public/js/app.js` that fetches ungrouped count from `GET /api/contacts/ungrouped-count` and displays "X contacts not in any group — Organize now" with an "Organize Groups" button (only when ungrouped count > 0)
- [x] 10.4 Wire "Organize Groups" button click to call `openManageCirclesFromDirectory('groups')`

## Task 11: Group Assignment Persistence & Error Handling
Requirements: 11

- [x] 11.1 Implement optimistic update pattern in CircleListView and QuickRefineCard for group assignments: update UI immediately, send API request, revert on failure
- [x] 11.2 Add error handling with toast notification showing "Failed to save group assignment" with a "Retry" action button that re-attempts the failed API call
- [x] 11.3 Verify existing circle persistence (`handleCircleAssignment`, `saveAllAssignments`) remains unchanged and functional

## Task 12: Integration Tests & Manual Test Pages
Requirements: 1-12

- [x] 12.1 Write unit tests for `UserPreferencesRepository`: get/set/delete operations, round-trip property
  - [x] 12.1.1 [PBT] Property test: for any random key-value pair, set then get returns the same value (preference round-trip)
- [x] 12.2 Write unit tests for `GroupSuggestionFeedbackRepository`: record feedback, get rejected groups, uniqueness constraint
- [x] 12.3 Write integration test for ungrouped count endpoint: verify count accuracy against known contact-group state
  - [x] 12.3.1 [PBT] Property test: for any random set of contact-group assignments, ungroupedCount + groupedCount = totalActiveContacts
- [x] 12.4 Create `tests/html/organize-contacts-test.html` for full modal testing: context switching, both list and swipe modes, group assignment flow
- [x] 12.5 Create `tests/html/keyboard-shortcuts-test.html` for KeyboardShortcutPreferences popover testing
