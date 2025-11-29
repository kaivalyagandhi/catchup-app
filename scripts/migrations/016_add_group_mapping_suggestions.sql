-- Migration 016: Add group mapping suggestion fields
-- Requirements: 6.2, 6.3, 6.5, 6.6, 6.7
-- This migration adds fields for storing AI-generated group mapping suggestions

-- Add mapping suggestion fields to google_contact_groups table
ALTER TABLE google_contact_groups 
  ADD COLUMN IF NOT EXISTS mapping_status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS suggested_action VARCHAR(50),
  ADD COLUMN IF NOT EXISTS suggested_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suggested_group_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS suggestion_reason TEXT;

-- Create index on mapping_status for filtering by status
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_mapping_status 
  ON google_contact_groups(mapping_status);

-- Add comments to document the new columns
COMMENT ON COLUMN google_contact_groups.mapping_status IS 'Approval state: pending, approved, rejected';
COMMENT ON COLUMN google_contact_groups.suggested_action IS 'Recommendation type: create_new or map_to_existing';
COMMENT ON COLUMN google_contact_groups.suggested_group_id IS 'Existing CatchUp group to map to (if applicable)';
COMMENT ON COLUMN google_contact_groups.suggested_group_name IS 'Suggested name for new group (if creating)';
COMMENT ON COLUMN google_contact_groups.confidence_score IS 'AI confidence in the suggestion (0.00-1.00)';
COMMENT ON COLUMN google_contact_groups.suggestion_reason IS 'Human-readable explanation of the suggestion';

