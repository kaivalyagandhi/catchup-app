# Requirements Document

## Introduction

This feature enhances the CatchUp application's test data generation capabilities by providing granular control over test data generation and removal in the user preferences panel. Users can selectively generate or remove specific types of test data (contacts, calendar events, suggestions, group suggestions, and voice notes) with a clear status display showing counts of both test and real data. This enables developers and testers to quickly populate the application with meaningful test data while maintaining flexibility to reset specific data types.

## Glossary

- **Test Data Generator**: The system component responsible for creating synthetic data for testing purposes
- **Calendar Event**: A time-blocked period in the user's calendar representing availability or unavailability
- **Suggestion**: An AI-generated recommendation to connect with a contact based on availability and relationship factors
- **Contact**: A person in the user's relationship network with associated metadata
- **Time Slot**: A specific period of time with start and end timestamps
- **Frequency Preference**: How often a user wants to connect with a specific contact (daily, weekly, biweekly, monthly, quarterly)

## Requirements

### Requirement 1

**User Story:** As a developer, I want to access test data management controls in the preferences panel, so that I can generate and remove specific types of test data independently.

#### Acceptance Criteria

1. WHEN a user navigates to preferences THEN the system SHALL display a "Test Data Management" section
2. WHEN the Test Data Management section is displayed THEN the system SHALL show a status panel with counts of test and real data for each type
3. WHEN the Test Data Management section is displayed THEN the system SHALL show separate controls for each data type (Contacts, Calendar Events, Suggestions, Group Suggestions, Voice Notes)
4. WHEN the Test Data Management section is displayed THEN the system SHALL display the current count of test items for each type
5. WHEN the Test Data Management section is displayed THEN the system SHALL display the current count of real items for each type
6. WHEN the Test Data Management section is displayed THEN the system SHALL display "Generate" and "Remove" buttons for each data type

### Requirement 2

**User Story:** As a developer, I want to generate test contacts with realistic data, so that I can test the contact management features with meaningful scenarios.

#### Acceptance Criteria

1. WHEN a user clicks the "Generate" button for Contacts THEN the system SHALL create multiple test contacts with varied attributes
2. WHEN test contacts are created THEN the system SHALL assign realistic names, emails, locations, and frequency preferences
3. WHEN test contacts are created THEN the system SHALL set varied last contact dates to simulate different relationship states
4. WHEN test contacts are created THEN the system SHALL assign relevant tags to each contact
5. WHEN test contacts are created THEN the system SHALL assign contacts to groups
6. WHEN test contacts are created THEN the system SHALL infer and assign appropriate timezones based on location

### Requirement 3

**User Story:** As a developer, I want to generate calendar events representing my availability, so that I can test time-bound suggestion generation.

#### Acceptance Criteria

1. WHEN a user clicks the "Generate" button for Calendar Events THEN the system SHALL create calendar events representing available time slots
2. WHEN calendar events are created THEN the system SHALL generate slots across multiple days
3. WHEN calendar events are created THEN the system SHALL include both weekday and weekend slots
4. WHEN calendar events are created THEN the system SHALL vary the time of day for different slots
5. WHEN calendar events are created THEN the system SHALL store events in the calendar_events table

### Requirement 4

**User Story:** As a developer, I want to generate suggestions based on test contacts and calendar data, so that I can test the suggestion feed and matching logic.

#### Acceptance Criteria

1. WHEN a user clicks the "Generate" button for Suggestions THEN the system SHALL create suggestions using existing contacts and generated availability
2. WHEN suggestions are generated THEN the system SHALL apply the matching algorithm to pair contacts with time slots
3. WHEN suggestions are generated THEN the system SHALL include reasoning for each suggestion
4. WHEN suggestions are generated THEN the system SHALL respect contact frequency preferences
5. WHEN suggestions are generated THEN the system SHALL return the count of suggestions created

### Requirement 5

**User Story:** As a developer, I want to generate group suggestions based on test contacts with shared context, so that I can test the group catchup feature.

#### Acceptance Criteria

1. WHEN a user clicks the "Generate" button for Group Suggestions THEN the system SHALL create group suggestions for contacts with strong shared context
2. WHEN group suggestions are generated THEN the system SHALL include 2-3 contacts per group suggestion
3. WHEN group suggestions are generated THEN the system SHALL calculate and store shared context scores
4. WHEN group suggestions are generated THEN the system SHALL include reasoning based on common groups, shared tags, and co-mentions
5. WHEN group suggestions are generated THEN the system SHALL return the count of group suggestions created

### Requirement 6

**User Story:** As a developer, I want to generate voice notes with realistic data, so that I can test the voice notes feature and co-mention analysis.

#### Acceptance Criteria

1. WHEN a user clicks the "Generate" button for Voice Notes THEN the system SHALL create sample voice notes for the user
2. WHEN voice notes are created THEN the system SHALL associate them with test contacts
3. WHEN voice notes are created THEN the system SHALL include transcriptions and extracted entities
4. WHEN voice notes are created THEN the system SHALL create co-mentions (multiple contacts in same voice note)
5. WHEN voice notes are created THEN the system SHALL vary the recording timestamps to simulate realistic usage patterns

### Requirement 7

**User Story:** As a developer, I want to remove specific types of test data independently, so that I can reset only the data types I need to refresh.

#### Acceptance Criteria

1. WHEN a user clicks the "Remove" button for a data type THEN the system SHALL delete all test data of that type
2. WHEN test contacts are removed THEN the system SHALL also remove associated test tags and group assignments
3. WHEN test calendar events are removed THEN the system SHALL delete all test calendar events
4. WHEN test suggestions are removed THEN the system SHALL delete all test suggestions (both individual and group types)
5. WHEN test voice notes are removed THEN the system SHALL delete all test voice notes and their associations
6. WHEN test data is removed THEN the system SHALL maintain referential integrity and not affect real data

### Requirement 8

**User Story:** As a developer, I want the test data management UI to provide clear feedback during operations, so that I understand what data was created or removed.

#### Acceptance Criteria

1. WHEN test data generation starts THEN the system SHALL display a loading indicator on the button
2. WHEN test data generation completes THEN the system SHALL display a success message with counts
3. WHEN test data generation fails THEN the system SHALL display an error message with details
4. WHEN test data is generated or removed THEN the system SHALL automatically refresh the status counts
5. WHEN the user is on the preferences page THEN the system SHALL show updated counts immediately

### Requirement 9

**User Story:** As a developer, I want test data endpoints to be properly organized and secured, so that they cannot be accidentally used in production.

#### Acceptance Criteria

1. WHEN test data endpoints are defined THEN the system SHALL place them under the /api/test-data route prefix
2. WHEN test data endpoints are called THEN the system SHALL require authentication
3. WHEN test data endpoints are called THEN the system SHALL validate the user ID
4. WHEN test data endpoints are called THEN the system SHALL use database transactions for atomicity
5. WHEN test data endpoints are called in production THEN the system SHALL optionally disable them via environment variable

### Requirement 10

**User Story:** As a developer, I want test data generation to be idempotent, so that I can safely regenerate data without creating duplicates.

#### Acceptance Criteria

1. WHEN test data is generated multiple times THEN the system SHALL not create duplicate contacts
2. WHEN test data generation fails THEN the system SHALL rollback partial changes
3. WHEN test data is generated THEN the system SHALL mark all created data as test data for tracking
4. WHEN test data is generated THEN the system SHALL report success or failure with details
5. WHEN test data is removed THEN the system SHALL only remove data marked as test data
