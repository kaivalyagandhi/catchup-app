/**
 * Encryption Utilities Tests
 *
 * Tests for AES-256-GCM encryption/decryption functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encrypt,
  decrypt,
  hash,
  verifyHash,
  generateEncryptionKey,
  encryptToken,
  decryptToken,
} from './encryption';

describe('Encryption Utilities', () => {
  const originalEncryptionKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a test encryption key (64-character hex string = 32 bytes)
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  });

  afterEach(() => {
    // Restore original encryption key
    process.env.ENCRYPTION_KEY = originalEncryptionKey;
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for the same plaintext (due to random IV)', () => {
      const plaintext = 'test data';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Ciphertexts should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same plaintext
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      expect(encrypted).toBe('');
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters and unicode', () => {
      const plaintext = '🔐 Secret: 你好世界 ñ é ü';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error if ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('should throw error if ENCRYPTION_KEY is wrong length', () => {
      process.env.ENCRYPTION_KEY = 'short';

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    });

    it('should throw error when decrypting with wrong key', () => {
      const plaintext = 'secret data';
      const encrypted = encrypt(plaintext);

      // Change the encryption key
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      // Decryption should fail with wrong key
      expect(() => decrypt(encrypted)).toThrow();
    });

    it('should throw error when decrypting tampered ciphertext', () => {
      const plaintext = 'secret data';
      const encrypted = encrypt(plaintext);

      // Tamper with the ciphertext
      const tamperedEncrypted = encrypted.slice(0, -5) + 'xxxxx';

      // Decryption should fail due to authentication tag mismatch
      expect(() => decrypt(tamperedEncrypted)).toThrow();
    });
  });

  describe('hash and verifyHash', () => {
    it('should hash and verify a string correctly', () => {
      const data = 'password123';
      const hashed = hash(data);

      expect(verifyHash(data, hashed)).toBe(true);
    });

    it('should produce different hashes for the same input (due to random salt)', () => {
      const data = 'password123';
      const hashed1 = hash(data);
      const hashed2 = hash(data);

      // Hashes should be different due to random salt
      expect(hashed1).not.toBe(hashed2);

      // But both should verify correctly
      expect(verifyHash(data, hashed1)).toBe(true);
      expect(verifyHash(data, hashed2)).toBe(true);
    });

    it('should fail verification with wrong data', () => {
      const data = 'password123';
      const hashed = hash(data);

      expect(verifyHash('wrongpassword', hashed)).toBe(false);
    });

    it('should handle empty strings', () => {
      const data = '';
      const hashed = hash(data);

      expect(verifyHash(data, hashed)).toBe(true);
      expect(verifyHash('not empty', hashed)).toBe(false);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it('should generate different keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    it('should generate keys that work for encryption', () => {
      const key = generateEncryptionKey();
      process.env.ENCRYPTION_KEY = key;

      const plaintext = 'test data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptToken and decryptToken', () => {
    it('should encrypt and decrypt OAuth tokens', () => {
      const token = 'ya29.a0AfH6SMBx...'; // Example OAuth token
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(token);
    });

    it('should handle long OAuth tokens', () => {
      // Simulate a long OAuth token
      const token = 'ya29.' + 'a'.repeat(2000);
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(token);
    });

    it('should produce different encrypted values for the same token', () => {
      const token = 'access_token_12345';
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decryptToken(encrypted1)).toBe(token);
      expect(decryptToken(encrypted2)).toBe(token);
    });
  });

  describe('OAuth Token Storage Simulation', () => {
    it('should encrypt tokens before storage and decrypt after retrieval', () => {
      // Simulate storing OAuth tokens
      const accessToken = 'ya29.a0AfH6SMBxExample';
      const refreshToken = '1//0gExample';

      // Encrypt before storage
      const encryptedAccess = encryptToken(accessToken);
      const encryptedRefresh = encryptToken(refreshToken);

      // Simulate database storage (base64 strings)
      expect(typeof encryptedAccess).toBe('string');
      expect(typeof encryptedRefresh).toBe('string');

      // Decrypt after retrieval
      const decryptedAccess = decryptToken(encryptedAccess);
      const decryptedRefresh = decryptToken(encryptedRefresh);

      expect(decryptedAccess).toBe(accessToken);
      expect(decryptedRefresh).toBe(refreshToken);
    });

    it('should handle optional refresh tokens', () => {
      const accessToken = 'access_token_example';
      const refreshToken = undefined;

      const encryptedAccess = encryptToken(accessToken);
      const encryptedRefresh = refreshToken ? encryptToken(refreshToken) : null;

      expect(decryptToken(encryptedAccess)).toBe(accessToken);
      expect(encryptedRefresh).toBeNull();
    });
  });

  describe('Security Properties', () => {
    it('should use authenticated encryption (GCM mode)', () => {
      const plaintext = 'sensitive data';
      const encrypted = encrypt(plaintext);

      // Encrypted data should be base64 encoded
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();

      // Should contain IV (16 bytes) + auth tag (16 bytes) + ciphertext
      const buffer = Buffer.from(encrypted, 'base64');
      expect(buffer.length).toBeGreaterThan(32); // At least IV + auth tag
    });

    it('should detect tampering with authentication tag', () => {
      const plaintext = 'important data';
      const encrypted = encrypt(plaintext);

      // Decode, tamper with auth tag, re-encode
      const buffer = Buffer.from(encrypted, 'base64');
      buffer[20] = buffer[20] ^ 0xFF; // Flip bits in auth tag area
      const tamperedEncrypted = buffer.toString('base64');

      // Should throw due to authentication failure
      expect(() => decrypt(tamperedEncrypted)).toThrow();
    });

    it('should use unique IVs for each encryption', () => {
      const plaintext = 'test';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Extract IVs (first 16 bytes)
      const buffer1 = Buffer.from(encrypted1, 'base64');
      const buffer2 = Buffer.from(encrypted2, 'base64');

      const iv1 = buffer1.subarray(0, 16);
      const iv2 = buffer2.subarray(0, 16);

      // IVs should be different
      expect(Buffer.compare(iv1, iv2)).not.toBe(0);
    });
  });
});
