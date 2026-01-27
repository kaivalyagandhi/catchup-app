-- Migration 032: Add Tier 1 Foundation schema updates
-- This migration adds timezone support for users and archived_at timestamp for contacts
-- Requirements: 11.1 (timezone preference storage), 15.1 (contact archival)

-- ============================================================================
-- Task 1.1: Add timezone column to users table
-- Requirements: 11.1 - Store timezone preference field in user preferences table
-- ============================================================================

-- Add timezone column to users table with UTC as default
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Add index for timezone lookups (useful for batch operations by timezone)
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);

-- Add comment to document the timezone column
COMMENT ON COLUMN users.timezone IS 'IANA timezone identifier (e.g., America/New_York, Europe/London). Defaults to UTC.';

-- ============================================================================
-- Task 1.2: Add archived_at column to contacts table
-- Requirements: 15.1 - Soft-delete contacts by setting archived_at timestamp
-- ============================================================================

-- Add archived_at column to contacts table
-- This replaces the boolean 'archived' column with a timestamp for better tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create composite index for efficient filtering of archived contacts per user
-- This index supports:
-- 1. Finding all non-archived contacts for a user (WHERE user_id = ? AND archived_at IS NULL)
-- 2. Finding all archived contacts for a user (WHERE user_id = ? AND archived_at IS NOT NULL)
-- 3. Sorting archived contacts by archive date
CREATE INDEX IF NOT EXISTS idx_contacts_archived ON contacts(user_id, archived_at);

-- Migrate existing archived boolean data to archived_at timestamp
-- If archived = true, set archived_at to the updated_at timestamp (best approximation)
UPDATE contacts 
SET archived_at = updated_at 
WHERE archived = true AND archived_at IS NULL;

-- Add comment to document the archived_at column
COMMENT ON COLUMN contacts.archived_at IS 'Timestamp when contact was archived (soft-deleted). NULL means contact is active.';

-- Note: The existing 'archived' boolean column is kept for backward compatibility
-- but new code should use 'archived_at' for archival operations
