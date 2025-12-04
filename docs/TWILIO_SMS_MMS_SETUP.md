# Twilio SMS/MMS Setup Guide

This guide walks you through setting up Twilio for SMS/MMS enrichment in CatchUp.

## Prerequisites

- A Twilio account (sign up at https://www.twilio.com/)
- A publicly accessible webhook URL (for production) or ngrok (for development)
- CatchUp backend running with database migrations applied

## Step 1: Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free trial account
3. Verify your email and phone number
4. Complete the onboarding questionnaire

## Step 2: Get a Phone Number

1. In the Twilio Console, navigate to **Phone Numbers** > **Manage** > **Buy a number**
2. Select your country
3. Check the capabilities you need:
   - ✅ SMS
   - ✅ MMS
   - ✅ Voice (optional)
4. Search for available numbers
5. Purchase a number (trial accounts get one free number)
6. Note down your phone number (e.g., +15555556789)

## Step 3: Get Your Credentials

1. Go to the Twilio Console Dashboard
2. Find your **Account SID** and **Auth Token** in the "Account Info" section
3. Click the eye icon to reveal your Auth Token
4. Copy both values

## Step 4: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Twilio SMS/MMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15555556789

# SMS/MMS Feature Configuration
SMS_ENRICHMENT_ENABLED=true
RATE_LIMIT_MESSAGES_PER_HOUR=20
MAX_MEDIA_SIZE_MB=5
VERIFICATION_CODE_EXPIRY_MINUTES=10
```

## Step 5: Set Up Webhook (Development)

For local development, use ngrok to expose your local server:

1. Install ngrok: https://ngrok.com/download
2. Start your CatchUp backend: `npm run dev`
3. In a new terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```
4. Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok.io`)
5. In Twilio Console, go to **Phone Numbers** > **Manage** > **Active numbers**
6. Click on your phone number
7. Scroll to **Messaging Configuration**
8. Under "A MESSAGE COMES IN":
   - Webhook: `https://abc123.ngrok.io/api/sms/webhook`
   - HTTP Method: POST
9. Click **Save**

## Step 6: Set Up Webhook (Production)

For production deployment:

1. Deploy your CatchUp backend to a server with HTTPS
2. In Twilio Console, configure the webhook URL:
   - Webhook: `https://your-domain.com/api/sms/webhook`
   - HTTP Method: POST
3. Ensure your server is accessible from Twilio's IP ranges

## Step 7: Test the Integration

### Test Phone Number Verification

1. Start your backend server
2. Use the phone number linking API:
   ```bash
   curl -X POST http://localhost:3000/api/user/phone-number \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+15551234567"}'
   ```
3. You should receive an SMS with a 6-digit verification code
4. Verify the code:
   ```bash
   curl -X POST http://localhost:3000/api/user/phone-number/verify \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"code": "123456"}'
   ```

### Test SMS Enrichment

1. Send a text message to your Twilio number:
   ```
   Had coffee with Sarah today. She's interested in photography and hiking.
   ```
2. Check your backend logs for webhook receipt
3. Check the web app for pending enrichments

### Test MMS Enrichment

1. Send a voice note, image, or video to your Twilio number
2. The system should process the media and extract enrichments
3. Check the web app for pending enrichments with source metadata

## Troubleshooting

### "Invalid signature" errors

- Verify your `TWILIO_AUTH_TOKEN` is correct
- Ensure the webhook URL matches exactly (including https://)
- Check that your server is receiving the `X-Twilio-Signature` header

### Messages not being received

- Verify your webhook URL is publicly accessible
- Check Twilio Console > Monitor > Logs for webhook errors
- Ensure your phone number is verified in Twilio (for trial accounts)
- Check that SMS/MMS capabilities are enabled on your number

### Verification codes not sending

- Check your Twilio account balance (trial accounts have limits)
- Verify the phone number format is E.164 (e.g., +15551234567)
- Check Twilio Console > Monitor > Logs for SMS delivery errors

### Rate limiting issues

- Default limit is 20 messages per hour per phone number
- Adjust `RATE_LIMIT_MESSAGES_PER_HOUR` in `.env` if needed
- Check Redis is running for rate limit tracking

## Cost Considerations

### Trial Account Limits

- $15.50 in free credit
- Can only send to verified phone numbers
- Twilio branding on messages

### Pricing (as of 2024)

- **SMS (US)**: $0.0079 per message sent/received
- **MMS (US)**: $0.02 per message sent/received
- **Phone Number**: $1.15/month for local number

### Cost Optimization

1. Set appropriate rate limits to prevent abuse
2. Implement media size limits (default 5MB)
3. Monitor usage in Twilio Console
4. Consider upgrading to paid account for production

## Security Best Practices

1. **Never commit credentials**: Keep `TWILIO_AUTH_TOKEN` in `.env` only
2. **Validate signatures**: Always verify `X-Twilio-Signature` header
3. **Use HTTPS**: Webhooks must use HTTPS in production
4. **Rate limiting**: Prevent abuse with per-user rate limits
5. **Phone number encryption**: Store phone numbers encrypted at rest
6. **Audit logging**: Log all security events

## Next Steps

After completing this setup:

1. Implement phone number verification service (Task 2)
2. Create API routes for phone management (Task 3)
3. Implement webhook handler (Task 4)
4. Set up AI processing pipeline (Tasks 6-8)

## References

- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Twilio MMS Documentation](https://www.twilio.com/docs/sms/send-messages#send-an-mms-message)
- [Twilio Webhook Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Twilio Console](https://console.twilio.com/)

