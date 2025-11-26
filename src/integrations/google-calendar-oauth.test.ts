/**
 * Google Calendar OAuth Integration Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAuthorizationUrl } from './google-calendar-config';

describe('Google Calendar OAuth', () => {
  beforeEach(() => {
    // Set required environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
  });

  it('should generate authorization URL with correct scopes', () => {
    const authUrl = getAuthorizationUrl();
    
    expect(authUrl).toContain('client_id=test-client-id');
    expect(authUrl).toContain('redirect_uri=');
    expect(authUrl).toContain('scope=');
    expect(authUrl).toContain('calendar.readonly');
    expect(authUrl).toContain('userinfo.email');
    expect(authUrl).toContain('userinfo.profile');
  });

  it('should include offline access in authorization URL', () => {
    const authUrl = getAuthorizationUrl();
    
    expect(authUrl).toContain('access_type=offline');
    expect(authUrl).toContain('prompt=consent');
  });

  it('should throw error if credentials are not configured', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    
    expect(() => {
      getAuthorizationUrl();
    }).toThrow('Google OAuth credentials not configured');
  });
});
