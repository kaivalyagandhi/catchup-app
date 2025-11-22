-- Migration: Create users table for authentication
-- This migration adds user authentication support

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on role for authorization queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add user_id column to existing tables if not exists
-- This links all data to authenticated users

-- Add user_id to contacts table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE contacts ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX idx_contacts_user_id ON contacts(user_id);
  END IF;
END $$;

-- Add user_id to groups table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'groups' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE groups ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX idx_groups_user_id ON groups(user_id);
  END IF;
END $$;

-- Add user_id to suggestions table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suggestions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE suggestions ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX idx_suggestions_user_id ON suggestions(user_id);
  END IF;
END $$;

-- Add user_id to interaction_logs table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'interaction_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE interaction_logs ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX idx_interaction_logs_user_id ON interaction_logs(user_id);
  END IF;
END $$;

-- Add user_id to voice_notes table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'voice_notes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE voice_notes ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX idx_voice_notes_user_id ON voice_notes(user_id);
  END IF;
END $$;

-- Add user_id to google_calendars table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'google_calendars' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE google_calendars ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX idx_google_calendars_user_id ON google_calendars(user_id);
  END IF;
END $$;

-- Add user_id to availability_params table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'availability_params' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE availability_params ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX idx_availability_params_user_id ON availability_params(user_id);
  END IF;
END $$;

-- Add user_id to notification_preferences table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_preferences' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
  END IF;
END $$;

-- Add user_id to oauth_tokens table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'oauth_tokens' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
  END IF;
END $$;
