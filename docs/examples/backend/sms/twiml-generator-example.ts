/**
 * TwiML Generator Usage Examples
 *
 * Demonstrates how to use the TwiML generator for various scenarios
 */

import {
  generateSuccessConfirmation,
  generateErrorMessage,
  generateRateLimitMessage,
  generateUnverifiedMessage,
  generateProcessingMessage,
  generateInvalidMediaMessage,
  generateMediaTooLargeMessage,
  generateTwiML,
  TwiMLMessageType,
  escapeXML,
  validateTwiML,
} from './twiml-generator';

/**
 * Example 1: Success confirmation
 */
function exampleSuccessConfirmation() {
  console.log('=== Success Confirmation ===');
  const twiml = generateSuccessConfirmation();
  console.log(twiml);
  console.log();
}

/**
 * Example 2: Custom success message
 */
function exampleCustomSuccess() {
  console.log('=== Custom Success Message ===');
  const twiml = generateSuccessConfirmation(
    'Thanks! We extracted 3 enrichments from your message.'
  );
  console.log(twiml);
  console.log();
}

/**
 * Example 3: Rate limit message
 */
function exampleRateLimit() {
  console.log('=== Rate Limit Message ===');
  const resetTime = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes from now
  const twiml = generateRateLimitMessage(resetTime);
  console.log(twiml);
  console.log();
}

/**
 * Example 4: Unverified phone number
 */
function exampleUnverified() {
  console.log('=== Unverified Phone Number ===');
  const twiml = generateUnverifiedMessage();
  console.log(twiml);
  console.log();
}

/**
 * Example 5: Error message
 */
function exampleError() {
  console.log('=== Error Message ===');
  const twiml = generateErrorMessage('We encountered a temporary issue. Please try again.');
  console.log(twiml);
  console.log();
}

/**
 * Example 6: Invalid media type
 */
function exampleInvalidMedia() {
  console.log('=== Invalid Media Type ===');
  const twiml = generateInvalidMediaMessage();
  console.log(twiml);
  console.log();
}

/**
 * Example 7: Media too large
 */
function exampleMediaTooLarge() {
  console.log('=== Media Too Large ===');
  const twiml = generateMediaTooLargeMessage();
  console.log(twiml);
  console.log();
}

/**
 * Example 8: XML escaping
 */
function exampleXMLEscaping() {
  console.log('=== XML Escaping ===');
  const unsafeText = 'Contact "John & Jane" <important>';
  const escapedText = escapeXML(unsafeText);
  console.log('Original:', unsafeText);
  console.log('Escaped:', escapedText);

  const twiml = generateTwiML({
    messageType: TwiMLMessageType.SUCCESS,
    customMessage: unsafeText,
  });
  console.log('TwiML:', twiml);
  console.log();
}

/**
 * Example 9: TwiML validation
 */
function exampleValidation() {
  console.log('=== TwiML Validation ===');

  const validTwiml = generateSuccessConfirmation();
  console.log('Valid TwiML:', validateTwiML(validTwiml));

  const invalidTwiml = '<Response><Message>Missing closing tag';
  console.log('Invalid TwiML:', validateTwiML(invalidTwiml));
  console.log();
}

/**
 * Example 10: Processing message
 */
function exampleProcessing() {
  console.log('=== Processing Message ===');
  const twiml = generateProcessingMessage();
  console.log(twiml);
  console.log();
}

/**
 * Example 11: Custom rate limit message
 */
function exampleCustomRateLimit() {
  console.log('=== Custom Rate Limit Message ===');
  const resetTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
  const twiml = generateRateLimitMessage(
    resetTime,
    'Slow down! You can send more messages in 2 hours.'
  );
  console.log(twiml);
  console.log();
}

/**
 * Run all examples
 */
function runAllExamples() {
  console.log('TwiML Generator Examples\n');
  console.log('='.repeat(60));
  console.log();

  exampleSuccessConfirmation();
  exampleCustomSuccess();
  exampleRateLimit();
  exampleUnverified();
  exampleError();
  exampleInvalidMedia();
  exampleMediaTooLarge();
  exampleXMLEscaping();
  exampleValidation();
  exampleProcessing();
  exampleCustomRateLimit();

  console.log('='.repeat(60));
  console.log('All examples completed!');
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  exampleSuccessConfirmation,
  exampleCustomSuccess,
  exampleRateLimit,
  exampleUnverified,
  exampleError,
  exampleInvalidMedia,
  exampleMediaTooLarge,
  exampleXMLEscaping,
  exampleValidation,
  exampleProcessing,
  exampleCustomRateLimit,
  runAllExamples,
};