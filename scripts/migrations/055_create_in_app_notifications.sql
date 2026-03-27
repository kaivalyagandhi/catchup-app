-- Migration 055: Create in_app_notifications table
-- Requirements: 26.4
-- Stores persistent in-app notifications for async system events
-- (import complete, AI enrichment ready, sync conflicts, reminders)

CREATE TABLE in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  action_url VARCHAR(500),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON in_app_notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON in_app_notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created ON in_app_notifications(created_at);
