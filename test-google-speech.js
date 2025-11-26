// Quick test to verify Google Speech-to-Text credentials
const speech = require('@google-cloud/speech');

async function testSpeechAPI() {
  try {
    console.log('Testing Google Speech-to-Text API...');
    console.log('Credentials file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    
    const client = new speech.SpeechClient();
    
    // Try to create a streaming request (this will fail if API not enabled)
    const request = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
      interimResults: true,
    };
    
    const stream = client.streamingRecognize(request);
    console.log('✅ Speech API is working! Stream created successfully.');
    stream.destroy();
    
  } catch (error) {
    console.error('❌ Speech API Error:', error.message);
    if (error.message.includes('API has not been used')) {
      console.log('\n📝 ACTION REQUIRED:');
      console.log('1. Go to: https://console.cloud.google.com/apis/library/speech.googleapis.com');
      console.log('2. Make sure your project "catchup-479406" is selected');
      console.log('3. Click "ENABLE" button');
      console.log('4. Wait a few minutes for it to activate');
    }
  }
}

testSpeechAPI();
