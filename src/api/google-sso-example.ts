/**
 * Google SSO Service Usage Example
 *
 * This file demonstrates how to use the Google SSO Service
 * for OAuth 2.0 authentication flow
 */

import { getGoogleSSOService, GoogleSSOService } from './google-sso-service';

/**
 * Example: Generate authorization URL
 */
async function exampleGenerateAuthUrl() {
  const service = getGoogleSSOService();

  // Generate a secure state parameter for CSRF protection
  const state = GoogleSSOService.generateState();

  // Store state in session or memory cache with expiration
  // (Implementation depends on your session management)

  // Generate authorization URL
  const authUrl = service.getAuthorizationUrl(state);

  console.log('Redirect user to:', authUrl);

  return { authUrl, state };
}

/**
 * Example: Handle OAuth callback
 */
async function exampleHandleCallback(code: string, state: string) {
  const service = getGoogleSSOService();

  try {
    // 1. Verify state parameter (CSRF protection)
    // (Check against stored state in session/cache)

    // 2. Exchange authorization code for tokens
    const tokenResponse = await service.exchangeCodeForToken(code);

    console.log('Token exchange successful');
    console.log('Access token:', tokenResponse.access_token.substring(0, 20) + '...');
    console.log('ID token:', tokenResponse.id_token.substring(0, 20) + '...');

    // 3. Validate and decode ID token
    const userInfo = await service.validateAndDecodeToken(tokenResponse.id_token);

    console.log('User info:', {
      googleId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      emailVerified: userInfo.email_verified,
    });

    // 4. Create or find user in database
    // 5. Generate JWT token
    // 6. Return user and token

    return { userInfo, tokenResponse };
  } catch (error: any) {
    console.error('OAuth callback failed:', error.message);
    throw error;
  }
}

/**
 * Example: Complete OAuth flow
 */
async function exampleCompleteFlow() {
  console.log('=== Google SSO Flow Example ===\n');

  // Step 1: Generate authorization URL
  console.log('Step 1: Generate authorization URL');
  const { authUrl, state } = await exampleGenerateAuthUrl();
  console.log('State:', state);
  console.log();

  // Step 2: User visits authUrl and authorizes
  console.log('Step 2: User authorizes and is redirected back with code');
  console.log('(In real flow, user would be redirected to Google)');
  console.log();

  // Step 3: Handle callback with authorization code
  // Note: This would fail without a real authorization code from Google
  console.log('Step 3: Exchange code for tokens and validate');
  console.log('(Skipped in example - requires real authorization code)');
  console.log();

  console.log('=== Flow Complete ===');
}

// Run example if executed directly
if (require.main === module) {
  exampleCompleteFlow().catch(console.error);
}

export { exampleGenerateAuthUrl, exampleHandleCallback, exampleCompleteFlow };

