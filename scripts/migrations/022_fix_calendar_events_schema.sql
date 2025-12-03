-- Migration: Fix calendar_events table schema
-- Adds missing columns required by the calendar sync service

-- Add missing columns if they don't exist
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS calendar_id VARCHAR(255);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS summary VARCHAR(500);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS location VARCHAR(500);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS attendees JSONB;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT false;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT true;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Make title nullable since the code uses summary instead
ALTER TABLE calendar_events ALTER COLUMN title DROP NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_user_google_event ON calendar_events(user_id, google_event_id);

-- Add comment to document the schema
COMMENT ON TABLE calendar_events IS 'Stores calendar events synced from Google Calendar and other sources';
COMMENT ON COLUMN calendar_events.google_event_id IS 'Unique event ID from Google Calendar';
COMMENT ON COLUMN calendar_events.calendar_id IS 'Calendar ID from Google Calendar';
COMMENT ON COLUMN calendar_events.summary IS 'Event title/summary (primary field used by sync service)';
COMMENT ON COLUMN calendar_events.title IS 'Legacy title field (nullable, summary is preferred)';
COMMENT ON COLUMN calendar_events.is_all_day IS 'Whether this is an all-day event';
COMMENT ON COLUMN calendar_events.is_busy IS 'Whether this event marks the user as busy';
COMMENT ON COLUMN calendar_events.synced_at IS 'When this event was last synced from the source';
