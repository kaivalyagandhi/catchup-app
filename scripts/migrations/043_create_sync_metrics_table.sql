-- Migration: Create sync_metrics table for tracking sync results and API call savings
-- Requirements: 10.5

-- Create sync_metrics table
CREATE TABLE IF NOT EXISTS sync_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('full', 'incremental', 'webhook_triggered', 'manual')),
  result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'skipped')),
  skip_reason VARCHAR(50),
  duration_ms INTEGER,
  items_processed INTEGER,
  api_calls_made INTEGER,
  api_calls_saved INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sync_metrics_user_integration ON sync_metrics(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_created_at ON sync_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_result ON sync_metrics(result);

-- Add comments for documentation
COMMENT ON TABLE sync_metrics IS 'Tracks sync execution metrics for monitoring and dashboard reporting';
COMMENT ON COLUMN sync_metrics.sync_type IS 'Type of sync: full, incremental, webhook_triggered, or manual';
COMMENT ON COLUMN sync_metrics.result IS 'Sync outcome: success, failure, or skipped';
COMMENT ON COLUMN sync_metrics.skip_reason IS 'Reason for skipped sync: circuit_breaker_open, invalid_token, etc.';
COMMENT ON COLUMN sync_metrics.duration_ms IS 'Sync execution duration in milliseconds';
COMMENT ON COLUMN sync_metrics.items_processed IS 'Number of contacts/events processed during sync';
COMMENT ON COLUMN sync_metrics.api_calls_made IS 'Number of API calls made to Google during sync';
COMMENT ON COLUMN sync_metrics.api_calls_saved IS 'Number of API calls saved by optimization features';
