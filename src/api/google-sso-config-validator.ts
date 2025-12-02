/**
 * Google SSO Configuration Validator
 *
 * Validates Google OAuth credentials and configuration on application startup
 * Fails fast with clear error messages if configuration is invalid
 */

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GoogleSSOConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  testMode: boolean;
}

/**
 * Validate Google SSO configuration
 * @returns Validation result with errors and warnings
 */
export function validateGoogleSSOConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else if (process.env[varName]?.trim() === '') {
      errors.push(`Environment variable ${varName} is empty`);
    }
  }

  // If required vars are missing, return early
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Validate client ID format
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    warnings.push(
      'GOOGLE_CLIENT_ID does not match expected format (*.apps.googleusercontent.com). ' +
        'This may indicate an incorrect client ID.'
    );
  }

  // Validate client secret format (should be a long alphanumeric string)
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  if (clientSecret.length < 20) {
    warnings.push(
      'GOOGLE_CLIENT_SECRET appears to be too short. ' +
        'Google client secrets are typically 24+ characters.'
    );
  }

  // Validate redirect URI format
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
  try {
    const url = new URL(redirectUri);

    // Check protocol
    if (!['http:', 'https:'].includes(url.protocol)) {
      errors.push(
        `GOOGLE_REDIRECT_URI must use http or https protocol, got: ${url.protocol}`
      );
    }

    // Warn if using http in production
    if (url.protocol === 'http:' && process.env.NODE_ENV === 'production') {
      warnings.push(
        'GOOGLE_REDIRECT_URI uses http protocol in production. ' +
          'Consider using https for security.'
      );
    }

    // Check if localhost in production
    if (
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      process.env.NODE_ENV === 'production'
    ) {
      errors.push(
        'GOOGLE_REDIRECT_URI points to localhost in production environment. ' +
          'This will not work for external users.'
      );
    }

    // Validate path format
    if (!url.pathname.includes('/callback')) {
      warnings.push(
        'GOOGLE_REDIRECT_URI path does not contain "/callback". ' +
          'Ensure this matches your OAuth route configuration.'
      );
    }
  } catch (error) {
    errors.push(`GOOGLE_REDIRECT_URI is not a valid URL: ${redirectUri}`);
  }

  // Check JWT_SECRET (required for token generation)
  if (!process.env.JWT_SECRET) {
    errors.push(
      'Missing JWT_SECRET environment variable. ' +
        'This is required for generating authentication tokens.'
    );
  } else if (process.env.JWT_SECRET.length < 32) {
    warnings.push(
      'JWT_SECRET is shorter than recommended (32+ characters). ' +
        'Consider using a longer secret for better security.'
    );
  }

  // Check ENCRYPTION_KEY (required for token storage)
  if (!process.env.ENCRYPTION_KEY) {
    errors.push(
      'Missing ENCRYPTION_KEY environment variable. ' +
        'This is required for encrypting OAuth tokens at rest.'
    );
  } else if (process.env.ENCRYPTION_KEY.length < 64) {
    warnings.push(
      'ENCRYPTION_KEY is shorter than recommended (64 characters). ' +
        'Consider using a 64-character hex string for AES-256 encryption.'
    );
  }

  // Check test mode configuration
  const testMode = process.env.TEST_MODE === 'true';
  if (testMode && process.env.NODE_ENV === 'production') {
    warnings.push(
      'TEST_MODE is enabled in production environment. ' +
        'This allows email/password authentication which should be disabled in production.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get Google SSO configuration from environment
 * @returns Configuration object
 * @throws Error if configuration is invalid
 */
export function getGoogleSSOConfig(): GoogleSSOConfig {
  const validation = validateGoogleSSOConfig();

  if (!validation.valid) {
    throw new Error(
      `Invalid Google SSO configuration:\n${validation.errors.join('\n')}`
    );
  }

  return {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    testMode: process.env.TEST_MODE === 'true',
  };
}

/**
 * Log configuration status (without exposing secrets)
 * @param validation - Validation result
 */
export function logConfigurationStatus(validation: ConfigValidationResult): void {
  console.log('\n=== Google SSO Configuration Status ===');

  // Log environment variables status (without values)
  console.log('\nEnvironment Variables:');
  console.log(
    `  GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Not set'}`
  );
  console.log(
    `  GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Not set'}`
  );
  console.log(
    `  GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI || '✗ Not set'}`
  );
  console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set' : '✗ Not set'}`);
  console.log(
    `  ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY ? '✓ Set' : '✗ Not set'}`
  );
  console.log(`  TEST_MODE: ${process.env.TEST_MODE || 'false'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

  // Log validation status
  console.log(`\nValidation Status: ${validation.valid ? '✓ Valid' : '✗ Invalid'}`);

  // Log errors
  if (validation.errors.length > 0) {
    console.log('\n❌ Configuration Errors:');
    validation.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  // Log warnings
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Configuration Warnings:');
    validation.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
  }

  console.log('\n=======================================\n');
}

/**
 * Validate configuration and fail fast if invalid
 * This should be called during application startup
 */
export function validateAndFailFast(): void {
  const validation = validateGoogleSSOConfig();

  // Always log configuration status
  logConfigurationStatus(validation);

  // Fail fast if configuration is invalid
  if (!validation.valid) {
    console.error('\n❌ Google SSO configuration is invalid. Application cannot start.\n');
    console.error('Please fix the configuration errors listed above and restart.\n');
    console.error('See .env.example for configuration template.\n');
    process.exit(1);
  }

  // Log success message
  if (validation.warnings.length === 0) {
    console.log('✓ Google SSO configuration is valid and ready to use.\n');
  } else {
    console.log(
      '✓ Google SSO configuration is valid but has warnings. Review warnings above.\n'
    );
  }
}
