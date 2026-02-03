-- Migration: Add admin role support to users table
-- Requirements: 11.1, 11.4

-- Add admin role columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_promoted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS admin_promoted_by VARCHAR(255);

-- Create index for efficient admin user queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN users.is_admin IS 'Whether the user has admin privileges for accessing sync health dashboard';
COMMENT ON COLUMN users.admin_promoted_at IS 'Timestamp when user was promoted to admin';
COMMENT ON COLUMN users.admin_promoted_by IS 'Email or identifier of who promoted this user to admin';
