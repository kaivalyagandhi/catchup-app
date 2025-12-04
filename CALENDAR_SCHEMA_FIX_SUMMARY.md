# Calendar Events Schema Fix

## Problem

The `calendar_events` table was missing several columns required by the calendar sync service, causing sync failures for all users.

## Root Cause

The original migration (`007_create_calendar_events_table.sql`) created a basic schema, but the calendar sync service evolved to require additional columns that were never added via migration.

## Missing Columns

The following columns were missing:
- `google_event_id` - Unique event ID from Google Calendar
- `calendar_id` - Calendar ID from Google Calendar  
- `summary` - Event title/summary (primary field used by sync)
- `description` - Event description
- `location` - Event location
- `attendees` - Event attendees (JSONB)
- `is_all_day` - Whether event is all-day
- `is_busy` - Whether event marks user as busy
- `synced_at` - Last sync timestamp
- `updated_at` - Last update timestamp

## Additional Issues

- `title` column had NOT NULL constraint but code uses `summary` instead
- Missing unique constraint on `(user_id, google_event_id)` for upsert operations
- Missing indexes on `google_event_id` and `calendar_id`

## Solution

Created migration `022_fix_calendar_events_schema.sql` that:

1. ✅ Adds all missing columns with `IF NOT EXISTS` (safe to run multiple times)
2. ✅ Makes `title` nullable since code uses `summary`
3. ✅ Creates unique index on `(user_id, google_event_id)` for efficient upserts
4. ✅ Creates indexes on `google_event_id` and `calendar_id` for better query performance
5. ✅ Adds documentation comments to clarify column usage

## Impact

- ✅ **New users**: Will have correct schema from initial setup
- ✅ **Existing users**: Migration is idempotent and safe to run
- ✅ **Calendar sync**: Now works correctly for all users
- ✅ **Performance**: Indexes improve query performance

## How to Apply

### For New Installations

Run the standard migration script:
```bash
npm run db:migrate
```

### For Existing Installations

The migration will be automatically applied when running:
```bash
npm run db:migrate
```

Or apply manually:
```bash
psql -h localhost -U postgres -d catchup_db -f scripts/migrations/022_fix_calendar_events_schema.sql
```

## Verification

Check that all columns exist:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'calendar_events' 
ORDER BY ordinal_position;
```

Expected columns:
- id, user_id, title (nullable), start_time, end_time, timezone
- is_available, source, created_at
- google_event_id, calendar_id, summary, description, location
- attendees, is_all_day, is_busy, synced_at, updated_at

## Testing

After applying the migration:

1. ✅ Connect Google Calendar in Preferences
2. ✅ Click "Sync Now"
3. ✅ Verify events are synced successfully
4. ✅ Check "Last synced" timestamp updates
5. ✅ No errors in server logs

## Future Prevention

To prevent similar issues:

1. **Schema validation**: Add a startup check that validates required columns exist
2. **Migration testing**: Test migrations on fresh database before deploying
3. **Documentation**: Keep schema documentation in sync with code
4. **Code review**: Review database queries when adding new features

## Related Files

- `scripts/migrations/022_fix_calendar_events_schema.sql` - The migration
- `scripts/run-migrations.sh` - Updated to include new migration (and all missing migrations 013-021)
- `src/calendar/calendar-events-repository.ts` - Uses these columns
- `src/calendar/calendar-service.ts` - Calendar sync service

## Migration Order

The migration runner now includes all migrations in order:
- 001-012: Original migrations
- 013-021: Previously missing from runner script (now added)
- **022: Calendar events schema fix (NEW)**

## Status

✅ **Fixed** - Migration created and tested
✅ **Integrated** - Added to migration runner as #022
✅ **Documented** - This summary created
✅ **Verified** - Tested with actual Google Calendar sync
✅ **No Conflicts** - Properly numbered after migration 021

---

**Created**: December 2, 2024  
**Migration**: 022_fix_calendar_events_schema.sql  
**Status**: Complete
