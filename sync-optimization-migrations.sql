-- Migration: Create token_health table for OAuth token monitoring
-- Requirements: 1.5

-- Create token_health table
CREATE TABLE IF NOT EXISTS token_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('valid', 'expiring_soon', 'expired', 'revoked', 'unknown')),
  last_checked TIMESTAMP NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_token_health_user_integration ON token_health(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_token_health_status ON token_health(status);
CREATE INDEX IF NOT EXISTS idx_token_health_expiring ON token_health(expiry_date) WHERE status = 'expiring_soon';

-- Add comments for documentation
COMMENT ON TABLE token_health IS 'Tracks OAuth token health status for proactive monitoring';
COMMENT ON COLUMN token_health.status IS 'Current health status: valid, expiring_soon (within 24h), expired, revoked, or unknown';
COMMENT ON COLUMN token_health.last_checked IS 'Timestamp of last health check';
COMMENT ON COLUMN token_health.expiry_date IS 'Token expiration date from OAuth provider';
COMMENT ON COLUMN token_health.error_message IS 'Error message from last failed validation attempt';
-- Migration: Create circuit_breaker_state table for sync failure management
-- Requirements: 2.6, 2.7

-- Create circuit_breaker_state table
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  state VARCHAR(20) NOT NULL CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMP,
  last_failure_reason TEXT,
  opened_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_user_integration ON circuit_breaker_state(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state ON circuit_breaker_state(state);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_next_retry ON circuit_breaker_state(next_retry_at) WHERE state = 'open';

-- Add comments for documentation
COMMENT ON TABLE circuit_breaker_state IS 'Tracks circuit breaker state per user and integration to prevent repeated failed sync attempts';
COMMENT ON COLUMN circuit_breaker_state.state IS 'Circuit breaker state: closed (normal), open (blocking syncs), half_open (testing recovery)';
COMMENT ON COLUMN circuit_breaker_state.failure_count IS 'Number of consecutive failures (resets to 0 on success)';
COMMENT ON COLUMN circuit_breaker_state.last_failure_reason IS 'Error message from last failed sync attempt';
COMMENT ON COLUMN circuit_breaker_state.opened_at IS 'Timestamp when circuit breaker opened';
COMMENT ON COLUMN circuit_breaker_state.next_retry_at IS 'Timestamp when circuit breaker will transition to half_open';
-- Migration: Create sync_schedule table for adaptive sync frequency management
-- Requirements: 5.6

-- Create sync_schedule table
CREATE TABLE IF NOT EXISTS sync_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  current_frequency_ms BIGINT NOT NULL,
  default_frequency_ms BIGINT NOT NULL,
  min_frequency_ms BIGINT NOT NULL,
  max_frequency_ms BIGINT NOT NULL,
  consecutive_no_changes INTEGER NOT NULL DEFAULT 0,
  last_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sync_schedule_user_integration ON sync_schedule(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_sync_schedule_next_sync ON sync_schedule(next_sync_at, integration_type);

-- Add comments for documentation
COMMENT ON TABLE sync_schedule IS 'Manages adaptive sync frequency per user and integration based on change detection';
COMMENT ON COLUMN sync_schedule.current_frequency_ms IS 'Current sync frequency in milliseconds (adapts based on changes)';
COMMENT ON COLUMN sync_schedule.default_frequency_ms IS 'Default sync frequency to restore when changes are detected';
COMMENT ON COLUMN sync_schedule.min_frequency_ms IS 'Minimum allowed sync frequency (longest interval)';
COMMENT ON COLUMN sync_schedule.max_frequency_ms IS 'Maximum allowed sync frequency (shortest interval)';
COMMENT ON COLUMN sync_schedule.consecutive_no_changes IS 'Counter for consecutive syncs with no changes (triggers frequency reduction)';
COMMENT ON COLUMN sync_schedule.last_sync_at IS 'Timestamp of last completed sync';
COMMENT ON COLUMN sync_schedule.next_sync_at IS 'Timestamp when next sync should occur';
-- Migration: Create calendar_webhook_subscriptions table for Google Calendar push notifications
-- Requirements: 6.6

-- Create calendar_webhook_subscriptions table
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

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_webhook_channel_id ON calendar_webhook_subscriptions(channel_id);
CREATE INDEX IF NOT EXISTS idx_webhook_expiration ON calendar_webhook_subscriptions(expiration);
CREATE INDEX IF NOT EXISTS idx_webhook_user_id ON calendar_webhook_subscriptions(user_id);

-- Add comments for documentation
COMMENT ON TABLE calendar_webhook_subscriptions IS 'Stores Google Calendar webhook subscriptions for push notifications';
COMMENT ON COLUMN calendar_webhook_subscriptions.channel_id IS 'Unique channel ID from Google Calendar API watch endpoint';
COMMENT ON COLUMN calendar_webhook_subscriptions.resource_id IS 'Resource ID from Google Calendar API (identifies the calendar)';
COMMENT ON COLUMN calendar_webhook_subscriptions.resource_uri IS 'Resource URI for the watched calendar';
COMMENT ON COLUMN calendar_webhook_subscriptions.expiration IS 'Webhook expiration timestamp (typically 7 days from registration)';
COMMENT ON COLUMN calendar_webhook_subscriptions.token IS 'Verification token for validating incoming webhook notifications';
-- Migration: Create sync_metrics table for tracking sync results and API call savings
-- Requirements: 10.5

-- Create sync_metrics table
CREATE TABLE IF NOT EXISTS sync_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('full', 'incremental', 'webhook_triggered', 'manual')),
  result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'skipped')),
  skip_reason VARCHAR(50),
  duration_ms INTEGER,
  items_processed INTEGER,
  api_calls_made INTEGER,
  api_calls_saved INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sync_metrics_user_integration ON sync_metrics(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_created_at ON sync_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_result ON sync_metrics(result);

-- Add comments for documentation
COMMENT ON TABLE sync_metrics IS 'Tracks sync execution metrics for monitoring and dashboard reporting';
COMMENT ON COLUMN sync_metrics.sync_type IS 'Type of sync: full, incremental, webhook_triggered, or manual';
COMMENT ON COLUMN sync_metrics.result IS 'Sync outcome: success, failure, or skipped';
COMMENT ON COLUMN sync_metrics.skip_reason IS 'Reason for skipped sync: circuit_breaker_open, invalid_token, etc.';
COMMENT ON COLUMN sync_metrics.duration_ms IS 'Sync execution duration in milliseconds';
COMMENT ON COLUMN sync_metrics.items_processed IS 'Number of contacts/events processed during sync';
COMMENT ON COLUMN sync_metrics.api_calls_made IS 'Number of API calls made to Google during sync';
COMMENT ON COLUMN sync_metrics.api_calls_saved IS 'Number of API calls saved by optimization features';
-- Migration: Create token health notifications table
-- Requirements: 4.1, 4.2, 4.6
-- Description: Stores notifications for token health issues (expired, revoked, expiring soon)

-- Create token_health_notifications table
CREATE TABLE IF NOT EXISTS token_health_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('token_invalid', 'token_expiring_soon')),
  message TEXT NOT NULL,
  re_auth_link TEXT NOT NULL,
  resolved_at TIMESTAMP,
  reminder_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_token_health_notifications_user_id ON token_health_notifications(user_id);
CREATE INDEX idx_token_health_notifications_user_integration ON token_health_notifications(user_id, integration_type);
CREATE INDEX idx_token_health_notifications_unresolved ON token_health_notifications(user_id, integration_type) WHERE resolved_at IS NULL;
CREATE INDEX idx_token_health_notifications_reminder_due ON token_health_notifications(created_at) WHERE resolved_at IS NULL AND reminder_sent_at IS NULL;

-- Add comment
COMMENT ON TABLE token_health_notifications IS 'Stores notifications for OAuth token health issues requiring user action';
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
-- Migration: Create webhook_notifications table for tracking webhook events
-- Purpose: Track all webhook notifications received for monitoring and alerting
-- Date: 2026-02-04

-- Create webhook_notifications table
CREATE TABLE IF NOT EXISTS webhook_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id VARCHAR(255) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  resource_state VARCHAR(50) NOT NULL,
  result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'ignored')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_webhook_notifications_created_at ON webhook_notifications(created_at);
CREATE INDEX idx_webhook_notifications_result ON webhook_notifications(result);
CREATE INDEX idx_webhook_notifications_user_id ON webhook_notifications(user_id);

-- Add comment for documentation
COMMENT ON TABLE webhook_notifications IS 'Tracks all webhook notifications received from Google Calendar for monitoring and alerting';
COMMENT ON COLUMN webhook_notifications.channel_id IS 'Google Calendar webhook channel ID';
COMMENT ON COLUMN webhook_notifications.resource_id IS 'Google Calendar resource ID';
COMMENT ON COLUMN webhook_notifications.resource_state IS 'State of the resource (sync, exists, not_exists)';
COMMENT ON COLUMN webhook_notifications.result IS 'Result of processing the webhook (success, failure, ignored)';
COMMENT ON COLUMN webhook_notifications.error_message IS 'Error message if processing failed';
