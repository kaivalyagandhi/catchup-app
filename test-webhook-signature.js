require('dotenv').config();
const crypto = require('crypto');

function validateTwilioSignature(authToken, signature, url, params) {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  
  const hmac = crypto.createHmac('sha1', authToken);
  hmac.update(data);
  const expectedSignature = hmac.digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Test data
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!authToken || authToken === 'your_twilio_auth_token') {
  console.error('❌ TWILIO_AUTH_TOKEN not configured in .env');
  process.exit(1);
}

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

console.log('Testing webhook signature validation...\n');

// Test valid signature
const isValid = validateTwilioSignature(authToken, validSignature, url, params);
console.log(`Valid signature test: ${isValid ? '✅ PASS' : '❌ FAIL'}`);

// Test invalid signature
const isInvalid = validateTwilioSignature(authToken, 'invalid', url, params);
console.log(`Invalid signature test: ${!isInvalid ? '✅ PASS' : '❌ FAIL'}`);

if (isValid && !isInvalid) {
  console.log('\n✅ Signature validation working correctly!');
} else {
  console.error('\n❌ Signature validation has issues');
  process.exit(1);
}
