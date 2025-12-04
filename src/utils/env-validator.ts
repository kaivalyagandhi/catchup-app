/**
 * Environment Variable Validator
 *
 * Validates all required environment variables on application startup
 * Fails fast with clear error messages if configuration is invalid
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all required environment variables
 * @returns Validation result with errors and warnings
 */
export function validateEnvironmentVariables(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Database configuration (required)
  const databaseVars = [
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_NAME',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
  ];

  for (const varName of databaseVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else if (process.env[varName]?.trim() === '') {
      errors.push(`Environment variable ${varName} is empty`);
    }
  }

  // Validate DATABASE_PORT is a valid number
  if (process.env.DATABASE_PORT) {
    const port = parseInt(process.env.DATABASE_PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(
        `DATABASE_PORT must be a valid port number (1-65535), got: ${process.env.DATABASE_PORT}`
      );
    }
  }

  // Application configuration (required)
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV not set, defaulting to development');
  } else if (!['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    warnings.push(
      `NODE_ENV should be 'development', 'production', or 'test', got: ${process.env.NODE_ENV}`
    );
  }

  // Validate PORT if set
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(`PORT must be a valid port number (1-65535), got: ${process.env.PORT}`);
    }
  }

  // Google OAuth configuration (required)
  const googleOAuthVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];

  for (const varName of googleOAuthVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else if (process.env[varName]?.trim() === '') {
      errors.push(`Environment variable ${varName} is empty`);
    }
  }

  // Validate GOOGLE_CLIENT_ID format
  if (
    process.env.GOOGLE_CLIENT_ID &&
    !process.env.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')
  ) {
    warnings.push(
      'GOOGLE_CLIENT_ID does not match expected format (*.apps.googleusercontent.com). ' +
        'This may indicate an incorrect client ID.'
    );
  }

  // Validate GOOGLE_CLIENT_SECRET length
  if (process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.length < 20) {
    warnings.push(
      'GOOGLE_CLIENT_SECRET appears to be too short. ' +
        'Google client secrets are typically 24+ characters.'
    );
  }

  // Validate GOOGLE_REDIRECT_URI format
  if (process.env.GOOGLE_REDIRECT_URI) {
    try {
      const url = new URL(process.env.GOOGLE_REDIRECT_URI);

      // Check protocol
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push(`GOOGLE_REDIRECT_URI must use http or https protocol, got: ${url.protocol}`);
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
      errors.push(`GOOGLE_REDIRECT_URI is not a valid URL: ${process.env.GOOGLE_REDIRECT_URI}`);
    }
  }

  // Security configuration (required)
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

  // Redis configuration (required for job queue)
  const redisVars = ['REDIS_HOST', 'REDIS_PORT'];
  for (const varName of redisVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else if (process.env[varName]?.trim() === '') {
      errors.push(`Environment variable ${varName} is empty`);
    }
  }

  // Validate REDIS_PORT is a valid number
  if (process.env.REDIS_PORT) {
    const port = parseInt(process.env.REDIS_PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(
        `REDIS_PORT must be a valid port number (1-65535), got: ${process.env.REDIS_PORT}`
      );
    }
  }

  // Optional but recommended: Google Cloud Speech-to-Text
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_API_KEY) {
    warnings.push(
      'Neither GOOGLE_APPLICATION_CREDENTIALS nor GOOGLE_CLOUD_API_KEY is set. ' +
        'Voice transcription features will not work. ' +
        'Set one of these to enable Google Cloud Speech-to-Text API.'
    );
  }

  // Optional but recommended: Google Gemini API
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    warnings.push(
      'GOOGLE_GEMINI_API_KEY is not set. ' +
        'AI-powered features (entity extraction, tag generation) will not work. ' +
        'Set this to enable Google Gemini API.'
    );
  }

  // Optional but recommended: Twilio SMS
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_PHONE_NUMBER
  ) {
    warnings.push(
      'Twilio SMS configuration is incomplete. ' +
        'SMS notification features will not work. ' +
        'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to enable SMS.'
    );
  }

  // Optional but recommended: SendGrid Email
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    warnings.push(
      'SendGrid email configuration is incomplete. ' +
        'Email notification features will not work. ' +
        'Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to enable email.'
    );
  }

  // Test mode warning
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
 * Log environment variable validation status
 * @param validation - Validation result
 */
export function logValidationStatus(validation: EnvValidationResult): void {
  console.log('\n=== Environment Variable Validation ===');

  // Log environment variables status (without values)
  console.log('\nRequired Variables:');
  console.log(`  DATABASE_HOST: ${process.env.DATABASE_HOST ? '✓ Set' : '✗ Not set'}`);
  console.log(`  DATABASE_PORT: ${process.env.DATABASE_PORT ? '✓ Set' : '✗ Not set'}`);
  console.log(`  DATABASE_NAME: ${process.env.DATABASE_NAME ? '✓ Set' : '✗ Not set'}`);
  console.log(`  DATABASE_USER: ${process.env.DATABASE_USER ? '✓ Set' : '✗ Not set'}`);
  console.log(`  DATABASE_PASSWORD: ${process.env.DATABASE_PASSWORD ? '✓ Set' : '✗ Not set'}`);
  console.log(`  GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Not set'}`);
  console.log(
    `  GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Not set'}`
  );
  console.log(`  GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI ? '✓ Set' : '✗ Not set'}`);
  console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set' : '✗ Not set'}`);
  console.log(`  ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY ? '✓ Set' : '✗ Not set'}`);
  console.log(`  REDIS_HOST: ${process.env.REDIS_HOST ? '✓ Set' : '✗ Not set'}`);
  console.log(`  REDIS_PORT: ${process.env.REDIS_PORT ? '✓ Set' : '✗ Not set'}`);

  console.log('\nOptional Variables:');
  console.log(
    `  GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✓ Set' : '✗ Not set'}`
  );
  console.log(
    `  GOOGLE_CLOUD_API_KEY: ${process.env.GOOGLE_CLOUD_API_KEY ? '✓ Set' : '✗ Not set'}`
  );
  console.log(
    `  GOOGLE_GEMINI_API_KEY: ${process.env.GOOGLE_GEMINI_API_KEY ? '✓ Set' : '✗ Not set'}`
  );
  console.log(`  TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Not set'}`);
  console.log(`  SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? '✓ Set' : '✗ Not set'}`);

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

  console.log('\n========================================\n');
}

/**
 * Validate environment variables and fail fast if invalid
 * This should be called during application startup
 */
export function validateAndFailFast(): void {
  const validation = validateEnvironmentVariables();

  // Always log validation status
  logValidationStatus(validation);

  // Fail fast if validation failed
  if (!validation.valid) {
    console.error('\n❌ Environment variable validation failed. Application cannot start.\n');
    console.error('Please fix the configuration errors listed above and restart.\n');
    console.error('See .env.example for configuration template.\n');
    process.exit(1);
  }

  // Log success message
  if (validation.warnings.length === 0) {
    console.log('✓ All environment variables are valid and ready to use.\n');
  } else {
    console.log('✓ Environment variables are valid but have warnings. Review warnings above.\n');
  }
}
