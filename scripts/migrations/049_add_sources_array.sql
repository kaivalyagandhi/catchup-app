-- Migration 049: Add sources array to contacts table
-- Requirements: 18.1, 18.6
-- Migrates from single source field to sources TEXT[] array for multi-platform tracking

-- Add sources array column with empty array default
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sources TEXT[] DEFAULT '{}';

-- Copy existing source values into sources array
UPDATE contacts SET sources = ARRAY[source] WHERE source IS NOT NULL AND (sources IS NULL OR sources = '{}');

-- Create GIN index for efficient array containment queries
CREATE INDEX IF NOT EXISTS idx_contacts_sources ON contacts USING GIN (sources);

-- Note: Keep old source column for backward compatibility (do not drop)
-- ALTER TABLE contacts DROP COLUMN source;
