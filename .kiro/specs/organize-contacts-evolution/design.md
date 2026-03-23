# Design Document: Organize Contacts Evolution

## Overview

This design extends the existing Organize Your Circles modal into a unified Organize Contacts experience supporting both Circles (Dunbar tiers) and Groups (user-defined collections). All changes are additive — existing production behavior is preserved as the default path.

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Entry Points                          │
│  ┌──────────────────┐    ┌───────────────────────────┐  │
│  │ Circles Tab       │    │ Groups Tab                │  │
│  │ Banner (existing, │    │ Banner (new, ungrouped    │  │
│  │ unchanged)        │    │ count from API)            │  │
│  └────────┬──────────┘    └────────────┬──────────────┘  │
│           │ entryContext='circles'      │ entryContext='groups'
│           └────────────┬───────────────┘                 │
│                        ▼                                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │       Step2CirclesHandler (primary entry)            │ │
│  │  ┌───────────────────────────────────┐              │ │
│  │  │     ContextToggle (new)           │              │ │
│  │  │  [Circles] | [Groups]             │              │ │
│  │  └───────────────┬───────────────────┘              │ │
│  │                  │ context-changed event             │ │
│  │    ┌─────────────┴──────────────┐                   │ │
│  │    ▼                            ▼                   │ │
│  │  Circles Context              Groups Context        │ │
│  │  (existing behavior)          (new behavior)        │ │
│  │    │                            │                   │ │
│  │    ├─ ModeToggle (existing)     ├─ ModeToggle       │ │
│  │    │  [Organize|Swipe]          │  [Organize|Swipe] │ │
│  │    │                            │                   │ │
│  │    ├─ CircleListView            ├─ CircleListView   │ │
│  │    │  (context='circles')       │  (context='groups')│ │
│  │    │                            │                   │ │
│  │    ├─ QuickRefineCard           ├─ QuickRefineCard  │ │
│  │    │  (context='circles')       │  (context='groups')│ │
│  │    │                            │                   │ │
│  │    └─ ProgressIndicator         └─ ProgressIndicator│ │
│  │       (circles metric)             (groups metric)  │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

Backend Services:
┌──────────────────────────────────────────────────────────┐
│  Existing (extended)              New                     │
│  ┌────────────────────┐  ┌──────────────────────────┐   │
│  │ AISuggestionService│  │ GroupAISuggestionService  │   │
│  │ + cold start mode  │  │ (src/matching/)           │   │
│  └────────────────────┘  └──────────────────────────┘   │
│  ┌────────────────────┐  ┌──────────────────────────┐   │
│  │ InteractionRepo    │  │ group_suggestion_feedback │   │
│  │ + countByUserId()  │  │ table                    │   │
│  └────────────────────┘  └──────────────────────────┘   │
│  ┌────────────────────┐  ┌──────────────────────────┐   │
│  │ UserPreferences    │  │ user_preferences table   │   │
│  │ + key-value store  │  │                          │   │
│  └────────────────────┘  └──────────────────────────┘   │
│  ┌────────────────────┐                                  │
│  │ GroupRepository    │                                  │
│  │ (unchanged)        │                                  │
│  └────────────────────┘                                  │
└──────────────────────────────────────────────────────────┘
```

## Database Changes

### New Tables

#### `group_suggestion_feedback`

```sql
CREATE TABLE IF NOT EXISTS group_suggestion_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(50) NOT NULL DEFAULT 'ai',
  feedback VARCHAR(20) NOT NULL CHECK (feedback IN ('accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, contact_id, group_id)
);

CREATE INDEX idx_gsf_user_contact ON group_suggestion_feedback(user_id, contact_id);
CREATE INDEX idx_gsf_user_group ON group_suggestion_feedback(user_id, group_id);
```

#### `user_preferences` (key-value store)

```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_key VARCHAR(255) NOT NULL,
  preference_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

CREATE INDEX idx_up_user_key ON user_preferences(user_id, preference_key);
```

### Existing Table Changes

None. All existing tables remain unchanged.

## API Changes

### New Endpoints

All endpoints require JWT authentication via existing `authMiddleware`.

#### `GET /api/contacts/ungrouped-count`

Returns count of contacts with no group assignments.

```typescript
// Response: { count: number }
// Implementation: SELECT COUNT(*) FROM contacts c
//   WHERE c.user_id = $1 AND c.archived = false
//   AND NOT EXISTS (SELECT 1 FROM contact_groups cg WHERE cg.contact_id = c.id)
```

#### `POST /api/contacts/:id/groups/:groupId`

Assigns a contact to a group. Uses existing `GroupRepository.assignContact()`.

```typescript
// Response: { success: true }
// Errors: 404 if contact or group not found, 409 if already assigned
```

#### `DELETE /api/contacts/:id/groups/:groupId`

Removes a contact from a group. Uses existing `GroupRepository.removeContact()`.

```typescript
// Response: { success: true }
// Errors: 404 if contact or group not found
```

#### `GET /api/contacts/:id/group-suggestions`

Returns AI group suggestions for a single contact.

```typescript
// Response: { suggestions: Array<{ groupId: string, groupName: string, confidence: number, signals: SignalBreakdown }> }
```

#### `POST /api/contacts/batch-group-suggestions`

Returns AI group suggestions for multiple contacts.

```typescript
// Request: { contactIds: string[] }
// Response: { results: Record<string, Array<{ groupId: string, groupName: string, confidence: number, signals: SignalBreakdown }>> }
```

#### `GET /api/users/preferences/:key`

Returns a stored preference value.

```typescript
// Response: { key: string, value: any } or 404 if not found
```

#### `PUT /api/users/preferences/:key`

Stores or updates a preference value.

```typescript
// Request: { value: any }
// Response: { key: string, value: any, updatedAt: string }
```

### Existing Endpoint Changes

None. All existing endpoints remain unchanged.

## New Files

### Backend

#### `src/matching/group-ai-suggestion-service.ts`

New service for AI-powered group suggestions with weighted signal hierarchy.

```typescript
export interface GroupSuggestion {
  groupId: string;
  groupName: string;
  confidence: number; // 0-100
  signals: SignalBreakdown;
}

export interface SignalBreakdown {
  googleGroupMatch: number;        // weight: 35% (highest — direct label match)
  interactionFrequency: number;    // weight: 20%
  calendarCoAttendance: number;    // weight: 20%
  sharedTags: number;              // weight: 15%
  contactMetadata: number;         // weight: 10%
}

export interface GroupAISuggestionService {
  suggestGroupsForContact(userId: string, contactId: string): Promise<GroupSuggestion[]>;
  batchSuggestGroups(userId: string, contactIds: string[]): Promise<Record<string, GroupSuggestion[]>>;
}
```

Signal computation:
- **Google Contact Group name matching (35%)**: Compare the contact's Google Contact Group labels (from sync metadata) against CatchUp group names using case-insensitive fuzzy matching. An exact or near-exact match assigns the full 35% weight — this is the strongest signal because the user already organized this contact in Google.
- **Interaction frequency (20%)**: Query `interaction_logs` for interactions between the contact and other contacts in each group. Higher frequency with group members = higher score.
- **Calendar co-attendance (20%)**: Query `calendar_events` for events where the contact and group members are co-attendees. More shared events = higher score.
- **Shared tags (15%)**: Compare contact's tags with the most common tags among group members. More overlap = higher score.
- **Contact metadata (10%)**: Compare location, company, and other metadata fields between the contact and group members. More matches = higher score.

The service queries `group_suggestion_feedback` to exclude rejected suggestions before returning results.

#### `src/matching/group-suggestion-feedback-repository.ts`

Repository for the `group_suggestion_feedback` table.

```typescript
export interface GroupSuggestionFeedbackRepository {
  recordFeedback(userId: string, contactId: string, groupId: string, feedback: 'accepted' | 'rejected'): Promise<void>;
  getRejectedGroups(userId: string, contactId: string): Promise<string[]>;
  getFeedbackForContact(userId: string, contactId: string): Promise<GroupSuggestionFeedback[]>;
}
```

#### `src/users/user-preferences-repository.ts`

Repository for the generic `user_preferences` key-value table.

```typescript
export interface UserPreferencesRepository {
  get(userId: string, key: string): Promise<any | null>;
  set(userId: string, key: string, value: any): Promise<void>;
  delete(userId: string, key: string): Promise<void>;
}
```

### Frontend

#### `public/js/context-toggle.js`

Standalone segmented control component.

```javascript
class ContextToggle {
  constructor(options = {}) {
    this.context = options.defaultContext || 'circles';
    this.container = null;
    this.onContextChange = options.onContextChange || null;
    // Restore from localStorage
    const saved = localStorage.getItem('organize-contacts-context');
    if (saved === 'circles' || saved === 'groups') {
      this.context = saved;
    }
  }

  render() { /* Returns segmented control HTML with role="tablist" */ }
  attachEventListeners() { /* Click + keyboard (ArrowLeft/Right, Enter/Space) */ }
  setContext(context) { /* Updates state, localStorage, emits event */ }
  getContext() { return this.context; }
  destroy() { /* Cleanup */ }
}
```

#### `public/js/keyboard-shortcut-preferences.js`

Component for managing group-to-shortcut mappings.

```javascript
class KeyboardShortcutPreferences {
  constructor(groups, options = {}) {
    this.groups = groups;
    this.shortcuts = {}; // groupId -> shortcut number
    this.onSave = options.onSave || null;
  }

  render() { /* Popover with group list + shortcut dropdowns */ }
  autoAssign() { /* Sequential 0-9 assignment for <= 10 groups */ }
  validate() { /* Check for duplicate shortcuts */ }
  save() { /* PUT /api/users/preferences/keyboard-shortcuts */ }
  destroy() { /* Cleanup */ }
}
```

## Modified Files

### Backend

#### `src/contacts/interaction-repository.ts`

Add `countByUserId` method to `InteractionRepository` interface and `PostgresInteractionRepository` class.

```typescript
// Add to interface:
countByUserId(userId: string): Promise<number>;

// Add to implementation:
async countByUserId(userId: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM interaction_logs WHERE user_id = $1',
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}
```

#### `src/contacts/ai-suggestion-service.ts`

Add cold-start mode to `PostgresAISuggestionService`. Changes are additive — a new private method `isColdStart()` checks interaction count, and `calculateFactors()` adjusts weights when cold start is active.

```typescript
// New private method:
private async isColdStart(userId: string): Promise<boolean> {
  const count = await this.interactionRepo.countByUserId(userId);
  return count < 10;
}

// Modified in calculateFactors (additive logic):
// if (await this.isColdStart(userId)) {
//   calendarWeight = 0.30; // up from 0.15
//   metadataWeight = 0.25; // up from 0.10
//   confidenceThreshold = 20; // down from 40
// }
```

#### `src/contacts/index.ts`

Add exports for new `countByUserId` from interaction repository.

### Frontend

#### `public/js/step2-circles-handler.js`

Primary integration point. Extend `createModalWithModeToggle()` to accept `entryContext` and `groups` options. Add ContextToggle to the modal header between the title and the existing ModeToggle. Route content loading to circles or groups sub-views based on active context.

Key changes:
- `openManageCirclesFlow()`: Accept optional `entryContext` parameter, fetch groups when `entryContext === 'groups'`
- `createModalWithModeToggle(initialMode, entryContext, groups)`: Add ContextToggle to header, conditionally set title
- New `handleContextChange(context)`: Swap mode content container between circles and groups views, preserve pending state
- New `loadGroupOrganizeModeContent(contentContainer)`: Load CircleListView with `context: 'groups'`
- New `loadGroupSwipeModeContent(contentContainer)`: Load QuickRefineCard with `context: 'groups'`
- Existing circles rendering path: zero changes when `context === 'circles'`

#### `public/js/circle-list-view.js`

Extend `CircleListView` constructor to accept `context` option. Add groups rendering path.

Key changes:
- Constructor: `options.context` (default `'circles'`)
- `render()`: Branch on `this.context` — circles path unchanged, groups path renders group sections
- New `renderGroupSection(group)`: Renders contacts in a group + AI suggestion pills
- New `renderUngroupedSection()` override for groups context
- New `acceptGroupSuggestion(contactId, groupId)`: POST to assign API + record feedback
- New `rejectGroupSuggestion(contactId, groupId)`: Record rejection feedback + remove pill
- `handleSearchInput()`: Extended to filter across group sections when in groups context

#### `public/js/quick-refine-card.js`

Extend `QuickRefineCard` constructor to accept `context` option. Add groups rendering path.

Key changes:
- Constructor: `options.context` (default `'circles'`), `options.groups` (default `[]`), `options.shortcuts` (default `{}`)
- `renderCard()`: Branch on `this.context` — circles path unchanged, groups path renders group buttons with shortcut labels
- New `handleGroupAssignment(groupId)`: POST to assign API, support multi-group via "Add Another"
- `attachKeyboardListeners()`: Extended to handle 0-9 keys for group shortcuts when in groups context
- Shared shortcuts (A/S/D) work identically in both contexts
- Touch gesture handling: reused for groups context with group assignment instead of circle assignment

#### `public/js/app.js`

Extend `openManageCirclesFromDirectory()` to accept optional `entryContext` parameter and pass it through to Step2CirclesHandler.

```javascript
async function openManageCirclesFromDirectory(entryContext = 'circles') {
  // ... existing guard logic unchanged ...
  
  const step2Handler = new Step2CirclesHandler(savedState || { currentStep: 2, isComplete: false });
  await step2Handler.openManageCirclesFlow(entryContext);
}
```

Add Groups tab banner rendering that fetches ungrouped count from `GET /api/contacts/ungrouped-count` and displays "X contacts not in any group — Organize now" with an "Organize Groups" button (only when count > 0). Button calls `openManageCirclesFromDirectory('groups')`.

## Correctness Properties

### Property 1: Ungrouped Count Invariant
For any user, the ungrouped contact count plus the count of contacts in at least one group equals the total non-archived contact count.

```
∀ user: ungroupedCount(user) + groupedCount(user) = totalActiveContacts(user)
```

### Property 2: Group Suggestion Confidence Bounds
All confidence scores returned by GroupAISuggestionService are within [0, 100].

```
∀ suggestion ∈ suggestGroupsForContact(userId, contactId):
  0 ≤ suggestion.confidence ≤ 100
```

### Property 3: Signal Weight Sum
The signal weights in GroupAISuggestionService always sum to 1.0 (100%).

```
googleGroupMatchWeight + interactionFrequencyWeight + calendarCoAttendanceWeight + sharedTagsWeight + contactMetadataWeight = 1.0
```

### Property 4: Rejected Suggestion Exclusion
After a user rejects a group suggestion for a contact, that group never appears in subsequent suggestions for the same contact.

```
∀ (userId, contactId, groupId) ∈ rejectedFeedback:
  groupId ∉ suggestGroupsForContact(userId, contactId).map(s => s.groupId)
```

### Property 5: Batch Suggestion Equivalence
Batch suggestions for N contacts produce the same results as N individual suggestion calls.

```
∀ contactIds:
  batchSuggestGroups(userId, contactIds)[contactId] = suggestGroupsForContact(userId, contactId)
```

### Property 6: Cold Start Threshold Boundary
Cold start mode activates at exactly < 10 interactions and deactivates at >= 10.

```
isColdStart(userId) ⟺ countByUserId(userId) < 10
```

### Property 7: Context Toggle Persistence Round-Trip
Setting a context, persisting to localStorage, and restoring produces the same context.

```
∀ context ∈ {'circles', 'groups'}:
  toggle.setContext(context) → new ContextToggle().getContext() = context
```

### Property 8: Keyboard Shortcut Uniqueness
No two groups share the same keyboard shortcut.

```
∀ (g1, g2) where g1 ≠ g2:
  shortcuts[g1] ≠ shortcuts[g2] (when both are assigned)
```

### Property 9: Multi-Group Display Correctness
In groups context, a contact belonging to N groups appears in exactly N group sections.

```
∀ contact:
  appearances(contact) = |contact.groups|
  (or 1 if contact.groups is empty, in Ungrouped section)
```

### Property 10: Circles Context Backward Compatibility
When context is 'circles', all components render identically to the current production behavior with no behavioral changes.

```
∀ component ∈ {Step2CirclesHandler, CircleListView, QuickRefineCard}:
  component({context: 'circles'}).render() ≡ component().render()  // pre-change
```

### Property 11: Progress Indicator Bounds (Circles)
In circles context, the assigned count never exceeds the total count.

```
WHILE context = 'circles':
  assignedCount ≤ totalCount
  percentage = assignedCount / totalCount (0-100%)
```

### Property 12: Group Assignment Optimistic Revert
If a group assignment API call fails, the UI state reverts to the pre-assignment state.

```
∀ failedAssignment:
  UIState(after failure) = UIState(before assignment attempt)
```

### Property 13: Preference Round-Trip
Setting and getting a preference returns the same value.

```
∀ (key, value):
  PUT /api/users/preferences/key {value} → GET /api/users/preferences/key = {key, value}
```

## Test Strategy

### Unit Tests (Vitest)

| Component | Test File | Key Tests |
|-----------|-----------|-----------|
| GroupAISuggestionService | `src/matching/group-ai-suggestion-service.test.ts` | Signal weight computation, confidence bounds, rejection filtering |
| GroupSuggestionFeedbackRepo | `src/matching/group-suggestion-feedback-repository.test.ts` | CRUD operations, uniqueness constraint |
| UserPreferencesRepository | `src/users/user-preferences-repository.test.ts` | Get/set/delete, round-trip |
| InteractionRepository.countByUserId | `src/contacts/interaction-repository.test.ts` | Count accuracy, zero case |
| Cold start logic | `src/contacts/ai-suggestion-service.test.ts` | Threshold boundary, weight adjustments |

### Property-Based Tests (fast-check)

| Property | Test |
|----------|------|
| Confidence bounds (Property 2) | Generate random signal inputs, verify 0 ≤ confidence ≤ 100 |
| Signal weight sum (Property 3) | Verify weights sum to 1.0 across all configurations |
| Shortcut uniqueness (Property 8) | Generate random group sets, verify no duplicate shortcuts after auto-assign |
| Preference round-trip (Property 13) | Generate random key-value pairs, verify set-then-get equivalence |
| Ungrouped count invariant (Property 1) | Generate random contact-group assignments, verify count equation |

### Manual HTML Tests

| Test File | Coverage |
|-----------|----------|
| `tests/html/context-toggle-test.html` | ContextToggle rendering, keyboard nav, ARIA roles |
| `tests/html/organize-contacts-test.html` | Full modal with context switching, both modes |
| `tests/html/keyboard-shortcuts-test.html` | KeyboardShortcutPreferences popover |
