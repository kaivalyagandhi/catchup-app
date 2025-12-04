# Chat Window Voice Recording Fix

## Problem
The chat window had a microphone button, but clicking it didn't actually start voice recording. The button just called empty callbacks without connecting to the actual voice recording system.

## Root Cause
The chat window's `toggleRecording()` method was only updating UI state and calling callbacks, but wasn't actually:
1. Starting the audio manager
2. Connecting to the WebSocket for transcription
3. Processing audio chunks
4. Generating enrichment suggestions

## Solution
Connected the chat window's mic button to the existing `VoiceNoteRecorder` instance that handles all voice recording functionality.

### Changes Made

#### `public/js/chat-window.js`
Modified the `toggleRecording()` method to:
1. Check if `window.voiceNoteRecorder` is available
2. Call `startRecording()` when mic button is clicked
3. Call `stopRecording()` when mic button is clicked again
4. Handle errors gracefully

**Before:**
```javascript
toggleRecording() {
  // Just updated UI and called empty callbacks
  this.onStartRecording();
  this.onStopRecording();
}
```

**After:**
```javascript
async toggleRecording() {
  if (this.isRecording) {
    // Stop recording
    if (window.voiceNoteRecorder) {
      await window.voiceNoteRecorder.stopRecording();
    }
    this.onStopRecording();
  } else {
    // Start recording
    if (window.voiceNoteRecorder) {
      await window.voiceNoteRecorder.startRecording();
    }
    this.onStartRecording();
  }
}
```

## How It Works Now

1. **User clicks mic button in chat window**
   - Chat window calls `window.voiceNoteRecorder.startRecording()`

2. **Voice recording starts**
   - Audio manager requests microphone access
   - PCM processor converts audio to LINEAR16 format
   - Audio chunks are sent to WebSocket

3. **Server receives audio chunks**
   - Transcription stream processes audio
   - Google Cloud Speech-to-Text API transcribes
   - Final transcripts trigger enrichment analysis
   - Enrichment suggestions are emitted

4. **Client receives enrichment updates**
   - WebSocket receives `enrichment_update` messages
   - Enrichment panel displays suggestions in real-time

5. **User stops recording**
   - Chat window calls `window.voiceNoteRecorder.stopRecording()`
   - Voice note is finalized
   - Enrichment is applied

## Testing

1. Open the chat window (floating icon in bottom right)
2. Click the microphone button
3. Say something like: "Emma is moving to San Francisco"
4. Check browser console for:
   ```
   [ChatWindow] Starting voice recording
   [AudioManager] PCM chunk generated: XXXX bytes
   Sending audio chunk: XXXX bytes
   [VoiceNoteService] Received audio chunk
   ```

5. Check server logs for:
   ```
   [VoiceNoteService] Final result received for session
   [EnrichmentAnalysis] Session: analyzing
   [EnrichmentAnalyzer] Disambiguated N contacts
   Emitting N enrichment suggestions
   ```

6. Watch the enrichment panel for suggestions to appear in real-time

## Expected Flow

```
Chat Window Mic Button
    ↓
toggleRecording()
    ↓
window.voiceNoteRecorder.startRecording()
    ↓
AudioManager starts
    ↓
PCM processor generates chunks
    ↓
WebSocket sends audio chunks
    ↓
Server transcribes audio
    ↓
Enrichment analysis triggered
    ↓
Suggestions emitted
    ↓
Client displays enrichments
```

## Notes

- The chat window now uses the same voice recording system as the main voice notes page
- All audio processing, transcription, and enrichment happens through the existing `VoiceNoteRecorder` class
- The fix is minimal and non-invasive - it just connects the UI to the existing functionality

## Next Steps

If enrichments still don't appear after this fix:
1. Check that audio chunks are being generated (look for `[AudioManager] PCM chunk generated` logs)
2. Verify the Google Cloud Speech-to-Text API is working (check server logs for transcription results)
3. Ensure enrichment analysis is being triggered (check for `[EnrichmentAnalysis]` logs)
4. Verify WebSocket is forwarding enrichment updates (check for `[WebSocketHandler] Received enrichment_update` logs)
