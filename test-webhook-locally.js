#!/usr/bin/env node

/**
 * Local Webhook Testing Tool
 * 
 * Simulates a Twilio webhook request to test your webhook handler locally
 * without needing to configure ngrok or send real SMS messages.
 */

require('dotenv').config();
const crypto = require('crypto');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 3000;
const WEBHOOK_PATH = '/api/sms/webhook';
const BASE_URL = `http://localhost:${PORT}`;

// Test payload
const testPayload = {
  MessageSid: 'SM' + crypto.randomBytes(16).toString('hex'),
  AccountSid: process.env.TWILIO_ACCOUNT_SID || 'ACtest',
  From: process.argv[2] || '+15555551234',
  To: process.env.TWILIO_PHONE_NUMBER || '+15555556789',
  Body: process.argv[3] || 'Test message from webhook simulator',
  NumMedia: '0',
};

console.log('🧪 Twilio Webhook Local Testing Tool\n');
console.log('Configuration:');
console.log(`  Server: ${BASE_URL}`);
console.log(`  Webhook: ${WEBHOOK_PATH}`);
console.log(`  From: ${testPayload.From}`);
console.log(`  To: ${testPayload.To}`);
console.log(`  Message: "${testPayload.Body}"\n`);

// Generate Twilio signature
function generateTwilioSignature(url, params) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!authToken || authToken === 'your_twilio_auth_token') {
    console.error('❌ TWILIO_AUTH_TOKEN not configured in .env');
    process.exit(1);
  }
  
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  
  const hmac = crypto.createHmac('sha1', authToken);
  hmac.update(data);
  return hmac.digest('base64');
}

// Convert object to URL-encoded form data
function encodeFormData(data) {
  return Object.keys(data)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&');
}

// Send webhook request
async function sendWebhookRequest() {
  const url = `${BASE_URL}${WEBHOOK_PATH}`;
  const signature = generateTwilioSignature(url, testPayload);
  const body = encodeFormData(testPayload);
  
  console.log('Sending webhook request...\n');
  
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: WEBHOOK_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      'X-Twilio-Signature': signature,
    },
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(body);
    req.end();
  });
}

// Main
async function main() {
  try {
    const response = await sendWebhookRequest();
    
    console.log('Response:');
    console.log(`  Status: ${response.statusCode}`);
    console.log(`  Content-Type: ${response.headers['content-type']}`);
    console.log(`\nBody:\n${response.body}\n`);
    
    if (response.statusCode === 200) {
      console.log('✅ Webhook request successful!');
      
      if (response.headers['content-type']?.includes('text/xml')) {
        console.log('✅ Received TwiML response');
      }
    } else if (response.statusCode === 403) {
      console.error('❌ Webhook rejected (403 Forbidden)');
      console.error('   This usually means signature validation failed');
    } else if (response.statusCode === 404) {
      console.error('❌ Webhook endpoint not found (404)');
      console.error('   Make sure your server is running: npm run dev');
    } else {
      console.error(`❌ Unexpected status code: ${response.statusCode}`);
    }
  } catch (error) {
    console.error('\n❌ Failed to send webhook request:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused - is your server running?');
      console.error('   Start it with: npm run dev');
    } else {
      console.error(`   ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Usage info
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node test-webhook-locally.js [from_number] [message]');
  console.log('');
  console.log('Examples:');
  console.log('  node test-webhook-locally.js');
  console.log('  node test-webhook-locally.js +15555551234');
  console.log('  node test-webhook-locally.js +15555551234 "Hello from test"');
  console.log('');
  console.log('Make sure your server is running first:');
  console.log('  npm run dev');
  process.exit(0);
}

main();
