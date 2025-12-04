-- Migration 024: Add excluded_members field to group mappings
-- Requirements: 15.6, 15.7, 15.8
-- This migration adds support for tracking members excluded by users during mapping approval

-- Add excluded_members field to google_contact_groups table
ALTER TABLE google_contact_groups 
  ADD COLUMN IF NOT EXISTS excluded_members TEXT[] DEFAULT '{}';

-- Create index for querying excluded members
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_excluded_members 
  ON google_contact_groups USING GIN (excluded_members);

-- Add comment to document the new column
COMMENT ON COLUMN google_contact_groups.excluded_members IS 'Array of Google contact resource names that user excluded from this group mapping. Used to prevent re-adding during future syncs.';
