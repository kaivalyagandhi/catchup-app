-- Migration 047: Create group_suggestion_feedback table for Organize Contacts Evolution
-- Requirements: 1.4 - Backend Data Foundations
-- This migration creates the table for tracking user feedback on AI group suggestions

-- Create group_suggestion_feedback table
CREATE TABLE IF NOT EXISTS group_suggestion_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(50) NOT NULL DEFAULT 'ai',
  feedback VARCHAR(20) NOT NULL CHECK (feedback IN ('accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, contact_id, group_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_gsf_user_contact ON group_suggestion_feedback(user_id, contact_id);
CREATE INDEX idx_gsf_user_group ON group_suggestion_feedback(user_id, group_id);

-- Add comments for documentation
COMMENT ON TABLE group_suggestion_feedback IS 'Tracks user feedback (accepted/rejected) on AI-powered group placement suggestions';
COMMENT ON COLUMN group_suggestion_feedback.user_id IS 'The user who provided the feedback';
COMMENT ON COLUMN group_suggestion_feedback.contact_id IS 'The contact the suggestion was for';
COMMENT ON COLUMN group_suggestion_feedback.group_id IS 'The group that was suggested';
COMMENT ON COLUMN group_suggestion_feedback.suggestion_type IS 'Type of suggestion (default: ai)';
COMMENT ON COLUMN group_suggestion_feedback.feedback IS 'User feedback: accepted or rejected';
