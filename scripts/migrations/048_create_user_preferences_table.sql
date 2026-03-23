-- Migration 048: Create user_preferences table for Organize Contacts Evolution
-- Requirements: 1.5 - Backend Data Foundations
-- This migration creates the user_preferences key-value store table

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_key VARCHAR(255) NOT NULL,
  preference_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Create index for efficient querying by user and key
CREATE INDEX idx_up_user_key ON user_preferences(user_id, preference_key);

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'Generic key-value store for user preferences (e.g., keyboard shortcuts, UI settings)';
COMMENT ON COLUMN user_preferences.user_id IS 'The user who owns this preference';
COMMENT ON COLUMN user_preferences.preference_key IS 'The preference identifier (e.g., keyboard-shortcuts)';
COMMENT ON COLUMN user_preferences.preference_value IS 'The preference value stored as JSONB';
COMMENT ON COLUMN user_preferences.updated_at IS 'Timestamp of last update';
