-- Migration 021: Add Google SSO support to users table
-- This migration adds columns and constraints to support Google Single Sign-On authentication

-- Add Google SSO columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Make password_hash nullable for Google SSO users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add unique constraint on google_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_google_id_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_google_id_key UNIQUE (google_id);
  END IF;
END $$;

-- Add indexes for Google SSO lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- Update existing users to have auth_provider set to 'email'
UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL;

-- For any users with NULL password_hash, set a placeholder google_id
-- This handles test data or incomplete user records
UPDATE users 
SET google_id = 'legacy_user_' || id::text 
WHERE password_hash IS NULL AND google_id IS NULL;

-- Add constraint to ensure either password or google_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_auth_method'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT check_auth_method 
      CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL);
  END IF;
END $$;

-- Add comment to document the auth_provider values
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: email, google, or both';
COMMENT ON COLUMN users.google_id IS 'Google user ID (sub claim from ID token)';
COMMENT ON COLUMN users.profile_picture_url IS 'URL to user profile picture from OAuth provider';

