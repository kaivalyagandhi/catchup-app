# Google SSO Configuration Validation

## Overview

The Google SSO configuration validator ensures that all required environment variables and configuration settings are properly set before the application starts. This "fail fast" approach prevents runtime errors and provides clear guidance for fixing configuration issues.

## Features

- **Startup Validation**: Automatically validates configuration when the application starts
- **Fail Fast**: Application exits immediately if configuration is invalid
- **Clear Error Messages**: Provides specific, actionable error messages
- **Security Checks**: Validates configuration without exposing secrets in logs
- **Warning System**: Alerts about potential issues that don't prevent startup

## Configuration Requirements

### Required Environment Variables

The following environment variables are required for Google SSO to function:

1. **GOOGLE_CLIENT_ID**
   - Format: `*.apps.googleusercontent.com`
   - Example: `123456789.apps.googleusercontent.com`
   - Obtained from Google Cloud Console

2. **GOOGLE_CLIENT_SECRET**
   - Format: Alphanumeric string, typically 24+ characters
   - Example: `GOCSPX-abcdefghijklmnopqrstuvwxyz`
   - Obtained from Google Cloud Console

3. **GOOGLE_REDIRECT_URI**
   - Format: Valid HTTP/HTTPS URL
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
   - Must match exactly with Google Cloud Console configuration

4. **JWT_SECRET**
   - Format: Secure random string, recommended 32+ characters
   - Used for signing JWT authentication tokens
   - Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

5. **ENCRYPTION_KEY**
   - Format: 64-character hex string
   - Used for encrypting OAuth tokens at rest
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Optional Configuration

- **TEST_MODE**: Set to `true` to enable email/password authentication alongside Google SSO
- **NODE_ENV**: Set to `production` for production deployments

## Validation Checks

### Error Conditions (Application will not start)

1. Missing required environment variables
2. Empty environment variables (whitespace only)
3. Invalid redirect URI format
4. Invalid redirect URI protocol (not http/https)
5. Localhost redirect URI in production
6. Missing JWT_SECRET
7. Missing ENCRYPTION_KEY

### Warning Conditions (Application will start with warnings)

1. Client ID doesn't match expected format (`*.apps.googleusercontent.com`)
2. Client secret appears too short (< 20 characters)
3. Using HTTP protocol in production
4. Redirect URI path doesn't contain "/callback"
5. JWT_SECRET is shorter than recommended (< 32 characters)
6. ENCRYPTION_KEY is shorter than recommended (< 64 characters)
7. TEST_MODE enabled in production

## Usage

### Automatic Validation

The validator runs automatically when the application starts:

```typescript
// src/index.ts
import { validateAndFailFast } from './api/google-sso-config-validator';

async function main() {
  console.log('CatchUp Application Starting...');
  
  // Validate Google SSO configuration (fail fast if invalid)
  validateAndFailFast();
  
  // Continue with application startup...
}
```

### Manual Validation

You can also validate configuration programmatically:

```typescript
import { validateGoogleSSOConfig, getGoogleSSOConfig } from './api/google-sso-config-validator';

// Validate and get results
const validation = validateGoogleSSOConfig();

if (validation.valid) {
  console.log('Configuration is valid');
  
  // Get configuration object
  const config = getGoogleSSOConfig();
  console.log('Client ID:', config.clientId);
  console.log('Test Mode:', config.testMode);
} else {
  console.error('Configuration errors:', validation.errors);
  console.warn('Configuration warnings:', validation.warnings);
}
```

## Example Output

### Valid Configuration

```
CatchUp Application Starting...
Validating Google SSO configuration...

=== Google SSO Configuration Status ===

Environment Variables:
  GOOGLE_CLIENT_ID: ✓ Set
  GOOGLE_CLIENT_SECRET: ✓ Set
  GOOGLE_REDIRECT_URI: http://localhost:3000/api/auth/google/callback
  JWT_SECRET: ✓ Set
  ENCRYPTION_KEY: ✓ Set
  TEST_MODE: false
  NODE_ENV: development

Validation Status: ✓ Valid

✓ Google SSO configuration is valid and ready to use.

=======================================
```

### Invalid Configuration

```
CatchUp Application Starting...
Validating Google SSO configuration...

=== Google SSO Configuration Status ===

Environment Variables:
  GOOGLE_CLIENT_ID: ✗ Not set
  GOOGLE_CLIENT_SECRET: ✗ Not set
  GOOGLE_REDIRECT_URI: ✗ Not set
  JWT_SECRET: ✓ Set
  ENCRYPTION_KEY: ✓ Set
  TEST_MODE: false
  NODE_ENV: development

Validation Status: ✗ Invalid

❌ Configuration Errors:
  1. Missing required environment variable: GOOGLE_CLIENT_ID
  2. Missing required environment variable: GOOGLE_CLIENT_SECRET
  3. Missing required environment variable: GOOGLE_REDIRECT_URI

=======================================

❌ Google SSO configuration is invalid. Application cannot start.

Please fix the configuration errors listed above and restart.

See .env.example for configuration template.
```

### Configuration with Warnings

```
=== Google SSO Configuration Status ===

Environment Variables:
  GOOGLE_CLIENT_ID: ✓ Set
  GOOGLE_CLIENT_SECRET: ✓ Set
  GOOGLE_REDIRECT_URI: http://example.com/api/auth/google/callback
  JWT_SECRET: ✓ Set
  ENCRYPTION_KEY: ✓ Set
  TEST_MODE: false
  NODE_ENV: production

Validation Status: ✓ Valid

⚠️  Configuration Warnings:
  1. GOOGLE_REDIRECT_URI uses http protocol in production. Consider using https for security.

✓ Google SSO configuration is valid but has warnings. Review warnings above.

=======================================
```

## Troubleshooting

### "Missing required environment variable"

**Solution**: Add the missing variable to your `.env` file. See `.env.example` for the template.

### "GOOGLE_REDIRECT_URI is not a valid URL"

**Solution**: Ensure the redirect URI is a complete, valid URL including protocol (http/https).

### "Token audience does not match client ID"

**Solution**: Verify that `GOOGLE_CLIENT_ID` matches the client ID configured in Google Cloud Console.

### "GOOGLE_REDIRECT_URI points to localhost in production"

**Solution**: Update the redirect URI to use your production domain instead of localhost.

### "TEST_MODE is enabled in production environment"

**Solution**: Set `TEST_MODE=false` or remove the variable in production to disable email/password authentication.

## Security Considerations

1. **No Secret Exposure**: The validator logs configuration status without exposing actual secret values
2. **Fail Fast**: Invalid configuration prevents the application from starting, avoiding runtime security issues
3. **Production Checks**: Extra validation for production environments (HTTPS, no localhost, etc.)
4. **Key Length Validation**: Ensures encryption keys and secrets meet minimum security requirements

## Testing

The validator includes comprehensive unit tests covering all validation scenarios:

```bash
# Run validator tests
npm test -- src/api/google-sso-config-validator.test.ts
```

Test coverage includes:
- Missing environment variables
- Invalid formats
- Production-specific checks
- Warning conditions
- Configuration object generation

## Related Documentation

- [Google Cloud Setup Guide](../../GOOGLE_CLOUD_SETUP_GUIDE.md)
- [Google SSO Service README](./GOOGLE_SSO_SERVICE_README.md)
- [Environment Variables](.env.example)

## Requirements Validation

This implementation validates **Requirement 5.5** from the Google SSO specification:

> WHEN Google SSO credentials are configured THEN the CatchUp System SHALL store client secrets in environment variables and never commit them to version control

> WHEN the Google OAuth configuration is missing or invalid THEN the CatchUp System SHALL prevent the application from starting and display a clear configuration error
