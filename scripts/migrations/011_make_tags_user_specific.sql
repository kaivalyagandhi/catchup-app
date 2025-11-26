-- Migration 011: Make tags user-specific
-- Add user_id to tags table and update constraints

-- Step 1: Add user_id column (nullable initially to handle existing data)
ALTER TABLE tags ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Step 2: For existing tags, assign them to the user who owns the contacts using them
-- This handles the migration of existing data
UPDATE tags t
SET user_id = (
    SELECT c.user_id 
    FROM contact_tags ct
    INNER JOIN contacts c ON ct.contact_id = c.id
    WHERE ct.tag_id = t.id
    LIMIT 1
)
WHERE user_id IS NULL;

-- Step 3: Delete any orphaned tags that have no contact associations
DELETE FROM tags WHERE user_id IS NULL;

-- Step 4: Make user_id NOT NULL now that all tags have a user
ALTER TABLE tags ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Drop the old global unique constraint
ALTER TABLE tags DROP CONSTRAINT IF EXISTS unique_tag_text;

-- Step 6: Add new unique constraint scoped to user
-- Note: PostgreSQL doesn't support expressions in UNIQUE constraints directly
-- We'll use a unique index instead
CREATE UNIQUE INDEX unique_tag_text_per_user ON tags (user_id, LOWER(text));

-- Step 7: Add index for user_id
CREATE INDEX idx_tags_user_id ON tags(user_id);

-- Step 8: Update the existing text index to be more efficient with user_id
DROP INDEX IF EXISTS idx_tags_text_lower;
CREATE INDEX idx_tags_user_text_lower ON tags(user_id, LOWER(text));
