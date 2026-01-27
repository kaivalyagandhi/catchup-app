/**
 * OAuth State Manager - Example Usage
 * 
 * This file demonstrates how to use the OAuth State Manager
 * for secure OAuth 2.0 flows with CSRF protection.
 */

import { getOAuthStateManager } from './oauth-state-manager';

// Example 1: Basic OAuth Flow
async function basicOAuthFlow() {
  const stateManager = getOAuthStateManager();
  
  // Step 1: Generate state for authorization
  const state = stateManager.generateState();
  console.log('Generated state:', state);
  
  // Step 2: Build authorization URL (example with Google)
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
  authUrl.searchParams.set('redirect_uri', 'http://localhost:3000/callback');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'email profile');
  authUrl.searchParams.set('state', state);
  
  console.log('Authorization URL:', authUrl.toString());
  
  // Step 3: User is redirected to Google, then back to callback
  // Simulate callback with the state
  const callbackState = state;
  
  // Step 4: Validate state in callback
  if (stateManager.validateState(callbackState)) {
    console.log('✓ State validated successfully');
    // Continue with token exchange...
  } else {
    console.log('✗ Invalid or expired state');
  }
}

// Example 2: Handling Invalid State
async function handleInvalidState() {
  const stateManager = getOAuthStateManager();
  
  // Try to validate a non-existent state
  const invalidState = 'fake-state-token';
  
  if (!stateManager.validateState(invalidState)) {
    console.log('✗ State validation failed - possible CSRF attack');
    // Return error to user
    throw new Error('Invalid state parameter. Please try again.');
  }
}

// Example 3: Preventing Replay Attacks
async function preventReplayAttack() {
  const stateManager = getOAuthStateManager();
  
  const state = stateManager.generateState();
  
  // First validation succeeds
  console.log('First validation:', stateManager.validateState(state)); // true
  
  // Second validation fails (state was consumed)
  console.log('Second validation:', stateManager.validateState(state)); // false
  console.log('✓ Replay attack prevented');
}

// Example 4: Handling Expired States
async function handleExpiredState() {
  const stateManager = getOAuthStateManager();
  
  const state = stateManager.generateState();
  
  // Check if state exists
  console.log('State exists:', stateManager.hasState(state)); // true
  
  // Simulate waiting for expiration (in real scenario, this would be 10 minutes)
  // For demo purposes, we'll just show the concept
  console.log('State would expire after 10 minutes');
  
  // After expiration, validation would fail
  // console.log('Validation after expiration:', stateManager.validateState(state)); // false
}

// Example 5: Monitoring Active States
async function monitorActiveStates() {
  const stateManager = getOAuthStateManager();
  
  console.log('Initial state count:', stateManager.getActiveStateCount()); // 0
  
  // Generate multiple states
  stateManager.generateState();
  stateManager.generateState();
  stateManager.generateState();
  
  console.log('After generating 3 states:', stateManager.getActiveStateCount()); // 3
  
  // Clear all states
  stateManager.clearAll();
  console.log('After clearing:', stateManager.getActiveStateCount()); // 0
}

// Example 6: Express.js Integration
function expressIntegration() {
  const stateManager = getOAuthStateManager();
  
  // Authorization endpoint
  const authorizeHandler = (req: any, res: any) => {
    const state = stateManager.generateState();
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || '');
    authUrl.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI || '');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'email profile');
    authUrl.searchParams.set('state', state);
    
    res.json({ authUrl: authUrl.toString() });
  };
  
  // Callback endpoint
  const callbackHandler = async (req: any, res: any) => {
    const { code, state } = req.query;
    
    // Validate state
    if (!stateManager.validateState(state)) {
      return res.status(400).json({
        error: 'invalid_state',
        message: 'Invalid or expired state parameter'
      });
    }
    
    try {
      // Exchange code for tokens
      // const tokens = await exchangeCodeForTokens(code);
      
      // Create user session
      // const user = await createOrUpdateUser(tokens);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        error: 'authentication_failed',
        message: 'Failed to complete authentication'
      });
    }
  };
  
  return { authorizeHandler, callbackHandler };
}

// Example 7: Error Handling
async function errorHandling() {
  const stateManager = getOAuthStateManager();
  
  try {
    const state = stateManager.generateState();
    
    // Simulate OAuth callback
    const callbackState = 'wrong-state';
    
    if (!stateManager.validateState(callbackState)) {
      throw new Error('CSRF validation failed');
    }
  } catch (error) {
    console.error('OAuth error:', error);
    // Log security event
    console.log('Security event: Invalid state parameter detected');
  }
}

// Example 8: Cleanup on Shutdown
function setupGracefulShutdown() {
  const stateManager = getOAuthStateManager();
  
  process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    stateManager.destroy();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    stateManager.destroy();
    process.exit(0);
  });
}

// Run examples
async function runExamples() {
  console.log('\n=== Example 1: Basic OAuth Flow ===');
  await basicOAuthFlow();
  
  console.log('\n=== Example 2: Handling Invalid State ===');
  try {
    await handleInvalidState();
  } catch (error: any) {
    console.log('Caught error:', error.message);
  }
  
  console.log('\n=== Example 3: Preventing Replay Attacks ===');
  await preventReplayAttack();
  
  console.log('\n=== Example 4: Handling Expired States ===');
  await handleExpiredState();
  
  console.log('\n=== Example 5: Monitoring Active States ===');
  await monitorActiveStates();
  
  console.log('\n=== Example 7: Error Handling ===');
  await errorHandling();
  
  console.log('\n✓ All examples completed');
}

// Uncomment to run examples
// runExamples().catch(console.error);

export {
  basicOAuthFlow,
  handleInvalidState,
  preventReplayAttack,
  handleExpiredState,
  monitorActiveStates,
  expressIntegration,
  errorHandling,
  setupGracefulShutdown,
};
