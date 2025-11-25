-- Migration 008: Add unique constraints for groups and tags to prevent duplicates
-- This migration adds database-level constraints to ensure no duplicate group names per user
-- and no duplicate tag text (case-insensitive)

-- Add unique constraint for group names per user
-- First, remove any existing duplicates (keep the oldest one)
WITH duplicates AS (
    SELECT id, user_id, name, 
           ROW_NUMBER() OVER (PARTITION BY user_id, LOWER(name) ORDER BY created_at ASC) as rn
    FROM groups
    WHERE archived = false
)
UPDATE groups g
SET name = g.name || ' (' || d.rn || ')'
FROM duplicates d
WHERE g.id = d.id AND d.rn > 1;

-- Now add the unique constraint
ALTER TABLE groups 
ADD CONSTRAINT unique_group_name_per_user UNIQUE (user_id, name);

-- Add unique constraint for tag text (case-insensitive)
-- First, merge duplicate tags (keep the oldest one)
WITH duplicate_tags AS (
    SELECT LOWER(text) as lower_text, MIN(id) as keep_id, ARRAY_AGG(id) as all_ids
    FROM tags
    GROUP BY LOWER(text)
    HAVING COUNT(*) > 1
)
UPDATE contact_tags ct
SET tag_id = dt.keep_id
FROM duplicate_tags dt
WHERE ct.tag_id = ANY(dt.all_ids) AND ct.tag_id != dt.keep_id;

-- Delete the duplicate tags
WITH duplicate_tags AS (
    SELECT LOWER(text) as lower_text, MIN(id) as keep_id, ARRAY_AGG(id) as all_ids
    FROM tags
    GROUP BY LOWER(text)
    HAVING COUNT(*) > 1
)
DELETE FROM tags t
USING duplicate_tags dt
WHERE t.id = ANY(dt.all_ids) AND t.id != dt.keep_id;

-- Now add the unique constraint
ALTER TABLE tags 
ADD CONSTRAINT unique_tag_text UNIQUE (LOWER(text));

-- Add index for case-insensitive tag lookups
CREATE INDEX IF NOT EXISTS idx_tags_text_lower ON tags(LOWER(text));
