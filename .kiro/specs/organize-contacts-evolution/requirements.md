# Requirements Document

## Introduction

Extend the existing "Organize Your Circles" modal into a unified "Organize Contacts" experience that supports both Circles (Dunbar tiers) and Groups (user-defined collections). All changes are additive and integrative — the current production Circles flow (Step2CirclesHandler, ModeToggle, CircleListView, QuickRefineCard) remains unchanged as the default path. A new ContextToggle component enables switching between Circles and Groups contexts within the same modal, and new backend services provide group AI suggestions, cold-start improvements, and keyboard shortcut preferences.

## Glossary

- **Step2CirclesHandler**: The existing orchestrator (`public/js/step2-circles-handler.js`) that creates the primary circles modal from the Circles tab. It owns the modal shell, ModeToggle (organize/swipe), and loads CircleListView or QuickRefineCard into a content container. This is the only production entry point from the Circles tab banner and "Manage Circles" button. Extended with ContextToggle and groups support.
- **CircleListView**: The existing list-mode component (`public/js/circle-list-view.js`) that displays contacts organized by Dunbar circle sections. Extended with a `context` option.
- **QuickRefineCard**: The existing swipe-mode component (`public/js/quick-refine-card.js`) that presents contacts one-at-a-time for rapid circle assignment. Extended with a `context` option.
- **ContextToggle**: A new standalone segmented control component (`public/js/context-toggle.js`) that switches between "Circles" and "Groups" contexts.
- **GroupAISuggestionService**: A new backend service (`src/matching/group-ai-suggestion-service.ts`) that generates AI-powered group placement suggestions using weighted signal hierarchy.
- **AISuggestionService**: The existing circle suggestion service (`src/contacts/ai-suggestion-service.ts`). Extended with cold-start improvements.
- **KeyboardShortcutPreferences**: A new frontend component for assigning numeric shortcuts (0-9) to groups in swipe mode.
- **ProgressIndicator**: The context-aware progress display showing circle or group assignment completion.
- **GroupRepository**: The existing data access layer (`src/contacts/group-repository.ts`) for group CRUD and contact-group assignments.
- **InteractionRepository**: The existing data access layer (`src/contacts/interaction-repository.ts`) for interaction logs.
- **UserPreferencesService**: The existing service (`src/users/preferences-service.ts`) for user settings. Extended with generic key-value preference storage.
- **Ungrouped_Contact**: A contact that has no group assignments (empty `groups` array on the Contact model).
- **Cold_Start_Mode**: A state where the user has fewer than 10 logged interactions, triggering adjusted AI suggestion thresholds.
- **Confidence_Score**: A numeric value (0-100) representing the AI service's certainty in a group or circle suggestion.
- **Signal_Source**: The data origin (Google Contact Group name matching, interaction frequency, calendar co-attendance, shared tags, contact metadata) used to compute a Confidence_Score.

## Requirements

### Requirement 1: Backend Data Foundations

**User Story:** As a developer, I need backend endpoints and data structures to support group organization features without affecting existing circle functionality.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/contacts/ungrouped-count`, THE ContactRoutes SHALL return a JSON object containing the count of Ungrouped_Contacts for the authenticated user.
2. WHEN a POST request is made to `/api/contacts/:id/groups/:groupId`, THE ContactRoutes SHALL assign the specified contact to the specified group and return a 200 status.
3. WHEN a DELETE request is made to `/api/contacts/:id/groups/:groupId`, THE ContactRoutes SHALL remove the specified contact from the specified group and return a 200 status.
4. THE Database SHALL contain a `group_suggestion_feedback` table with columns: `id`, `user_id`, `contact_id`, `group_id`, `suggestion_type`, `feedback` (accepted/rejected), and `created_at`.
5. THE Database SHALL contain a `user_preferences` table with columns: `id`, `user_id`, `preference_key`, `preference_value`, and `updated_at`.
6. WHEN a GET request is made to `/api/users/preferences/:key`, THE UserPreferencesService SHALL return the stored preference value for the authenticated user.
7. WHEN a PUT request is made to `/api/users/preferences/:key`, THE UserPreferencesService SHALL store or update the preference value for the authenticated user.
8. THE InteractionRepository SHALL provide a `countByUserId(userId)` method that returns the total number of interaction logs for the specified user.
9. THE ContactRoutes SHALL require valid JWT authentication on all new endpoints.
10. THE new endpoints SHALL operate independently of existing circle-related endpoints with no modifications to existing route handlers.

### Requirement 2: Group AI Suggestion Service

**User Story:** As a user, I want AI-powered suggestions for which groups my contacts belong to, so that I can organize contacts into groups faster.

#### Acceptance Criteria

1. THE GroupAISuggestionService SHALL provide a `suggestGroupsForContact(userId, contactId)` method that returns an array of group suggestions, each containing a group ID, Confidence_Score (0-100), and Signal_Source breakdown.
2. THE GroupAISuggestionService SHALL provide a `batchSuggestGroups(userId, contactIds)` method that returns group suggestions for multiple contacts in a single call.
3. THE GroupAISuggestionService SHALL use a weighted signal hierarchy: Google Contact Group name matching (35%, highest weight) → interaction frequency (20%) → calendar co-attendance (20%) → shared tags (15%) → contact metadata (10%).
4. WHEN a contact's Google Contact Group labels match a CatchUp group name (case-insensitive), THE GroupAISuggestionService SHALL assign the maximum signal weight (35%) for that group suggestion.
5. WHEN generating suggestions, THE GroupAISuggestionService SHALL exclude groups that the user has previously rejected for the specified contact (via `group_suggestion_feedback` table).
6. WHEN a GET request is made to `/api/contacts/:id/group-suggestions`, THE ContactRoutes SHALL return group suggestions from the GroupAISuggestionService.
7. WHEN a POST request is made to `/api/contacts/batch-group-suggestions`, THE ContactRoutes SHALL return group suggestions for the provided array of contact IDs.
8. THE GroupAISuggestionService SHALL operate independently from the existing AISuggestionService with no modifications to existing circle suggestion logic.

### Requirement 3: Circle AI Cold Start Improvements

**User Story:** As a new user with few logged interactions, I want the circle suggestion AI to still provide useful suggestions, so that I can organize my contacts from the start.

#### Acceptance Criteria

1. WHEN the InteractionRepository `countByUserId` returns fewer than 10 for a user, THE AISuggestionService SHALL activate Cold_Start_Mode for that user.
2. WHILE in Cold_Start_Mode, THE AISuggestionService SHALL lower the minimum Confidence_Score threshold from 40 to 20 for circle suggestions.
3. WHILE in Cold_Start_Mode, THE AISuggestionService SHALL increase the calendar co-attendance weight from 15% to 30% and the contact metadata weight from 10% to 25%.
4. WHILE in Cold_Start_Mode, THE AISuggestionService SHALL target a minimum of 3 suggestions per Dunbar tier.
5. THE cold-start improvements SHALL be additive extensions to the existing AISuggestionService with no changes to behavior when the user has 10 or more logged interactions.

### Requirement 4: Context Toggle Component

**User Story:** As a user, I want to switch between organizing my Circles and my Groups within the same modal, so that I have a unified organization experience.

#### Acceptance Criteria

1. THE ContextToggle SHALL render as a segmented control with two options: "Circles" (default selected) and "Groups".
2. WHEN the user selects a different context option, THE ContextToggle SHALL emit a `context-changed` CustomEvent with `detail.context` set to either `'circles'` or `'groups'`.
3. THE ContextToggle SHALL support keyboard navigation using Arrow Left and Arrow Right keys to move between options, and Enter or Space to select.
4. THE ContextToggle SHALL persist the last selected context to `localStorage` under the key `organize-contacts-context`.
5. WHEN the ContextToggle is initialized, THE ContextToggle SHALL restore the previously selected context from `localStorage` if a value exists.
6. THE ContextToggle SHALL have no dependencies on Step2CirclesHandler internal state or methods.
7. THE ContextToggle SHALL use `role="tablist"` on the container and `role="tab"` with `aria-selected` on each option.

### Requirement 5: Step2CirclesHandler Modal Extension

**User Story:** As a user, I want the organization modal to support both Circles and Groups contexts, so that I can manage all my contact organization from one place.

#### Acceptance Criteria

1. THE Step2CirclesHandler `createModalWithModeToggle()` method SHALL accept a new optional `entryContext` parameter (default `'circles'`) and a `groups` parameter (default `[]`).
2. WHEN `entryContext` is `'circles'` or omitted, THE Step2CirclesHandler SHALL render the modal title as "Organize Your Circles" and display the existing circles UI with no behavioral changes (ModeToggle with organize/swipe modes, CircleListView, QuickRefineCard).
3. WHEN `entryContext` is `'groups'`, THE Step2CirclesHandler SHALL render the modal title as "Organize Contacts" and display group-specific content in the mode content container.
4. THE Step2CirclesHandler SHALL render the ContextToggle component in the modal header area, between the title and the existing ModeToggle.
5. WHEN the user switches context via the ContextToggle, THE Step2CirclesHandler SHALL preserve any unsaved assignment changes from the previous context and update the mode content container to match the selected context without closing the modal.
6. WHEN the user switches context via the ContextToggle, THE Step2CirclesHandler SHALL show or hide the ModeToggle as appropriate (ModeToggle is relevant for circles context; groups context may have its own mode options or reuse the same organize/swipe pattern).

### Requirement 6: Groups Support in List Mode (CircleListView)

**User Story:** As a user, I want to see my contacts organized by groups in list mode, so that I can review and manage group memberships visually.

#### Acceptance Criteria

1. THE CircleListView constructor SHALL accept a new `context` option with values `'circles'` (default) or `'groups'`.
2. WHEN `context` is `'circles'`, THE CircleListView SHALL render sections and behavior identical to the current production implementation.
3. WHEN `context` is `'groups'`, THE CircleListView SHALL render one section per user group plus an "Ungrouped" section for contacts with no group assignments.
4. WHEN `context` is `'groups'`, THE CircleListView SHALL display a contact in each group section the contact belongs to (multi-group support).
5. WHEN `context` is `'groups'`, THE CircleListView SHALL display AI suggestion pills (from GroupAISuggestionService) within each group section, showing the suggested contact name and a Confidence_Score badge.
6. WHEN the user accepts an AI suggestion pill, THE CircleListView SHALL call the group assignment API and move the contact chip into the group section.
7. WHEN the user rejects an AI suggestion pill, THE CircleListView SHALL remove the pill and record the rejection in the `group_suggestion_feedback` table.
8. WHEN the user types in the search input, THE CircleListView SHALL filter contacts across all group sections to show only matching contacts.

### Requirement 7: Groups Support in Swipe Mode (QuickRefineCard)

**User Story:** As a user, I want to assign contacts to groups using the swipe card interface, so that I can quickly organize contacts into groups one at a time.

#### Acceptance Criteria

1. THE QuickRefineCard constructor SHALL accept a new `context` option with values `'circles'` (default) or `'groups'`.
2. WHEN `context` is `'circles'`, THE QuickRefineCard SHALL render buttons and behavior identical to the current production implementation.
3. WHEN `context` is `'groups'`, THE QuickRefineCard SHALL render one button per user group, each labeled with the group name and its assigned keyboard shortcut (0-9).
4. WHEN `context` is `'groups'` and the user presses a numeric key (0-9), THE QuickRefineCard SHALL assign the current contact to the group mapped to that shortcut.
5. WHEN `context` is `'groups'`, THE QuickRefineCard SHALL display an "Add Another" button that allows assigning the current contact to an additional group before advancing to the next contact.
6. WHEN `context` is `'groups'`, THE QuickRefineCard SHALL support the shared keyboard shortcuts A (archive), S (save for later), and D (done) identically to circles context.
7. WHEN `context` is `'groups'`, THE QuickRefineCard SHALL support touch swipe gestures for group assignment identically to how swipe gestures work in circles context.

### Requirement 8: Keyboard Shortcut Preferences

**User Story:** As a user, I want to assign keyboard shortcuts to my groups, so that I can quickly assign contacts to groups using number keys in swipe mode.

#### Acceptance Criteria

1. THE KeyboardShortcutPreferences component SHALL display a list of the user's groups, each with a dropdown to assign a numeric shortcut (0-9).
2. WHEN the user assigns a shortcut already in use by another group, THE KeyboardShortcutPreferences SHALL prevent the duplicate assignment and display a validation message identifying the conflict.
3. WHEN the user has 10 or fewer groups, THE KeyboardShortcutPreferences SHALL auto-assign shortcuts 0-9 sequentially to groups that lack a shortcut.
4. WHEN the user saves shortcut preferences, THE KeyboardShortcutPreferences SHALL persist the assignments via the `PUT /api/users/preferences/keyboard-shortcuts` endpoint.
5. THE KeyboardShortcutPreferences SHALL be accessible from a gear icon button rendered in the QuickRefineCard header when `context` is `'groups'`.

### Requirement 9: Entry Points

**User Story:** As a user, I want clear entry points to organize both my circles and my groups, so that I can access the right organization flow from the contacts page.

#### Acceptance Criteria

1. THE existing Circles tab banner (conditional, shown when uncategorized contacts > 0) and the permanent "Manage Circles" button SHALL continue to call `openManageCirclesFromDirectory()`, which routes through `Step2CirclesHandler` with `entryContext` set to `'circles'`.
2. THE Groups tab SHALL display a banner showing the count of Ungrouped_Contacts (fetched from `GET /api/contacts/ungrouped-count`) and an "Organize Groups" button WHEN the ungrouped count is greater than 0.
3. WHEN the user clicks the Groups tab "Organize Groups" button, THE application SHALL call `openManageCirclesFromDirectory()` with `entryContext` set to `'groups'`.
4. THE `openManageCirclesFromDirectory()` function SHALL accept an optional `entryContext` parameter (default `'circles'`) and pass it through to `Step2CirclesHandler.openManageCirclesFlow()`.
5. WHEN `entryContext` is `'groups'`, THE `Step2CirclesHandler.openManageCirclesFlow()` SHALL fetch the user's groups before constructing the modal.

### Requirement 10: Context-Aware Progress Indicator

**User Story:** As a user, I want to see my organization progress for the active context, so that I know how many contacts I have left to organize.

#### Acceptance Criteria

1. WHEN the active context is `'circles'`, THE ProgressIndicator SHALL display "X/Y contacts in circles" with a percentage progress bar, where X is the count of contacts with a Dunbar circle assignment and Y is the total contact count.
2. WHEN the active context is `'groups'`, THE ProgressIndicator SHALL display "X contacts in groups" as a simple count without a maximum or percentage bar.
3. WHEN a contact assignment changes (circle or group), THE ProgressIndicator SHALL update the displayed count within 500ms without requiring a page reload.
4. WHEN the user switches context via the ContextToggle, THE ProgressIndicator SHALL update to display the metric appropriate for the new context.

### Requirement 11: Group Assignment Persistence

**User Story:** As a user, I want my group assignments to save immediately, so that I don't lose my work if I close the modal.

#### Acceptance Criteria

1. WHEN the user assigns a contact to a group, THE application SHALL immediately send a POST request to `/api/contacts/:id/groups/:groupId` (optimistic update).
2. WHEN the user removes a contact from a group, THE application SHALL immediately send a DELETE request to `/api/contacts/:id/groups/:groupId` (optimistic update).
3. IF a group assignment API request fails, THEN THE application SHALL revert the UI to the previous state and display a toast notification with a "Retry" action.
4. THE existing circle assignment persistence logic SHALL remain unchanged with no modifications to the `handleCircleAssignment` or `saveAllAssignments` methods.

### Requirement 12: Accessibility

**User Story:** As a user who relies on assistive technology, I want the organize contacts experience to be fully keyboard and screen-reader accessible.

#### Acceptance Criteria

1. THE ContextToggle SHALL use `role="tablist"` on the container element and `role="tab"` with `aria-selected` attribute on each option element.
2. WHEN a contact card transitions in swipe mode, THE QuickRefineCard SHALL announce the new contact name and position (e.g., "Contact 3 of 15") via an `aria-live="polite"` region.
3. WHILE the Step2CirclesHandler modal is open, THE modal SHALL trap keyboard focus within the modal boundary, preventing focus from escaping to background content.
4. THE ContextToggle, group buttons, suggestion pills, and all interactive elements SHALL display a visible focus indicator that meets a minimum 3:1 contrast ratio against adjacent colors.
