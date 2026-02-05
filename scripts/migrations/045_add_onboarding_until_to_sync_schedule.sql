-- Migration: Add onboarding_until column to sync_schedule table
-- Purpose: Track when onboarding period ends (24h after first connection)
-- Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 3: Onboarding-Specific Frequency"

-- Add onboarding_until column to sync_schedule table
ALTER TABLE sync_schedule 
ADD COLUMN IF NOT EXISTS onboarding_until TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN sync_schedule.onboarding_until IS 'Timestamp when onboarding period ends (24 hours after first connection). During onboarding, faster sync frequencies are used (1h for contacts, 2h for calendar).';

-- Note: No index needed as this column is only checked during sync scheduling
-- and is not used for filtering large result sets
