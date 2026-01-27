/**
 * Google SSO Authentication Example
 * 
 * Demonstrates how to use the Google SSO authentication functions
 */

import { getGoogleSSOService } from './google-sso-service';
import { authenticateWithGoogle, linkGoogleAccount, hasGoogleSSO } from './auth-service';

/**
 * Example: Complete Google SSO authentication flow
 */
async function exampleGoogleSSOFlow() {
  const googleSSOService = getGoogleSSOService();

  // Step 1: Generate authorization URL
  const state = 'random-state-value'; // In production, use GoogleSSOService.generateState()
  const authUrl = googleSSOService.getAuthorizationUrl(state);
  console.log('Redirect user to:', authUrl);

  // Step 2: After user authorizes, exchange code for tokens
  const authorizationCode = 'code-from-callback';
  const tokenResponse = await googleSSOService.exchangeCodeForToken(authorizationCode);

  // Step 3: Validate and decode ID token
  const googleUserInfo = await googleSSOService.validateAndDecodeToken(tokenResponse.id_token);

  // Step 4: Authenticate or create user
  const result = await authenticateWithGoogle(googleUserInfo);

  console.log('Authentication successful!');
  console.log('User:', result.user);
  console.log('JWT Token:', result.token);
  console.log('Is new user:', result.isNewUser);

  return result;
}

/**
 * Example: Link Google account to existing user
 */
async function exampleLinkGoogleAccount(userId: string) {
  const googleSSOService = getGoogleSSOService();

  // Get Google user info (after OAuth flow)
  const authorizationCode = 'code-from-callback';
  const tokenResponse = await googleSSOService.exchangeCodeForToken(authorizationCode);
  const googleUserInfo = await googleSSOService.validateAndDecodeToken(tokenResponse.id_token);

  // Link Google account
  await linkGoogleAccount(userId, googleUserInfo.sub, googleUserInfo.email);

  console.log('Google account linked successfully!');
}

/**
 * Example: Check if user has Google SSO
 */
async function exampleCheckGoogleSSO(userId: string) {
  const hasGoogle = await hasGoogleSSO(userId);

  if (hasGoogle) {
    console.log('User has Google SSO enabled');
  } else {
    console.log('User does not have Google SSO');
  }

  return hasGoogle;
}

/**
 * Example: Handle different authentication scenarios
 */
async function exampleAuthenticationScenarios(googleUserInfo: any) {
  const result = await authenticateWithGoogle(googleUserInfo);

  if (result.isNewUser) {
    console.log('Welcome! Your account has been created.');
    console.log('Email:', result.user.email);
    console.log('Name:', result.user.name);
  } else {
    console.log('Welcome back!');
    console.log('Last login:', result.user.updatedAt);
  }

  // Check authentication provider
  switch (result.user.authProvider) {
    case 'google':
      console.log('User authenticates with Google SSO only');
      break;
    case 'email':
      console.log('User authenticates with email/password only');
      break;
    case 'both':
      console.log('User can authenticate with both Google SSO and email/password');
      break;
  }

  return result;
}

// Export examples
export {
  exampleGoogleSSOFlow,
  exampleLinkGoogleAccount,
  exampleCheckGoogleSSO,
  exampleAuthenticationScenarios,
};
