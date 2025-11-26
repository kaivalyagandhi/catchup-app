-- Migration 009: Enhance voice notes schema for real-time transcription and multi-contact support
-- Requirements: 13.1, 13.2, 13.3

-- Drop the old voice_notes table and recreate with enhanced schema
-- Note: This is a breaking change. In production, you would migrate data first.
DROP TABLE IF EXISTS voice_notes CASCADE;

-- Create enhanced voice_notes table with status tracking
CREATE TABLE voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    recording_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    -- Status values: 'recording', 'transcribing', 'extracting', 'ready', 'applied', 'error'
    extracted_entities JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT voice_notes_status_check CHECK (
        status IN ('recording', 'transcribing', 'extracting', 'ready', 'applied', 'error')
    )
);

-- Create junction table for voice note to contacts (many-to-many)
CREATE TABLE voice_note_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voice_note_id UUID NOT NULL REFERENCES voice_notes(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    enrichment_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(voice_note_id, contact_id)
);

-- Create enrichment items table (for tracking what was proposed and accepted)
CREATE TABLE enrichment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voice_note_id UUID NOT NULL REFERENCES voice_notes(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL,
    -- Item types: 'field', 'tag', 'group', 'lastContactDate'
    action VARCHAR(10) NOT NULL,
    -- Actions: 'add', 'update'
    field_name VARCHAR(50),
    value TEXT NOT NULL,
    accepted BOOLEAN DEFAULT TRUE,
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT enrichment_items_type_check CHECK (
        item_type IN ('field', 'tag', 'group', 'lastContactDate')
    ),
    CONSTRAINT enrichment_items_action_check CHECK (
        action IN ('add', 'update')
    )
);

-- Create indexes for voice_notes
CREATE INDEX idx_voice_notes_user_id ON voice_notes(user_id);
CREATE INDEX idx_voice_notes_status ON voice_notes(status);
CREATE INDEX idx_voice_notes_recording_timestamp ON voice_notes(recording_timestamp);
CREATE INDEX idx_voice_notes_created_at ON voice_notes(created_at);

-- Create indexes for voice_note_contacts
CREATE INDEX idx_voice_note_contacts_voice_note_id ON voice_note_contacts(voice_note_id);
CREATE INDEX idx_voice_note_contacts_contact_id ON voice_note_contacts(contact_id);
CREATE INDEX idx_voice_note_contacts_enrichment_applied ON voice_note_contacts(enrichment_applied);

-- Create indexes for enrichment_items
CREATE INDEX idx_enrichment_items_voice_note_id ON enrichment_items(voice_note_id);
CREATE INDEX idx_enrichment_items_contact_id ON enrichment_items(contact_id);
CREATE INDEX idx_enrichment_items_item_type ON enrichment_items(item_type);
CREATE INDEX idx_enrichment_items_accepted ON enrichment_items(accepted);
CREATE INDEX idx_enrichment_items_applied ON enrichment_items(applied);

-- Add trigger to update updated_at timestamp for voice_notes
CREATE TRIGGER update_voice_notes_updated_at 
    BEFORE UPDATE ON voice_notes
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE voice_notes IS 'Stores voice note recordings with real-time transcription support';
COMMENT ON COLUMN voice_notes.status IS 'Processing status: recording, transcribing, extracting, ready, applied, error';
COMMENT ON COLUMN voice_notes.extracted_entities IS 'JSON object containing extracted entities for each contact';

COMMENT ON TABLE voice_note_contacts IS 'Junction table linking voice notes to multiple contacts';
COMMENT ON COLUMN voice_note_contacts.enrichment_applied IS 'Whether enrichment has been applied to this contact';

COMMENT ON TABLE enrichment_items IS 'Tracks individual enrichment proposals and their acceptance status';
COMMENT ON COLUMN enrichment_items.item_type IS 'Type of enrichment: field, tag, group, or lastContactDate';
COMMENT ON COLUMN enrichment_items.action IS 'Action to perform: add or update';
COMMENT ON COLUMN enrichment_items.accepted IS 'Whether user accepted this enrichment item';
COMMENT ON COLUMN enrichment_items.applied IS 'Whether this enrichment has been applied to the contact';
