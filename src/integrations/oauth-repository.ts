/**
 * OAuth Token Repository
 *
 * Handles database operations for OAuth tokens
 * Tokens are encrypted at rest for security
 */

import pool from '../db/connection';
import { encryptToken, decryptToken } from '../utils/encryption';

export interface OAuthToken {
  id: string;
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: Date;
  scope?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OAuthTokenRow {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string | null;
  expires_at: Date | null;
  scope: string | null;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}

function rowToOAuthToken(row: OAuthTokenRow): OAuthToken {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    accessToken: decryptToken(row.access_token),
    refreshToken: row.refresh_token ? decryptToken(row.refresh_token) : undefined,
    tokenType: row.token_type || undefined,
    expiresAt: row.expires_at || undefined,
    scope: row.scope || undefined,
    email: row.email || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get OAuth token for a user and provider
 */
export async function getToken(
  userId: string,
  provider: string
): Promise<OAuthToken | null> {
  const result = await pool.query<OAuthTokenRow>(
    'SELECT * FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
    [userId, provider]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return rowToOAuthToken(result.rows[0]);
}

/**
 * Get all users with OAuth tokens for a specific provider
 */
export async function getUsersWithProvider(
  provider: string
): Promise<string[]> {
  const result = await pool.query<{ user_id: string }>(
    'SELECT DISTINCT user_id FROM oauth_tokens WHERE provider = $1',
    [provider]
  );

  return result.rows.map((row) => row.user_id);
}

/**
 * Upsert OAuth token
 * Encrypts tokens before storage
 */
export async function upsertToken(
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken?: string,
  tokenType?: string,
  expiresAt?: Date,
  scope?: string,
  email?: string
): Promise<OAuthToken> {
  // Encrypt tokens before storage
  const encryptedAccessToken = encryptToken(accessToken);
  const encryptedRefreshToken = refreshToken ? encryptToken(refreshToken) : null;
  
  const result = await pool.query<OAuthTokenRow>(
    `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, token_type, expires_at, scope, email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, provider)
     DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       token_type = EXCLUDED.token_type,
       expires_at = EXCLUDED.expires_at,
       scope = EXCLUDED.scope,
       email = EXCLUDED.email,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, provider, encryptedAccessToken, encryptedRefreshToken, tokenType, expiresAt, scope, email]
  );

  return rowToOAuthToken(result.rows[0]);
}

/**
 * Delete OAuth token
 */
export async function deleteToken(
  userId: string,
  provider: string
): Promise<void> {
  await pool.query(
    'DELETE FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
    [userId, provider]
  );
}
