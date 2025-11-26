/**
 * Google Calendar OAuth Configuration
 * Handles OAuth 2.0 setup for Google Calendar API
 */

import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

export { oauth2Client };

/**
 * Generate OAuth authorization URL
 */
export function getAuthorizationUrl(): string {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string): Promise<Credentials | null> {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Set credentials for API calls
 */
export function setCredentials(tokens: Credentials): void {
  oauth2Client.setCredentials(tokens);
}

/**
 * Get Google Calendar API client
 */
export function getCalendarClient() {
  return google.calendar({ version: 'v3', auth: oauth2Client });
}
