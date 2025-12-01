/**
 * Load Testing Script for SMS/MMS Enrichment
 * 
 * Tests the system under load with 100+ concurrent messages
 * to verify performance optimizations.
 * 
 * Requirements: All (Performance testing)
 */

import http from 'http';
import crypto from 'crypto';

interface LoadTestConfig {
  targetUrl: string;
  authToken: string;
  phoneNumbers: string[];
  concurrentMessages: number;
  messageDelay: number; // ms between batches
  testDuration: number; // seconds
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  responseTimes: number[];
  errors: Array<{ error: string; count: number }>;
}

/**
 * Generate Twilio signature for webhook validation
 */
function generateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, any>
): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      return acc + key + params[key];
    }, url);

  const hmac = crypto.createHmac('sha1', authToken);
  hmac.update(data);
  return hmac.digest('base64');
}

/**
 * Generate random SMS message payload
 */
function generateSMSPayload(phoneNumber: string): any {
  const messages = [
    'Had lunch with Sarah today. She mentioned she loves photography.',
    'Met John at the coffee shop. He is moving to Seattle next month.',
    'Ran into Mike at the gym. He is training for a marathon.',
    'Dinner with Emily. She got promoted to senior engineer!',
    'Caught up with Alex. He is learning to play guitar.',
  ];

  return {
    MessageSid: `SM${crypto.randomBytes(16).toString('hex')}`,
    AccountSid: process.env.TWILIO_ACCOUNT_SID || 'ACtest',
    From: phoneNumber,
    To: process.env.TWILIO_PHONE_NUMBER || '+15555556789',
    Body: messages[Math.floor(Math.random() * messages.length)],
    NumMedia: '0',
  };
}

/**
 * Generate random MMS message payload with audio
 */
function generateMMSPayload(phoneNumber: string): any {
  return {
    MessageSid: `MM${crypto.randomBytes(16).toString('hex')}`,
    AccountSid: process.env.TWILIO_ACCOUNT_SID || 'ACtest',
    From: phoneNumber,
    To: process.env.TWILIO_PHONE_NUMBER || '+15555556789',
    Body: 'Voice note about my friend',
    NumMedia: '1',
    MediaUrl0: 'https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages/MMtest/Media/MEtest',
    MediaContentType0: 'audio/ogg',
  };
}

/**
 * Send a single webhook request
 */
async function sendWebhookRequest(
  config: LoadTestConfig,
  payload: any
): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const url = new URL(config.targetUrl);
    const signature = generateTwilioSignature(config.authToken, config.targetUrl, payload);

    // Convert payload to URL-encoded form data
    const formData = Object.keys(payload)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(payload[key])}`)
      .join('&');

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formData),
        'X-Twilio-Signature': signature,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        if (res.statusCode === 200) {
          resolve({ success: true, responseTime });
        } else if (res.statusCode === 429) {
          resolve({
            success: false,
            responseTime,
            error: 'Rate limited',
          });
        } else {
          resolve({
            success: false,
            responseTime,
            error: `HTTP ${res.statusCode}`,
          });
        }
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        responseTime,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        responseTime,
        error: 'Timeout',
      });
    });

    req.setTimeout(10000); // 10 second timeout
    req.write(formData);
    req.end();
  });
}

/**
 * Run load test
 */
export async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  console.log('Starting load test...');
  console.log(`Target: ${config.targetUrl}`);
  console.log(`Concurrent messages: ${config.concurrentMessages}`);
  console.log(`Test duration: ${config.testDuration}s`);
  console.log(`Phone numbers: ${config.phoneNumbers.length}`);

  const result: LoadTestResult = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitedRequests: 0,
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    responseTimes: [],
    errors: [],
  };

  const startTime = Date.now();
  const endTime = startTime + config.testDuration * 1000;

  while (Date.now() < endTime) {
    // Send batch of concurrent requests
    const promises: Promise<any>[] = [];

    for (let i = 0; i < config.concurrentMessages; i++) {
      const phoneNumber =
        config.phoneNumbers[Math.floor(Math.random() * config.phoneNumbers.length)];

      // 70% SMS, 30% MMS
      const payload =
        Math.random() < 0.7
          ? generateSMSPayload(phoneNumber)
          : generateMMSPayload(phoneNumber);

      promises.push(sendWebhookRequest(config, payload));
    }

    // Wait for all requests in batch to complete
    const results = await Promise.all(promises);

    // Process results
    for (const res of results) {
      result.totalRequests++;
      result.responseTimes.push(res.responseTime);

      if (res.success) {
        result.successfulRequests++;
      } else {
        result.failedRequests++;

        if (res.error === 'Rate limited') {
          result.rateLimitedRequests++;
        }

        // Track error types
        const existingError = result.errors.find((e) => e.error === res.error);
        if (existingError) {
          existingError.count++;
        } else {
          result.errors.push({ error: res.error || 'Unknown', count: 1 });
        }
      }

      // Update min/max response times
      result.minResponseTime = Math.min(result.minResponseTime, res.responseTime);
      result.maxResponseTime = Math.max(result.maxResponseTime, res.responseTime);
    }

    // Log progress
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(
      `[${elapsed}s] Sent ${result.totalRequests} requests, ${result.successfulRequests} successful, ${result.failedRequests} failed`
    );

    // Wait before next batch
    await new Promise((resolve) => setTimeout(resolve, config.messageDelay));
  }

  // Calculate average response time
  result.avgResponseTime =
    result.responseTimes.reduce((sum, time) => sum + time, 0) /
    result.responseTimes.length;

  return result;
}

/**
 * Print load test results
 */
function printResults(result: LoadTestResult): void {
  console.log('\n=== Load Test Results ===');
  console.log(`Total Requests: ${result.totalRequests}`);
  console.log(`Successful: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Failed: ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Rate Limited: ${result.rateLimitedRequests}`);
  console.log(`\nResponse Times:`);
  console.log(`  Average: ${result.avgResponseTime.toFixed(2)}ms`);
  console.log(`  Min: ${result.minResponseTime}ms`);
  console.log(`  Max: ${result.maxResponseTime}ms`);

  // Calculate percentiles
  const sorted = result.responseTimes.sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  console.log(`  P50: ${p50}ms`);
  console.log(`  P95: ${p95}ms`);
  console.log(`  P99: ${p99}ms`);

  if (result.errors.length > 0) {
    console.log(`\nErrors:`);
    for (const error of result.errors) {
      console.log(`  ${error.error}: ${error.count}`);
    }
  }

  // Performance assessment
  console.log(`\n=== Performance Assessment ===`);
  if (result.avgResponseTime < 5000) {
    console.log('✓ Average response time is under 5 seconds (target met)');
  } else {
    console.log('✗ Average response time exceeds 5 seconds (target not met)');
  }

  if (result.successfulRequests / result.totalRequests > 0.95) {
    console.log('✓ Success rate is above 95%');
  } else {
    console.log('✗ Success rate is below 95%');
  }

  if (p95 < 10000) {
    console.log('✓ P95 response time is under 10 seconds');
  } else {
    console.log('✗ P95 response time exceeds 10 seconds');
  }
}

/**
 * Main execution
 */
async function main() {
  // Load configuration from environment
  const config: LoadTestConfig = {
    targetUrl: process.env.LOAD_TEST_URL || 'http://localhost:3000/api/sms/webhook',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'test_auth_token',
    phoneNumbers: [
      '+15555551001',
      '+15555551002',
      '+15555551003',
      '+15555551004',
      '+15555551005',
    ],
    concurrentMessages: parseInt(process.env.LOAD_TEST_CONCURRENT || '10', 10),
    messageDelay: parseInt(process.env.LOAD_TEST_DELAY || '1000', 10),
    testDuration: parseInt(process.env.LOAD_TEST_DURATION || '60', 10),
  };

  try {
    const result = await runLoadTest(config);
    printResults(result);

    // Exit with error code if performance targets not met
    if (
      result.avgResponseTime > 5000 ||
      result.successfulRequests / result.totalRequests < 0.95
    ) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
