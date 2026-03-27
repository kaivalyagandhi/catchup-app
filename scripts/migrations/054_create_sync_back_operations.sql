-- Migration 054: Create sync_back_operations table
-- Requirements: 13.1
-- Tracks local contact edits pending sync-back to Google Contacts via People API

CREATE TABLE sync_back_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  field VARCHAR(50) NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_review',
  google_etag VARCHAR(255),
  conflict_google_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT sync_back_status_check CHECK (status IN ('pending_review', 'approved', 'syncing', 'synced', 'conflict', 'failed', 'skipped'))
);

CREATE INDEX idx_sync_back_user ON sync_back_operations(user_id);
CREATE INDEX idx_sync_back_user_status ON sync_back_operations(user_id, status);
CREATE INDEX idx_sync_back_contact ON sync_back_operations(contact_id);
