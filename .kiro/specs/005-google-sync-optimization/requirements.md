# Requirements Document

## Introduction

The Google Sync Optimization feature addresses critical inefficiencies in the current Google Contacts and Calendar synchronization system. Currently, the system experiences repeated sync failures due to invalid OAuth tokens, resulting in wasted API calls, unnecessary resource consumption, and poor user experience. This feature implements intelligent sync scheduling, proactive token health monitoring, circuit breaker patterns, and user notifications to dramatically reduce API usage while improving reliability.

## Glossary

- **Sync_Job**: A scheduled background task that synchronizes data from Google APIs (Contacts or Calendar)
- **Token_Health**: The validity state of an OAuth token (valid, expired, revoked, or unknown)
- **Circuit_Breaker**: A pattern that prevents repeated failed operations by "opening" after a threshold of failures
- **Sync_Backoff**: Progressive delay between sync attempts after failures
- **Change_Detection**: Mechanism to determine if remote data has changed since last sync
- **Webhook**: Push notification from Google when calendar data changes
- **Sync_Frequency**: How often sync jobs are scheduled to run
- **Token_Expiry_Prediction**: Calculating when a token will expire based on its expiry_date
- **Adaptive_Sync**: Dynamically adjusting sync frequency based on data change patterns
- **Sync_Health_Dashboard**: Admin interface for monitoring sync status across all users

## Requirements

### Requirement 1: Token Health Monitoring

**User Story:** As a system administrator, I want to proactively monitor OAuth token health, so that we can detect and handle token issues before they cause repeated sync failures.

#### Acceptance Criteria

1. WHEN a sync job is scheduled to run, THE Token_Health_Monitor SHALL validate the token before attempting API calls
2. WHEN a token's expiry_date is within 24 hours, THE Token_Health_Monitor SHALL mark it as "expiring_soon"
3. WHEN a token validation fails with invalid_grant, THE Token_Health_Monitor SHALL mark it as "revoked"
4. WHEN a token is marked as revoked or expired, THE Sync_Job SHALL skip execution and log the reason
5. THE Token_Health_Monitor SHALL store token health status with timestamp in the database
6. WHEN token health changes from valid to invalid, THE System SHALL emit a token_health_changed event

### Requirement 2: Circuit Breaker Pattern

**User Story:** As a system administrator, I want sync jobs to stop retrying after repeated failures, so that we don't waste API quota and system resources on operations that will continue to fail.

#### Acceptance Criteria

1. WHEN a sync job fails 3 consecutive times, THE Circuit_Breaker SHALL transition to "open" state
2. WHILE the Circuit_Breaker is open, THE Sync_Job SHALL not attempt API calls
3. WHEN the Circuit_Breaker is open for 1 hour, THE Circuit_Breaker SHALL transition to "half_open" state
4. WHEN a sync succeeds in half_open state, THE Circuit_Breaker SHALL transition to "closed" state
5. WHEN a sync fails in half_open state, THE Circuit_Breaker SHALL transition back to "open" state
6. THE Circuit_Breaker SHALL maintain separate state for Contacts and Calendar syncs per user
7. THE Circuit_Breaker SHALL log all state transitions with timestamps

### Requirement 3: Exponential Backoff for Failed Syncs

**User Story:** As a system administrator, I want failed syncs to retry with increasing delays, so that we reduce load on both our system and Google's APIs during outages or persistent issues.

#### Acceptance Criteria

1. WHEN a sync job fails, THE Sync_Scheduler SHALL calculate next retry using exponential backoff
2. THE Sync_Backoff SHALL start at 5 minutes for the first retry
3. THE Sync_Backoff SHALL double the delay for each subsequent failure (5min, 10min, 20min, 40min)
4. THE Sync_Backoff SHALL cap the maximum delay at 24 hours
5. WHEN a sync succeeds, THE Sync_Scheduler SHALL reset the backoff delay to the default schedule
6. THE Sync_Scheduler SHALL store the current backoff state in the database

### Requirement 4: User Notification for Token Issues

**User Story:** As a user, I want to be notified when my Google integration needs re-authentication, so that I can take action to restore sync functionality.

#### Acceptance Criteria

1. WHEN a token is marked as revoked or expired, THE Notification_Service SHALL create a notification for the user
2. THE Notification SHALL include a direct link to re-authenticate with Google
3. WHEN a user has not re-authenticated within 7 days, THE Notification_Service SHALL send a reminder
4. WHEN a user successfully re-authenticates, THE System SHALL clear all related notifications
5. THE Notification SHALL be visible in the user's notification center
6. THE Notification SHALL include the specific integration affected (Contacts, Calendar, or both)

### Requirement 5: Adaptive Sync Frequency

**User Story:** As a system administrator, I want sync frequency to adapt based on data change patterns, so that we reduce unnecessary API calls for users with infrequent changes.

#### Acceptance Criteria

1. WHEN a sync detects no changes for 5 consecutive runs, THE Sync_Scheduler SHALL reduce frequency by 50%
2. WHEN a sync detects changes, THE Sync_Scheduler SHALL restore the default frequency
3. THE Sync_Scheduler SHALL maintain minimum frequencies: 4 hours for Calendar, 7 days for Contacts
4. THE Sync_Scheduler SHALL maintain default frequencies: 4 hours for Calendar (with webhooks as primary), 3 days for Contacts
5. THE Sync_Scheduler SHALL maintain maximum frequencies: 1 hour for Calendar (webhook fallback), 1 day for Contacts
6. THE Sync_Scheduler SHALL store the current frequency multiplier in the database
7. WHEN a user manually triggers a sync, THE Sync_Scheduler SHALL not affect the adaptive frequency calculation

### Requirement 6: Calendar Webhook Support

**User Story:** As a system administrator, I want to use Google Calendar push notifications instead of polling, so that we can receive real-time updates while dramatically reducing API calls.

#### Acceptance Criteria

1. WHEN a user connects Google Calendar, THE System SHALL register a webhook with Google Calendar API
2. WHEN Google Calendar sends a push notification, THE Webhook_Handler SHALL trigger an immediate incremental sync
3. WHEN a webhook is registered, THE Sync_Scheduler SHALL reduce polling frequency to 8 hours (fallback only)
4. WHEN a webhook expires (before 7 days), THE System SHALL automatically renew it 24 hours before expiration
5. WHEN webhook registration fails, THE System SHALL fall back to polling at 4-hour frequency
6. THE System SHALL store webhook channel_id, resource_id, and expiration timestamp in the database
7. WHEN a webhook notification is received, THE System SHALL validate the channel_id and resource_id before processing

### Requirement 7: On-Demand Sync Triggers

**User Story:** As a user, I want to manually trigger a sync when I know I've made changes in Google, so that I can get immediate updates without waiting for the scheduled sync.

#### Acceptance Criteria

1. WHEN a user clicks "Sync Now" button, THE System SHALL trigger an immediate sync
2. THE On_Demand_Sync SHALL bypass the Circuit_Breaker if it's in open state
3. WHEN an on-demand sync fails due to invalid token, THE System SHALL show an error message with re-auth link
4. THE System SHALL rate-limit on-demand syncs to 1 per minute per user
5. WHEN an on-demand sync is in progress, THE UI SHALL show a loading indicator
6. THE On_Demand_Sync SHALL not affect the scheduled sync timing

### Requirement 8: Token Expiry Prediction and Proactive Refresh

**User Story:** As a system administrator, I want to proactively refresh tokens before they expire, so that syncs don't fail due to expired tokens.

#### Acceptance Criteria

1. WHEN a token's expiry_date is within 48 hours, THE Token_Refresh_Service SHALL attempt to refresh it
2. THE Token_Refresh_Service SHALL run every 6 hours to check all user tokens
3. WHEN a token refresh succeeds, THE System SHALL update the stored tokens and expiry_date
4. WHEN a token refresh fails, THE System SHALL mark the token as requiring re-authentication
5. THE Token_Refresh_Service SHALL log all refresh attempts and outcomes
6. WHEN a refresh token is missing, THE System SHALL mark the integration as requiring re-authentication

### Requirement 9: Graceful Degradation

**User Story:** As a user, I want the app to continue functioning when sync is unavailable, so that I can still use other features even if Google integration is temporarily broken.

#### Acceptance Criteria

1. WHEN sync is unavailable, THE UI SHALL display a warning banner with the last successful sync time
2. WHEN sync is unavailable, THE System SHALL continue to show cached data
3. WHEN a user attempts to use a feature requiring fresh data, THE System SHALL show a message explaining the limitation
4. THE System SHALL mark cached data with a "last_updated" timestamp
5. WHEN sync is restored, THE System SHALL automatically update the UI with fresh data
6. THE Warning_Banner SHALL include a "Reconnect" button for re-authentication

### Requirement 10: Sync Health Dashboard

**User Story:** As a system administrator, I want a dashboard showing sync health across all users, so that I can monitor system-wide issues and identify patterns.

#### Acceptance Criteria

1. THE Sync_Health_Dashboard SHALL display total users with active Google integrations
2. THE Sync_Health_Dashboard SHALL show count of users with invalid tokens
3. THE Sync_Health_Dashboard SHALL show count of users with open circuit breakers
4. THE Sync_Health_Dashboard SHALL display average sync success rate over the last 24 hours
5. THE Sync_Health_Dashboard SHALL show total API calls saved by optimization features
6. THE Sync_Health_Dashboard SHALL allow filtering by integration type (Contacts, Calendar)
7. THE Sync_Health_Dashboard SHALL refresh automatically every 5 minutes
8. THE Sync_Health_Dashboard SHALL show a list of users with persistent sync failures (>7 days)

### Requirement 11: Admin Role Management

**User Story:** As a system owner, I want to designate specific users as administrators, so that only authorized personnel can access the sync health dashboard and system monitoring tools.

#### Acceptance Criteria

1. THE System SHALL support an "admin" role stored in the users table
2. WHEN a user with admin role accesses /admin/sync-health, THE System SHALL display the dashboard
3. WHEN a non-admin user attempts to access /admin/sync-health, THE System SHALL return 403 Forbidden
4. THE System SHALL provide a database migration to add is_admin boolean column to users table (default false)
5. THE System SHALL provide a CLI script to promote users to admin role by email
6. THE Admin_Middleware SHALL verify JWT token and check is_admin flag before allowing access
7. THE System SHALL log all admin dashboard access attempts with user_id and timestamp
