-- Migration 036: Create scheduling tables for Group Scheduling feature
-- Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8
-- This migration creates all tables needed for the Group Scheduling feature

-- Catchup Plans table
CREATE TABLE IF NOT EXISTS catchup_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50),
  duration INTEGER NOT NULL DEFAULT 60, -- minutes
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  location TEXT,
  notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  finalized_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_date_range CHECK (date_range_end >= date_range_start),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'collecting_availability', 'ready_to_schedule', 'scheduled', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_catchup_plans_user_id ON catchup_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_catchup_plans_status ON catchup_plans(status);
CREATE INDEX IF NOT EXISTS idx_catchup_plans_finalized_time ON catchup_plans(finalized_time);

COMMENT ON TABLE catchup_plans IS 'Stores catchup plan metadata for group scheduling';
COMMENT ON COLUMN catchup_plans.status IS 'Plan status: draft, collecting_availability, ready_to_schedule, scheduled, completed, cancelled';
COMMENT ON COLUMN catchup_plans.duration IS 'Duration in minutes';

-- Plan Invitees table
CREATE TABLE IF NOT EXISTS plan_invitees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  attendance_type VARCHAR(20) NOT NULL DEFAULT 'must_attend',
  has_responded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_attendance_type CHECK (attendance_type IN ('must_attend', 'nice_to_have')),
  UNIQUE(plan_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_invitees_plan_id ON plan_invitees(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_invitees_contact_id ON plan_invitees(contact_id);

COMMENT ON TABLE plan_invitees IS 'Links catchup plans to invited contacts';
COMMENT ON COLUMN plan_invitees.attendance_type IS 'Whether invitee is must_attend or nice_to_have';


-- Invitee Availability table
CREATE TABLE IF NOT EXISTS invitee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  invitee_name VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  available_slots JSONB NOT NULL DEFAULT '[]',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(plan_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_invitee_availability_plan_id ON invitee_availability(plan_id);

COMMENT ON TABLE invitee_availability IS 'Stores availability submissions from invitees';
COMMENT ON COLUMN invitee_availability.available_slots IS 'JSON array of available time slots in format YYYY-MM-DD_HH:mm';

-- Initiator Availability table (for plan creator)
CREATE TABLE IF NOT EXISTS initiator_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  available_slots JSONB NOT NULL DEFAULT '[]',
  source VARCHAR(20) DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_source CHECK (source IN ('manual', 'calendar')),
  UNIQUE(plan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_initiator_availability_plan_id ON initiator_availability(plan_id);

COMMENT ON TABLE initiator_availability IS 'Stores availability for plan initiators';
COMMENT ON COLUMN initiator_availability.source IS 'Whether availability was entered manually or derived from calendar';

-- Invite Links table
CREATE TABLE IF NOT EXISTS invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  invalidated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(plan_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_invite_links_token ON invite_links(token);
CREATE INDEX IF NOT EXISTS idx_invite_links_plan_id ON invite_links(plan_id);

COMMENT ON TABLE invite_links IS 'Stores shareable invite links for availability collection';
COMMENT ON COLUMN invite_links.token IS 'Unique secure token for the invite URL';
COMMENT ON COLUMN invite_links.invalidated_at IS 'Set when link is regenerated or plan is cancelled';

-- Scheduling Preferences table
CREATE TABLE IF NOT EXISTS scheduling_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  preferred_days JSONB DEFAULT '[]',
  preferred_time_ranges JSONB DEFAULT '[]',
  preferred_durations JSONB DEFAULT '[60]',
  favorite_locations JSONB DEFAULT '[]',
  default_activity_type VARCHAR(50),
  apply_by_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE scheduling_preferences IS 'User preferences for scheduling catchups';
COMMENT ON COLUMN scheduling_preferences.preferred_days IS 'JSON array of day numbers (0-6 for Sunday-Saturday)';
COMMENT ON COLUMN scheduling_preferences.preferred_time_ranges IS 'JSON array of time range objects with start, end, label';
COMMENT ON COLUMN scheduling_preferences.preferred_durations IS 'JSON array of duration options in minutes';
COMMENT ON COLUMN scheduling_preferences.favorite_locations IS 'JSON array of favorite location strings (max 10)';

-- Scheduling Notifications table
CREATE TABLE IF NOT EXISTS scheduling_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES catchup_plans(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_notification_type CHECK (type IN (
    'availability_submitted',
    'plan_ready',
    'plan_finalized',
    'plan_cancelled',
    'reminder_sent'
  ))
);

CREATE INDEX IF NOT EXISTS idx_scheduling_notifications_user_id ON scheduling_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_notifications_read_at ON scheduling_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_scheduling_notifications_user_unread ON scheduling_notifications(user_id) WHERE read_at IS NULL;

COMMENT ON TABLE scheduling_notifications IS 'In-app notifications for scheduling events';
COMMENT ON COLUMN scheduling_notifications.type IS 'Notification type: availability_submitted, plan_ready, plan_finalized, plan_cancelled, reminder_sent';

-- Calendar Sharing Settings table
CREATE TABLE IF NOT EXISTS calendar_sharing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  share_with_inner_circle BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE calendar_sharing_settings IS 'Privacy settings for calendar availability sharing';
COMMENT ON COLUMN calendar_sharing_settings.share_with_inner_circle IS 'Whether to auto-share availability with Inner Circle contacts';
