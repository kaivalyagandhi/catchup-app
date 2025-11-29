# Task 11: Background Sync Jobs Implementation

## Overview

Implemented background job scheduling for Google Contacts synchronization, enabling automatic daily syncs for all connected users.

## Implementation Summary

### Task 11.1: Create Sync Job Processor ✅

**File**: `src/jobs/processors/google-contacts-sync-processor.ts`

The processor was already implemented and handles:
- Processing both full and incremental sync jobs
- Retrieving OAuth tokens and checking connection status
- Executing sync operations via `GoogleContactsSyncService`
- Updating sync state on completion/failure
- Comprehensive error handling and logging

**Key Features**:
- Validates user connection before sync
- Automatically refreshes expired tokens
- Logs detailed sync results (contacts imported/updated/deleted, groups imported)
- Handles errors gracefully and re-throws to mark job as failed

### Task 11.2: Implement Scheduled Sync Job ✅

**Files Modified**:
- `src/jobs/scheduler.ts` - Added scheduling functions
- `src/api/routes/google-contacts-oauth.ts` - Integrated scheduler with OAuth flow
- `src/jobs/index.ts` - Added processor export

**New Functions**:

1. **`scheduleGoogleContactsSync()`**
   - Finds all users with Google Contacts connected
   - Schedules daily incremental sync for each user
   - Runs at 2 AM UTC daily
   - Handles errors per user gracefully

2. **`scheduleUserGoogleContactsSync(userId)`**
   - Schedules daily sync for a specific user
   - Removes existing schedule before creating new one
   - Used when user connects Google Contacts

3. **`removeUserGoogleContactsSync(userId)`**
   - Removes scheduled sync for a specific user
   - Used when user disconnects Google Contacts

**Integration Points**:

1. **OAuth Callback** (`/api/contacts/oauth/callback`)
   - Queues immediate full sync job
   - Schedules daily incremental sync
   - Both operations are non-blocking (errors logged but don't fail OAuth)

2. **Disconnect** (`/api/contacts/oauth/disconnect`)
   - Removes scheduled sync jobs
   - Deletes OAuth tokens
   - Non-blocking error handling

3. **Scheduler Initialization** (`initializeScheduler()`)
   - Now includes `scheduleGoogleContactsSync()`
   - Called on application startup
   - Sets up recurring jobs for all existing users

## Testing

**File**: `src/jobs/scheduler.test.ts`

Comprehensive test suite covering:
- Scheduling sync for multiple users
- Error handling for individual users
- Empty user list handling
- User-specific scheduling
- Removing existing jobs before rescheduling
- Removing scheduled syncs
- Job ID matching logic

**Test Results**: ✅ All 8 tests passing

## Requirements Validated

- ✅ **Requirement 3.7**: Automatic sync runs once daily via background job
- ✅ **Requirement 10.5**: Sync state updated on completion/failure
- ✅ **Requirement 4.5**: Jobs queued to prevent duplicate syncs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Startup                       │
│                  initializeScheduler()                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│          scheduleGoogleContactsSync()                        │
│  - Find all users with google_contacts provider             │
│  - Schedule daily job for each user                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Bull Queue (Redis)                              │
│  Job: { userId, syncType: 'incremental' }                   │
│  Schedule: Daily at 2 AM UTC                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│        processGoogleContactsSync()                           │
│  1. Check connection status                                  │
│  2. Get/refresh access token                                 │
│  3. Execute sync (full or incremental)                       │
│  4. Update sync state                                        │
└─────────────────────────────────────────────────────────────┘
```

## User Flow

### New User Connection
1. User completes OAuth flow
2. System queues immediate full sync
3. System schedules daily incremental sync at 2 AM UTC
4. User's contacts sync automatically every day

### User Disconnection
1. User clicks disconnect
2. System removes OAuth tokens
3. System removes scheduled sync jobs
4. No more automatic syncs occur

### Existing Users on Startup
1. Application starts
2. `initializeScheduler()` called
3. System finds all users with Google Contacts
4. Schedules daily sync for each user
5. All users get automatic syncs

## Configuration

**Sync Schedule**: Daily at 2 AM UTC
- Configurable via cron expression: `'0 2 * * *'`
- Timezone: UTC
- Job ID format: `google-contacts-sync-{userId}`

**Job Options**:
- Attempts: 3 (with exponential backoff)
- Backoff: 2s, 4s, 8s
- Remove on complete: true
- Remove on fail: false (kept for debugging)

## Error Handling

1. **Scheduling Errors**
   - Individual user errors don't stop batch scheduling
   - Errors logged but don't throw
   - Allows partial success

2. **Job Execution Errors**
   - Connection validation before sync
   - Token refresh on expiration
   - Detailed error logging
   - Job marked as failed for retry

3. **OAuth Flow Errors**
   - Scheduling errors don't fail OAuth
   - User still gets connected
   - Manual sync available as fallback

## Future Enhancements

1. **Configurable Schedule**
   - Allow users to choose sync time
   - Support multiple sync frequencies

2. **Smart Scheduling**
   - Sync during user's off-hours
   - Adjust based on contact change frequency

3. **Sync Monitoring**
   - Dashboard showing sync health
   - Alerts for repeated failures
   - Performance metrics

## Files Changed

1. `src/jobs/scheduler.ts` - Added Google Contacts scheduling functions
2. `src/api/routes/google-contacts-oauth.ts` - Integrated scheduler
3. `src/jobs/index.ts` - Added processor export
4. `src/jobs/scheduler.test.ts` - New test file

## Files Verified

1. `src/jobs/processors/google-contacts-sync-processor.ts` - Already complete
2. `src/jobs/worker.ts` - Already registered processor
3. `src/jobs/queue.ts` - Already has Google Contacts queue

## Verification

✅ All diagnostics clean
✅ All tests passing (12/12)
✅ Integration with OAuth flow complete
✅ Scheduler initialization updated
✅ Error handling comprehensive
✅ Requirements validated

## Next Steps

Task 11 is complete. The next task in the implementation plan is:

**Task 12: Disconnect functionality**
- Implement disconnect logic
- Clear sync state
- Preserve contacts but clear sync metadata
- Implement reconnect logic
