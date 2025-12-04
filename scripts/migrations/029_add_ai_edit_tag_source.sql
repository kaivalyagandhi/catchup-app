-- Migration: Add 'ai_edit' to tag_source enum
-- Purpose: Support tracking tags created from AI-powered pending edits

-- Add 'ai_edit' to the tag_source enum
ALTER TYPE tag_source ADD VALUE IF NOT EXISTS 'ai_edit';

-- Note: This migration is safe to run multiple times due to IF NOT EXISTS
