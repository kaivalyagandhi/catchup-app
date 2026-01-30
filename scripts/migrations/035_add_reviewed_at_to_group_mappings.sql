-- Migration 035: Add reviewed_at timestamp to google_contact_groups
-- Requirements: Groups & Preferences UI Improvements - 1.2
-- This migration adds a timestamp to track when group mappings were reviewed

-- Add reviewed_at column to google_contact_groups table
ALTER TABLE google_contact_groups 
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create index for user_id and mapping_status for efficient reviewed mappings queries
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_user_status 
  ON google_contact_groups(user_id, mapping_status);

-- Add comment to document the new column
COMMENT ON COLUMN google_contact_groups.reviewed_at IS 'Timestamp when the mapping was reviewed (accepted or rejected) by the user';
