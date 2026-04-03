# Tasks

## Task 1: Fix banner/header z-index and vertical repositioning
- [x] 1.1 In `public/css/sync-warning-banner.css`, change `.sync-warning-banner` z-index from `9999` to `900`
- [x] 1.2 In `public/css/app-shell.css`, change `.theme-toggle` and `#notification-bell-fixed` z-index from `10000 !important` to `1000`, remove `!important`
- [x] 1.3 In `public/css/app-shell.css`, update `body.sync-warning-visible .theme-toggle` and `body.sync-warning-visible #notification-bell-fixed` rules to use `top: calc(var(--banner-height, 0px) + 28px)` instead of hardcoded `72px`
- [x] 1.4 In `public/js/notification-center.js` `adjustTopButtonsForBanner()`, set `document.documentElement.style.setProperty('--banner-height', bannerHeight + 'px')` when banner is visible, and remove the property when hidden; ensure minimum 8px gap (offset = bannerHeight + 8 minimum, fallback to 20px)
- [x] 1.5 In `public/css/app-shell.css`, add mobile media query `@media (max-width: 768px)` override for `body.sync-warning-visible` header control positioning to account for taller stacked banner

## Task 2: Implement error classification in TokenHealthMonitor
- [x] 2.1 Add `classifyRefreshError(error: unknown): 'non-recoverable' | 'transient'` method to `TokenHealthMonitor` in `src/integrations/token-health-monitor.ts` that inspects HTTP status (400+invalid_grant → non-recoverable, 401 → non-recoverable, 5xx → transient, network error → transient)
- [x] 2.2 Add `consecutive_failures` column to `token_health` table via migration: `ALTER TABLE token_health ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0`
- [x] 2.3 Update `refreshExpiringTokens()` to use `classifyRefreshError`: on non-recoverable → mark revoked + create notification; on transient → retain status, increment `consecutive_failures`, log with userId + integrationType + error details
- [x] 2.4 Update `refreshExpiringTokens()` to also query tokens with status `expired` (not just `valid`/`expiring_soon`)
- [x] 2.5 Add 3-strike escalation: when `consecutive_failures` reaches 3, mark token as `revoked` and create reconnection notification via `TokenHealthNotificationService`
- [x] 2.6 Reset `consecutive_failures` to 0 on successful refresh in `refreshExpiringTokens()`

## Task 3: Update OAuth service for proactive refresh and offline access
- [x] 3.1 In `GoogleContactsOAuthService.getAccessToken()`, change the pre-expiry refresh window from 5 minutes to 10 minutes
- [x] 3.2 In `GoogleContactsOAuthService.handleCallback()`, add warning log and `TokenHealthNotificationService.createNotification` call when `credentials.refresh_token` is missing from callback response
- [x] 3.3 Verify `getAuthorizationUrl` in `google-contacts-config.ts` already includes `access_type: 'offline'` and `prompt: 'consent'` (already present — add unit test to lock this in)

## Task 4: Update banner display logic to gate on revoked status
- [x] 4.1 In `GracefulDegradationService.checkSyncAvailability()`, change to only treat `revoked` status as `invalid_token` (not `expired`)
- [x] 4.2 In `GracefulDegradationService.getSyncStatus()`, add `tokenStatus` field to the return type and populate it from `TokenHealthMonitor.getTokenHealth()`
- [x] 4.3 In `GracefulDegradationService.getComprehensiveSyncHealth()`, include `tokenStatus` in each integration's response
- [x] 4.4 In `SyncWarningBanner.checkSyncHealth()` (sync-warning-banner.js), read `tokenStatus` from health response and only show reconnection banner when `tokenStatus === 'revoked'`; hide banner for `expired` and `expiring_soon`
- [x] 4.5 In `SyncWarningBanner.handleReconnect()`, after OAuth callback completes, poll health endpoint every 1 second for up to 5 seconds and hide banner when `tokenStatus` changes from `revoked`

## Task 5: Update comprehensive-health endpoint to trigger refresh
- [x] 5.1 In `src/api/routes/google-contacts-sync.ts` `comprehensive-health` handler, call `tokenHealthMonitor.checkTokenHealth(userId, 'google_contacts')` and `tokenHealthMonitor.checkTokenHealth(userId, 'google_calendar')` before calling `getComprehensiveSyncHealth()` to trigger refresh for expired tokens
- [x] 5.2 Wrap the refresh calls in try/catch so endpoint still returns pre-refresh status on failure

## Task 6: Write property-based and unit tests
- [x] 6.1 Write property test for P1 (header offset calculation) — generate random banner heights, verify offset ≥ bannerHeight + 8 when visible, exactly 20 when hidden
- [x] 6.2 Write property test for P2 (10-min refresh window) — generate random expiry timestamps, verify refresh triggered iff within 10 minutes
- [x] 6.3 Write property test for P9 (error classifier) — generate random HTTP statuses and error bodies, verify classification correctness
- [x] 6.4 Write property test for P6 (transient failure preserves status) — generate random transient errors with random initial statuses, verify status unchanged and consecutive_failures incremented
- [x] 6.5 Write property test for P7 (banner gated on revoked) — generate all four status values with random health payloads, verify reconnection shown iff revoked
- [x] 6.6 Write property test for P10 (3-strike escalation) — generate failure sequences of length 1–5, verify revoked after exactly 3
- [x] 6.7 Write property test for P11 (health response consistency) — generate random token statuses, verify available/requiresReauth/tokenStatus field consistency
- [x] 6.8 Write unit tests for examples: z-index values, OAuth URL params, missing refresh token warning, health endpoint triggers refresh, default position when hidden
- [x] 6.9 Create `tests/html/sync-warning-banner.html` manual UI test file for visual verification of banner/header layering and responsive behavior
