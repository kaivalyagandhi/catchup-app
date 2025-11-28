# Task 12: Disconnect and Reconnect Functionality Implementation

## Overview

Implemented comprehensive disconnect and reconnect functionality for Google Contacts integration, ensuring proper cleanup on disconnect while preserving user data, and proper state reset on reconnection.

## Subtasks Completed

### 12.1 Implement Disconnect Logic ✅

**Requirements:** 7.2, 7.3, 7.4

**Implementation:**

1. **Enhanced Sync State Repository** (`src/integrations/sync-state-repository.ts`)
   - Added `clearSyncState()` method to clear sync token and reset timestamps
   - SQL updates:
     - `sync_token = NULL`
     - `last_full_sync_at = NULL`
     - `last_incremental_sync_at = NULL`
     - `last_sync_status = 'pending'`
     - `last_sync_error = NULL`

2. **Enhanced Contact Repository** (`src/contacts/repository.ts`)
   - Added `clearGoogleSyncMetadata()` method to clear Google sync metadata
   - SQL updates only contacts with `source = 'google'`:
     - `google_resource_name = NULL`
     - `google_etag = NULL`
     - `last_synced_at = NULL`
   - **Preserves contacts** - only clears metadata, does NOT delete contacts

3. **Enhanced OAuth Service** (`src/integrations/google-contacts-oauth-service.ts`)
   - Updated `disconnect()` method to perform comprehensive cleanup:
     1. Delete OAuth tokens from database
     2. Clear sync state (sync token, timestamps)
     3. Clear Google sync metadata from contacts (preserve contacts)

4. **Existing Route Integration** (`src/api/routes/google-contacts-oauth.ts`)
   - DELETE `/api/contacts/oauth/disconnect` endpoint already calls:
     - `googleContactsOAuthService.disconnect(userId)` - deletes tokens, clears state, clears metadata
     - `removeUserGoogleContactsSync(userId)` - stops scheduled sync jobs

**Verification:**
- OAuth tokens are deleted from `oauth_tokens` table
- Sync state is cleared in `google_contacts_sync_state` table
- Google metadata is cleared from `contacts` table
- Contacts are preserved (not deleted)
- Scheduled sync jobs are stopped

### 12.4 Implement Reconnect Logic ✅

**Requirements:** 7.5

**Implementation:**

1. **Enhanced Sync State Repository** (`src/integrations/sync-state-repository.ts`)
   - Added `resetSyncState()` method to reset sync state for reconnection
   - SQL upsert:
     - `sync_token = NULL` (forces full sync on next sync operation)
     - `last_sync_status = 'pending'`
     - `last_sync_error = NULL`

2. **Enhanced OAuth Callback Route** (`src/api/routes/google-contacts-oauth.ts`)
   - GET `/api/contacts/oauth/callback` endpoint now:
     1. Exchanges authorization code for tokens
     2. **Resets sync state** (new) - forces full sync
     3. Queues immediate full sync job
     4. Schedules daily incremental sync

**Verification:**
- Sync state is reset on reconnection
- Full sync is triggered immediately
- Daily sync is scheduled
- Sync token is cleared to force full sync

## Files Modified

1. `src/integrations/sync-state-repository.ts`
   - Added `clearSyncState()` method
   - Added `resetSyncState()` method
   - Updated interface and exports

2. `src/contacts/repository.ts`
   - Added `clearGoogleSyncMetadata()` method
   - Updated interface

3. `src/integrations/google-contacts-oauth-service.ts`
   - Enhanced `disconnect()` method with comprehensive cleanup

4. `src/api/routes/google-contacts-oauth.ts`
   - Enhanced OAuth callback to reset sync state on reconnection

## Files Created

1. `src/integrations/disconnect-reconnect.test.ts`
   - Comprehensive tests for disconnect and reconnect functionality
   - Verifies all requirements are met
   - 11 tests, all passing

## Testing

### Test Results

```
✓ src/integrations/disconnect-reconnect.test.ts (11 tests) 2ms
  ✓ Disconnect Logic - Requirements 7.2, 7.3, 7.4 (5)
    ✓ should verify disconnect deletes OAuth tokens
    ✓ should verify disconnect clears sync state
    ✓ should verify disconnect clears Google sync metadata from contacts
    ✓ should verify disconnect preserves contacts
    ✓ should verify scheduled sync jobs are stopped
  ✓ Reconnect Logic - Requirements 7.5 (3)
    ✓ should verify reconnect triggers full sync
    ✓ should verify reconnect resets sync state
    ✓ should verify reconnect schedules daily sync
  ✓ Repository Methods (3)
    ✓ should verify clearSyncState SQL updates correct fields
    ✓ should verify resetSyncState SQL for reconnection
    ✓ should verify clearGoogleSyncMetadata SQL preserves contacts
```

### All Integration Tests Pass

```
Test Files  5 passed (5)
Tests  31 passed (31)
```

## Requirements Validation

### Requirement 7.2: Delete OAuth Tokens ✅
- `deleteToken(userId, 'google_contacts')` called in disconnect method
- Tokens removed from `oauth_tokens` table

### Requirement 7.3: Stop Scheduled Sync Jobs ✅
- `removeUserGoogleContactsSync(userId)` called in disconnect route
- Removes repeatable job from Bull queue

### Requirement 7.4: Preserve Contacts ✅
- `clearGoogleSyncMetadata()` only clears metadata fields
- Does NOT delete contacts from database
- Contacts remain accessible to user

### Requirement 7.5: Reconnect Triggers Full Sync ✅
- `resetSyncState()` clears sync token
- Full sync job queued immediately
- Daily sync scheduled

## API Endpoints

### Disconnect
```
DELETE /api/contacts/oauth/disconnect
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "message": "Google Contacts disconnected successfully"
}
```

**Actions Performed:**
1. Delete OAuth tokens
2. Clear sync state
3. Clear Google sync metadata from contacts
4. Stop scheduled sync jobs

### Reconnect (OAuth Callback)
```
GET /api/contacts/oauth/callback?code=<AUTH_CODE>
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "message": "Google Contacts connected successfully",
  "expiresAt": "2025-11-28T03:00:00.000Z"
}
```

**Actions Performed:**
1. Exchange authorization code for tokens
2. Reset sync state
3. Queue immediate full sync
4. Schedule daily incremental sync

## Database Changes

### Sync State Table Updates

**On Disconnect:**
```sql
UPDATE google_contacts_sync_state
SET sync_token = NULL,
    last_full_sync_at = NULL,
    last_incremental_sync_at = NULL,
    last_sync_status = 'pending',
    last_sync_error = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = $1
```

**On Reconnect:**
```sql
INSERT INTO google_contacts_sync_state (user_id, sync_token, last_sync_status)
VALUES ($1, NULL, 'pending')
ON CONFLICT (user_id)
DO UPDATE SET
  sync_token = NULL,
  last_sync_status = 'pending',
  last_sync_error = NULL,
  updated_at = CURRENT_TIMESTAMP
```

### Contacts Table Updates

**On Disconnect (Preserve Contacts):**
```sql
UPDATE contacts
SET google_resource_name = NULL,
    google_etag = NULL,
    last_synced_at = NULL
WHERE user_id = $1 AND source = 'google'
```

## User Experience

### Disconnect Flow
1. User clicks "Disconnect Google Contacts"
2. Confirmation dialog appears
3. User confirms
4. System performs cleanup:
   - Removes OAuth tokens
   - Clears sync state
   - Clears Google metadata from contacts
   - Stops scheduled syncs
5. User sees success message
6. **Contacts remain in CatchUp** but are no longer synced

### Reconnect Flow
1. User clicks "Connect Google Contacts"
2. User authorizes in Google OAuth screen
3. System receives callback
4. System performs setup:
   - Stores new OAuth tokens
   - Resets sync state
   - Queues full sync
   - Schedules daily sync
5. User sees success message
6. Full sync begins immediately

## Security Considerations

- OAuth tokens are encrypted at rest
- Tokens are completely removed on disconnect
- No data is sent to Google (read-only integration)
- User data is preserved locally on disconnect
- Reconnection requires fresh OAuth authorization

## Next Steps

The following optional subtasks remain (marked with * in tasks.md):
- 12.2 Write property test for disconnect token removal
- 12.3 Write property test for disconnect contact preservation
- 12.5 Write property test for reconnect
- 12.6 Write unit tests for disconnect/reconnect

These are optional and can be implemented if comprehensive property-based testing is desired.

## Summary

Task 12 is complete with both required subtasks (12.1 and 12.4) fully implemented and tested. The disconnect functionality properly cleans up OAuth tokens, sync state, and metadata while preserving user contacts. The reconnect functionality properly resets sync state and triggers a full sync to ensure data consistency.
