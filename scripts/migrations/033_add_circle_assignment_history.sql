-- Migration: Add circle_assignment_history table
-- Description: Track history of circle assignments for contacts
-- Date: 2026-01-28

CREATE TABLE IF NOT EXISTS circle_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  from_circle VARCHAR(50),
  to_circle VARCHAR(50) NOT NULL,
  assigned_by VARCHAR(50) DEFAULT 'user',
  confidence DECIMAL(5,2),
  reason TEXT,
  assigned_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circle_history_user ON circle_assignment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_history_contact ON circle_assignment_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_circle_history_assigned_at ON circle_assignment_history(assigned_at);

COMMENT ON TABLE circle_assignment_history IS 'Tracks the history of circle assignments for contacts';
COMMENT ON COLUMN circle_assignment_history.assigned_by IS 'Source of assignment: user, ai, import, etc.';
COMMENT ON COLUMN circle_assignment_history.confidence IS 'AI confidence score (0-100) if assigned by AI';
