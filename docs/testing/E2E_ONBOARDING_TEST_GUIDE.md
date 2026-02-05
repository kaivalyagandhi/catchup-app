# End-to-End Onboarding Test Guide

## Overview

This guide provides step-by-step instructions for testing the complete onboarding flow with immediate first sync, progress UI, and onboarding-specific frequencies.

## Test Objectives

1. Verify immediate sync triggers on first connection
2. Verify progress UI displays sync status correctly
3. Verify onboarding frequencies (1h contacts, 2h calendar)
4. Verify transition to default frequencies after 24 hours
5. Verify retry functionality on sync failures

## Prerequisites

- Development server running (`npm run dev`)
- PostgreSQL database running
- Google OAuth credentials configured
- Test Google account with contacts and calendar events

## Test 33.1: End-to-End Onboarding Test

### Part 1: New User Connects Google Contacts

#### Step 1: Create Test User
```bash
# Open browser console and clear any existing session
localStorage.clear();
sessionStorage.clear();

# Navigate to landing page
http://localhost:3000/landing.html
```

#### Step 2: Sign Up with Google
1. Click "Sign in with Google"
2. Select test Google account
3. Grant permissions
4. Verify redirect to onboarding page

#### Step 3: Verify Immediate Sync
1. On onboarding page, click "Connect Google Contacts"
2. Grant contacts.readonly permission
3. **VERIFY**: Sync status UI appears immediately
4. **VERIFY**: Spinner shows "Syncing your contacts..."
5. **VERIFY**: Progress updates in real-time
6. **VERIFY**: Success message appears within 10-30 seconds
7. **VERIFY**: Contact count is displayed (e.g., "150 contacts synced")

**Expected Behavior**:
- Sync starts within 1-2 seconds of OAuth callback
- Progress UI shows real-time updates
- No waiting for scheduled sync
- Success message with accurate count

**Database Verification**:
```sql
-- Check sync was marked as 'initial'
SELECT * FROM sync_metrics 
WHERE user_id = '<test-user-id>' 
AND integration_type = 'google_contacts'
AND sync_type = 'initial'
ORDER BY created_at DESC LIMIT 1;

-- Verify contacts were imported
SELECT COUNT(*) FROM contacts 
WHERE user_id = '<test-user-id>' 
AND source = 'google';
```

#### Step 4: Verify Progress UI
1. **VERIFY**: Spinner animation is smooth
2. **VERIFY**: Progress text updates (e.g., "Processing 50 of 150...")
3. **VERIFY**: Success checkmark appears on completion
4. **VERIFY**: "Continue" button becomes enabled

**Error Scenario Test**:
1. Disconnect internet during sync
2. **VERIFY**: Error message appears
3. **VERIFY**: Retry button is displayed
4. Reconnect internet
5. Click "Retry"
6. **VERIFY**: Sync resumes successfully

#### Step 5: Verify 1-Hour Frequency for 24 Hours
```sql
-- Check sync schedule
SELECT 
  current_frequency_ms,
  onboarding_until,
  next_sync_at
FROM sync_schedule
WHERE user_id = '<test-user-id>'
AND integration_type = 'google_contacts';

-- Expected results:
-- current_frequency_ms: 3600000 (1 hour)
-- onboarding_until: ~24 hours from now
-- next_sync_at: ~1 hour from now
```

**Verification**:
- `current_frequency_ms` = 3,600,000 (1 hour)
- `onboarding_until` = timestamp ~24 hours in future
- `next_sync_at` = timestamp ~1 hour in future

#### Step 6: Verify Transition to 7-Day Frequency

**Option A: Wait 24 Hours (Real-Time Test)**
1. Wait 24 hours
2. Check sync schedule again
3. **VERIFY**: `current_frequency_ms` = 604,800,000 (7 days)
4. **VERIFY**: `onboarding_until` is in the past

**Option B: Mock Time (Fast Test)**
```sql
-- Manually set onboarding_until to past
UPDATE sync_schedule
SET onboarding_until = NOW() - INTERVAL '1 hour'
WHERE user_id = '<test-user-id>'
AND integration_type = 'google_contacts';

-- Trigger next sync calculation
-- (This happens automatically on next scheduled sync)
```

Then check the next scheduled sync:
```sql
SELECT 
  current_frequency_ms,
  onboarding_until,
  next_sync_at
FROM sync_schedule
WHERE user_id = '<test-user-id>'
AND integration_type = 'google_contacts';

-- Expected: current_frequency_ms should be 604800000 (7 days)
```

### Part 2: Calendar Onboarding Test

#### Step 1: Connect Google Calendar
1. In onboarding flow, click "Connect Google Calendar"
2. Grant calendar.readonly permission
3. **VERIFY**: Immediate sync triggers
4. **VERIFY**: Progress UI shows calendar sync status
5. **VERIFY**: Success message with event count

#### Step 2: Verify 2-Hour Frequency
```sql
SELECT 
  current_frequency_ms,
  onboarding_until,
  next_sync_at
FROM sync_schedule
WHERE user_id = '<test-user-id>'
AND integration_type = 'google_calendar';

-- Expected:
-- current_frequency_ms: 7200000 (2 hours)
-- onboarding_until: ~24 hours from now
```

#### Step 3: Verify Transition to 24-Hour Frequency
After 24 hours (or mock time):
```sql
-- Expected: current_frequency_ms should be 86400000 (24 hours)
```

## Test Results Checklist

### Immediate First Sync
- [ ] Sync triggers within 1-2 seconds of OAuth callback
- [ ] No waiting for scheduled sync
- [ ] Sync type is marked as 'initial' in database
- [ ] All contacts/events are imported

### Progress UI
- [ ] Spinner appears immediately
- [ ] Progress text updates in real-time
- [ ] Success message shows accurate count
- [ ] Error message appears on failure
- [ ] Retry button works correctly

### Onboarding Frequencies
- [ ] Contacts: 1-hour frequency for first 24 hours
- [ ] Calendar: 2-hour frequency for first 24 hours
- [ ] `onboarding_until` timestamp is set correctly
- [ ] Transition to default frequencies after 24 hours

### Database State
- [ ] `sync_schedule` table has correct frequencies
- [ ] `sync_metrics` table records initial sync
- [ ] `contacts` table has imported contacts
- [ ] `calendar_events` table has imported events

## Troubleshooting

### Sync Doesn't Start Immediately
**Check**:
1. Is `isFirstConnection()` returning true?
2. Are OAuth tokens stored correctly?
3. Check server logs for errors

**Debug**:
```bash
# Check server logs
tail -f logs/app.log | grep "initial sync"
```

### Progress UI Not Updating
**Check**:
1. Is WebSocket connection established?
2. Are sync status updates being sent?
3. Check browser console for errors

**Debug**:
```javascript
// In browser console
console.log('Sync status:', window.syncStatus);
```

### Frequency Not Transitioning
**Check**:
1. Is `onboarding_until` set correctly?
2. Has 24 hours passed?
3. Has a sync run after 24 hours?

**Debug**:
```sql
-- Check onboarding status
SELECT 
  user_id,
  integration_type,
  onboarding_until,
  NOW() > onboarding_until AS is_past_onboarding,
  current_frequency_ms
FROM sync_schedule;
```

## Success Criteria

✅ **Pass**: All checklist items are verified
✅ **Pass**: No errors in server logs
✅ **Pass**: Database state matches expectations
✅ **Pass**: User experience is smooth and intuitive

❌ **Fail**: Any checklist item fails
❌ **Fail**: Errors in server logs
❌ **Fail**: Database state is incorrect
❌ **Fail**: User experience is confusing or broken

## Next Steps

After completing this test:
1. Document any issues found
2. Proceed to Test 33.2 (Calendar Webhook Test)
3. Monitor API usage reduction (Test 33.3)
4. Track user experience metrics (Test 33.4)
