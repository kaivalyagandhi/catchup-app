# Onboarding Sync Testing Guide

## Overview

This guide provides step-by-step instructions for manually testing the onboarding sync mitigations implemented in tasks 23-25. These features ensure a smooth first-time user experience when connecting Google integrations.

**Reference**: Task 26 - Checkpoint: Test Onboarding Mitigations

## Prerequisites

### Environment Setup
1. **Development server running**: `npm run dev`
2. **Database running**: PostgreSQL with all migrations applied
3. **Test Google account**: Use a test Google account (not production data)
4. **Clean state**: No existing sync data for test user

### Database Cleanup (Before Testing)
```sql
-- Clean up test user data
DELETE FROM sync_schedule WHERE user_id = 'YOUR_TEST_USER_ID';
DELETE FROM google_contacts_sync_state WHERE user_id = 'YOUR_TEST_USER_ID';
DELETE FROM sync_metrics WHERE user_id = 'YOUR_TEST_USER_ID';
DELETE FROM oauth_tokens WHERE user_id = 'YOUR_TEST_USER_ID';
DELETE FROM contacts WHERE user_id = 'YOUR_TEST_USER_ID';
```

## Test 26.1: Immediate First Sync

### Purpose
Verify that when a user connects Google Contacts or Calendar for the first time, a sync is triggered immediately (not waiting for the scheduled interval).

### Test Steps - Google Contacts

1. **Navigate to onboarding page**
   - Open: `http://localhost:3000/index.html`
   - Click "Get Started" or navigate to onboarding flow

2. **Connect Google Contacts**
   - Click "Connect Google Contacts" button
   - Complete OAuth flow with test Google account
   - Grant contacts.readonly permissions

3. **Verify immediate sync trigger**
   - **Expected**: Sync should start immediately after OAuth callback
   - **Check browser console** for log:
     ```
     [SyncOrchestrator] Executing sync job for user <userId> (google_contacts)
     [SyncOrchestrator] Sync type: full (initial sync)
     ```

4. **Verify contacts appear quickly**
   - **Expected**: Contacts should appear in UI within 1 minute
   - Navigate to contacts page or directory
   - Verify contacts from Google account are visible

5. **Check database sync state**
   ```sql
   SELECT * FROM google_contacts_sync_state 
   WHERE user_id = 'YOUR_TEST_USER_ID';
   ```
   - **Expected**: `last_full_sync_at` should be set to current timestamp
   - **Expected**: `sync_token` should be populated

6. **Check sync metrics**
   ```sql
   SELECT * FROM sync_metrics 
   WHERE user_id = 'YOUR_TEST_USER_ID' 
   AND integration_type = 'google_contacts'
   ORDER BY created_at DESC LIMIT 1;
   ```
   - **Expected**: `sync_type` = 'full' or 'initial'
   - **Expected**: `result` = 'success'
   - **Expected**: `items_processed` > 0

### Test Steps - Google Calendar

1. **Connect Google Calendar**
   - Click "Connect Google Calendar" button
   - Complete OAuth flow with test Google account
   - Grant calendar.readonly permissions

2. **Verify immediate sync trigger**
   - **Expected**: Sync should start immediately after OAuth callback
   - **Check browser console** for log:
     ```
     [SyncOrchestrator] Executing sync job for user <userId> (google_calendar)
     [SyncOrchestrator] Sync type: full (initial sync)
     ```

3. **Verify calendar events appear quickly**
   - **Expected**: Calendar events should be available within 1 minute
   - Navigate to scheduling page or availability view
   - Verify calendar data is loaded

4. **Check sync schedule**
   ```sql
   SELECT * FROM sync_schedule 
   WHERE user_id = 'YOUR_TEST_USER_ID' 
   AND integration_type = 'google_calendar';
   ```
   - **Expected**: `last_sync_at` should be set to current timestamp

### Success Criteria
- ✅ Sync triggers immediately after OAuth callback (no waiting)
- ✅ Contacts/events appear in UI within 1 minute
- ✅ Database shows successful sync with timestamp
- ✅ Sync metrics recorded with 'initial' or 'full' type

---

## Test 26.2: Onboarding Progress UI

### Purpose
Verify that the onboarding UI displays sync progress with spinner, success message, and retry functionality on failure.

### Test Steps - Success Flow

1. **Start fresh connection**
   - Clean up test user data (see Prerequisites)
   - Navigate to onboarding page

2. **Connect Google Contacts**
   - Click "Connect Google Contacts"
   - Complete OAuth flow

3. **Verify spinner appears**
   - **Expected**: Immediately after OAuth callback, spinner should appear
   - **Expected**: Text: "Syncing your contacts..." or similar
   - **Check**: `public/js/onboarding-sync-status.js` is loaded
   - **Check browser console** for:
     ```
     [OnboardingSyncStatus] Starting sync status polling
     [OnboardingSyncStatus] Sync status: in_progress
     ```

4. **Verify success message**
   - **Expected**: After sync completes (within 1 minute), success message appears
   - **Expected**: Shows contact count: "Successfully synced 42 contacts"
   - **Expected**: Checkmark icon or success indicator
   - **Check browser console** for:
     ```
     [OnboardingSyncStatus] Sync status: completed
     [OnboardingSyncStatus] Items processed: 42
     ```

5. **Verify UI progression**
   - **Expected**: Onboarding flow continues to next step automatically
   - **Expected**: No manual intervention needed

### Test Steps - Failure Flow

1. **Simulate sync failure**
   - **Option A**: Revoke Google permissions mid-sync
     - Go to https://myaccount.google.com/permissions
     - Revoke CatchUp app access during sync
   
   - **Option B**: Temporarily break database connection
     - Stop PostgreSQL: `brew services stop postgresql` (macOS)
     - Or modify `.env` to use invalid DB credentials
   
   - **Option C**: Mock failure in code (for testing)
     - In `src/integrations/sync-orchestrator.ts`, temporarily throw error:
       ```typescript
       if (syncType === 'initial') {
         throw new Error('Simulated sync failure for testing');
       }
       ```

2. **Connect Google Contacts**
   - Complete OAuth flow
   - Sync should fail

3. **Verify error message**
   - **Expected**: Error message appears with details
   - **Expected**: Text: "Sync failed: [error message]"
   - **Expected**: Retry button is visible
   - **Check browser console** for:
     ```
     [OnboardingSyncStatus] Sync status: failed
     [OnboardingSyncStatus] Error: [error message]
     ```

4. **Test retry button**
   - Click "Retry" button
   - **Expected**: Triggers manual sync via `/api/sync/manual`
   - **Expected**: Spinner appears again
   - **Check browser console** for:
     ```
     [OnboardingSyncStatus] Retrying sync...
     POST /api/sync/manual
     ```

5. **Fix the issue and retry**
   - Restore database connection or re-grant permissions
   - Click "Retry" button
   - **Expected**: Sync succeeds this time
   - **Expected**: Success message appears

### Success Criteria
- ✅ Spinner appears immediately during sync
- ✅ Success message shows contact/event count
- ✅ Error message appears on failure with details
- ✅ Retry button triggers manual sync
- ✅ UI updates in real-time (polling every 2 seconds)

---

## Test 26.3: Onboarding Frequency

### Purpose
Verify that during the first 24 hours after connection, syncs occur at onboarding frequency (1h for contacts, 2h for calendar), then transition to default frequency (7d for contacts, 24h for calendar).

### Test Steps - Onboarding Period (First 24 Hours)

1. **Connect Google Contacts**
   - Complete OAuth flow
   - Wait for initial sync to complete

2. **Check sync schedule**
   ```sql
   SELECT 
     user_id,
     integration_type,
     current_frequency_ms,
     onboarding_until,
     next_sync_at,
     created_at
   FROM sync_schedule 
   WHERE user_id = 'YOUR_TEST_USER_ID' 
   AND integration_type = 'google_contacts';
   ```
   
   **Expected values**:
   - `current_frequency_ms` = 3600000 (1 hour in milliseconds)
   - `onboarding_until` = ~24 hours from now
   - `next_sync_at` = ~1 hour from now

3. **Verify onboarding frequency in logs**
   - **Check server logs** for:
     ```
     [AdaptiveSyncScheduler] First connection for user <userId> (google_contacts).
     Using onboarding frequency: 1h until <timestamp>
     ```

4. **Wait for next scheduled sync**
   - **Option A**: Wait 1 hour (real-time testing)
   - **Option B**: Mock time (see "Time Mocking" section below)
   
5. **Verify sync occurs at 1-hour interval**
   ```sql
   SELECT 
     sync_type,
     result,
     created_at
   FROM sync_metrics 
   WHERE user_id = 'YOUR_TEST_USER_ID' 
   AND integration_type = 'google_contacts'
   ORDER BY created_at DESC;
   ```
   - **Expected**: Second sync occurs ~1 hour after first sync
   - **Expected**: Syncs continue every 1 hour during onboarding period

### Test Steps - Calendar Onboarding

1. **Connect Google Calendar**
   - Complete OAuth flow

2. **Check sync schedule**
   ```sql
   SELECT 
     current_frequency_ms,
     onboarding_until,
     next_sync_at
   FROM sync_schedule 
   WHERE user_id = 'YOUR_TEST_USER_ID' 
   AND integration_type = 'google_calendar';
   ```
   
   **Expected values**:
   - `current_frequency_ms` = 7200000 (2 hours in milliseconds)
   - `onboarding_until` = ~24 hours from now
   - `next_sync_at` = ~2 hours from now

3. **Verify 2-hour frequency**
   - Wait 2 hours or mock time
   - Verify sync occurs at 2-hour interval

### Test Steps - Transition to Default Frequency

1. **Wait 24 hours** (or mock time to 25 hours after connection)

2. **Trigger next sync**
   - Wait for scheduled sync to run
   - Or manually trigger: `POST /api/sync/manual`

3. **Check sync schedule after transition**
   ```sql
   SELECT 
     current_frequency_ms,
     onboarding_until,
     next_sync_at,
     NOW() as current_time
   FROM sync_schedule 
   WHERE user_id = 'YOUR_TEST_USER_ID' 
   AND integration_type = 'google_contacts';
   ```
   
   **Expected values**:
   - `current_frequency_ms` = 604800000 (7 days in milliseconds)
   - `onboarding_until` < NOW() (past onboarding period)
   - `next_sync_at` = ~7 days from now

4. **Verify transition in logs**
   - **Check server logs** for:
     ```
     [AdaptiveSyncScheduler] User <userId> (google_contacts) past onboarding period.
     Using default frequency: 7d
     ```

5. **Verify calendar transition**
   ```sql
   SELECT 
     current_frequency_ms,
     next_sync_at
   FROM sync_schedule 
   WHERE user_id = 'YOUR_TEST_USER_ID' 
   AND integration_type = 'google_calendar';
   ```
   
   **Expected values**:
   - `current_frequency_ms` = 86400000 (24 hours in milliseconds)
   - `next_sync_at` = ~24 hours from now

### Time Mocking (For Faster Testing)

To test the 24-hour transition without waiting, you can mock the time in the database:

```sql
-- Set onboarding_until to 1 hour ago (simulate past onboarding period)
UPDATE sync_schedule 
SET onboarding_until = NOW() - INTERVAL '1 hour'
WHERE user_id = 'YOUR_TEST_USER_ID';

-- Set next_sync_at to now (trigger immediate sync)
UPDATE sync_schedule 
SET next_sync_at = NOW()
WHERE user_id = 'YOUR_TEST_USER_ID';
```

Then trigger a sync:
```bash
curl -X POST http://localhost:3000/api/sync/manual \
  -H "Content-Type: application/json" \
  -d '{"integrationType": "google_contacts"}'
```

Verify the frequency has transitioned to default (7 days).

### Success Criteria
- ✅ Contacts: 1-hour frequency for first 24 hours
- ✅ Calendar: 2-hour frequency for first 24 hours
- ✅ `onboarding_until` set to 24 hours after connection
- ✅ After 24 hours: Contacts transitions to 7-day frequency
- ✅ After 24 hours: Calendar transitions to 24-hour frequency
- ✅ Logs show onboarding period and transition

---

## Troubleshooting

### Issue: Sync doesn't trigger immediately

**Possible causes**:
1. OAuth callback not calling sync orchestrator
2. Token not stored correctly
3. Sync orchestrator error

**Debug steps**:
```bash
# Check server logs
tail -f logs/app.log | grep -i sync

# Check OAuth tokens
psql -d catchup_db -c "SELECT * FROM oauth_tokens WHERE user_id = 'YOUR_TEST_USER_ID';"

# Check sync schedule
psql -d catchup_db -c "SELECT * FROM sync_schedule WHERE user_id = 'YOUR_TEST_USER_ID';"
```

### Issue: Progress UI not updating

**Possible causes**:
1. Polling not working
2. Sync status endpoint error
3. JavaScript error in onboarding-sync-status.js

**Debug steps**:
```javascript
// Open browser console
// Check for errors
console.log('Checking sync status polling...');

// Manually test endpoint
fetch('/api/sync/status/YOUR_USER_ID/google_contacts')
  .then(r => r.json())
  .then(console.log);
```

### Issue: Frequency not transitioning

**Possible causes**:
1. `onboarding_until` not set correctly
2. Adaptive scheduler not checking onboarding period
3. Sync not running after 24 hours

**Debug steps**:
```sql
-- Check onboarding_until value
SELECT 
  user_id,
  integration_type,
  onboarding_until,
  NOW() as current_time,
  (onboarding_until > NOW()) as still_onboarding
FROM sync_schedule 
WHERE user_id = 'YOUR_TEST_USER_ID';

-- Check sync history
SELECT 
  sync_type,
  result,
  created_at
FROM sync_metrics 
WHERE user_id = 'YOUR_TEST_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Test Results Template

Use this template to document your test results:

```markdown
## Test 26.1: Immediate First Sync
- Date: YYYY-MM-DD
- Tester: [Your Name]
- Environment: [Development/Staging]

### Google Contacts
- [ ] Sync triggered immediately: YES/NO
- [ ] Contacts appeared within 1 minute: YES/NO
- [ ] Database sync state updated: YES/NO
- [ ] Sync metrics recorded: YES/NO
- Notes: [Any observations]

### Google Calendar
- [ ] Sync triggered immediately: YES/NO
- [ ] Calendar data available within 1 minute: YES/NO
- [ ] Database sync state updated: YES/NO
- [ ] Sync metrics recorded: YES/NO
- Notes: [Any observations]

## Test 26.2: Onboarding Progress UI
- Date: YYYY-MM-DD
- Tester: [Your Name]

### Success Flow
- [ ] Spinner appeared during sync: YES/NO
- [ ] Success message showed count: YES/NO
- [ ] UI progressed automatically: YES/NO
- Notes: [Any observations]

### Failure Flow
- [ ] Error message appeared: YES/NO
- [ ] Retry button visible: YES/NO
- [ ] Retry triggered manual sync: YES/NO
- [ ] Sync succeeded after retry: YES/NO
- Notes: [Any observations]

## Test 26.3: Onboarding Frequency
- Date: YYYY-MM-DD
- Tester: [Your Name]

### Onboarding Period
- [ ] Contacts: 1-hour frequency: YES/NO
- [ ] Calendar: 2-hour frequency: YES/NO
- [ ] onboarding_until set correctly: YES/NO
- Notes: [Any observations]

### Transition to Default
- [ ] Contacts: Transitioned to 7 days: YES/NO
- [ ] Calendar: Transitioned to 24 hours: YES/NO
- [ ] Logs show transition: YES/NO
- Notes: [Any observations]

## Overall Result
- [ ] All tests passed
- [ ] Some tests failed (see notes)
- [ ] Blocked (see notes)

## Issues Found
1. [Issue description]
2. [Issue description]

## Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## Related Documentation

- **Implementation Plan**: `.kiro/specs/google-sync-optimization/tasks.md` (Task 26)
- **Sync Frequency Config**: `SYNC_FREQUENCY_FINAL_CONFIG.md`
- **Update Plan**: `SYNC_FREQUENCY_UPDATE_PLAN.md`
- **Immediate First Sync**: `IMMEDIATE_FIRST_SYNC_IMPLEMENTATION.md`
- **Adaptive Sync Scheduler**: `src/integrations/adaptive-sync-scheduler.ts`
- **Sync Orchestrator**: `src/integrations/sync-orchestrator.ts`
- **Onboarding Sync Status UI**: `public/js/onboarding-sync-status.js`

---

## Next Steps

After completing these tests:

1. **Document results** using the template above
2. **Report any issues** found during testing
3. **Update task status** in `.kiro/specs/google-sync-optimization/tasks.md`
4. **Proceed to task 27** (Enhanced Webhook Monitoring) if all tests pass
