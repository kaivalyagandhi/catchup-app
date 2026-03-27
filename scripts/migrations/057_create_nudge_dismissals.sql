-- Migration 057: Create nudge_dismissals table
-- Requirements: 2.5
-- Tracks when users dismiss contextual nudge cards on the Home Dashboard.
-- Each nudge type can only be dismissed once per user (UNIQUE constraint).
-- show_again_after is set by the application layer to dismissed_at + 7 days.

CREATE TABLE nudge_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nudge_type VARCHAR(50) NOT NULL, -- organize_circles, set_frequency, import_more, get_deeper_insights
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  show_again_after TIMESTAMPTZ NOT NULL, -- dismissed_at + 7 days
  UNIQUE(user_id, nudge_type)
);
