/**
 * Google SSO Integration Tests
 * 
 * Comprehensive integration tests for the complete OAuth flow:
 * - Authorization → Callback → Token Exchange → User Creation
 * - Existing user login flow
 * - Error scenarios (invalid code, expired token, etc.)
 * 
 * Requirements: 1.2, 1.3, 1.4, 2.2, 2.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import pool from '../db/connection';
import googleSSORouter from './routes/google-sso';
import { GoogleSSOService } from './google-sso-service';
import { getOAuthStateManager, resetOAuthStateManager } from './oauth-state-manager';
import { UserRole } from './middleware/auth';

// Mock axios for Google API calls
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Mock audit logger
vi.mock('../utils/audit-logger', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  AuditAction: {
    USER_REGISTERED: 'USER_REGISTERED',
    USER_LOGIN: 'USER_LOGIN',
    FAILED_LOGIN_ATTEMPT: 'FAILED_LOGIN_ATTEMPT',
    OAUTH_CONSENT_GRANTED: 'OAUTH_CONSENT_GRANTED',
  },
}));

// Mock rate limiter
vi.mock('../utils/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 10,
    resetAt: new Date(),
  }),
}));

// Mock GoogleSSOService to bypass signature verification in integration tests
vi.mock('./google-sso-service', async () => {
  const actual = await vi.importActual<typeof import('./google-sso-service')>('./google-sso-service');
  
  class MockedGoogleSSOService extends actual.GoogleSSOService {
    async verifyTokenSignature(idToken: string): Promise<boolean> {
      // Always return true for integration tests to bypass signature verification
      // The actual token validation logic (issuer, audience, expiration) will still run
      return true;
    }
  }
  
  return {
    ...actual,
    GoogleSSOService: MockedGoogleSSOService,
    getGoogleSSOService: () => new MockedGoogleSSOService(),
  };
});



describe('Google SSO Integration Tests', () => {
  let app: Express;
  let googleSSOService: GoogleSSOService;

  beforeEach(() => {
    // Set up environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.NODE_ENV = 'test';

    // Reset OAuth state manager
    resetOAuthStateManager();

    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/auth/google', googleSSORouter);

    // Initialize service
    googleSSOService = new GoogleSSOService();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test users
    await pool.query("DELETE FROM users WHERE email LIKE '%@test-integration.com'");
    
    // Reset OAuth state manager
    resetOAuthStateManager();
  });

  describe('Complete OAuth Flow - New User', () => {
    it('should complete full authorization → callback → token exchange → user creation flow', async () => {
      // Step 1: Get authorization URL
      const authorizeResponse = await request(app)
        .get('/api/auth/google/authorize');

      expect(authorizeResponse.status).toBe(200);
      expect(authorizeResponse.body.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authorizeResponse.body.state).toBeTruthy();

      const state = authorizeResponse.body.state;

      // Step 2: Mock Google token exchange
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        id_token: createMockIdToken({
          sub: 'google-user-new-123',
          email: 'newuser@test-integration.com',
          email_verified: true,
          name: 'New Test User',
          picture: 'https://example.com/photo.jpg',
        }),
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });

      // Mock Google public keys for token verification
      const mockPublicKeys = {
        keys: [
          {
            kid: 'test-key-id',
            n: 'test-n-value',
            e: 'AQAB',
            alg: 'RS256',
            kty: 'RSA',
            use: 'sig',
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockPublicKeys });

      // Step 3: Handle OAuth callback
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'mock-auth-code',
          state: state,
        });

      expect(callbackResponse.status).toBe(200);
      expect(callbackResponse.body.message).toBe('Account created successfully');
      expect(callbackResponse.body.isNewUser).toBe(true);
      expect(callbackResponse.body.token).toBeTruthy();
      expect(callbackResponse.body.user).toMatchObject({
        email: 'newuser@test-integration.com',
        name: 'New Test User',
        profilePictureUrl: 'https://example.com/photo.jpg',
        authProvider: 'google',
      });

      // Verify user was created in database
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        ['newuser@test-integration.com']
      );

      expect(userResult.rows.length).toBe(1);
      expect(userResult.rows[0].google_id).toBe('google-user-new-123');
      expect(userResult.rows[0].auth_provider).toBe('google');
      expect(userResult.rows[0].name).toBe('New Test User');

      // Verify JWT token is valid
      const decoded = jwt.verify(callbackResponse.body.token, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(userResult.rows[0].id);
      expect(decoded.role).toBe(UserRole.USER);
    });
  });

  describe('Complete OAuth Flow - Existing User', () => {
    it('should login existing Google user without creating duplicate', async () => {
      // Pre-create user
      const existingUser = await pool.query(
        `INSERT INTO users (email, google_id, auth_provider, name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, google_id`,
        ['existing@test-integration.com', 'google-user-existing-456', 'google', 'Existing User', UserRole.USER]
      );

      const existingUserId = existingUser.rows[0].id;

      // Step 1: Get authorization URL
      const authorizeResponse = await request(app)
        .get('/api/auth/google/authorize');

      expect(authorizeResponse.status).toBe(200);
      const state = authorizeResponse.body.state;

      // Step 2: Mock Google token exchange
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        id_token: createMockIdToken({
          sub: 'google-user-existing-456',
          email: 'existing@test-integration.com',
          email_verified: true,
          name: 'Existing User',
        }),
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });

      // Mock Google public keys
      const mockPublicKeys = {
        keys: [
          {
            kid: 'test-key-id',
            n: 'test-n-value',
            e: 'AQAB',
            alg: 'RS256',
            kty: 'RSA',
            use: 'sig',
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockPublicKeys });

      // Step 3: Handle OAuth callback
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'mock-auth-code',
          state: state,
        });

      expect(callbackResponse.status).toBe(200);
      expect(callbackResponse.body.message).toBe('Logged in successfully');
      expect(callbackResponse.body.isNewUser).toBe(false);
      expect(callbackResponse.body.token).toBeTruthy();
      expect(callbackResponse.body.user.email).toBe('existing@test-integration.com');

      // Verify no duplicate user was created
      const userCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE email = $1',
        ['existing@test-integration.com']
      );

      expect(parseInt(userCount.rows[0].count)).toBe(1);

      // Verify JWT token contains correct user ID
      const decoded = jwt.verify(callbackResponse.body.token, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(existingUserId);
    });

    it('should link Google account to existing email/password user', async () => {
      // Pre-create email/password user
      const emailUser = await pool.query(
        `INSERT INTO users (email, password_hash, auth_provider, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email`,
        ['emailuser@test-integration.com', 'hashed_password', 'email', UserRole.USER]
      );

      const emailUserId = emailUser.rows[0].id;

      // Step 1: Get authorization URL
      const authorizeResponse = await request(app)
        .get('/api/auth/google/authorize');

      const state = authorizeResponse.body.state;

      // Step 2: Mock Google token exchange with same email
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        id_token: createMockIdToken({
          sub: 'google-user-link-789',
          email: 'emailuser@test-integration.com',
          email_verified: true,
          name: 'Email User',
        }),
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          keys: [
            {
              kid: 'test-key-id',
              n: 'test-n-value',
              e: 'AQAB',
              alg: 'RS256',
              kty: 'RSA',
              use: 'sig',
            },
          ],
        },
      });

      // Step 3: Handle OAuth callback
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'mock-auth-code',
          state: state,
        });

      expect(callbackResponse.status).toBe(200);
      expect(callbackResponse.body.isNewUser).toBe(false);
      expect(callbackResponse.body.user.email).toBe('emailuser@test-integration.com');

      // Verify account was linked
      const updatedUser = await pool.query(
        'SELECT google_id, auth_provider FROM users WHERE id = $1',
        [emailUserId]
      );

      expect(updatedUser.rows[0].google_id).toBe('google-user-link-789');
      expect(updatedUser.rows[0].auth_provider).toBe('both');
    });
  });

  describe('Error Scenarios', () => {
    it('should reject invalid authorization code', async () => {
      // Get valid state
      const authorizeResponse = await request(app)
        .get('/api/auth/google/authorize');

      const state = authorizeResponse.body.state;

      // Mock Google API error for invalid code
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            error: 'invalid_grant',
            error_description: 'Invalid authorization code',
          },
        },
      });

      // Try callback with invalid code
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'invalid-code',
          state: state,
        });

      expect(callbackResponse.status).toBe(400);
      expect(callbackResponse.body.error.code).toBe('INVALID_CODE');
      expect(callbackResponse.body.error.message).toContain('Invalid authentication code');
    });

    it('should reject expired or invalid state (CSRF protection)', async () => {
      // Try callback with invalid state
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'valid-code',
          state: 'invalid-state-12345',
        });

      expect(callbackResponse.status).toBe(400);
      expect(callbackResponse.body.error.code).toBe('STATE_MISMATCH');
      expect(callbackResponse.body.error.message).toContain('Security validation failed');
    });

    it('should reject token with invalid issuer', async () => {
      const authorizeResponse = await request(app)
        .get('/api/auth/google/authorize');

      const state = authorizeResponse.body.state;

      // Mock token with invalid issuer
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        id_token: createMockIdToken({
          sub: 'google-user-123',
          email: 'test@test-integration.com',
          email_verified: true,
          name: 'Test User',
          iss: 'https://evil.com', // Invalid issuer
        }),
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          keys: [
            {
              kid: 'test-key-id',
              n: 'test-n-value',
              e: 'AQAB',
              alg: 'RS256',
              kty: 'RSA',
              use: 'sig',
            },
          ],
        },
      });

      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'mock-auth-code',
          state: state,
        });

      expect(callbackResponse.status).toBe(401);
      expect(callbackResponse.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired token', async () => {
      const authorizeResponse = await request(app)
        .get('/api/auth/google/authorize');

      const state = authorizeResponse.body.state;

      // Mock expired token (exp in the past)
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        id_token: createMockIdToken({
          sub: 'google-user-123',
          email: 'test@test-integration.com',
          email_verified: true,
          name: 'Test User',
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        }),
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          keys: [
            {
              kid: 'test-key-id',
              n: 'test-n-value',
              e: 'AQAB',
              alg: 'RS256',
              kty: 'RSA',
              use: 'sig',
            },
          ],
        },
      });

      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'mock-auth-code',
          state: state,
        });

      expect(callbackResponse.status).toBe(401);
      expect(callbackResponse.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject token with unverified email', async () => {
      const authorizeResponse = await request(app)
        .get('/api/auth/google/authorize');

      const state = authorizeResponse.body.state;

      // Mock token with unverified email
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        id_token: createMockIdToken({
          sub: 'google-user-123',
          email: 'test@test-integration.com',
          email_verified: false, // Email not verified
          name: 'Test User',
        }),
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          keys: [
            {
              kid: 'test-key-id',
              n: 'test-n-value',
              e: 'AQAB',
              alg: 'RS256',
              kty: 'RSA',
              use: 'sig',
            },
          ],
        },
      });

      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'mock-auth-code',
          state: state,
        });

      expect(callbackResponse.status).toBe(401);
      expect(callbackResponse.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should handle OAuth error from Google', async () => {
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          error: 'access_denied',
          error_description: 'User denied access',
          state: 'some-state',
        });

      expect(callbackResponse.status).toBe(400);
      expect(callbackResponse.body.error.code).toBe('OAUTH_ERROR');
      expect(callbackResponse.body.error.message).toContain('cancelled or failed');
    });

    it('should handle missing code parameter', async () => {
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          state: 'some-state',
        });

      expect(callbackResponse.status).toBe(400);
      expect(callbackResponse.body.error.code).toBe('INVALID_CODE');
    });

    it('should handle missing state parameter', async () => {
      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'some-code',
        });

      expect(callbackResponse.status).toBe(400);
      expect(callbackResponse.body.error.code).toBe('STATE_MISMATCH');
    });

    it('should handle token exchange network failure', async () => {
      const authorizeResponse = await request(app)
        .get('/api/auth/google/authorize');

      const state = authorizeResponse.body.state;

      // Mock network error
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const callbackResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'mock-auth-code',
          state: state,
        });

      expect(callbackResponse.status).toBe(500);
      expect(callbackResponse.body.error.code).toBe('TOKEN_EXCHANGE_FAILED');
    });
  });

  describe('Alternative Token Exchange Flow (POST)', () => {
    it('should handle POST token exchange for SPAs', async () => {
      // Get valid state
      const authorizeResponse = await request(app)
        .get('/api/auth/google/authorize');

      const state = authorizeResponse.body.state;

      // Mock Google token exchange
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        id_token: createMockIdToken({
          sub: 'google-user-post-123',
          email: 'postuser@test-integration.com',
          email_verified: true,
          name: 'POST User',
        }),
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          keys: [
            {
              kid: 'test-key-id',
              n: 'test-n-value',
              e: 'AQAB',
              alg: 'RS256',
              kty: 'RSA',
              use: 'sig',
            },
          ],
        },
      });

      // Use POST endpoint
      const tokenResponse = await request(app)
        .post('/api/auth/google/token')
        .send({
          code: 'mock-auth-code',
          state: state,
        });

      expect(tokenResponse.status).toBe(200);
      expect(tokenResponse.body.token).toBeTruthy();
      expect(tokenResponse.body.user.email).toBe('postuser@test-integration.com');
      expect(tokenResponse.body.isNewUser).toBe(true);
    });

    it('should reject POST with invalid state', async () => {
      const tokenResponse = await request(app)
        .post('/api/auth/google/token')
        .send({
          code: 'mock-auth-code',
          state: 'invalid-state',
        });

      expect(tokenResponse.status).toBe(400);
      expect(tokenResponse.body.error.code).toBe('STATE_MISMATCH');
    });
  });

  describe('State Management', () => {
    it('should generate unique states for multiple authorization requests', async () => {
      const response1 = await request(app).get('/api/auth/google/authorize');
      const response2 = await request(app).get('/api/auth/google/authorize');

      expect(response1.body.state).not.toBe(response2.body.state);
    });

    it('should allow state to be used only once (one-time use)', async () => {
      const authorizeResponse = await request(app)
        .get('/api/auth/google/authorize');

      const state = authorizeResponse.body.state;

      // Mock successful token exchange
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        id_token: createMockIdToken({
          sub: 'google-user-123',
          email: 'test@test-integration.com',
          email_verified: true,
          name: 'Test User',
        }),
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };

      mockedAxios.post.mockResolvedValue({ data: mockTokenResponse });
      mockedAxios.get.mockResolvedValue({
        data: {
          keys: [
            {
              kid: 'test-key-id',
              n: 'test-n-value',
              e: 'AQAB',
              alg: 'RS256',
              kty: 'RSA',
              use: 'sig',
            },
          ],
        },
      });

      // First use should succeed
      const firstResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'mock-auth-code',
          state: state,
        });

      expect(firstResponse.status).toBe(200);

      // Second use of same state should fail
      const secondResponse = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'mock-auth-code-2',
          state: state,
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.error.code).toBe('STATE_MISMATCH');
    });
  });
});

/**
 * Helper function to create a mock ID token
 * In real tests, this would be properly signed, but for integration tests
 * we mock the verification process
 */
function createMockIdToken(payload: {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  iss?: string;
  aud?: string;
  exp?: number;
}): string {
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload = {
    iss: payload.iss || 'https://accounts.google.com',
    aud: payload.aud || 'test-client-id',
    exp: payload.exp !== undefined ? payload.exp : now + 3600,
    iat: now,
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
  };

  // Create a mock token using HS256 (symmetric) for testing
  // The actual verification is mocked in the tests
  const token = jwt.sign(fullPayload, 'mock-secret', {
    algorithm: 'HS256',
  });

  // Manually construct the token with RS256 header for testing
  // This simulates what Google would send
  const parts = token.split('.');
  const header = Buffer.from(JSON.stringify({
    alg: 'RS256',
    kid: 'test-key-id',
    typ: 'JWT',
  })).toString('base64url');
  
  return `${header}.${parts[1]}.${parts[2]}`;
}
