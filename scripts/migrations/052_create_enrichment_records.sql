-- Migration 052: Create enrichment_records table
-- Requirements: 10.4
-- Links parsed interaction summaries to matched contacts with per-platform enrichment data

CREATE TABLE enrichment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  import_record_id UUID REFERENCES import_records(id) ON DELETE SET NULL,
  interaction_summary_id UUID REFERENCES interaction_summaries(id) ON DELETE SET NULL,
  platform VARCHAR(20) NOT NULL,
  message_count INT NOT NULL DEFAULT 0,
  first_message_date TIMESTAMPTZ,
  last_message_date TIMESTAMPTZ,
  avg_messages_per_month NUMERIC(10,2) DEFAULT 0,
  topics JSONB DEFAULT '[]',
  sentiment VARCHAR(10),          -- positive, neutral, negative
  raw_data_reference VARCHAR(64), -- SHA-256 hash of source file
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrichment_records_contact ON enrichment_records(contact_id);
CREATE INDEX idx_enrichment_records_user ON enrichment_records(user_id);
CREATE INDEX idx_enrichment_records_import ON enrichment_records(import_record_id);
