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
