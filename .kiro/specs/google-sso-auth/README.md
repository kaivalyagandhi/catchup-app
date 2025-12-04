# Google SSO Authentication Spec

## Overview

This spec defines the implementation of Google Single Sign-On (SSO) authentication for CatchUp. Google SSO will be the primary authentication method for production users, with email/password authentication available only in test mode for development purposes.

## Key Features

- **Google SSO as Primary Auth**: Production users authenticate exclusively via Google
- **Test Mode Support**: Developers can enable email/password auth via TEST_MODE environment variable
- **Seamless Integration**: Works with existing JWT-based authentication system
- **Security First**: Comprehensive token validation, CSRF protection, and audit logging
- **Account Management**: Users can view their account info in Preferences page

## Documents

1. **[requirements.md](./requirements.md)** - User stories and acceptance criteria
2. **[design.md](./design.md)** - Technical design, architecture, and correctness properties
3. **[tasks.md](./tasks.md)** - Implementation task list

## Quick Start

To begin implementing this feature:

1. Review the requirements document to understand user needs
2. Study the design document for technical architecture
3. Open tasks.md and click "Start task" on the first task

## Key Design Decisions

### Authentication Strategy
- **Production**: Google SSO only (TEST_MODE=false)
- **Development**: Both Google SSO and email/password (TEST_MODE=true)

### Technology Stack
- **OAuth Library**: Custom implementation using Google Identity Services
- **Property Testing**: fast-check for JavaScript
- **Token Validation**: Google's public keys for signature verification
- **State Management**: In-memory store with expiration for CSRF protection

### Database Changes
- Add `google_id`, `auth_provider`, `name`, `profile_picture_url` to users table
- Make `password_hash` nullable
- Add indexes for performance

### Security Measures
- CSRF protection via state parameter
- Comprehensive ID token validation
- Token encryption at rest
- Rate limiting on OAuth endpoints
- Detailed audit logging

## Environment Variables

```bash
# Required for Google SSO
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Test mode configuration
TEST_MODE=false  # Set to 'true' for development

# Existing variables
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

## API Endpoints

- `GET /api/auth/google/authorize` - Get OAuth authorization URL
- `GET /api/auth/google/callback` - Handle OAuth callback
- `POST /api/auth/google/token` - Alternative token exchange endpoint
- `GET /api/auth/google/status` - Check Google SSO connection status

## Testing Strategy

### Property-Based Tests (Optional)
- Authorization URL generation
- Token validation
- Account creation idempotency
- JWT generation
- Audit logging completeness
- Error message safety
- Test mode enforcement

### Integration Tests
- Complete OAuth flow
- Test mode switching
- Database operations
- Frontend integration

## Implementation Order

1. Database schema updates
2. Google OAuth Service
3. Extended Authentication Service
4. OAuth state management
5. API routes
6. Test mode middleware
7. Error handling
8. Audit logging
9. Token encryption
10. Frontend UI
11. Preferences page integration
12. Statistics tracking
13. Configuration validation
14. Documentation

## Success Criteria

- [ ] Users can sign up and log in using Google SSO
- [ ] Email/password auth is hidden in production (TEST_MODE=false)
- [ ] Email/password auth works in test mode (TEST_MODE=true)
- [ ] All authentication events are logged in audit trail
- [ ] Account information displays correctly in Preferences
- [ ] Error handling provides clear user feedback
- [ ] All security validations pass (token signature, claims, CSRF)
- [ ] Configuration errors are caught at startup

## Next Steps

1. Set up Google Cloud Console project and OAuth credentials
2. Add environment variables to your `.env` file
3. Start with Task 1: Database schema migration
4. Work through tasks sequentially
5. Test each component as you build it

## Support

For questions or issues during implementation:
- Review the design document for technical details
- Check the requirements document for acceptance criteria
- Refer to Google's OAuth 2.0 documentation
- Test in development with TEST_MODE=true first
