-- Migration 017: Create contact onboarding schema
-- Requirements: 1.1, 1.5, 2.2, 3.3, 7.1, 8.3, 8.5, 15.2
-- This migration adds support for the contact onboarding feature including:
-- - Dunbar circle assignments for contacts
-- - Onboarding state tracking
-- - Circle assignment history
-- - AI learning data
-- - Weekly catchup sessions
-- - Gamification (achievements and network health scores)

-- Add circle-related columns to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS dunbar_circle VARCHAR(20) CHECK (dunbar_circle IN ('inner', 'close', 'active', 'casual', 'acquaintance')),
ADD COLUMN IF NOT EXISTS circle_assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS circle_confidence DECIMAL(3,2) CHECK (circle_confidence >= 0 AND circle_confidence <= 1),
ADD COLUMN IF NOT EXISTS ai_suggested_circle VARCHAR(20) CHECK (ai_suggested_circle IN ('inner', 'close', 'active', 'casual', 'acquaintance'));

-- Create index for circle queries
CREATE INDEX IF NOT EXISTS idx_contacts_dunbar_circle ON contacts(user_id, dunbar_circle) WHERE dunbar_circle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_circle_assigned_at ON contacts(circle_assigned_at) WHERE circle_assigned_at IS NOT NULL;

-- Create onboarding_state table
CREATE TABLE IF NOT EXISTS onboarding_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step VARCHAR(50) NOT NULL CHECK (current_step IN ('welcome', 'import_contacts', 'circle_assignment', 'preference_setting', 'group_overlay', 'completion')),
    completed_steps JSONB DEFAULT '[]'::jsonb,
    trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('new_user', 'post_import', 'manage')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_data JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT unique_onboarding_per_user UNIQUE(user_id)
);

-- Create index for onboarding state queries
CREATE INDEX IF NOT EXISTS idx_onboarding_state_user ON onboarding_state(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_state_completed ON onboarding_state(user_id, completed_at) WHERE completed_at IS NULL;

-- Create circle_assignments table for tracking assignment history
CREATE TABLE IF NOT EXISTS circle_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    from_circle VARCHAR(20) CHECK (from_circle IN ('inner', 'close', 'active', 'casual', 'acquaintance')),
    to_circle VARCHAR(20) NOT NULL CHECK (to_circle IN ('inner', 'close', 'active', 'casual', 'acquaintance')),
    assigned_by VARCHAR(20) NOT NULL CHECK (assigned_by IN ('user', 'ai', 'system')),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- Create indexes for circle assignments
CREATE INDEX IF NOT EXISTS idx_circle_assignments_contact ON circle_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_circle_assignments_user_date ON circle_assignments(user_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_circle_assignments_user_contact ON circle_assignments(user_id, contact_id);

-- Create ai_circle_overrides table for learning from user corrections
CREATE TABLE IF NOT EXISTS ai_circle_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    suggested_circle VARCHAR(20) NOT NULL CHECK (suggested_circle IN ('inner', 'close', 'active', 'casual', 'acquaintance')),
    actual_circle VARCHAR(20) NOT NULL CHECK (actual_circle IN ('inner', 'close', 'active', 'casual', 'acquaintance')),
    factors JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AI overrides
CREATE INDEX IF NOT EXISTS idx_ai_overrides_user ON ai_circle_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_overrides_user_date ON ai_circle_overrides(user_id, recorded_at DESC);

-- Create weekly_catchup_sessions table
CREATE TABLE IF NOT EXISTS weekly_catchup_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    contacts_to_review JSONB NOT NULL DEFAULT '[]'::jsonb,
    reviewed_contacts JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    skipped BOOLEAN DEFAULT FALSE,
    CONSTRAINT unique_weekly_catchup UNIQUE(user_id, year, week_number)
);

-- Create indexes for weekly catchup sessions
CREATE INDEX IF NOT EXISTS idx_weekly_catchup_user_date ON weekly_catchup_sessions(user_id, year DESC, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_catchup_incomplete ON weekly_catchup_sessions(user_id, completed_at) WHERE completed_at IS NULL AND skipped = FALSE;

-- Create onboarding_achievements table for gamification
CREATE TABLE IF NOT EXISTS onboarding_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL CHECK (achievement_type IN (
        'first_contact_categorized',
        'inner_circle_complete',
        'all_contacts_categorized',
        'week_streak_3',
        'week_streak_10',
        'balanced_network',
        'network_health_excellent'
    )),
    achievement_data JSONB,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for achievements
CREATE INDEX IF NOT EXISTS idx_achievements_user ON onboarding_achievements(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON onboarding_achievements(user_id, achievement_type);

-- Create network_health_scores table for tracking network health over time
CREATE TABLE IF NOT EXISTS network_health_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    circle_balance_score INTEGER CHECK (circle_balance_score >= 0 AND circle_balance_score <= 100),
    engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
    maintenance_score INTEGER CHECK (maintenance_score >= 0 AND maintenance_score <= 100),
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for network health scores
CREATE INDEX IF NOT EXISTS idx_network_health_user ON network_health_scores(user_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_health_latest ON network_health_scores(user_id, calculated_at DESC);

-- Add trigger to update last_updated_at on onboarding_state
CREATE OR REPLACE FUNCTION update_onboarding_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_onboarding_state_updated_at 
BEFORE UPDATE ON onboarding_state
FOR EACH ROW 
EXECUTE FUNCTION update_onboarding_last_updated_at();

-- Add comments for documentation
COMMENT ON TABLE onboarding_state IS 'Tracks user progress through the contact onboarding flow';
COMMENT ON TABLE circle_assignments IS 'Historical record of all circle assignments for contacts';
COMMENT ON TABLE ai_circle_overrides IS 'Records user corrections to AI suggestions for learning';
COMMENT ON TABLE weekly_catchup_sessions IS 'Manages weekly contact review sessions';
COMMENT ON TABLE onboarding_achievements IS 'Tracks gamification achievements earned by users';
COMMENT ON TABLE network_health_scores IS 'Historical record of network health metrics';

COMMENT ON COLUMN contacts.dunbar_circle IS 'The Dunbar circle this contact belongs to (inner=5, close=15, active=50, casual=150, acquaintance=500+)';
COMMENT ON COLUMN contacts.circle_assigned_at IS 'When the contact was assigned to their current circle';
COMMENT ON COLUMN contacts.circle_confidence IS 'AI confidence score for the circle assignment (0-1)';
COMMENT ON COLUMN contacts.ai_suggested_circle IS 'The circle suggested by AI before user override';
