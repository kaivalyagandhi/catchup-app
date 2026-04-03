# Requirements Document

## Introduction

This feature replaces the single generic fallback conversation starter ("It's been a while — a simple 'how are you?' goes a long way") with a context-aware starter generation system. Currently, most contacts lack enrichment data (tags, calendar events, topics), so the fallback is repeated on every suggestion card, making the UI feel generic. The improvement introduces a pool of varied fallback starters selected deterministically per contact, and layers in Dunbar circle awareness, time-gap awareness, goal awareness, and reasoning-signal awareness to produce more relevant and varied conversation starters.

## Glossary

- **Starter_Generator**: The `generateConversationStarter` and `generateConversationStarterWithTopics` functions in `src/matching/suggestion-service.ts` that produce conversation starter text for suggestion cards
- **Fallback_Pool**: A static array of 15–20 varied conversation starter strings used when no enrichment, tag, or calendar context is available for a contact
- **Contact_ID_Hash**: A deterministic hash derived from a contact's `id` string, used to select a consistent starter from the Fallback_Pool for a given contact
- **Dunbar_Circle**: The relationship tier assigned to a contact, one of `inner`, `close`, `active`, or `casual`
- **Time_Gap**: The duration between the current date and a contact's `lastContactDate`, categorized into four buckets: under 2 weeks, 2–4 weeks, 1–3 months, and over 3 months
- **Connection_Goal**: A user-defined goal stored in the `connection_goals` table with `text` and `keywords` fields, used to influence suggestion scoring and starter text
- **Suggestion_Reasoning**: The `reasoning` string on a Suggestion object, which may reference signals such as frequency decay, declining messages, or goal relevance
- **Enrichment_Signal**: Data from the enrichment pipeline including `frequencyTrend`, `topPlatform`, and `lastMessageDate`
- **Suggestion_Card**: A UI card in the home dashboard displaying an AI-generated suggestion, including a conversation starter line

## Requirements

### Requirement 1: Varied Fallback Starter Pool

**User Story:** As a user, I want to see different conversation starters across my suggestion cards, so that the suggestions feel personalized rather than repetitive.

#### Acceptance Criteria

1. THE Starter_Generator SHALL maintain a Fallback_Pool containing a minimum of 15 and a maximum of 20 distinct conversation starter strings
2. WHEN no enrichment, tag, or calendar context is available for a contact, THE Starter_Generator SHALL select a starter from the Fallback_Pool using a Contact_ID_Hash
3. THE Contact_ID_Hash SHALL produce the same index for the same contact `id` across repeated invocations, ensuring deterministic selection
4. THE Contact_ID_Hash SHALL distribute selections across the full Fallback_Pool such that different contact IDs map to different starters with uniform probability
5. WHEN two contacts have different `id` values, THE Starter_Generator SHALL produce different Fallback_Pool indices with high probability (hash collision rate below 15% for any pool of 50 contacts)

### Requirement 2: Dunbar Circle-Aware Starters

**User Story:** As a user, I want conversation starters that match the closeness of my relationship with each contact, so that the tone feels appropriate.

#### Acceptance Criteria

1. WHEN a contact has a Dunbar_Circle of `inner`, THE Starter_Generator SHALL produce a starter with warm, personal tone referencing the close relationship (e.g., "Check in on how [name]'s doing — you two go way back")
2. WHEN a contact has a Dunbar_Circle of `close`, THE Starter_Generator SHALL produce a starter with friendly tone (e.g., "It's been a minute — drop [name] a quick hello")
3. WHEN a contact has a Dunbar_Circle of `active`, THE Starter_Generator SHALL produce a starter with casual tone (e.g., "Haven't heard from [name] in a while — worth a quick catch-up")
4. WHEN a contact has a Dunbar_Circle of `casual`, THE Starter_Generator SHALL produce a starter with professional or light tone (e.g., "Touch base with [name] — keep the connection alive")
5. WHEN a contact has no Dunbar_Circle assigned, THE Starter_Generator SHALL skip circle-aware generation and fall through to the next applicable strategy
6. THE Starter_Generator SHALL maintain a minimum of 3 starter templates per Dunbar_Circle tier to provide variety within each tier
7. WHEN multiple templates exist for a Dunbar_Circle tier, THE Starter_Generator SHALL select among them deterministically using the Contact_ID_Hash

### Requirement 3: Time-Gap-Aware Starters

**User Story:** As a user, I want the conversation starter to reflect how long it has been since I last contacted someone, so that the urgency and tone match the situation.

#### Acceptance Criteria

1. WHEN a contact's Time_Gap is less than 14 days, THE Starter_Generator SHALL produce a starter reflecting recent contact (e.g., "You chatted recently — keep the momentum going")
2. WHEN a contact's Time_Gap is between 14 and 28 days, THE Starter_Generator SHALL produce a starter reflecting a moderate gap (e.g., "It's been a couple weeks — a quick message would be nice")
3. WHEN a contact's Time_Gap is between 29 and 90 days, THE Starter_Generator SHALL produce a starter reflecting a longer gap (e.g., "It's been over a month — they'd probably love to hear from you")
4. WHEN a contact's Time_Gap is greater than 90 days, THE Starter_Generator SHALL produce a starter reflecting a significant gap (e.g., "It's been a while — even a simple hello can rekindle the connection")
5. WHEN a contact has no `lastContactDate`, THE Starter_Generator SHALL skip time-gap-aware generation and fall through to the next applicable strategy
6. THE Starter_Generator SHALL maintain a minimum of 2 starter templates per Time_Gap bucket to provide variety
7. WHEN multiple templates exist for a Time_Gap bucket, THE Starter_Generator SHALL select among them deterministically using the Contact_ID_Hash

### Requirement 4: Goal-Aware Starters

**User Story:** As a user with active connection goals, I want conversation starters that reference my goals, so that I am reminded why reaching out to a specific contact matters.

#### Acceptance Criteria

1. WHEN a contact has a goal relevance score greater than 0 and at least one active Connection_Goal matches the contact, THE Starter_Generator SHALL produce a starter that references the goal context
2. WHEN the matching Connection_Goal contains the keyword "network" or "professional" and the contact has tags or groups related to professional contexts, THE Starter_Generator SHALL produce a starter referencing the networking goal (e.g., "They could be a great connection for your networking goal")
3. WHEN the matching Connection_Goal contains the keyword "reconnect" and the contact has a Dunbar_Circle of `inner` or `close`, THE Starter_Generator SHALL produce a starter referencing the reconnection goal (e.g., "Perfect time to reconnect — they're exactly who your goal is about")
4. WHEN a goal-aware starter is generated, THE Starter_Generator SHALL take priority over Dunbar circle-aware and time-gap-aware starters but yield to enrichment-based starters (tags, calendar, enrichment topics)
5. WHEN no Connection_Goal is active or no goal matches the contact, THE Starter_Generator SHALL skip goal-aware generation and fall through to the next applicable strategy

### Requirement 5: Reasoning-Aware Starters

**User Story:** As a user, I want the conversation starter to complement the suggestion reasoning rather than repeat it, so that the card provides additional value.

#### Acceptance Criteria

1. WHEN the Suggestion_Reasoning contains the phrase "frequency decay" or "declining", THE Starter_Generator SHALL avoid producing a starter that also references frequency or decline, and instead produce a complementary starter (e.g., a warm prompt or topic-based opener)
2. WHEN the Suggestion_Reasoning contains a reference to a Connection_Goal, THE Starter_Generator SHALL avoid producing a goal-aware starter and instead fall through to Dunbar circle-aware or time-gap-aware generation
3. WHEN the Suggestion_Reasoning contains the phrase "shared activity" or references a calendar event, THE Starter_Generator SHALL avoid producing a calendar-based starter and instead produce a complementary starter
4. THE Starter_Generator SHALL check the Suggestion_Reasoning for signal keywords before selecting a generation strategy, to prevent redundancy between the reasoning line and the starter line on the Suggestion_Card

### Requirement 6: Starter Generation Priority Chain

**User Story:** As a developer, I want a clear priority order for starter generation strategies, so that the most relevant starter is always selected.

#### Acceptance Criteria

1. THE Starter_Generator SHALL evaluate starter strategies in the following priority order: (1) tag/shared-interest match, (2) calendar event context, (3) enrichment signal context (platform, topics), (4) goal-aware starter, (5) Dunbar circle-aware starter combined with time-gap awareness, (6) Fallback_Pool selection
2. WHEN a higher-priority strategy produces a valid starter, THE Starter_Generator SHALL use that starter and skip lower-priority strategies
3. WHEN the reasoning-aware check (Requirement 5) disqualifies a strategy, THE Starter_Generator SHALL skip that strategy and evaluate the next one in priority order
4. THE Starter_Generator SHALL produce a non-empty string for every contact, guaranteeing that the Fallback_Pool serves as the final catch-all

### Requirement 7: Contact Name Interpolation

**User Story:** As a user, I want conversation starters to include the contact's name, so that the suggestion feels personal.

#### Acceptance Criteria

1. WHEN a starter template contains a `[name]` placeholder, THE Starter_Generator SHALL replace the placeholder with the contact's `name` field value
2. WHEN the contact's `name` field is an empty string, THE Starter_Generator SHALL replace the `[name]` placeholder with "them"
3. THE Starter_Generator SHALL apply name interpolation to all starter strategies (Dunbar circle-aware, time-gap-aware, goal-aware, and Fallback_Pool starters)

### Requirement 8: Combined Dunbar and Time-Gap Starters

**User Story:** As a user, I want the starter to reflect both how close I am to someone and how long it has been, so that the message feels contextually accurate.

#### Acceptance Criteria

1. WHEN a contact has both a Dunbar_Circle and a `lastContactDate`, THE Starter_Generator SHALL combine circle tone with time-gap context into a single starter
2. WHEN a contact has a Dunbar_Circle of `inner` and a Time_Gap greater than 90 days, THE Starter_Generator SHALL produce a starter with urgent-warm tone (e.g., "It's been too long since you caught up with [name] — they'd love to hear from you")
3. WHEN a contact has a Dunbar_Circle of `casual` and a Time_Gap less than 14 days, THE Starter_Generator SHALL produce a starter with light-recent tone (e.g., "You connected with [name] recently — a quick follow-up keeps it going")
4. WHEN only one of Dunbar_Circle or `lastContactDate` is available, THE Starter_Generator SHALL use the single available dimension for starter generation
