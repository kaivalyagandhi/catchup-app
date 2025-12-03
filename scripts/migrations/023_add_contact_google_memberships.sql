-- Migration: Add table to store Google Contact group memberships
-- This allows us to sync group members without additional API calls

CREATE TABLE IF NOT EXISTS contact_google_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    google_group_resource_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique membership per contact per group
    UNIQUE(contact_id, google_group_resource_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_contact_google_memberships_contact 
    ON contact_google_memberships(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_google_memberships_google_group 
    ON contact_google_memberships(google_group_resource_name);
CREATE INDEX IF NOT EXISTS idx_contact_google_memberships_user 
    ON contact_google_memberships(user_id);

-- Comments
COMMENT ON TABLE contact_google_memberships IS 'Stores Google Contact group memberships for each contact';
COMMENT ON COLUMN contact_google_memberships.google_group_resource_name IS 'Google resource name like contactGroups/123';
