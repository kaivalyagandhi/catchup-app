# Google Sync Optimization - Local Testing Guide

This guide walks you through testing all Google Sync Optimization features locally.

## Prerequisites

1. **Server Running**: `npm run dev` (should be running on http://localhost:3000)
2. **Database**: PostgreSQL with all migrations applied
3. **Redis**: Running for rate limiting
4. **Test User**: A user account with Google integrations (or create one)

## Testing Checklist

### 1. Database Schema Verification

First, verify all new tables exist:

```bash
# Connect to your database
psql -h localhost -U postgres -d catchup_db

# Check for new tables
\dt token_health
\dt circuit_breaker_state
\dt sync_schedule
\dt calendar_webhook_subscriptions
\dt sync_metrics

# Exit psql
\q
```

**Expected**: All 5 tables should exist.

---

### 2. Admin Role Setup

Test the admin promotion script:

```bash
# Promote a user to admin (replace with your email)
npm run promote-admin -- your-email@example.com promote

# Verify admin status
npm run promote-admin -- list
```

**Expected**: Your user should be listed as an admin.

---

### 3. Token Health Monitor Testing

#### Test 3.1: Check Token Health Status

```bash
# Check if there are any users with tokens
psql -h localhost -U postgres -d catchup_db -c "SELECT user_id, integration_type, status, last_checked FROM token_health LIMIT 5;"
```

**Expected**: Should show token health records (may be empty if no syncs have run yet).

#### Test 3.2: View Token Health in Logs

Watch the server logs for token health checks:

```bash
# In another terminal, tail the logs
# The server should log token health checks when syncs run
```

**Expected**: You should see logs like:
- `[TokenHealthMonitor] Checking token health for user...`
- `[TokenHealthMonitor] Token status: valid/expired/revoked`

---

### 4. Circuit Breaker Testing

#### Test 4.1: Check Circuit Breaker State

```bash
# Check circuit breaker states
psql -h localhost -U postgres -d catchup_db -c "SELECT user_id, integration_type, state, failure_count, last_failure_at FROM circuit_breaker_state LIMIT 5;"
```

**Expected**: Should show circuit breaker states (closed, open, or half_open).

#### Test 4.2: Observe Circuit Breaker in Action

Watch the logs for circuit breaker state transitions:

**Expected logs**:
- `[CircuitBreaker] State transition for user X: closed → open`
- `[CircuitBreaker] Circuit breaker is open, skipping sync`

---

### 5. Adaptive Sync Scheduler Testing

#### Test 5.1: Check Sync Schedules

```bash
# View sync schedules
psql -h localhost -U postgres -d catchup_db -c "SELECT user_id, integration_type, current_frequency_ms, consecutive_no_changes, next_sync_at FROM sync_schedule LIMIT 5;"
```

**Expected**: Should show sync schedules with frequencies and next sync times.

#### Test 5.2: Observe Frequency Adaptation

Watch logs for frequency changes:

**Expected logs**:
- `[AdaptiveSyncScheduler] No changes detected, incrementing counter`
- `[AdaptiveSyncScheduler] Reducing frequency by 50%`
- `[AdaptiveSyncScheduler] Changes detected, restoring default frequency`

---

### 6. Admin Dashboard Testing

#### Test 6.1: Access Admin Dashboard

1. **Open browser**: http://localhost:3000/admin/sync-health.html
2. **Login**: Use your admin account credentials
3. **View Dashboard**: Should see sync health metrics

**Expected**:
- Dashboard loads without errors
- Shows total users, active integrations
- Displays invalid tokens count
- Shows circuit breaker states
- Displays sync success rates
- Shows API calls saved

#### Test 6.2: Test Dashboard API

```bash
# Get a JWT token first (login via the app)
# Then test the API endpoint

# Replace YOUR_JWT_TOKEN with actual token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/admin/sync-health | jq
```

**Expected**: JSON response with comprehensive sync health metrics.

#### Test 6.3: Test Filtering

```bash
# Filter by integration type
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/api/admin/sync-health?integration_type=google_contacts" | jq
```

**Expected**: Filtered metrics for Google Contacts only.

---

### 7. Manual Sync Testing

#### Test 7.1: Trigger Manual Sync (Contacts)

```bash
# Get JWT token from browser (login first)
# Then trigger manual sync

curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"integration_type":"contacts"}' \
  http://localhost:3000/api/sync/manual | jq
```

**Expected responses**:
- **Success**: `{"success": true, "message": "Sync completed successfully"}`
- **Rate limited**: `{"error": "Too many requests", "retryAfter": 60}`
- **Not connected**: `{"error": "Not connected", "reAuthUrl": "..."}`

#### Test 7.2: Trigger Manual Sync (Calendar)

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"integration_type":"calendar"}' \
  http://localhost:3000/api/sync/manual | jq
```

**Expected**: Similar responses as Test 7.1.

#### Test 7.3: Test Rate Limiting

```bash
# Trigger sync twice in quick succession
curl -X POST -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"integration_type":"contacts"}' \
  http://localhost:3000/api/sync/manual

# Immediately trigger again
curl -X POST -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"integration_type":"contacts"}' \
  http://localhost:3000/api/sync/manual
```

**Expected**: Second request should return 429 (Too Many Requests).

---

### 8. Sync Metrics Testing

#### Test 8.1: View Sync Metrics

```bash
# Check recent sync metrics
psql -h localhost -U postgres -d catchup_db -c "SELECT user_id, integration_type, sync_type, result, duration_ms, items_processed, api_calls_saved, created_at FROM sync_metrics ORDER BY created_at DESC LIMIT 10;"
```

**Expected**: Should show recent sync attempts with results and metrics.

#### Test 8.2: Calculate API Savings

```bash
# Calculate total API calls saved
psql -h localhost -U postgres -d catchup_db -c "SELECT integration_type, SUM(api_calls_saved) as total_saved FROM sync_metrics GROUP BY integration_type;"
```

**Expected**: Shows total API calls saved per integration type.

---

### 9. Graceful Degradation Testing

#### Test 9.1: Simulate Invalid Token

1. **Invalidate a token** in the database (or wait for one to expire)
2. **Open the app** in browser
3. **Navigate** to contacts or calendar page

**Expected**:
- Warning banner appears: "Sync unavailable"
- Shows last successful sync time
- "Reconnect" button visible
- Cached data still displayed

#### Test 9.2: Check Warning Banner

Open browser console and check for:

```javascript
// Should see warning banner element
document.querySelector('.sync-warning-banner')
```

**Expected**: Warning banner element exists when sync is unavailable.

---

### 10. Background Jobs Testing

#### Test 10.1: Check Job Status

```bash
# View job monitoring endpoint (requires admin token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/admin/jobs/status | jq
```

**Expected**: Shows status of all background jobs.

#### Test 10.2: Monitor Job Execution

Watch server logs for job execution:

**Expected logs**:
- `[TokenHealthMonitor] Checking expiring tokens...`
- `[CalendarWebhookManager] Checking expiring webhooks...`
- `[NotificationReminderService] Checking for reminder notifications...`

---

### 11. Integration Testing

#### Test 11.1: End-to-End Sync Flow

1. **Connect Google Account**: Login and connect Google Contacts/Calendar
2. **Wait for Sync**: Let automatic sync run (or trigger manual sync)
3. **Check Logs**: Verify sync orchestration logs
4. **Check Database**: Verify all tables updated correctly

**Expected logs sequence**:
```
[SyncOrchestrator] Starting incremental sync for user X
[TokenHealthMonitor] Token is valid
[CircuitBreaker] Circuit breaker is closed, allowing sync
[AdaptiveSyncScheduler] Calculating next sync time
[SyncOrchestrator] Sync completed successfully
[SyncOrchestrator] Recorded metrics: success
```

#### Test 11.2: Failure Recovery Flow

1. **Simulate Failure**: Disconnect internet or invalidate token
2. **Wait for Sync**: Let sync fail 3 times
3. **Check Circuit Breaker**: Should open after 3 failures
4. **Reconnect**: Fix the issue
5. **Wait for Recovery**: Circuit breaker should transition to half_open, then closed

**Expected**:
- Circuit breaker opens after 3 failures
- Syncs are skipped while open
- Automatic recovery after timeout
- Successful sync closes circuit breaker

---

## Troubleshooting

### Issue: Tables Don't Exist

**Solution**: Run migrations:
```bash
npm run db:migrate
```

### Issue: Admin Dashboard Returns 403

**Solution**: Promote your user to admin:
```bash
npm run promote-admin -- your-email@example.com promote
```

### Issue: Manual Sync Returns 401

**Solution**: Get a valid JWT token by logging in through the app first.

### Issue: No Sync Metrics

**Solution**: Wait for automatic syncs to run, or trigger manual syncs to generate metrics.

### Issue: Circuit Breaker Not Opening

**Solution**: Ensure you have a user with an invalid token that's causing repeated failures.

---

## Success Criteria

✅ All database tables exist and are accessible
✅ Admin role can be assigned and verified
✅ Token health monitoring logs appear
✅ Circuit breaker state transitions occur
✅ Adaptive scheduling adjusts frequencies
✅ Admin dashboard loads and displays metrics
✅ Manual sync endpoints respond correctly
✅ Rate limiting works (429 on rapid requests)
✅ Sync metrics are recorded in database
✅ Warning banner appears when sync unavailable
✅ Background jobs execute on schedule
✅ End-to-end sync flow completes successfully

---

## Next Steps

After local testing is successful:

1. **Review Metrics**: Check the admin dashboard for API savings
2. **Monitor Performance**: Watch for any performance issues
3. **Test Edge Cases**: Try various failure scenarios
4. **Prepare for Deployment**: Follow the deployment guide
5. **Set Up Monitoring**: Configure alerts for production

---

## Quick Test Script

Here's a quick script to test all endpoints:

```bash
#!/bin/bash

# Set your JWT token
TOKEN="YOUR_JWT_TOKEN_HERE"

echo "Testing Admin Dashboard API..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/sync-health | jq '.totalUsers'

echo -e "\nTesting Manual Sync (Contacts)..."
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"integration_type":"contacts"}' \
  http://localhost:3000/api/sync/manual | jq '.success'

echo -e "\nTesting Manual Sync (Calendar)..."
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"integration_type":"calendar"}' \
  http://localhost:3000/api/sync/manual | jq '.success'

echo -e "\nTesting Rate Limiting..."
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"integration_type":"contacts"}' \
  http://localhost:3000/api/sync/manual | jq '.error'

echo -e "\nDone!"
```

Save this as `test-sync-optimization.sh` and run with `bash test-sync-optimization.sh`.
