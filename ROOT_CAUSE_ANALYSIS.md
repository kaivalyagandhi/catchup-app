# Root Cause Analysis: Missing Live Enrichments

## Summary
Enrichment suggestions are not appearing in real-time during voice recording because **the Google Cloud Speech-to-Text API is timing out**, which prevents transcription from working, which prevents enrichment analysis from being triggered.

## The Problem Chain

```
Audio chunks sent → Transcription stream created → API timeout (408) → No transcripts → No enrichment analysis → No enrichment suggestions
```

## Root Cause: Google Cloud Speech-to-Text API Timeout

**Error observed in server logs:**
```
code: 2,
details: '408:Request Timeout',
```

This is a 408 Request Timeout error from Google's Speech-to-Text API, which means:
- The transcription stream is being created successfully
- Audio chunks are being sent to the stream
- But Google's API is not responding within the timeout period

## Why This Happens

The timeout could be caused by:

1. **Invalid or Expired API Key**
   - The `GOOGLE_CLOUD_API_KEY` in `.env` might be invalid
   - The API key might not have the Speech-to-Text API enabled
   - The API key might have expired or been revoked

2. **Speech-to-Text API Not Enabled**
   - The Google Cloud project might not have the Speech-to-Text API enabled
   - Check: https://console.cloud.google.com/apis/library/speech.googleapis.com

3. **Quota or Billing Issues**
   - The API key might have hit its quota limit
   - The Google Cloud project might not have billing enabled

4. **Network/Connectivity Issues**
   - Firewall blocking Google Cloud APIs
   - DNS resolution issues

## How to Fix

### Step 1: Verify API Key Configuration

Check your `.env` file:
```bash
grep GOOGLE_CLOUD_API_KEY .env
```

You should see:
```
GOOGLE_CLOUD_API_KEY=AIzaSy...
```

### Step 2: Verify Speech-to-Text API is Enabled

1. Go to https://console.cloud.google.com/
2. Select your project
3. Go to APIs & Services → Library
4. Search for "Speech-to-Text"
5. Click on it and verify it says "API is enabled"

### Step 3: Test the API Key

Run this test to verify the API key works:

```bash
curl -X POST \
  "https://speech.googleapis.com/v1/speech:recognize?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "encoding": "LINEAR16",
      "sampleRateHertz": 16000,
      "languageCode": "en-US"
    },
    "audio": {
      "content": ""
    }
  }'
```

If you get a 400 error about empty audio, that's OK - it means the API key is valid.
If you get a 401 or 403 error, the API key is invalid.

### Step 4: Check Billing

1. Go to https://console.cloud.google.com/billing
2. Verify your project has an active billing account
3. Check that you haven't exceeded your quota

### Step 5: Regenerate API Key (if needed)

If the API key is invalid:

1. Go to https://console.cloud.google.com/apis/credentials
2. Find your API key
3. Delete it
4. Create a new API key
5. Update `.env` with the new key
6. Restart the server

## Verification

Once you've fixed the API key issue:

1. Restart the server: `npm run dev`
2. Record a voice note
3. Check server logs for:
   ```
   [VoiceNoteService] Received audio chunk for session
   [VoiceNoteService] Sending audio chunk to transcription stream
   Stream stream-XXX - Interim: ...
   Stream stream-XXX - Final: ...
   [VoiceNoteService] Final result received for session
   [EnrichmentAnalysis] Session: analyzing
   ```

4. Check browser console for:
   ```
   WebSocket message received: interim_transcript
   WebSocket message received: final_transcript
   [VoiceNotes] handleEnrichmentUpdate called
   ```

## Expected Flow (After Fix)

```
1. User starts recording
2. Audio chunks sent to server
3. Server sends to Google Speech-to-Text API
4. API returns interim transcripts → sent to client → displayed in UI
5. API returns final transcripts → sent to client → displayed in UI
6. Final transcript triggers enrichment analysis
7. Enrichment analyzer disambiguates contacts
8. Entity extraction identifies information
9. Suggestions generated and emitted
10. Client receives enrichment_update → displays in enrichment panel
```

## Current Status

- ✅ WebSocket connection working
- ✅ Session creation working
- ✅ Audio chunks being received by server
- ✅ Audio chunks being sent to transcription stream
- ❌ **Google Speech-to-Text API timing out**
- ❌ No transcripts being generated
- ❌ No enrichment analysis being triggered
- ❌ No enrichment suggestions appearing

## Next Steps

1. Verify your Google Cloud API key is valid and has Speech-to-Text enabled
2. Check billing and quota
3. Regenerate API key if needed
4. Restart server and test again
5. Check logs for transcription results
6. Once transcription works, enrichment will automatically work
