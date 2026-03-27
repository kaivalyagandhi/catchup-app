-- Migration 050: Create import_records table
-- Requirements: 11.1, 12.1
-- Tracks chat history import jobs with status, match statistics, and error handling

CREATE TABLE import_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,  -- whatsapp, instagram, imessage, facebook, twitter, google_messages
  file_name VARCHAR(255) NOT NULL,
  file_hash VARCHAR(64) NOT NULL, -- SHA-256 for dedup
  status VARCHAR(20) NOT NULL DEFAULT 'processing',  -- processing, parsed, enriching, complete, failed
  failed_phase VARCHAR(20),       -- parsing, extracting, matching (if failed)
  error_message TEXT,
  total_participants INT DEFAULT 0,
  auto_matched INT DEFAULT 0,
  likely_matched INT DEFAULT 0,
  unmatched INT DEFAULT 0,
  enrichment_records_created INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT import_records_status_check CHECK (status IN ('processing', 'parsed', 'enriching', 'complete', 'failed'))
);

CREATE INDEX idx_import_records_user_id ON import_records(user_id);
CREATE INDEX idx_import_records_user_status ON import_records(user_id, status);
