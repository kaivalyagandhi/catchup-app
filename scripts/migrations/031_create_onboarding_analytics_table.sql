-- Migration: Create onboarding analytics events table
-- Purpose: Track onboarding events for product insights
-- Requirements: All requirements (product insights)

-- Create onboarding analytics events table
CREATE TABLE IF NOT EXISTS onboarding_analytics_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for common queries
  INDEX idx_analytics_user_id (user_id),
  INDEX idx_analytics_event_type (event_type),
  INDEX idx_analytics_timestamp (timestamp),
  INDEX idx_analytics_user_event (user_id, event_type),
  INDEX idx_analytics_created_at (created_at)
);

-- Add comment
COMMENT ON TABLE onboarding_analytics_events IS 'Tracks onboarding events for product insights and analytics';

-- Create view for quick stats
CREATE OR REPLACE VIEW onboarding_analytics_summary AS
SELECT 
  COUNT(DISTINCT CASE WHEN event_type = 'onboarding_started' THEN user_id END) as total_started,
  COUNT(DISTINCT CASE WHEN event_type = 'onboarding_completed' THEN user_id END) as total_completed,
  COUNT(DISTINCT CASE WHEN event_type = 'onboarding_dismissed' THEN user_id END) as total_dismissed,
  COUNT(DISTINCT CASE WHEN event_type = 'onboarding_resumed' THEN user_id END) as total_resumed,
  COUNT(DISTINCT CASE WHEN event_type = 'step_1_completed' THEN user_id END) as step1_completed,
  COUNT(DISTINCT CASE WHEN event_type = 'step_2_completed' THEN user_id END) as step2_completed,
  COUNT(DISTINCT CASE WHEN event_type = 'step_3_completed' THEN user_id END) as step3_completed,
  COUNT(CASE WHEN event_type = 'ai_suggestion_accepted' THEN 1 END) as ai_accepted,
  COUNT(CASE WHEN event_type = 'ai_suggestion_rejected' THEN 1 END) as ai_rejected,
  COUNT(CASE WHEN event_type = 'circle_assigned' THEN 1 END) as circles_assigned,
  COUNT(CASE WHEN event_type = 'group_mapping_accepted' THEN 1 END) as mappings_accepted,
  COUNT(CASE WHEN event_type = 'group_mapping_rejected' THEN 1 END) as mappings_rejected
FROM onboarding_analytics_events;

-- Grant permissions
GRANT SELECT, INSERT ON onboarding_analytics_events TO catchup_app;
GRANT SELECT ON onboarding_analytics_summary TO catchup_app;
