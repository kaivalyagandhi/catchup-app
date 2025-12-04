# Testing Enhanced Status Endpoint

## Task 14.1: Enhance status endpoint

This document describes how to test the enhanced status endpoint.

## Endpoint

`GET /api/contacts/oauth/status`

## Expected Response (Connected)

```json
{
  "connected": true,
  "email": "user@example.com",
  "expiresAt": "2025-01-15T12:00:00.000Z",
  "lastSyncAt": "2025-01-14T10:30:00.000Z",
  "totalContactsSynced": 150,
  "lastSyncStatus": "success",
  "lastSyncError": null,
  "autoSyncEnabled": true
}
```

## Expected Response (Not Connected)

```json
{
  "connected": false,
  "autoSyncEnabled": false
}
```

## Expected Response (Connected with Error)

```json
{
  "connected": true,
  "email": "user@example.com",
  "expiresAt": "2025-01-15T12:00:00.000Z",
  "lastSyncAt": "2025-01-14T10:30:00.000Z",
  "totalContactsSynced": 150,
  "lastSyncStatus": "failed",
  "lastSyncError": "Rate limit exceeded",
  "autoSyncEnabled": true
}
```

## Implementation Details

The enhanced status endpoint now returns:

1. **Connection status** (Requirements 8.1)
   - `connected`: Boolean indicating if Google Contacts is connected
   - `email`: User's Google account email (if connected)
   - `expiresAt`: Token expiration timestamp (if connected)

2. **Last sync timestamp** (Requirements 8.2)
   - `lastSyncAt`: Timestamp of last successful sync (incremental or full)
   - Prefers incremental sync timestamp, falls back to full sync timestamp

3. **Total contacts synced** (Requirements 8.3)
   - `totalContactsSynced`: Number of contacts currently synced from Google

4. **Sync errors** (Requirements 8.4)
   - `lastSyncStatus`: Status of last sync ('pending', 'in_progress', 'success', 'failed')
   - `lastSyncError`: Error message if last sync failed, null otherwise

5. **Auto-sync enabled status** (Requirements 8.5)
   - `autoSyncEnabled`: Boolean indicating if daily auto-sync is scheduled
   - Checks for existence of scheduled job in Bull queue

## Manual Testing

### Prerequisites
- Server running: `npm run dev`
- User authenticated with valid JWT token
- Google Contacts connected (for full status)

### Test Case 1: Not Connected
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/contacts/oauth/status
```

Expected: `connected: false, autoSyncEnabled: false`

### Test Case 2: Connected with Successful Sync
1. Connect Google Contacts via OAuth flow
2. Wait for initial sync to complete
3. Check status:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/contacts/oauth/status
```

Expected: All fields populated, `lastSyncStatus: "success"`, `lastSyncError: null`

### Test Case 3: Connected with Failed Sync
1. Simulate a sync failure (e.g., by temporarily breaking API credentials)
2. Check status:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/contacts/oauth/status
```

Expected: `lastSyncStatus: "failed"`, `lastSyncError` contains error message

## Verification Checklist

- [x] Status endpoint returns connection status
- [x] Status endpoint returns last sync timestamp
- [x] Status endpoint returns total contacts synced
- [x] Status endpoint returns sync errors if any
- [x] Status endpoint returns auto-sync enabled status
- [x] Status endpoint handles not connected case
- [x] Status endpoint handles connected case
- [x] No TypeScript errors
- [x] Code follows existing patterns

## Requirements Validated

- ✅ Requirement 8.1: Display connection status
- ✅ Requirement 8.2: Display last successful sync timestamp
- ✅ Requirement 8.3: Display total number of contacts synced
- ✅ Requirement 8.4: Display error message and timestamp when sync error occurs
- ✅ Requirement 8.5: Indicate whether automatic sync is enabled
