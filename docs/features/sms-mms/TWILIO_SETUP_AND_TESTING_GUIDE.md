# Twilio SMS/MMS Integration - Setup and Testing Guide

## Overview

CatchUp uses Twilio for SMS/MMS messaging to enable voice note enrichment via text messages. This guide covers complete setup, configuration, and testing.

## Prerequisites

- Twilio account (free trial or paid)
- CatchUp application running locally or deployed
- PostgreSQL database configured
- Redis running (for rate limiting)

## Part 1: Twilio Account Setup

### Step 1: Create Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free trial account
3. Verify your email and phone number
4. Complete the onboarding questionnaire

### Step 2: Get Your Credentials

1. Navigate to the [Twilio Console Dashboard](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** in the "Account Info" section
3. Copy these values - you'll need them for your `.env` file

### Step 3: Get a Phone Number

1. In the Twilio Console, go to **Phone Numbers** > **Manage** > **Buy a number**
2. Select your country (e.g., United States)
3. Check the capabilities you need:
   - ✅ SMS
   - ✅ MMS
   - ✅ Voice (optional)
4. Click **Search** and choose a number
5. Click **Buy** to purchase the number
6. Copy the phone number (format: +1234567890)

**Note:** Trial accounts can only send messages to verified phone numbers. Upgrade to a paid account for production use.

### Step 4: Configure Webhook URL

1. Go to **Phone Numbers** > **Manage** > **Active numbers**
2. Click on your purchased phone number
3. Scroll to **Messaging Configuration**
4. Under "A MESSAGE COMES IN":
   - Set **Webhook**: `https://your-domain.com/api/sms/webhook`
   - Set **HTTP Method**: `POST`
5. Click **Save**

**For local development:**
- Use a tunneling service like [ngrok](https://ngrok.com/):
  ```bash
  ngrok http 3000
  ```
- Use the ngrok URL: `https://abc123.ngrok.io/api/sms/webhook`

## Part 2: Environment Configuration

### Update Your `.env` File

Add your Twilio credentials to `.env`:

```bash
# Twilio SMS/MMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15555551234

# SMS/MMS Feature Configuration
SMS_ENRICHMENT_ENABLED=true
RATE_LIMIT_MESSAGES_PER_HOUR=20
MAX_MEDIA_SIZE_MB=5
VERIFICATION_CODE_EXPIRY_MINUTES=10
```

**Security Note:** Never commit your `.env` file to version control!

## Part 3: Testing the Integration

### Test 1: Verify Twilio Configuration

Create a simple test script to verify your credentials:

```bash
# Create test file
cat > test-twilio-config.js << 'EOF'
require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('Testing Twilio configuration...\n');

if (!accountSid || accountSid === 'your_twilio_account_sid') {
  console.error('❌ TWILIO_ACCOUNT_SID not configured');
  process.exit(1);
}

if (!authToken || authToken === 'your_twilio_auth_token') {
  console.error('❌ TWILIO_AUTH_TOKEN not configured');
  process.exit(1);
}

if (!fromNumber || fromNumber === '+15555556789') {
  console.error('❌ TWILIO_PHONE_NUMBER not configured');
  process.exit(1);
}

console.log('✅ Environment variables configured');
console.log(`   Account SID: ${accountSid.substring(0, 10)}...`);
console.log(`   Phone Number: ${fromNumber}`);

// Test Twilio client initialization
try {
  const client = twilio(accountSid, authToken);
  console.log('\n✅ Twilio client initialized successfully');
  
  // Fetch account details to verify credentials
  client.api.accounts(accountSid).fetch()
    .then(account => {
      console.log(`✅ Account verified: ${account.friendlyName}`);
      console.log(`   Status: ${account.status}`);
      console.log('\n🎉 Twilio configuration is valid!');
    })
    .catch(error => {
      console.error('\n❌ Failed to verify account:', error.message);
      process.exit(1);
    });
} catch (error) {
  console.error('\n❌ Failed to initialize Twilio client:', error.message);
  process.exit(1);
}
EOF

# Run the test
node test-twilio-config.js
```

### Test 2: Send Test SMS

Test sending an SMS message:

```bash
cat > test-send-sms.js << 'EOF'
require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// IMPORTANT: Replace with your verified phone number
const TO_NUMBER = '+1234567890'; // <-- CHANGE THIS

const client = twilio(accountSid, authToken);

console.log('Sending test SMS...\n');

client.messages
  .create({
    body: 'Hello from CatchUp! This is a test message.',
    from: fromNumber,
    to: TO_NUMBER,
  })
  .then(message => {
    console.log('✅ SMS sent successfully!');
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   To: ${message.to}`);
    console.log(`   From: ${message.from}`);
  })
  .catch(error => {
    console.error('❌ Failed to send SMS:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  });
EOF

# Edit the file to add your phone number, then run:
node test-send-sms.js
```

### Test 3: Test CatchUp SMS Service

Test the CatchUp SMS service implementation:

```bash
cat > test-catchup-sms.js << 'EOF'
require('dotenv').config();
const { TwilioSMSService } = require('./dist/notifications/sms-service');

// IMPORTANT: Replace with your verified phone number
const TO_NUMBER = '+1234567890'; // <-- CHANGE THIS

async function testSMSService() {
  console.log('Testing CatchUp SMS Service...\n');
  
  try {
    const smsService = new TwilioSMSService();
    
    const result = await smsService.sendSMS(
      TO_NUMBER,
      'Test message from CatchUp SMS Service'
    );
    
    if (result.success) {
      console.log('✅ SMS sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Attempts: ${result.attempts}`);
    } else {
      console.error('❌ SMS delivery failed');
      console.error(`   Error: ${result.error}`);
      console.error(`   Attempts: ${result.attempts}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSMSService();
EOF

# Build the project first, then run:
npm run build
node test-catchup-sms.js
```

### Test 4: Test Webhook Signature Validation

Test the webhook signature validation:

```bash
cat > test-webhook-signature.js << 'EOF'
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

console.log('\n✅ Signature validation working correctly!');
EOF

node test-webhook-signature.js
```

### Test 5: Test Webhook Endpoint (End-to-End)

Test the complete webhook flow:

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Start ngrok (in another terminal):**
   ```bash
   ngrok http 3000
   ```

3. **Update Twilio webhook URL:**
   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Go to Twilio Console > Phone Numbers > Your Number
   - Set webhook to: `https://abc123.ngrok.io/api/sms/webhook`
   - Save

4. **Send a test SMS:**
   - From your verified phone number, send an SMS to your Twilio number
   - Message: "Test message"

5. **Check the logs:**
   - Your server should log: "Received Twilio webhook"
   - Check for any errors in processing

6. **Verify in database:**
   ```bash
   psql -h localhost -U postgres -d catchup_db -c "SELECT * FROM interaction_logs ORDER BY created_at DESC LIMIT 5;"
   ```

## Part 4: Testing Checklist

Use this checklist to verify your Twilio integration:

- [ ] Twilio account created and verified
- [ ] Phone number purchased with SMS/MMS capabilities
- [ ] Credentials added to `.env` file
- [ ] Webhook URL configured in Twilio Console
- [ ] Test 1: Configuration verification passes
- [ ] Test 2: Can send SMS successfully
- [ ] Test 3: CatchUp SMS service works
- [ ] Test 4: Signature validation works
- [ ] Test 5: Webhook receives and processes messages
- [ ] Rate limiting works (send 21+ messages in an hour)
- [ ] Error handling works (invalid phone number)
- [ ] Retry logic works (simulate network error)

## Part 5: Common Issues and Troubleshooting

### Issue: "Invalid credentials" error

**Solution:**
- Verify `TWILIO_ACCOUNT_SID` starts with "AC"
- Verify `TWILIO_AUTH_TOKEN` is correct (32 characters)
- Check for extra spaces or quotes in `.env` file

### Issue: "Phone number not verified" (Trial account)

**Solution:**
- Trial accounts can only send to verified numbers
- Add recipient numbers in Twilio Console > Phone Numbers > Verified Caller IDs
- Or upgrade to a paid account

### Issue: Webhook not receiving messages

**Solution:**
- Verify webhook URL is correct in Twilio Console
- Check that ngrok is running (for local development)
- Verify server is running on correct port
- Check firewall settings
- Look for errors in Twilio Console > Monitor > Logs

### Issue: "Invalid signature" error

**Solution:**
- Verify `TWILIO_AUTH_TOKEN` is correct
- Check that webhook URL matches exactly (http vs https)
- Ensure request body is not modified before validation
- Check for proxy/load balancer modifying requests

### Issue: Rate limit exceeded

**Solution:**
- This is expected behavior after 20 messages/hour
- Wait for rate limit to reset
- Or adjust `RATE_LIMIT_MESSAGES_PER_HOUR` in `.env`

## Part 6: Production Deployment

### Before Going Live:

1. **Upgrade Twilio account** (remove trial restrictions)
2. **Use HTTPS** for webhook URL
3. **Set up monitoring:**
   - Enable Twilio webhook logs
   - Set up error alerting
   - Monitor delivery rates
4. **Configure rate limits** appropriately
5. **Test with real users** in staging environment
6. **Set up backup phone number** (optional)
7. **Review Twilio pricing** and set up billing alerts

### Production Environment Variables:

```bash
# Use production values
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_production_auth_token
TWILIO_PHONE_NUMBER=+15555551234
RATE_LIMIT_MESSAGES_PER_HOUR=100
```

## Part 7: Monitoring and Maintenance

### Monitor These Metrics:

- SMS delivery success rate
- Webhook response time
- Rate limit hits
- Error rates by type
- Twilio costs

### Regular Maintenance:

- Review Twilio logs weekly
- Check for failed deliveries
- Monitor costs and usage
- Update rate limits as needed
- Test webhook endpoint monthly

## Resources

- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Twilio Webhook Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Twilio Error Codes](https://www.twilio.com/docs/api/errors)
- [Twilio Pricing](https://www.twilio.com/sms/pricing)
- [ngrok Documentation](https://ngrok.com/docs)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Twilio Console logs
3. Check application logs
4. Verify environment variables
5. Test with Twilio's API Explorer

---

**Last Updated:** December 2, 2025
