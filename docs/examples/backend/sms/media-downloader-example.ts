/**
 * Media Downloader Usage Examples
 * 
 * This file demonstrates various ways to use the MediaDownloader service
 * for downloading and managing media files from Twilio.
 */

import { mediaDownloader, MediaDownloader } from './media-downloader';

/**
 * Example 1: Basic media download to memory
 * Use this for small files (< 5MB) that need immediate processing
 */
async function example1_BasicDownload() {
  console.log('Example 1: Basic Download\n');

  const twilioMediaUrl = 'https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages/MMxxx/Media/MEyyy';
  const authToken = process.env.TWILIO_AUTH_TOKEN || 'your-auth-token';

  try {
    const result = await mediaDownloader.downloadMedia(twilioMediaUrl, authToken);
    
    console.log('✓ Download successful');
    console.log(`  Size: ${result.size} bytes`);
    console.log(`  Content-Type: ${result.contentType}`);
    console.log(`  Buffer length: ${result.buffer.length}`);
    
    // Process the buffer immediately
    // e.g., send to AI service, save to database, etc.
    
  } catch (error) {
    console.error('✗ Download failed:', (error as Error).message);
  }
}

/**
 * Example 2: Download to file with streaming
 * Use this for larger files or when memory is constrained
 */
async function example2_StreamingDownload() {
  console.log('\nExample 2: Streaming Download\n');

  const twilioMediaUrl = 'https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages/MMxxx/Media/MEyyy';
  const authToken = process.env.TWILIO_AUTH_TOKEN || 'your-auth-token';

  try {
    const result = await mediaDownloader.downloadMediaToFile(twilioMediaUrl, authToken);
    
    console.log('✓ Download successful');
    console.log(`  Saved to: ${result.tempFilePath}`);
    console.log(`  Size: ${result.size} bytes`);
    console.log(`  Content-Type: ${result.contentType}`);
    
    // Process the file
    // e.g., read in chunks, send to AI service, etc.
    
    // Clean up when done
    if (result.tempFilePath) {
      await mediaDownloader.deleteTempFile(result.tempFilePath);
      console.log('✓ Temp file cleaned up');
    }
    
  } catch (error) {
    console.error('✗ Download failed:', (error as Error).message);
  }
}

/**
 * Example 3: Size validation before download
 * Check if a file is within acceptable size limits
 */
async function example3_SizeValidation() {
  console.log('\nExample 3: Size Validation\n');

  // Validate different sizes
  const sizes = [
    { bytes: 1024 * 1024, label: '1MB' },
    { bytes: 3 * 1024 * 1024, label: '3MB' },
    { bytes: 5 * 1024 * 1024, label: '5MB (exact limit)' },
    { bytes: 6 * 1024 * 1024, label: '6MB (exceeds limit)' },
  ];

  sizes.forEach(({ bytes, label }) => {
    const isValid = mediaDownloader.validateMediaSize(bytes);
    console.log(`  ${label}: ${isValid ? '✓ Valid' : '✗ Too large'}`);
  });

  // Custom size limit
  const largeFile = 8 * 1024 * 1024; // 8MB
  const isValidWith10MBLimit = mediaDownloader.validateMediaSize(largeFile, 10);
  console.log(`  8MB with 10MB limit: ${isValidWith10MBLimit ? '✓ Valid' : '✗ Too large'}`);
}

/**
 * Example 4: Error handling for different scenarios
 */
async function example4_ErrorHandling() {
  console.log('\nExample 4: Error Handling\n');

  const scenarios = [
    {
      name: 'File too large',
      url: 'https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages/MMxxx/Media/MElarge',
      expectedError: 'exceeds 5MB limit'
    },
    {
      name: 'Invalid URL',
      url: 'https://invalid-url.com/media',
      expectedError: 'HTTP'
    },
    {
      name: 'Timeout',
      url: 'https://very-slow-server.com/media',
      expectedError: 'timeout'
    }
  ];

  for (const scenario of scenarios) {
    try {
      await mediaDownloader.downloadMedia(scenario.url, 'test-token');
      console.log(`  ${scenario.name}: ✗ Should have failed`);
    } catch (error) {
      const message = (error as Error).message;
      const matched = message.includes(scenario.expectedError);
      console.log(`  ${scenario.name}: ${matched ? '✓' : '✗'} ${message}`);
    }
  }
}

/**
 * Example 5: Cleanup operations
 */
async function example5_Cleanup() {
  console.log('\nExample 5: Cleanup Operations\n');

  try {
    // Get current temp directory size
    const sizeBefore = await mediaDownloader.getTempDirSize();
    console.log(`  Temp directory size: ${sizeBefore} bytes`);

    // Clean up files older than 30 days
    const deletedCount = await mediaDownloader.cleanupTempFiles(30);
    console.log(`  ✓ Deleted ${deletedCount} old files`);

    // Get size after cleanup
    const sizeAfter = await mediaDownloader.getTempDirSize();
    console.log(`  Temp directory size after cleanup: ${sizeAfter} bytes`);
    console.log(`  Space freed: ${sizeBefore - sizeAfter} bytes`);

  } catch (error) {
    console.error('✗ Cleanup failed:', (error as Error).message);
  }
}

/**
 * Example 6: Custom configuration
 */
async function example6_CustomConfiguration() {
  console.log('\nExample 6: Custom Configuration\n');

  // Create downloader with custom settings
  const customDownloader = new MediaDownloader({
    maxSizeMB: 10,           // Allow up to 10MB
    timeoutMs: 60000,        // 60 second timeout
    tempDir: './custom-temp' // Custom temp directory
  });

  console.log('✓ Custom downloader created');
  console.log('  Max size: 10MB');
  console.log('  Timeout: 60 seconds');
  console.log('  Temp dir: ./custom-temp');

  // Use custom downloader
  const largeFile = 8 * 1024 * 1024; // 8MB
  const isValid = customDownloader.validateMediaSize(largeFile);
  console.log(`  8MB file validation: ${isValid ? '✓ Valid' : '✗ Too large'}`);
}

/**
 * Example 7: Processing workflow for MMS messages
 */
async function example7_MMSWorkflow() {
  console.log('\nExample 7: Complete MMS Processing Workflow\n');

  const twilioWebhookPayload = {
    MessageSid: 'MMxxx',
    From: '+15555551234',
    NumMedia: '1',
    MediaUrl0: 'https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages/MMxxx/Media/MEyyy',
    MediaContentType0: 'image/jpeg'
  };

  const authToken = process.env.TWILIO_AUTH_TOKEN || 'your-auth-token';

  try {
    console.log('Step 1: Download media');
    const result = await mediaDownloader.downloadMedia(
      twilioWebhookPayload.MediaUrl0,
      authToken
    );
    console.log(`  ✓ Downloaded ${result.size} bytes`);

    console.log('\nStep 2: Validate size');
    const isValid = mediaDownloader.validateMediaSize(result.buffer);
    if (!isValid) {
      throw new Error('File exceeds size limit');
    }
    console.log('  ✓ Size validation passed');

    console.log('\nStep 3: Process media');
    // Here you would:
    // - Send to AI service for analysis
    // - Extract enrichment data
    // - Store in database
    console.log('  ✓ Media processed (simulated)');

    console.log('\nStep 4: Cleanup');
    // No temp file to clean up since we used downloadMedia()
    console.log('  ✓ No cleanup needed (in-memory download)');

    console.log('\n✓ Workflow complete');

  } catch (error) {
    console.error('✗ Workflow failed:', (error as Error).message);
  }
}

/**
 * Example 8: Scheduled cleanup job
 */
function example8_ScheduledCleanup() {
  console.log('\nExample 8: Scheduled Cleanup Job\n');

  // Run cleanup daily at midnight
  const cleanupJob = setInterval(async () => {
    try {
      const deletedCount = await mediaDownloader.cleanupTempFiles(30);
      console.log(`[${new Date().toISOString()}] Cleaned up ${deletedCount} old files`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Cleanup failed:`, (error as Error).message);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours

  console.log('✓ Cleanup job scheduled (runs daily)');
  console.log('  Deletes files older than 30 days');

  // To stop the job:
  // clearInterval(cleanupJob);

  return cleanupJob;
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('Media Downloader Service - Usage Examples');
  console.log('='.repeat(60));

  // Note: Examples 1, 2, 4, and 7 require actual Twilio credentials
  // and will fail without them. Uncomment to test with real credentials.

  // await example1_BasicDownload();
  // await example2_StreamingDownload();
  await example3_SizeValidation();
  // await example4_ErrorHandling();
  await example5_Cleanup();
  await example6_CustomConfiguration();
  // await example7_MMSWorkflow();
  
  // Example 8 starts a background job, so we don't run it by default
  // const cleanupJob = example8_ScheduledCleanup();

  console.log('\n' + '='.repeat(60));
  console.log('Examples complete!');
  console.log('='.repeat(60));
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

// Export examples for use in other files
export {
  example1_BasicDownload,
  example2_StreamingDownload,
  example3_SizeValidation,
  example4_ErrorHandling,
  example5_Cleanup,
  example6_CustomConfiguration,
  example7_MMSWorkflow,
  example8_ScheduledCleanup
};
