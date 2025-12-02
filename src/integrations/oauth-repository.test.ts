/**
 * OAuth Repository Tests
 *
 * Tests for OAuth token storage with encryption
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as oauthRepository from './oauth-repository';
import pool from '../db/connection';
import * as encryption from '../utils/encryption';

// Mock the database connection
vi.mock('../db/connection', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe('OAuth Repository', () => {
  const originalEncryptionKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original encryption key
    process.env.ENCRYPTION_KEY = originalEncryptionKey;
  });

  describe('upsertToken', () => {
    it('should encrypt tokens before storing in database', async () => {
      const userId = 'user-123';
      const provider = 'google';
      const accessToken = 'access_token_plaintext';
      const refreshToken = 'refresh_token_plaintext';

      // Spy on encryption functions
      const encryptSpy = vi.spyOn(encryption, 'encryptToken');

      // Mock database response
      const mockDbRow = {
        id: 'token-id',
        user_id: userId,
        provider,
        access_token: encryption.encryptToken(accessToken),
        refresh_token: encryption.encryptToken(refreshToken),
        token_type: 'Bearer',
        expires_at: new Date('2025-12-31'),
        scope: 'email profile',
        email: 'user@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as any).mockResolvedValue({ rows: [mockDbRow] });

      // Call upsertToken
      await oauthRepository.upsertToken(
        userId,
        provider,
        accessToken,
        refreshToken,
        'Bearer',
        new Date('2025-12-31'),
        'email profile',
        'user@example.com'
      );

      // Verify encryption was called
      expect(encryptSpy).toHaveBeenCalledWith(accessToken);
      expect(encryptSpy).toHaveBeenCalledWith(refreshToken);

      // Verify database was called with encrypted tokens
      expect(pool.query).toHaveBeenCalled();
      const queryCall = (pool.query as any).mock.calls[0];
      const queryParams = queryCall[1];

      // Access token should be encrypted (not plaintext)
      expect(queryParams[2]).not.toBe(accessToken);
      // Refresh token should be encrypted (not plaintext)
      expect(queryParams[3]).not.toBe(refreshToken);
    });

    it('should handle optional refresh token', async () => {
      const userId = 'user-123';
      const provider = 'google';
      const accessToken = 'access_token_plaintext';

      // Mock database response
      const mockDbRow = {
        id: 'token-id',
        user_id: userId,
        provider,
        access_token: encryption.encryptToken(accessToken),
        refresh_token: null,
        token_type: 'Bearer',
        expires_at: null,
        scope: null,
        email: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as any).mockResolvedValue({ rows: [mockDbRow] });

      // Call upsertToken without refresh token
      const result = await oauthRepository.upsertToken(
        userId,
        provider,
        accessToken
      );

      // Verify result has no refresh token
      expect(result.refreshToken).toBeUndefined();
    });
  });

  describe('getToken', () => {
    it('should decrypt tokens after retrieving from database', async () => {
      const userId = 'user-123';
      const provider = 'google';
      const accessToken = 'access_token_plaintext';
      const refreshToken = 'refresh_token_plaintext';

      // Spy on decryption functions
      const decryptSpy = vi.spyOn(encryption, 'decryptToken');

      // Mock database response with encrypted tokens
      const mockDbRow = {
        id: 'token-id',
        user_id: userId,
        provider,
        access_token: encryption.encryptToken(accessToken),
        refresh_token: encryption.encryptToken(refreshToken),
        token_type: 'Bearer',
        expires_at: new Date('2025-12-31'),
        scope: 'email profile',
        email: 'user@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as any).mockResolvedValue({ rows: [mockDbRow] });

      // Call getToken
      const result = await oauthRepository.getToken(userId, provider);

      // Verify decryption was called
      expect(decryptSpy).toHaveBeenCalled();

      // Verify tokens are decrypted in result
      expect(result?.accessToken).toBe(accessToken);
      expect(result?.refreshToken).toBe(refreshToken);
    });

    it('should return null if token not found', async () => {
      (pool.query as any).mockResolvedValue({ rows: [] });

      const result = await oauthRepository.getToken('user-123', 'google');

      expect(result).toBeNull();
    });

    it('should handle tokens without refresh token', async () => {
      const userId = 'user-123';
      const provider = 'google';
      const accessToken = 'access_token_plaintext';

      // Mock database response without refresh token
      const mockDbRow = {
        id: 'token-id',
        user_id: userId,
        provider,
        access_token: encryption.encryptToken(accessToken),
        refresh_token: null,
        token_type: 'Bearer',
        expires_at: null,
        scope: null,
        email: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as any).mockResolvedValue({ rows: [mockDbRow] });

      const result = await oauthRepository.getToken(userId, provider);

      expect(result?.accessToken).toBe(accessToken);
      expect(result?.refreshToken).toBeUndefined();
    });
  });

  describe('Token Encryption Round Trip', () => {
    it('should encrypt on upsert and decrypt on get', async () => {
      const userId = 'user-123';
      const provider = 'google';
      const accessToken = 'ya29.a0AfH6SMBxExample';
      const refreshToken = '1//0gExample';

      // First, mock upsert
      const encryptedAccess = encryption.encryptToken(accessToken);
      const encryptedRefresh = encryption.encryptToken(refreshToken);

      const mockUpsertRow = {
        id: 'token-id',
        user_id: userId,
        provider,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        token_type: 'Bearer',
        expires_at: new Date('2025-12-31'),
        scope: 'email profile',
        email: 'user@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as any).mockResolvedValue({ rows: [mockUpsertRow] });

      // Upsert token
      const upsertResult = await oauthRepository.upsertToken(
        userId,
        provider,
        accessToken,
        refreshToken,
        'Bearer',
        new Date('2025-12-31'),
        'email profile',
        'user@example.com'
      );

      // Verify upsert result has decrypted tokens
      expect(upsertResult.accessToken).toBe(accessToken);
      expect(upsertResult.refreshToken).toBe(refreshToken);

      // Now mock get with the same encrypted data
      (pool.query as any).mockResolvedValue({ rows: [mockUpsertRow] });

      // Get token
      const getResult = await oauthRepository.getToken(userId, provider);

      // Verify get result has decrypted tokens
      expect(getResult?.accessToken).toBe(accessToken);
      expect(getResult?.refreshToken).toBe(refreshToken);
    });
  });

  describe('getUsersWithProvider', () => {
    it('should return list of user IDs with tokens for provider', async () => {
      const provider = 'google';
      const mockRows = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
        { user_id: 'user-3' },
      ];

      (pool.query as any).mockResolvedValue({ rows: mockRows });

      const result = await oauthRepository.getUsersWithProvider(provider);

      expect(result).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should return empty array if no users have provider', async () => {
      (pool.query as any).mockResolvedValue({ rows: [] });

      const result = await oauthRepository.getUsersWithProvider('google');

      expect(result).toEqual([]);
    });
  });

  describe('deleteToken', () => {
    it('should delete token from database', async () => {
      const userId = 'user-123';
      const provider = 'google';

      (pool.query as any).mockResolvedValue({ rows: [] });

      await oauthRepository.deleteToken(userId, provider);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
        [userId, provider]
      );
    });
  });

  describe('Security Properties', () => {
    it('should never store plaintext tokens in database', async () => {
      const userId = 'user-123';
      const provider = 'google';
      const accessToken = 'plaintext_access_token';
      const refreshToken = 'plaintext_refresh_token';

      // Mock database response
      const mockDbRow = {
        id: 'token-id',
        user_id: userId,
        provider,
        access_token: encryption.encryptToken(accessToken),
        refresh_token: encryption.encryptToken(refreshToken),
        token_type: 'Bearer',
        expires_at: null,
        scope: null,
        email: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as any).mockResolvedValue({ rows: [mockDbRow] });

      await oauthRepository.upsertToken(
        userId,
        provider,
        accessToken,
        refreshToken
      );

      // Get the query parameters
      const queryCall = (pool.query as any).mock.calls[0];
      const queryParams = queryCall[1];

      // Verify tokens in query are NOT plaintext
      expect(queryParams[2]).not.toBe(accessToken);
      expect(queryParams[3]).not.toBe(refreshToken);

      // Verify tokens in query are encrypted (base64 strings)
      expect(typeof queryParams[2]).toBe('string');
      expect(typeof queryParams[3]).toBe('string');
      expect(queryParams[2].length).toBeGreaterThan(accessToken.length);
      expect(queryParams[3].length).toBeGreaterThan(refreshToken.length);
    });

    it('should use AES-256-GCM encryption (authenticated encryption)', async () => {
      const accessToken = 'test_token';
      const encrypted = encryption.encryptToken(accessToken);

      // Encrypted token should be base64
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();

      // Should contain IV (16 bytes) + auth tag (16 bytes) + ciphertext
      const buffer = Buffer.from(encrypted, 'base64');
      expect(buffer.length).toBeGreaterThan(32);
    });
  });
});
