-- Migration 060: Add consecutive_failures column to token_health table
-- Feature: 034-ui-banner-optimizations
-- Tracks transient refresh failures for 3-strike escalation to revoked status

ALTER TABLE token_health ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0;
