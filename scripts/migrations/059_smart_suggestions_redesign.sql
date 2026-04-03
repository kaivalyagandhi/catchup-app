-- Migration 059: Smart Suggestions Redesign
-- Requirements: 4.6, 8.1, 9.4, 11.3, 15.3
-- Creates suggestion_feedback, suggestion_exclusions, suggestion_pauses, connection_goals tables
-- Adds new columns to suggestions and user_preferences tables

-- ============================================================================
-- 1. suggestion_feedback table
-- Stores structured feedback records when users dismiss suggestions
-- ============================================================================
CREATE TABLE suggestion_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preset VARCHAR(50) NOT NULL CHECK (preset IN (
    'already_in_touch', 'not_relevant', 'timing_off', 'dont_suggest_contact', 'other'
  )),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggestion_feedback_user ON suggestion_feedback(user_id);
CREATE INDEX idx_suggestion_feedback_preset ON suggestion_feedback(user_id, preset, created_at);

-- ============================================================================
-- 2. suggestion_exclusions table
-- Tracks contacts permanently excluded from suggestions per user
-- ============================================================================
CREATE TABLE suggestion_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

CREATE INDEX idx_suggestion_exclusions_user ON suggestion_exclusions(user_id);

-- ============================================================================
-- 3. suggestion_pauses table
-- Stores temporary pause state for suggestion generation per user
-- ============================================================================
CREATE TABLE suggestion_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pause_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pause_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================================
-- 4. connection_goals table
-- User-defined goals that influence suggestion scoring
-- ============================================================================
CREATE TABLE connection_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_connection_goals_user_status ON connection_goals(user_id, status);

-- ============================================================================
-- 5. Add new columns to suggestions table
-- Supports post-interaction reviews, conversation starters, and goal scoring
-- ============================================================================
ALTER TABLE suggestions
  ADD COLUMN review_prompt_after TIMESTAMPTZ,
  ADD COLUMN review_outcome VARCHAR(20),
  ADD COLUMN review_reschedule_count INTEGER DEFAULT 0,
  ADD COLUMN conversation_starter TEXT,
  ADD COLUMN goal_relevance_score NUMERIC(5,2);

-- ============================================================================
-- 6. Add new column to user_preferences table
-- Tracks when the user last viewed the weekly digest
-- ============================================================================
ALTER TABLE user_preferences
  ADD COLUMN last_digest_viewed_at TIMESTAMPTZ;
