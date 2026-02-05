# Google Sync Optimization - Complete Summary

**Last Updated**: 2026-02-04 - Frequencies updated to reduce API usage by 70-85%

## Current Sync Cadence & Workflow

### Sync Frequencies

#### Google Contacts
- **Default**: Every 7 days (was 3 days)
- **Adaptive Range**: 1-30 days (was 1-7 days)
- **Onboarding**: Every 1 hour for first 24 hours after connection
- **Logic**: Reduces by 50% after 5 consecutive no-change syncs
- **Trigger**: Background job daily checks who's due for sync

#### Google Calendar  
- **Default**: Every 24 hours (was 4 hours)
- **Fallback**: Every 12 hours when webhook active (was 8 hours)
- **Adaptive Range**: 4-24 hours (was 1-4 hours)
- **Onboarding**: Every 2 hours for first 24 hours after connection
- **Webhook**: Real-time push notifications (expires after 7 days)
- **Trigger**: Webhook notifications OR background job daily

### Sync Workflow (Every Sync Follows This)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TOKEN HEALTH CHECK                                       │
│    - Check if token is valid/expired/revoked                │
│    - Skip sync if invalid → Save API call                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CIRCUIT BREAKER CHECK                                    │
│    - Check if circuit is open (3+ failures)                 │
│    - Skip sync if open → Save API call                      │
│    - Wait 1 hour before retry                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ADAPTIVE SCHEDULE CHECK                                  │
│    - Calculate next sync time based on change history       │
│    - Reduce frequency if no changes (5+ consecutive)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. EXECUTE SYNC                                             │
│    - Full sync (first time) or Incremental (subsequent)     │
│    - Fetch data from Google API                             │
│    - Process and store in database                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. RECORD RESULTS                                           │
│    - Update token health status                             │
│    - Update circuit breaker state                           │
│    - Update adaptive schedule                               │
│    - Record metrics (duration, items, API calls saved)      │
└─────────────────────────────────────────────────────────────┘
```

### Sync Triggers

| Trigger Type | Frequency | Applies To | Bypasses Circuit Breaker? |
|-------------|-----------|------------|---------------------------|
| **Scheduled Background** | Daily (checks who's due) | Both | No |
| **Webhook Push** | Real-time (when calendar changes) | Calendar only | No |
| **Manual User** | On-demand (rate limited: 1/min) | Both | Yes |
| **Token Refresh** | Daily | Both | N/A (maintenance) |
| **Webhook Renewal** | Daily | Calendar only | N/A (maintenance) |

### Background Maintenance Jobs

| Job | Frequency | Purpose | Implementation |
|-----|-----------|---------|----------------|
| **Token Refresh** | Daily | Refresh tokens expiring within 48 hours | `TokenHealthMonitor.refreshExpiringTokens()` |
| **Webhook Renewal** | Daily | Renew webhooks expiring within 24 hours | `CalendarWebhookManager.renewExpiringWebhooks()` |
| **Webhook Health Check** | Every 12 hours | Monitor webhook health, re-register broken webhooks | `WebhookHealthCheckProcessor` (task 28) |
| **Notification Reminders** | Daily | Send reminders for token issues >7 days | `TokenHealthNotificationService.sendReminders()` |
| **Adaptive Sync** | Daily | Execute syncs for users due for sync | `AdaptiveSyncScheduler.getUsersDueForSync()` |

### API Call Savings Breakdown

| Optimization Feature | Savings | How It Works |
|---------------------|---------|--------------|
| **Token Health Monitoring** | 5-10% | Skips syncs when token is invalid |
| **Circuit Breaker** | 5-10% | Blocks syncs after 3 failures for 1 hour |
| **Adaptive Scheduling** | 20-30% | Reduces frequency when no changes detected |
| **Calendar Webhooks** | 40-60% | Push notifications replace polling |
| **TOTAL** | **70-90%** | Combined effect of all optimizations |

### Circuit Breaker States

```
┌──────────┐
│  CLOSED  │ ← Normal operation, syncs allowed
└──────────┘
     │
     │ 3 consecutive failures
     ↓
┌──────────┐
│   OPEN   │ ← Syncs blocked, wait 1 hour
└──────────┘
     │
     │ After 1 hour timeout
     ↓
┌──────────┐
│ HALF-OPEN│ ← Testing recovery, allow 1 sync
└──────────┘
     │
     ├─ Success → CLOSED
     └─ Failure → OPEN
```

### Token Health States

| State | Meaning | Action |
|-------|---------|--------|
| **valid** | Token is active and working | No action needed |
| **expiring_soon** | Expires within 24 hours | System attempts proactive refresh |
| **expired** | Token has expired | User must re-authenticate |
| **revoked** | User revoked access | User must re-authenticate |
| **unknown** | Status cannot be determined | Temporary state during checks |

### Webhook Lifecycle (Calendar Only)

```
User Connects Calendar
        ↓
Register Webhook with Google
        ↓
Webhook Active (7 days)
        ↓
Calendar Changes → Google sends "exists" notification
        ↓
Trigger Immediate Incremental Sync
        ↓
Adaptive Scheduler reduces polling to 8-hour fallback
        ↓
24 hours before expiration → Renew Webhook
        ↓
Repeat cycle
```

### Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **token_health** | Track token validity | status, last_checked, expiry_date |
| **circuit_breaker_state** | Track failure patterns | state, failure_count, next_retry_at |
| **sync_schedule** | Track adaptive schedules | current_frequency_ms, consecutive_no_changes, next_sync_at |
| **calendar_webhook_subscriptions** | Track webhook registrations | channel_id, resource_id, expiration |
| **sync_metrics** | Record all sync operations | sync_type, result, duration_ms, api_calls_saved |

### Admin Dashboard Metrics

**Overview Metrics:**
- Total users with integrations
- Active integrations (Contacts/Calendar)
- Invalid tokens count
- Open circuit breakers count
- Sync success rate (24h)

**API Calls Saved:**
- By circuit breaker
- By adaptive scheduling
- By webhooks
- Total saved

**Persistent Failures:**
- Users with failures >7 days
- Email, integration, last success, error message

### Your Current Status

Based on database query:
- ✅ You have 1 sync metric recorded
- ✅ Last sync: Google Contacts, Full sync, Success
- ✅ Timestamp: 2026-02-03 05:21:05
- ✅ Admin status: Active

This means:
1. Your Google Contacts sync has run at least once
2. The sync was successful
3. Optimization tables are being populated
4. Dashboard should show data

### Testing the Admin Dashboard

**URL**: http://localhost:3000/admin/sync-health.html

**What You Should See:**
- Total Users: 1 (you)
- Active Integrations: Contacts: 1
- Invalid Tokens: 0 (if your token is still valid)
- Open Circuit Breakers: 0 (since last sync succeeded)
- Sync Success Rate: 100% (1 successful sync)
- API Calls Saved: 0 (first sync, no optimization yet)
- Persistent Failures: 0

**Next Sync:**
- Your next Contacts sync will be in ~3 days (default frequency)
- Unless you trigger a manual sync
- Or unless adaptive scheduling adjusts it

### Manual Sync Testing

To trigger a manual sync and see more data:

```bash
# Get your JWT token from browser console
# localStorage.getItem('token')

# Then run:
curl -X POST http://localhost:3000/api/sync/manual \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"integrationType": "google_contacts"}'
```

This will:
1. Trigger an immediate sync
2. Create a new sync_metrics record
3. Update the dashboard with fresh data
4. Show you how the system responds to manual triggers

### Key Files Reference

**Backend Services:**
- `src/integrations/sync-orchestrator.ts` - Main orchestration
- `src/integrations/token-health-monitor.ts` - Token validation
- `src/integrations/circuit-breaker-manager.ts` - Failure handling
- `src/integrations/adaptive-sync-scheduler.ts` - Frequency adjustment
- `src/integrations/calendar-webhook-manager.ts` - Webhook management

**Background Jobs:**
- `src/jobs/processors/google-contacts-sync-processor.ts` - Contacts sync
- `src/jobs/processors/calendar-sync-processor.ts` - Calendar sync
- `src/jobs/processors/token-refresh-processor.ts` - Token maintenance
- `src/jobs/processors/webhook-renewal-processor.ts` - Webhook maintenance

**Admin Dashboard:**
- `public/admin/sync-health.html` - Dashboard UI
- `public/js/sync-health-dashboard.js` - Dashboard logic
- `src/api/routes/admin-sync-health.ts` - Dashboard API

**Documentation:**
- `.kiro/steering/google-integrations.md` - Architecture (Section 4)
- `docs/features/google-integrations/ADMIN_GUIDE.md` - Admin guide
- `docs/features/google-integrations/MONITORING.md` - Monitoring guide
- `docs/testing/SYNC_OPTIMIZATION_LOCAL_TESTING.md` - Testing guide

### Common Scenarios

**Scenario 1: Token Expires**
1. Token health check detects expiration
2. Sync is skipped
3. Metrics record: `result: 'skipped', skip_reason: 'invalid_token'`
4. User receives notification to reconnect
5. Dashboard shows invalid token count increase

**Scenario 2: Sync Fails 3 Times**
1. First failure: Circuit breaker records failure (state: closed)
2. Second failure: Circuit breaker increments count (state: closed)
3. Third failure: Circuit breaker opens (state: open)
4. Next sync attempt: Skipped due to open circuit
5. After 1 hour: Circuit moves to half-open
6. Next sync: If succeeds → closed, if fails → open again

**Scenario 3: No Changes for 5 Syncs**
1. Sync 1: Changes detected, frequency stays at 3 days
2. Sync 2: No changes, counter = 1
3. Sync 3: No changes, counter = 2
4. Sync 4: No changes, counter = 3
5. Sync 5: No changes, counter = 4
6. Sync 6: No changes, counter = 5 → Frequency reduced to 6 days (50% increase)
7. Next sync with changes: Frequency restored to 3 days

**Scenario 4: Calendar Webhook Triggers Sync**
1. User creates calendar event in Google Calendar
2. Google sends webhook notification to `/api/webhooks/calendar`
3. Webhook handler validates channel_id and resource_id
4. Triggers immediate incremental sync
5. Sync executes (bypassing scheduled time)
6. Metrics record: `sync_type: 'webhook_triggered'`
7. Adaptive scheduler notes change, maintains default frequency

### Performance Expectations

**Sync Duration:**
- Contacts (incremental): 5-30 seconds
- Contacts (full): 30-120 seconds
- Calendar (incremental): 2-10 seconds
- Calendar (full): 10-30 seconds

**API Calls:**
- Without optimization: ~1000 calls/day (for 100 users)
- With optimization: ~100-300 calls/day (70-90% reduction)

**Database Impact:**
- Sync metrics table grows by ~10-50 rows/day per user
- Consider archiving old metrics after 90 days

### Monitoring Recommendations

**Daily:**
- Check sync success rate (should be >95%)
- Review invalid token count (should be <5% of users)
- Monitor open circuit breakers (should be <2% of users)

**Weekly:**
- Review API calls saved trends
- Analyze persistent failures
- Check webhook renewal success rate

**Monthly:**
- Export metrics for historical analysis
- Review token refresh success rate
- Audit admin access logs

---

## Ready to Test!

1. Open: http://localhost:3000/admin/sync-health.html
2. Follow: ADMIN_DASHBOARD_TEST_GUIDE.md
3. Report: Any issues or unexpected behavior

Your account is already set up as admin, and you have sync data to view!
