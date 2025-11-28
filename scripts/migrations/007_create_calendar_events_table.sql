/**
 * Migration 007: Create calendar_events table
 * 
 * Stores cached calendar events from Google Calendar to reduce API calls.
 * Events are synced once per day per user, with force refresh option.
 */

-- Calendar events cache table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255) NOT NULL,
    calendar_id VARCHAR(255) NOT NULL,
    summary VARCHAR(500),
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    is_busy BOOLEAN DEFAULT true,
    location VARCHAR(500),
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure we don't duplicate events for the same user
    UNIQUE(user_id, google_event_id)
);

-- Index for efficient queries by user and time range
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time 
    ON calendar_events(user_id, start_time, end_time);

-- Index for checking last sync time
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_synced 
    ON calendar_events(user_id, synced_at DESC);

-- Index for calendar-specific queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar 
    ON calendar_events(user_id, calendar_id);

-- Add last_calendar_sync timestamp to users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMP WITH TIME ZONE;

COMMENT ON TABLE calendar_events IS 'Cached calendar events from Google Calendar to reduce API calls';
COMMENT ON COLUMN calendar_events.synced_at IS 'When this event was last synced from Google Calendar';
COMMENT ON COLUMN users.last_calendar_sync IS 'Last time calendar events were synced for this user';
