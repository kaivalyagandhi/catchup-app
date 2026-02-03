-- Migration: Create circuit_breaker_state table for sync failure management
-- Requirements: 2.6, 2.7

-- Create circuit_breaker_state table
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  state VARCHAR(20) NOT NULL CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMP,
  last_failure_reason TEXT,
  opened_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_user_integration ON circuit_breaker_state(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_state ON circuit_breaker_state(state);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_next_retry ON circuit_breaker_state(next_retry_at) WHERE state = 'open';

-- Add comments for documentation
COMMENT ON TABLE circuit_breaker_state IS 'Tracks circuit breaker state per user and integration to prevent repeated failed sync attempts';
COMMENT ON COLUMN circuit_breaker_state.state IS 'Circuit breaker state: closed (normal), open (blocking syncs), half_open (testing recovery)';
COMMENT ON COLUMN circuit_breaker_state.failure_count IS 'Number of consecutive failures (resets to 0 on success)';
COMMENT ON COLUMN circuit_breaker_state.last_failure_reason IS 'Error message from last failed sync attempt';
COMMENT ON COLUMN circuit_breaker_state.opened_at IS 'Timestamp when circuit breaker opened';
COMMENT ON COLUMN circuit_breaker_state.next_retry_at IS 'Timestamp when circuit breaker will transition to half_open';
