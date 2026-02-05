# Admin Dashboard Fix - Complete

## Issue Summary

The admin dashboard was showing a 500 Internal Server Error with the message:
```
column "integration_type" does not exist
```

## Root Cause

The `SyncHealthService` was querying the `oauth_tokens` table using the column name `integration_type`, but the actual column name in that table is `provider`. The sync optimization tables (token_health, circuit_breaker_state, sync_schedule, sync_metrics) correctly use `integration_type`, but `oauth_tokens` uses `provider`.

## Fix Applied

Updated `src/integrations/sync-health-service.ts` to use the correct column name when querying `oauth_tokens`:

**Before:**
```typescript
SELECT COUNT(DISTINCT user_id) as count
FROM oauth_tokens
WHERE integration_type IN ('google_contacts', 'google_calendar')
```

**After:**
```typescript
SELECT COUNT(DISTINCT user_id) as count
FROM oauth_tokens
WHERE provider IN ('google_contacts', 'google_calendar')
```

Also updated the GROUP BY query to alias `provider` as `integration_type` for consistency:
```typescript
SELECT 
  provider as integration_type,
  COUNT(DISTINCT user_id) as count
FROM oauth_tokens
WHERE provider IN ('google_contacts', 'google_calendar')
GROUP BY provider
```

## Verification

1. ✅ User `kaivalya.gandhi@gmail.com` is marked as admin in database
2. ✅ `/api/auth/me` endpoint returns `isAdmin: true`
3. ✅ Admin dashboard link appears in Preferences page
4. ✅ Sync optimization tables exist with correct schema
5. ✅ Server restarted with fix applied

## Testing Steps

1. Navigate to http://localhost:3000
2. Log in with Google SSO (kaivalya.gandhi@gmail.com)
3. Go to Preferences tab
4. Scroll to bottom of Account section
5. Click "Open Dashboard" button
6. Dashboard should load at `/admin/sync-health.html`
7. Metrics should display without errors

## Files Modified

- `src/integrations/sync-health-service.ts` - Fixed oauth_tokens queries to use `provider` column
- `public/js/app.js` - Added admin dashboard link rendering (already completed)
- `public/js/sync-health-dashboard.js` - Fixed localStorage token key (already completed)

## Database Schema Reference

**oauth_tokens table:**
- Uses `provider` column (values: 'google_contacts', 'google_calendar')

**Sync optimization tables:**
- Use `integration_type` column (values: 'google_contacts', 'google_calendar')

## Status

✅ **COMPLETE** - Admin dashboard should now load successfully with metrics.
