/**
 * Message Processor Example Usage
 *
 * This file demonstrates how to use the message processor service
 * for processing SMS and MMS messages.
 */

import { messageProcessor, MessageProcessor } from './message-processor';
import { TwilioWebhookPayload } from '../api/routes/sms-webhook';

/**
 * Example 1: Process an SMS message
 */
async function processSMSExample() {
  console.log('=== Example 1: Processing SMS Message ===\n');

  const smsPayload: TwilioWebhookPayload = {
    MessageSid: 'SM1234567890abcdef',
    AccountSid: 'AC1234567890abcdef',
    From: '+15555551234',
    To: '+15555556789',
    Body: 'Met Sarah at the coffee shop today. She mentioned she loves hiking and photography. Planning to go on a hike next weekend.',
    NumMedia: '0',
  };

  const userId = 'user-123';

  try {
    const result = await messageProcessor.processMessage(smsPayload, userId);

    console.log('Processing Result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Enrichments Created: ${result.enrichmentIds.length}`);
    console.log(`  Processing Time: ${result.processingTime}ms`);
    console.log(`  Enrichment IDs: ${result.enrichmentIds.join(', ')}`);
  } catch (error) {
    console.error('Processing failed:', error);
  }
}

/**
 * Example 2: Process an MMS message with audio
 */
async function processAudioMMSExample() {
  console.log('\n=== Example 2: Processing Audio MMS Message ===\n');

  const audioPayload: TwilioWebhookPayload = {
    MessageSid: 'MM1234567890abcdef',
    AccountSid: 'AC1234567890abcdef',
    From: '+15555551234',
    To: '+15555556789',
    Body: 'Voice note about John',
    NumMedia: '1',
    MediaUrl0: 'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages/MM123/Media/ME123',
    MediaContentType0: 'audio/ogg',
  };

  const userId = 'user-123';

  try {
    const result = await messageProcessor.processMessage(audioPayload, userId);

    console.log('Processing Result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Enrichments Created: ${result.enrichmentIds.length}`);
    console.log(`  Processing Time: ${result.processingTime}ms`);

    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Processing failed:', error);
  }
}

/**
 * Example 3: Process an MMS message with image
 */
async function processImageMMSExample() {
  console.log('\n=== Example 3: Processing Image MMS Message ===\n');

  const imagePayload: TwilioWebhookPayload = {
    MessageSid: 'MM2234567890abcdef',
    AccountSid: 'AC1234567890abcdef',
    From: '+15555551234',
    To: '+15555556789',
    Body: 'Business card from networking event',
    NumMedia: '1',
    MediaUrl0: 'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages/MM223/Media/ME223',
    MediaContentType0: 'image/jpeg',
  };

  const userId = 'user-123';

  try {
    const result = await messageProcessor.processMessage(imagePayload, userId);

    console.log('Processing Result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Enrichments Created: ${result.enrichmentIds.length}`);
    console.log(`  Processing Time: ${result.processingTime}ms`);
  } catch (error) {
    console.error('Processing failed:', error);
  }
}

/**
 * Example 4: Process an MMS message with video
 */
async function processVideoMMSExample() {
  console.log('\n=== Example 4: Processing Video MMS Message ===\n');

  const videoPayload: TwilioWebhookPayload = {
    MessageSid: 'MM3234567890abcdef',
    AccountSid: 'AC1234567890abcdef',
    From: '+15555551234',
    To: '+15555556789',
    Body: 'Video from the party last night',
    NumMedia: '1',
    MediaUrl0: 'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages/MM323/Media/ME323',
    MediaContentType0: 'video/mp4',
  };

  const userId = 'user-123';

  try {
    const result = await messageProcessor.processMessage(videoPayload, userId);

    console.log('Processing Result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Enrichments Created: ${result.enrichmentIds.length}`);
    console.log(`  Processing Time: ${result.processingTime}ms`);
  } catch (error) {
    console.error('Processing failed:', error);
  }
}

/**
 * Example 5: Custom message processor with configuration
 */
async function customProcessorExample() {
  console.log('\n=== Example 5: Custom Message Processor ===\n');

  // Create custom processor with custom configuration
  const customProcessor = new MessageProcessor();

  const payload: TwilioWebhookPayload = {
    MessageSid: 'SM4234567890abcdef',
    AccountSid: 'AC1234567890abcdef',
    From: '+15555551234',
    To: '+15555556789',
    Body: 'Quick note about Mike - he moved to Seattle and started a new job at Amazon.',
    NumMedia: '0',
  };

  const userId = 'user-456';

  try {
    const result = await customProcessor.processMessage(payload, userId);

    console.log('Custom Processor Result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Enrichments: ${result.enrichmentIds.length}`);
    console.log(`  Time: ${result.processingTime}ms`);
  } catch (error) {
    console.error('Custom processing failed:', error);
  }
}


/**
 * Example 6: Error handling demonstration
 */
async function errorHandlingExample() {
  console.log('\n=== Example 6: Error Handling ===\n');

  // Example with invalid media URL (will trigger retry logic)
  const invalidPayload: TwilioWebhookPayload = {
    MessageSid: 'MM5234567890abcdef',
    AccountSid: 'AC1234567890abcdef',
    From: '+15555551234',
    To: '+15555556789',
    Body: 'Invalid media',
    NumMedia: '1',
    MediaUrl0: 'https://invalid-url.example.com/media',
    MediaContentType0: 'audio/ogg',
  };

  const userId = 'user-123';

  try {
    const result = await messageProcessor.processMessage(invalidPayload, userId);

    console.log('Error Handling Result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Error: ${result.error || 'None'}`);
    console.log(`  Processing Time: ${result.processingTime}ms`);
  } catch (error) {
    console.error('Expected error occurred:', (error as Error).message);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('Message Processor Examples\n');
  console.log('=' .repeat(60));

  try {
    await processSMSExample();
    await processAudioMMSExample();
    await processImageMMSExample();
    await processVideoMMSExample();
    await customProcessorExample();
    await errorHandlingExample();

    console.log('\n' + '='.repeat(60));
    console.log('All examples completed!');
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Export examples for testing
export {
  processSMSExample,
  processAudioMMSExample,
  processImageMMSExample,
  processVideoMMSExample,
  customProcessorExample,
  errorHandlingExample,
  runAllExamples,
};

// Run examples if executed directly
if (require.main === module) {
  runAllExamples()
    .then(() => {
      console.log('\nExamples finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nExamples failed:', error);
      process.exit(1);
    });
}