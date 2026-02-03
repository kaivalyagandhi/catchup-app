-- Migration: Create sync_schedule table for adaptive sync frequency management
-- Requirements: 5.6

-- Create sync_schedule table
CREATE TABLE IF NOT EXISTS sync_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  current_frequency_ms BIGINT NOT NULL,
  default_frequency_ms BIGINT NOT NULL,
  min_frequency_ms BIGINT NOT NULL,
  max_frequency_ms BIGINT NOT NULL,
  consecutive_no_changes INTEGER NOT NULL DEFAULT 0,
  last_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sync_schedule_user_integration ON sync_schedule(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_sync_schedule_next_sync ON sync_schedule(next_sync_at, integration_type);

-- Add comments for documentation
COMMENT ON TABLE sync_schedule IS 'Manages adaptive sync frequency per user and integration based on change detection';
COMMENT ON COLUMN sync_schedule.current_frequency_ms IS 'Current sync frequency in milliseconds (adapts based on changes)';
COMMENT ON COLUMN sync_schedule.default_frequency_ms IS 'Default sync frequency to restore when changes are detected';
COMMENT ON COLUMN sync_schedule.min_frequency_ms IS 'Minimum allowed sync frequency (longest interval)';
COMMENT ON COLUMN sync_schedule.max_frequency_ms IS 'Maximum allowed sync frequency (shortest interval)';
COMMENT ON COLUMN sync_schedule.consecutive_no_changes IS 'Counter for consecutive syncs with no changes (triggers frequency reduction)';
COMMENT ON COLUMN sync_schedule.last_sync_at IS 'Timestamp of last completed sync';
COMMENT ON COLUMN sync_schedule.next_sync_at IS 'Timestamp when next sync should occur';
