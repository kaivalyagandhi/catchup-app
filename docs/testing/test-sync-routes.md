# Google Contacts Sync Routes - Manual Testing Guide

## Prerequisites
- Server running: `npm run dev`
- Redis running (for job queue)
- Valid JWT token for authentication
- Google Contacts OAuth connected

## Test Endpoints

### 1. Check Sync Status
```bash
curl -X GET http://localhost:3000/api/contacts/sync/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected Response:
```json
{
  "connected": true,
  "email": "user@example.com",
  "lastSyncAt": "2025-01-28T10:00:00Z",
  "lastFullSyncAt": "2025-01-28T10:00:00Z",
  "totalContactsSynced": 247,
  "lastSyncStatus": "success",
  "lastSyncError": null,
  "autoSyncEnabled": true,
  "syncInProgress": false
}
```

### 2. Trigger Full Sync
```bash
curl -X POST http://localhost:3000/api/contacts/sync/full \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected Response:
```json
{
  "message": "Full sync started",
  "jobId": "google-contacts-sync-USER_ID-TIMESTAMP",
  "status": "queued"
}
```

### 3. Trigger Incremental Sync
```bash
curl -X POST http://localhost:3000/api/contacts/sync/incremental \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected Response:
```json
{
  "message": "Incremental sync started",
  "jobId": "google-contacts-sync-USER_ID-TIMESTAMP",
  "status": "queued"
}
```

## Error Cases

### Not Connected
```bash
# Should return 400 if Google Contacts not connected
curl -X POST http://localhost:3000/api/contacts/sync/full \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected Response:
```json
{
  "error": "Google Contacts not connected",
  "message": "Please connect your Google Contacts account first"
}
```

### Sync Already in Progress
```bash
# Trigger sync twice quickly
curl -X POST http://localhost:3000/api/contacts/sync/full \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Immediately trigger again
curl -X POST http://localhost:3000/api/contacts/sync/full \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected Second Response:
```json
{
  "error": "Sync already in progress",
  "message": "A sync operation is already running for your account"
}
```

## Implementation Verification

### Check Job Queue
The sync jobs should be queued in Redis and processed by the worker.

### Check Logs
Server logs should show:
- "Full sync requested for user {userId}"
- "Full sync job queued for user {userId}, job ID: {jobId}"
- "Processing Google Contacts sync job {jobId}"
- "full sync completed for user {userId}"

### Check Database
After sync completes, check:
- `google_contacts_sync_state` table for sync status
- `contacts` table for imported contacts
- Contact source should be "google"
- Google metadata (resource_name, etag) should be populated

## Requirements Validated

✅ Requirement 4.1: Manual sync trigger
✅ Requirement 4.5: Prevent duplicate sync jobs
✅ Requirement 8.1: Connection status display
✅ Requirement 8.2: Last sync timestamp
✅ Requirement 8.3: Total contacts synced
✅ Requirement 8.4: Sync error display
✅ Requirement 8.5: Auto-sync enabled status
