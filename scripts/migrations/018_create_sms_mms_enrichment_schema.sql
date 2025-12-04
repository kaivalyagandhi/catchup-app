-- Migration 018: Create SMS/MMS Enrichment Schema
-- Requirements: 1.1, 2.1, 7.1
-- This migration adds support for SMS/MMS-based enrichment capture

-- Create user_phone_numbers table for phone number verification
CREATE TABLE IF NOT EXISTS user_phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    encrypted_phone_number TEXT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6),
    verification_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for user_phone_numbers
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_phone ON user_phone_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_verified ON user_phone_numbers(verified);

-- Add source and source_metadata columns to enrichment_items table
ALTER TABLE enrichment_items 
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'web',
    ADD COLUMN IF NOT EXISTS source_metadata JSONB;

-- Create index for querying enrichments by source
CREATE INDEX IF NOT EXISTS idx_enrichment_items_source ON enrichment_items(source);

-- Create GIN index for source_metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_enrichment_items_source_metadata ON enrichment_items USING GIN (source_metadata);

-- Add trigger to update updated_at timestamp for user_phone_numbers
CREATE TRIGGER update_user_phone_numbers_updated_at 
    BEFORE UPDATE ON user_phone_numbers
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_phone_numbers IS 'Stores verified phone numbers linked to user accounts for SMS/MMS enrichment';
COMMENT ON COLUMN user_phone_numbers.phone_number IS 'Plain text phone number for lookups (E.164 format)';
COMMENT ON COLUMN user_phone_numbers.encrypted_phone_number IS 'AES-256 encrypted phone number for secure storage';
COMMENT ON COLUMN user_phone_numbers.verified IS 'Whether the phone number has been verified via SMS code';
COMMENT ON COLUMN user_phone_numbers.verification_code IS '6-digit numeric verification code';
COMMENT ON COLUMN user_phone_numbers.verification_expires_at IS 'Expiration timestamp for verification code (10 minutes)';

COMMENT ON COLUMN enrichment_items.source IS 'Source of enrichment: web, sms, mms, voice';
COMMENT ON COLUMN enrichment_items.source_metadata IS 'JSON metadata about the source (phone_number, media_type, message_sid, etc.)';

-- Create notification_queue table for SMS notifications
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL, -- 'sms', 'email', etc.
    recipient VARCHAR(255) NOT NULL, -- phone number or email
    message TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for notification_queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON notification_queue(created_at);

COMMENT ON TABLE notification_queue IS 'Queue for outgoing notifications (SMS, email) to users';
COMMENT ON COLUMN notification_queue.channel IS 'Notification channel: sms, email';
COMMENT ON COLUMN notification_queue.status IS 'Notification status: pending, sent, failed';

