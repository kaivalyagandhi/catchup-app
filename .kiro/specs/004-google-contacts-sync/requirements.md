# Requirements Document

## Introduction

This document specifies the requirements for implementing a comprehensive Google Contacts integration in CatchUp. The integration will enable users to import contacts from their Google account, maintain synchronization with Google Contacts, and manage contact groups. This feature reduces manual data entry, keeps contact information up-to-date automatically, and provides a seamless onboarding experience for new users.

## Glossary

- **System**: The CatchUp application backend and frontend components
- **User**: A person with a CatchUp account who wants to manage their contacts
- **Google Contacts**: Google's contact management service accessed via the People API
- **OAuth Flow**: The authentication process where users grant CatchUp permission to access their Google Contacts
- **Full Sync**: Complete import of all contacts from Google Contacts
- **Incremental Sync**: Synchronization that only processes changes since the last sync
- **Sync Token**: A token provided by Google that enables incremental synchronization
- **Resource Name**: Google's unique identifier for a contact (e.g., "people/c1234567890")
- **ETag**: Entity tag used by Google for optimistic concurrency control
- **Contact Source**: The origin of a contact (manual, google, calendar, voice_note)
- **Contact Group**: A collection of contacts in Google Contacts
- **Group Mapping**: The association between a Google contact group and a CatchUp group
- **Group Mapping Suggestion**: An AI-generated recommendation for mapping a Google contact group to an existing or new CatchUp group
- **Mapping Status**: The approval state of a group mapping (pending, approved, rejected)
- **One-Way Sync**: Data flows only from Google Contacts to CatchUp; CatchUp never modifies Google Contacts data
- **People API**: Google's API for accessing contact and profile information (read-only access)
- **Sync State**: The current status and metadata of the synchronization process

## Requirements

### Requirement 1

**User Story:** As a new user, I want to connect my Google Contacts account, so that I can quickly import my existing contacts into CatchUp without manual entry.

#### Acceptance Criteria

1. WHEN a user clicks "Connect Google Contacts" THEN the System SHALL redirect the user to Google's OAuth consent screen
2. WHEN the user grants permission THEN the System SHALL store the OAuth access token and refresh token securely in the database
3. WHEN OAuth tokens are stored THEN the System SHALL encrypt the tokens using the configured encryption key
4. WHEN the OAuth callback is received THEN the System SHALL validate the authorization code and exchange it for access tokens
5. WHEN token storage fails THEN the System SHALL display an error message and allow the user to retry the connection

### Requirement 2

**User Story:** As a user, I want to perform an initial import of all my Google contacts, so that I can start using CatchUp with my existing contact data.

#### Acceptance Criteria

1. WHEN a user completes the OAuth flow THEN the System SHALL trigger a full synchronization of contacts
2. WHEN performing a full sync THEN the System SHALL request all contacts from the People API with pagination support
3. WHEN importing a contact THEN the System SHALL extract names, email addresses, phone numbers, organizations, URLs, addresses, and memberships
4. WHEN a contact is imported THEN the System SHALL store the Google resource name, ETag, and mark the source as "google"
5. WHEN the full sync completes THEN the System SHALL store the sync token for future incremental updates
6. WHEN importing contacts THEN the System SHALL deduplicate based on email addresses and phone numbers
7. WHEN a duplicate is detected THEN the System SHALL update the existing contact rather than create a new one
8. WHEN the sync completes THEN the System SHALL display the total number of contacts imported

### Requirement 3

**User Story:** As a user, I want my Google contacts to stay synchronized automatically, so that changes in Google Contacts are reflected in CatchUp without manual intervention.

#### Acceptance Criteria

1. WHEN a sync token exists THEN the System SHALL perform incremental synchronization using the stored sync token
2. WHEN performing incremental sync THEN the System SHALL request only changed contacts since the last sync
3. WHEN a contact is marked as deleted by Google THEN the System SHALL archive or soft-delete the contact in CatchUp
4. WHEN a contact has been updated in Google THEN the System SHALL update the corresponding contact in CatchUp
5. WHEN the incremental sync completes THEN the System SHALL store the new sync token
6. WHEN a sync token expires (410 error) THEN the System SHALL automatically trigger a full synchronization
7. WHEN automatic sync is enabled THEN the System SHALL perform incremental sync once daily via background job

### Requirement 4

**User Story:** As a user, I want to manually trigger a contact sync, so that I can immediately update my contacts when I know changes have been made.

#### Acceptance Criteria

1. WHEN a user clicks "Sync Now" THEN the System SHALL initiate an incremental synchronization
2. WHEN a sync is in progress THEN the System SHALL display a loading indicator with sync status
3. WHEN the sync completes successfully THEN the System SHALL display the number of contacts updated and deleted
4. WHEN a sync fails THEN the System SHALL display an error message with actionable steps for resolution
5. WHEN multiple sync requests are made THEN the System SHALL queue subsequent requests and prevent duplicate syncs

### Requirement 5

**User Story:** As a user, I want to see which contacts came from Google, so that I understand the source of my contact data.

#### Acceptance Criteria

1. WHEN displaying a contact THEN the System SHALL show a visual indicator if the contact source is "google"
2. WHEN a user views contact details THEN the System SHALL display the last sync timestamp for Google-sourced contacts
3. WHEN listing contacts THEN the System SHALL provide a filter option to show only Google-imported contacts
4. WHEN a Google-sourced contact is edited manually THEN the System SHALL maintain the "google" source designation

### Requirement 6

**User Story:** As a user, I want to review suggested mappings of my Google contact groups to CatchUp groups, so that I can control which groups are created and avoid polluting my existing group structure.

#### Acceptance Criteria

1. WHEN performing a full sync THEN the System SHALL import all user-created contact groups from Google and generate mapping suggestions
2. WHEN generating a mapping suggestion THEN the System SHALL analyze existing CatchUp groups and suggest relevant matches based on name similarity and member overlap
3. WHEN no relevant existing group is found THEN the System SHALL suggest creating a new CatchUp group with the Google group name
4. WHEN mapping suggestions are generated THEN the System SHALL store them with status "pending" without creating groups automatically
5. WHEN a user views the Google Contacts settings page THEN the System SHALL display all pending group mapping suggestions
6. WHEN a user approves a mapping suggestion THEN the System SHALL create or link the CatchUp group and update the mapping status to "approved"
7. WHEN a user rejects a mapping suggestion THEN the System SHALL update the mapping status to "rejected" and exclude the group from sync
8. WHEN a contact belongs to an approved Google group mapping THEN the System SHALL add the contact to the corresponding CatchUp group
9. WHEN a Google group is renamed THEN the System SHALL update the corresponding CatchUp group name during sync for approved mappings only
10. WHEN a Google group is deleted THEN the System SHALL mark the corresponding CatchUp group mapping as inactive

### Requirement 7

**User Story:** As a user, I want to disconnect my Google Contacts integration, so that I can revoke access if I no longer want automatic synchronization.

#### Acceptance Criteria

1. WHEN a user clicks "Disconnect Google Contacts" THEN the System SHALL display a confirmation dialog
2. WHEN the user confirms disconnection THEN the System SHALL delete the stored OAuth tokens
3. WHEN disconnection completes THEN the System SHALL stop all automatic synchronization jobs for that user
4. WHEN disconnection completes THEN the System SHALL preserve existing contacts but mark them as no longer synced
5. WHEN a user reconnects after disconnection THEN the System SHALL perform a full synchronization

### Requirement 8

**User Story:** As a user, I want to see the status of my Google Contacts connection, so that I know whether synchronization is active and when it last occurred.

#### Acceptance Criteria

1. WHEN a user views the settings page THEN the System SHALL display the connection status (connected or disconnected)
2. WHEN connected THEN the System SHALL display the last successful sync timestamp
3. WHEN connected THEN the System SHALL display the total number of contacts synced
4. WHEN a sync error occurs THEN the System SHALL display the error message and timestamp
5. WHEN viewing sync status THEN the System SHALL indicate whether automatic sync is enabled

### Requirement 9

**User Story:** As a system administrator, I want the integration to handle API rate limits gracefully, so that the service remains stable under high load.

#### Acceptance Criteria

1. WHEN making API requests THEN the System SHALL limit requests to 500 per minute per user
2. WHEN a rate limit error (429) is received THEN the System SHALL implement exponential backoff and retry
3. WHEN the rate limit window resets THEN the System SHALL resume normal request processing
4. WHEN multiple users sync simultaneously THEN the System SHALL queue requests to stay within project-wide quotas
5. WHEN rate limiting is active THEN the System SHALL log rate limit events for monitoring

### Requirement 10

**User Story:** As a developer, I want comprehensive error handling for sync operations, so that failures are logged and users receive helpful feedback.

#### Acceptance Criteria

1. WHEN a network error occurs during sync THEN the System SHALL retry up to 3 times with exponential backoff
2. WHEN OAuth tokens are invalid or expired THEN the System SHALL attempt to refresh the access token
3. WHEN token refresh fails THEN the System SHALL notify the user to reconnect their Google account
4. WHEN a contact import fails THEN the System SHALL log the error and continue processing remaining contacts
5. WHEN a sync fails completely THEN the System SHALL store the error details in the sync state table
6. WHEN validation errors occur THEN the System SHALL log the invalid data and skip the problematic contact

### Requirement 11

**User Story:** As a user, I want my contact data to remain secure, so that my personal information is protected.

#### Acceptance Criteria

1. WHEN OAuth tokens are stored THEN the System SHALL encrypt tokens at rest using AES-256 encryption
2. WHEN making API requests THEN the System SHALL use HTTPS for all communications with Google APIs
3. WHEN requesting OAuth scopes THEN the System SHALL request only the minimum required permissions
4. WHEN a user disconnects THEN the System SHALL securely delete all OAuth tokens
5. WHEN storing contact data THEN the System SHALL comply with GDPR data protection requirements

### Requirement 12

**User Story:** As a user, I want the sync process to handle large contact lists efficiently, so that synchronization completes in a reasonable time.

#### Acceptance Criteria

1. WHEN performing a full sync THEN the System SHALL use a page size of 1000 contacts per request
2. WHEN processing paginated results THEN the System SHALL handle pagination tokens correctly
3. WHEN importing contacts THEN the System SHALL use batch database operations for inserts and updates
4. WHEN a full sync exceeds 2 minutes for 500 contacts THEN the System SHALL log a performance warning
5. WHEN processing large contact lists THEN the System SHALL provide progress updates to the user

### Requirement 13

**User Story:** As a user, I want contact deduplication to work correctly, so that I don't end up with duplicate contacts after syncing.

#### Acceptance Criteria

1. WHEN importing a contact THEN the System SHALL check for existing contacts by Google resource name
2. WHEN no resource name match exists THEN the System SHALL check for duplicates by email address
3. WHEN no email match exists THEN the System SHALL check for duplicates by phone number
4. WHEN a duplicate is found THEN the System SHALL update the existing contact rather than create a new one
5. WHEN updating a duplicate THEN the System SHALL preserve manually added data in CatchUp

### Requirement 14

**User Story:** As a user, I want to understand what data is being synced, so that I can make informed decisions about privacy.

#### Acceptance Criteria

1. WHEN viewing the OAuth consent screen THEN the System SHALL clearly list the data types being accessed
2. WHEN connected THEN the System SHALL provide documentation explaining what data is synced
3. WHEN viewing settings THEN the System SHALL display which contact fields are imported from Google
4. WHEN a user has privacy concerns THEN the System SHALL provide a link to the privacy policy
5. WHEN requesting permissions THEN the System SHALL explain why each permission is needed

### Requirement 15

**User Story:** As a user, I want assurance that CatchUp will not modify my Google Contacts data, so that I can safely connect my account without fear of data corruption.

#### Acceptance Criteria

1. WHEN viewing the Google Contacts settings page THEN the System SHALL display a prominent notice that sync is one-way (read-only from Google)
2. WHEN requesting OAuth permissions THEN the System SHALL request only read-only scopes for the People API
3. WHEN the System makes API calls to Google THEN the System SHALL use only read operations (GET requests)
4. WHEN a user edits a contact in CatchUp THEN the System SHALL update only the local CatchUp database and SHALL NOT send changes to Google Contacts
5. WHEN a user creates a new group in CatchUp THEN the System SHALL create it only locally and SHALL NOT create it in Google Contacts
6. WHEN displaying sync status THEN the System SHALL include text confirming "Your Google Contacts remain unchanged"
