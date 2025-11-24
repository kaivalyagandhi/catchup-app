-- Fix users table to add authentication columns
-- Run this to add missing columns to existing users table

-- Add password_hash column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

-- Add role column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Make password_hash NOT NULL after adding it
DO $$ 
BEGIN
  -- First check if there are any rows with NULL password_hash
  IF NOT EXISTS (SELECT 1 FROM users WHERE password_hash IS NULL) THEN
    ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
  END IF;
END $$;

SELECT 'Users table fixed successfully' AS status;
