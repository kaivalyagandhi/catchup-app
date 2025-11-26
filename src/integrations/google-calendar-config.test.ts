/**
 * Tests for Google Calendar OAuth Configuration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';
import {
  getAuthorizationUrl,
  getTokensFromCode,
  getCalendarClient,
  getOAuth2Client,
} from './google-calendar-config';

vi.mock('googleapis');

describe('Google Calendar OAuth Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL with correct scopes', () => {
      const mockGenerateAuthUrl = vi.fn().mockReturnValue('https://auth.url');
      const mockOAuth2 = vi.fn(function() {
        return { generateAuthUrl: mockGenerateAuthUrl };
      });
      (google.auth.OAuth2 as any) = mockOAuth2;

      const url = getAuthorizationUrl();

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ],
        prompt: 'consent',
      });
      expect(url).toBe('https://auth.url');
    });

    it('should throw error if credentials not configured', () => {
      delete process.env.GOOGLE_CLIENT_ID;

      expect(() => {
        getAuthorizationUrl();
      }).toThrow('Google OAuth credentials not configured');
    });
  });

  describe('getTokensFromCode', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockTokens: Credentials = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expiry_date: Date.now() + 3600000,
      };

      const mockGetToken = vi.fn().mockResolvedValue({ tokens: mockTokens });
      const mockOAuth2 = vi.fn(function() {
        return { getToken: mockGetToken };
      });
      (google.auth.OAuth2 as any) = mockOAuth2;

      const tokens = await getTokensFromCode('auth_code_123');

      expect(mockGetToken).toHaveBeenCalledWith('auth_code_123');
      expect(tokens).toEqual(mockTokens);
    });

    it('should handle token exchange errors', async () => {
      const mockGetToken = vi.fn().mockRejectedValue(new Error('Invalid code'));
      const mockOAuth2 = vi.fn(function() {
        return { getToken: mockGetToken };
      });
      (google.auth.OAuth2 as any) = mockOAuth2;

      await expect(getTokensFromCode('invalid_code')).rejects.toThrow('Invalid code');
    });
  });

  describe('getCalendarClient', () => {
    it('should return Google Calendar API client with credentials', () => {
      const mockSetCredentials = vi.fn();
      const mockOAuth2 = vi.fn(function() {
        return { setCredentials: mockSetCredentials };
      });
      (google.auth.OAuth2 as any) = mockOAuth2;

      const mockCalendarClient = { events: {} };
      const mockGoogleCalendar = vi.fn().mockReturnValue(mockCalendarClient);
      (google.calendar as any) = mockGoogleCalendar;

      const credentials: Credentials = {
        access_token: 'access_token_123',
      };

      const client = getCalendarClient(credentials);

      expect(mockSetCredentials).toHaveBeenCalledWith(credentials);
      expect(mockGoogleCalendar).toHaveBeenCalledWith({
        version: 'v3',
        auth: expect.any(Object),
      });
      expect(client).toEqual(mockCalendarClient);
    });
  });

  describe('getOAuth2Client', () => {
    it('should return OAuth2 client with credentials', () => {
      const mockSetCredentials = vi.fn();
      const mockOAuth2Instance = { setCredentials: mockSetCredentials };
      const mockOAuth2 = vi.fn(function() {
        return mockOAuth2Instance;
      });
      (google.auth.OAuth2 as any) = mockOAuth2;

      const credentials: Credentials = {
        access_token: 'access_token_123',
      };

      const client = getOAuth2Client(credentials);

      expect(mockSetCredentials).toHaveBeenCalledWith(credentials);
      expect(client).toEqual(mockOAuth2Instance);
    });
  });
});
