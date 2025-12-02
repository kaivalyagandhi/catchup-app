/**
 * Google SSO Routes Tests
 * 
 * Tests for Google SSO API endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import googleSSORouter from './google-sso';
import * as googleSSOService from '../google-sso-service';
import * as oauthStateManager from '../oauth-state-manager';
import * as authService from '../auth-service';
import { UserRole } from '../middleware/auth';

// Mock dependencies
vi.mock('../google-sso-service');
vi.mock('../oauth-state-manager');
vi.mock('../auth-service');
vi.mock('../../utils/audit-logger');
vi.mock('../../utils/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 10,
    resetAt: new Date(),
  }),
}));
vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    // Mock authentication - set userId if not already set
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    next();
  },
  AuthenticatedRequest: {},
  UserRole: {
    USER: 'user',
    ADMIN: 'admin',
    TEST_USER: 'test_user',
  },
}));

describe('Google SSO Routes', () => {
  let app: Express;

  beforeEach(() => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/auth/google', googleSSORouter);

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('GET /api/auth/google/authorize', () => {
    it('should return authorization URL and state', async () => {
      const mockState = 'test-state-123';
      const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test';

      const mockStateManager = {
        generateState: vi.fn().mockReturnValue(mockState),
      };

      const mockService = {
        getAuthorizationUrl: vi.fn().mockReturnValue(mockAuthUrl),
      };

      vi.mocked(oauthStateManager.getOAuthStateManager).mockReturnValue(
        mockStateManager as any
      );
      vi.mocked(googleSSOService.getGoogleSSOService).mockReturnValue(mockService as any);

      const response = await request(app).get('/api/auth/google/authorize');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        authUrl: mockAuthUrl,
        state: mockState,
      });
      expect(mockStateManager.generateState).toHaveBeenCalled();
      expect(mockService.getAuthorizationUrl).toHaveBeenCalledWith(mockState);
    });

    it('should handle errors gracefully', async () => {
      // Mock an error being thrown
      vi.mocked(googleSSOService.getGoogleSSOService).mockImplementation(() => {
        throw new Error('Config error');
      });

      const response = await request(app).get('/api/auth/google/authorize');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('GET /api/auth/google/callback', () => {
    it('should handle successful OAuth callback', async () => {
      const mockCode = 'auth-code-123';
      const mockState = 'state-123';
      const mockTokenResponse = {
        access_token: 'access-token',
        id_token: 'id-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };
      const mockUserInfo = {
        sub: 'google-user-123',
        email: 'test@example.com',
        email_verified: true,
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
      };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        profilePictureUrl: 'https://example.com/photo.jpg',
        authProvider: 'google' as const,
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockToken = 'jwt-token-123';

      const mockStateManager = {
        validateState: vi.fn().mockReturnValue(true),
      };

      const mockService = {
        exchangeCodeForToken: vi.fn().mockResolvedValue(mockTokenResponse),
        validateAndDecodeToken: vi.fn().mockResolvedValue(mockUserInfo),
      };

      vi.mocked(oauthStateManager.getOAuthStateManager).mockReturnValue(
        mockStateManager as any
      );
      vi.mocked(googleSSOService.getGoogleSSOService).mockReturnValue(mockService as any);
      vi.mocked(authService.authenticateWithGoogle).mockResolvedValue({
        user: mockUser,
        token: mockToken,
        isNewUser: false,
      });

      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ code: mockCode, state: mockState });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe(mockToken);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.isNewUser).toBe(false);
      expect(mockStateManager.validateState).toHaveBeenCalledWith(mockState);
      expect(mockService.exchangeCodeForToken).toHaveBeenCalledWith(mockCode);
      expect(mockService.validateAndDecodeToken).toHaveBeenCalledWith(mockTokenResponse.id_token);
      expect(authService.authenticateWithGoogle).toHaveBeenCalledWith(mockUserInfo);
    });

    it('should reject invalid state', async () => {
      const mockCode = 'auth-code-123';
      const mockState = 'invalid-state';

      const mockStateManager = {
        validateState: vi.fn().mockReturnValue(false),
      };

      vi.mocked(oauthStateManager.getOAuthStateManager).mockReturnValue(
        mockStateManager as any
      );

      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ code: mockCode, state: mockState });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(googleSSOService.GoogleSSOErrorCode.STATE_MISMATCH);
      expect(mockStateManager.validateState).toHaveBeenCalledWith(mockState);
    });

    it('should handle missing code parameter', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ state: 'state-123' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(googleSSOService.GoogleSSOErrorCode.INVALID_CODE);
    });

    it('should handle OAuth errors', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ error: 'access_denied', state: 'state-123' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('OAUTH_ERROR');
    });
  });

  describe('POST /api/auth/google/token', () => {
    it('should handle token exchange', async () => {
      const mockCode = 'auth-code-123';
      const mockState = 'state-123';
      const mockTokenResponse = {
        access_token: 'access-token',
        id_token: 'id-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'email profile',
      };
      const mockUserInfo = {
        sub: 'google-user-123',
        email: 'test@example.com',
        email_verified: true,
        name: 'Test User',
      };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        authProvider: 'google' as const,
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockToken = 'jwt-token-123';

      const mockStateManager = {
        validateState: vi.fn().mockReturnValue(true),
      };

      const mockService = {
        exchangeCodeForToken: vi.fn().mockResolvedValue(mockTokenResponse),
        validateAndDecodeToken: vi.fn().mockResolvedValue(mockUserInfo),
      };

      vi.mocked(oauthStateManager.getOAuthStateManager).mockReturnValue(
        mockStateManager as any
      );
      vi.mocked(googleSSOService.getGoogleSSOService).mockReturnValue(mockService as any);
      vi.mocked(authService.authenticateWithGoogle).mockResolvedValue({
        user: mockUser,
        token: mockToken,
        isNewUser: true,
      });

      const response = await request(app)
        .post('/api/auth/google/token')
        .send({ code: mockCode, state: mockState });

      expect(response.status).toBe(200);
      expect(response.body.token).toBe(mockToken);
      expect(response.body.isNewUser).toBe(true);
    });

    it('should reject missing code', async () => {
      const response = await request(app)
        .post('/api/auth/google/token')
        .send({ state: 'state-123' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(googleSSOService.GoogleSSOErrorCode.INVALID_CODE);
    });
  });

  describe('GET /api/auth/google/status', () => {
    it('should return connection status for authenticated user', async () => {
      const mockUserId = 'user-123';
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        profilePictureUrl: 'https://example.com/photo.jpg',
        authProvider: 'google' as const,
        role: UserRole.USER,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date(),
      };

      vi.mocked(authService.hasGoogleSSO).mockResolvedValue(true);
      vi.mocked(authService.getUserById).mockResolvedValue(mockUser);

      // Create a new app with mocked authentication
      const testApp = express();
      testApp.use(express.json());
      // Mock authentication middleware
      testApp.use((req: any, _res, next) => {
        req.userId = mockUserId;
        next();
      });
      testApp.use('/api/auth/google', googleSSORouter);

      const response = await request(testApp).get('/api/auth/google/status');

      expect(response.status).toBe(200);
      expect(response.body.connected).toBe(true);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.authProvider).toBe('google');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app).get('/api/auth/google/status');

      expect(response.status).toBe(401);
    });
  });
});
