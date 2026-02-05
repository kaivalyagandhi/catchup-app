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
