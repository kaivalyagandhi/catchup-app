-- Migration 019: Add user_id to enrichment_items
-- This migration adds a user_id column to enrichment_items to support
-- SMS/MMS enrichments that are not tied to voice notes
-- Requirement 10.5: Account deletion cascade

-- Add user_id column (nullable initially for existing records)
ALTER TABLE enrichment_items 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Backfill user_id from voice_notes for existing records
UPDATE enrichment_items ei
SET user_id = vn.user_id
FROM voice_notes vn
WHERE ei.voice_note_id = vn.id
AND ei.user_id IS NULL;

-- Make voice_note_id nullable (for SMS/MMS enrichments without voice notes)
ALTER TABLE enrichment_items 
    ALTER COLUMN voice_note_id DROP NOT NULL;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_enrichment_items_user_id ON enrichment_items(user_id);

-- Add comment
COMMENT ON COLUMN enrichment_items.user_id IS 'User who owns this enrichment item (for SMS/MMS enrichments without voice notes)';
COMMENT ON COLUMN enrichment_items.voice_note_id IS 'Voice note ID (nullable for SMS/MMS enrichments)';
