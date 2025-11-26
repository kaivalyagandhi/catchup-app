-- Add email column to oauth_tokens table to store the connected account email
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_email ON oauth_tokens(email);
