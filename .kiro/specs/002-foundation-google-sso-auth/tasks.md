# Implementation Plan

- [x] 1. Set up database schema for Google SSO support
  - Create migration to add google_id, auth_provider, name, and profile_picture_url columns to users table
  - Make password_hash nullable
  - Add indexes for google_id and auth_provider
  - Add constraint to ensure either password or google_id exists
  - _Requirements: 1.3, 2.2, 2.3_

- [ ]* 1.1 Write property test for user schema validation
  - **Property 2: Account Creation from Google Profile**
  - **Validates: Requirements 1.3, 2.3**

- [x] 2. Implement Google OAuth Service
  - Create GoogleSSOService class with methods for OAuth flow
  - Implement getAuthorizationUrl() to generate OAuth URLs with state parameter
  - Implement exchangeCodeForToken() to exchange authorization codes for ID tokens
  - Implement validateAndDecodeToken() to validate ID tokens and extract user info
  - Implement verifyTokenSignature() using Google's public keys
  - Add configuration validation on service initialization
  - _Requirements: 1.2, 2.1, 4.1, 4.2, 5.5_

- [ ]* 2.1 Write property test for authorization URL generation
  - **Property 1: Authorization URL Generation**
  - **Validates: Requirements 1.2, 2.1**

- [ ]* 2.2 Write property test for token validation
  - **Property 9: Token Validation**
  - **Validates: Requirements 4.1, 4.2**

- [ ]* 2.3 Write property test for minimal scope enforcement
  - **Property 11: Minimal Scope Request**
  - **Validates: Requirements 4.4**

- [x] 3. Extend Authentication Service for Google SSO
  - Add authenticateWithGoogle() function to handle Google SSO authentication
  - Implement user lookup by google_id
  - Implement user creation from Google profile data
  - Implement account linking for existing email addresses
  - Update JWT generation to support Google SSO users
  - _Requirements: 1.3, 1.4, 2.2, 2.3_

- [ ]* 3.1 Write property test for JWT generation
  - **Property 3: JWT Generation After Authentication**
  - **Validates: Requirements 1.4**

- [ ]* 3.2 Write property test for existing user login
  - **Property 5: Existing User Login**
  - **Validates: Requirements 2.2**

- [x] 4. Implement OAuth state management
  - Create in-memory state store with expiration
  - Implement state generation using crypto.randomBytes
  - Implement state validation with CSRF protection
  - Add automatic cleanup of expired states
  - _Requirements: 4.1, 4.2_

- [x] 5. Create Google SSO API routes
  - Implement GET /api/auth/google/authorize endpoint
  - Implement GET /api/auth/google/callback endpoint
  - Implement POST /api/auth/google/token endpoint (alternative flow)
  - Implement GET /api/auth/google/status endpoint
  - Add rate limiting to all OAuth endpoints
  - _Requirements: 1.2, 2.1, 2.2, 2.3_

- [ ]* 5.1 Write property test for post-authentication redirect
  - **Property 13: Post-Authentication Redirect**
  - **Validates: Requirements 6.4**

- [x] 6. Implement test mode middleware
  - Create test mode detection from TEST_MODE environment variable
  - Implement middleware to block email/password endpoints when test mode is disabled
  - Add test mode indicator to API responses
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 6.1 Write property test for test mode enforcement
  - **Property 7: Test Mode Enforcement**
  - **Validates: Requirements 3.4**

- [ ]* 6.2 Write property test for dual authentication in test mode
  - **Property 8: Dual Authentication in Test Mode**
  - **Validates: Requirements 3.3**

- [x] 7. Implement error handling for Google SSO
  - Create GoogleSSOError class with error codes
  - Implement user-friendly error message mapping
  - Add error response formatting
  - Implement error logging with appropriate detail levels
  - _Requirements: 1.5, 2.4, 5.1, 5.2, 5.3, 5.4_

- [ ]* 7.1 Write property test for error handling
  - **Property 4: Error Handling and User Feedback**
  - **Validates: Requirements 1.5, 2.4, 5.2, 5.3**

- [ ]* 7.2 Write property test for error logging
  - **Property 12: Error Logging**
  - **Validates: Requirements 5.1, 5.4, 7.2, 7.4**

- [x] 8. Implement audit logging for Google SSO
  - Add audit log entries for successful Google SSO authentication
  - Add audit log entries for failed authentication attempts
  - Add audit log entries for token validation failures
  - Include authentication method, timestamp, and user identifier in all logs
  - _Requirements: 2.5, 7.1, 7.2, 7.4, 7.5_

- [ ]* 8.1 Write property test for audit logging completeness
  - **Property 6: Audit Logging for Successful Authentication**
  - **Validates: Requirements 2.5, 7.1, 7.5**

- [x] 9. Implement token encryption for storage
  - Add encryption utility for OAuth tokens
  - Implement AES-256-GCM encryption for tokens at rest
  - Update database operations to encrypt/decrypt tokens
  - _Requirements: 4.3_

- [ ]* 9.1 Write property test for token encryption
  - **Property 10: Token Encryption at Rest**
  - **Validates: Requirements 4.3**

- [x] 10. Create frontend Google SSO button and UI
  - Create google-sso.js with initialization and event handlers
  - Implement Google SSO button with Google branding
  - Add click handler to initiate OAuth flow
  - Implement callback handler to process OAuth response
  - Add loading states and visual feedback
  - Add error display functionality
  - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.3_

- [x] 11. Implement test mode UI logic
  - Add logic to show/hide email/password form based on test mode
  - Fetch test mode status from backend on page load
  - Display test mode indicator when enabled
  - Ensure Google SSO button is always visible
  - _Requirements: 3.1, 3.2_

- [x] 12. Create Account section in Preferences page
  - Add Account section to preferences UI
  - Display user email, authentication method, and connection status
  - Display account creation date and last login timestamp
  - Add sign out button with session clearing
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 12.1 Write property test for sign out functionality
  - **Property 14: Sign Out Session Clearing**
  - **Validates: Requirements 8.4**

- [x] 13. Implement authentication statistics tracking
  - Add database queries to count authentications by method
  - Create API endpoint to retrieve authentication statistics
  - Track Google SSO vs email/password usage
  - _Requirements: 7.3_

- [ ]* 13.1 Write property test for authentication statistics
  - **Property 15: Authentication Statistics**
  - **Validates: Requirements 7.3**

- [x] 14. Add configuration validation and startup checks
  - Validate Google OAuth credentials on application startup
  - Check for required environment variables
  - Fail fast with clear error messages if configuration is invalid
  - Log configuration status (without exposing secrets)
  - _Requirements: 5.5_

- [x] 15. Update existing auth routes for test mode
  - Apply test mode middleware to email/password registration endpoint
  - Apply test mode middleware to email/password login endpoint
  - Ensure test mode doesn't affect other authentication features
  - _Requirements: 3.4_

- [x] 16. Create integration tests for complete OAuth flow
  - Mock Google OAuth endpoints
  - Test full authorization → callback → token exchange → user creation flow
  - Test existing user login flow
  - Test error scenarios (invalid code, expired token, etc.)
  - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3_

- [x] 17. Add documentation and setup guide
  - Document Google Cloud Console setup steps
  - Document environment variable configuration
  - Create troubleshooting guide for common issues
  - Add API documentation for new endpoints
  - Document test mode usage for developers
  - _Requirements: All_

- [x] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
