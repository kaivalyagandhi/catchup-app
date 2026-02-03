-- Migration: Create token_health table for OAuth token monitoring
-- Requirements: 1.5

-- Create token_health table
CREATE TABLE IF NOT EXISTS token_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('google_contacts', 'google_calendar')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('valid', 'expiring_soon', 'expired', 'revoked', 'unknown')),
  last_checked TIMESTAMP NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_token_health_user_integration ON token_health(user_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_token_health_status ON token_health(status);
CREATE INDEX IF NOT EXISTS idx_token_health_expiring ON token_health(expiry_date) WHERE status = 'expiring_soon';

-- Add comments for documentation
COMMENT ON TABLE token_health IS 'Tracks OAuth token health status for proactive monitoring';
COMMENT ON COLUMN token_health.status IS 'Current health status: valid, expiring_soon (within 24h), expired, revoked, or unknown';
COMMENT ON COLUMN token_health.last_checked IS 'Timestamp of last health check';
COMMENT ON COLUMN token_health.expiry_date IS 'Token expiration date from OAuth provider';
COMMENT ON COLUMN token_health.error_message IS 'Error message from last failed validation attempt';
