#!/usr/bin/env node

/**
 * Comprehensive Twilio Integration Test Suite
 * 
 * Tests all aspects of the Twilio integration:
 * 1. Configuration validation
 * 2. Twilio client initialization
 * 3. Account verification
 * 4. SMS sending capability
 * 5. Signature validation
 * 6. Error handling
 */

require('dotenv').config();
const twilio = require('twilio');
const crypto = require('crypto');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60) + '\n');
}

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

// Test 1: Configuration Validation
async function testConfiguration() {
  section('Test 1: Configuration Validation');
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  let allValid = true;
  
  // Check Account SID
  if (!accountSid || accountSid === 'your_twilio_account_sid') {
    error('TWILIO_ACCOUNT_SID not configured');
    allValid = false;
  } else if (!accountSid.startsWith('AC')) {
    error('TWILIO_ACCOUNT_SID should start with "AC"');
    allValid = false;
  } else {
    success(`TWILIO_ACCOUNT_SID configured: ${accountSid.substring(0, 10)}...`);
  }
  
  // Check Auth Token
  if (!authToken || authToken === 'your_twilio_auth_token') {
    error('TWILIO_AUTH_TOKEN not configured');
    allValid = false;
  } else if (authToken.length < 32) {
    warning('TWILIO_AUTH_TOKEN seems too short (should be 32 characters)');
    results.warnings++;
  } else {
    success('TWILIO_AUTH_TOKEN configured');
  }
  
  // Check Phone Number
  if (!fromNumber || fromNumber === '+15555556789') {
    error('TWILIO_PHONE_NUMBER not configured');
    allValid = false;
  } else if (!fromNumber.startsWith('+')) {
    error('TWILIO_PHONE_NUMBER should start with "+" (E.164 format)');
    allValid = false;
  } else {
    success(`TWILIO_PHONE_NUMBER configured: ${fromNumber}`);
  }
  
  if (allValid) {
    results.passed++;
    return true;
  } else {
    results.failed++;
    return false;
  }
}

// Test 2: Client Initialization
async function testClientInitialization() {
  section('Test 2: Twilio Client Initialization');
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    const client = twilio(accountSid, authToken);
    success('Twilio client initialized successfully');
    results.passed++;
    return client;
  } catch (err) {
    error(`Failed to initialize Twilio client: ${err.message}`);
    results.failed++;
    return null;
  }
}

// Test 3: Account Verification
async function testAccountVerification(client) {
  section('Test 3: Account Verification');
  
  if (!client) {
    error('Skipping (client not initialized)');
    results.failed++;
    return false;
  }
  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const account = await client.api.accounts(accountSid).fetch();
    
    success(`Account verified: ${account.friendlyName}`);
    info(`   Status: ${account.status}`);
    info(`   Type: ${account.type}`);
    
    if (account.status !== 'active') {
      warning('Account is not active');
      results.warnings++;
    }
    
    results.passed++;
    return true;
  } catch (err) {
    error(`Failed to verify account: ${err.message}`);
    if (err.code === 20003) {
      info('   This usually means invalid credentials');
    }
    results.failed++;
    return false;
  }
}

// Test 4: Phone Number Verification
async function testPhoneNumber(client) {
  section('Test 4: Phone Number Verification');
  
  if (!client) {
    error('Skipping (client not initialized)');
    results.failed++;
    return false;
  }
  
  try {
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const phoneNumbers = await client.incomingPhoneNumbers.list({ phoneNumber: fromNumber });
    
    if (phoneNumbers.length === 0) {
      error(`Phone number ${fromNumber} not found in your account`);
      info('   Make sure you purchased this number in Twilio Console');
      results.failed++;
      return false;
    }
    
    const phoneNumber = phoneNumbers[0];
    success(`Phone number verified: ${phoneNumber.phoneNumber}`);
    info(`   Friendly name: ${phoneNumber.friendlyName}`);
    info(`   SMS capable: ${phoneNumber.capabilities.sms ? 'Yes' : 'No'}`);
    info(`   MMS capable: ${phoneNumber.capabilities.mms ? 'Yes' : 'No'}`);
    
    if (!phoneNumber.capabilities.sms) {
      error('Phone number is not SMS capable!');
      results.failed++;
      return false;
    }
    
    if (!phoneNumber.capabilities.mms) {
      warning('Phone number is not MMS capable (voice notes with images will fail)');
      results.warnings++;
    }
    
    // Check webhook configuration
    if (phoneNumber.smsUrl) {
      info(`   SMS webhook: ${phoneNumber.smsUrl}`);
    } else {
      warning('No SMS webhook configured');
      info('   Configure in Twilio Console to receive messages');
      results.warnings++;
    }
    
    results.passed++;
    return true;
  } catch (err) {
    error(`Failed to verify phone number: ${err.message}`);
    results.failed++;
    return false;
  }
}

// Test 5: Signature Validation
async function testSignatureValidation() {
  section('Test 5: Webhook Signature Validation');
  
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!authToken || authToken === 'your_twilio_auth_token') {
    error('Cannot test signature validation without auth token');
    results.failed++;
    return false;
  }
  
  try {
    // Test data
    const url = 'https://example.com/api/sms/webhook';
    const params = {
      MessageSid: 'SM123456',
      From: '+15555551234',
      To: '+15555556789',
      Body: 'Test message',
    };
    
    // Generate valid signature
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);
    const hmac = crypto.createHmac('sha1', authToken);
    hmac.update(data);
    const validSignature = hmac.digest('base64');
    
    // Test valid signature
    const hmac2 = crypto.createHmac('sha1', authToken);
    hmac2.update(data);
    const expectedSignature = hmac2.digest('base64');
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(validSignature),
      Buffer.from(expectedSignature)
    );
    
    if (isValid) {
      success('Valid signature test passed');
    } else {
      error('Valid signature test failed');
      results.failed++;
      return false;
    }
    
    // Test invalid signature
    try {
      const invalidResult = crypto.timingSafeEqual(
        Buffer.from('invalid'),
        Buffer.from(expectedSignature)
      );
      error('Invalid signature test failed (should have thrown error)');
      results.failed++;
      return false;
    } catch (err) {
      success('Invalid signature test passed (correctly rejected)');
    }
    
    results.passed++;
    return true;
  } catch (err) {
    error(`Signature validation test failed: ${err.message}`);
    results.failed++;
    return false;
  }
}

// Test 6: SMS Sending (Optional - requires phone number)
async function testSMSSending(client) {
  section('Test 6: SMS Sending (Optional)');
  
  const testPhoneNumber = process.argv[2];
  
  if (!testPhoneNumber) {
    warning('Skipping SMS sending test (no phone number provided)');
    info('   To test SMS sending, run: node test-twilio-integration.js +15555551234');
    results.warnings++;
    return false;
  }
  
  if (!client) {
    error('Skipping (client not initialized)');
    results.failed++;
    return false;
  }
  
  try {
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    info(`Sending test SMS to ${testPhoneNumber}...`);
    
    const message = await client.messages.create({
      body: 'Test message from CatchUp Twilio integration test',
      from: fromNumber,
      to: testPhoneNumber,
    });
    
    success(`SMS sent successfully!`);
    info(`   Message SID: ${message.sid}`);
    info(`   Status: ${message.status}`);
    info(`   To: ${message.to}`);
    info(`   From: ${message.from}`);
    
    results.passed++;
    return true;
  } catch (err) {
    error(`Failed to send SMS: ${err.message}`);
    
    if (err.code === 21211) {
      info('   Error 21211: Invalid phone number format');
    } else if (err.code === 21608) {
      info('   Error 21608: Phone number not verified (trial account)');
      info('   Add the number to Verified Caller IDs in Twilio Console');
    } else if (err.code) {
      info(`   Error code: ${err.code}`);
      info(`   More info: https://www.twilio.com/docs/api/errors/${err.code}`);
    }
    
    results.failed++;
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n🧪 Twilio Integration Test Suite\n', 'blue');
  
  const configValid = await testConfiguration();
  
  if (!configValid) {
    log('\n❌ Configuration invalid. Please fix the errors above and try again.\n', 'red');
    process.exit(1);
  }
  
  const client = await testClientInitialization();
  await testAccountVerification(client);
  await testPhoneNumber(client);
  await testSignatureValidation();
  await testSMSSending(client);
  
  // Print summary
  section('Test Summary');
  
  log(`Passed:   ${results.passed}`, 'green');
  log(`Failed:   ${results.failed}`, results.failed > 0 ? 'red' : 'reset');
  log(`Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'reset');
  
  if (results.failed === 0) {
    log('\n🎉 All tests passed! Twilio integration is ready.\n', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some tests failed. Please review the errors above.\n', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  error(`Unexpected error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
