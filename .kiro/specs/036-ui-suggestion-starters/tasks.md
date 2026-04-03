# Tasks

## Task 1: Create pure utility functions and template constants
- [x] 1.1 Create `contactIdHash(id: string): number` function using DJB2 hash algorithm in `src/matching/suggestion-service.ts`
- [x] 1.2 Create `selectFromPool<T>(pool: T[], contactId: string): T` function that uses `contactIdHash(contactId) % pool.length`
- [x] 1.3 Create `interpolateName(template: string, name: string): string` function that replaces all `[name]` with contact name or "them" if empty
- [x] 1.4 Create `getTimeGapBucket(lastContactDate: Date, now?: Date): 'recent' | 'moderate' | 'long' | 'significant'` function with bucket boundaries at 14, 28, and 90 days
- [x] 1.5 Create `isReasoningSignal(reasoning: string | undefined, signals: string[]): boolean` function for case-insensitive keyword matching
- [x] 1.6 Export all new functions for testing

## Task 2: Define starter template constants
- [x] 2.1 Define `FALLBACK_POOL` array with 15–20 unique conversation starter strings containing `[name]` placeholders
- [x] 2.2 Define `CIRCLE_STARTERS` record with 3+ templates per Dunbar circle tier (`inner`, `close`, `active`, `casual`)
- [x] 2.3 Define `TIME_GAP_STARTERS` record with 2+ templates per time-gap bucket (`recent`, `moderate`, `long`, `significant`)
- [x] 2.4 Define `COMBINED_STARTERS` nested record mapping circle × time-gap bucket to template arrays for common combinations
- [x] 2.5 Define `GOAL_STARTERS` object with `network`, `reconnect`, and `generic` template arrays
- [x] 2.6 Export all template constants for testing

## Task 3: Refactor generateConversationStarter with priority chain
- [x] 3.1 Add optional `goals?: ConnectionGoal[]` parameter to `generateConversationStarter` function signature
- [x] 3.2 Add reasoning-aware signal check at the top of the function using `isReasoningSignal`
- [x] 3.3 Preserve existing tag-based starter logic (priority 1), adding reasoning guard for shared activity signals
- [x] 3.4 Preserve existing calendar-based starter logic (priority 2), adding reasoning guard for shared activity signals
- [x] 3.5 Preserve existing enrichment-based starter logic (priority 3), adding reasoning guard for frequency/declining signals
- [x] 3.6 Add goal-aware starter generation (priority 4): check goal relevance, select from `GOAL_STARTERS.network`, `GOAL_STARTERS.reconnect`, or `GOAL_STARTERS.generic` based on goal keywords and contact circle
- [x] 3.7 Add combined Dunbar circle + time-gap starter generation (priority 5): use `COMBINED_STARTERS` when both dimensions available, fall back to single-dimension `CIRCLE_STARTERS` or `TIME_GAP_STARTERS`
- [x] 3.8 Replace hardcoded fallback string with `selectFromPool(FALLBACK_POOL, contact.id)` (priority 6)
- [x] 3.9 Apply `interpolateName` to the final result before returning

## Task 4: Update generateConversationStarterWithTopics
- [x] 4.1 Fetch active goals via `ConnectionGoalService.getActiveGoals(userId)` and pass to `generateConversationStarter`
- [x] 4.2 Update fallback detection to check pool membership instead of comparing against a single hardcoded string
- [x] 4.3 Ensure enrichment topics path still works as before (between enrichment and goal-aware in priority)

## Task 5: Update loadPendingSuggestions caller
- [x] 5.1 Pass the already-fetched `activeGoals` array from `loadPendingSuggestions` through to `generateConversationStarterWithTopics` or directly to `generateConversationStarter` to avoid redundant DB queries
- [x] 5.2 Update the catch-all fallback starter in `loadPendingSuggestions` to use `selectFromPool(FALLBACK_POOL, contact.id)` instead of the hardcoded string

## Task 6: Write property-based tests
- [x] 6.1 Create `src/matching/suggestion-starters.test.ts` with fast-check property tests
- [x] 6.2 Property 1: Template pool size invariants — verify FALLBACK_POOL has 15-20 unique entries, CIRCLE_STARTERS has 3+ per tier, TIME_GAP_STARTERS has 2+ per bucket
- [x] 6.3 Property 2: Hash determinism — for any string, contactIdHash returns the same value on repeated calls
- [x] 6.4 Property 3: Hash distribution — for 50 random IDs mapped to pool indices, collision rate is below 15%
- [x] 6.5 Property 4: Fallback pool membership — for contacts with no context, result matches a FALLBACK_POOL entry
- [x] 6.6 Property 5: Circle-tier starter correctness — for contacts with only dunbarCircle, result is in CIRCLE_STARTERS[tier]
- [x] 6.7 Property 6: Time-gap bucket starter correctness — for contacts with only lastContactDate, result is in TIME_GAP_STARTERS[bucket]
- [x] 6.8 Property 7: Goal-aware starter correctness — for contacts with matching goals and no higher-priority context, result is in GOAL_STARTERS
- [x] 6.9 Property 8: Reasoning-aware deduplication — starters avoid redundancy with reasoning signal keywords
- [x] 6.10 Property 9: Priority chain ordering — higher-priority strategies win over lower ones
- [x] 6.11 Property 10: Non-empty output invariant — result is always a non-empty string for any contact
- [x] 6.12 Property 11: Name interpolation completeness — output never contains literal `[name]`
- [x] 6.13 Property 12: Combined dimension starters — contacts with both circle and time-gap use combined templates

## Task 7: Write unit tests for edge cases and examples
- [x] 7.1 Test `getTimeGapBucket` boundary values (exactly 14, 28, 90 days)
- [x] 7.2 Test `interpolateName` with multiple `[name]` placeholders and empty name
- [x] 7.3 Test `isReasoningSignal` case insensitivity and undefined reasoning
- [x] 7.4 Test combined starter for inner circle + >90 days (urgent-warm tone, Req 8.2)
- [x] 7.5 Test combined starter for casual circle + <14 days (light-recent tone, Req 8.3)
- [x] 7.6 Test goal starter with "network" keyword selects from network templates
- [x] 7.7 Test goal starter with "reconnect" keyword and inner circle selects from reconnect templates
- [x] 7.8 Regression test: existing tag-based and calendar-based starters still work unchanged
