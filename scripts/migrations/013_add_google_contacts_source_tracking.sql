-- Migration 013: Add Google Contacts source tracking to contacts table
-- Requirements: 2.4, 5.1
-- This migration adds columns to track contact source and Google-specific metadata

-- Add source column to track where the contact came from
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

-- Add Google-specific metadata columns
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS google_resource_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS google_etag VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Create index on source for filtering contacts by source
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);

-- Create index on google_resource_name for efficient lookups during sync
CREATE INDEX IF NOT EXISTS idx_contacts_google_resource_name ON contacts(google_resource_name);

-- Create unique constraint to prevent duplicate Google contacts per user
-- This ensures we don't import the same Google contact twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_user_google_resource 
  ON contacts(user_id, google_resource_name) 
  WHERE google_resource_name IS NOT NULL;

-- Add comment to document the source column values
COMMENT ON COLUMN contacts.source IS 'Origin of contact: manual, google, calendar, voice_note';
COMMENT ON COLUMN contacts.google_resource_name IS 'Google People API resource name (e.g., people/c1234567890)';
COMMENT ON COLUMN contacts.google_etag IS 'Google ETag for optimistic concurrency control';
COMMENT ON COLUMN contacts.last_synced_at IS 'Timestamp of last sync from Google Contacts';
