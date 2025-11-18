# Requirements Document

## Introduction

CatchUp is an AI-powered relationship management application designed to help users maintain meaningful connections with friends by identifying and prioritizing catchup opportunities, reducing coordination friction, and facilitating connection through intelligent scheduling and suggestion capabilities. The system integrates with Google Calendar, provides voice note capture for context enrichment, manages rich contact profiles with AI-generated tags, and delivers intelligent connection suggestions via SMS/email notifications and a web-based feed.

## Glossary

- **CatchUp System**: The complete AI-powered relationship management application including web interface, integrations, and notification services
- **Contact**: A person in the user's relationship network with associated metadata (name, groups, tags, preferences)
- **Group**: A user-defined or AI-promoted category for organizing contacts (e.g., Close Friends, College Friends)
- **Tag**: A 1-3 word AI-generated descriptor representing a contact's interests or attributes
- **Voice Note**: An audio recording captured by the user containing context about friends
- **Suggestion**: An AI-generated recommendation to connect with a specific contact at a specific time
- **Interaction Log**: A record of past communications or meetups with contacts
- **Calendar Feed**: An iCal or Google Calendar subscription containing catchup suggestions
- **Recently Met Status**: A boolean flag indicating whether a contact was recently connected with
- **Frequency Preference**: User-configured cadence for connection reminders (Daily/Weekly/Monthly/Yearly/Flexible)
- **Availability Parameters**: User-configured settings including manual availability specification, commute times, and nighttime patterns
- **Batch Notification**: Scheduled digest of suggestions sent at user-configured time (default: Sunday 9am)
- **Real-time Notification**: Immediate notification for suggestions tied to calendar events
- **Trigger Type**: Classification of suggestion reasoning (Shared Activity, Shared Interest, Time-bound)

## Requirements

### Requirement 1: Contact Management

**User Story:** As a user, I want to manage my contacts with rich metadata, so that the system can make intelligent connection suggestions.

#### Acceptance Criteria

1. WHEN a user creates a contact THEN the CatchUp System SHALL store name, phone, email, location, timezone, and custom notes
2. WHEN a user assigns a contact to groups THEN the CatchUp System SHALL support multiple group memberships per contact
3. WHEN a user views a contact profile THEN the CatchUp System SHALL display all associated metadata including AI-generated tags, last contact date, Recently Met status, and frequency preference
4. WHEN a user updates contact information THEN the CatchUp System SHALL persist changes immediately
5. WHEN a user deletes a contact THEN the CatchUp System SHALL remove the contact and all associated data

### Requirement 2: Group Organization

**User Story:** As a user, I want to organize contacts into groups, so that I can manage relationships by category.

#### Acceptance Criteria

1. WHEN a user creates a group THEN the CatchUp System SHALL allow specification of a group name
2. WHEN a user edits a group name THEN the CatchUp System SHALL update the group name across all associated contacts
3. WHEN a user archives a group THEN the CatchUp System SHALL mark the group as archived without deleting member contacts
4. WHEN the system initializes for a new user THEN the CatchUp System SHALL create default groups (Close Friends, Friends, Remote Friends, College Friends, High School Friends)
5. WHEN a user promotes a tag to a group THEN the CatchUp System SHALL create a new group and mark it as promoted from tags

### Requirement 3: Voice Note Capture and Processing

**User Story:** As a user, I want to record voice notes about friends, so that the system can automatically enrich contact metadata.

#### Acceptance Criteria

1. WHEN a user records a voice note THEN the CatchUp System SHALL transcribe the audio to text
2. WHEN a voice note is transcribed THEN the CatchUp System SHALL use AI to disambiguate which contact the note refers to
3. WHEN a contact is identified from a voice note THEN the CatchUp System SHALL extract entities and attributes using natural language parsing
4. WHEN entities are extracted THEN the CatchUp System SHALL generate AI tags (1-3 words each) and associate them with the identified contact
5. WHEN tags are generated THEN the CatchUp System SHALL categorize and deduplicate tags based on similarity

### Requirement 4: Tag Management

**User Story:** As a user, I want to manage AI-generated tags on contact profiles, so that I can ensure accuracy and relevance.

#### Acceptance Criteria

1. WHEN AI generates tags for a contact THEN the CatchUp System SHALL display tags on the contact profile
2. WHEN a user removes a tag THEN the CatchUp System SHALL delete the tag association from that contact
3. WHEN a user updates a tag THEN the CatchUp System SHALL modify the tag text while preserving the association
4. WHEN multiple similar tags exist THEN the CatchUp System SHALL deduplicate based on semantic similarity
5. WHEN a tag is associated with a contact THEN the CatchUp System SHALL track the source (voice memo, email integration, or Instagram integration)

### Requirement 5: Interaction Logging

**User Story:** As a user, I want the system to track my interactions with contacts, so that suggestions reflect actual connection history.

#### Acceptance Criteria

1. WHEN a user accepts a suggestion THEN the CatchUp System SHALL create an interaction log entry with date, time, and type
2. WHEN an interaction is logged THEN the CatchUp System SHALL update the contact's last contact date
3. WHEN an interaction is logged THEN the CatchUp System SHALL update the contact's Recently Met status to true
4. WHEN a user manually logs an interaction THEN the CatchUp System SHALL accept date, time, type (hangout, call, text), and notes
5. WHEN the system detects a calendar event with a contact THEN the CatchUp System SHALL optionally create an interaction log entry

### Requirement 6: Frequency Preference Configuration

**User Story:** As a user, I want to specify how often I want to connect with each contact, so that reminders align with my relationship goals.

#### Acceptance Criteria

1. WHEN a user accepts a suggestion THEN the CatchUp System SHALL prompt for frequency preference if not already configured
2. WHEN a user sets a frequency preference THEN the CatchUp System SHALL accept Daily, Weekly, Monthly, Yearly, or Flexible options
3. WHEN a user dismisses a suggestion with reason "met too recently" THEN the CatchUp System SHALL prompt for frequency preference specification
4. WHEN a frequency preference is configured THEN the CatchUp System SHALL use it to calculate next connection timing
5. WHEN a user updates a frequency preference THEN the CatchUp System SHALL apply the new preference to future suggestions

### Requirement 7: Google Calendar Integration

**User Story:** As a user, I want the system to read my Google Calendar, so that suggestions align with my actual availability.

#### Acceptance Criteria

1. WHEN a user connects Google Calendar THEN the CatchUp System SHALL request read-only permissions via OAuth
2. WHEN calendar access is granted THEN the CatchUp System SHALL scan for free time slots based on existing events
3. WHEN the user configures availability parameters THEN the CatchUp System SHALL accept manual availability specification, commute times, and nighttime patterns
4. WHEN predicting availability THEN the CatchUp System SHALL apply user-configured parameters to identify true free time
5. WHEN calendar data changes THEN the CatchUp System SHALL refresh availability predictions

### Requirement 8: Calendar Feed Publishing

**User Story:** As a user, I want to subscribe to a calendar feed of catchup suggestions, so that I can view them in my preferred calendar application.

#### Acceptance Criteria

1. WHEN suggestions are generated THEN the CatchUp System SHALL publish them to a dynamically updating calendar feed
2. WHEN a user requests a calendar subscription THEN the CatchUp System SHALL provide both iCal and Google Calendar subscription formats
3. WHEN a suggestion status changes THEN the CatchUp System SHALL update the published calendar feed immediately
4. WHEN a user views the calendar feed THEN the CatchUp System SHALL display suggestion details including contact name, reasoning, and proposed timeslot
5. WHEN an event on the user's calendar has potential for friend invitations THEN the CatchUp System SHALL suggest inviting contacts based on geographic proximity, shared interests, and time since last contact

### Requirement 9: Suggestion Generation - Shared Activity Trigger

**User Story:** As a user, I want suggestions to invite friends to events I'm attending, so that I can share experiences with people who would enjoy them.

#### Acceptance Criteria

1. WHEN the CatchUp System detects an event on the user's calendar THEN the CatchUp System SHALL identify contacts with shared interests related to the event
2. WHEN matching contacts for an event THEN the CatchUp System SHALL consider geographic proximity for in-person events
3. WHEN matching contacts for an event THEN the CatchUp System SHALL consider time since last contact
4. WHEN generating a Shared Activity suggestion THEN the CatchUp System SHALL include event details and reasoning in the suggestion
5. WHEN a Shared Activity suggestion is created THEN the CatchUp System SHALL mark the trigger type as Shared Activity

### Requirement 10: Suggestion Generation - Shared Interest Trigger

**User Story:** As a user, I want suggestions to connect with friends over mutual interests, so that conversations are meaningful and relevant.

#### Acceptance Criteria

1. WHEN the CatchUp System identifies contacts with overlapping AI-generated tags THEN the CatchUp System SHALL generate Shared Interest suggestions
2. WHEN generating a Shared Interest suggestion THEN the CatchUp System SHALL prioritize contacts with URL preferred tag for phone/video calls
3. WHEN generating a Shared Interest suggestion THEN the CatchUp System SHALL include shared interest tags in the reasoning
4. WHEN a Shared Interest suggestion is created THEN the CatchUp System SHALL mark the trigger type as Shared Interest
5. WHEN multiple contacts share interests THEN the CatchUp System SHALL rank suggestions by time since last contact and frequency preference

### Requirement 11: Suggestion Generation - Time-bound Trigger

**User Story:** As a user, I want suggestions based on how long it's been since I connected with someone, so that I maintain consistent relationships.

#### Acceptance Criteria

1. WHEN time since last contact exceeds the frequency preference threshold THEN the CatchUp System SHALL generate a Time-bound suggestion
2. WHEN generating a Time-bound suggestion THEN the CatchUp System SHALL match the suggestion to an available calendar slot
3. WHEN a contact has IRL preferred tag THEN the CatchUp System SHALL suggest in-person activities
4. WHEN a contact has URL preferred tag THEN the CatchUp System SHALL suggest phone or video calls
5. WHEN a Time-bound suggestion is created THEN the CatchUp System SHALL mark the trigger type as Time-bound

### Requirement 12: Suggestion Matching Logic

**User Story:** As a user, I want suggestions to be intelligently matched to my availability and relationship context, so that recommendations are actionable and relevant.

#### Acceptance Criteria

1. WHEN calculating suggestion priority THEN the CatchUp System SHALL apply recency decay based on time since last contact relative to frequency preference
2. WHEN matching suggestions to timeslots THEN the CatchUp System SHALL consider user-configured availability parameters
3. WHEN a contact has Recently Met status true THEN the CatchUp System SHALL deprioritize that contact in suggestion ranking
4. WHEN multiple contacts match a timeslot THEN the CatchUp System SHALL prioritize Close Friends group members
5. WHEN generating suggestions THEN the CatchUp System SHALL respect communication preferences (IRL preferred vs URL preferred)

### Requirement 13: Batch Notification Delivery

**User Story:** As a user, I want to receive a scheduled digest of catchup suggestions, so that I can plan connections at a convenient time.

#### Acceptance Criteria

1. WHEN the configured batch notification time arrives THEN the CatchUp System SHALL send notifications for all pending suggestions without calendar events
2. WHEN a user configures batch notification timing THEN the CatchUp System SHALL accept day of week and time specifications
3. WHEN no batch timing is configured THEN the CatchUp System SHALL default to Sunday at 9am local time
4. WHEN sending batch notifications THEN the CatchUp System SHALL deliver via SMS as primary channel
5. WHEN sending batch notifications THEN the CatchUp System SHALL optionally deliver via email as alternative channel

### Requirement 14: Real-time Notification Delivery

**User Story:** As a user, I want immediate notifications for time-sensitive suggestions, so that I can act on opportunities tied to specific events.

#### Acceptance Criteria

1. WHEN a suggestion is tied to an existing calendar event THEN the CatchUp System SHALL send a real-time notification immediately
2. WHEN a suggestion is tied to a newly created calendar event THEN the CatchUp System SHALL send a real-time notification immediately
3. WHEN sending real-time notifications THEN the CatchUp System SHALL deliver via SMS as primary channel
4. WHEN sending real-time notifications THEN the CatchUp System SHALL optionally deliver via email as alternative channel
5. WHEN a real-time notification is sent THEN the CatchUp System SHALL also publish the suggestion to the in-app feed

### Requirement 15: Notification Content

**User Story:** As a user, I want notifications to include context and reasoning, so that I can make informed decisions about suggestions.

#### Acceptance Criteria

1. WHEN generating notification text THEN the CatchUp System SHALL include the proposed timeslot
2. WHEN generating notification text THEN the CatchUp System SHALL include the contact name
3. WHEN generating notification text THEN the CatchUp System SHALL include reasoning (shared interests, time since last contact, or event context)
4. WHEN generating notification text THEN the CatchUp System SHALL include action options (accept, dismiss, snooze)
5. WHEN generating notification text THEN the CatchUp System SHALL format messages concisely for SMS delivery

### Requirement 16: Suggestion Feed Display

**User Story:** As a user, I want to view all suggestions in a web-based feed, so that I can review and act on recommendations at my convenience.

#### Acceptance Criteria

1. WHEN a user accesses the suggestion feed THEN the CatchUp System SHALL display all pending suggestions
2. WHEN displaying a suggestion THEN the CatchUp System SHALL show contact name, proposed timeslot, and reasoning
3. WHEN displaying a suggestion THEN the CatchUp System SHALL provide accept, dismiss, and snooze action buttons
4. WHEN a suggestion is accepted or dismissed THEN the CatchUp System SHALL remove it from the pending feed
5. WHEN a suggestion is snoozed THEN the CatchUp System SHALL temporarily hide it and resurface after a configured delay

### Requirement 17: Suggestion Acceptance

**User Story:** As a user, I want to accept suggestions with minimal friction, so that I can quickly act on connection opportunities.

#### Acceptance Criteria

1. WHEN a user accepts a suggestion THEN the CatchUp System SHALL generate a draft message personalized with contact name and context
2. WHEN a user accepts a suggestion THEN the CatchUp System SHALL add the suggestion to the published calendar feed
3. WHEN a user accepts a suggestion THEN the CatchUp System SHALL update the contact's Recently Met status to true
4. WHEN a user accepts a suggestion THEN the CatchUp System SHALL create an interaction log entry
5. WHEN a user accepts a suggestion and frequency preference is not configured THEN the CatchUp System SHALL send a follow-up notification requesting frequency preference

### Requirement 18: Suggestion Dismissal

**User Story:** As a user, I want to dismiss suggestions with reasons, so that the system learns my preferences and improves future recommendations.

#### Acceptance Criteria

1. WHEN a user dismisses a suggestion THEN the CatchUp System SHALL prompt for a dismissal reason
2. WHEN a user selects "met too recently" as dismissal reason THEN the CatchUp System SHALL prompt for frequency preference specification
3. WHEN a dismissal reason is provided THEN the CatchUp System SHALL store the reason with the suggestion record
4. WHEN a user dismisses a suggestion THEN the CatchUp System SHALL remove it from the pending feed
5. WHEN dismissal patterns emerge THEN the CatchUp System SHALL adjust future suggestion matching logic

### Requirement 19: Initial Setup Flow

**User Story:** As a new user, I want a guided setup process, so that I can quickly configure the system for my needs.

#### Acceptance Criteria

1. WHEN a user creates an account THEN the CatchUp System SHALL prompt for contact import or manual entry
2. WHEN contacts are imported THEN the CatchUp System SHALL guide the user to categorize contacts into groups
3. WHEN setup continues THEN the CatchUp System SHALL prompt for availability parameters (manual specification, commute times, nighttime patterns)
4. WHEN setup continues THEN the CatchUp System SHALL prompt for notification preferences (SMS, email, batch timing)
5. WHEN setup completes THEN the CatchUp System SHALL optionally offer email and Instagram integration for tag enrichment

### Requirement 20: Contact Import

**User Story:** As a user, I want to import contacts from existing sources, so that I can quickly populate my relationship network.

#### Acceptance Criteria

1. WHEN a user chooses to import contacts THEN the CatchUp System SHALL support phone and email contact sync
2. WHEN contacts are imported THEN the CatchUp System SHALL extract name, phone, and email fields
3. WHEN the user has not imported contacts THEN the CatchUp System SHALL fully support manual contact entry
4. WHEN analyzing imported data THEN the CatchUp System SHALL optionally identify friends based on frequency in calendar events
5. WHEN analyzing imported data THEN the CatchUp System SHALL optionally identify friends based on Gmail message frequency

### Requirement 21: Metadata Enrichment via Email

**User Story:** As a user, I want the system to analyze my email history, so that contact metadata is enriched with communication patterns.

#### Acceptance Criteria

1. WHEN a user connects Gmail THEN the CatchUp System SHALL request read-only permissions
2. WHEN Gmail access is granted THEN the CatchUp System SHALL analyze message frequency per contact
3. WHEN email patterns are detected THEN the CatchUp System SHALL update last contact dates based on recent emails
4. WHEN email content contains relevant information THEN the CatchUp System SHALL optionally generate tags from email context
5. WHEN email integration is not connected THEN the CatchUp System SHALL function fully without email enrichment

### Requirement 22: Metadata Enrichment via Instagram

**User Story:** As a user, I want to import Instagram data, so that I can expand my contact list with social connections.

#### Acceptance Criteria

1. WHEN a user uploads Instagram data dump THEN the CatchUp System SHALL parse the data for contact information
2. WHEN Instagram contacts are identified THEN the CatchUp System SHALL add them to the contact database
3. WHEN Instagram data contains interaction history THEN the CatchUp System SHALL optionally generate tags based on shared content
4. WHEN Instagram integration is not used THEN the CatchUp System SHALL function fully without Instagram enrichment
5. WHEN Instagram contacts are imported THEN the CatchUp System SHALL deduplicate against existing contacts

### Requirement 23: Availability Parameter Configuration

**User Story:** As a user, I want to specify my availability preferences, so that suggestions align with my actual free time.

#### Acceptance Criteria

1. WHEN a user configures availability THEN the CatchUp System SHALL accept manual specification of available time blocks
2. WHEN a user configures availability THEN the CatchUp System SHALL accept commute time specifications
3. WHEN a user configures availability THEN the CatchUp System SHALL accept nighttime pattern specifications
4. WHEN availability parameters are set THEN the CatchUp System SHALL apply them to filter calendar free slots
5. WHEN a user updates availability parameters THEN the CatchUp System SHALL recalculate availability predictions

### Requirement 24: Recently Met Status Management

**User Story:** As a user, I want the system to track who I've recently connected with, so that suggestions avoid redundant recommendations.

#### Acceptance Criteria

1. WHEN a user accepts a suggestion THEN the CatchUp System SHALL set the contact's Recently Met status to true
2. WHEN time passes after an interaction THEN the CatchUp System SHALL dynamically update Recently Met status based on frequency preference
3. WHEN a contact has Recently Met status true THEN the CatchUp System SHALL deprioritize that contact in suggestion generation
4. WHEN a user dismisses a suggestion with "met too recently" THEN the CatchUp System SHALL set Recently Met status to true
5. WHEN Recently Met status changes THEN the CatchUp System SHALL immediately affect suggestion ranking

### Requirement 25: Data Persistence

**User Story:** As a user, I want all my data to be reliably stored, so that I don't lose relationship context or configuration.

#### Acceptance Criteria

1. WHEN a user creates or updates any entity THEN the CatchUp System SHALL persist changes to the database immediately
2. WHEN the CatchUp System generates suggestions THEN the CatchUp System SHALL store suggestion records with status tracking
3. WHEN interactions are logged THEN the CatchUp System SHALL persist interaction history permanently
4. WHEN voice notes are recorded THEN the CatchUp System SHALL store transcriptions and extracted metadata
5. WHEN a user logs out and logs back in THEN the CatchUp System SHALL restore all data without loss
