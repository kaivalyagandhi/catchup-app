/**
 * Error Handling Demo
 *
 * Demonstrates the error handling and validation capabilities
 * of the onboarding system.
 */

import {
  validateCircleAssignment,
  validateOnboardingState,
  showValidationErrors,
} from './onboarding-validation';
import {
  classifyError,
  handleIntegrationError,
  handleAIServiceError,
  withRetry,
} from './onboarding-error-handler';

/**
 * Demo 1: Input Validation
 */
async function demoInputValidation() {
  console.log('\n=== Demo 1: Input Validation ===\n');

  // Valid input
  const validResult = validateCircleAssignment(123, 'inner');
  console.log('Valid input:', validResult.isValid ? '✓ PASS' : '✗ FAIL');

  // Invalid circle
  const invalidResult = validateCircleAssignment(123, 'invalid_circle');
  console.log('Invalid circle:', !invalidResult.isValid ? '✓ PASS' : '✗ FAIL');
  console.log('Errors:', invalidResult.errors);

  // Invalid contact ID
  const invalidIdResult = validateCircleAssignment(-1, 'inner');
  console.log('Invalid contact ID:', !invalidIdResult.isValid ? '✓ PASS' : '✗ FAIL');
  console.log('Errors:', invalidIdResult.errors);
}

/**
 * Demo 2: State Validation
 */
async function demoStateValidation() {
  console.log('\n=== Demo 2: State Validation ===\n');

  // Valid state
  const validState = {
    userId: 'user123',
    currentStep: 1 as 1 | 2 | 3,
    isComplete: false,
  };

  const validResult = validateOnboardingState(validState);
  console.log('Valid state:', validResult.isValid ? '✓ PASS' : '✗ FAIL');

  // Invalid state - missing userId
  const invalidState = {
    currentStep: 1 as 1 | 2 | 3,
  };

  const invalidResult = validateOnboardingState(invalidState);
  console.log('Invalid state (missing userId):', !invalidResult.isValid ? '✓ PASS' : '✗ FAIL');
  console.log('Errors:', invalidResult.errors);

  // Invalid state - invalid currentStep
  const invalidStepState = {
    userId: 'user123',
    currentStep: 99 as any,
  };

  const stepResult = validateOnboardingState(invalidStepState);
  console.log('Invalid step:', !stepResult.isValid ? '✓ PASS' : '✗ FAIL');
  console.log('Errors:', stepResult.errors);
}

/**
 * Demo 3: Error Classification
 */
async function demoErrorClassification() {
  console.log('\n=== Demo 3: Error Classification ===\n');

  // Network error - retryable
  const networkError = new Error('Failed to fetch');
  const networkClassified = classifyError(networkError);
  console.log('Network error:', networkClassified.isRetryable ? 'RETRYABLE' : 'NOT RETRYABLE');
  console.log('Message:', networkClassified.userMessage);

  // Timeout error - retryable
  const timeoutError = new Error('Request timed out');
  const timeoutClassified = classifyError(timeoutError);
  console.log('\nTimeout error:', timeoutClassified.isRetryable ? 'RETRYABLE' : 'NOT RETRYABLE');
  console.log('Message:', timeoutClassified.userMessage);

  // Auth error - not retryable
  const authError = new Error('401 Unauthorized');
  const authClassified = classifyError(authError);
  console.log('\nAuth error:', authClassified.isRetryable ? 'RETRYABLE' : 'NOT RETRYABLE');
  console.log('Message:', authClassified.userMessage);
}

/**
 * Demo 4: AI Service Error Handling
 */
async function demoAIErrorHandling() {
  console.log('\n=== Demo 4: AI Service Error Handling ===\n');

  // AI timeout error
  const aiTimeout = new Error('AI service timeout');
  const timeoutResult = handleAIServiceError(aiTimeout);
  console.log('AI timeout:', timeoutResult.isRetryable ? 'RETRYABLE' : 'NOT RETRYABLE');
  console.log('Message:', timeoutResult.userMessage);

  // AI service error
  const aiError = new Error('AI service unavailable');
  const errorResult = handleAIServiceError(aiError);
  console.log('\nAI error:', errorResult.isRetryable ? 'RETRYABLE' : 'NOT RETRYABLE');
  console.log('Message:', errorResult.userMessage);
}

/**
 * Demo 5: Integration Error Handling
 */
async function demoIntegrationErrors() {
  console.log('\n=== Demo 5: Integration Error Handling ===\n');

  // OAuth popup error
  const popupError = new Error('popup blocked');
  const popupResult = handleIntegrationError('google-calendar', popupError);
  console.log('Popup error:', popupResult.isRetryable ? 'RETRYABLE' : 'NOT RETRYABLE');
  console.log('Message:', popupResult.userMessage);

  // Permission error
  const permError = new Error('permission denied');
  const permResult = handleIntegrationError('google-contacts', permError);
  console.log('\nPermission error:', permResult.isRetryable ? 'RETRYABLE' : 'NOT RETRYABLE');
  console.log('Message:', permResult.userMessage);
}

/**
 * Demo 6: Retry Mechanism
 */
async function demoRetry() {
  console.log('\n=== Demo 6: Retry Mechanism ===\n');

  let attempts = 0;

  // Operation that succeeds on 3rd attempt
  const flakeyOp = async () => {
    attempts++;
    if (attempts < 3) {
      throw new Error('Network error');
    }
    return 'success';
  };

  try {
    const result = await withRetry(flakeyOp, { maxRetries: 3, retryDelay: 100 });
    console.log('Flakey operation succeeded after', attempts, 'attempts');
    console.log('Result:', result);
  } catch (error: any) {
    console.log('Operation failed:', error.message);
  }
}

/**
 * Run all demos
 */
async function runAllDemos() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Contact Onboarding Error Handling Demo               ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    await demoInputValidation();
    await demoStateValidation();
    await demoErrorClassification();
    await demoAIErrorHandling();
    await demoIntegrationErrors();
    await demoRetry();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  All demos completed successfully!                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
  } catch (error: any) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
  }
}

// Run demos if executed directly
if (require.main === module) {
  runAllDemos();
}

export {
  demoInputValidation,
  demoStateValidation,
  demoErrorClassification,
  demoAIErrorHandling,
  demoIntegrationErrors,
  demoRetry,
  runAllDemos,
};
