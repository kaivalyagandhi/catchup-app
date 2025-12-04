-- Migration 010: Enhance suggestions schema for group catchup support
-- Requirements: 8.1, 8.3

-- Add type column to suggestions table to distinguish individual vs group suggestions
ALTER TABLE suggestions
    ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'individual';

-- Add constraint to ensure valid type values
ALTER TABLE suggestions
    ADD CONSTRAINT suggestions_type_check CHECK (
        type IN ('individual', 'group')
    );

-- Add shared_context column to store group suggestion metadata
ALTER TABLE suggestions
    ADD COLUMN shared_context JSONB;

-- Add priority column for sorting suggestions
ALTER TABLE suggestions
    ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;

-- Create junction table for suggestions to contacts (supports both individual and group)
CREATE TABLE suggestion_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(suggestion_id, contact_id)
);

-- Create indexes for suggestion_contacts
CREATE INDEX idx_suggestion_contacts_suggestion_id ON suggestion_contacts(suggestion_id);
CREATE INDEX idx_suggestion_contacts_contact_id ON suggestion_contacts(contact_id);

-- Create index for suggestions type
CREATE INDEX idx_suggestions_type ON suggestions(type);

-- Create index for suggestions priority
CREATE INDEX idx_suggestions_priority ON suggestions(priority);

-- Migrate existing suggestions to use the new junction table
-- Each existing suggestion has a contact_id, so create a corresponding entry in suggestion_contacts
INSERT INTO suggestion_contacts (suggestion_id, contact_id)
SELECT id, contact_id
FROM suggestions
WHERE contact_id IS NOT NULL;

-- Note: We keep the contact_id column in suggestions for backward compatibility
-- but new code should use the suggestion_contacts junction table

-- Add comments for documentation
COMMENT ON COLUMN suggestions.type IS 'Type of suggestion: individual (1 contact) or group (2-3 contacts)';
COMMENT ON COLUMN suggestions.shared_context IS 'JSON object containing shared context score and factors for group suggestions';
COMMENT ON COLUMN suggestions.priority IS 'Priority score for sorting suggestions (higher = more important)';

COMMENT ON TABLE suggestion_contacts IS 'Junction table linking suggestions to one or more contacts';
COMMENT ON COLUMN suggestion_contacts.suggestion_id IS 'Reference to the suggestion';
COMMENT ON COLUMN suggestion_contacts.contact_id IS 'Reference to a contact included in this suggestion';
