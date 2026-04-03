# Requirements Document

## Introduction

This feature addresses two related issues in the CatchUp application: (1) the sync warning banner overlapping with the top-right header controls (theme toggle and notification bell), and (2) the Google OAuth token refresh mechanism failing to proactively refresh expired access tokens, causing persistent and unnecessary reconnection banners. The goal is to fix the banner layout stacking context so it never obscures header controls, and to implement robust automatic token refresh so users only see reconnection prompts when their refresh token is truly revoked or invalid.

## Glossary

- **Sync_Warning_Banner**: The fixed-position notification bar displayed at the top of the page when Google integration sync is unavailable, implemented in `public/js/sync-warning-banner.js` and styled in `public/css/sync-warning-banner.css`.
- **Header_Controls**: The fixed-position buttons in the top-right corner of the application, including the theme toggle (`#theme-toggle`) and notification bell (`#notification-bell-fixed`), styled in `public/css/app-shell.css`.
- **Token_Health_Monitor**: The singleton service (`src/integrations/token-health-monitor.ts`) that checks OAuth token expiry status, classifies tokens as valid/expiring_soon/expired/revoked, and performs background token refresh.
- **OAuth_Service**: The Google Contacts OAuth service (`src/integrations/google-contacts-oauth-service.ts`) that manages the OAuth 2.0 flow, token exchange, and token refresh for Google Contacts and Calendar integrations.
- **OAuth_Repository**: The data access layer (`src/integrations/oauth-repository.ts`) that stores and retrieves encrypted OAuth tokens (access token, refresh token, expiry date) from the PostgreSQL database.
- **Access_Token**: A short-lived Google OAuth 2.0 credential (typically 1 hour) used to authenticate API requests to Google services.
- **Refresh_Token**: A long-lived Google OAuth 2.0 credential obtained via offline access that can be exchanged for new Access_Tokens without user interaction.
- **Token_Health_Notification_Service**: The service (`src/integrations/token-health-notification-service.ts`) that creates and manages user-facing notifications about token health issues.

## Requirements

### Requirement 1: Banner Layout Does Not Obscure Header Controls

**User Story:** As a user, I want the sync warning banner to display without covering the theme toggle or notification bell, so that I can always access those controls.

#### Acceptance Criteria

1. WHEN the Sync_Warning_Banner is visible, THE Header_Controls SHALL remain fully visible and clickable above or below the banner without any overlap.
2. WHEN the Sync_Warning_Banner is visible, THE Sync_Warning_Banner SHALL use a z-index value lower than the z-index of the Header_Controls so that the Header_Controls render on top of the banner.
3. WHEN the Sync_Warning_Banner is visible, THE Header_Controls SHALL reposition vertically to account for the banner height, maintaining a minimum gap of 8 pixels from the bottom edge of the banner.
4. WHEN the Sync_Warning_Banner is hidden, THE Header_Controls SHALL return to their default position (top: 20px).
5. WHEN the viewport width is 768 pixels or less, THE Sync_Warning_Banner SHALL stack its content vertically and THE Header_Controls SHALL reposition to account for the taller mobile banner height.

### Requirement 2: Proactive Background Token Refresh

**User Story:** As a user, I want my Google connection to stay active automatically, so that I do not see unnecessary reconnection banners.

#### Acceptance Criteria

1. WHEN an Access_Token is within 10 minutes of expiry, THE OAuth_Service SHALL automatically refresh the Access_Token using the stored Refresh_Token before making any Google API call.
2. THE Token_Health_Monitor SHALL attempt to refresh all tokens classified as "expiring_soon" or "expired" during its periodic background check, provided a valid Refresh_Token exists in the OAuth_Repository.
3. WHEN the Token_Health_Monitor successfully refreshes an Access_Token, THE Token_Health_Monitor SHALL update the token status to "valid" in the token_health table and update the new expiry date.
4. WHEN the Token_Health_Monitor fails to refresh an Access_Token due to an invalid or revoked Refresh_Token, THE Token_Health_Monitor SHALL mark the token status as "revoked" and THE Token_Health_Notification_Service SHALL create a reconnection notification.
5. WHEN the Token_Health_Monitor fails to refresh an Access_Token due to a transient network error, THE Token_Health_Monitor SHALL retain the current token status and retry on the next scheduled check rather than marking the token as revoked.

### Requirement 3: Reconnection Banner Display Criteria

**User Story:** As a user, I want to see the reconnection banner only when my Google connection truly requires manual re-authorization, so that I am not interrupted by false alarms.

#### Acceptance Criteria

1. THE Sync_Warning_Banner SHALL display a reconnection prompt only when the token status is "revoked" in the token_health table, indicating the Refresh_Token is invalid and automatic refresh has failed.
2. WHEN the token status is "expired" and a valid Refresh_Token exists, THE Sync_Warning_Banner SHALL NOT display a reconnection prompt because the Token_Health_Monitor can refresh the token automatically.
3. WHEN the token status is "expiring_soon", THE Sync_Warning_Banner SHALL remain hidden because the token is still functional and will be refreshed proactively.
4. WHEN a user completes the OAuth reconnection flow, THE Sync_Warning_Banner SHALL hide within 5 seconds of the OAuth callback completing successfully.

### Requirement 4: OAuth Flow Requests Offline Access

**User Story:** As a developer, I want the Google OAuth flow to always request offline access, so that the application receives a long-lived refresh token for automatic token renewal.

#### Acceptance Criteria

1. THE OAuth_Service SHALL include `access_type=offline` in all Google OAuth authorization URL parameters to request a Refresh_Token from Google.
2. THE OAuth_Service SHALL include `prompt=consent` in the authorization URL parameters to ensure Google returns a new Refresh_Token on each authorization.
3. WHEN the OAuth callback receives tokens from Google, THE OAuth_Service SHALL persist the Refresh_Token in the OAuth_Repository alongside the Access_Token.
4. IF the OAuth callback response does not include a Refresh_Token, THEN THE OAuth_Service SHALL log a warning indicating that offline access was not granted, and THE Token_Health_Notification_Service SHALL flag the token as requiring re-authentication.

### Requirement 5: Token Refresh Error Differentiation

**User Story:** As a developer, I want the token refresh logic to distinguish between recoverable and non-recoverable errors, so that the system handles each case appropriately.

#### Acceptance Criteria

1. WHEN a token refresh request returns an HTTP 400 error with `invalid_grant`, THE Token_Health_Monitor SHALL classify the Refresh_Token as revoked and mark the token status as "revoked".
2. WHEN a token refresh request returns an HTTP 401 error, THE Token_Health_Monitor SHALL classify the Refresh_Token as revoked and mark the token status as "revoked".
3. WHEN a token refresh request fails due to a network timeout or HTTP 5xx error, THE Token_Health_Monitor SHALL classify the failure as transient and retain the current token status for retry.
4. WHEN a token refresh request fails due to a transient error, THE Token_Health_Monitor SHALL log the error with the user ID, integration type, and error details for debugging.
5. THE Token_Health_Monitor SHALL limit transient retry attempts to 3 consecutive failures before marking the token as "revoked" and triggering a reconnection notification.

### Requirement 6: Comprehensive Health Endpoint Accuracy

**User Story:** As a frontend developer, I want the sync health API endpoint to reflect the true token state after background refresh attempts, so that the banner displays accurate information.

#### Acceptance Criteria

1. WHEN the `/api/contacts/sync/comprehensive-health` endpoint is called, THE endpoint SHALL trigger a token refresh attempt for any expired tokens before returning the health status.
2. WHEN a token refresh succeeds during the health check, THE endpoint SHALL return `available: true` and `requiresReauth: false` for that integration.
3. WHEN a token refresh fails with a non-recoverable error during the health check, THE endpoint SHALL return `available: false` and `requiresReauth: true` for that integration.
4. THE endpoint SHALL include a `tokenStatus` field in the response with the current token health classification ("valid", "expiring_soon", "expired", or "revoked") for each integration.
