# Design Document

## Overview

The Google Sync Optimization feature transforms the current reactive sync system into an intelligent, resource-efficient architecture. By implementing token health monitoring, circuit breaker patterns, adaptive scheduling, and webhook-based push notifications, we reduce unnecessary API calls by an estimated 70-90% while improving reliability and user experience.

The design integrates seamlessly with existing services (`GoogleContactsSyncService`, `GoogleCalendarService`, `SyncStateRepository`, `OAuthRepository`) and adds new components for health monitoring, circuit breaking, and admin oversight.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Sync Orchestration Layer                 │
│  ┌──────────────────┐  ┌───────────────────────────────┐   │
│  │ Token Health     │  │ Circuit Breaker Manager       │   │
│  │ Monitor          │  │ (per user, per integration)   │   │
│  └──────────────────┘  └───────────────────────────────┘   │
│  ┌──────────────────┐  ┌───────────────────────────────┐   │
│  │ Adaptive Sync    │  │ Webhook Manager               │   │
│  │ Scheduler        │  │ (Calendar push notifications) │   │
│  └──────────────────┘  └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Existing Sync Services                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GoogleContactsSyncService (incremental + full sync)  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GoogleCalendarService (event fetching + caching)     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Persistence                        │
│  ┌──────────────────┐  ┌───────────────────────────────┐   │
│  │ OAuth Repository │  │ Sync State Repository         │   │
│  │ (tokens)         │  │ (sync tokens, timestamps)     │   │
│  └──────────────────┘  └───────────────────────────────┘   │
│  ┌──────────────────┐  ┌───────────────────────────────┐   │
│  │ Circuit Breaker  │  │ Webhook State Repository      │   │
│  │ Repository       │  │ (channel IDs, expiry)         │   │
│  └──────────────────┘  └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
1. Scheduled Sync Job Triggered
   ↓
2. Token Health Monitor validates token
   ├─ Valid → Continue
   ├─ Expiring Soon → Proactive refresh
   └─ Invalid → Skip sync, notify user
   ↓
3. Circuit Breaker checks state
   ├─ Closed → Allow sync
   ├─ Open → Skip sync (backoff period)
   └─ Half-Open → Try sync (test recovery)
   ↓
4. Adaptive Scheduler determines frequency
   ├─ No changes detected → Reduce frequency
   └─ Changes detected → Restore default frequency
   ↓
5. Execute Sync (Contacts or Calendar)
   ├─ Success → Reset circuit breaker, update metrics
   └─ Failure → Increment failure count, apply backoff
   ↓
6. Webhook Manager (Calendar only)
   ├─ Push notification received → Immediate incremental sync
   └─ Webhook expiring → Renew subscription
```

## Components and Interfaces

### 1. Token Health Monitor

**Purpose**: Proactively validate OAuth tokens before sync attempts to prevent wasted API calls.

**Location**: `src/integrations/token-health-monitor.ts`

**Interface**:
```typescript
interface TokenHealth {
  userId: string;
  integrationType: 'google_contacts' | 'google_calendar';
  status: 'valid' | 'expiring_soon' | 'expired' | 'revoked' | 'unknown';
  lastChecked: Date;
  expiryDate: Date | null;
  errorMessage: string | null;
}

class TokenHealthMonitor {
  /**
   * Check token health before sync
   * Returns token status and triggers refresh if needed
   */
  async checkTokenHealth(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<TokenHealth>;

  /**
   * Proactively refresh tokens expiring within 48 hours
   * Runs every 6 hours via cron job
   */
  async refreshExpiringTokens(): Promise<{
    refreshed: number;
    failed: number;
  }>;

  /**
   * Mark token as invalid (called when API returns 401/invalid_grant)
   */
  async markTokenInvalid(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar',
    reason: string
  ): Promise<void>;

  /**
   * Get token health status
   */
  async getTokenHealth(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<TokenHealth | null>;
}
```

**Integration Points**:
- Hooks into existing `OAuthRepository` for token retrieval
- Calls `GoogleContactsOAuthService.refreshAccessToken()` for refresh
- Emits events for notification service when tokens become invalid

### 2. Circuit Breaker Manager

**Purpose**: Prevent repeated failed sync attempts by implementing circuit breaker pattern.

**Location**: `src/integrations/circuit-breaker-manager.ts`

**Interface**:
```typescript
interface CircuitBreakerState {
  userId: string;
  integrationType: 'google_contacts' | 'google_calendar';
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailureAt: Date | null;
  openedAt: Date | null;
  nextRetryAt: Date | null;
}

interface CircuitBreakerConfig {
  failureThreshold: number;      // 3 failures to open
  openDuration: number;           // 1 hour in ms
  halfOpenMaxAttempts: number;    // 1 attempt in half-open
}

class CircuitBreakerManager {
  /**
   * Check if sync should be allowed
   */
  async canExecuteSync(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<boolean>;

  /**
   * Record sync success (resets circuit breaker)
   */
  async recordSuccess(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<void>;

  /**
   * Record sync failure (increments failure count, may open circuit)
   */
  async recordFailure(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar',
    error: Error
  ): Promise<void>;

  /**
   * Get current circuit breaker state
   */
  async getState(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<CircuitBreakerState>;

  /**
   * Manually reset circuit breaker (admin action or user re-auth)
   */
  async reset(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<void>;
}
```

**State Transitions**:
- **Closed → Open**: After 3 consecutive failures
- **Open → Half-Open**: After 1 hour of being open
- **Half-Open → Closed**: After 1 successful sync
- **Half-Open → Open**: After any failure

**Integration Points**:
- Wraps existing sync service calls
- Stores state in new `circuit_breaker_state` table
- Logs all state transitions for monitoring

### 3. Adaptive Sync Scheduler

**Purpose**: Dynamically adjust sync frequency based on data change patterns.

**Location**: `src/integrations/adaptive-sync-scheduler.ts`

**Interface**:
```typescript
interface SyncSchedule {
  userId: string;
  integrationType: 'google_contacts' | 'google_calendar';
  currentFrequency: number;        // in milliseconds
  defaultFrequency: number;        // base frequency
  minFrequency: number;            // minimum allowed
  maxFrequency: number;            // maximum allowed
  consecutiveNoChanges: number;    // counter for adaptive logic
  lastSyncAt: Date | null;
  nextSyncAt: Date;
}

class AdaptiveSyncScheduler {
  /**
   * Calculate next sync time based on change detection
   */
  async calculateNextSync(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar',
    changesDetected: boolean
  ): Promise<Date>;

  /**
   * Get current sync schedule
   */
  async getSchedule(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<SyncSchedule>;

  /**
   * Reset to default frequency (after changes detected)
   */
  async resetToDefault(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<void>;

  /**
   * Get all users due for sync
   */
  async getUsersDueForSync(
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<string[]>;
}
```

**Frequency Configuration**:
```typescript
const SYNC_FREQUENCIES = {
  contacts: {
    default: 3 * 24 * 60 * 60 * 1000,  // 3 days
    min: 7 * 24 * 60 * 60 * 1000,      // 7 days
    max: 1 * 24 * 60 * 60 * 1000,      // 1 day
  },
  calendar: {
    default: 4 * 60 * 60 * 1000,       // 4 hours (with webhooks)
    min: 4 * 60 * 60 * 1000,           // 4 hours
    max: 1 * 60 * 60 * 1000,           // 1 hour
    webhookFallback: 8 * 60 * 60 * 1000, // 8 hours (when webhook active)
  },
};
```

**Adaptive Logic**:
- After 5 consecutive syncs with no changes: Reduce frequency by 50%
- When changes detected: Restore to default frequency
- Never go below minimum or above maximum

**Integration Points**:
- Replaces fixed cron schedules with dynamic scheduling
- Reads change detection from `SyncResult` returned by sync services
- Updates `sync_schedule` table after each sync

### 4. Webhook Manager (Calendar Only)

**Purpose**: Register and manage Google Calendar push notifications to replace polling.

**Location**: `src/integrations/calendar-webhook-manager.ts`

**Interface**:
```typescript
interface WebhookSubscription {
  userId: string;
  channelId: string;
  resourceId: string;
  resourceUri: string;
  expiration: Date;
  token: string;  // Verification token
  createdAt: Date;
}

class CalendarWebhookManager {
  /**
   * Register webhook for user's calendars
   */
  async registerWebhook(
    userId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<WebhookSubscription>;

  /**
   * Handle incoming webhook notification
   */
  async handleWebhookNotification(
    channelId: string,
    resourceId: string,
    resourceState: string
  ): Promise<void>;

  /**
   * Renew webhook before expiration
   * Runs daily to check for expiring webhooks (within 24 hours)
   */
  async renewExpiringWebhooks(): Promise<{
    renewed: number;
    failed: number;
  }>;

  /**
   * Stop webhook (user disconnects calendar)
   */
  async stopWebhook(
    userId: string
  ): Promise<void>;

  /**
   * Get webhook subscription status
   */
  async getWebhookStatus(
    userId: string
  ): Promise<WebhookSubscription | null>;
}
```

**Webhook Flow**:
1. User connects Google Calendar → Register webhook
2. Google sends sync notification → Ignore (just confirms registration)
3. Calendar changes → Google sends exists notification
4. Webhook handler validates channel_id and resource_id
5. Trigger immediate incremental sync for that user
6. Adaptive scheduler reduces polling to 8-hour fallback

**Integration Points**:
- Calls Google Calendar API `watch` endpoint
- Stores webhook state in `calendar_webhook_subscriptions` table
- Triggers `CalendarService.forceRefreshCalendarEvents()` on notification
- Requires new API endpoint: `POST /api/webhooks/calendar`

### 5. Sync Health Dashboard

**Purpose**: Admin interface for monitoring sync health across all users.

**Location**: `public/admin/sync-health.html` + `src/api/routes/admin-sync-health.ts`

**Interface**:
```typescript
interface SyncHealthMetrics {
  totalUsers: number;
  activeIntegrations: {
    contacts: number;
    calendar: number;
  };
  invalidTokens: {
    contacts: number;
    calendar: number;
  };
  openCircuitBreakers: {
    contacts: number;
    calendar: number;
  };
  syncSuccessRate24h: {
    contacts: number;  // percentage
    calendar: number;  // percentage
  };
  apiCallsSaved: {
    byCircuitBreaker: number;
    byAdaptiveScheduling: number;
    byWebhooks: number;
    total: number;
  };
  persistentFailures: Array<{
    userId: string;
    email: string;
    integrationType: string;
    lastSuccessfulSync: Date | null;
    failureCount: number;
    lastError: string;
  }>;
}

class SyncHealthService {
  /**
   * Get comprehensive sync health metrics
   */
  async getHealthMetrics(
    integrationType?: 'google_contacts' | 'google_calendar'
  ): Promise<SyncHealthMetrics>;

  /**
   * Get detailed user sync status
   */
  async getUserSyncStatus(userId: string): Promise<{
    contacts: UserSyncStatus;
    calendar: UserSyncStatus;
  }>;
}

interface UserSyncStatus {
  tokenHealth: TokenHealth;
  circuitBreakerState: CircuitBreakerState;
  syncSchedule: SyncSchedule;
  lastSync: Date | null;
  lastSyncResult: 'success' | 'failure' | null;
  webhookActive: boolean;  // calendar only
}
```

**Dashboard Features**:
- Real-time metrics (auto-refresh every 5 minutes)
- Filter by integration type (Contacts, Calendar, or Both)
- List of users with persistent failures (>7 days)
- API call savings calculator
- Export metrics as CSV

**Integration Points**:
- Aggregates data from all new repositories
- Protected by admin middleware
- Accessible at `/admin/sync-health` (requires admin role)

### 6. Admin Role Management

**Purpose**: Secure access control for admin dashboard and tools.

**Location**: `src/middleware/admin-middleware.ts` + `scripts/promote-admin.ts`

**Interface**:
```typescript
// Middleware
async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void>;

// CLI Script
// Usage: npm run promote-admin -- user@example.com
async function promoteUserToAdmin(email: string): Promise<void>;
async function revokeAdminAccess(email: string): Promise<void>;
async function listAdmins(): Promise<Array<{ email: string; promotedAt: Date }>>;
```

**Database Schema**:
```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN admin_promoted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN admin_promoted_by VARCHAR(255);

CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;
```

**Integration Points**:
- Middleware checks JWT token + `is_admin` flag
- Logs all admin access attempts to audit log
- CLI script updates `users` table directly

## Data Models

### Token Health Table

```sql
CREATE TABLE token_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('valid', 'expiring_soon', 'expired', 'revoked', 'unknown')),
  last_checked TIMESTAMP NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

CREATE INDEX idx_token_health_user_integration ON token_health(user_id, integration_type);
CREATE INDEX idx_token_health_status ON token_health(status);
CREATE INDEX idx_token_health_expiring ON token_health(expiry_date) WHERE status = 'expiring_soon';
```

### Circuit Breaker State Table

```sql
CREATE TABLE circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  state VARCHAR(20) NOT NULL CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMP,
  last_failure_reason TEXT,
  opened_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

CREATE INDEX idx_circuit_breaker_user_integration ON circuit_breaker_state(user_id, integration_type);
CREATE INDEX idx_circuit_breaker_state ON circuit_breaker_state(state);
CREATE INDEX idx_circuit_breaker_next_retry ON circuit_breaker_state(next_retry_at) WHERE state = 'open';
```

### Sync Schedule Table

```sql
CREATE TABLE sync_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  current_frequency_ms BIGINT NOT NULL,
  default_frequency_ms BIGINT NOT NULL,
  min_frequency_ms BIGINT NOT NULL,
  max_frequency_ms BIGINT NOT NULL,
  consecutive_no_changes INTEGER NOT NULL DEFAULT 0,
  last_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

CREATE INDEX idx_sync_schedule_user_integration ON sync_schedule(user_id, integration_type);
CREATE INDEX idx_sync_schedule_next_sync ON sync_schedule(next_sync_at, integration_type);
```

### Calendar Webhook Subscriptions Table

```sql
CREATE TABLE calendar_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id VARCHAR(255) NOT NULL UNIQUE,
  resource_id VARCHAR(255) NOT NULL,
  resource_uri TEXT NOT NULL,
  expiration TIMESTAMP NOT NULL,
  token VARCHAR(255) NOT NULL,  -- Verification token
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_webhook_channel_id ON calendar_webhook_subscriptions(channel_id);
CREATE INDEX idx_webhook_expiration ON calendar_webhook_subscriptions(expiration);
CREATE INDEX idx_webhook_user_id ON calendar_webhook_subscriptions(user_id);
```

### Sync Metrics Table (for dashboard)

```sql
CREATE TABLE sync_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('full', 'incremental', 'webhook_triggered', 'manual')),
  result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'skipped')),
  skip_reason VARCHAR(50),  -- 'circuit_breaker_open', 'invalid_token', etc.
  duration_ms INTEGER,
  items_processed INTEGER,
  api_calls_made INTEGER,
  api_calls_saved INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_metrics_user_integration ON sync_metrics(user_id, integration_type);
CREATE INDEX idx_sync_metrics_created_at ON sync_metrics(created_at);
CREATE INDEX idx_sync_metrics_result ON sync_metrics(result);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

Before writing properties, let me identify and eliminate redundancy:

**Redundancy Analysis**:

1. **Token validation properties (1.1, 1.4)**: Property 1.1 tests that validation happens before API calls, while 1.4 tests that invalid tokens skip execution. These can be combined into one property about token validation preventing API calls.

2. **Circuit breaker state isolation (2.6) and logging (2.7)**: These are separate concerns - isolation is about correctness, logging is about observability. Keep both.

3. **Backoff calculation (3.1, 3.3)**: Property 3.1 tests exponential backoff calculation, while 3.3 tests the doubling pattern. These are the same property - exponential backoff means doubling.

4. **Frequency bounds (5.3, 5.5)**: Both test that frequency stays within bounds. Can be combined into one property about frequency constraints.

5. **Notification content (4.2, 4.6)**: Both test notification content requirements. Can be combined into one property about notification completeness.

6. **Dashboard metrics (10.1, 10.2, 10.3)**: All test metric accuracy. Can be combined into one property about metric correctness.

7. **Admin access control (11.2, 11.3)**: Both test access control logic. Can be combined into one property about role-based access.

**Properties to Write**:
- Token health validation prevents invalid API calls (combines 1.1, 1.4)
- Token expiry classification (1.2)
- Token error handling (1.3)
- Token health persistence (1.5)
- Token health event emission (1.6)
- Circuit breaker threshold (2.1)
- Circuit breaker blocks execution when open (2.2)
- Circuit breaker timeout transition (2.3)
- Circuit breaker recovery (2.4, 2.5 combined)
- Circuit breaker state isolation (2.6)
- Circuit breaker audit logging (2.7)
- Exponential backoff calculation (combines 3.1, 3.3)
- Backoff upper bound (3.4)
- Backoff reset on success (3.5)
- Backoff persistence (3.6)
- Notification creation on token failure (4.1)
- Notification completeness (combines 4.2, 4.6)
- Notification reminders (4.3)
- Notification cleanup (4.4)
- Adaptive frequency reduction (5.1)
- Adaptive frequency restoration (5.2)
- Frequency bounds enforcement (combines 5.3, 5.5)
- Frequency persistence (5.6)
- Manual sync isolation (5.7, 7.6 combined)
- Webhook registration on connection (6.1)
- Webhook notification handling (6.2)
- Webhook frequency adjustment (6.3)
- Webhook renewal (6.4)
- Webhook fallback (6.5)
- Webhook persistence (6.6)
- Webhook validation (6.7)
- Manual sync triggering (7.1)
- Manual sync circuit breaker bypass (7.2)
- Manual sync error handling (7.3)
- Manual sync rate limiting (7.4)
- Proactive token refresh (8.1)
- Token refresh success handling (8.3)
- Token refresh failure handling (8.4)
- Token refresh audit logging (8.5)
- Missing refresh token handling (8.6)
- Cached data availability (9.2)
- Cached data timestamps (9.4)
- Dashboard metric accuracy (combines 10.1, 10.2, 10.3, 10.4, 10.5)
- Dashboard persistent failures query (10.8)
- Admin role-based access control (combines 11.2, 11.3)
- Admin middleware authentication (11.6)
- Admin access audit logging (11.7)

### Correctness Properties

**Property 1: Token validation prevents invalid API calls**
*For any* sync job, if the token health status is "expired" or "revoked", then no API calls should be made to Google APIs and the sync should be skipped with appropriate logging.
**Validates: Requirements 1.1, 1.4**

**Property 2: Token expiry classification**
*For any* OAuth token with an expiry_date, if the expiry_date is within 24 hours of the current time, then the token health status should be marked as "expiring_soon".
**Validates: Requirements 1.2**

**Property 3: Token error handling**
*For any* API response with error code "invalid_grant", the token health status should be marked as "revoked" and the error message should be stored.
**Validates: Requirements 1.3**

**Property 4: Token health persistence**
*For any* token health check operation, the resulting status and timestamp should be persisted to the token_health table before the operation completes.
**Validates: Requirements 1.5**

**Property 5: Token health event emission**
*For any* token health status transition from "valid" to any invalid state ("expired", "revoked", "expiring_soon"), a token_health_changed event should be emitted with the user_id and integration_type.
**Validates: Requirements 1.6**

**Property 6: Circuit breaker threshold**
*For any* circuit breaker in "closed" state, after exactly 3 consecutive sync failures, the state should transition to "open" and next_retry_at should be set to 1 hour in the future.
**Validates: Requirements 2.1**

**Property 7: Circuit breaker blocks execution when open**
*For any* sync job, if the circuit breaker state is "open" and the current time is before next_retry_at, then the sync should not execute and should be marked as "skipped" with reason "circuit_breaker_open".
**Validates: Requirements 2.2**

**Property 8: Circuit breaker timeout transition**
*For any* circuit breaker in "open" state, when the current time reaches or exceeds next_retry_at, the state should transition to "half_open" on the next sync attempt.
**Validates: Requirements 2.3**

**Property 9: Circuit breaker recovery**
*For any* circuit breaker in "half_open" state, a successful sync should transition it to "closed" state and reset failure_count to 0, while a failed sync should transition it back to "open" state with a new next_retry_at.
**Validates: Requirements 2.4, 2.5**

**Property 10: Circuit breaker state isolation**
*For any* user with both Contacts and Calendar integrations, failures in one integration type should not affect the circuit breaker state of the other integration type.
**Validates: Requirements 2.6**

**Property 11: Circuit breaker audit logging**
*For any* circuit breaker state transition, a log entry should be created with the user_id, integration_type, old_state, new_state, and timestamp.
**Validates: Requirements 2.7**

**Property 12: Exponential backoff calculation**
*For any* sequence of consecutive sync failures, the delay between retries should double with each failure: 5 minutes, 10 minutes, 20 minutes, 40 minutes, etc.
**Validates: Requirements 3.1, 3.3**

**Property 13: Backoff upper bound**
*For any* backoff delay calculation, the resulting delay should never exceed 24 hours (1440 minutes), regardless of the number of consecutive failures.
**Validates: Requirements 3.4**

**Property 14: Backoff reset on success**
*For any* successful sync after one or more failures, the backoff delay should be reset to the default sync frequency for that integration type.
**Validates: Requirements 3.5**

**Property 15: Backoff persistence**
*For any* backoff delay calculation, the current backoff state (delay value and failure count) should be persisted to the sync_schedule table.
**Validates: Requirements 3.6**

**Property 16: Notification creation on token failure**
*For any* token health status change to "expired" or "revoked", a notification should be created for the user with type "token_invalid".
**Validates: Requirements 4.1**

**Property 17: Notification completeness**
*For any* token-related notification, it should include both a re-authentication link and the specific integration type affected (Contacts, Calendar, or both).
**Validates: Requirements 4.2, 4.6**

**Property 18: Notification reminders**
*For any* user with an unresolved token_invalid notification older than 7 days, a reminder notification should be created.
**Validates: Requirements 4.3**

**Property 19: Notification cleanup**
*For any* user who successfully re-authenticates, all token_invalid notifications for that integration type should be marked as resolved or deleted.
**Validates: Requirements 4.4**

**Property 20: Adaptive frequency reduction**
*For any* sync schedule, after exactly 5 consecutive syncs with no changes detected, the current_frequency_ms should be reduced by 50% (but not below min_frequency_ms).
**Validates: Requirements 5.1**

**Property 21: Adaptive frequency restoration**
*For any* sync that detects changes, the current_frequency_ms should be reset to default_frequency_ms.
**Validates: Requirements 5.2**

**Property 22: Frequency bounds enforcement**
*For any* sync schedule update, the current_frequency_ms should always be >= min_frequency_ms and <= max_frequency_ms.
**Validates: Requirements 5.3, 5.5**

**Property 23: Frequency persistence**
*For any* sync schedule frequency change, the new current_frequency_ms and consecutive_no_changes counter should be persisted to the sync_schedule table.
**Validates: Requirements 5.6**

**Property 24: Manual sync isolation**
*For any* manually triggered sync, the consecutive_no_changes counter and next_sync_at timestamp should remain unchanged.
**Validates: Requirements 5.7, 7.6**

**Property 25: Webhook registration on connection**
*For any* user who connects Google Calendar, a webhook subscription should be registered with Google Calendar API and stored in calendar_webhook_subscriptions table.
**Validates: Requirements 6.1**

**Property 26: Webhook notification handling**
*For any* valid webhook notification received (matching channel_id and resource_id), an immediate incremental sync should be triggered for that user.
**Validates: Requirements 6.2**

**Property 27: Webhook frequency adjustment**
*For any* active webhook subscription, the calendar sync polling frequency should be set to 8 hours (webhook fallback mode).
**Validates: Requirements 6.3**

**Property 28: Webhook renewal**
*For any* webhook subscription with expiration within 24 hours, a renewal request should be sent to Google Calendar API to extend the subscription.
**Validates: Requirements 6.4**

**Property 29: Webhook fallback**
*For any* failed webhook registration attempt, the calendar sync polling frequency should be set to 4 hours (normal polling mode).
**Validates: Requirements 6.5**

**Property 30: Webhook persistence**
*For any* successful webhook registration, the channel_id, resource_id, and expiration timestamp should be stored in calendar_webhook_subscriptions table.
**Validates: Requirements 6.6**

**Property 31: Webhook validation**
*For any* incoming webhook notification, if the channel_id or resource_id does not match a stored subscription, the notification should be rejected and logged.
**Validates: Requirements 6.7**

**Property 32: Manual sync triggering**
*For any* user-initiated "Sync Now" action, an immediate sync should be triggered regardless of the scheduled next_sync_at time.
**Validates: Requirements 7.1**

**Property 33: Manual sync circuit breaker bypass**
*For any* manually triggered sync, the sync should execute even if the circuit breaker is in "open" state.
**Validates: Requirements 7.2**

**Property 34: Manual sync error handling**
*For any* manually triggered sync that fails with an invalid token error, an error response should be returned containing a re-authentication link.
**Validates: Requirements 7.3**

**Property 35: Manual sync rate limiting**
*For any* user, manual sync requests should be rate-limited to a maximum of 1 request per minute per integration type.
**Validates: Requirements 7.4**

**Property 36: Proactive token refresh**
*For any* OAuth token with expiry_date within 48 hours, the Token_Refresh_Service should attempt to refresh it using the stored refresh_token.
**Validates: Requirements 8.1**

**Property 37: Token refresh success handling**
*For any* successful token refresh, the new access_token, refresh_token (if provided), and expiry_date should be updated in the oauth_tokens table.
**Validates: Requirements 8.3**

**Property 38: Token refresh failure handling**
*For any* failed token refresh attempt, the token health status should be marked as "revoked" and a notification should be created for the user.
**Validates: Requirements 8.4**

**Property 39: Token refresh audit logging**
*For any* token refresh attempt (success or failure), a log entry should be created with user_id, integration_type, outcome, and timestamp.
**Validates: Requirements 8.5**

**Property 40: Missing refresh token handling**
*For any* token refresh attempt where refresh_token is null or missing, the token health status should be marked as requiring re-authentication without attempting the refresh.
**Validates: Requirements 8.6**

**Property 41: Cached data availability**
*For any* data request when sync is unavailable (circuit breaker open or invalid token), the system should return cached data if available rather than failing the request.
**Validates: Requirements 9.2**

**Property 42: Cached data timestamps**
*For any* cached data returned to the user, it should include a last_updated or last_synced timestamp indicating when the data was last refreshed.
**Validates: Requirements 9.4**

**Property 43: Dashboard metric accuracy**
*For any* sync health dashboard query, the displayed metrics (total users, invalid tokens, open circuit breakers, success rate, API calls saved) should match the actual counts from the underlying database tables.
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

**Property 44: Dashboard persistent failures query**
*For any* sync health dashboard query for persistent failures, the returned list should include all users where the last successful sync was more than 7 days ago or null.
**Validates: Requirements 10.8**

**Property 45: Admin role-based access control**
*For any* request to /admin/sync-health, users with is_admin=true should receive the dashboard content, while users with is_admin=false should receive a 403 Forbidden response.
**Validates: Requirements 11.2, 11.3**

**Property 46: Admin middleware authentication**
*For any* request to an admin-protected endpoint, the middleware should verify both the JWT token validity and the is_admin flag before allowing access.
**Validates: Requirements 11.6**

**Property 47: Admin access audit logging**
*For any* access attempt to an admin-protected endpoint (success or failure), a log entry should be created with user_id, endpoint, outcome, and timestamp.
**Validates: Requirements 11.7**

## Error Handling

### Token Errors

**Invalid Grant (401)**:
- Mark token as "revoked" in token_health table
- Create user notification with re-auth link
- Skip all scheduled syncs until re-authentication
- Log error with user_id and integration_type

**Token Expired**:
- Attempt automatic refresh using refresh_token
- If refresh succeeds: Update tokens and continue
- If refresh fails: Mark as "revoked" and notify user
- Log all refresh attempts

**Missing Refresh Token**:
- Mark integration as requiring re-authentication
- Do not attempt refresh (will fail)
- Notify user immediately
- Log missing token event

### API Errors

**Rate Limit (429)**:
- Apply exponential backoff (existing behavior)
- Do NOT open circuit breaker (temporary error)
- Log rate limit event
- Retry with backoff

**Server Error (5xx)**:
- Increment circuit breaker failure count
- Apply exponential backoff
- Open circuit breaker after 3 failures
- Log error with details

**Network Timeout**:
- Treat as temporary failure
- Increment circuit breaker failure count
- Apply exponential backoff
- Log timeout event

### Webhook Errors

**Registration Failure**:
- Fall back to polling mode (4-hour frequency)
- Log registration failure
- Retry registration on next calendar connection
- Do not block user from using calendar features

**Invalid Webhook Notification**:
- Validate channel_id and resource_id
- Reject if not found in database
- Log invalid notification attempt (security)
- Do not trigger sync

**Webhook Expiration**:
- Proactive renewal 24 hours before expiry
- If renewal fails: Fall back to polling
- Log renewal attempts
- Continue service without interruption

### Circuit Breaker Errors

**Sync Blocked by Open Circuit**:
- Return "skipped" status
- Log skip reason
- Do not increment failure count
- Wait for timeout before retry

**Half-Open Sync Failure**:
- Immediately reopen circuit breaker
- Reset next_retry_at to 1 hour from now
- Log state transition
- Continue blocking syncs

## Testing Strategy

### Unit Tests

**Token Health Monitor**:
- Test token expiry classification (within 24h, within 48h, expired)
- Test error code mapping (invalid_grant → revoked)
- Test token validation before API calls
- Test event emission on status changes
- Test database persistence

**Circuit Breaker Manager**:
- Test state transitions (closed → open → half_open → closed)
- Test failure threshold (exactly 3 failures)
- Test timeout calculation (1 hour)
- Test state isolation per user and integration
- Test manual reset functionality

**Adaptive Sync Scheduler**:
- Test frequency reduction (after 5 no-change syncs)
- Test frequency restoration (on change detection)
- Test bounds enforcement (min/max frequencies)
- Test manual sync isolation
- Test next_sync_at calculation

**Webhook Manager**:
- Test webhook registration with Google API
- Test notification validation (channel_id, resource_id)
- Test renewal logic (24 hours before expiry)
- Test fallback to polling on failure
- Test webhook cleanup on disconnection

**Admin Middleware**:
- Test JWT validation
- Test is_admin flag checking
- Test 403 response for non-admins
- Test audit logging
- Test endpoint protection

### Property-Based Tests

Each correctness property should be implemented as a property-based test using fast-check:

**Example: Property 6 - Circuit Breaker Threshold**
```typescript
import * as fc from 'fast-check';

it('should open circuit breaker after exactly 3 failures', () => {
  fc.assert(
    fc.property(
      fc.uuid(),  // userId
      fc.constantFrom('google_contacts', 'google_calendar'),  // integrationType
      async (userId, integrationType) => {
        // Start with closed circuit breaker
        await circuitBreakerManager.reset(userId, integrationType);
        
        // Record 2 failures - should stay closed
        await circuitBreakerManager.recordFailure(userId, integrationType, new Error('Test'));
        await circuitBreakerManager.recordFailure(userId, integrationType, new Error('Test'));
        let state = await circuitBreakerManager.getState(userId, integrationType);
        expect(state.state).toBe('closed');
        
        // Record 3rd failure - should open
        await circuitBreakerManager.recordFailure(userId, integrationType, new Error('Test'));
        state = await circuitBreakerManager.getState(userId, integrationType);
        expect(state.state).toBe('open');
        expect(state.failureCount).toBe(3);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Example: Property 12 - Exponential Backoff**
```typescript
it('should double backoff delay with each failure', () => {
  fc.assert(
    fc.property(
      fc.uuid(),  // userId
      fc.constantFrom('google_contacts', 'google_calendar'),  // integrationType
      fc.integer({ min: 1, max: 10 }),  // number of failures
      async (userId, integrationType, failureCount) => {
        // Reset to default
        await adaptiveSyncScheduler.resetToDefault(userId, integrationType);
        
        // Simulate failures and check backoff
        let expectedDelay = 5 * 60 * 1000;  // 5 minutes in ms
        
        for (let i = 0; i < failureCount; i++) {
          const nextSync = await adaptiveSyncScheduler.calculateNextSync(
            userId,
            integrationType,
            false  // no changes
          );
          
          const actualDelay = nextSync.getTime() - Date.now();
          
          // Allow 1 second tolerance for timing
          expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - 1000);
          expect(actualDelay).toBeLessThanOrEqual(Math.min(expectedDelay + 1000, 24 * 60 * 60 * 1000));
          
          // Double for next iteration (capped at 24 hours)
          expectedDelay = Math.min(expectedDelay * 2, 24 * 60 * 60 * 1000);
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Example: Property 22 - Frequency Bounds**
```typescript
it('should enforce frequency bounds', () => {
  fc.assert(
    fc.property(
      fc.uuid(),  // userId
      fc.constantFrom('google_contacts', 'google_calendar'),  // integrationType
      fc.integer({ min: 0, max: 20 }),  // consecutive no-change syncs
      async (userId, integrationType, noChangeCount) => {
        // Get frequency config
        const config = integrationType === 'google_contacts' 
          ? SYNC_FREQUENCIES.contacts 
          : SYNC_FREQUENCIES.calendar;
        
        // Simulate no-change syncs
        for (let i = 0; i < noChangeCount; i++) {
          await adaptiveSyncScheduler.calculateNextSync(userId, integrationType, false);
        }
        
        // Check that frequency is within bounds
        const schedule = await adaptiveSyncScheduler.getSchedule(userId, integrationType);
        expect(schedule.currentFrequency).toBeGreaterThanOrEqual(config.min);
        expect(schedule.currentFrequency).toBeLessThanOrEqual(config.max);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Tests

**End-to-End Sync Flow**:
1. Set up test user with valid tokens
2. Trigger sync job
3. Verify token health check occurs first
4. Verify circuit breaker allows execution
5. Verify sync executes successfully
6. Verify metrics are recorded
7. Verify next_sync_at is calculated

**Token Expiry Flow**:
1. Set up test user with expiring token (within 48h)
2. Run token refresh job
3. Verify refresh attempt is made
4. Verify tokens are updated on success
5. Verify notification is created on failure

**Circuit Breaker Flow**:
1. Set up test user with valid tokens
2. Simulate 3 consecutive sync failures
3. Verify circuit breaker opens
4. Verify next sync is skipped
5. Wait for timeout (or mock time)
6. Verify circuit transitions to half_open
7. Simulate successful sync
8. Verify circuit closes

**Webhook Flow**:
1. Set up test user with calendar connection
2. Verify webhook is registered
3. Simulate webhook notification from Google
4. Verify sync is triggered
5. Verify polling frequency is reduced
6. Simulate webhook expiry
7. Verify renewal is attempted

### Manual Testing

**Admin Dashboard** (`tests/html/admin-sync-health.test.html`):
- Display all metrics correctly
- Filter by integration type
- Auto-refresh every 5 minutes
- Show persistent failures list
- Export metrics as CSV

**Token Health Monitoring**:
- Manually revoke token in Google account
- Verify sync is skipped
- Verify notification is created
- Verify dashboard shows invalid token

**Circuit Breaker**:
- Disconnect network to simulate failures
- Verify circuit opens after 3 failures
- Verify syncs are skipped
- Reconnect network
- Verify circuit recovers

**Adaptive Scheduling**:
- Monitor sync frequency over time
- Verify frequency reduces with no changes
- Make calendar changes
- Verify frequency restores to default

**Webhook Integration**:
- Connect Google Calendar
- Verify webhook is registered in database
- Make calendar change in Google
- Verify sync is triggered immediately
- Check logs for webhook notification

### Performance Testing

**Token Refresh Job**:
- Test with 1000 users with expiring tokens
- Verify job completes within 5 minutes
- Verify no rate limit errors
- Verify all tokens are refreshed

**Webhook Renewal Job**:
- Test with 1000 users with expiring webhooks
- Verify job completes within 10 minutes
- Verify all webhooks are renewed
- Verify no registration failures

**Dashboard Query Performance**:
- Test with 10,000 users
- Verify metrics query completes within 2 seconds
- Verify persistent failures query completes within 3 seconds
- Verify no database timeouts

**Sync Scheduler Performance**:
- Test with 10,000 users due for sync
- Verify scheduler identifies all users within 1 second
- Verify no memory issues
- Verify correct ordering by next_sync_at

## Deployment Considerations

### Database Migrations

**Migration Order**:
1. Add is_admin column to users table
2. Create token_health table
3. Create circuit_breaker_state table
4. Create sync_schedule table
5. Create calendar_webhook_subscriptions table
6. Create sync_metrics table
7. Add indexes for performance

**Data Migration**:
- Populate sync_schedule with default frequencies for existing users
- Initialize circuit_breaker_state as "closed" for all users
- Run initial token health check for all users
- No data loss or downtime required

### Backward Compatibility

**Existing Sync Jobs**:
- Wrap existing sync service calls with new orchestration layer
- Maintain existing sync logic (no changes to GoogleContactsSyncService or GoogleCalendarService)
- Add new checks before sync execution
- Preserve existing error handling

**API Compatibility**:
- No changes to existing API endpoints
- Add new admin endpoints (/admin/sync-health)
- Add new webhook endpoint (/api/webhooks/calendar)
- Maintain existing response formats

### Monitoring and Alerts

**Metrics to Track**:
- Token refresh success/failure rate
- Circuit breaker open count by integration
- Sync skip rate (circuit breaker, invalid token)
- Webhook registration success rate
- API calls saved (total and by optimization type)
- Average sync duration
- Dashboard query performance

**Alerts to Configure**:
- High token refresh failure rate (>10%)
- High circuit breaker open rate (>5% of users)
- Webhook renewal failure rate (>5%)
- Dashboard query timeout
- Sync job queue backlog (>1000 pending)

### Rollout Strategy

**Phase 1: Token Health Monitoring (Week 1)**
- Deploy token health monitor
- Run proactive refresh job
- Monitor token refresh success rate
- No impact on existing syncs

**Phase 2: Circuit Breaker (Week 2)**
- Deploy circuit breaker manager
- Wrap sync calls with circuit breaker
- Monitor circuit breaker state transitions
- Reduce failed API calls

**Phase 3: Adaptive Scheduling (Week 3)**
- Deploy adaptive sync scheduler
- Migrate existing cron jobs to dynamic scheduling
- Monitor frequency adjustments
- Reduce unnecessary syncs

**Phase 4: Webhooks (Week 4)**
- Deploy webhook manager
- Register webhooks for new calendar connections
- Gradually migrate existing users
- Monitor webhook notification handling

**Phase 5: Admin Dashboard (Week 5)**
- Deploy admin role management
- Deploy sync health dashboard
- Grant admin access to operations team
- Monitor dashboard usage

### Rollback Plan

**If Issues Arise**:
- Disable new orchestration layer via feature flag
- Fall back to existing sync jobs
- Preserve all collected metrics
- No data loss
- Resume optimization after fix

**Feature Flags**:
```typescript
const FEATURE_FLAGS = {
  TOKEN_HEALTH_MONITORING: true,
  CIRCUIT_BREAKER: true,
  ADAPTIVE_SCHEDULING: true,
  CALENDAR_WEBHOOKS: true,
  ADMIN_DASHBOARD: true,
};
```
