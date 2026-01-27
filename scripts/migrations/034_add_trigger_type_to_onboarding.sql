-- Migration: Add trigger_type column to onboarding_state
-- Description: Track what triggered the onboarding flow
-- Date: 2026-01-28

ALTER TABLE onboarding_state 
ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50);

COMMENT ON COLUMN onboarding_state.trigger_type IS 'What triggered onboarding: manual, auto, import, etc.';

-- Add index for filtering by trigger type
CREATE INDEX IF NOT EXISTS idx_onboarding_trigger_type ON onboarding_state(trigger_type);
