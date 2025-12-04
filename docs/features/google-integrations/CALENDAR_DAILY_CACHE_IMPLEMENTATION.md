# Calendar Daily Cache Implementation

## Overview

Implemented a daily calendar event caching system to reduce Google Calendar API calls from ~48/day to 1/day per user, with user-controlled force refresh.

## Changes Made

### 1. Database Layer

**Migration: `scripts/migrations/007_create_calendar_events_table.sql`**
- Created `calendar_events` table to store cached events
- Added `last_calendar_sync` column to `users` table
- Indexes for efficient queries by user, time range, and sync status

**Repository: `src/calendar/calendar-events-repository.ts`**
- `getLastSyncTime()` - Get user's last sync timestamp
- `needsRefresh()` - Check if events need refresh (not synced today)
- `getCachedEvents()` - Retrieve cached events for date range
- `upsertEvents()` - Bulk insert/update events from Google
- `deleteOldEvents()` - Clean up events older than 30 days

### 2. Service Layer

**Updated: `src/calendar/calendar-service.ts`**
- Modified `getFreeTimeSlots()` to check cache first, sync from Google only once per day
- Added `syncEventsToCache()` - Fetch from Google and store in database
- Added `forceRefreshCalendarEvents()` - Bypass daily cache and force sync
- Added `getLastCalendarSync()` - Get last sync time for UI display
- Changed `cachedEventToTimeSlot()` to work with cached event format

### 3. API Layer

**Updated: `src/api/routes/calendar-api.ts`**
- `POST /api/calendar/api/refresh` - Force refresh calendar events
- `GET /api/calendar/api/sync-status` - Get last sync timestamp

### 4. Frontend

**Updated: `public/js/app.js`**
- Added `refreshCalendar()` - Call force refresh API with loading states
- Added `formatRelativeTime()` - Display "2 hours ago" style timestamps
- Updated `loadPreferences()` to fetch and display last sync time
- Added refresh button in calendar integration card with visual feedback

### 5. Types

**Updated: `src/types/index.ts`**
- Updated `CalendarEvent` interface to match new schema with Google event metadata

## How It Works

### Daily Sync Flow

1. User requests calendar data (suggestions, availability, etc.)
2. System checks `last_calendar_sync` timestamp
3. If synced today → use cached events from database
4. If not synced today → fetch from Google API, cache in DB, update timestamp
5. Return processed data to user

### Force Refresh Flow

1. User clicks "Refresh" button in Preferences
2. Frontend calls `POST /api/calendar/api/refresh`
3. Backend invalidates Redis cache
4. Backend fetches fresh events from Google (next 30 days)
5. Backend stores in database with new `synced_at` timestamp
6. Returns event count and last sync time
7. Frontend shows success feedback and reloads preferences

## Benefits

- **Reduced API calls**: From ~48/day to 1/day per user (96% reduction)
- **User control**: Force refresh when calendar changes
- **Transparency**: Shows last sync time in preferences
- **Performance**: Faster responses using cached data
- **Persistence**: Survives server restarts (unlike Redis-only)
- **Cost savings**: Stays well within Google Calendar API quotas

## API Quota Impact

**Before**: 
- Background sync every 30 minutes = 48 requests/day/user
- On-demand requests = variable

**After**:
- Automatic sync once per day = 1 request/day/user
- Force refresh = user-initiated only
- Typical usage: 1-3 requests/day/user

## Testing

1. Connect Google Calendar in Preferences
2. Verify "Last synced" timestamp appears
3. Click "Refresh" button
4. Verify button shows loading state → success
5. Verify timestamp updates
6. Check calendar view updates with fresh data

## Future Enhancements

- Add timezone-aware sync (currently uses UTC for date comparison)
- Implement webhook notifications from Google for real-time updates
- Add sync status indicator in calendar view
- Allow configurable sync frequency per user
