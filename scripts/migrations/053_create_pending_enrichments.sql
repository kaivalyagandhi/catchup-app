-- Migration 053: Create pending_enrichments table
-- Requirements: 7.1, 8.1
-- Stores participants that need user review for contact linking/creation after chat import

CREATE TABLE pending_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  import_record_id UUID NOT NULL REFERENCES import_records(id) ON DELETE CASCADE,
  interaction_summary_id UUID NOT NULL REFERENCES interaction_summaries(id) ON DELETE CASCADE,
  participant_identifier VARCHAR(255) NOT NULL,
  participant_display_name VARCHAR(255),
  platform VARCHAR(20) NOT NULL,
  match_tier VARCHAR(10) NOT NULL, -- likely, unmatched
  suggested_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  confidence NUMERIC(4,3),
  match_reason VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, linked, created, dismissed
  message_count INT DEFAULT 0,
  first_message_date TIMESTAMPTZ,
  last_message_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_pending_enrichments_user ON pending_enrichments(user_id);
CREATE INDEX idx_pending_enrichments_user_status ON pending_enrichments(user_id, status);
CREATE INDEX idx_pending_enrichments_import ON pending_enrichments(import_record_id);
