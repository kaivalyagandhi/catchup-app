-- Migration 014: Create Google Contacts sync state table
-- Requirements: 2.5, 3.5, 8.1
-- This migration creates a table to track synchronization state per user

-- Create google_contacts_sync_state table
CREATE TABLE IF NOT EXISTS google_contacts_sync_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sync_token TEXT,
    last_full_sync_at TIMESTAMP WITH TIME ZONE,
    last_incremental_sync_at TIMESTAMP WITH TIME ZONE,
    total_contacts_synced INTEGER DEFAULT 0,
    last_sync_status VARCHAR(50) DEFAULT 'pending',
    last_sync_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_sync_state_per_user UNIQUE(user_id)
);

-- Create index on user_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_google_contacts_sync_state_user_id 
  ON google_contacts_sync_state(user_id);

-- Create index on last_sync_status for monitoring queries
CREATE INDEX IF NOT EXISTS idx_google_contacts_sync_state_status 
  ON google_contacts_sync_state(last_sync_status);

-- Add trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_google_contacts_sync_state_updated_at ON google_contacts_sync_state;
CREATE TRIGGER update_google_contacts_sync_state_updated_at 
  BEFORE UPDATE ON google_contacts_sync_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table and columns
COMMENT ON TABLE google_contacts_sync_state IS 'Tracks Google Contacts synchronization state per user';
COMMENT ON COLUMN google_contacts_sync_state.sync_token IS 'Google sync token for incremental synchronization';
COMMENT ON COLUMN google_contacts_sync_state.last_full_sync_at IS 'Timestamp of last full synchronization';
COMMENT ON COLUMN google_contacts_sync_state.last_incremental_sync_at IS 'Timestamp of last incremental synchronization';
COMMENT ON COLUMN google_contacts_sync_state.total_contacts_synced IS 'Total number of contacts synced from Google';
COMMENT ON COLUMN google_contacts_sync_state.last_sync_status IS 'Status of last sync: pending, in_progress, success, failed';
COMMENT ON COLUMN google_contacts_sync_state.last_sync_error IS 'Error message from last failed sync';
