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
