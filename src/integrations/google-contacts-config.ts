/**
 * Google Contacts OAuth Configuration
 * Handles OAuth 2.0 setup for Google People API (Contacts)
 */

import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';

/**
 * Validate required environment variables for Google Contacts OAuth
 */
function validateEnvironmentVariables(): void {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CONTACTS_REDIRECT_URI;

  if (!clientId) {
    throw new Error(
      'GOOGLE_CLIENT_ID environment variable is not set. Please configure Google OAuth credentials.'
    );
  }

  if (!clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_SECRET environment variable is not set. Please configure Google OAuth credentials.'
    );
  }

  if (!redirectUri) {
    throw new Error(
      'GOOGLE_CONTACTS_REDIRECT_URI environment variable is not set. Please configure the OAuth redirect URI.'
    );
  }
}

/**
 * Create a new OAuth2 client for Google Contacts with current environment variables
 */
function createOAuth2Client() {
  validateEnvironmentVariables();

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_CONTACTS_REDIRECT_URI!;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * OAuth Scopes for Google Contacts (Read-Only)
 *
 * IMPORTANT: These scopes are READ-ONLY to ensure one-way sync.
 * CatchUp NEVER modifies Google Contacts data.
 *
 * Requirements: 15.2
 */
export const GOOGLE_CONTACTS_SCOPES: string[] = [
  'https://www.googleapis.com/auth/contacts.readonly', // Read-only access to contacts
  'https://www.googleapis.com/auth/contacts.other.readonly', // Read-only access to "Other Contacts"
  'https://www.googleapis.com/auth/userinfo.email', // User email for identification
  'https://www.googleapis.com/auth/userinfo.profile', // User profile for identification
];

/**
 * Verify that only read-only scopes are configured
 * Throws an error if any write scopes are detected
 */
function verifyReadOnlyScopes(): void {
  const writeScopes = [
    'https://www.googleapis.com/auth/contacts', // Read/write access (NOT ALLOWED)
  ];

  for (const scope of GOOGLE_CONTACTS_SCOPES) {
    if (writeScopes.includes(scope)) {
      throw new Error(
        `SECURITY ERROR: Write scope detected in configuration: ${scope}. ` +
          `Only read-only scopes are allowed for Google Contacts sync.`
      );
    }
  }
}

/**
 * Generate OAuth authorization URL for Google Contacts
 * Requests contacts.readonly and contacts.other.readonly scopes
 *
 * Requirements: 15.2
 */
export function getAuthorizationUrl(state?: string): string {
  // Verify scopes are read-only before generating URL
  verifyReadOnlyScopes();

  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_CONTACTS_SCOPES,
    prompt: 'consent',
    state: state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string): Promise<Credentials | null> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Get Google People API client with user credentials
 */
export function getPeopleClient(tokens: Credentials) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return google.people({
    version: 'v1',
    auth: oauth2Client,
  });
}

/**
 * Get Google OAuth2 client for user info and token refresh
 */
export function getOAuth2Client(tokens: Credentials) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<Credentials> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}
