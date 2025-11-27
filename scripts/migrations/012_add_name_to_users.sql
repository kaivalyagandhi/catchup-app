-- Migration 012: Add name column to users table
-- This adds an optional name field for user profiles

ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add index for name lookups
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
