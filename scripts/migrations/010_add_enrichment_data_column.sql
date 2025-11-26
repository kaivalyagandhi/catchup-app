-- Migration 010: Add enrichment_data column to voice_notes table
-- This stores the enrichment proposal generated from entity extraction

-- Add enrichment_data column to store the full enrichment proposal
ALTER TABLE voice_notes 
ADD COLUMN enrichment_data JSONB;

-- Add index for querying voice notes with enrichment data
CREATE INDEX idx_voice_notes_enrichment_data ON voice_notes USING GIN (enrichment_data);

-- Add comment for documentation
COMMENT ON COLUMN voice_notes.enrichment_data IS 'Stores the enrichment proposal with contact-specific items for review and application';
