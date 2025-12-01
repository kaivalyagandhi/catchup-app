/**
 * AI Processor Example Usage
 *
 * Demonstrates how to use the AI processor for different content types.
 */

import { aiProcessor } from './ai-processor';
import * as fs from 'fs';

/**
 * Example: Process text message
 */
async function processTextExample() {
  console.log('\n=== Text Processing Example ===');

  const text = 'Just met Sarah at the coffee shop. She loves hiking and photography. Lives in Seattle.';

  try {
    const enrichments = await aiProcessor.extractFromText(text);
    console.log('Extracted enrichments:', JSON.stringify(enrichments, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example: Process audio file
 */
async function processAudioExample() {
  console.log('\n=== Audio Processing Example ===');

  // In a real scenario, this would be downloaded from Twilio
  // For this example, we'll simulate with a buffer
  const audioBuffer = Buffer.from('fake-audio-data');

  try {
    const result = await aiProcessor.extractFromAudio(audioBuffer);
    console.log('Transcript:', result.transcript);
    console.log('Extracted enrichments:', JSON.stringify(result.enrichments, null, 2));
    console.log('Processing time:', result.processingTime, 'ms');
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example: Process image file
 */
async function processImageExample() {
  console.log('\n=== Image Processing Example ===');

  // In a real scenario, this would be downloaded from Twilio
  // For this example, we'll simulate with a buffer
  const imageBuffer = Buffer.from('fake-image-data');

  try {
    const enrichments = await aiProcessor.extractFromImage(imageBuffer);
    console.log('Extracted enrichments:', JSON.stringify(enrichments, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example: Process video file
 */
async function processVideoExample() {
  console.log('\n=== Video Processing Example ===');

  // In a real scenario, this would be downloaded from Twilio
  // For this example, we'll simulate with a buffer
  const videoBuffer = Buffer.from('fake-video-data');

  try {
    const result = await aiProcessor.extractFromVideo(videoBuffer);
    console.log('Extracted enrichments:', JSON.stringify(result.enrichments, null, 2));
    console.log('Processing time:', result.processingTime, 'ms');
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example: Process content with automatic type detection
 */
async function processContentExample() {
  console.log('\n=== Content Processing Example (Auto-detect) ===');

  const examples = [
    { content: 'Text message about John', type: 'text/plain' },
    { content: Buffer.from('audio-data'), type: 'audio/ogg' },
    { content: Buffer.from('image-data'), type: 'image/jpeg' },
    { content: Buffer.from('video-data'), type: 'video/mp4' },
  ];

  for (const example of examples) {
    try {
      console.log(`\nProcessing ${example.type}...`);
      const result = await aiProcessor.processContent(example.content, example.type);
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('AI Processor Examples');
  console.log('=====================');

  // Note: These examples will fail without proper Google Cloud credentials
  // and actual media files. They are for demonstration purposes.

  await processTextExample();
  // await processAudioExample();
  // await processImageExample();
  // await processVideoExample();
  // await processContentExample();

  console.log('\n=== Examples Complete ===');
}

// Run examples if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}
