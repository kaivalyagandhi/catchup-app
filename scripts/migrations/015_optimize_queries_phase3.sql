-- Migration: Optimize Database Queries (Phase 3, Task 3.4)
-- Date: 2026-02-20
-- Purpose: Add indexes for cursor-based pagination and optimize query performance

-- ============================================================================
-- CONTACTS TABLE INDEXES
-- ============================================================================

-- Index for cursor-based pagination by last_contact_date
-- Used by streaming repository for efficient pagination
CREATE INDEX IF NOT EXISTS idx_contacts_user_last_contact_cursor
ON contacts(user_id, last_contact_date ASC NULLS FIRST, id)
WHERE archived_at IS NULL;

-- Index for archived contacts filter
-- Improves performance of archived = false queries
CREATE INDEX IF NOT EXISTS idx_contacts_user_archived
ON contacts(user_id, archived_at)
WHERE archived_at IS NULL;

-- Index for Dunbar circle filtering
-- Used by circle assignment queries
CREATE INDEX IF NOT EXISTS idx_contacts_user_circle
ON contacts(user_id, dunbar_circle)
WHERE archived_at IS NULL;

-- Index for Google sync queries
-- Used by contact sync service
CREATE INDEX IF NOT EXISTS idx_contacts_user_google_resource
ON contacts(user_id, google_resource_name)
WHERE google_resource_name IS NOT NULL;

-- ============================================================================
-- SUGGESTIONS TABLE INDEXES
-- ============================================================================

-- Index for user suggestions by status
-- Used by suggestion repository
CREATE INDEX IF NOT EXISTS idx_suggestions_user_status_created
ON suggestions(user_id, status, created_at DESC);

-- Index for pending suggestions
-- Used by suggestion generation
CREATE INDEX IF NOT EXISTS idx_suggestions_user_pending
ON suggestions(user_id, created_at DESC)
WHERE status = 'pending';

-- ============================================================================
-- CALENDAR TABLES INDEXES
-- ============================================================================

-- Index for selected calendars
-- Used by calendar service
CREATE INDEX IF NOT EXISTS idx_google_calendars_user_selected
ON google_calendars(user_id, selected, is_primary DESC, name ASC)
WHERE selected = true;

-- ============================================================================
-- SYNC STATE INDEXES
-- ============================================================================

-- Index for sync schedule queries
-- Used by adaptive sync scheduler
CREATE INDEX IF NOT EXISTS idx_sync_schedule_next_sync
ON sync_schedule(integration_type, next_sync_at)
WHERE next_sync_at IS NOT NULL;

-- Index for circuit breaker state
-- Used by circuit breaker manager
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_user_integration
ON circuit_breaker_state(user_id, integration_type, state);

-- Index for token health monitoring
-- Used by token health monitor
CREATE INDEX IF NOT EXISTS idx_token_health_expiring
ON token_health(integration_type, expiry_date)
WHERE status IN ('valid', 'expiring_soon');

-- ============================================================================
-- VERIFY INDEXES
-- ============================================================================

-- Query to verify all indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
