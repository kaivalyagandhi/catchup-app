-- Migration 037: Add last_reminder_sent_at column to catchup_plans
-- Requirements: 12.5 - Track last reminder sent time to prevent spam

-- Add last_reminder_sent_at column to track when reminders were last sent
ALTER TABLE catchup_plans 
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN catchup_plans.last_reminder_sent_at IS 'Timestamp of when reminders were last sent to pending invitees';

-- Create index for efficient querying of plans that need reminders
CREATE INDEX IF NOT EXISTS idx_catchup_plans_last_reminder ON catchup_plans(last_reminder_sent_at);
