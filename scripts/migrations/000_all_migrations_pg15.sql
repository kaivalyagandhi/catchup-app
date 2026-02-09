-- ============================================================================
-- CatchUp Database Migrations - PostgreSQL 15 Compatible
-- ============================================================================
-- This file consolidates all 46 migrations into a single, clean script
-- that can be run on PostgreSQL 15 (Cloud SQL).
--
-- IMPORTANT: Run this file in the Cloud Console SQL editor or via psql.
-- All statements use IF NOT EXISTS / IF EXISTS for idempotency.
--
-- Generated: 2026-02-09
-- ============================================================================

-- ============================================================================
-- PART 0: Create required ENUM types and helper functions
-- ============================================================================

-- Create frequency_option enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'frequency_option') THEN
        CREATE TYPE frequency_option AS ENUM (
            'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'flexible', 'na'
        );
    END IF;
END$$;

-- Create tag_source enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tag_source') THEN
        CREATE TYPE tag_source AS ENUM ('manual', 'ai', 'voice_note', 'import', 'ai_edit');
    END IF;
END$$;

-- Create interaction_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_type') THEN
        CREATE TYPE interaction_type AS ENUM (
            'call', 'text', 'email', 'in_person', 'video_call', 'social_media', 'other'
        );
    END IF;
END$$;

-- Create trigger_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trigger_type') THEN
        CREATE TYPE trigger_type AS ENUM (
            'time_based', 'event_based', 'interest_match', 'availability_match', 'manual'
        );
    END IF;
END$$;

-- Create suggestion_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'suggestion_status') THEN
        CREATE TYPE suggestion_status AS ENUM (
            'pending', 'accepted', 'dismissed', 'snoozed', 'expired'
        );
    END IF;
END$$;

-- Create helper function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 1: Users table (must be created first - other tables reference it)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    google_id VARCHAR(255) UNIQUE,
    auth_provider VARCHAR(50) DEFAULT 'email',
    profile_picture_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_test_user BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    admin_promoted_at TIMESTAMP,
    admin_promoted_by VARCHAR(255),
    last_calendar_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add columns that may be missing from older table versions (from migrations 012, 021, 032, 038)
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_promoted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_promoted_by VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_is_test_user ON users(is_test_user);
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;


-- ============================================================================
-- PART 2: Core tables (contacts, groups, tags)
-- ============================================================================

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    linked_in VARCHAR(255),
    instagram VARCHAR(255),
    x_handle VARCHAR(255),
    other_social_media JSONB,
    location VARCHAR(255),
    timezone VARCHAR(100),
    custom_notes TEXT,
    last_contact_date TIMESTAMP WITH TIME ZONE,
    frequency_preference frequency_option,
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    source VARCHAR(50) DEFAULT 'manual',
    google_resource_name VARCHAR(255),
    google_etag VARCHAR(255),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    dunbar_circle VARCHAR(20),
    circle_assigned_at TIMESTAMP WITH TIME ZONE,
    circle_confidence DECIMAL(3,2),
    ai_suggested_circle VARCHAR(20),
    circle_assigned_by VARCHAR(10) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contacts_dunbar_circle_check CHECK (dunbar_circle IN ('inner', 'close', 'active', 'casual')),
    CONSTRAINT contacts_ai_suggested_circle_check CHECK (ai_suggested_circle IN ('inner', 'close', 'active', 'casual'))
);

-- Add columns that may be missing from older table versions (from migrations 013, 017, 030, 032)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS google_resource_name VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS google_etag VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dunbar_circle VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS circle_assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS circle_confidence DECIMAL(3,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_suggested_circle VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS circle_assigned_by VARCHAR(10) DEFAULT 'user';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_archived ON contacts(archived);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact_date ON contacts(last_contact_date);
CREATE INDEX IF NOT EXISTS idx_contacts_user_archived ON contacts(user_id, archived);
CREATE INDEX IF NOT EXISTS idx_contacts_user_last_contact ON contacts(user_id, last_contact_date);
CREATE INDEX IF NOT EXISTS idx_contacts_user_archived_last_contact ON contacts(user_id, archived, last_contact_date);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_google_resource_name ON contacts(google_resource_name);
CREATE INDEX IF NOT EXISTS idx_contacts_dunbar_circle ON contacts(user_id, dunbar_circle) WHERE dunbar_circle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_archived_at ON contacts(user_id, archived_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_user_google_resource 
    ON contacts(user_id, google_resource_name) 
    WHERE google_resource_name IS NOT NULL;

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_promoted_from_tag BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_group_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_archived ON groups(archived);
CREATE INDEX IF NOT EXISTS idx_groups_user_archived ON groups(user_id, archived);

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Contact_groups junction table
CREATE TABLE IF NOT EXISTS contact_groups (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (contact_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_groups_contact_id ON contact_groups(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_groups_group_id ON contact_groups(group_id);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text VARCHAR(100) NOT NULL,
    source tag_source NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_text ON tags(text);
CREATE INDEX IF NOT EXISTS idx_tags_source ON tags(source);
CREATE UNIQUE INDEX IF NOT EXISTS unique_tag_text_per_user ON tags(user_id, LOWER(text));
CREATE INDEX IF NOT EXISTS idx_tags_user_text_lower ON tags(user_id, LOWER(text));

-- Contact_tags junction table
CREATE TABLE IF NOT EXISTS contact_tags (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_id ON contact_tags(tag_id);


-- ============================================================================
-- PART 3: Suggestions, Interaction Logs, Voice Notes
-- ============================================================================

-- Suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    trigger_type trigger_type NOT NULL,
    proposed_timeslot_start TIMESTAMP WITH TIME ZONE NOT NULL,
    proposed_timeslot_end TIMESTAMP WITH TIME ZONE NOT NULL,
    proposed_timeslot_timezone VARCHAR(100) NOT NULL,
    reasoning TEXT NOT NULL,
    status suggestion_status NOT NULL DEFAULT 'pending',
    dismissal_reason TEXT,
    calendar_event_id VARCHAR(255),
    snoozed_until TIMESTAMP WITH TIME ZONE,
    type VARCHAR(20) NOT NULL DEFAULT 'individual',
    shared_context JSONB,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT suggestions_type_check CHECK (type IN ('individual', 'group'))
);

CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_contact_id ON suggestions(contact_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_trigger_type ON suggestions(trigger_type);
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON suggestions(created_at);
CREATE INDEX IF NOT EXISTS idx_suggestions_snoozed_until ON suggestions(snoozed_until);
CREATE INDEX IF NOT EXISTS idx_suggestions_user_status ON suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_suggestions_user_status_created ON suggestions(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_status_snoozed_until ON suggestions(status, snoozed_until) WHERE status = 'snoozed';
CREATE INDEX IF NOT EXISTS idx_suggestions_type ON suggestions(type);
CREATE INDEX IF NOT EXISTS idx_suggestions_priority ON suggestions(priority);

DROP TRIGGER IF EXISTS update_suggestions_updated_at ON suggestions;
CREATE TRIGGER update_suggestions_updated_at BEFORE UPDATE ON suggestions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Suggestion_contacts junction table
CREATE TABLE IF NOT EXISTS suggestion_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(suggestion_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_suggestion_contacts_suggestion_id ON suggestion_contacts(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_contacts_contact_id ON suggestion_contacts(contact_id);

-- Interaction_logs table
CREATE TABLE IF NOT EXISTS interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    type interaction_type NOT NULL,
    notes TEXT,
    suggestion_id UUID REFERENCES suggestions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interaction_logs_user_id ON interaction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_contact_id ON interaction_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_date ON interaction_logs(date);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_at ON interaction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_suggestion_id ON interaction_logs(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_user_date ON interaction_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_contact_date ON interaction_logs(contact_id, date DESC);

-- Voice_notes table
CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    recording_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    extracted_entities JSONB,
    enrichment_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT voice_notes_status_check CHECK (
        status IN ('recording', 'transcribing', 'extracting', 'ready', 'applied', 'error')
    )
);

CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_status ON voice_notes(status);
CREATE INDEX IF NOT EXISTS idx_voice_notes_recording_timestamp ON voice_notes(recording_timestamp);
CREATE INDEX IF NOT EXISTS idx_voice_notes_created_at ON voice_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_notes_user_processed ON voice_notes(user_id, status) WHERE status != 'applied';
CREATE INDEX IF NOT EXISTS idx_voice_notes_enrichment_data ON voice_notes USING GIN (enrichment_data);

DROP TRIGGER IF EXISTS update_voice_notes_updated_at ON voice_notes;
CREATE TRIGGER update_voice_notes_updated_at BEFORE UPDATE ON voice_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Voice_note_contacts junction table
CREATE TABLE IF NOT EXISTS voice_note_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voice_note_id UUID NOT NULL REFERENCES voice_notes(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    enrichment_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(voice_note_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_voice_note_contacts_voice_note_id ON voice_note_contacts(voice_note_id);
CREATE INDEX IF NOT EXISTS idx_voice_note_contacts_contact_id ON voice_note_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_voice_note_contacts_enrichment_applied ON voice_note_contacts(enrichment_applied);

-- Enrichment_items table
CREATE TABLE IF NOT EXISTS enrichment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    voice_note_id UUID REFERENCES voice_notes(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL,
    action VARCHAR(10) NOT NULL,
    field_name VARCHAR(50),
    value TEXT NOT NULL,
    accepted BOOLEAN DEFAULT TRUE,
    applied BOOLEAN DEFAULT FALSE,
    source VARCHAR(50) DEFAULT 'web',
    source_metadata JSONB,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT enrichment_items_type_check CHECK (
        item_type IN ('field', 'tag', 'group', 'lastContactDate')
    ),
    CONSTRAINT enrichment_items_action_check CHECK (
        action IN ('add', 'update')
    )
);

-- Add columns that may be missing from older table versions
ALTER TABLE enrichment_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE enrichment_items ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'web';
ALTER TABLE enrichment_items ADD COLUMN IF NOT EXISTS source_metadata JSONB;
ALTER TABLE enrichment_items ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_enrichment_items_voice_note_id ON enrichment_items(voice_note_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_items_contact_id ON enrichment_items(contact_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_items_item_type ON enrichment_items(item_type);
CREATE INDEX IF NOT EXISTS idx_enrichment_items_accepted ON enrichment_items(accepted);
CREATE INDEX IF NOT EXISTS idx_enrichment_items_applied ON enrichment_items(applied);
CREATE INDEX IF NOT EXISTS idx_enrichment_items_user_id ON enrichment_items(user_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_items_source ON enrichment_items(source);
CREATE INDEX IF NOT EXISTS idx_enrichment_items_source_metadata ON enrichment_items USING GIN (source_metadata);
CREATE INDEX IF NOT EXISTS idx_enrichment_items_user_status ON enrichment_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_enrichment_items_created_at ON enrichment_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_items_user_source_status ON enrichment_items(user_id, source, status);
CREATE INDEX IF NOT EXISTS idx_enrichment_items_pending ON enrichment_items(user_id, created_at DESC) WHERE status = 'pending';


-- ============================================================================
-- PART 4: OAuth Tokens, Audit Logs, Calendar Events, Preferences
-- ============================================================================

-- Availability params table
CREATE TABLE IF NOT EXISTS availability_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    manual_time_blocks JSONB,
    commute_windows JSONB,
    nighttime_start VARCHAR(5),
    nighttime_end VARCHAR(5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_availability_params_user_id ON availability_params(user_id);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    batch_day INTEGER DEFAULT 0,
    batch_time VARCHAR(5) DEFAULT '09:00',
    timezone VARCHAR(100) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    CONSTRAINT batch_day_check CHECK (batch_day >= 0 AND batch_day <= 6)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- OAuth tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_oauth_per_user_provider UNIQUE(user_id, provider)
);

-- Add columns that may be missing from older table versions (from migration 006)
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_email ON oauth_tokens(email);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action_time ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_failed_attempts ON audit_logs(user_id, action, success, created_at) WHERE success = false;

-- Calendar events cache table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255) NOT NULL,
    calendar_id VARCHAR(255) NOT NULL,
    summary VARCHAR(500),
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    is_busy BOOLEAN DEFAULT true,
    location VARCHAR(500),
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, google_event_id)
);

-- Add columns that may be missing from older table versions (from migration 022)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS calendar_id VARCHAR(255);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS summary VARCHAR(500);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS location VARCHAR(500);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT false;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT true;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time ON calendar_events(user_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_synced ON calendar_events(user_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar ON calendar_events(user_id, calendar_id);

-- Google calendars table
CREATE TABLE IF NOT EXISTS google_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_primary BOOLEAN DEFAULT false,
    selected BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_google_calendars_user_id ON google_calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendars_selected ON google_calendars(user_id, selected) WHERE selected = true;


-- ============================================================================
-- PART 5: Google Contacts Sync
-- ============================================================================

-- Google contacts sync state table
CREATE TABLE IF NOT EXISTS google_contacts_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sync_token TEXT,
    last_full_sync_at TIMESTAMP WITH TIME ZONE,
    last_incremental_sync_at TIMESTAMP WITH TIME ZONE,
    total_contacts_synced INTEGER DEFAULT 0,
    last_sync_status VARCHAR(50) DEFAULT 'pending',
    last_sync_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_sync_state_per_user UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_google_contacts_sync_state_user_id ON google_contacts_sync_state(user_id);
CREATE INDEX IF NOT EXISTS idx_google_contacts_sync_state_status ON google_contacts_sync_state(last_sync_status);

DROP TRIGGER IF EXISTS update_google_contacts_sync_state_updated_at ON google_contacts_sync_state;
CREATE TRIGGER update_google_contacts_sync_state_updated_at 
    BEFORE UPDATE ON google_contacts_sync_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Google contact groups table
CREATE TABLE IF NOT EXISTS google_contact_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catchup_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    google_resource_name VARCHAR(255) NOT NULL,
    google_name VARCHAR(255) NOT NULL,
    google_etag VARCHAR(255),
    google_group_type VARCHAR(50) DEFAULT 'USER_CONTACT_GROUP',
    member_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_enabled BOOLEAN DEFAULT TRUE,
    mapping_status VARCHAR(50) DEFAULT 'pending',
    suggested_action VARCHAR(50),
    suggested_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    suggested_group_name VARCHAR(255),
    confidence_score DECIMAL(3,2),
    suggestion_reason TEXT,
    excluded_members TEXT[] DEFAULT '{}',
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_google_group_per_user UNIQUE(user_id, google_resource_name)
);

-- Add columns that may be missing from older table versions (from migrations 016, 024, 035)
ALTER TABLE google_contact_groups ADD COLUMN IF NOT EXISTS mapping_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE google_contact_groups ADD COLUMN IF NOT EXISTS suggested_action VARCHAR(50);
ALTER TABLE google_contact_groups ADD COLUMN IF NOT EXISTS suggested_group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
ALTER TABLE google_contact_groups ADD COLUMN IF NOT EXISTS suggested_group_name VARCHAR(255);
ALTER TABLE google_contact_groups ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);
ALTER TABLE google_contact_groups ADD COLUMN IF NOT EXISTS suggestion_reason TEXT;
ALTER TABLE google_contact_groups ADD COLUMN IF NOT EXISTS excluded_members TEXT[] DEFAULT '{}';
ALTER TABLE google_contact_groups ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_google_contact_groups_user_id ON google_contact_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_catchup_group_id ON google_contact_groups(catchup_group_id);
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_resource_name ON google_contact_groups(google_resource_name);
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_sync_enabled ON google_contact_groups(sync_enabled);
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_mapping_status ON google_contact_groups(mapping_status);
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_user_status ON google_contact_groups(user_id, mapping_status);
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_excluded_members ON google_contact_groups USING GIN (excluded_members);

DROP TRIGGER IF EXISTS update_google_contact_groups_updated_at ON google_contact_groups;
CREATE TRIGGER update_google_contact_groups_updated_at 
    BEFORE UPDATE ON google_contact_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Contact Google memberships table
CREATE TABLE IF NOT EXISTS contact_google_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    google_group_resource_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contact_id, google_group_resource_name)
);

CREATE INDEX IF NOT EXISTS idx_contact_google_memberships_contact ON contact_google_memberships(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_google_memberships_google_group ON contact_google_memberships(google_group_resource_name);
CREATE INDEX IF NOT EXISTS idx_contact_google_memberships_user ON contact_google_memberships(user_id);


-- ============================================================================
-- PART 6: Onboarding Schema (Simplified 3-Step System)
-- ============================================================================

-- Drop old onboarding_state table if it exists (migration 030 replaces it with new schema)
-- The old schema from migration 017 is incompatible with the new simplified 3-step system
DROP TABLE IF EXISTS onboarding_state CASCADE;

-- Onboarding state table (simplified 3-step system from migration 030)
CREATE TABLE IF NOT EXISTS onboarding_state (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_complete BOOLEAN DEFAULT FALSE,
    current_step INTEGER DEFAULT 1,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Step 1: Integrations
    integrations_complete BOOLEAN DEFAULT FALSE,
    google_calendar_connected BOOLEAN DEFAULT FALSE,
    google_contacts_connected BOOLEAN DEFAULT FALSE,
    
    -- Step 2: Circles
    circles_complete BOOLEAN DEFAULT FALSE,
    contacts_categorized INTEGER DEFAULT 0,
    total_contacts INTEGER DEFAULT 0,
    
    -- Step 3: Groups
    groups_complete BOOLEAN DEFAULT FALSE,
    mappings_reviewed INTEGER DEFAULT 0,
    total_mappings INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT onboarding_step_check CHECK (current_step >= 1 AND current_step <= 3)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_state_user ON onboarding_state(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_state_incomplete ON onboarding_state(user_id) WHERE is_complete = FALSE;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_onboarding_state_updated_at ON onboarding_state;
CREATE TRIGGER update_onboarding_state_updated_at 
    BEFORE UPDATE ON onboarding_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Group mapping suggestions table (for Step 3 of onboarding)
CREATE TABLE IF NOT EXISTS group_mapping_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_group_id VARCHAR(255) NOT NULL,
    google_group_name VARCHAR(255) NOT NULL,
    member_count INTEGER DEFAULT 0,
    suggested_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    confidence INTEGER,
    reasons JSONB DEFAULT '[]'::jsonb,
    reviewed BOOLEAN DEFAULT FALSE,
    accepted BOOLEAN DEFAULT FALSE,
    rejected BOOLEAN DEFAULT FALSE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_mapping_suggestion_per_user UNIQUE (user_id, google_group_id),
    CONSTRAINT confidence_check CHECK (confidence >= 0 AND confidence <= 100)
);

CREATE INDEX IF NOT EXISTS idx_group_mapping_suggestions_user ON group_mapping_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_group_mapping_suggestions_unreviewed ON group_mapping_suggestions(user_id, reviewed) WHERE reviewed = FALSE;
CREATE INDEX IF NOT EXISTS idx_group_mapping_suggestions_google_group ON group_mapping_suggestions(google_group_id);

-- Circle assignments history table
CREATE TABLE IF NOT EXISTS circle_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    from_circle VARCHAR(20),
    to_circle VARCHAR(20) NOT NULL,
    assigned_by VARCHAR(20) NOT NULL DEFAULT 'user',
    confidence DECIMAL(3,2),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    CONSTRAINT circle_assignments_from_check CHECK (from_circle IN ('inner', 'close', 'active', 'casual')),
    CONSTRAINT circle_assignments_to_check CHECK (to_circle IN ('inner', 'close', 'active', 'casual')),
    CONSTRAINT circle_assignments_by_check CHECK (assigned_by IN ('user', 'ai', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_circle_assignments_contact ON circle_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_circle_assignments_user_date ON circle_assignments(user_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_circle_assignments_user_contact ON circle_assignments(user_id, contact_id);

-- Circle assignment history table (separate tracking)
CREATE TABLE IF NOT EXISTS circle_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    from_circle VARCHAR(50),
    to_circle VARCHAR(50) NOT NULL,
    assigned_by VARCHAR(50) DEFAULT 'user',
    confidence DECIMAL(5,2),
    reason TEXT,
    assigned_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circle_history_user ON circle_assignment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_history_contact ON circle_assignment_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_circle_history_assigned_at ON circle_assignment_history(assigned_at);

-- AI circle overrides table (for learning)
CREATE TABLE IF NOT EXISTS ai_circle_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    suggested_circle VARCHAR(20) NOT NULL,
    actual_circle VARCHAR(20) NOT NULL,
    factors JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ai_overrides_suggested_check CHECK (suggested_circle IN ('inner', 'close', 'active', 'casual')),
    CONSTRAINT ai_overrides_actual_check CHECK (actual_circle IN ('inner', 'close', 'active', 'casual'))
);

CREATE INDEX IF NOT EXISTS idx_ai_overrides_user ON ai_circle_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_overrides_user_date ON ai_circle_overrides(user_id, recorded_at DESC);

-- Weekly catchup sessions table
CREATE TABLE IF NOT EXISTS weekly_catchup_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    contacts_to_review JSONB NOT NULL DEFAULT '[]'::jsonb,
    reviewed_contacts JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    skipped BOOLEAN DEFAULT FALSE,
    CONSTRAINT unique_weekly_catchup UNIQUE(user_id, year, week_number),
    CONSTRAINT weekly_catchup_week_check CHECK (week_number >= 1 AND week_number <= 53),
    CONSTRAINT weekly_catchup_year_check CHECK (year >= 2020 AND year <= 2100)
);

CREATE INDEX IF NOT EXISTS idx_weekly_catchup_user_date ON weekly_catchup_sessions(user_id, year DESC, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_catchup_incomplete ON weekly_catchup_sessions(user_id, completed_at) WHERE completed_at IS NULL AND skipped = FALSE;

-- Onboarding achievements table (gamification)
CREATE TABLE IF NOT EXISTS onboarding_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_data JSONB,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT achievements_type_check CHECK (achievement_type IN (
        'first_contact_categorized', 'inner_circle_complete', 'all_contacts_categorized',
        'week_streak_3', 'week_streak_10', 'balanced_network', 'network_health_excellent'
    ))
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON onboarding_achievements(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON onboarding_achievements(user_id, achievement_type);

-- Network health scores table
CREATE TABLE IF NOT EXISTS network_health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    circle_balance_score INTEGER,
    engagement_score INTEGER,
    maintenance_score INTEGER,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT health_score_check CHECK (score >= 0 AND score <= 100),
    CONSTRAINT balance_score_check CHECK (circle_balance_score >= 0 AND circle_balance_score <= 100),
    CONSTRAINT engagement_score_check CHECK (engagement_score >= 0 AND engagement_score <= 100),
    CONSTRAINT maintenance_score_check CHECK (maintenance_score >= 0 AND maintenance_score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_network_health_user ON network_health_scores(user_id, calculated_at DESC);

-- Onboarding analytics table
CREATE TABLE IF NOT EXISTS onboarding_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user ON onboarding_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_event ON onboarding_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_created ON onboarding_analytics(created_at);

-- Onboarding analytics events table (from migration 031)
CREATE TABLE IF NOT EXISTS onboarding_analytics_events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON onboarding_analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON onboarding_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON onboarding_analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_event ON onboarding_analytics_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON onboarding_analytics_events(created_at);


-- ============================================================================
-- PART 7: SMS/MMS Enrichment
-- ============================================================================

-- User phone numbers table
CREATE TABLE IF NOT EXISTS user_phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    encrypted_phone_number TEXT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6),
    verification_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_phone ON user_phone_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_verified ON user_phone_numbers(verified);

DROP TRIGGER IF EXISTS update_user_phone_numbers_updated_at ON user_phone_numbers;
CREATE TRIGGER update_user_phone_numbers_updated_at 
    BEFORE UPDATE ON user_phone_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notification queue table
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON notification_queue(created_at);


-- ============================================================================
-- PART 8: Chat Edits
-- ============================================================================

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chat_sessions_status_check CHECK (status IN ('active', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);

-- Pending edits table
CREATE TABLE IF NOT EXISTS pending_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    edit_type VARCHAR(50) NOT NULL,
    target_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    target_contact_name VARCHAR(255),
    target_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    target_group_name VARCHAR(255),
    field VARCHAR(100),
    proposed_value JSONB NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    source JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    disambiguation_candidates JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT pending_edits_edit_type_check CHECK (edit_type IN (
        'create_contact', 'update_contact_field', 'add_tag', 'remove_tag',
        'add_to_group', 'remove_from_group', 'create_group'
    )),
    CONSTRAINT pending_edits_status_check CHECK (status IN ('pending', 'needs_disambiguation')),
    CONSTRAINT pending_edits_confidence_check CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

CREATE INDEX IF NOT EXISTS idx_pending_edits_user ON pending_edits(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_edits_session ON pending_edits(session_id);
CREATE INDEX IF NOT EXISTS idx_pending_edits_status ON pending_edits(status);

-- Edit history table (immutable audit log)
CREATE TABLE IF NOT EXISTS edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_edit_id UUID NOT NULL,
    edit_type VARCHAR(50) NOT NULL,
    target_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    target_contact_name VARCHAR(255),
    target_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    target_group_name VARCHAR(255),
    field VARCHAR(100),
    applied_value JSONB NOT NULL,
    previous_value JSONB,
    source JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT edit_history_edit_type_check CHECK (edit_type IN (
        'create_contact', 'update_contact_field', 'add_tag', 'remove_tag',
        'add_to_group', 'remove_from_group', 'create_group'
    ))
);

CREATE INDEX IF NOT EXISTS idx_edit_history_user ON edit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_submitted ON edit_history(submitted_at DESC);


-- ============================================================================
-- PART 9: Scheduling Tables
-- ============================================================================

-- Catchup plans table
CREATE TABLE IF NOT EXISTS catchup_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50),
    duration INTEGER NOT NULL DEFAULT 60,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    location TEXT,
    notes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    finalized_time TIMESTAMP WITH TIME ZONE,
    last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_date_range CHECK (date_range_end >= date_range_start),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'collecting_availability', 'ready_to_schedule', 'scheduled', 'completed', 'cancelled'))
);

-- Add columns that may be missing from older table versions (from migration 037)
ALTER TABLE catchup_plans ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_catchup_plans_user_id ON catchup_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_catchup_plans_status ON catchup_plans(status);
CREATE INDEX IF NOT EXISTS idx_catchup_plans_finalized_time ON catchup_plans(finalized_time);
CREATE INDEX IF NOT EXISTS idx_catchup_plans_last_reminder ON catchup_plans(last_reminder_sent_at);

-- Plan invitees table
CREATE TABLE IF NOT EXISTS plan_invitees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    attendance_type VARCHAR(20) NOT NULL DEFAULT 'must_attend',
    has_responded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_attendance_type CHECK (attendance_type IN ('must_attend', 'nice_to_have')),
    UNIQUE(plan_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_invitees_plan_id ON plan_invitees(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_invitees_contact_id ON plan_invitees(contact_id);

-- Invitee availability table
CREATE TABLE IF NOT EXISTS invitee_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    invitee_name VARCHAR(255) NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    available_slots JSONB NOT NULL DEFAULT '[]',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plan_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_invitee_availability_plan_id ON invitee_availability(plan_id);

-- Initiator availability table
CREATE TABLE IF NOT EXISTS initiator_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    available_slots JSONB NOT NULL DEFAULT '[]',
    source VARCHAR(20) DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_source CHECK (source IN ('manual', 'calendar')),
    UNIQUE(plan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_initiator_availability_plan_id ON initiator_availability(plan_id);

-- Invite links table
CREATE TABLE IF NOT EXISTS invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    invalidated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plan_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_invite_links_token ON invite_links(token);
CREATE INDEX IF NOT EXISTS idx_invite_links_plan_id ON invite_links(plan_id);

-- Scheduling preferences table
CREATE TABLE IF NOT EXISTS scheduling_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    preferred_days JSONB DEFAULT '[]',
    preferred_time_ranges JSONB DEFAULT '[]',
    preferred_durations JSONB DEFAULT '[60]',
    favorite_locations JSONB DEFAULT '[]',
    default_activity_type VARCHAR(50),
    apply_by_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduling notifications table
CREATE TABLE IF NOT EXISTS scheduling_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_notification_type CHECK (type IN (
        'availability_submitted', 'plan_ready', 'plan_finalized', 'plan_cancelled', 'reminder_sent'
    ))
);

CREATE INDEX IF NOT EXISTS idx_scheduling_notifications_user_id ON scheduling_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_notifications_read_at ON scheduling_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_scheduling_notifications_user_unread ON scheduling_notifications(user_id) WHERE read_at IS NULL;

-- Calendar sharing settings table
CREATE TABLE IF NOT EXISTS calendar_sharing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    share_with_inner_circle BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================================
-- PART 10: Sync Optimization Tables
-- ============================================================================

-- Token health table
CREATE TABLE IF NOT EXISTS token_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_checked TIMESTAMP NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, integration_type),
    CONSTRAINT token_health_integration_check CHECK (integration_type IN ('google_contacts', 'google_calendar')),
    CONSTRAINT token_health_status_check CHECK (status IN ('valid', 'expiring_soon', 'expired', 'revoked', 'unknown'))
);

CREATE INDEX IF NOT EXISTS idx_token_health_user_integration ON token_health(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_token_health_status ON token_health(status);
CREATE INDEX IF NOT EXISTS idx_token_health_expiring ON token_health(expiry_date) WHERE status = 'expiring_soon';

-- Circuit breaker state table
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL,
    state VARCHAR(20) NOT NULL,
    failure_count INTEGER NOT NULL DEFAULT 0,
    last_failure_at TIMESTAMP,
    last_failure_reason TEXT,
    opened_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, integration_type),
    CONSTRAINT circuit_breaker_integration_check CHECK (integration_type IN ('google_contacts', 'google_calendar')),
    CONSTRAINT circuit_breaker_state_check CHECK (state IN ('closed', 'open', 'half_open'))
);

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_user_integration ON circuit_breaker_state(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state ON circuit_breaker_state(state);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_next_retry ON circuit_breaker_state(next_retry_at) WHERE state = 'open';

-- Sync schedule table
CREATE TABLE IF NOT EXISTS sync_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL,
    current_frequency_ms BIGINT NOT NULL,
    default_frequency_ms BIGINT NOT NULL,
    min_frequency_ms BIGINT NOT NULL,
    max_frequency_ms BIGINT NOT NULL,
    consecutive_no_changes INTEGER NOT NULL DEFAULT 0,
    last_sync_at TIMESTAMP,
    next_sync_at TIMESTAMP NOT NULL,
    onboarding_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, integration_type),
    CONSTRAINT sync_schedule_integration_check CHECK (integration_type IN ('google_contacts', 'google_calendar'))
);

-- Add columns that may be missing from older table versions (from migration 045)
ALTER TABLE sync_schedule ADD COLUMN IF NOT EXISTS onboarding_until TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_sync_schedule_user_integration ON sync_schedule(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_sync_schedule_next_sync ON sync_schedule(next_sync_at, integration_type);

-- Calendar webhook subscriptions table
CREATE TABLE IF NOT EXISTS calendar_webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) NOT NULL UNIQUE,
    resource_id VARCHAR(255) NOT NULL,
    resource_uri TEXT NOT NULL,
    expiration TIMESTAMP NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_channel_id ON calendar_webhook_subscriptions(channel_id);
CREATE INDEX IF NOT EXISTS idx_webhook_expiration ON calendar_webhook_subscriptions(expiration);
CREATE INDEX IF NOT EXISTS idx_webhook_user_id ON calendar_webhook_subscriptions(user_id);

-- Sync metrics table
CREATE TABLE IF NOT EXISTS sync_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL,
    sync_type VARCHAR(20) NOT NULL,
    result VARCHAR(20) NOT NULL,
    skip_reason VARCHAR(50),
    duration_ms INTEGER,
    items_processed INTEGER,
    api_calls_made INTEGER,
    api_calls_saved INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT sync_metrics_integration_check CHECK (integration_type IN ('google_contacts', 'google_calendar')),
    CONSTRAINT sync_metrics_type_check CHECK (sync_type IN ('full', 'incremental', 'webhook_triggered', 'manual')),
    CONSTRAINT sync_metrics_result_check CHECK (result IN ('success', 'failure', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_sync_metrics_user_integration ON sync_metrics(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_created_at ON sync_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_result ON sync_metrics(result);

-- Token health notifications table
CREATE TABLE IF NOT EXISTS token_health_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    re_auth_link TEXT NOT NULL,
    resolved_at TIMESTAMP,
    reminder_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT token_notif_integration_check CHECK (integration_type IN ('google_contacts', 'google_calendar')),
    CONSTRAINT token_notif_type_check CHECK (notification_type IN ('token_invalid', 'token_expiring_soon'))
);

CREATE INDEX IF NOT EXISTS idx_token_health_notifications_user_id ON token_health_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_token_health_notifications_user_integration ON token_health_notifications(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_token_health_notifications_unresolved ON token_health_notifications(user_id, integration_type) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_token_health_notifications_reminder_due ON token_health_notifications(created_at) WHERE resolved_at IS NULL AND reminder_sent_at IS NULL;

-- Webhook notifications table
CREATE TABLE IF NOT EXISTS webhook_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    resource_state VARCHAR(50) NOT NULL,
    result VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT webhook_notif_result_check CHECK (result IN ('success', 'failure', 'ignored'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_notifications_created_at ON webhook_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_result ON webhook_notifications(result);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_user_id ON webhook_notifications(user_id);


-- ============================================================================
-- END OF MIGRATIONS
-- ============================================================================
-- All 46 migrations have been consolidated into this single file.
-- Run this file in Cloud Console SQL editor or via psql.
-- ============================================================================
