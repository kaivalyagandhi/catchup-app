# Requirements Document

## Introduction

This feature enhances the CatchUp application's test data generation capabilities by providing a comprehensive UI for generating realistic test data including contacts, calendar events (user availability), and suggestions. This enables developers and testers to quickly populate the application with meaningful test data that reflects real-world usage patterns.

## Glossary

- **Test Data Generator**: The system component responsible for creating synthetic data for testing purposes
- **Calendar Event**: A time-blocked period in the user's calendar representing availability or unavailability
- **Suggestion**: An AI-generated recommendation to connect with a contact based on availability and relationship factors
- **Contact**: A person in the user's relationship network with associated metadata
- **Time Slot**: A specific period of time with start and end timestamps
- **Frequency Preference**: How often a user wants to connect with a specific contact (daily, weekly, biweekly, monthly, quarterly)

## Requirements

### Requirement 1

**User Story:** As a developer, I want to generate test contacts with realistic data, so that I can test the contact management features with meaningful scenarios.

#### Acceptance Criteria

1. WHEN a user clicks the "Seed Test Data" button THEN the system SHALL create multiple test contacts with varied attributes
2. WHEN test contacts are created THEN the system SHALL assign realistic names, emails, locations, and frequency preferences
3. WHEN test contacts are created THEN the system SHALL set varied last contact dates to simulate different relationship states
4. WHEN test contacts are created THEN the system SHALL assign relevant tags to each contact
5. WHEN test contacts are created THEN the system SHALL assign contacts to groups
6. WHEN test contacts are created THEN the system SHALL infer and assign appropriate timezones based on location

### Requirement 2

**User Story:** As a developer, I want to generate calendar events representing my availability, so that I can test time-bound suggestion generation.

#### Acceptance Criteria

1. WHEN a user generates test data THEN the system SHALL create calendar events representing available time slots
2. WHEN calendar events are created THEN the system SHALL generate slots across multiple days
3. WHEN calendar events are created THEN the system SHALL include both weekday and weekend slots
4. WHEN calendar events are created THEN the system SHALL vary the time of day for different slots
5. WHEN calendar events are created THEN the system SHALL store events in the calendar_events table

### Requirement 3

**User Story:** As a developer, I want to generate suggestions based on test contacts and calendar data, so that I can test the suggestion feed and matching logic.

#### Acceptance Criteria

1. WHEN a user clicks "Generate Suggestions" THEN the system SHALL create suggestions using existing contacts and generated availability
2. WHEN suggestions are generated THEN the system SHALL apply the matching algorithm to pair contacts with time slots
3. WHEN suggestions are generated THEN the system SHALL include reasoning for each suggestion
4. WHEN suggestions are generated THEN the system SHALL respect contact frequency preferences
5. WHEN suggestions are generated THEN the system SHALL return the count of suggestions created

### Requirement 4

**User Story:** As a developer, I want test data generation to be idempotent and cleanable, so that I can reset the test environment easily.

#### Acceptance Criteria

1. WHEN test data is generated multiple times THEN the system SHALL not create duplicate contacts
2. WHEN test data generation fails THEN the system SHALL rollback partial changes
3. WHEN a user wants to clear test data THEN the system SHALL provide a way to remove generated data
4. WHEN test data is cleared THEN the system SHALL remove all associated records (contacts, tags, events, suggestions)
5. WHEN test data operations complete THEN the system SHALL report success or failure with details

### Requirement 5

**User Story:** As a developer, I want the UI to provide clear feedback during test data generation, so that I understand what data was created.

#### Acceptance Criteria

1. WHEN test data generation starts THEN the system SHALL display a loading indicator
2. WHEN test data generation completes THEN the system SHALL display a success message with counts
3. WHEN test data generation fails THEN the system SHALL display an error message with details
4. WHEN test data is generated THEN the system SHALL automatically refresh the relevant UI sections
5. WHEN the user is on the contacts page THEN the system SHALL show newly created contacts immediately

### Requirement 6

**User Story:** As a developer, I want test data endpoints to be properly organized and secured, so that they cannot be accidentally used in production.

#### Acceptance Criteria

1. WHEN test data endpoints are defined THEN the system SHALL place them under the /api/test-data route prefix
2. WHEN test data endpoints are called THEN the system SHALL require authentication
3. WHEN test data endpoints are called THEN the system SHALL validate the user ID
4. WHEN test data endpoints are called THEN the system SHALL use database transactions for atomicity
5. WHEN test data endpoints are called in production THEN the system SHALL optionally disable them via environment variable

### Requirement 7

**User Story:** As a user, I want to filter suggestions by status in the UI, so that I can view only the suggestions I'm interested in.

#### Acceptance Criteria

1. WHEN a user clicks a status filter button THEN the system SHALL display only suggestions matching that status
2. WHEN the "All" filter is selected THEN the system SHALL display suggestions of all statuses
3. WHEN the "Pending" filter is selected THEN the system SHALL display only pending suggestions
4. WHEN the "Accepted" filter is selected THEN the system SHALL display only accepted suggestions
5. WHEN the "Dismissed" filter is selected THEN the system SHALL display only dismissed suggestions
6. WHEN the "Snoozed" filter is selected THEN the system SHALL display only snoozed suggestions
7. WHEN a filter is applied THEN the system SHALL visually indicate which filter is active

### Requirement 8

**User Story:** As a user, I want to see tags and groups for my contacts in the UI, so that I can understand the categorization and interests of each contact.

#### Acceptance Criteria

1. WHEN a contact has tags THEN the system SHALL display all tags in the contact card
2. WHEN a contact has groups THEN the system SHALL display all group names in the contact card
3. WHEN displaying tags THEN the system SHALL show the tag text in a visually distinct format
4. WHEN displaying groups THEN the system SHALL show the group names in a visually distinct format
5. WHEN a contact has no tags or groups THEN the system SHALL not display empty tag or group sections

### Requirement 9

**User Story:** As a user, I want to add and manage tags and groups for contacts through the UI, so that I can organize my contacts effectively.

#### Acceptance Criteria

1. WHEN creating or editing a contact THEN the system SHALL provide an interface to add tags
2. WHEN creating or editing a contact THEN the system SHALL provide an interface to assign groups
3. WHEN a user adds a tag THEN the system SHALL save it with the contact
4. WHEN a user assigns a group THEN the system SHALL save the group association
5. WHEN a user removes a tag or group THEN the system SHALL update the contact accordingly

### Requirement 10

**User Story:** As a developer, I want test data generation to include group suggestions, so that I can test the group catchup feature with realistic scenarios.

#### Acceptance Criteria

1. WHEN test data is generated THEN the system SHALL create contacts with shared groups
2. WHEN test data is generated THEN the system SHALL create contacts with shared tags
3. WHEN test data is generated THEN the system SHALL generate group suggestions for contacts with strong shared context
4. WHEN group suggestions are generated THEN the system SHALL include 2-3 contacts per group suggestion
5. WHEN group suggestions are generated THEN the system SHALL calculate and store shared context scores
6. WHEN group suggestions are generated THEN the system SHALL include reasoning based on common groups, shared tags, and co-mentions

### Requirement 11

**User Story:** As a developer, I want test data generation to include voice notes, so that I can test the voice notes feature and co-mention analysis.

#### Acceptance Criteria

1. WHEN test data is generated THEN the system SHALL create sample voice notes for the user
2. WHEN voice notes are created THEN the system SHALL associate them with test contacts
3. WHEN voice notes are created THEN the system SHALL include transcriptions and extracted entities
4. WHEN voice notes are created THEN the system SHALL create co-mentions (multiple contacts in same voice note)
5. WHEN voice notes are created THEN the system SHALL vary the recording timestamps to simulate realistic usage patterns

### Requirement 12

**User Story:** As a developer, I want the clear test data function to remove all generated data including voice notes and group suggestions, so that I can reset the test environment completely.

#### Acceptance Criteria

1. WHEN test data is cleared THEN the system SHALL remove all test voice notes
2. WHEN test data is cleared THEN the system SHALL remove all voice note contact associations
3. WHEN test data is cleared THEN the system SHALL remove all group suggestions (both individual and group types)
4. WHEN test data is cleared THEN the system SHALL remove all calendar events
5. WHEN test data is cleared THEN the system SHALL maintain referential integrity during deletion
