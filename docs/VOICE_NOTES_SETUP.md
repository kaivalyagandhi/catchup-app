# Voice Notes Feature - Environment Configuration Guide

## Overview

This guide provides step-by-step instructions for configuring the Voice Notes Enhancement feature, which includes real-time audio transcription using Google Cloud Speech-to-Text and entity extraction using Google Gemini API.

## Table of Contents

1. [Google Cloud Speech-to-Text Setup](#google-cloud-speech-to-text-setup)
2. [Google Gemini API Setup](#google-gemini-api-setup)
3. [Environment Variables](#environment-variables)
4. [WebSocket Configuration](#websocket-configuration)
5. [Testing the Setup](#testing-the-setup)
6. [Troubleshooting](#troubleshooting)

---

## Google Cloud Speech-to-Text Setup

### Prerequisites

- Google Cloud Platform account
- Billing enabled on your GCP project
- gcloud CLI installed (optional, for command-line setup)

### Step 1: Create or Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project dropdown at the top
3. Click "New Project" or select an existing project
4. Note your Project ID (you'll need this later)

### Step 2: Enable the Speech-to-Text API

**Via Console:**
1. Navigate to "APIs & Services" > "Library"
2. Search for "Cloud Speech-to-Text API"
3. Click on it and press "Enable"

**Via gcloud CLI:**
```bash
gcloud services enable speech.googleapis.com --project=YOUR_PROJECT_ID
```

### Step 3: Create Service Account Credentials

**Option A: Service Account (Recommended for Production)**

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the details:
   - Service account name: `catchup-speech-to-text`
   - Service account ID: `catchup-speech-to-text`
   - Description: "Service account for CatchUp Speech-to-Text API"
4. Click "Create and Continue"
5. Grant the role: "Cloud Speech-to-Text API User"
6. Click "Continue" then "Done"
7. Click on the newly created service account
8. Go to the "Keys" tab
9. Click "Add Key" > "Create new key"
10. Choose "JSON" format
11. Download the JSON key file
12. Save it securely (e.g., `config/google-service-account.json`)
13. **Important**: Never commit this file to version control!

**Option B: API Key (Development Only)**

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key
4. Click "Restrict Key" (recommended)
5. Under "API restrictions", select "Restrict key"
6. Choose "Cloud Speech-to-Text API"
7. Save

**Security Note**: Service accounts are more secure and recommended for production. API keys should only be used for development.

### Step 4: Configure Environment Variables

Add to your `.env` file:

**For Service Account (Recommended):**
```bash
# Path to your service account JSON file
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/google-service-account.json

# Speech-to-Text configuration
SPEECH_TO_TEXT_LANGUAGE_CODE=en-US
```

**For API Key (Development Only):**
```bash
# Google Cloud API Key (less secure, for development only)
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here

# Speech-to-Text configuration
SPEECH_TO_TEXT_LANGUAGE_CODE=en-US
```

### Step 5: Verify Setup

Test your Speech-to-Text configuration:

```bash
# Using Node.js
node -e "
const speech = require('@google-cloud/speech').v1p1beta1;
const client = new speech.SpeechClient();
console.log('Speech-to-Text client initialized successfully!');
"
```

**Note**: We use `v1p1beta1` version which includes `result-end-time` for better streaming support.

---

## Google Gemini API Setup

### Prerequisites

- Google AI Studio account
- API access enabled

### Step 1: Get API Access

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Accept the terms of service if prompted

### Step 2: Create API Key

1. Click "Get API Key" or "Create API Key"
2. Select your Google Cloud project (or create a new one)
3. Click "Create API Key in existing project" or "Create API Key in new project"
4. Copy the generated API key
5. **Important**: Store this key securely and never commit it to version control!

### Step 3: Configure Environment Variables

Add to your `.env` file:

```bash
# Google Gemini API Key
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key_here

# Gemini model to use (default: gemini-2.0-flash-exp)
GEMINI_MODEL=gemini-2.0-flash-exp
```

### Available Gemini Models

- `gemini-2.0-flash-exp` - Fast, efficient model (recommended for production)
- `gemini-2.5-flash` - Latest generation with improved performance
- `gemini-1.5-flash` - Previous generation fast model
- `gemini-1.5-pro` - More capable but slower model

**Recommendation**: Use `gemini-2.0-flash-exp` or `gemini-2.5-flash` for the best balance of speed and accuracy.

### Structured Output with JSON Schema

The CatchUp voice notes feature uses Gemini's structured output capability to ensure consistent entity extraction. This is configured using the `responseSchema` parameter:

```javascript
const { GoogleGenAI, Type } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash-exp',
  contents: transcriptText,
  config: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        fields: {
          type: Type.OBJECT,
          properties: {
            phone: { type: Type.STRING, nullable: true },
            email: { type: Type.STRING, nullable: true },
            location: { type: Type.STRING, nullable: true }
          }
        },
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '1-3 word tags describing interests'
        },
        groups: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ['fields', 'tags', 'groups']
    }
  }
});

const entities = JSON.parse(response.text.trim());
```

This ensures the API always returns valid JSON matching your expected structure.

### Step 4: Verify Setup

Test your Gemini API configuration:

```bash
# Using Node.js
node -e "
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
console.log('Gemini API client initialized successfully!');
"
```

---

## Environment Variables

### Complete Voice Notes Configuration

Add these variables to your `.env` file:

```bash
# ============================================
# Google Cloud Speech-to-Text Configuration
# ============================================

# Option 1: Service Account (Recommended for Production)
# Path to your service account JSON file
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/google-service-account.json

# Option 2: API Key (Development Only)
# GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here

# Speech-to-Text Settings
SPEECH_TO_TEXT_LANGUAGE_CODE=en-US
# Supported language codes:
# - en-US (English - United States)
# - en-GB (English - United Kingdom)
# - es-ES (Spanish - Spain)
# - fr-FR (French - France)
# - de-DE (German - Germany)
# - ja-JP (Japanese - Japan)
# - zh-CN (Chinese - Simplified)
# See full list: https://cloud.google.com/speech-to-text/docs/languages

# ============================================
# Google Gemini API Configuration
# ============================================

# Gemini API Key (Required)
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key_here

# Gemini Model Selection
GEMINI_MODEL=gemini-2.0-flash-exp
# Options:
# - gemini-2.0-flash-exp (Recommended: Fast and efficient)
# - gemini-1.5-flash (Previous generation)
# - gemini-1.5-pro (More capable, slower)

# ============================================
# WebSocket Configuration
# ============================================

# WebSocket server port (default: same as HTTP server)
# WS_PORT=3000

# WebSocket path for voice notes
# WS_VOICE_NOTES_PATH=/ws/voice-notes

# ============================================
# Voice Notes Storage (Optional)
# ============================================

# If you want to store audio files (not required for transcription-only)
# VOICE_NOTES_STORAGE_BUCKET=your-s3-bucket-name
# VOICE_NOTES_STORAGE_REGION=us-east-1
```

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes* | - | Path to Google Cloud service account JSON file |
| `GOOGLE_CLOUD_API_KEY` | Yes* | - | Google Cloud API key (alternative to service account) |
| `SPEECH_TO_TEXT_LANGUAGE_CODE` | No | `en-US` | Language code for speech recognition |
| `GOOGLE_GEMINI_API_KEY` | Yes | - | Google Gemini API key for entity extraction |
| `GEMINI_MODEL` | No | `gemini-2.0-flash-exp` | Gemini model to use |

*Either `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CLOUD_API_KEY` is required, but not both.

---

## WebSocket Configuration

### Server Setup

The voice notes feature uses WebSocket for real-time audio streaming and transcription updates.

**Default Configuration:**
- WebSocket runs on the same port as the HTTP server (default: 3000)
- WebSocket path: `/ws/voice-notes/:sessionId`
- Connection URL: `ws://localhost:3000/ws/voice-notes/:sessionId`

### Client Connection

**JavaScript Example:**
```javascript
// Create a recording session first
const response = await fetch('/api/voice-notes/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user-id', languageCode: 'en-US' })
});
const { sessionId } = await response.json();

// Connect to WebSocket
const ws = new WebSocket(`ws://localhost:3000/ws/voice-notes/${sessionId}`);

// Handle connection open
ws.onopen = () => {
  console.log('WebSocket connected');
};

// Handle incoming messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'interim_transcript':
      console.log('Interim:', message.text);
      break;
    case 'final_transcript':
      console.log('Final:', message.text);
      break;
    case 'status_change':
      console.log('Status:', message.status);
      break;
    case 'error':
      console.error('Error:', message.message);
      break;
  }
};

// Send audio chunks
function sendAudioChunk(audioData) {
  ws.send(JSON.stringify({
    type: 'audio_chunk',
    data: btoa(String.fromCharCode(...new Uint8Array(audioData)))
  }));
}

// Close connection
ws.close();
```

### Production Considerations

**For Production Deployment:**

1. **Use WSS (Secure WebSocket)**
   ```javascript
   const ws = new WebSocket(`wss://your-domain.com/ws/voice-notes/${sessionId}`);
   ```

2. **Configure Reverse Proxy (nginx)**
   ```nginx
   location /ws/ {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_read_timeout 86400;
   }
   ```

3. **Load Balancer Configuration**
   - Enable sticky sessions (session affinity)
   - Increase timeout for WebSocket connections
   - Configure health checks to exclude WebSocket endpoints

---

## Testing the Setup

### 1. Test Speech-to-Text API

Create a test file `test-speech.js`:

```javascript
// Use v1p1beta1 for streaming support with result-end-time
const speech = require('@google-cloud/speech').v1p1beta1;

async function testSpeechToText() {
  try {
    const client = new speech.SpeechClient();
    
    // Test streaming configuration
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US'
    };
    
    const request = {
      config: config,
      interimResults: true
    };
    
    console.log('Testing Speech-to-Text API...');
    
    // Create a streaming recognition request
    const recognizeStream = client.streamingRecognize(request);
    
    recognizeStream.on('error', (err) => {
      if (err.code === 7) {
        console.error('✗ Permission denied. Check your credentials.');
      } else if (err.code === 16) {
        console.error('✗ Authentication failed. Check your API key or service account.');
      } else {
        console.error('✗ Error:', err.message);
      }
    });
    
    recognizeStream.on('data', (data) => {
      console.log('✓ Speech-to-Text API is working!');
      console.log('Received data:', data);
    });
    
    // Close the stream after a short delay
    setTimeout(() => {
      recognizeStream.end();
      console.log('✓ Speech-to-Text streaming API is accessible');
    }, 1000);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

testSpeechToText();
```

Run the test:
```bash
node test-speech.js
```

### 2. Test Gemini API with Structured Output

Create a test file `test-gemini.js`:

```javascript
const { GoogleGenAI, Type } = require('@google/genai');

async function testGeminiAPI() {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY
    });
    
    console.log('Testing Gemini API with structured output...');
    
    // Test structured JSON output
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
      contents: 'Extract information: John loves hiking and lives in Seattle.',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'The person\'s name'
            },
            interests: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of interests'
            },
            location: {
              type: Type.STRING,
              description: 'Location or city'
            }
          },
          required: ['name', 'interests', 'location']
        }
      }
    });
    
    const jsonStr = response.text.trim();
    const parsed = JSON.parse(jsonStr);
    
    console.log('✓ Gemini API is working with structured output');
    console.log('Parsed response:', JSON.stringify(parsed, null, 2));
    
  } catch (error) {
    if (error.message.includes('API_KEY_INVALID')) {
      console.error('✗ Invalid API key. Check your GOOGLE_GEMINI_API_KEY.');
    } else if (error.message.includes('quota')) {
      console.error('✗ Quota exceeded. Check your API usage limits.');
    } else {
      console.error('✗ Error:', error.message);
    }
  }
}

testGeminiAPI();
```

Run the test:
```bash
node test-gemini.js
```

**Expected Output:**
```json
{
  "name": "John",
  "interests": ["hiking"],
  "location": "Seattle"
}
```

### 3. Test Complete Voice Notes Flow

Use the provided test endpoints:

```bash
# 1. Create a recording session
curl -X POST http://localhost:3000/api/voice-notes/sessions \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id", "languageCode": "en-US"}'

# Response: {"sessionId": "session-abc123", ...}

# 2. Connect to WebSocket (use a WebSocket client)
# ws://localhost:3000/ws/voice-notes/session-abc123

# 3. Send audio chunks via WebSocket
# (See client connection example above)

# 4. Finalize the voice note
curl -X POST http://localhost:3000/api/voice-notes/session-abc123/finalize \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'
```

### 4. Integration Test Script

Run the full integration test:

```bash
npm run test:integration
```

Or test specific voice notes functionality:

```bash
npm test -- voice-note-service.test.ts
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Could not load the default credentials"

**Problem**: Service account credentials not found.

**Solutions**:
- Verify `GOOGLE_APPLICATION_CREDENTIALS` points to the correct file path
- Use absolute path, not relative path
- Check file permissions (should be readable)
- Ensure the JSON file is valid

```bash
# Verify file exists
ls -la $GOOGLE_APPLICATION_CREDENTIALS

# Check file contents (should be valid JSON)
cat $GOOGLE_APPLICATION_CREDENTIALS | jq .
```

#### 2. "API key not valid"

**Problem**: Invalid or restricted API key.

**Solutions**:
- Verify the API key is correct (no extra spaces)
- Check API key restrictions in Google Cloud Console
- Ensure Speech-to-Text API is enabled for your project
- Try creating a new API key

#### 3. "Permission denied" or "403 Forbidden"

**Problem**: Service account lacks necessary permissions.

**Solutions**:
- Grant "Cloud Speech-to-Text API User" role to service account
- Verify billing is enabled on your GCP project
- Check API is enabled: `gcloud services list --enabled`

```bash
# Grant role to service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/speech.client"
```

#### 4. "Quota exceeded"

**Problem**: API usage limits reached.

**Solutions**:
- Check quota usage in Google Cloud Console
- Request quota increase if needed
- Implement rate limiting in your application
- Consider upgrading your billing plan

#### 5. "WebSocket connection failed"

**Problem**: Cannot establish WebSocket connection.

**Solutions**:
- Verify server is running: `curl http://localhost:3000/health`
- Check firewall rules allow WebSocket connections
- Ensure reverse proxy is configured correctly for WebSocket
- Try connecting directly without proxy

```bash
# Test WebSocket connection
npm install -g wscat
wscat -c ws://localhost:3000/ws/voice-notes/test-session
```

#### 6. "Gemini API error: Invalid JSON"

**Problem**: Response from Gemini API is not valid JSON.

**Solutions**:
- This is usually a transient error, retry the request
- Check if you're using the correct model name
- Verify your API key has access to the specified model
- Try a different model (e.g., `gemini-1.5-flash`)

#### 7. "Audio encoding error"

**Problem**: Audio format not supported.

**Solutions**:
- Ensure audio is LINEAR16 format at 16000 Hz
- Check MediaRecorder configuration in frontend
- Verify audio chunks are properly base64 encoded
- Test with a known-good audio file

```javascript
// Request microphone access
const constraints = {
  audio: {
    channelCount: 1,
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true
  }
};

try {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  
  // Configure MediaRecorder
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 16000
  });
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      // Send audio chunk to server
      sendAudioChunk(event.data);
    }
  };
  
  // Start recording with 100ms chunks
  mediaRecorder.start(100);
  
} catch (error) {
  if (error.name === 'NotAllowedError') {
    console.error('Microphone permission denied');
  } else if (error.name === 'NotFoundError') {
    console.error('No microphone found');
  } else {
    console.error('Error accessing microphone:', error);
  }
}
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Add to .env
DEBUG=catchup:voice:*
LOG_LEVEL=debug

# Run with debug output
npm run dev
```

### Getting Help

If you continue to experience issues:

1. Check the [Google Cloud Speech-to-Text documentation](https://cloud.google.com/speech-to-text/docs)
2. Check the [Google Gemini API documentation](https://ai.google.dev/docs)
3. Review application logs for detailed error messages
4. Check the [CatchUp GitHub issues](https://github.com/your-org/catchup/issues)
5. Contact support with:
   - Error messages from logs
   - Steps to reproduce the issue
   - Environment details (OS, Node version, etc.)

### Useful Commands

```bash
# Check Node.js version
node --version

# Check npm packages
npm list @google-cloud/speech @google/generative-ai

# Test database connection
npm run db:test

# Run all tests
npm test

# Check for security vulnerabilities
npm audit

# Update dependencies
npm update
```

---

## Production Checklist

Before deploying to production:

- [ ] Service account credentials configured (not API key)
- [ ] Credentials stored in secure secret manager (not in .env file)
- [ ] Speech-to-Text API enabled and billing configured
- [ ] Gemini API key valid and quota sufficient
- [ ] WebSocket using WSS (secure WebSocket)
- [ ] Reverse proxy configured for WebSocket
- [ ] Rate limiting implemented
- [ ] Error handling and retry logic in place
- [ ] Monitoring and alerting configured
- [ ] Logs configured to exclude sensitive data
- [ ] Backup strategy for voice note data
- [ ] GDPR compliance for voice recordings
- [ ] User consent for voice recording obtained

---

## Additional Resources

### Documentation Links

- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

### Code Examples

- [Speech-to-Text Streaming Example](https://github.com/googleapis/nodejs-speech/blob/main/samples/recognize.v1p1beta1.js)
- [Gemini API Quickstart](https://ai.google.dev/tutorials/node_quickstart)
- [WebSocket Server Example](https://github.com/websockets/ws#simple-server)

### Support

- Google Cloud Support: https://cloud.google.com/support
- Google AI Studio: https://makersuite.google.com/
- CatchUp Documentation: See `docs/` directory
