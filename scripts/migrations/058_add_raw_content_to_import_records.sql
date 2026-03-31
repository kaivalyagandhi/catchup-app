-- Migration 058: Add raw_content column to import_records
-- Requirements: 6.1, 11.1
-- Stores the uploaded file content temporarily so the async parse job can access it.
-- The column is cleared after parsing completes to avoid storing raw message content (Req 12.6).

ALTER TABLE import_records ADD COLUMN raw_content BYTEA;
