## Product Requirements Document: CatchUp

### 1. Product Vision

CatchUp is an AI-powered relationship management application designed to help users maintain meaningful connections with friends by identifying and prioritizing catchup opportunities, reducing coordination friction, and facilitating connection through intelligent scheduling and suggestion capabilities.

### 2. Problem Statement

Users face several key challenges in maintaining friendships:

2.1. Difficult to identify which friends to reach out to and when

2.2. Hard to keep track of time since last meaningful interaction with people across relationship tiers

2.3. Forgetting to invite people to have a shared experience with for events of mutual relevance/interest

### 3. User Personas

**3.1. P1: Active Connectors**

- 3.1.1. Primary goal: Actively stay connected with 5-15 close friends
- 3.1.2. Desired frequency: Regular contact with closest relationships
- 3.1.3. Relevant features: Catchup suggestions, calendar integration

**3.2. P2: Relationship Organizers**

- 3.2.1. Primary goal: Organize and catch up with good friends (up to ~25 people)
- 3.2.2. Desired frequency: Maintain consistent contact across friend groups
- 3.2.3. Relevant features: Catchup suggestions, calendar integration

**3.3. P3: Network Maintainers**

- 3.3.1. Primary goal: Recreate social serendipity to keep in touch with 50+ acquaintances
- 3.3.2. Desired frequency: Periodic connection across broader network
- 3.3.3. Relevant features: Catchup suggestions, interaction logging


### 4. Core Features

#### 4.1. Feed (Web App)

**4.1.1. Voice Notes**

- 4.1.1.1. Quick capture interface for recording context about friends
- 4.1.1.2. AI disambiguates which contact the note refers to
- 4.1.1.3. Automatically enriches existing metadata (interests, preferences, life updates)
- 4.1.1.4. Natural language parsing to extract entities and attributes
- 4.1.1.5. Example: "Had coffee with Sarah, she mentioned learning Japanese" → enriches Sarah's profile with "learning Japanese"

**4.1.2. Metadata Management**

*4.1.2.1. Contact Groups*

- 4.1.2.1.1. User can categorize contacts into groups (groups are editable: create, change name, archive)
- 4.1.2.1.2. Default groups: Close Friends, Friends, Remote Friends, College Friends, High School Friends
- 4.1.2.1.3. Groups are either:
    - Manually entered by the user
    - Promoted from tags (AI-generated tags can be elevated to groups)

*4.1.2.2. Rich Profiles*

- 4.1.2.2.1. Name, phone, email
- 4.1.2.2.2. Interests represented as AI-generated tags (1-3 words each)
    - Generated based on voice memos and optional integration metadata
    - User can remove or update tags
    - Tags are categorized and deduplicated based on similarity
- 4.1.2.2.3. Last contact date
- 4.1.2.2.4. "Recently Met" status (dynamically updated based on user feedback after accepting suggestions)
- 4.1.2.2.5. Communication frequency preference:
    - User-provided cadence after accepting a suggestion
    - If not configured, follow-up notification sent to clarify reminder preferences
    - Options: Daily/Weekly/Monthly/Yearly or Flexible
- 4.1.2.2.6. Location/timezone
- 4.1.2.2.7. Custom notes
- 4.1.2.2.8. Tags: IRL preferred, URL preferred (for long-distance friendships)
- 4.1.2.2.9. Manual entry supported for all contact information

**4.1.3. Suggestion Feed**

- 4.1.3.1. Displays AI-generated connection opportunities
- 4.1.3.2. Shows reasoning: shared interests, time since last contact, calendar context
- 4.1.3.3. User actions:
    - 4.1.3.3.1. Accept
    - 4.1.3.3.2. Dismiss with reasons:
        - "I met this person too recently"
            - Follow-up: Prompt user to specify desired meeting frequency
            - Updates contact's frequency preference
        - Other dismissal reasons (snooze, not interested, etc.)
    - 4.1.3.3.3. Snooze


#### 4.2. Integrations

**4.2.1. Required**

*4.2.1.1. Google Calendar (Read)*

- 4.2.1.1.1. Read permissions only: Scan for free slots and existing events
- 4.2.1.1.2. User-configurable parameters:
    - Availability preferences (manual specification)
    - Commute times
    - Nighttime patterns
- 4.2.1.1.3. Predict true availability based on configured parameters
- 4.2.1.1.4. Publish a dynamically updating calendar feed (iCal and Google Calendar subscription) containing catchup suggestions
- 4.2.1.1.5. Suggest inviting friends to upcoming events based on:
    - Geographic proximity
    - Shared interests
    - Time since last contact

*4.2.1.2. Messaging/SMS and Email (Notification System)*

- 4.2.1.2.1. Two notification types with configurable timing:
    - 4.2.1.2.1.1. Real-time notifications: For catchup suggestions tied to an existing or newly created calendar event
    - 4.2.1.2.1.2. Batch notifications: For catchup suggestions with no calendar event attached
        - Default: Every Sunday at 9am local time
        - User-configurable day of week and time
- 4.2.1.2.2. Notifications sent via:
    - SMS (primary)
    - Email (optional alternative)
- 4.2.1.2.3. Example: "You're free Thu 6-9pm. Grab dinner with Mike? (both into music, last saw 6 weeks ago)"
- 4.2.1.2.4. Publishes to in-app feed simultaneously
- 4.2.1.2.5. Follow-up notifications: After user accepts a suggestion, send check-in to clarify meeting reminder preferences if not yet configured

**4.2.2. Mostly Optional**

- 4.2.2.1. Contacts: Sync phone/email contacts for quick import
    - Alternative: Manual contact entry fully supported
    - Detection logic: Identify friends based on frequency in calendar, Gmail messages, Facebook/Instagram data

**4.2.3. Very Optional (Metadata Enrichment Only)**

- 4.2.3.1. Email: Gmail integration for communication history patterns
- 4.2.3.2. Instagram: Import data dump for increasing contact list


#### 4.3. Smart Suggestions

**4.3.1. Trigger Conditions**

- 4.3.1.1. Empty calendar slot detected (e.g., free evening, weekend afternoon)
- 4.3.1.2. Relevant event on calendar with potential for inviting friends nearby
- 4.3.1.3. Time threshold exceeded (haven't connected with friend in X weeks based on individual frequency preference)

**4.3.2. Matching Logic**

*4.3.2.1. Three primary trigger types:*

- 4.3.2.1.1. Shared Activity trigger: Invite someone to an event/activity IRL → outcome: meet up for shared activity
- 4.3.2.1.2. Shared Interest trigger: Connect over mutually relevant interests → outcome: have a conversation over the phone
- 4.3.2.1.3. Time-bound trigger: Based on elapsed time and individual frequency preference → outcome: either call or activity

*4.3.2.2. Matching factors:*

- 4.3.2.2.1. Shared interests (via AI-generated tags) × calendar availability × time since last contact
- 4.3.2.2.2. Individual frequency preferences (user-configured per contact)
- 4.3.2.2.3. "Recently Met" status (dynamically updated)
- 4.3.2.2.4. Event-based triggers: "Attending X → who else would enjoy X?"
- 4.3.2.2.5. Geographic proximity for in-person meetups
- 4.3.2.2.6. Group membership (e.g., prioritize Close Friends group)
- 4.3.2.2.7. Recency decay: prioritize contacts you haven't seen recently relative to their frequency preference
- 4.3.2.2.8. Communication preferences: IRL preferred vs URL preferred

**4.3.3. Notification Flow**

- 4.3.3.1. System identifies opportunity (empty slot or relevant event)
- 4.3.3.2. Matches with appropriate contact(s) based on logic
- 4.3.3.3. Generates suggestion with context
- 4.3.3.4. Dual notification:
    - SMS/Email: "You're free Thu 6-9pm. Want to catch up with Alex? (both interested in photography, last saw 2 months ago)"
    - In-app feed: Shows same suggestion with accept/dismiss options
- 4.3.3.5. User accepts → draft message created and/or added to calendar feed
- 4.3.3.6. Post-acceptance: System updates "Recently Met" status
- 4.3.3.7. Follow-up notification: If frequency preference not configured, ask user when they'd like next reminder

**4.3.4. Calendar Feed View**

- 4.3.4.1. Visual calendar overlay showing:
    - Existing events
    - Free time blocks
    - Connection suggestions mapped to available slots
- 4.3.4.2. Example: "Japanese Language Exchange Tue 7pm → Suggest inviting Sarah (speaks Japanese, haven't seen in 2 months)"
- 4.3.4.3. Published as iCal and Google Calendar subscription feed


### 5. User Flow

**5.1. Initial Setup**

- 5.1.1. User creates account
- 5.1.2. Imports contacts (optional) or adds manually
    - Guided flow: Categorize contacts into groups
    - Default groups provided: Close Friends, Friends, Remote Friends, College Friends, High School Friends
- 5.1.3. Configures availability preferences:
    - Manual availability specification
    - Commute times
    - Nighttime patterns
- 5.1.4. Sets up notification preferences:
    - SMS and/or email
    - Batch notification timing (default: Sunday 9am)
- 5.1.5. Optionally connects email/Instagram for tag enrichment

**5.2. Ongoing Usage**

- 5.2.1. Passive enrichment: User records voice notes about friends
    - "Just saw Mike at the concert, he mentioned getting into climbing"
    - System generates tags: "climbing", "concerts", "music"
    - User can remove or update tags
- 5.2.2. Active curation:
    - User adjusts group membership as needed
    - User promotes tags to groups if desired
    - User updates frequency preferences per contact
- 5.2.3. Receive suggestions: Via SMS/email and in-app feed (real-time or batched)
- 5.2.4. Take action:
    - Accept suggestion → app facilitates outreach with auto-drafted personalized message
    - Dismiss suggestion with reason → system learns preferences
        - If dismissed as "met too recently" → prompted to set frequency preference
- 5.2.5. Post-acceptance feedback: System updates "Recently Met" status and requests frequency preference if not set


### 6. Example Scenario

**6.1. Calendar**: Thursday 6pm-9pm is free (based on user-configured availability)

**6.2. Database**: Mike (Close Friends group)

- 6.2.1. Last contact: 6 weeks ago
- 6.2.2. AI-generated tags: "music", "hiking", "food"
- 6.2.3. Frequency preference: Monthly
- 6.2.4. Tag: IRL preferred
- 6.2.5. "Recently Met" status: No

**6.3. Sunday 9am Batch Notification (SMS/Email)**:
"Free Thu 6-9pm. Grab dinner with Mike? 🎵
Last hung out 6 weeks ago. [Yes] [Maybe Later]"

**6.4. User taps [Yes]** →

- 6.4.1. Draft text: "Hey Mike! Free Thursday evening - want to grab dinner and catch up?"
- 6.4.2. Suggestion added to published calendar feed
- 6.4.3. "Recently Met" status updated to Yes

**6.5. Follow-up notification (if frequency not set)**:
"Great! Would you like a reminder to catch up with Mike again? How often would you like to meet?"

### 7. Technical Requirements

**7.1. Minimum Viable Product**

- 7.1.1. Web app interface (mobile-responsive)
- 7.1.2. Google Calendar OAuth integration (read-only) with user-configurable availability prediction
- 7.1.3. Calendar feed publishing (iCal and Google Calendar subscription formats)
- 7.1.4. SMS notification service (Twilio or similar) with configurable timing
- 7.1.5. Email notification service with configurable timing
- 7.1.6. Voice note recording and transcription (with AI disambiguation)
- 7.1.7. Contact database with custom fields, groups, and AI-generated tags
- 7.1.8. Tag generation, categorization, and deduplication system
- 7.1.9. AI matching algorithm incorporating all triggers and matching logic
- 7.1.10. User-specified availability management (manual, commute times, nighttime patterns)
- 7.1.11. Dynamic "Recently Met" status tracking
- 7.1.12. Post-acceptance frequency preference collection

**7.2. Data Model (Core Entities)**

*7.2.1. Contact*

- 7.2.1.1. Name, phone, email
- 7.2.1.2. Group membership (multiple groups allowed)
- 7.2.1.3. AI-generated tags (1-3 words each, user removable/updatable)
- 7.2.1.4. Last contact date
- 7.2.1.5. "Recently Met" status (boolean, dynamically updated)
- 7.2.1.6. Communication frequency preference (Daily/Weekly/Monthly/Yearly or Flexible, configured per contact)
- 7.2.1.7. Location/timezone
- 7.2.1.8. Custom notes
- 7.2.1.9. Tags: IRL preferred, URL preferred

*7.2.2. Group*

- 7.2.2.1. Group name (user editable)
- 7.2.2.2. Group type: Manual or Promoted (from tags)
- 7.2.2.3. Member contact IDs

*7.2.3. Tag*

- 7.2.3.1. Tag text (1-3 words)
- 7.2.3.2. Category
- 7.2.3.3. Associated contact IDs
- 7.2.3.4. Source: Voice memo, email integration, Instagram integration

*7.2.4. Interaction Log*

- 7.2.4.1. Date/time
- 7.2.4.2. Type (hangout, call, text)
- 7.2.4.3. Source (manual, calendar, enrichment)
- 7.2.4.4. Notes
- 7.2.4.5. Outcome verification (did the interaction happen?)

*7.2.5. Suggestion*

- 7.2.5.1. Contact ID(s)
- 7.2.5.2. Proposed timeslot
- 7.2.5.3. Reasoning (trigger type: Shared Activity/Shared Interest/Time-bound)
- 7.2.5.4. Status (pending, accepted, dismissed, snoozed)
- 7.2.5.5. Dismissal reason (if applicable)
- 7.2.5.6. Notification sent (timestamp, type: real-time or batch)


### 8. Success Metrics

**8.1. Primary**: Connections made through app suggestions (accepted rate)

**8.2. Secondary**:

- 8.2.1. Reduction in average time since last contact (by group)
- 8.2.2. Voice note usage frequency
- 8.2.3. Notification response rate (SMS and email)
- 8.2.4. Calendar feed subscription rate
- 8.2.5. Dismissal reasons distribution
- 8.2.6. Frequency preference configuration rate
- 8.2.7. Tag quality (user acceptance vs removal rate)
- 8.2.8. Engagement: DAU/MAU ratio, retention cohorts


### 9. Future Considerations

**9.1. Optional Features**:

- 9.1.1. "I'm feeling lucky" Roulette mode: Connects people for 15-min serendipity chats with up to 3 prompts for real conversation
- 9.1.2. BeReal mode: Mutual opt-in calls based on mutual contact social graph
- 9.1.3. 2nd degree friend suggestions: Expand network through mutual connections

**9.2. Confirmed Future Enhancements**:

- 9.2.1. Group hangout suggestions (multiple friends, shared interests)
- 9.2.2. Recurring connection reminders (monthly coffee with X)
- 9.2.3. Integration with other calendars (Outlook, Apple Calendar)
- 9.2.4. Birthday/special occasion reminders
- 9.2.5. Sentiment analysis on voice notes
- 9.2.6. Mobile native apps (iOS/Android)
- 9.2.7. Shared Values trigger: Sounding board for emotional support
- 9.2.8. Write permissions for Google Calendar (create events directly)


### 10. Design Principles

**10.1. Goals**:

- 10.1.1. Productivity-focused: Identify and prioritize keeping in touch with friends
- 10.1.2. Reduce coordination friction as primary goal
- 10.1.3. Gamification element: Weekly catchup to provide more metadata
- 10.1.4. Independent task execution: System designed for modular development

**10.2. Key Decisions**:

- 10.2.1. Focus on friends across various relationship depths
- 10.2.2. Time-based and context-based triggers with individual frequency preferences
- 10.2.3. Flexible notification system (real-time + batched)
- 10.2.4. Read-only calendar permissions with published feed approach
- 10.2.5. Manual availability specification with configurable parameters (commute times, nighttime patterns)
- 10.2.6. AI-generated tags with user control (removal/update capability)
- 10.2.7. Dynamic learning from dismissal feedback and "Recently Met" status
- 10.2.8. Group-based organization with tag promotion capability

