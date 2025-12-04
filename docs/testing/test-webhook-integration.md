# Twilio Webhook Integration Test Guide

## Overview

This guide explains how to test the Twilio webhook handler locally and in production.

## Local Testing

### Prerequisites

1. Twilio account with phone number
2. ngrok or similar tunneling service (to expose localhost to Twilio)
3. Environment variables configured in `.env`:
   ```bash
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=+15555556789
   ```

### Setup Steps

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Start ngrok to expose localhost**
   ```bash
   ngrok http 3000
   ```
   
   Note the HTTPS URL (e.g., `https://abc123.ngrok.io`)

3. **Configure Twilio webhook**
   - Go to Twilio Console
   - Navigate to Phone Numbers → Manage → Active Numbers
   - Select your CatchUp phone number
   - Under "Messaging", set:
     - A MESSAGE COMES IN: Webhook
     - URL: `https://abc123.ngrok.io/api/sms/webhook`
     - HTTP Method: POST
   - Save

### Test Scenarios

#### Test 1: Unverified Phone Number

1. Send SMS to your Twilio number from an unverified phone
2. Expected response:
   ```
   This phone number isn't linked to a CatchUp account. Visit the web app to link it.
   ```

#### Test 2: Verified Phone Number (SMS)

1. Link and verify a phone number in the web app
2. Send SMS: "Met Sarah at the coffee shop. She's interested in photography."
3. Expected response:
   ```
   Got it! Processing your enrichment. Check the web app to review.
   ```

#### Test 3: MMS with Image

1. Send MMS with an image (e.g., business card photo)
2. Expected response:
   ```
   Got it! Processing your enrichment. Check the web app to review.
   ```

#### Test 4: Invalid Signature (Security Test)

1. Use curl to send request without valid signature:
   ```bash
   curl -X POST http://localhost:3000/api/sms/webhook \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "From=+15555551234&To=+15555556789&Body=Test&NumMedia=0"
   ```
2. Expected response: HTTP 403 Forbidden
3. Check logs for security event

## Monitoring Webhook Requests

### View Logs

```bash
# In development
npm run dev
# Watch console for webhook logs
```

### Check Twilio Logs

1. Go to Twilio Console
2. Navigate to Monitor → Logs → Messaging
3. View webhook request/response details

## Signature Validation Testing

### Generate Valid Signature (for testing)

```javascript
const crypto = require('crypto');

const authToken = 'your_twilio_auth_token';
const url = 'https://your-domain.com/api/sms/webhook';
const params = {
  MessageSid: 'SM1234567890',
  AccountSid: 'AC1234567890',
  From: '+15555551234',
  To: '+15555556789',
  Body: 'Test message',
  NumMedia: '0'
};

// Sort and concatenate
const data = Object.keys(params)
  .sort()
  .reduce((acc, key) => acc + key + params[key], url);

// Generate signature
const hmac = crypto.createHmac('sha1', authToken);
hmac.update(data);
const signature = hmac.digest('base64');

console.log('X-Twilio-Signature:', signature);
```

### Test with curl

```bash
curl -X POST https://your-domain.com/api/sms/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-Twilio-Signature: YOUR_GENERATED_SIGNATURE" \
  -d "MessageSid=SM1234567890" \
  -d "AccountSid=AC1234567890" \
  -d "From=+15555551234" \
  -d "To=+15555556789" \
  -d "Body=Test message" \
  -d "NumMedia=0"
```

## Production Deployment

### Webhook URL Configuration

1. Deploy application to production
2. Configure Twilio webhook URL:
   ```
   https://your-production-domain.com/api/sms/webhook
   ```

### Security Checklist

- ✅ HTTPS enabled (required by Twilio)
- ✅ TWILIO_AUTH_TOKEN configured in production environment
- ✅ Signature validation enabled
- ✅ Security event logging configured
- ✅ Rate limiting enabled (after Task 5)

## Troubleshooting

### Issue: "Service temporarily unavailable"

**Cause**: TWILIO_AUTH_TOKEN not configured

**Solution**: Set environment variable in `.env`

### Issue: HTTP 403 Forbidden

**Cause**: Invalid signature

**Solutions**:
1. Verify TWILIO_AUTH_TOKEN matches Twilio console
2. Check webhook URL matches exactly (including protocol)
3. Verify Twilio is sending X-Twilio-Signature header

### Issue: "Phone number isn't linked"

**Cause**: Phone number not in database or not verified

**Solutions**:
1. Link phone number via web app
2. Complete verification process
3. Check database: `SELECT * FROM user_phone_numbers WHERE phone_number = '+15555551234';`

### Issue: Webhook timeout

**Cause**: Handler taking too long to respond

**Solutions**:
1. Check for slow database queries
2. Verify async processing is working
3. Monitor response times in Twilio logs

## Expected Response Times

- Signature validation: < 10ms
- User lookup: < 50ms
- TwiML response: < 100ms
- Total webhook response: < 200ms (well under 5s requirement)

## Next Steps

After implementing remaining tasks:
1. Task 5: Test rate limiting (21st message should be rejected)
2. Task 6: Test media download (send image/video)
3. Task 7: Test AI processing (verify enrichments extracted)
4. Task 8: Test end-to-end flow (message → enrichment → web app)
