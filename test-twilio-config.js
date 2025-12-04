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
