-- Migration 028: Add biweekly, quarterly, and na frequency options
-- Adds missing frequency options to the frequency_option enum

-- Add new values to the frequency_option enum
ALTER TYPE frequency_option ADD VALUE IF NOT EXISTS 'biweekly';
ALTER TYPE frequency_option ADD VALUE IF NOT EXISTS 'quarterly';
ALTER TYPE frequency_option ADD VALUE IF NOT EXISTS 'na';

-- Note: 'flexible' already exists in the enum from init-db.sql
