# Google SSO Quick Reference

## Quick Links

- **Setup Guide**: [GOOGLE_SSO_SETUP_GUIDE.md](./GOOGLE_SSO_SETUP_GUIDE.md)
- **API Documentation**: [GOOGLE_SSO_API.md](./GOOGLE_SSO_API.md)
- **Troubleshooting**: [GOOGLE_SSO_TROUBLESHOOTING.md](./GOOGLE_SSO_TROUBLESHOOTING.md)
- **Developer Guide**: [GOOGLE_SSO_DEVELOPER_GUIDE.md](./GOOGLE_SSO_DEVELOPER_GUIDE.md)
- **User Guide**: [GOOGLE_SSO_USER_GUIDE.md](./GOOGLE_SSO_USER_GUIDE.md)

## Environment Variables

```bash
# Required
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Test Mode (true for development, false for production)
TEST_MODE=false

# Existing (ensure these are set)
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_32_character_key
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/google/authorize` | GET | No | Get authorization URL |
| `/api/auth/google/callback` | GET | No | OAuth callback (automatic) |
| `/api/auth/google/token` | POST | No | Exchange code for token |
| `/api/auth/google/status` | GET | Yes | Check connection status |
| `/api/auth/test-mode/status` | GET | No | Check test mode status |
| `/api/auth/statistics` | GET | Yes | Get auth statistics |

## Common Commands

```bash
# Start development server
npm run dev

# Run database migration
npm run db:migrate

# Check database schema
psql -h localhost -U postgres -d catchup_db -c "\d users"

# View logs
tail -f logs/app.log

# Test authorization endpoint
curl http://localhost:3000/api/auth/google/authorize

# Test test mode status
curl http://localhost:3000/api/auth/test-mode/status
```

## Google Cloud Console Setup

1. **Enable APIs**:
   - People API (required)

2. **OAuth Consent Screen**:
   - App name: CatchUp
   - Scopes: `email`, `profile`

3. **OAuth Credentials**:
   - Type: Web application
   - Redirect URI: `http://localhost:3000/api/auth/google/callback`

4. **Get Credentials**:
   - Copy Client ID and Client Secret
   - Add to `.env` file

## Database Schema

```sql
-- New columns in users table
google_id VARCHAR(255) UNIQUE
auth_provider VARCHAR(50) DEFAULT 'email'
name VARCHAR(255)
profile_picture_url TEXT
password_hash VARCHAR(255) NULL  -- Now nullable
```

## Frontend Integration

```javascript
// Initialize Google SSO
async function signInWithGoogle() {
  const response = await fetch('/api/auth/google/authorize');
  const { authorizationUrl } = await response.json();
  window.location.href = authorizationUrl;
}

// Handle callback
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
if (token) {
  localStorage.setItem('token', token);
  window.location.href = '/dashboard';
}

// Check test mode
async function checkTestMode() {
  const response = await fetch('/api/auth/test-mode/status');
  const { testMode } = await response.json();
  // Show/hide email/password form based on testMode
}
```

## Test Mode

| Mode | Value | Email/Password | Google SSO |
|------|-------|----------------|------------|
| Development | `TEST_MODE=true` | ✅ Enabled | ✅ Enabled |
| Production | `TEST_MODE=false` | ❌ Disabled | ✅ Enabled |

## Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid client" | Verify credentials in Google Cloud Console |
| "Redirect URI mismatch" | Ensure URI matches exactly (no trailing slash) |
| "People API not enabled" | Enable People API in Google Cloud Console |
| "State mismatch" | Try OAuth flow again (state expires in 5 min) |
| "Configuration error" | Check all environment variables are set |
| Email/password form not showing | Verify `TEST_MODE=true` and restart server |

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] `TEST_MODE=false` in production
- [ ] Secrets stored securely (not in version control)
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Token encryption enabled
- [ ] OAuth consent screen published (for >100 users)

## Testing Checklist

- [ ] OAuth flow completes successfully
- [ ] User created in database with `google_id`
- [ ] JWT token generated and valid
- [ ] Test mode shows/hides email/password form correctly
- [ ] Account section displays correct information
- [ ] Sign out works correctly
- [ ] Authentication statistics tracked correctly

## Key Files

```
src/
├── api/
│   ├── google-sso-service.ts          # OAuth service
│   ├── auth-service.ts                # Extended for Google SSO
│   ├── oauth-state-manager.ts         # CSRF protection
│   ├── google-sso-error-handler.ts    # Error handling
│   ├── google-sso-config-validator.ts # Config validation
│   ├── middleware/
│   │   └── test-mode.ts               # Test mode enforcement
│   └── routes/
│       ├── google-sso.ts              # OAuth routes
│       └── auth-statistics.ts         # Statistics routes
├── integrations/
│   └── oauth-repository.ts            # Token storage
└── utils/
    └── encryption.ts                  # Token encryption

public/
└── js/
    └── google-sso.js                  # Frontend integration

scripts/
└── migrations/
    └── 021_add_google_sso_support.sql # Database migration

docs/
├── GOOGLE_SSO_SETUP_GUIDE.md         # Setup instructions
├── GOOGLE_SSO_API.md                 # API documentation
├── GOOGLE_SSO_TROUBLESHOOTING.md     # Troubleshooting guide
├── GOOGLE_SSO_DEVELOPER_GUIDE.md     # Developer guide
├── GOOGLE_SSO_USER_GUIDE.md          # User guide
└── GOOGLE_SSO_QUICK_REFERENCE.md     # This file
```

## Rate Limits

| Endpoint | Window | Max Requests |
|----------|--------|--------------|
| `/authorize` | 1 minute | 10 |
| `/callback` | 1 minute | 20 |
| `/token` | 1 minute | 5 |
| `/status` | 1 minute | 60 |

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CONFIG` | 500 | Configuration error |
| `INVALID_CODE` | 400 | Invalid authorization code |
| `TOKEN_EXCHANGE_FAILED` | 500 | Token exchange failed |
| `INVALID_TOKEN` | 401 | Invalid ID token |
| `TOKEN_EXPIRED` | 401 | Token expired |
| `STATE_MISMATCH` | 400 | CSRF protection triggered |
| `USER_CREATION_FAILED` | 500 | User creation failed |
| `EMAIL_CONFLICT` | 400 | Email already exists |

## Monitoring

### Key Metrics

- Authentication success rate
- Google SSO vs email/password usage
- Token validation failures
- OAuth flow completion time
- Error rates by type

### Logs to Monitor

```bash
# Authentication events
grep "google_sso" logs/app.log

# Errors
grep "ERROR" logs/app.log | grep "google"

# Token validation
grep "token validation" logs/app.log
```

### Health Check

```bash
curl http://localhost:3000/health/google-sso
```

## Support

- **Documentation**: Check the guides listed at the top
- **Troubleshooting**: See [GOOGLE_SSO_TROUBLESHOOTING.md](./GOOGLE_SSO_TROUBLESHOOTING.md)
- **Google Docs**: [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- **Email**: support@catchup.app

## Version History

- **v1.0.0** (2025-01-01): Initial Google SSO implementation
  - OAuth 2.0 flow
  - Test mode support
  - Account linking
  - Audit logging
  - Token encryption
  - Statistics tracking
