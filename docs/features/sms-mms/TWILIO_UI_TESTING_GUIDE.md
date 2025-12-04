# Twilio UI Testing Tool - User Guide

## Overview

The Twilio UI Testing Tool provides a web-based interface for testing your Twilio SMS/MMS integration directly from the CatchUp application. No command-line knowledge required!

## Accessing the Testing Tool

### Option 1: Standalone Page

Visit the dedicated testing page:
```
http://localhost:3000/twilio-testing.html
```

### Option 2: From Preferences (Coming Soon)

The testing tool will be integrated into the Preferences section of the main CatchUp app.

## Features

### 1. Configuration Status Test

**What it does:**
- Verifies that your Twilio credentials are properly configured
- Checks Account SID, Auth Token, and Phone Number
- Validates credential format
- Verifies account status with Twilio

**How to use:**
1. Click "Test Configuration"
2. Wait for the test to complete
3. Review the results

**Success indicators:**
- ✅ Configuration Valid
- Account SID displayed (masked for security)
- Phone number displayed
- Auth token confirmed

**Common errors:**
- ❌ TWILIO_ACCOUNT_SID not configured
- ❌ TWILIO_AUTH_TOKEN not configured
- ❌ TWILIO_PHONE_NUMBER not configured
- ❌ Invalid credentials

### 2. Phone Number Verification

**What it does:**
- Verifies your Twilio phone number exists in your account
- Checks SMS and MMS capabilities
- Shows webhook configuration status

**How to use:**
1. Click "Verify Phone Number"
2. Review the capabilities and configuration

**Success indicators:**
- ✅ Phone Number Verified
- SMS Capable: ✅ Yes
- MMS Capable: ✅ Yes (or ⚠️ No)
- Webhook URL displayed (if configured)

**Warnings:**
- ⚠️ MMS not enabled - Voice notes with images will fail
- ⚠️ No webhook configured - Cannot receive messages

### 3. Send Test SMS

**What it does:**
- Sends a real test SMS message to verify delivery works
- Tests the complete SMS sending pipeline

**How to use:**
1. Enter a recipient phone number in E.164 format (e.g., +15555551234)
2. Click "Send Test SMS"
3. Check your phone for the test message

**Important notes:**
- **Trial accounts:** Can only send to verified phone numbers
  - Add numbers in Twilio Console > Verified Caller IDs
- **Phone format:** Must include country code with + prefix
- **Example:** +15555551234 (US), +447700900000 (UK)

**Success indicators:**
- ✅ SMS Sent Successfully!
- Message SID displayed
- Status: sent/queued/delivered

**Common errors:**
- ❌ Error 21608: Phone number not verified (trial account)
  - Solution: Add number to Verified Caller IDs or upgrade account
- ❌ Error 21211: Invalid phone number format
  - Solution: Use E.164 format with country code

### 4. Webhook Configuration Check

**What it does:**
- Checks if your Twilio number is configured to receive messages
- Verifies webhook URL is set

**How to use:**
1. Click "Check Webhook"
2. Review the webhook configuration

**Success indicators:**
- ✅ Webhook Configured
- Webhook URL displayed
- Method: POST

**If not configured:**
- ⚠️ Webhook Not Configured
- Follow the setup instructions provided
- For local development, use ngrok

### 5. Run All Tests

**What it does:**
- Runs all tests sequentially
- Provides a comprehensive summary

**How to use:**
1. Click "Run All Tests"
2. Wait for all tests to complete (takes ~5-10 seconds)
3. Review the summary

**Summary shows:**
- Number of tests passed
- Number of tests failed
- Overall status (✅ All Passed, ⚠️ Some Failed, ❌ Tests Failed)

## Test Results

### Understanding Results

**✅ Success (Green)**
- Test passed successfully
- Feature is working correctly

**⚠️ Warning (Yellow)**
- Test passed but with warnings
- Feature may have limitations
- Example: MMS not enabled, webhook not configured

**❌ Error (Red)**
- Test failed
- Feature is not working
- Action required to fix

### Result Details

Each test result includes:
- **Status:** Pass/Fail indicator
- **Details:** Specific information about what was tested
- **Error messages:** If test failed, why it failed
- **Help section:** Step-by-step instructions to fix issues

## Troubleshooting

### Configuration Test Fails

**Problem:** Credentials not configured

**Solution:**
1. Get credentials from [Twilio Console](https://console.twilio.com/)
2. Add to your `.env` file:
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+15555551234
   ```
3. Restart your server: `npm run dev`
4. Run the test again

### Phone Number Test Fails

**Problem:** Phone number not found

**Solution:**
1. Go to [Twilio Console > Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Buy a phone number with SMS/MMS capabilities
3. Update `TWILIO_PHONE_NUMBER` in `.env`
4. Restart server and test again

### SMS Sending Fails (Trial Account)

**Problem:** Error 21608 - Phone number not verified

**Solution:**
1. Go to [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
2. Click "Add a new number"
3. Enter the recipient's phone number
4. Complete the verification process
5. Try sending the test SMS again

**Or upgrade to a paid account:**
1. Go to [Twilio Console > Billing](https://console.twilio.com/billing)
2. Add payment method
3. Upgrade account
4. No verification needed for recipients

### Webhook Not Configured

**Problem:** Cannot receive incoming messages

**Solution for local development:**
1. Install ngrok: `brew install ngrok`
2. Start ngrok: `ngrok http 3000`
3. Copy the https URL (e.g., `https://abc123.ngrok.io`)
4. Go to [Twilio Console > Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
5. Click your phone number
6. Under "Messaging Configuration":
   - Set webhook to: `https://abc123.ngrok.io/api/sms/webhook`
   - Set method to: POST
7. Click Save
8. Run the webhook test again

**Solution for production:**
1. Use your production domain
2. Set webhook to: `https://yourdomain.com/api/sms/webhook`
3. Ensure HTTPS is enabled

## Tips for Success

### Before Testing

1. ✅ Complete Twilio account setup
2. ✅ Purchase a phone number
3. ✅ Add credentials to `.env` file
4. ✅ Restart your server
5. ✅ Have a phone handy for SMS testing

### During Testing

1. 🔄 Run tests in order (1 → 2 → 3 → 4)
2. 📝 Read error messages carefully
3. 🔍 Follow the troubleshooting steps provided
4. ⏱️ Wait for each test to complete before starting the next

### After Testing

1. ✅ Verify all tests pass
2. 📱 Confirm you received the test SMS
3. 🔧 Configure webhook if needed
4. 📚 Review the setup guides for more details

## Additional Resources

### In-App Links

- 📖 Quick Start Guide
- 📘 Complete Setup Guide
- 🔧 Twilio Console
- 📚 Twilio SMS Documentation

### External Resources

- [Twilio Documentation](https://www.twilio.com/docs/sms)
- [Twilio Error Codes](https://www.twilio.com/docs/api/errors)
- [Twilio Support](https://support.twilio.com/)
- [ngrok Documentation](https://ngrok.com/docs)

## Security Notes

- 🔒 Credentials are masked in the UI for security
- 🔒 Never share your Auth Token publicly
- 🔒 Test SMS messages are sent over secure connections
- 🔒 Webhook signature validation is automatically enabled

## Need Help?

If you encounter issues not covered in this guide:

1. Check the [Complete Setup Guide](TWILIO_SETUP_AND_TESTING_GUIDE.md)
2. Review [Twilio's documentation](https://www.twilio.com/docs/sms)
3. Check Twilio Console logs for detailed error information
4. Contact Twilio support for account-specific issues

---

**Last Updated:** December 3, 2025
