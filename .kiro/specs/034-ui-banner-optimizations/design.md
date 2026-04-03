# Design Document: UI Banner Optimizations & Proactive Token Refresh

## Overview

This feature addresses two interrelated problems:

1. **Banner/Header z-index conflict**: The sync warning banner (`z-index: 9999`) overlaps with the theme toggle and notification bell. The current CSS fix (`z-index: 10000 !important` on header controls, plus JS-based repositioning in `adjustTopButtonsForBanner`) is fragile — it relies on hardcoded pixel offsets and `!important` overrides that break when banner height changes (e.g., on mobile).

2. **Unnecessary reconnection banners**: The `TokenHealthMonitor.refreshExpiringTokens()` currently marks any failed refresh as "revoked" without distinguishing transient errors (network timeouts, 5xx) from permanent failures (`invalid_grant`, 401). The `checkSyncAvailability` method in `GracefulDegradationService` treats both "expired" and "revoked" as `invalid_token`, causing the banner to show even when a background refresh could recover the token.

The solution: fix the CSS stacking context so header controls always render above the banner, implement robust error-classified token refresh, and gate the reconnection banner on `revoked` status only.

## Architecture

```mermaid
graph TD
    subgraph Frontend
        A[sync-warning-banner.js] -->|polls| B[/api/contacts/sync/comprehensive-health]
        A -->|reads tokenStatus| C{tokenStatus === revoked?}
        C -->|yes| D[Show reconnection banner]
        C -->|no| E[Hide banner]
        F[sync-warning-banner.css] -->|z-index: 900| A
        G[app-shell.css] -->|z-index: 1000| H[Header Controls]
        I[notification-center.js] -->|adjustTopButtonsForBanner| H
    end

    subgraph Backend
        B --> J[GracefulDegradationService]
        J --> K[TokenHealthMonitor]
        K -->|refresh attempt| L[GoogleContactsOAuthService]
        L -->|refreshToken call| M[Google OAuth API]
        M -->|error response| N{Error classifier}
        N -->|invalid_grant / 401| O[Mark revoked]
        N -->|5xx / timeout| P[Retain status, retry later]
        N -->|success| Q[Update to valid]
        K --> R[OAuth Repository]
        K --> S[TokenHealthNotificationService]
    end
```

### Key Design Decisions

1. **CSS-only z-index fix over JS manipulation**: Rather than computing banner heights in JS and setting inline styles, we use a simple z-index hierarchy: banner at `z-index: 900`, header controls at `z-index: 1000`. The JS `adjustTopButtonsForBanner` function handles vertical repositioning using `banner.offsetHeight` which already works correctly — we just need the z-index to ensure controls are always clickable even during layout transitions.

2. **Error classification in TokenHealthMonitor**: Instead of a blanket catch-all that marks tokens as revoked, we inspect the HTTP status and error body from Google's token endpoint. This is a standard OAuth 2.0 pattern — Google documents `invalid_grant` as the signal for revoked/expired refresh tokens.

3. **Transient retry counter with 3-strike limit**: A new `consecutive_failures` column in `token_health` tracks transient failures. After 3 consecutive transient failures, we escalate to "revoked" to avoid infinite silent retries.

4. **Health endpoint triggers refresh before responding**: The `comprehensive-health` endpoint calls `refreshExpiringTokens` for the requesting user before returning status, ensuring the frontend always gets the post-refresh state.

## Components and Interfaces

### Frontend Changes

#### `public/css/sync-warning-banner.css`
- Change `.sync-warning-banner` z-index from `9999` to `900`

#### `public/css/app-shell.css`
- Remove `!important` from header control z-index overrides
- Set `.theme-toggle` and `#notification-bell-fixed` z-index to `1000`
- Update `body.sync-warning-visible` rules to use dynamic offset via CSS custom property `--banner-height`
- Add mobile-specific offset for taller stacked banner

#### `public/js/notification-center.js` — `adjustTopButtonsForBanner()`
- Set `--banner-height` CSS custom property on `document.documentElement` when banner is visible
- Ensure minimum 8px gap between banner bottom and header controls
- Reset to default `20px` top when banner is hidden

#### `public/js/sync-warning-banner.js` — `checkSyncHealth()` / `showWarning()`
- Read `tokenStatus` field from health response
- Only show reconnection prompt when `tokenStatus === 'revoked'`
- Hide banner when status is `expired` or `expiring_soon` (background refresh handles these)
- After OAuth reconnection callback, poll health endpoint and hide banner within 5 seconds

### Backend Changes

#### `src/integrations/token-health-monitor.ts` — `refreshExpiringTokens()`
- Add error classification logic:
  - HTTP 400 with `invalid_grant` → mark `revoked`
  - HTTP 401 → mark `revoked`
  - HTTP 5xx or network error → retain current status, increment `consecutive_failures`
- Add `consecutive_failures` tracking (3 consecutive transient failures → escalate to `revoked`)
- Also attempt refresh for tokens with status `expired` (not just `valid`/`expiring_soon`)

#### `src/integrations/token-health-monitor.ts` — `checkTokenHealth()`
- When token is within 10 minutes of expiry, attempt proactive refresh before classifying

#### `src/integrations/google-contacts-oauth-service.ts` — `handleCallback()`
- Log warning if `credentials.refresh_token` is missing from callback response
- Flag token as requiring re-authentication via `TokenHealthNotificationService` when no refresh token received

#### `src/integrations/google-contacts-oauth-service.ts` — `getAccessToken()`
- Change the pre-expiry refresh window from 5 minutes to 10 minutes to match Requirement 2.1

#### `src/integrations/graceful-degradation-service.ts`
- `checkSyncAvailability()`: Only treat `revoked` as `invalid_token`; `expired` with a valid refresh token is recoverable
- `getSyncStatus()`: Include `tokenStatus` field in response
- `getComprehensiveSyncHealth()`: Include `tokenStatus` per integration; trigger user-specific token refresh before returning

#### `src/api/routes/google-contacts-sync.ts` — `comprehensive-health` endpoint
- Call `tokenHealthMonitor.refreshExpiringTokens()` scoped to the requesting user before building the response

### Interface Changes

Updated comprehensive health response shape:

```typescript
interface IntegrationHealth {
  available: boolean;
  reason?: string;
  lastSuccessfulSync: Date | null;
  requiresReauth: boolean;
  reauthUrl?: string;
  tokenStatus: 'valid' | 'expiring_soon' | 'expired' | 'revoked';  // NEW
}

interface ComprehensiveHealth {
  contacts: IntegrationHealth;
  calendar: IntegrationHealth;
}
```

## Data Models

### Existing Tables (Modified)

#### `token_health` — add column
```sql
ALTER TABLE token_health ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0;
```

This column tracks transient refresh failures. Reset to `0` on successful refresh. When it reaches `3`, the token is escalated to `revoked`.

### Existing Tables (Unchanged)

#### `oauth_tokens`
No schema changes. Already stores `access_token`, `refresh_token`, `expires_at` (encrypted at rest).

#### `token_health`
Existing columns: `user_id`, `integration_type`, `status` (valid/expiring_soon/expired/revoked), `expiry_date`, `last_checked_at`, `error_message`.

#### `token_health_notifications`
No schema changes. Used by `TokenHealthNotificationService` to create reconnection notifications when tokens are marked revoked.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Header control offset accounts for banner height

*For any* banner height (including 0 when hidden), the computed `top` position of header controls returned by `adjustTopButtonsForBanner` should be `max(bannerHeight + 8, 20)` when the banner is visible, and exactly `20` when the banner is hidden.

**Validates: Requirements 1.3, 1.4, 1.5**

### Property 2: Proactive refresh within 10-minute expiry window

*For any* token with an expiry time, calling `getAccessToken` should trigger a refresh when the token expires within 10 minutes of the current time, and should return the existing token without refreshing when the expiry is more than 10 minutes away.

**Validates: Requirements 2.1**

### Property 3: Background refresh attempts all eligible tokens

*For any* set of tokens in the `token_health` table with status `expiring_soon` or `expired` that have a valid refresh token in `oauth_tokens`, `refreshExpiringTokens` should attempt a refresh for every such token.

**Validates: Requirements 2.2**

### Property 4: Successful refresh updates status to valid

*For any* token where the refresh operation succeeds, the resulting token health status should be `valid` and the expiry date should be updated to the new value from the refresh response.

**Validates: Requirements 2.3**

### Property 5: Non-recoverable refresh failure marks token as revoked

*For any* token refresh that fails with a non-recoverable error (HTTP 400 with `invalid_grant`, or HTTP 401), the token health status should be set to `revoked` and a reconnection notification should be created via `TokenHealthNotificationService`.

**Validates: Requirements 2.4, 5.1, 5.2**

### Property 6: Transient refresh failure preserves token status

*For any* token refresh that fails with a transient error (HTTP 5xx or network timeout), the token health status should remain unchanged from its pre-refresh value, and the `consecutive_failures` counter should increment by 1.

**Validates: Requirements 2.5, 5.3**

### Property 7: Banner reconnection prompt gated on revoked status

*For any* token status value in `{valid, expiring_soon, expired, revoked}`, the sync warning banner should display a reconnection prompt if and only if the status is `revoked`. For all other statuses, the banner should either be hidden or show a non-reconnection message.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 8: OAuth callback persists refresh token

*For any* OAuth callback response that includes a refresh token, calling `handleCallback` should result in the refresh token being stored in the `oauth_tokens` table for that user and provider.

**Validates: Requirements 4.3**

### Property 9: Error classifier correctness

*For any* error response from Google's token endpoint, the error classifier should map HTTP 400 with `invalid_grant` body to `non-recoverable`, HTTP 401 to `non-recoverable`, HTTP 5xx to `transient`, and network timeouts to `transient`. No other classification should be produced for these error types.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 10: Three consecutive transient failures escalate to revoked

*For any* token, if `consecutive_failures` reaches 3 due to transient errors, the token status should be set to `revoked` and a reconnection notification should be created. If `consecutive_failures` is less than 3, the status should remain unchanged.

**Validates: Requirements 5.5**

### Property 11: Health endpoint response reflects post-refresh token state

*For any* call to the comprehensive-health endpoint, the response `tokenStatus` field should be one of `{valid, expiring_soon, expired, revoked}`, and the `available` and `requiresReauth` fields should be consistent: `available === true` and `requiresReauth === false` when `tokenStatus` is `valid` or `expiring_soon`, and `available === false` and `requiresReauth === true` when `tokenStatus` is `revoked`.

**Validates: Requirements 6.2, 6.3, 6.4**

## Error Handling

### Frontend
- **Health endpoint failure**: If `/api/contacts/sync/comprehensive-health` returns a non-200 response or network error, the banner remains in its current state (no change). Logged to console.
- **OAuth reconnection failure**: If the reconnection flow fails, the banner remains visible with the reconnection prompt. User can retry.

### Backend — Token Refresh Errors
| Error Type | HTTP Status | Action |
|---|---|---|
| `invalid_grant` | 400 | Mark `revoked`, create notification |
| Unauthorized | 401 | Mark `revoked`, create notification |
| Server error | 5xx | Retain status, increment `consecutive_failures`, log with userId + integrationType + error details |
| Network timeout | N/A | Retain status, increment `consecutive_failures`, log |
| 3rd consecutive transient | Any transient | Escalate to `revoked`, create notification |

### Backend — Health Endpoint Errors
- If `refreshExpiringTokens` throws during the health check, the endpoint catches the error and returns the pre-refresh status (safe fallback).
- If the database is unreachable, return `available: true` as a safe default (existing behavior in `GracefulDegradationService`).

### Backend — OAuth Callback Errors
- Missing refresh token in callback: Log warning, flag token via `TokenHealthNotificationService.createNotification` with `token_invalid` type.
- Failed token exchange: Throw error, OAuth flow fails, user sees error page.

## Testing Strategy

### Property-Based Tests (fast-check)

Each correctness property maps to a single property-based test with minimum 100 iterations. Tests use `fast-check` as specified in the project testing conventions.

| Property | Test File | What's Generated |
|---|---|---|
| P1: Header offset | `public/js/sync-warning-banner.test.ts` | Random banner heights (0–500px) |
| P2: 10-min refresh window | `src/integrations/google-contacts-oauth-service.test.ts` | Random expiry timestamps relative to now |
| P3: Eligible token refresh | `src/integrations/token-health-monitor.test.ts` | Random sets of token health rows with varying statuses and refresh token presence |
| P4: Successful refresh → valid | `src/integrations/token-health-monitor.test.ts` | Random token+expiry pairs with mocked successful refresh |
| P5: Non-recoverable → revoked | `src/integrations/token-health-monitor.test.ts` | Random non-recoverable error types (400+invalid_grant, 401) |
| P6: Transient → preserve status | `src/integrations/token-health-monitor.test.ts` | Random transient error types (5xx codes, timeouts) with random initial statuses |
| P7: Banner gated on revoked | `public/js/sync-warning-banner.test.ts` | All four token status values with random health payloads |
| P8: Callback persists refresh token | `src/integrations/google-contacts-oauth-service.test.ts` | Random credential objects with/without refresh tokens |
| P9: Error classifier | `src/integrations/token-health-monitor.test.ts` | Random HTTP status codes and error bodies |
| P10: 3-strike escalation | `src/integrations/token-health-monitor.test.ts` | Random sequences of transient failures (length 1–5) |
| P11: Health response consistency | `src/integrations/graceful-degradation-service.test.ts` | Random token statuses, verify response field consistency |

Each test must be tagged with a comment:
```typescript
// Feature: 034-ui-banner-optimizations, Property {N}: {property_text}
```

### Unit Tests (Vitest)

- **Example: z-index values** (Req 1.2): Assert banner CSS z-index < header controls z-index
- **Example: Default position when hidden** (Req 1.4): Assert header controls top is 20px when no banner
- **Example: OAuth URL parameters** (Req 4.1, 4.2): Assert `access_type=offline` and `prompt=consent` in generated URL
- **Example: Missing refresh token warning** (Req 4.4): Assert warning logged and notification created when callback lacks refresh token
- **Example: Health endpoint triggers refresh** (Req 6.1): Assert `refreshExpiringTokens` called before response
- **Example: Transient error logging** (Req 5.4): Assert log contains userId, integrationType, error details
- **Edge case: Banner hidden for expired+refresh_token** (Req 3.2): Specific scenario test
- **Edge case: Banner hidden for expiring_soon** (Req 3.3): Specific scenario test

### Manual UI Tests

A test file `tests/html/sync-warning-banner.html` for visual verification of:
- Banner/header control z-index layering
- Vertical repositioning when banner appears/disappears
- Mobile responsive stacking at ≤768px viewport
- Dark mode banner variants
