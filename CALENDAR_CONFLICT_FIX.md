# Calendar Conflict Fix - Implementation Summary

## Problem
Suggestions were being generated over existing Google Calendar events because:
1. Calendar events weren't being checked when generating available time slots
2. The availability service only filtered by user preferences (manual blocks, commute, nighttime) but not by actual calendar busy times
3. No mechanism existed to regenerate suggestions when calendar data changed

## Solution

### 1. Enhanced Availability Service
**File: `src/calendar/availability-service.ts`**

Added new functions to filter slots by calendar events:
- `filterByCalendarEvents()` - Removes time slots that overlap with busy calendar events
- `getAvailableSlots()` - Main function that combines calendar event filtering with user preference filtering
- `generatePotentialSlots()` - Creates potential time slots during reasonable hours (9 AM - 9 PM)
- `slotsOverlap()` - Helper to detect time slot conflicts

These functions ensure suggestions are only made during truly free time by:
1. Fetching cached calendar events from the database
2. Converting busy events to time slots
3. Filtering out any potential slots that overlap with busy times
4. Applying user availability preferences on top

### 2. Suggestion Regeneration Job
**File: `src/jobs/processors/suggestion-regeneration.ts`**

Created a new background job processor that:
1. Fetches all pending suggestions for a user
2. Gets calendar events for the next 30 days
3. Checks each suggestion for conflicts with calendar events
4. Auto-dismisses conflicting suggestions with reason: "Conflicts with calendar event (auto-dismissed after sync)"
5. Generates new suggestions for available time slots
6. Limits to top 10 slots to avoid overwhelming users

### 3. Queue Infrastructure
**Files: `src/jobs/queue.ts`, `src/jobs/worker.ts`**

Added suggestion regeneration queue:
- Created `suggestionRegenerationQueue` with Bull
- Registered processor in worker
- Added `enqueueJob()` helper function for easy job enqueueing
- Configured error handling and logging

### 4. Trigger Points

#### Calendar Refresh Endpoint
**File: `src/api/routes/calendar-api.ts`**

Updated `POST /api/calendar/refresh` to:
- Sync calendar events from Google
- Enqueue suggestion regeneration job
- Return status including `suggestionRegenerationQueued: true`

#### OAuth Callback
**File: `src/api/routes/google-calendar-oauth.ts`**

Updated OAuth callback to:
- Perform initial calendar sync after connection
- Enqueue suggestion regeneration job
- Ensures suggestions are generated with calendar awareness from the start

## How It Works

### Initial Calendar Connection
1. User connects Google Calendar via OAuth
2. System syncs calendar events (next 30 days)
3. Background job regenerates suggestions avoiding busy times

### Ongoing Calendar Syncs
1. User clicks "Refresh Calendar" or system auto-syncs daily
2. New events are fetched and cached
3. Background job:
   - Dismisses suggestions that now conflict with events
   - Generates new suggestions for newly available slots

### Suggestion Generation
1. System generates potential time slots (9 AM - 9 PM)
2. Filters out slots overlapping with calendar events
3. Applies user preferences (manual blocks, commute, nighttime)
4. Creates suggestions only for truly free time

## Benefits

1. **No More Conflicts**: Suggestions never overlap with calendar events
2. **Automatic Updates**: When calendar changes, suggestions update automatically
3. **User Control**: Still respects user availability preferences
4. **Background Processing**: Regeneration happens asynchronously without blocking
5. **Audit Trail**: Auto-dismissed suggestions include clear reason

## Testing

To test the fix:

1. **Connect Calendar**:
   ```bash
   # Connect Google Calendar via UI
   # Check that suggestions are generated
   ```

2. **Add Calendar Event**:
   ```bash
   # Add event in Google Calendar
   # Click "Refresh Calendar" in CatchUp
   # Verify conflicting suggestions are dismissed
   ```

3. **Check Logs**:
   ```bash
   # Look for:
   # [SuggestionRegeneration] Starting for user...
   # [SuggestionRegeneration] Dismissed X conflicting suggestions
   # [SuggestionRegeneration] Generated X new suggestions
   ```

## API Changes

### POST /api/calendar/refresh
**Response now includes**:
```json
{
  "success": true,
  "eventCount": 15,
  "lastSync": "2025-11-27T10:30:00Z",
  "message": "Synced 15 events from 1 calendar(s)",
  "suggestionRegenerationQueued": true
}
```

## Database Impact

No schema changes required. Uses existing tables:
- `calendar_events` - Cached calendar events
- `suggestions` - Suggestion records with status updates
- `users` - Last sync timestamp

## Performance Considerations

1. **Caching**: Calendar events cached daily, reducing API calls
2. **Background Jobs**: Regeneration happens asynchronously
3. **Batch Limits**: Only top 10 slots processed to avoid overload
4. **Efficient Queries**: Uses indexed queries on date ranges

## Future Enhancements

1. Add user notification when suggestions are auto-dismissed
2. Support custom time ranges for potential slots
3. Add timezone-aware slot generation
4. Implement smart rescheduling (suggest alternative times for dismissed suggestions)
