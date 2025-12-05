-- Migration 030: Update contact onboarding schema for simplified 4-circle system
-- Requirements: All requirements (data foundation for simplified onboarding)
-- This migration updates the existing onboarding schema to support the simplified 4-circle system
-- and adds the group mapping suggestions table for Step 3 of onboarding

-- ============================================================================
-- PART 1: Update contacts table for simplified 4-circle system
-- ============================================================================

-- Update the circle column constraint to only allow 4 circles (remove 'acquaintance')
-- First, update any existing 'acquaintance' assignments to 'casual'
UPDATE contacts 
SET dunbar_circle = 'casual' 
WHERE dunbar_circle = 'acquaintance';

-- Drop the old constraint
ALTER TABLE contacts 
DROP CONSTRAINT IF EXISTS contacts_dunbar_circle_check;

-- Add new constraint with only 4 circles
ALTER TABLE contacts 
ADD CONSTRAINT contacts_dunbar_circle_check 
CHECK (dunbar_circle IN ('inner', 'close', 'active', 'casual'));

-- Update ai_suggested_circle constraint as well
ALTER TABLE contacts 
DROP CONSTRAINT IF EXISTS contacts_ai_suggested_circle_check;

ALTER TABLE contacts 
ADD CONSTRAINT contacts_ai_suggested_circle_check 
CHECK (ai_suggested_circle IN ('inner', 'close', 'active', 'casual'));

-- Add a simple 'circle' column as an alias for dunbar_circle for easier API usage
-- This allows both 'circle' and 'dunbar_circle' to be used interchangeably
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS circle VARCHAR(20) 
GENERATED ALWAYS AS (dunbar_circle) STORED;

-- Add circle_assigned_by column if it doesn't exist (tracks who assigned: user, ai, system)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS circle_assigned_by VARCHAR(10) DEFAULT 'user';

-- Create index for circle queries
CREATE INDEX IF NOT EXISTS idx_contacts_circle ON contacts(user_id, circle) WHERE circle IS NOT NULL;

-- ============================================================================
-- PART 2: Create simplified onboarding_state table
-- ============================================================================

-- Drop the existing onboarding_state table if it exists (from migration 017)
-- and create a new simplified version that matches the design document
DROP TABLE IF EXISTS onboarding_state CASCADE;

CREATE TABLE onboarding_state (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_complete BOOLEAN DEFAULT FALSE,
    current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 3),
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for onboarding state queries
CREATE INDEX IF NOT EXISTS idx_onboarding_state_user ON onboarding_state(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_state_incomplete ON onboarding_state(user_id) 
WHERE is_complete = FALSE;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_onboarding_state_timestamp ON onboarding_state;
CREATE TRIGGER update_onboarding_state_timestamp 
BEFORE UPDATE ON onboarding_state
FOR EACH ROW 
EXECUTE FUNCTION update_onboarding_state_updated_at();

-- ============================================================================
-- PART 3: Create group_mapping_suggestions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_mapping_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_group_id VARCHAR(255) NOT NULL,
    google_group_name VARCHAR(255) NOT NULL,
    member_count INTEGER DEFAULT 0,
    suggested_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    reasons JSONB DEFAULT '[]'::jsonb,
    reviewed BOOLEAN DEFAULT FALSE,
    accepted BOOLEAN DEFAULT FALSE,
    rejected BOOLEAN DEFAULT FALSE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_mapping_suggestion_per_user UNIQUE (user_id, google_group_id)
);

-- Create indexes for group mapping suggestions
CREATE INDEX IF NOT EXISTS idx_group_mapping_suggestions_user ON group_mapping_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_group_mapping_suggestions_unreviewed ON group_mapping_suggestions(user_id, reviewed) 
WHERE reviewed = FALSE;
CREATE INDEX IF NOT EXISTS idx_group_mapping_suggestions_google_group ON group_mapping_suggestions(google_group_id);

-- ============================================================================
-- PART 4: Update circle_assignments table constraints
-- ============================================================================

-- Update circle_assignments table to only allow 4 circles
-- First, update any existing 'acquaintance' assignments to 'casual'
UPDATE circle_assignments 
SET from_circle = 'casual' 
WHERE from_circle = 'acquaintance';

UPDATE circle_assignments 
SET to_circle = 'casual' 
WHERE to_circle = 'acquaintance';

-- Drop old constraints
ALTER TABLE circle_assignments 
DROP CONSTRAINT IF EXISTS circle_assignments_from_circle_check;

ALTER TABLE circle_assignments 
DROP CONSTRAINT IF EXISTS circle_assignments_to_circle_check;

-- Add new constraints with only 4 circles
ALTER TABLE circle_assignments 
ADD CONSTRAINT circle_assignments_from_circle_check 
CHECK (from_circle IN ('inner', 'close', 'active', 'casual'));

ALTER TABLE circle_assignments 
ADD CONSTRAINT circle_assignments_to_circle_check 
CHECK (to_circle IN ('inner', 'close', 'active', 'casual'));

-- ============================================================================
-- PART 5: Update ai_circle_overrides table constraints
-- ============================================================================

-- Update ai_circle_overrides table to only allow 4 circles
UPDATE ai_circle_overrides 
SET suggested_circle = 'casual' 
WHERE suggested_circle = 'acquaintance';

UPDATE ai_circle_overrides 
SET actual_circle = 'casual' 
WHERE actual_circle = 'acquaintance';

-- Drop old constraints
ALTER TABLE ai_circle_overrides 
DROP CONSTRAINT IF EXISTS ai_circle_overrides_suggested_circle_check;

ALTER TABLE ai_circle_overrides 
DROP CONSTRAINT IF EXISTS ai_circle_overrides_actual_circle_check;

-- Add new constraints with only 4 circles
ALTER TABLE ai_circle_overrides 
ADD CONSTRAINT ai_circle_overrides_suggested_circle_check 
CHECK (suggested_circle IN ('inner', 'close', 'active', 'casual'));

ALTER TABLE ai_circle_overrides 
ADD CONSTRAINT ai_circle_overrides_actual_circle_check 
CHECK (actual_circle IN ('inner', 'close', 'active', 'casual'));

-- ============================================================================
-- PART 6: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE onboarding_state IS 'Tracks user progress through the simplified 3-step contact onboarding flow';
COMMENT ON TABLE group_mapping_suggestions IS 'AI-generated suggestions for mapping Google Contact groups to CatchUp groups';

COMMENT ON COLUMN contacts.circle IS 'Simplified 4-circle system: inner (10), close (25), active (50), casual (100)';
COMMENT ON COLUMN contacts.dunbar_circle IS 'The Dunbar circle this contact belongs to - simplified to 4 circles';
COMMENT ON COLUMN contacts.circle_assigned_by IS 'Who assigned the circle: user, ai, or system';

COMMENT ON COLUMN onboarding_state.current_step IS 'Current onboarding step: 1=Integrations, 2=Circles, 3=Groups';
COMMENT ON COLUMN onboarding_state.contacts_categorized IS 'Number of contacts assigned to circles';
COMMENT ON COLUMN onboarding_state.mappings_reviewed IS 'Number of group mapping suggestions reviewed';

COMMENT ON COLUMN group_mapping_suggestions.confidence IS 'AI confidence score for the mapping suggestion (0-100)';
COMMENT ON COLUMN group_mapping_suggestions.reasons IS 'Array of reasons why this mapping was suggested';
