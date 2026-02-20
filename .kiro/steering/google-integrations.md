---
inclusion: manual
---

# Google Integrations Architecture

## Core Principles
- Read-only access to Google data (contacts, calendar) — NEVER write
- OAuth 2.0 with offline access for refresh tokens
- Tokens encrypted at rest, server-side only
- Graceful degradation if integration fails
- Rate limiting with exponential backoff

## 1. Google SSO

Scopes: `userinfo.email`, `userinfo.profile`, `openid`

Key files:
- `src/api/google-sso-service.ts` — OAuth flow, token exchange
- `src/api/oauth-state-manager.ts` — CSRF state tokens (JWT-based)
- `src/api/google-sso-error-handler.ts` — error handling, audit logging
- Routes: `src/api/routes/google-sso.ts`

Flow: Frontend → GET `/api/auth/google/authorize` → Google consent → callback exchanges code for tokens → creates/updates user → returns JWT session

## 2. Google Calendar

Scopes: `calendar.readonly`, `userinfo.email`, `userinfo.profile`

Key files:
- `src/calendar/calendar-service.ts` — listing, selection, free time detection
- `src/integrations/google-calendar-service.ts` — API client wrapper
- `src/calendar/calendar-repository.ts` — DB operations
- Routes: `src/api/routes/google-calendar-oauth.ts`, `src/api/routes/calendar-api.ts`

Features: multi-calendar selection, free time slot detection (gaps between events within working hours), event caching

## 3. Google Contacts

Scopes: `contacts.readonly`, `contacts.other.readonly` (READ-ONLY enforced in code)

Key files:
- `src/integrations/google-contacts-sync-service.ts` — full/incremental sync orchestration
- `src/integrations/google-contacts-client.ts` — read-only API wrapper (throws on write attempts)
- `src/contacts/import-service.ts` — data transformation, dedup, batch import
- `src/integrations/google-contacts-rate-limiter.ts` — per-user rate limiting
- Routes: `src/api/routes/google-contacts-oauth.ts`, `src/api/routes/google-contacts-sync.ts`

Rate limits: 60 req/min, 10K req/day per user, exponential backoff (1s→60s, 5 retries)

## 4. Sync Optimization

Reduces Google API usage by 70-90% through four components:

**TokenHealthMonitor** (`src/integrations/token-health-monitor.ts`): Validates tokens before sync, proactively refreshes within 48hrs. States: valid, expiring_soon, expired, revoked, unknown

**CircuitBreakerManager** (`src/integrations/circuit-breaker-manager.ts`): Per-user isolation. Closed → Open (3 failures, 1hr timeout) → Half-Open. Manual sync bypasses.

**AdaptiveSyncScheduler** (`src/integrations/adaptive-sync-scheduler.ts`): Contacts default 7d, Calendar 24hr. After 5 no-change syncs: reduce 50%. Onboarding (first 24hr): higher frequency.

**CalendarWebhookManager** (`src/integrations/calendar-webhook-manager.ts`): Push notifications replace polling. 7-day expiry, renewed 24hrs before. Fallback to polling on failure.

**SyncOrchestrator** (`src/integrations/sync-orchestrator.ts`): check token → circuit breaker → calculate next sync → execute → record metrics

Supporting: `sync-health-service.ts` (admin metrics), `webhook-metrics-service.ts`, `token-health-notification-service.ts`

**Background Jobs (Cloud Tasks)**: Token refresh, webhook renewal, notification reminders (daily); webhook health check (12hr); adaptive sync (daily)

**Admin Dashboard**: `/admin/sync-health.html`, `GET /api/admin/sync-health`, requires admin JWT. Promote: `npm run promote-admin -- promote user@example.com`

## Common Patterns

Token refresh before API calls (<5min expiry). Error handling: 401→refresh, 403→permissions, 429/5xx→backoff. Pagination via nextPageToken; streaming processes pages individually.
