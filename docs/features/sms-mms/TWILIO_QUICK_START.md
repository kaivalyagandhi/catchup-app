# Twilio Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Get Twilio Credentials (2 minutes)

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free trial account
3. From the dashboard, copy:
   - **Account SID** (starts with "AC")
   - **Auth Token** (click to reveal)

### Step 2: Get a Phone Number (1 minute)

1. In Twilio Console, go to **Phone Numbers** > **Buy a number**
2. Select your country and check **SMS** + **MMS**
3. Click **Search** and **Buy** a number
4. Copy the phone number (format: +1234567890)

### Step 3: Configure CatchUp (1 minute)

Update your `.env` file:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_32_character_auth_token_here
TWILIO_PHONE_NUMBER=+15555551234
```

### Step 4: Test Configuration (1 minute)

```bash
# Test credentials
node test-twilio-config.js

# Send test SMS (replace with your phone number)
node test-send-sms.js +15555551234
```

### Step 5: Configure Webhook (for receiving messages)

**For local development:**
```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Start ngrok
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
```

**In Twilio Console:**
1. Go to **Phone Numbers** > Your number
2. Under "Messaging Configuration"
3. Set webhook to: `https://abc123.ngrok.io/api/sms/webhook`
4. Method: **POST**
5. Click **Save**

## ✅ Verification Checklist

- [ ] Twilio account created
- [ ] Phone number purchased
- [ ] Credentials in `.env` file
- [ ] `node test-twilio-config.js` passes
- [ ] `node test-send-sms.js +YOUR_NUMBER` works
- [ ] Webhook configured (if receiving messages)

## 🎯 Next Steps

- See **TWILIO_SETUP_AND_TESTING_GUIDE.md** for detailed testing
- Start your dev server: `npm run dev`
- Test the full integration

## 💡 Tips

**Trial Account Limitations:**
- Can only send to verified phone numbers
- Add numbers in: Twilio Console > Verified Caller IDs
- Upgrade to paid account to remove restrictions

**Common Issues:**
- "Invalid credentials" → Check for spaces in `.env`
- "Phone not verified" → Add to Verified Caller IDs
- "Webhook not working" → Check ngrok is running

## 📚 Resources

- Full guide: `TWILIO_SETUP_AND_TESTING_GUIDE.md`
- Twilio docs: https://www.twilio.com/docs/sms
- Get help: https://support.twilio.com
