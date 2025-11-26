/**
 * Tests for Google Calendar OAuth Configuration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';
import {
  oauth2Client,
  getAuthorizationUrl,
  getTokensFromCode,
  setCredentials,
  getCalendarClient,
} from './google-calendar-config';

vi.mock('googleapis');

describe('Google Calendar OAuth Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL with correct scopes', () => {
      const mockGenerateAuthUrl = vi.fn().mockReturnValue('https://auth.url');
      (oauth2Client.generateAuthUrl as any) = mockGenerateAuthUrl;

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

    it('should include offline access for token refresh', () => {
      const mockGenerateAuthUrl = vi.fn().mockReturnValue('https://auth.url');
      (oauth2Client.generateAuthUrl as any) = mockGenerateAuthUrl;

      getAuthorizationUrl();

      const callArgs = mockGenerateAuthUrl.mock.calls[0][0];
      expect(callArgs.access_type).toBe('offline');
    });

    it('should request consent prompt for fresh token', () => {
      const mockGenerateAuthUrl = vi.fn().mockReturnValue('https://auth.url');
      (oauth2Client.generateAuthUrl as any) = mockGenerateAuthUrl;

      getAuthorizationUrl();

      const callArgs = mockGenerateAuthUrl.mock.calls[0][0];
      expect(callArgs.prompt).toBe('consent');
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
      (oauth2Client.getToken as any) = mockGetToken;

      const tokens = await getTokensFromCode('auth_code_123');

      expect(mockGetToken).toHaveBeenCalledWith('auth_code_123');
      expect(tokens).toEqual(mockTokens);
    });

    it('should handle token exchange errors', async () => {
      const mockGetToken = vi.fn().mockRejectedValue(new Error('Invalid code'));
      (oauth2Client.getToken as any) = mockGetToken;

      await expect(getTokensFromCode('invalid_code')).rejects.toThrow('Invalid code');
    });

    it('should return null if no tokens received', async () => {
      const mockGetToken = vi.fn().mockResolvedValue({ tokens: null });
      (oauth2Client.getToken as any) = mockGetToken;

      const tokens = await getTokensFromCode('auth_code_123');

      expect(tokens).toBeNull();
    });
  });

  describe('setCredentials', () => {
    it('should set credentials on oauth2Client', () => {
      const mockSetCredentials = vi.fn();
      (oauth2Client.setCredentials as any) = mockSetCredentials;

      const credentials: Credentials = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expiry_date: Date.now() + 3600000,
      };

      setCredentials(credentials);

      expect(mockSetCredentials).toHaveBeenCalledWith(credentials);
    });

    it('should accept credentials with minimal fields', () => {
      const mockSetCredentials = vi.fn();
      (oauth2Client.setCredentials as any) = mockSetCredentials;

      const credentials: Credentials = {
        access_token: 'access_token_123',
      };

      setCredentials(credentials);

      expect(mockSetCredentials).toHaveBeenCalledWith(credentials);
    });
  });

  describe('getCalendarClient', () => {
    it('should return Google Calendar API client', () => {
      const mockCalendarClient = { calendars: {} };
      const mockGoogleCalendar = vi.fn().mockReturnValue(mockCalendarClient);
      (google.calendar as any) = mockGoogleCalendar;

      const client = getCalendarClient();

      expect(mockGoogleCalendar).toHaveBeenCalledWith({
        version: 'v3',
        auth: oauth2Client,
      });
      expect(client).toEqual(mockCalendarClient);
    });

    it('should use correct API version', () => {
      const mockGoogleCalendar = vi.fn().mockReturnValue({});
      (google.calendar as any) = mockGoogleCalendar;

      getCalendarClient();

      const callArgs = mockGoogleCalendar.mock.calls[0][0];
      expect(callArgs.version).toBe('v3');
    });

    it('should pass oauth2Client as auth', () => {
      const mockGoogleCalendar = vi.fn().mockReturnValue({});
      (google.calendar as any) = mockGoogleCalendar;

      getCalendarClient();

      const callArgs = mockGoogleCalendar.mock.calls[0][0];
      expect(callArgs.auth).toBe(oauth2Client);
    });
  });
});
