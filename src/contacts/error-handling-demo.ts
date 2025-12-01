/**
 * Error Handling Demo
 *
 * Demonstrates the error handling and validation capabilities
 * of the onboarding system.
 */

import {
  validateCircleAssignment,
  validateBatchCircleAssignment,
  validateOnboardingInit,
  throwIfInvalid,
} from './onboarding-validation';
import {
  withOnboardingErrorHandling,
  withAISuggestionHandling,
  withConcurrencyHandling,
  executeBatchOperation,
  withTimeout,
} from './onboarding-error-handler';
import {
  InvalidCircleError,
  CircleAssignmentError,
  ContactNotFoundError,
} from './onboarding-errors';

/**
 * Demo 1: Input Validation
 */
async function demoInputValidation() {
  console.log('\n=== Demo 1: Input Validation ===\n');

  // Valid input
  const validInput = {
    contactId: '550e8400-e29b-41d4-a716-446655440000',
    circle: 'inner',
    confidence: 0.95,
  };

  const validResult = validateCircleAssignment(validInput);
  console.log('Valid input:', validResult.valid ? '✓ PASS' : '✗ FAIL');

  // Invalid circle
  const invalidCircle = {
    contactId: '550e8400-e29b-41d4-a716-446655440000',
    circle: 'invalid_circle',
  };

  const invalidResult = validateCircleAssignment(invalidCircle);
  console.log('Invalid circle:', !invalidResult.valid ? '✓ PASS' : '✗ FAIL');
  console.log('Errors:', invalidResult.errors);

  // Invalid UUID
  const invalidUUID = {
    contactId: 'not-a-uuid',
    circle: 'inner',
  };

  const uuidResult = validateCircleAssignment(invalidUUID);
  console.log('Invalid UUID:', !uuidResult.valid ? '✓ PASS' : '✗ FAIL');
  console.log('Errors:', uuidResult.errors);
}

/**
 * Demo 2: Batch Validation
 */
async function demoBatchValidation() {
  console.log('\n=== Demo 2: Batch Validation ===\n');

  // Valid batch
  const validBatch = [
    {
      contactId: '550e8400-e29b-41d4-a716-446655440000',
      circle: 'inner',
    },
    {
      contactId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      circle: 'close',
    },
  ];

  const validResult = validateBatchCircleAssignment(validBatch);
  console.log('Valid batch:', validResult.valid ? '✓ PASS' : '✗ FAIL');

  // Too many assignments
  const largeBatch = Array.from({ length: 101 }, (_, i) => ({
    contactId: '550e8400-e29b-41d4-a716-446655440000',
    circle: 'inner',
  }));

  const largeResult = validateBatchCircleAssignment(largeBatch);
  console.log('Too many assignments:', !largeResult.valid ? '✓ PASS' : '✗ FAIL');
  console.log('Errors:', largeResult.errors);

  // Mixed valid/invalid
  const mixedBatch = [
    {
      contactId: '550e8400-e29b-41d4-a716-446655440000',
      circle: 'inner',
    },
    {
      contactId: 'invalid-uuid',
      circle: 'close',
    },
  ];

  const mixedResult = validateBatchCircleAssignment(mixedBatch);
  console.log('Mixed batch:', !mixedResult.valid ? '✓ PASS' : '✗ FAIL');
  console.log('Errors:', mixedResult.errors);
}

/**
 * Demo 3: Error Handling with Fallback
 */
async function demoErrorHandlingWithFallback() {
  console.log('\n=== Demo 3: Error Handling with Fallback ===\n');

  // Successful operation
  const successOp = async () => {
    return { result: 'success' };
  };

  const successResult = await withOnboardingErrorHandling(successOp, 'demo_success');
  console.log('Success operation:', successResult);

  // Failed operation with fallback
  const failOp = async () => {
    throw new Error('Simulated failure');
  };

  const fallbackResult = await withOnboardingErrorHandling(failOp, 'demo_fail', {
    result: 'fallback',
  });
  console.log('Failed operation with fallback:', fallbackResult);
}

/**
 * Demo 4: AI Suggestion Graceful Degradation
 */
async function demoAIGracefulDegradation() {
  console.log('\n=== Demo 4: AI Suggestion Graceful Degradation ===\n');

  // Successful AI operation
  const successAI = async () => {
    return { circle: 'inner', confidence: 0.95 };
  };

  const successResult = await withAISuggestionHandling(successAI);
  console.log('AI success:', successResult);

  // Failed AI operation with fallback
  const failAI = async () => {
    throw new Error('AI service unavailable');
  };

  const fallbackResult = await withAISuggestionHandling(failAI, {
    circle: 'active',
    confidence: 0.5,
  });
  console.log('AI failure with fallback:', fallbackResult);

  // Failed AI operation without fallback
  const noFallbackResult = await withAISuggestionHandling(failAI);
  console.log('AI failure without fallback:', noFallbackResult);
}

/**
 * Demo 5: Batch Operation with Partial Success
 */
async function demoBatchOperation() {
  console.log('\n=== Demo 5: Batch Operation with Partial Success ===\n');

  const items = ['item1', 'item2', 'item3', 'item4', 'item5'];

  // Operation that fails on item3
  const operation = async (item: string) => {
    if (item === 'item3') {
      throw new Error(`Failed to process ${item}`);
    }
    return `processed-${item}`;
  };

  const result = await executeBatchOperation(items, operation, {
    continueOnError: true,
    maxConcurrent: 2,
  });

  console.log('Successful items:', result.successful.length);
  console.log('Failed items:', result.failed.length);
  console.log('Failed details:', result.failed);
}

/**
 * Demo 6: Timeout Handling
 */
async function demoTimeout() {
  console.log('\n=== Demo 6: Timeout Handling ===\n');

  // Fast operation
  const fastOp = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return 'completed';
  };

  try {
    const result = await withTimeout(fastOp, 1000, 'fast_operation');
    console.log('Fast operation:', result);
  } catch (error: any) {
    console.log('Fast operation failed:', error.message);
  }

  // Slow operation
  const slowOp = async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return 'completed';
  };

  try {
    const result = await withTimeout(slowOp, 500, 'slow_operation');
    console.log('Slow operation:', result);
  } catch (error: any) {
    console.log('Slow operation timed out:', error.message);
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
    await demoBatchValidation();
    await demoErrorHandlingWithFallback();
    await demoAIGracefulDegradation();
    await demoBatchOperation();
    await demoTimeout();

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
  demoBatchValidation,
  demoErrorHandlingWithFallback,
  demoAIGracefulDegradation,
  demoBatchOperation,
  demoTimeout,
  runAllDemos,
};
