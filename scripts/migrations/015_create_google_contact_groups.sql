-- Migration 015: Create Google contact groups mapping table
-- Requirements: 6.1, 6.3
-- This migration creates a table to map Google contact groups to CatchUp groups

-- Create google_contact_groups table
CREATE TABLE IF NOT EXISTS google_contact_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catchup_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    google_resource_name VARCHAR(255) NOT NULL,
    google_name VARCHAR(255) NOT NULL,
    google_etag VARCHAR(255),
    google_group_type VARCHAR(50) DEFAULT 'USER_CONTACT_GROUP',
    member_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_google_group_per_user UNIQUE(user_id, google_resource_name)
);

-- Create index on user_id for efficient lookups by user
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_user_id 
  ON google_contact_groups(user_id);

-- Create index on catchup_group_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_catchup_group_id 
  ON google_contact_groups(catchup_group_id);

-- Create index on google_resource_name for efficient lookups during sync
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_resource_name 
  ON google_contact_groups(google_resource_name);

-- Create index on sync_enabled for filtering active groups
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_sync_enabled 
  ON google_contact_groups(sync_enabled);

-- Add trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_google_contact_groups_updated_at ON google_contact_groups;
CREATE TRIGGER update_google_contact_groups_updated_at 
  BEFORE UPDATE ON google_contact_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table and columns
COMMENT ON TABLE google_contact_groups IS 'Maps Google contact groups to CatchUp groups';
COMMENT ON COLUMN google_contact_groups.catchup_group_id IS 'Reference to corresponding CatchUp group (NULL if not yet created)';
COMMENT ON COLUMN google_contact_groups.google_resource_name IS 'Google contact group resource name (e.g., contactGroups/group123)';
COMMENT ON COLUMN google_contact_groups.google_name IS 'Name of the Google contact group';
COMMENT ON COLUMN google_contact_groups.google_etag IS 'Google ETag for optimistic concurrency control';
COMMENT ON COLUMN google_contact_groups.google_group_type IS 'Type of Google group: USER_CONTACT_GROUP or SYSTEM_CONTACT_GROUP';
COMMENT ON COLUMN google_contact_groups.member_count IS 'Number of contacts in the Google group';
COMMENT ON COLUMN google_contact_groups.last_synced_at IS 'Timestamp of last sync for this group';
COMMENT ON COLUMN google_contact_groups.sync_enabled IS 'Whether this group should be synced';
