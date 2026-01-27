/**
 * Error Handling Example
 *
 * Demonstrates how to use the SMS/MMS error handling system
 */

import {
  processWithErrorHandling,
  retryWithBackoff,
  classifyError,
  isRecoverableError,
  logErrorWithContext,
  notifyUserOfFailure,
  SMSErrorType,
  ErrorContext,
  DEFAULT_RETRY_CONFIG,
} from './sms-error-handler';

/**
 * Example 1: Basic error handling with automatic retry
 */
async function example1_basicErrorHandling() {
  console.log('\n=== Example 1: Basic Error Handling ===\n');

  const context: ErrorContext = {
    userId: 'user-123',
    phoneNumber: '+15555551234',
    messageSid: 'MM123',
    messageType: 'sms',
    contentType: 'text',
    timestamp: new Date(),
  };

  // Simulate a function that might fail
  let attemptCount = 0;
  const unreliableOperation = async () => {
    attemptCount++;
    console.log(`Attempt ${attemptCount}...`);

    if (attemptCount < 3) {
      // Simulate a recoverable error (network timeout)
      const error: any = new Error('Network timeout');
      error.code = 'ETIMEDOUT';
      throw error;
    }

    return 'Success!';
  };

  const result = await processWithErrorHandling(
    unreliableOperation,
    context,
    {
      ...DEFAULT_RETRY_CONFIG,
      initialDelayMs: 100, // Faster for demo
    }
  );

  if (result.success) {
    console.log('✓ Operation succeeded:', result.result);
  } else {
    console.log('✗ Operation failed:', result.error?.message);
  }
}

/**
 * Example 2: Handling unrecoverable errors
 */
async function example2_unrecoverableError() {
  console.log('\n=== Example 2: Unrecoverable Error ===\n');

  const context: ErrorContext = {
    userId: 'user-456',
    phoneNumber: '+15555556789',
    messageSid: 'MM456',
    messageType: 'mms',
    contentType: 'audio',
    timestamp: new Date(),
  };

  // Simulate an unrecoverable error
  const failingOperation = async () => {
    const error: any = new Error('Malformed media file');
    throw error;
  };

  const result = await processWithErrorHandling(
    failingOperation,
    context,
    DEFAULT_RETRY_CONFIG
  );

  if (result.success) {
    console.log('✓ Operation succeeded:', result.result);
  } else {
    console.log('✗ Operation failed immediately (unrecoverable):', result.error?.message);
    console.log('  Error type:', result.error?.errorType);
    console.log('  Recoverable:', result.error?.isRecoverable());
  }
}

/**
 * Example 3: Error classification
 */
async function example3_errorClassification() {
  console.log('\n=== Example 3: Error Classification ===\n');

  const errors = [
    { message: 'Connection timeout', code: 'ETIMEDOUT' },
    { message: 'Service unavailable', status: 503 },
    { message: 'Authentication failed', status: 401 },
    { message: 'Malformed media file' },
    { message: 'File size exceeds limit' },
    { message: 'Quota exceeded' },
  ];

  for (const errorData of errors) {
    const error: any = new Error(errorData.message);
    if ('code' in errorData) error.code = errorData.code;
    if ('status' in errorData) error.status = errorData.status;

    const errorType = classifyError(error);
    const recoverable = isRecoverableError(errorType);

    console.log(`Error: "${errorData.message}"`);
    console.log(`  Type: ${errorType}`);
    console.log(`  Recoverable: ${recoverable ? '✓ Yes' : '✗ No'}`);
    console.log();
  }
}

/**
 * Example 4: Manual retry with custom configuration
 */
async function example4_customRetryConfig() {
  console.log('\n=== Example 4: Custom Retry Configuration ===\n');

  const context: ErrorContext = {
    userId: 'user-789',
    phoneNumber: '+15555559999',
    messageSid: 'MM789',
    messageType: 'sms',
    contentType: 'text',
    timestamp: new Date(),
  };

  let attemptCount = 0;
  const operation = async () => {
    attemptCount++;
    console.log(`Attempt ${attemptCount}...`);

    if (attemptCount < 2) {
      const error: any = new Error('Service temporarily unavailable');
      error.status = 503;
      throw error;
    }

    return 'Success after retry!';
  };

  try {
    const result = await retryWithBackoff(
      operation,
      context,
      {
        maxAttempts: 5, // More attempts
        initialDelayMs: 50, // Faster initial delay
        maxDelayMs: 5000, // Lower max delay
        backoffMultiplier: 1.5, // Slower backoff
      }
    );

    console.log('✓ Operation succeeded:', result);
  } catch (error) {
    console.log('✗ Operation failed after all retries');
  }
}

/**
 * Example 5: Error logging with context
 */
async function example5_errorLogging() {
  console.log('\n=== Example 5: Error Logging with Context ===\n');

  const context: ErrorContext = {
    userId: 'user-999',
    phoneNumber: '+15555550000',
    messageSid: 'MM999',
    messageType: 'mms',
    contentType: 'video',
    mediaUrl: 'https://example.com/video.mp4',
    attemptNumber: 1,
    timestamp: new Date(),
    errorDetails: {
      fileSize: '10MB',
      duration: '5 minutes',
    },
  };

  const error = new Error('Media file too large');

  console.log('Logging error with comprehensive context...');
  await logErrorWithContext(error, context);
  console.log('✓ Error logged to console and database');
}

/**
 * Example 6: User notification
 */
async function example6_userNotification() {
  console.log('\n=== Example 6: User Notification ===\n');

  const context: ErrorContext = {
    userId: 'user-111',
    phoneNumber: '+15555551111',
    messageSid: 'MM111',
    messageType: 'mms',
    contentType: 'image',
    timestamp: new Date(),
  };

  console.log('Notifying user of processing failure...');
  await notifyUserOfFailure(
    context.userId,
    context.phoneNumber!,
    SMSErrorType.MEDIA_SIZE_EXCEEDED,
    context
  );
  console.log('✓ User notification queued');
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('SMS/MMS Error Handling Examples');
  console.log('================================\n');

  try {
    await example1_basicErrorHandling();
    await example2_unrecoverableError();
    await example3_errorClassification();
    await example4_customRetryConfig();
    await example5_errorLogging();
    await example6_userNotification();

    console.log('\n=== All Examples Complete ===\n');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export {
  example1_basicErrorHandling,
  example2_unrecoverableError,
  example3_errorClassification,
  example4_customRetryConfig,
  example5_errorLogging,
  example6_userNotification,
};
