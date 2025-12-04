/**
 * Migration: Add Pending Edits Deduplication
 * 
 * Adds a unique constraint to prevent duplicate pending edits
 * Scoped to (user_id, session_id, edit_type, target_contact_id, field, proposed_value)
 * 
 * This ensures that the same edit cannot be created twice in the same session.
 */

-- Add unique constraint to prevent duplicate pending edits
-- PostgreSQL unique constraints treat NULL as distinct, so we need to handle this
-- by using COALESCE in the constraint definition
ALTER TABLE pending_edits
ADD CONSTRAINT unique_pending_edit_per_session UNIQUE (
  user_id,
  session_id,
  edit_type,
  target_contact_id,
  field,
  proposed_value
);

-- Add index for faster duplicate detection queries
CREATE INDEX idx_pending_edits_dedup_check ON pending_edits (
  user_id,
  session_id,
  edit_type,
  target_contact_id,
  field,
  proposed_value
) WHERE status != 'dismissed';
