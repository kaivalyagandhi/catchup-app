require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// IMPORTANT: Replace with your verified phone number
const TO_NUMBER = process.argv[2] || '+1234567890';

if (TO_NUMBER === '+1234567890') {
  console.error('❌ Please provide a valid phone number as argument');
  console.error('   Usage: node test-send-sms.js +15555551234');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

console.log('Sending test SMS...\n');
console.log(`   From: ${fromNumber}`);
console.log(`   To: ${TO_NUMBER}`);

client.messages
  .create({
    body: 'Hello from CatchUp! This is a test message.',
    from: fromNumber,
    to: TO_NUMBER,
  })
  .then(message => {
    console.log('\n✅ SMS sent successfully!');
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   To: ${message.to}`);
    console.log(`   From: ${message.from}`);
    console.log(`   Date: ${message.dateCreated}`);
  })
  .catch(error => {
    console.error('\n❌ Failed to send SMS:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.moreInfo) {
      console.error(`   More info: ${error.moreInfo}`);
    }
    process.exit(1);
  });
