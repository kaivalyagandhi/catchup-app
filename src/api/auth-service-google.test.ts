/**
 * Google SSO Authentication Service Tests
 * 
 * Tests for Google SSO authentication functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import pool from '../db/connection';
import { authenticateWithGoogle, linkGoogleAccount, hasGoogleSSO } from './auth-service';
import { GoogleUserInfo } from './google-sso-service';
import { UserRole } from './middleware/auth';

describe('Google SSO Authentication', () => {
  // Clean up test users after each test
  afterEach(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE '%@test-google-sso.com'");
  });

  describe('authenticateWithGoogle', () => {
    it('should create a new user when Google user does not exist', async () => {
      const googleUserInfo: GoogleUserInfo = {
        sub: 'google-test-123',
        email: 'newuser@test-google-sso.com',
        email_verified: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };

      const result = await authenticateWithGoogle(googleUserInfo);

      expect(result.isNewUser).toBe(true);
      expect(result.user.email).toBe('newuser@test-google-sso.com');
      expect(result.user.googleId).toBe('google-test-123');
      expect(result.user.authProvider).toBe('google');
      expect(result.user.name).toBe('Test User');
      expect(result.user.profilePictureUrl).toBe('https://example.com/photo.jpg');
      expect(result.token).toBeTruthy();
    });

    it('should login existing Google user', async () => {
      const googleUserInfo: GoogleUserInfo = {
        sub: 'google-test-456',
        email: 'existing@test-google-sso.com',
        email_verified: true,
        name: 'Existing User',
      };

      // Create user first
      const firstResult = await authenticateWithGoogle(googleUserInfo);
      expect(firstResult.isNewUser).toBe(true);

      // Login again
      const secondResult = await authenticateWithGoogle(googleUserInfo);
      expect(secondResult.isNewUser).toBe(false);
      expect(secondResult.user.id).toBe(firstResult.user.id);
      expect(secondResult.user.email).toBe('existing@test-google-sso.com');
      expect(secondResult.token).toBeTruthy();
    });

    it('should link Google account to existing email user', async () => {
      // Create email user first
      const emailUser = await pool.query(
        `INSERT INTO users (email, password_hash, auth_provider, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email`,
        ['emailuser@test-google-sso.com', 'hashed_password', 'email', UserRole.USER]
      );

      const userId = emailUser.rows[0].id;

      // Authenticate with Google using same email
      const googleUserInfo: GoogleUserInfo = {
        sub: 'google-test-789',
        email: 'emailuser@test-google-sso.com',
        email_verified: true,
        name: 'Email User',
      };

      const result = await authenticateWithGoogle(googleUserInfo);

      expect(result.isNewUser).toBe(false);
      expect(result.user.id).toBe(userId);
      expect(result.user.googleId).toBe('google-test-789');
      expect(result.user.authProvider).toBe('both');
      expect(result.token).toBeTruthy();
    });

    it('should handle case-insensitive email matching', async () => {
      const googleUserInfo: GoogleUserInfo = {
        sub: 'google-test-case',
        email: 'CaseTest@test-google-sso.com',
        email_verified: true,
        name: 'Case Test',
      };

      const result = await authenticateWithGoogle(googleUserInfo);

      expect(result.user.email).toBe('casetest@test-google-sso.com');
    });
  });

  describe('linkGoogleAccount', () => {
    it('should link Google account to existing user', async () => {
      // Create user
      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash, auth_provider, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['linktest@test-google-sso.com', 'hashed_password', 'email', UserRole.USER]
      );

      const userId = userResult.rows[0].id;

      // Link Google account
      await linkGoogleAccount(userId, 'google-link-123', 'linktest@test-google-sso.com');

      // Verify link
      const hasGoogle = await hasGoogleSSO(userId);
      expect(hasGoogle).toBe(true);

      // Verify auth provider updated
      const updatedUser = await pool.query(
        'SELECT auth_provider FROM users WHERE id = $1',
        [userId]
      );
      expect(updatedUser.rows[0].auth_provider).toBe('both');
    });

    it('should throw error if email does not match', async () => {
      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash, auth_provider, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['user1@test-google-sso.com', 'hashed_password', 'email', UserRole.USER]
      );

      const userId = userResult.rows[0].id;

      await expect(
        linkGoogleAccount(userId, 'google-link-456', 'different@test-google-sso.com')
      ).rejects.toThrow('Email does not match user account');
    });

    it('should throw error if Google ID already linked to another user', async () => {
      // Create first user with Google ID
      const user1 = await pool.query(
        `INSERT INTO users (email, google_id, auth_provider, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['user1@test-google-sso.com', 'google-duplicate', 'google', UserRole.USER]
      );

      // Create second user
      const user2 = await pool.query(
        `INSERT INTO users (email, password_hash, auth_provider, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['user2@test-google-sso.com', 'hashed_password', 'email', UserRole.USER]
      );

      const userId2 = user2.rows[0].id;

      // Try to link same Google ID to second user
      await expect(
        linkGoogleAccount(userId2, 'google-duplicate', 'user2@test-google-sso.com')
      ).rejects.toThrow('This Google account is already linked to another user');
    });
  });

  describe('hasGoogleSSO', () => {
    it('should return true for user with Google SSO', async () => {
      const userResult = await pool.query(
        `INSERT INTO users (email, google_id, auth_provider, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['googleuser@test-google-sso.com', 'google-has-sso', 'google', UserRole.USER]
      );

      const userId = userResult.rows[0].id;
      const hasGoogle = await hasGoogleSSO(userId);

      expect(hasGoogle).toBe(true);
    });

    it('should return false for user without Google SSO', async () => {
      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash, auth_provider, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['emailonly@test-google-sso.com', 'hashed_password', 'email', UserRole.USER]
      );

      const userId = userResult.rows[0].id;
      const hasGoogle = await hasGoogleSSO(userId);

      expect(hasGoogle).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      // Use a valid UUID format that doesn't exist
      const hasGoogle = await hasGoogleSSO('00000000-0000-0000-0000-000000000000');
      expect(hasGoogle).toBe(false);
    });
  });
});
