# Requirements Document

## Introduction

Redesign how CatchUp surfaces AI suggestions to users. The current suggestions page is a separate, flat list that can feel overwhelming. This redesign integrates suggestions into the dashboard using a tabbed layout (mirroring the directory page pattern), limits visible suggestions to reduce cognitive load, explains the reasoning behind each suggestion clearly, and introduces a structured feedback system that improves future suggestion quality. The goal is quality over quantity — a few well-explained, actionable suggestions rather than a long list.

## Glossary

- **Dashboard**: The authenticated home page (`home-dashboard.js`) that displays action items, insights, nudges, and quick actions.
- **Suggestion_Card**: A UI component that presents a single AI-generated suggestion with contact info, reasoning, and action buttons.
- **Suggestion_Service**: The backend service (`suggestion-service.ts`) that generates, scores, and manages suggestion lifecycle.
- **Feedback_Record**: A persisted record of user feedback on a suggestion, including preset category and optional free-text comment.
- **Feedback_Service**: The backend service that stores feedback records and adjusts signal weights based on aggregated feedback patterns.
- **Signal_Weights**: The configurable weights (`SuggestionSignalWeights`) that control how enrichment data, interaction logs, calendar data, and contact metadata contribute to suggestion scores.
- **Reasoning_Summary**: A concise, human-readable explanation of why a suggestion was generated, composed from signal contributions.
- **Dashboard_Tab**: A switchable content section within the dashboard, following the directory page's tab pattern (`switchDirectoryTab`).
- **Progressive_Disclosure**: A UX pattern that shows a summary first and lets users expand for more detail on demand.
- **Preset_Feedback_Option**: A predefined feedback choice (e.g., "Already in touch", "Not relevant right now", "Timing is off") that users can select with one click.
- **Suggestion_Pause**: A user-initiated temporary suspension of all suggestion generation and display, with a configurable duration (1–4 weeks), inspired by Lunchclub's account snooze pattern where users can pause matches from Settings for a defined period.
- **Bulk_Dismiss**: A single action that dismisses all currently pending suggestions at once, applying a default feedback category to each.
- **Conversation_Starter**: An AI-generated icebreaker or talking point surfaced on a Suggestion_Card, derived from shared context, recent topics, or mutual interests, inspired by Boardy AI's approach of providing brief context on why a match makes sense so both parties can hit the ground running.
- **Post_Interaction_Review**: A lightweight follow-up prompt shown after a user acts on a suggestion, asking whether the catch-up happened and how it went, feeding outcomes back into the Suggestion_Service to improve future match quality (inspired by Boardy AI's post-meeting review that trains the matching algorithm).
- **Weekly_Digest**: A periodic summary of the user's top suggestions for the upcoming week, surfaced as a dashboard banner or notification, inspired by Boardy AI's weekly check-in cadence that keeps networking momentum without requiring daily engagement.
- **Connection_Goal**: A user-defined priority or intent (e.g., "Find a co-founder", "Reconnect with college friends", "Grow professional network") that the Suggestion_Service uses to boost contacts whose tags, groups, circles, or enrichment data align with the goal. Inspired by Boardy AI's goal-based matching where users share their current objectives and the AI leans toward matches that serve those objectives.

## Requirements

### Requirement 1: Dashboard Tab Integration

**User Story:** As a user, I want to see suggestions directly on my dashboard in a dedicated tab, so that I don't have to navigate to a separate page to act on them.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL render a tab bar with at least two tabs: "Overview" and "Suggestions".
2. WHEN a user clicks the "Suggestions" tab, THE Dashboard SHALL display the suggestions content and hide the overview content.
3. WHEN a user clicks the "Overview" tab, THE Dashboard SHALL display the existing dashboard content (action items, insights, nudges, quick actions) and hide the suggestions content.
4. THE Dashboard SHALL persist the user's last selected tab in localStorage and restore it on subsequent visits.
5. THE Dashboard SHALL update the URL hash when switching tabs (e.g., `#dashboard/overview`, `#dashboard/suggestions`).
6. WHEN the URL contains a dashboard tab hash on page load, THE Dashboard SHALL activate the corresponding tab.

### Requirement 2: Suggestion Quantity Limit and Progressive Disclosure

**User Story:** As a user, I want to see only a few top suggestions at a time, so that I am not overwhelmed by too many choices.

#### Acceptance Criteria

1. THE Dashboard Suggestions tab SHALL display a maximum of 3 pending Suggestion_Cards by default.
2. WHEN more than 3 pending suggestions exist, THE Dashboard SHALL display a "Show more suggestions" control that reveals the next batch of up to 3 suggestions.
3. THE Suggestion_Service SHALL sort suggestions by weighted score in descending order before returning them to the Dashboard.
4. WHEN a user accepts, dismisses, or snoozes a visible suggestion, THE Dashboard SHALL promote the next highest-scored pending suggestion into the visible set without a full page reload.
5. WHEN zero pending suggestions exist, THE Dashboard Suggestions tab SHALL display an empty state message: "You're all caught up. No suggestions right now."

### Requirement 3: Reasoning Transparency

**User Story:** As a user, I want to understand why each suggestion is made, so that I can make informed decisions about whether to act on it.

#### Acceptance Criteria

1. THE Suggestion_Card SHALL display a Reasoning_Summary that explains the primary factor behind the suggestion in one sentence.
2. WHEN a suggestion is driven by frequency decay, THE Reasoning_Summary SHALL include the contact's frequency preference and how long since last contact (e.g., "You usually catch up monthly, but it's been 47 days").
3. WHEN a suggestion is driven by declining communication frequency, THE Reasoning_Summary SHALL state that messaging frequency has dropped (e.g., "Your WhatsApp messages with this contact dropped from 12/month to 3/month").
4. WHEN a suggestion is driven by a shared activity match, THE Reasoning_Summary SHALL reference the calendar event and the matching interest.
5. THE Suggestion_Card SHALL include an expandable "Details" section that shows the full signal contribution breakdown (enrichment score, interaction score, calendar score, metadata score) as a simple bar or percentage display.
6. THE Suggestion_Service SHALL return the `SignalContribution` object alongside each suggestion in the API response.

### Requirement 4: Structured Feedback System

**User Story:** As a user, I want to give quick feedback on suggestions, so that future suggestions better match my preferences.

#### Acceptance Criteria

1. WHEN a user dismisses a suggestion, THE Suggestion_Card SHALL present a set of Preset_Feedback_Options instead of a browser `prompt()` dialog.
2. THE Preset_Feedback_Options SHALL include at minimum: "Already in touch", "Not relevant right now", "Timing is off", "Don't suggest this contact", and "Other".
3. WHEN a user selects "Other", THE Suggestion_Card SHALL reveal a text input field for free-text feedback.
4. WHEN a user selects any Preset_Feedback_Option, THE Dashboard SHALL submit the feedback and dismiss the suggestion in a single action.
5. THE Feedback_Service SHALL persist each Feedback_Record with the suggestion ID, user ID, selected preset option, optional free-text comment, and timestamp.
6. THE Feedback_Service SHALL store Feedback_Records in a `suggestion_feedback` database table.

### Requirement 5: Feedback-Driven Weight Adjustment

**User Story:** As a user, I want my feedback to improve future suggestions, so that the system learns my preferences over time.

#### Acceptance Criteria

1. WHEN a user accumulates 5 or more "Not relevant right now" Feedback_Records within 30 days, THE Feedback_Service SHALL reduce the `contactMetadata` signal weight by 10% for that user's Signal_Weights.
2. WHEN a user accumulates 5 or more "Timing is off" Feedback_Records within 30 days, THE Feedback_Service SHALL reduce the `calendarData` signal weight by 10% for that user's Signal_Weights.
3. WHEN a user selects "Don't suggest this contact" for a specific contact, THE Suggestion_Service SHALL exclude that contact from future suggestion generation for that user.
4. WHEN a user accumulates 3 or more "Already in touch" Feedback_Records within 30 days, THE Feedback_Service SHALL increase the `interactionLogs` signal weight by 10% for that user's Signal_Weights.
5. THE Feedback_Service SHALL normalize all Signal_Weights so they sum to 1.0 after any adjustment.
6. THE Feedback_Service SHALL cap individual signal weight adjustments at a minimum of 0.05 and a maximum of 0.60.

### Requirement 6: Suggestion Card Redesign

**User Story:** As a user, I want suggestion cards to be visually clean and easy to scan, so that I can quickly decide what to do.

#### Acceptance Criteria

1. THE Suggestion_Card SHALL display the contact avatar, contact name, Reasoning_Summary, and action buttons in a single-row or compact two-row layout.
2. THE Suggestion_Card SHALL use a warm, muted color palette consistent with the existing CatchUp design system (pastel greens, ambers, pinks from the current suggestion avatars).
3. THE Suggestion_Card SHALL display the suggestion type ("One-on-One" or "Group Catchup") as a subtle label, not a prominent badge.
4. WHEN a suggestion is for a group, THE Suggestion_Card SHALL display overlapping avatars for up to 3 contacts and a "+N" indicator for additional contacts.
5. THE Suggestion_Card SHALL provide three primary actions for pending suggestions: "Reach out" (accept), "Not now" (dismiss with feedback), and "Snooze".
6. THE Suggestion_Card SHALL render the "Reach out" action as the visually prominent primary button and "Not now" and "Snooze" as secondary actions.

### Requirement 7: Feedback API Endpoints

**User Story:** As a developer, I want API endpoints for submitting and retrieving suggestion feedback, so that the frontend can interact with the feedback system.

#### Acceptance Criteria

1. THE API SHALL expose a `POST /api/suggestions/:id/feedback` endpoint that accepts a JSON body with `preset` (string, required), `comment` (string, optional), and persists a Feedback_Record.
2. WHEN the `POST /api/suggestions/:id/feedback` endpoint receives an invalid preset value, THE API SHALL return a 400 status with a descriptive error message.
3. THE API SHALL expose a `GET /api/suggestions/feedback/summary` endpoint that returns aggregated feedback counts grouped by preset option for the authenticated user.
4. THE `POST /api/suggestions/:id/feedback` endpoint SHALL also dismiss the suggestion (set status to "dismissed") as part of the same transaction.
5. IF the suggestion referenced by `:id` does not exist or does not belong to the authenticated user, THEN THE API SHALL return a 404 status.

### Requirement 8: Contact Exclusion from Suggestions

**User Story:** As a user, I want to permanently stop receiving suggestions for a specific contact, so that I am not repeatedly prompted about contacts I don't want to catch up with.

#### Acceptance Criteria

1. WHEN a user selects "Don't suggest this contact" feedback, THE Feedback_Service SHALL create an exclusion record in a `suggestion_exclusions` table with user ID and contact ID.
2. WHEN generating suggestions, THE Suggestion_Service SHALL query the `suggestion_exclusions` table and exclude all matching contacts from the candidate pool.
3. THE API SHALL expose a `GET /api/suggestions/exclusions` endpoint that returns the list of excluded contacts for the authenticated user.
4. THE API SHALL expose a `DELETE /api/suggestions/exclusions/:contactId` endpoint that removes an exclusion, allowing the contact to appear in future suggestions.
5. WHEN an exclusion is removed via the DELETE endpoint, THE Suggestion_Service SHALL include the contact in the next suggestion generation cycle.

### Requirement 10: Dismiss All Pending Suggestions

**User Story:** As a user, I want to dismiss all pending suggestions at once, so that I can clear my suggestion queue when none of them are relevant without clicking through each one individually.

#### Acceptance Criteria

1. WHEN the Dashboard Suggestions tab displays one or more pending suggestions, THE Dashboard SHALL render a "Dismiss all" control in the tab header area.
2. WHEN a user clicks "Dismiss all", THE Dashboard SHALL display a confirmation prompt asking the user to confirm the bulk dismissal.
3. WHEN the user confirms the bulk dismissal, THE Dashboard SHALL dismiss all pending suggestions for that user, applying the "Not relevant right now" feedback preset to each.
4. THE API SHALL expose a `POST /api/suggestions/dismiss-all` endpoint that sets all pending suggestions for the authenticated user to "dismissed" status and creates a Feedback_Record with preset "Not relevant right now" for each.
5. WHEN the bulk dismissal completes, THE Dashboard SHALL display the empty state message: "You're all caught up. No suggestions right now."
6. THE "Dismiss all" control SHALL NOT appear when zero pending suggestions exist.

### Requirement 11: Pause and Resume Suggestions

**User Story:** As a user, I want to temporarily pause all suggestions for a set period, so that I can take a break from suggestions when I'm busy or traveling without losing my data or preferences.

#### Acceptance Criteria

1. THE Dashboard Suggestions tab SHALL display a "Pause suggestions" control accessible from the tab header area.
2. WHEN a user clicks "Pause suggestions", THE Dashboard SHALL present duration options: 1 week, 2 weeks, 3 weeks, and 4 weeks.
3. WHEN a user selects a pause duration, THE Suggestion_Service SHALL record a pause state in a `suggestion_pauses` table with user ID, pause start timestamp, and pause end timestamp.
4. WHILE a user's suggestions are paused, THE Suggestion_Service SHALL NOT generate new suggestions for that user.
5. WHILE a user's suggestions are paused, THE Dashboard Suggestions tab SHALL display a paused state banner showing the remaining pause duration and a "Resume suggestions" button.
6. WHEN a user clicks "Resume suggestions", THE Suggestion_Service SHALL delete the active pause record and immediately allow new suggestion generation.
7. WHEN the pause duration expires, THE Suggestion_Service SHALL automatically resume suggestion generation without user action.
8. THE API SHALL expose a `POST /api/suggestions/pause` endpoint that accepts a JSON body with `weeks` (integer, 1–4) and creates a pause record.
9. THE API SHALL expose a `DELETE /api/suggestions/pause` endpoint that removes the active pause record (early resume).
10. THE API SHALL expose a `GET /api/suggestions/pause` endpoint that returns the current pause state (active/inactive, end date) for the authenticated user.

### Requirement 12: Conversation Starters on Suggestion Cards

**User Story:** As a user, I want each suggestion to include a conversation starter or icebreaker, so that I know what to talk about when I reach out and the interaction feels natural rather than forced.

#### Acceptance Criteria

1. THE Suggestion_Card SHALL display a Conversation_Starter below the Reasoning_Summary, prefixed with a 💬 icon and styled as a subtle, italicized prompt.
2. WHEN a suggestion is driven by shared interests or tags, THE Suggestion_Service SHALL generate a Conversation_Starter referencing those shared topics (e.g., "You both follow hiking — ask about their recent trail").
3. WHEN a suggestion is driven by a calendar event, THE Suggestion_Service SHALL generate a Conversation_Starter referencing the event context (e.g., "You're both attending the product meetup Thursday — suggest grabbing coffee after").
4. WHEN a suggestion is driven by frequency decay with enrichment data, THE Suggestion_Service SHALL generate a Conversation_Starter referencing the last known topic of conversation (e.g., "Last time you talked about their job search — check in on how it's going").
5. WHEN no specific context is available for a Conversation_Starter, THE Suggestion_Service SHALL fall back to a generic but warm prompt (e.g., "It's been a while — a simple 'how are you?' goes a long way").
6. THE Conversation_Starter SHALL be generated server-side by the Suggestion_Service and included in the suggestion API response as a `conversationStarter` string field.

### Requirement 13: Post-Interaction Review

**User Story:** As a user, I want to record how a suggested catch-up went after I act on it, so that the system learns which suggestions lead to meaningful interactions and improves over time.

#### Acceptance Criteria

1. WHEN a user accepts a suggestion, THE Suggestion_Service SHALL mark the suggestion as "accepted" and set a `reviewPromptAfter` timestamp to 48 hours after acceptance.
2. WHEN the `reviewPromptAfter` timestamp has passed and the user visits the Dashboard, THE Dashboard SHALL display a Post_Interaction_Review prompt for that suggestion.
3. THE Post_Interaction_Review prompt SHALL ask "Did you catch up with [contact name]?" with options: "Yes, it went well", "Yes, but it wasn't great", "Not yet", and "Skip".
4. WHEN a user selects "Yes, it went well", THE Feedback_Service SHALL record a positive outcome and increase the suggestion score weight for the signals that contributed to that suggestion by 5%.
5. WHEN a user selects "Yes, but it wasn't great", THE Feedback_Service SHALL record a negative outcome and decrease the suggestion score weight for the contributing signals by 5%.
6. WHEN a user selects "Not yet", THE Suggestion_Service SHALL reschedule the review prompt for 48 hours later, up to a maximum of 2 reschedules.
7. THE API SHALL expose a `POST /api/suggestions/:id/review` endpoint that accepts a JSON body with `outcome` (string, required) and persists the review.
8. THE Post_Interaction_Review prompt SHALL auto-dismiss after 7 days if the user does not respond.

### Requirement 14: Weekly Suggestion Digest

**User Story:** As a user, I want to see a weekly summary of my top suggestions, so that I can plan my outreach for the week without checking the app daily.

#### Acceptance Criteria

1. WHEN a user visits the Dashboard on the first visit of a new calendar week (Monday or later, based on the user's last digest view timestamp), THE Dashboard SHALL display a Weekly_Digest banner at the top of the Suggestions tab.
2. THE Weekly_Digest banner SHALL summarize the top 3 pending suggestions with contact names and one-line reasoning for each.
3. THE Weekly_Digest banner SHALL include a "View all" link that scrolls to or reveals the full suggestion cards below.
4. THE Weekly_Digest banner SHALL include a "Dismiss digest" control that hides the banner for the current week.
5. THE Suggestion_Service SHALL track the user's last digest view timestamp in the `user_preferences` table to determine when to show the next digest.
6. THE Weekly_Digest SHALL NOT appear if the user has zero pending suggestions or if suggestions are paused.

### Requirement 15: Connection Goal Setting

**User Story:** As a user, I want to set what's currently top of mind for me (e.g., "looking for a new job", "planning a trip with friends", "growing my freelance network"), so that suggestions prioritize contacts who are relevant to what I'm focused on right now.

#### Acceptance Criteria

1. THE Dashboard Suggestions tab SHALL display a "Set a goal" prompt when no active Connection_Goal exists, rendered as a subtle card above the suggestion list.
2. WHEN a user clicks "Set a goal", THE Dashboard SHALL present a goal input form with a free-text field and a set of preset goal templates: "Reconnect with old friends", "Grow professional network", "Plan something social", "Get advice or mentorship", and "Custom".
3. WHEN a user submits a Connection_Goal, THE Suggestion_Service SHALL persist it in a `connection_goals` table with user ID, goal text, associated keywords (extracted from the goal text), status (active/completed/archived), and timestamps.
4. THE user SHALL have at most 2 active Connection_Goals at any time to maintain focus.
5. WHEN a user has an active Connection_Goal, THE Dashboard Suggestions tab SHALL display the active goal(s) as a compact banner below the tab bar, showing the goal text and a "Change" / "Clear" control.
6. THE API SHALL expose a `POST /api/suggestions/goals` endpoint that accepts a JSON body with `text` (string, required) and persists a new Connection_Goal.
7. THE API SHALL expose a `GET /api/suggestions/goals` endpoint that returns active Connection_Goals for the authenticated user.
8. THE API SHALL expose a `DELETE /api/suggestions/goals/:goalId` endpoint that archives a Connection_Goal.

### Requirement 16: Goal-Aware Suggestion Scoring

**User Story:** As a user, I want my active connection goals to influence which suggestions appear first, so that the people most relevant to what I'm working on are surfaced at the top.

#### Acceptance Criteria

1. WHEN one or more Connection_Goals are active, THE Suggestion_Service SHALL compute a `goalRelevance` score (0–100) for each candidate contact by matching the goal's keywords against the contact's tags, group names, Dunbar circle, enrichment topics, location, and custom notes.
2. THE `goalRelevance` score SHALL be incorporated into the weighted scoring formula as a fifth signal, with a default weight of 0.20, redistributing the existing four signal weights proportionally to maintain a sum of 1.0.
3. WHEN a contact's tags or group names contain an exact or fuzzy match (Levenshtein distance ≤ 2) to a Connection_Goal keyword, THE `goalRelevance` score SHALL receive a +30 boost per match, capped at 100.
4. WHEN a contact's enrichment topics (from chat imports) overlap with Connection_Goal keywords, THE `goalRelevance` score SHALL receive a +20 boost per overlapping topic, capped at 100.
5. WHEN a contact's Dunbar circle is "inner" or "close" and the Connection_Goal is social in nature (contains keywords like "friends", "social", "reconnect"), THE `goalRelevance` score SHALL receive a +25 boost.
6. WHEN a contact's Dunbar circle is "active" or "casual" and the Connection_Goal is professional in nature (contains keywords like "network", "career", "mentor", "job", "freelance"), THE `goalRelevance` score SHALL receive a +25 boost.
7. THE Reasoning_Summary on goal-boosted Suggestion_Cards SHALL include a reference to the matching goal (e.g., "Relevant to your goal: Grow professional network — they work in your target industry").
8. THE `SignalContribution` object SHALL be extended with a `goalRelevanceScore` field reflecting the goal signal's contribution.
9. WHEN no Connection_Goals are active, THE Suggestion_Service SHALL use the original four-signal weighting with no `goalRelevance` component.

### Requirement 9: Backward Compatibility and Migration

**User Story:** As a developer, I want the redesign to coexist with existing suggestion infrastructure, so that no data is lost and existing API consumers continue to work.

#### Acceptance Criteria

1. THE existing `POST /api/suggestions/:id/dismiss` endpoint SHALL continue to function, treating dismissals without preset feedback as "Not relevant right now" by default.
2. THE existing `GET /api/suggestions/all` endpoint SHALL continue to return all suggestions with the same response shape, augmented with the `signalContribution` field.
3. THE existing `suggestion_signal_weights` table SHALL be reused for storing per-user weight adjustments from the Feedback_Service.
4. WHEN the `suggestion_feedback` migration runs, THE database SHALL create the `suggestion_feedback`, `suggestion_exclusions`, `suggestion_pauses`, and `connection_goals` tables without modifying existing tables.
