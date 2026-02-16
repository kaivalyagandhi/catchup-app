#!/usr/bin/env ts-node
/**
 * BullMQ Test Script
 * 
 * Tests all 11 BullMQ queues to verify they can enqueue and process jobs.
 * 
 * Usage:
 *   npm run build
 *   USE_BULLMQ=true ts-node scripts/test-bullmq.ts
 */

import { enqueueJob, QUEUE_NAMES } from '../src/jobs/bullmq-queue';

async function testAllQueues(): Promise<void> {
  console.log('🧪 Testing all BullMQ queues...\n');
  
  const results: { queue: string; success: boolean; jobId?: string; error?: string }[] = [];
  
  // Test each queue
  for (const [name, queueName] of Object.entries(QUEUE_NAMES)) {
    try {
      console.log(`Testing ${queueName}...`);
      
      const job = await enqueueJob(queueName, {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'test-script'
      });
      
      console.log(`  ✅ Job ${job.id} enqueued to ${queueName}`);
      results.push({ queue: queueName, success: true, jobId: job.id || 'unknown' });
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Failed to enqueue to ${queueName}:`, errorMsg);
      results.push({ queue: queueName, success: false, error: errorMsg });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total Queues: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Queues:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.queue}: ${r.error}`);
    });
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Check application logs for job processing');
  console.log('2. Verify Upstash dashboard shows 1-3 connections');
  console.log('3. Monitor for any errors in the next few minutes');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
testAllQueues().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
