/**
 * Encryption Utilities
 *
 * Provides encryption/decryption for sensitive data at rest
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment variable
 * In production, this should be stored in a secure secret manager
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Key should be a 64-character hex string (32 bytes)
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt sensitive data
 * Returns base64-encoded string containing IV, auth tag, and ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return plaintext;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + auth tag + ciphertext
  const combined = Buffer.concat([iv, authTag, Buffer.from(ciphertext, 'hex')]);

  return combined.toString('base64');
}

/**
 * Decrypt sensitive data
 * Expects base64-encoded string containing IV, auth tag, and ciphertext
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) {
    return encrypted;
  }

  const key = getEncryptionKey();
  const combined = Buffer.from(encrypted, 'base64');

  // Extract IV, auth tag, and ciphertext
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Hash sensitive data for storage (one-way)
 * Uses PBKDF2 with random salt
 */
export function hash(data: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(data, salt, 100000, KEY_LENGTH, 'sha512');

  // Combine salt + hash
  const combined = Buffer.concat([salt, hash]);
  return combined.toString('base64');
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hashedData: string): boolean {
  const combined = Buffer.from(hashedData, 'base64');

  // Extract salt and hash
  const salt = combined.subarray(0, SALT_LENGTH);
  const originalHash = combined.subarray(SALT_LENGTH);

  // Hash the input data with the same salt
  const hash = crypto.pbkdf2Sync(data, salt, 100000, KEY_LENGTH, 'sha512');

  // Compare hashes using timing-safe comparison
  return crypto.timingSafeEqual(originalHash, hash);
}

/**
 * Generate a secure random encryption key
 * Use this to generate ENCRYPTION_KEY for .env file
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt OAuth tokens before storage
 */
export function encryptToken(token: string): string {
  return encrypt(token);
}

/**
 * Decrypt OAuth tokens after retrieval
 */
export function decryptToken(encryptedToken: string): string {
  return decrypt(encryptedToken);
}
