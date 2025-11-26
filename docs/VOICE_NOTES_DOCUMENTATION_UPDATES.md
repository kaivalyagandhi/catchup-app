# Voice Notes Documentation Updates - Context7 Integration

## Overview

This document summarizes the updates made to the Voice Notes documentation based on the latest information from Context7 for Google Cloud Speech-to-Text, Google Gemini API, and MediaRecorder API.

## Updated Documentation Files

### 1. docs/VOICE_NOTES_SETUP.md

**Key Updates:**

#### Google Cloud Speech-to-Text
- **Updated to v1p1beta1**: Changed from generic `@google-cloud/speech` to `@google-cloud/speech.v1p1beta1` for better streaming support with `result-end-time`
- **Improved Test Script**: Updated test script to use streaming recognition instead of simple recognition
- **Better Error Handling**: Added specific error codes (7 for permission denied, 16 for authentication failed)

**Code Example:**
```javascript
const speech = require('@google-cloud/speech').v1p1beta1;
const client = new speech.SpeechClient();

const config = {
  encoding: 'LINEAR16',
  sampleRateHertz: 16000,
  languageCode: 'en-US'
};

const request = {
  config: config,
  interimResults: true
};

const recognizeStream = client.streamingRecognize(request);
```

#### Google Gemini API
- **Updated to Google Gen AI SDK**: Changed from deprecated `@google/generative-ai` to `@google/genai`
- **Added Structured Output Documentation**: Comprehensive guide on using `responseSchema` with JSON Schema
- **Type Enum Documentation**: Added documentation for `Type` enum (STRING, NUMBER, ARRAY, OBJECT, etc.)
- **Latest Model Information**: Updated to include `gemini-2.5-flash` as latest generation

**Code Example:**
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
            email: { type: Type.STRING, nullable: true }
          }
        },
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ['fields', 'tags']
    }
  }
});
```

#### MediaRecorder API
- **Added getUserMedia Constraints**: Detailed audio constraints for optimal recording
- **Error Handling**: Added specific error types (NotAllowedError, NotFoundError)
- **Best Practices**: Added recommended settings for echo cancellation and noise suppression

**Code Example:**
```javascript
const constraints = {
  audio: {
    channelCount: 1,
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true
  }
};

const stream = await navigator.mediaDevices.getUserMedia(constraints);

const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 16000
});
```

### 2. docs/VOICE_NOTES_USER_GUIDE.md

**Key Updates:**

#### Browser Compatibility
- **Added MediaRecorder API Support Matrix**: Detailed browser version support
- **Added getUserMedia API Support**: HTTPS requirements and mobile support
- **iOS Safari Notes**: Added note about user interaction requirement

**Updated Browser Support:**
- Chrome 90+ (MediaRecorder since v47)
- Firefox 88+ (MediaRecorder since v25)
- Safari 14.1+ (MediaRecorder since v14.1)
- Edge 90+ (MediaRecorder since v79)

#### Technical Details
- **Audio Constraints**: Documented the specific audio settings used
- **Real-time Streaming**: Explained 100ms chunk intervals
- **HTTPS Requirement**: Clarified production requirements

#### Troubleshooting
- **Enhanced Error Messages**: Added technical details about MediaRecorder errors
- **Browser-Specific Solutions**: Added Edge to browser-specific instructions

### 3. docs/API.md

**Key Updates:**

#### Voice Notes Endpoints
- **WebSocket Documentation**: Added detailed WebSocket event types and examples
- **Streaming Configuration**: Documented real-time transcription flow
- **Status Values**: Clarified all possible status values (recording, transcribing, extracting, ready, applied, error)

#### Suggestions Endpoints
- **Group Suggestions**: Added comprehensive documentation for group suggestions
- **Shared Context**: Documented shared context score structure
- **Remove Contact Endpoint**: Added new endpoint for removing contacts from group suggestions

## Key Technical Improvements

### 1. Speech-to-Text Streaming
- Use `v1p1beta1` for `result-end-time` support
- Implement proper stream lifecycle management
- Handle interim and final results separately

### 2. Gemini Structured Output
- Use `GoogleGenAI` class instead of `GoogleGenerativeAI`
- Define schemas using `Type` enum
- Set `responseMimeType` to `'application/json'`
- Use `responseSchema` for consistent output

### 3. MediaRecorder Best Practices
- Request specific audio constraints
- Enable echo cancellation and noise suppression
- Use 100ms chunks for real-time streaming
- Handle permission errors gracefully

## Migration Notes

### For Developers

If you're updating existing code:

1. **Update Speech-to-Text imports:**
   ```javascript
   // Old
   const speech = require('@google-cloud/speech');
   
   // New
   const speech = require('@google-cloud/speech').v1p1beta1;
   ```

2. **Update Gemini API imports:**
   ```javascript
   // Old
   const { GoogleGenerativeAI } = require('@google/generative-ai');
   
   // New
   const { GoogleGenAI, Type } = require('@google/genai');
   ```

3. **Update Gemini API calls:**
   ```javascript
   // Old
   const genAI = new GoogleGenerativeAI(apiKey);
   const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
   const result = await model.generateContent(prompt);
   
   // New
   const ai = new GoogleGenAI({ apiKey });
   const response = await ai.models.generateContent({
     model: 'gemini-2.0-flash-exp',
     contents: prompt,
     config: { /* ... */ }
   });
   ```

### For Users

No changes required - the updates are backward compatible and improve reliability.

## Testing Recommendations

### 1. Test Speech-to-Text Streaming
```bash
node test-speech.js
```
Expected: Stream connection successful, no authentication errors

### 2. Test Gemini Structured Output
```bash
node test-gemini.js
```
Expected: Valid JSON response matching schema

### 3. Test MediaRecorder in Browser
```javascript
// Open browser console and run:
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log('✓ Microphone access granted'))
  .catch(err => console.error('✗ Error:', err));
```

## Additional Resources

### Official Documentation
- [Google Cloud Speech-to-Text v1p1beta1](https://cloud.google.com/speech-to-text/docs/reference/rpc/google.cloud.speech.v1p1beta1)
- [Google Gen AI SDK](https://googleapis.github.io/js-genai/)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

### Context7 Sources
- Speech-to-Text: `/websites/cloud_google_speech-to-text`
- Gemini API: `/googleapis/js-genai`
- MediaRecorder: `/websites/w3_tr_2025_crd-mediacapture-streams-20251009`

## Changelog

### January 2024
- Updated to Speech-to-Text v1p1beta1
- Migrated to Google Gen AI SDK
- Added structured output documentation
- Enhanced MediaRecorder configuration
- Improved browser compatibility information
- Added detailed troubleshooting guides

---

*Last updated: January 2024*
*Documentation maintained by: CatchUp Development Team*
