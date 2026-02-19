/**
 * Cloud Tasks Testing Script
 * 
 * Tests all 11 job types to verify Cloud Tasks integration works correctly.
 * Run with: npm run build && node dist/scripts/test-cloud-tasks.js
 */

import { createQueue } from '../jobs/queue-factory';

// Job types in order of risk (low → high)
const JOB_TYPES = {
  nonCritical: [
    'webhook-health-check',
    'notification-reminder',
    'token-health-reminder'
  ],
  mediumRisk: [
    'adaptive-sync',
    'webhook-renewal',
    'suggestion-regeneration',
    'batch-notifications',
    'suggestion-generation'
  ],
  critical: [
    'token-refresh',
    'calendar-sync',
    'google-contacts-sync'
  ]
};

interface TestResult {
  jobType: string;
  success: boolean;
  taskName?: string;
  error?: string;
  duration: number;
}

async function testJobType(jobType: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`\n🧪 Testing: ${jobType}`);
    
    const queue = createQueue(jobType);
    const taskName = await queue.add(jobType, {
      test: true,
      timestamp: Date.now(),
      source: 'test-script'
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Task created: ${taskName} (${duration}ms)`);
    
    return {
      jobType,
      success: true,
      taskName: taskName as string,
      duration
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error: ${error.message}`);
    
    return {
      jobType,
      success: false,
      error: error.message,
      duration
    };
  }
}

async function testCategory(category: string, jobTypes: string[]): Promise<TestResult[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Testing ${category} Queues`);
  console.log('='.repeat(60));
  
  const results: TestResult[] = [];
  
  for (const jobType of jobTypes) {
    const result = await testJobType(jobType);
    results.push(result);
    
    // Wait 2 seconds between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}

async function testIdempotency(jobType: string): Promise<boolean> {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🔄 Testing Idempotency');
  console.log('='.repeat(60));
  
  try {
    const queue = createQueue(jobType);
    const testData = {
      test: true,
      timestamp: Date.now(),
      source: 'idempotency-test'
    };
    
    // Create first task
    console.log('\n1️⃣ Creating first task...');
    const task1 = await queue.add(jobType, testData);
    console.log(`✅ First task created: ${task1}`);
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create duplicate task (same data)
    console.log('\n2️⃣ Creating duplicate task (same data)...');
    const task2 = await queue.add(jobType, testData);
    console.log(`✅ Duplicate task created: ${task2}`);
    
    console.log('\n📝 Note: Check application logs for "Duplicate request detected" message');
    console.log('Expected: Second request should be marked as duplicate by idempotency system');
    
    return true;
    
  } catch (error: any) {
    console.error(`❌ Idempotency test failed: ${error.message}`);
    return false;
  }
}

async function printSummary(allResults: TestResult[]): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const successful = allResults.filter(r => r.success);
  const failed = allResults.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${allResults.length}`);
  console.log(`❌ Failed: ${failed.length}/${allResults.length}`);
  
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const maxDuration = Math.max(...successful.map(r => r.duration));
    const minDuration = Math.min(...successful.map(r => r.duration));
    
    console.log(`\n⏱️  Performance Metrics:`);
    console.log(`   Average task creation: ${avgDuration.toFixed(0)}ms`);
    console.log(`   Min: ${minDuration}ms`);
    console.log(`   Max: ${maxDuration}ms`);
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    failed.forEach(r => {
      console.log(`   - ${r.jobType}: ${r.error}`);
    });
  }
  
  console.log(`\n${'='.repeat(60)}`);
  
  if (failed.length === 0) {
    console.log('🎉 All tests passed!');
    console.log('✅ Ready for staging deployment');
  } else {
    console.log('⚠️  Some tests failed');
    console.log('❌ Review errors and fix before proceeding');
  }
  
  console.log('='.repeat(60));
}

async function main() {
  console.log('🚀 Cloud Tasks Testing Script');
  console.log('='.repeat(60));
  console.log('Project: catchup-479221');
  console.log('Region: us-central1');
  console.log('Feature Flag: USE_CLOUD_TASKS=true');
  console.log('='.repeat(60));
  
  // Check if Cloud Tasks is enabled
  if (process.env.USE_CLOUD_TASKS !== 'true') {
    console.error('\n❌ Error: USE_CLOUD_TASKS is not set to true');
    console.error('Please set USE_CLOUD_TASKS=true in .env file');
    process.exit(1);
  }
  
  const allResults: TestResult[] = [];
  
  try {
    // Test non-critical queues first
    const nonCriticalResults = await testCategory('Non-Critical', JOB_TYPES.nonCritical);
    allResults.push(...nonCriticalResults);
    
    // Test idempotency with a non-critical queue
    await testIdempotency('webhook-health-check');
    
    // Test medium-risk queues
    const mediumRiskResults = await testCategory('Medium-Risk', JOB_TYPES.mediumRisk);
    allResults.push(...mediumRiskResults);
    
    // Test critical queues last
    const criticalResults = await testCategory('Critical', JOB_TYPES.critical);
    allResults.push(...criticalResults);
    
    // Print summary
    await printSummary(allResults);
    
    // Exit with appropriate code
    const failed = allResults.filter(r => !r.success);
    process.exit(failed.length > 0 ? 1 : 0);
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
