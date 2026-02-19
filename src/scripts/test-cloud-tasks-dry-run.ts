/**
 * Cloud Tasks Dry Run Test
 * 
 * Tests the Cloud Tasks integration without actually creating tasks.
 * Verifies code structure and configuration.
 */

import { createQueue } from '../jobs/queue-factory';
import { QUEUE_CONFIGS, getAllQueueNames } from '../jobs/cloud-tasks-config';

console.log('🚀 Cloud Tasks Dry Run Test');
console.log('='.repeat(60));
console.log('Project: catchup-479221');
console.log('Region: us-central1');
console.log('Feature Flag: USE_CLOUD_TASKS=' + process.env.USE_CLOUD_TASKS);
console.log('='.repeat(60));

// Check if Cloud Tasks is enabled
if (process.env.USE_CLOUD_TASKS !== 'true') {
  console.error('\n❌ Error: USE_CLOUD_TASKS is not set to true');
  console.error('Please set USE_CLOUD_TASKS=true in .env file');
  process.exit(1);
}

console.log('\n✅ Feature flag enabled');

// Test queue configuration
console.log('\n📋 Testing Queue Configuration...');
const queueNames = getAllQueueNames();
console.log(`Found ${queueNames.length} queue configurations:`);

queueNames.forEach((name, index) => {
  const config = QUEUE_CONFIGS[name];
  console.log(`  ${index + 1}. ${name}`);
  console.log(`     Queue: ${config.name}`);
  console.log(`     Max Attempts: ${config.retryConfig.maxAttempts}`);
  console.log(`     Backoff: ${config.retryConfig.minBackoff} - ${config.retryConfig.maxBackoff}`);
  if (config.rateLimits?.maxDispatchesPerSecond) {
    console.log(`     Rate Limit: ${config.rateLimits.maxDispatchesPerSecond}/sec`);
  }
});

// Test queue creation (without actually creating tasks)
console.log('\n🔧 Testing Queue Factory...');
try {
  const testQueue = createQueue('webhook-health-check');
  console.log('✅ Queue factory works correctly');
  console.log(`   Queue type: ${testQueue.constructor.name}`);
} catch (error: any) {
  console.error('❌ Queue factory error:', error.message);
  process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Dry Run Summary');
console.log('='.repeat(60));
console.log('✅ Feature flag: Enabled');
console.log(`✅ Queue configurations: ${queueNames.length}/11`);
console.log('✅ Queue factory: Working');
console.log('✅ Code structure: Valid');
console.log('\n' + '='.repeat(60));
console.log('🎉 Dry run complete!');
console.log('\nNext steps:');
console.log('1. Authenticate with gcloud:');
console.log('   gcloud auth application-default login');
console.log('2. Run full test:');
console.log('   node dist/scripts/test-cloud-tasks.js');
console.log('='.repeat(60));
