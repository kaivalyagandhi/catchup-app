-- Migration 056: Create suggestion_signal_weights table
-- Requirements: 17.4
-- Stores configurable signal weights for the AI suggestion engine.
-- user_id NULL = global defaults row.
-- Weights must sum to ~1.0 (between 0.99 and 1.01 for numeric precision tolerance).

CREATE TABLE suggestion_signal_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = global defaults
  enrichment_data NUMERIC(4,3) NOT NULL DEFAULT 0.25,
  interaction_logs NUMERIC(4,3) NOT NULL DEFAULT 0.35,
  calendar_data NUMERIC(4,3) NOT NULL DEFAULT 0.25,
  contact_metadata NUMERIC(4,3) NOT NULL DEFAULT 0.15,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT weights_sum_check CHECK (
    enrichment_data + interaction_logs + calendar_data + contact_metadata BETWEEN 0.99 AND 1.01
  )
);

-- Insert global defaults (user_id = NULL)
INSERT INTO suggestion_signal_weights (enrichment_data, interaction_logs, calendar_data, contact_metadata)
VALUES (0.25, 0.35, 0.25, 0.15);
