-- Migration 017: Create tables for incremental chat edits feature
-- Requirements: 7.6, 10.1, 4.1, 4.2, 5.4, 5.5

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT chat_sessions_status_check CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- Pending edits table
CREATE TABLE IF NOT EXISTS pending_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  edit_type VARCHAR(50) NOT NULL,
  target_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  target_contact_name VARCHAR(255),
  target_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  target_group_name VARCHAR(255),
  field VARCHAR(100),
  proposed_value JSONB NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  source JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  disambiguation_candidates JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT pending_edits_edit_type_check CHECK (edit_type IN (
    'create_contact', 'update_contact_field', 'add_tag', 'remove_tag',
    'add_to_group', 'remove_from_group', 'create_group'
  )),
  CONSTRAINT pending_edits_status_check CHECK (status IN ('pending', 'needs_disambiguation')),
  CONSTRAINT pending_edits_confidence_check CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- Edit history table (immutable)
CREATE TABLE IF NOT EXISTS edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_edit_id UUID NOT NULL,
  edit_type VARCHAR(50) NOT NULL,
  target_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  target_contact_name VARCHAR(255),
  target_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  target_group_name VARCHAR(255),
  field VARCHAR(100),
  applied_value JSONB NOT NULL,
  previous_value JSONB,
  source JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT edit_history_edit_type_check CHECK (edit_type IN (
    'create_contact', 'update_contact_field', 'add_tag', 'remove_tag',
    'add_to_group', 'remove_from_group', 'create_group'
  ))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_edits_user ON pending_edits(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_edits_session ON pending_edits(session_id);
CREATE INDEX IF NOT EXISTS idx_pending_edits_status ON pending_edits(status);
CREATE INDEX IF NOT EXISTS idx_edit_history_user ON edit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_submitted ON edit_history(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);

-- Comments
COMMENT ON TABLE chat_sessions IS 'Tracks chat interaction sessions for grouping edits';
COMMENT ON TABLE pending_edits IS 'Stores pending edit suggestions awaiting user confirmation';
COMMENT ON TABLE edit_history IS 'Immutable audit log of all submitted edits';
COMMENT ON COLUMN pending_edits.confidence_score IS 'AI confidence in the edit (0.00-1.00)';
COMMENT ON COLUMN pending_edits.source IS 'JSON with type, transcriptExcerpt, timestamp, fullContext';
COMMENT ON COLUMN pending_edits.disambiguation_candidates IS 'Array of candidate contacts when disambiguation needed';
