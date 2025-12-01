/**
 * Google Contacts OAuth Service
 * Manages OAuth 2.0 authentication flow for Google Contacts access
 */

import type { Credentials } from 'google-auth-library';
import {
  getAuthorizationUrl as getAuthUrl,
  getTokensFromCode,
  getOAuth2Client,
  refreshAccessToken as refreshToken,
} from './google-contacts-config';
import { upsertToken, getToken, deleteToken } from './oauth-repository';

const PROVIDER = 'google_contacts';

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export interface UserProfile {
  email: string;
  name?: string;
}

/**
 * GoogleContactsOAuthService
 * Handles OAuth flow, token management, and connection status
 */
export class GoogleContactsOAuthService {
  /**
   * Generate authorization URL for user consent
   */
  getAuthorizationUrl(): string {
    return getAuthUrl();
  }

  /**
   * Exchange authorization code for tokens and store them
   */
  async handleCallback(code: string, userId: string): Promise<OAuthTokens> {
    // Exchange code for tokens
    const credentials = await getTokensFromCode(code);

    if (!credentials || !credentials.access_token) {
      throw new Error('Failed to obtain access token from authorization code');
    }

    // Get user profile to verify and store email
    const profile = await this.getUserProfile(credentials);

    // Store tokens in database
    await upsertToken(
      userId,
      PROVIDER,
      credentials.access_token,
      credentials.refresh_token || undefined,
      credentials.token_type || undefined,
      credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      credentials.scope || undefined,
      profile.email
    );

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || '',
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(),
      scope: credentials.scope || '',
    };
  }

  /**
   * Get user profile information from Google
   */
  private async getUserProfile(credentials: Credentials): Promise<UserProfile> {
    const oauth2Client = getOAuth2Client(credentials);
    const oauth2 = await import('googleapis').then((g) =>
      g.google.oauth2({ version: 'v2', auth: oauth2Client })
    );

    const { data } = await oauth2.userinfo.get();

    if (!data.email) {
      throw new Error('Failed to retrieve user email from Google');
    }

    return {
      email: data.email,
      name: data.name || undefined,
    };
  }

  /**
   * Refresh expired access token
   */
  async refreshAccessToken(userId: string): Promise<string> {
    const token = await getToken(userId, PROVIDER);

    if (!token || !token.refreshToken) {
      throw new Error('No refresh token available for user');
    }

    try {
      const newCredentials = await refreshToken(token.refreshToken);

      if (!newCredentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      // Update stored tokens
      await upsertToken(
        userId,
        PROVIDER,
        newCredentials.access_token,
        newCredentials.refresh_token || token.refreshToken,
        newCredentials.token_type || token.tokenType,
        newCredentials.expiry_date ? new Date(newCredentials.expiry_date) : undefined,
        newCredentials.scope || token.scope,
        token.email
      );

      return newCredentials.access_token;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to refresh access token: ${errorMsg}`);
    }
  }

  /**
   * Check if user has connected Google Contacts
   */
  async isConnected(userId: string): Promise<boolean> {
    const token = await getToken(userId, PROVIDER);
    return !!token;
  }

  /**
   * Get connection status with details
   */
  async getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    email?: string;
    expiresAt?: Date;
  }> {
    const token = await getToken(userId, PROVIDER);

    return {
      connected: !!token,
      email: token?.email,
      expiresAt: token?.expiresAt,
    };
  }

  /**
   * Get access token for API requests
   * Automatically refreshes if expired
   */
  async getAccessToken(userId: string): Promise<string> {
    const token = await getToken(userId, PROVIDER);

    if (!token) {
      throw new Error('User has not connected Google Contacts');
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const now = new Date();
    const expiresAt = token.expiresAt;
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt && expiresAt < fiveMinutesFromNow) {
      // Token is expired or about to expire, refresh it
      return await this.refreshAccessToken(userId);
    }

    return token.accessToken;
  }

  /**
   * Disconnect and revoke tokens
   * Clears OAuth tokens and sync state while preserving contacts
   */
  async disconnect(userId: string): Promise<void> {
    // Import repositories here to avoid circular dependencies
    const { clearSyncState } = await import('./sync-state-repository');
    const { PostgresContactRepository } = await import('../contacts/repository');

    // Delete OAuth tokens
    await deleteToken(userId, PROVIDER);

    // Clear sync state (sync token, timestamps)
    await clearSyncState(userId);

    // Clear Google sync metadata from contacts (preserve contacts)
    const contactRepo = new PostgresContactRepository();
    await contactRepo.clearGoogleSyncMetadata(userId);
  }
}

// Export singleton instance
export const googleContactsOAuthService = new GoogleContactsOAuthService();
