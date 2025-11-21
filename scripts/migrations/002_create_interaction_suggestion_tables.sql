-- Migration 002: Create interaction logs, suggestions, voice notes, and google calendars tables
-- Requirements: 5.1-5.5, 9.1-9.5, 10.1-10.5, 21.1-21.4

-- Create interaction_logs table
CREATE TABLE IF NOT EXISTS interaction_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    type interaction_type NOT NULL,
    notes TEXT,
    suggestion_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for interaction_logs
CREATE INDEX idx_interaction_logs_user_id ON interaction_logs(user_id);
CREATE INDEX idx_interaction_logs_contact_id ON interaction_logs(contact_id);
CREATE INDEX idx_interaction_logs_date ON interaction_logs(date);
CREATE INDEX idx_interaction_logs_created_at ON interaction_logs(created_at);
CREATE INDEX idx_interaction_logs_suggestion_id ON interaction_logs(suggestion_id);

-- Create suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    trigger_type trigger_type NOT NULL,
    proposed_timeslot_start TIMESTAMP WITH TIME ZONE NOT NULL,
    proposed_timeslot_end TIMESTAMP WITH TIME ZONE NOT NULL,
    proposed_timeslot_timezone VARCHAR(100) NOT NULL,
    reasoning TEXT NOT NULL,
    status suggestion_status NOT NULL DEFAULT 'pending',
    dismissal_reason TEXT,
    calendar_event_id VARCHAR(255),
    snoozed_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for suggestions
CREATE INDEX idx_suggestions_user_id ON suggestions(user_id);
CREATE INDEX idx_suggestions_contact_id ON suggestions(contact_id);
CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_trigger_type ON suggestions(trigger_type);
CREATE INDEX idx_suggestions_created_at ON suggestions(created_at);
CREATE INDEX idx_suggestions_snoozed_until ON suggestions(snoozed_until);

-- Create voice_notes table
CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    transcript TEXT NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    extracted_entities JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for voice_notes
CREATE INDEX idx_voice_notes_user_id ON voice_notes(user_id);
CREATE INDEX idx_voice_notes_contact_id ON voice_notes(contact_id);
CREATE INDEX idx_voice_notes_processed ON voice_notes(processed);
CREATE INDEX idx_voice_notes_created_at ON voice_notes(created_at);

-- Create google_calendars table
CREATE TABLE IF NOT EXISTS google_calendars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    selected BOOLEAN DEFAULT FALSE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, calendar_id)
);

-- Create indexes for google_calendars
CREATE INDEX idx_google_calendars_user_id ON google_calendars(user_id);
CREATE INDEX idx_google_calendars_selected ON google_calendars(selected);
CREATE INDEX idx_google_calendars_calendar_id ON google_calendars(calendar_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_suggestions_updated_at BEFORE UPDATE ON suggestions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_calendars_updated_at BEFORE UPDATE ON google_calendars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint for interaction_logs.suggestion_id
-- (done separately to allow NULL values and avoid circular dependency)
ALTER TABLE interaction_logs
    ADD CONSTRAINT fk_interaction_logs_suggestion_id
    FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE SET NULL;
