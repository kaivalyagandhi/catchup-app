-- Migration 051: Create interaction_summaries table
-- Requirements: 6.1
-- Stores per-participant interaction data extracted from chat history imports

CREATE TABLE interaction_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_record_id UUID NOT NULL REFERENCES import_records(id) ON DELETE CASCADE,
  participant_identifier VARCHAR(255) NOT NULL,
  participant_display_name VARCHAR(255),
  identifier_type VARCHAR(20) NOT NULL, -- phone, email, username, display_name
  platform VARCHAR(20) NOT NULL,
  message_count INT NOT NULL DEFAULT 0,
  first_message_date TIMESTAMPTZ NOT NULL,
  last_message_date TIMESTAMPTZ NOT NULL,
  avg_messages_per_month NUMERIC(10,2) DEFAULT 0,
  topics JSONB DEFAULT '[]',
  sentiment VARCHAR(10),  -- positive, neutral, negative
  ai_enrichment_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, complete, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interaction_summaries_import ON interaction_summaries(import_record_id);
CREATE INDEX idx_interaction_summaries_participant ON interaction_summaries(participant_identifier);
