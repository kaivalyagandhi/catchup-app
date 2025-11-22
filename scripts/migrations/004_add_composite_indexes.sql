-- Migration 004: Add composite indexes for query optimization
-- This migration adds composite indexes for frequently queried field combinations
-- to improve query performance for common access patterns

-- Composite index for filtering contacts by user and archived status
-- Used in: listContacts with archived filter
CREATE INDEX IF NOT EXISTS idx_contacts_user_archived 
ON contacts(user_id, archived);

-- Composite index for filtering contacts by user and last contact date
-- Used in: suggestion generation queries that need to find contacts due for catchup
CREATE INDEX IF NOT EXISTS idx_contacts_user_last_contact 
ON contacts(user_id, last_contact_date);

-- Composite index for filtering contacts by user, archived, and last contact date
-- Used in: active contacts sorted by last contact date
CREATE INDEX IF NOT EXISTS idx_contacts_user_archived_last_contact 
ON contacts(user_id, archived, last_contact_date);

-- Composite index for filtering suggestions by user and status
-- Used in: getPendingSuggestions, suggestion feed queries
CREATE INDEX IF NOT EXISTS idx_suggestions_user_status 
ON suggestions(user_id, status);

-- Composite index for filtering suggestions by user, status, and created date
-- Used in: suggestion feed with sorting by creation date
CREATE INDEX IF NOT EXISTS idx_suggestions_user_status_created 
ON suggestions(user_id, status, created_at DESC);

-- Composite index for snoozed suggestions that need to resurface
-- Used in: finding snoozed suggestions that should become pending
CREATE INDEX IF NOT EXISTS idx_suggestions_status_snoozed_until 
ON suggestions(status, snoozed_until) 
WHERE status = 'snoozed';

-- Composite index for interaction logs by user and date
-- Used in: getInteractionHistory with date range filtering
CREATE INDEX IF NOT EXISTS idx_interaction_logs_user_date 
ON interaction_logs(user_id, date DESC);

-- Composite index for interaction logs by contact and date
-- Used in: finding last interaction date for a contact
CREATE INDEX IF NOT EXISTS idx_interaction_logs_contact_date 
ON interaction_logs(contact_id, date DESC);

-- Composite index for groups by user and archived status
-- Used in: listing active groups for a user
CREATE INDEX IF NOT EXISTS idx_groups_user_archived 
ON groups(user_id, archived);

-- Composite index for selected calendars
-- Used in: getFreeTimeSlots to quickly find selected calendars
CREATE INDEX IF NOT EXISTS idx_google_calendars_user_selected 
ON google_calendars(user_id, selected) 
WHERE selected = true;

-- Composite index for voice notes by user and processed status
-- Used in: finding unprocessed voice notes for a user
CREATE INDEX IF NOT EXISTS idx_voice_notes_user_processed 
ON voice_notes(user_id, processed) 
WHERE processed = false;

-- Add EXPLAIN ANALYZE comments for common queries
COMMENT ON INDEX idx_contacts_user_archived IS 
'Optimizes queries filtering contacts by user and archived status';

COMMENT ON INDEX idx_suggestions_user_status IS 
'Optimizes queries filtering suggestions by user and status (e.g., pending suggestions)';

COMMENT ON INDEX idx_suggestions_status_snoozed_until IS 
'Partial index for efficiently finding snoozed suggestions that should resurface';

COMMENT ON INDEX idx_google_calendars_user_selected IS 
'Partial index for quickly finding selected calendars for availability detection';

COMMENT ON INDEX idx_voice_notes_user_processed IS 
'Partial index for finding unprocessed voice notes requiring transcription';

-- Analyze tables to update statistics for query planner
ANALYZE contacts;
ANALYZE suggestions;
ANALYZE interaction_logs;
ANALYZE groups;
ANALYZE google_calendars;
ANALYZE voice_notes;
ANALYZE tags;
ANALYZE contact_groups;
ANALYZE contact_tags;
