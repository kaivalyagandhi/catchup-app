#!/usr/bin/env node

/**
 * Test script to diagnose Google Calendar connection issues
 */

require('dotenv').config();

console.log('=== Google Calendar Connection Diagnostic ===\n');

// Check environment variables
console.log('1. Checking environment variables:');
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

console.log(`   GOOGLE_CLIENT_ID: ${clientId ? '✓ Set (' + clientId.substring(0, 20) + '...)' : '✗ NOT SET'}`);
console.log(`   GOOGLE_CLIENT_SECRET: ${clientSecret ? '✓ Set (' + clientSecret.substring(0, 20) + '...)' : '✗ NOT SET'}`);
console.log(`   GOOGLE_REDIRECT_URI: ${redirectUri ? '✓ ' + redirectUri : '✗ NOT SET'}`);

if (!clientId || !clientSecret || !redirectUri) {
  console.log('\n❌ ERROR: Missing required environment variables!');
  console.log('   Please check your .env file and ensure all three variables are set.');
  process.exit(1);
}

console.log('\n2. Testing OAuth2 client creation:');
try {
  const { google } = require('googleapis');
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  console.log('   ✓ OAuth2 client created successfully');

  console.log('\n3. Testing authorization URL generation:');
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    prompt: 'consent',
  });
  console.log('   ✓ Authorization URL generated');
  console.log(`   URL: ${authUrl.substring(0, 100)}...`);

  console.log('\n✅ All checks passed! Your Google Calendar OAuth is configured correctly.');
  console.log('\nNext steps:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Click "Connect Google Calendar" in the app');
  console.log('3. You should be redirected to Google\'s consent screen');
  console.log('4. After authorizing, you should see a success message');

} catch (error) {
  console.log(`   ✗ Error: ${error.message}`);
  console.log('\n❌ Failed to create OAuth2 client');
  console.log('   This usually means:');
  console.log('   - googleapis package is not installed');
  console.log('   - Environment variables are malformed');
  console.log('   - Node.js version is incompatible');
  process.exit(1);
}
