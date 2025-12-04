-- Migration 020: Add Performance Indexes for SMS/MMS Enrichment
-- Optimizes database queries for high-volume SMS/MMS processing
-- Requirements: All (Performance optimization)

-- Composite index for phone number lookups with verification status
-- This speeds up the common query: "find verified user by phone number"
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_phone_verified 
ON user_phone_numbers(phone_number, verified) 
WHERE verified = true;

-- Composite index for enrichment queries by user and status
-- Speeds up queries like: "get pending enrichments for user"
CREATE INDEX IF NOT EXISTS idx_enrichment_items_user_status 
ON enrichment_items(user_id, status);

-- Index for enrichment queries ordered by creation time
-- Speeds up queries like: "get recent enrichments"
CREATE INDEX IF NOT EXISTS idx_enrichment_items_created_at 
ON enrichment_items(created_at DESC);

-- Composite index for common query pattern: user + source + status
-- Speeds up queries like: "get pending SMS enrichments for user"
CREATE INDEX IF NOT EXISTS idx_enrichment_items_user_source_status 
ON enrichment_items(user_id, source, status);

-- Partial index for pending enrichments only
-- Reduces index size and speeds up pending enrichment queries
CREATE INDEX IF NOT EXISTS idx_enrichment_items_pending 
ON enrichment_items(user_id, created_at DESC) 
WHERE status = 'pending';

-- Index for notification queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_status_created 
ON notification_queue(status, created_at) 
WHERE status = 'pending';

-- Analyze tables to update statistics for query planner
ANALYZE user_phone_numbers;
ANALYZE enrichment_items;
ANALYZE notification_queue;

-- Add comments for documentation
COMMENT ON INDEX idx_user_phone_numbers_phone_verified IS 
'Optimizes verified phone number lookups during webhook processing';

COMMENT ON INDEX idx_enrichment_items_user_status IS 
'Optimizes enrichment queries by user and status';

COMMENT ON INDEX idx_enrichment_items_user_source_status IS 
'Optimizes enrichment queries by user, source type, and status';

COMMENT ON INDEX idx_enrichment_items_pending IS 
'Partial index for pending enrichments only - reduces index size';

COMMENT ON INDEX idx_notification_queue_status_created IS 
'Optimizes notification queue processing for pending notifications';
