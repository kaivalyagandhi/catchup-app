# Voice Note Service

## Overview

The Voice Note Service orchestrates the complete voice note workflow, from real-time audio recording and transcription to contact disambiguation, entity extraction, and enrichment proposal generation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ MediaRecorder    │→ │ WebSocket        │→ │ UI Components │ │
│  │ (Audio Capture)  │  │ Client           │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓ WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                    VoiceNoteWebSocketHandler                     │
│  - Manages WebSocket connections                                 │
│  - Routes messages between client and service                    │
│  - Emits real-time events                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      VoiceNoteService                            │
│  - Orchestrates complete workflow                                │
│  - Manages recording sessions                                    │
│  - Coordinates all sub-services                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Sub-Services                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐│
│  │ Transcription    │  │ Disambiguation   │  │ Extraction    ││
│  │ Service          │→ │ Service          │→ │ Service       ││
│  └──────────────────┘  └──────────────────┘  └───────────────┘│
│           ↓                                           ↓          │
│  ┌──────────────────┐                      ┌─────────────────┐ │
│  │ Google Speech    │                      │ Enrichment      │ │
│  │ to Text API      │                      │ Service         │ │
│  └──────────────────┘                      └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    VoiceNoteRepository                           │
│  - Persists voice notes                                          │
│  - Manages contact associations                                  │
│  - Stores extracted entities                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. VoiceNoteService

Main orchestration service that manages the complete voice note lifecycle.

**Key Methods:**

- `createSession(userId, languageCode)` - Start a new recording session
- `processAudioChunk(sessionId, audioChunk)` - Stream audio for transcription
- `finalizeVoiceNote(sessionId, userContacts)` - Complete processing pipeline
- `cancelSession(sessionId)` - Cancel an active session

**Events Emitted:**

- `interim_transcript` - Real-time transcript updates
- `final_transcript` - Finalized transcript segments
- `status_change` - Session status updates
- `error` - Error notifications
- `reconnecting` - Transcription stream reconnection attempts
- `reconnected` - Successful reconnection

### 2. VoiceNoteWebSocketHandler

WebSocket server that provides real-time communication between client and service.

**Message Types:**

**Client → Server:**
- `start_session` - Initialize recording session
- `audio_chunk` - Stream audio data (binary)
- `end_session` - Finalize voice note
- `cancel_session` - Cancel recording

**Server → Client:**
- `session_started` - Session initialization confirmation
- `interim_transcript` - Live transcription updates
- `final_transcript` - Finalized transcript segments
- `status_change` - Status updates (recording, transcribing, extracting, ready, error)
- `session_finalized` - Complete voice note with enrichment proposal
- `error` - Error messages
- `reconnecting` - Transcription reconnection in progress
- `reconnected` - Transcription reconnected successfully

## Workflow

### 1. Session Creation

```typescript
// Server-side
const session = await voiceNoteService.createSession('user-123', 'en-US');
console.log(`Session ${session.id} started`);
```

### 2. Audio Streaming

```typescript
// Client captures audio and sends chunks
mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    ws.send(event.data); // Send raw audio buffer
  }
};

// Server processes chunks
await voiceNoteService.processAudioChunk(sessionId, audioChunk);
```

### 3. Real-time Transcription

```typescript
// Service emits events as transcription progresses
voiceNoteService.on('interim_transcript', (event) => {
  console.log('Interim:', event.transcript);
  // Display in UI with gray text
});

voiceNoteService.on('final_transcript', (event) => {
  console.log('Final:', event.transcript);
  // Display in UI with black text
});
```

### 4. Finalization

```typescript
// Client ends session
ws.send(JSON.stringify({
  type: 'end_session',
  data: { userContacts }
}));

// Server finalizes voice note
const result = await voiceNoteService.finalizeVoiceNote(sessionId, userContacts);

// Result includes:
// - voiceNote: Persisted voice note record
// - proposal: Multi-contact enrichment proposal
```

## Processing Pipeline

When `finalizeVoiceNote()` is called, the following pipeline executes:

1. **Close Transcription Stream**
   - Finalize any remaining audio
   - Get complete transcript

2. **Contact Disambiguation**
   - Extract person names from transcript using Gemini
   - Fuzzy match names to user's contacts
   - Return matched contacts

3. **Entity Extraction**
   - For each identified contact, extract:
     - Contact fields (phone, email, social media, location)
     - Tags (interests, hobbies)
     - Groups (relationship categories)
     - Last contact date

4. **Enrichment Proposal Generation**
   - Create atomic enrichment items per contact
   - Group by contact for review
   - Mark all items as accepted by default

5. **Persistence**
   - Save voice note to database
   - Associate contacts with voice note
   - Store extracted entities

6. **Return Results**
   - Voice note record
   - Multi-contact enrichment proposal

## Status Flow

```
recording → transcribing → extracting → ready
                                      ↓
                                    applied
                                      ↓
                                    error (if any step fails)
```

## Error Handling

### Transcription Errors

- Automatic reconnection with exponential backoff
- Audio buffering during reconnection
- Graceful degradation to partial transcript

### Disambiguation Failures

- Returns empty contact list
- Triggers manual contact selection UI
- Processing continues with empty contacts

### Extraction Failures

- Returns empty entities
- Allows manual enrichment entry
- Processing continues

### Network Issues

- WebSocket reconnection handled by client
- Session state preserved on server
- Audio buffering prevents data loss

## Integration Example

### Server Setup

```typescript
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { VoiceNoteWebSocketHandler } from './voice/websocket-handler';

const app = express();
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  path: '/ws/voice-notes',
});

// Initialize handler
const wsHandler = new VoiceNoteWebSocketHandler(wss);

server.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('WebSocket: ws://localhost:3000/ws/voice-notes');
});
```

### Client Setup

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/ws/voice-notes?userId=user-123');

// Start session
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'start_session',
    data: { languageCode: 'en-US' }
  }));
};

// Handle messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'session_started':
      startRecording(message.data.sessionId);
      break;
    case 'interim_transcript':
      updateUI(message.data.transcript, false);
      break;
    case 'final_transcript':
      updateUI(message.data.transcript, true);
      break;
    case 'session_finalized':
      showEnrichmentProposal(message.data.proposal);
      break;
  }
};

// Send audio chunks
function sendAudio(audioBuffer) {
  ws.send(audioBuffer);
}

// End session
function stopRecording() {
  ws.send(JSON.stringify({
    type: 'end_session',
    data: { userContacts: [] }
  }));
}
```

## Testing

### Unit Tests

Test individual service methods:

```typescript
describe('VoiceNoteService', () => {
  it('should create a session', async () => {
    const session = await service.createSession('user-123');
    expect(session.id).toBeDefined();
    expect(session.status).toBe('recording');
  });

  it('should process audio chunks', async () => {
    const session = await service.createSession('user-123');
    const audioChunk = Buffer.from('audio data');
    await service.processAudioChunk(session.id, audioChunk);
    // Verify no errors thrown
  });
});
```

### Integration Tests

Test complete workflow:

```typescript
describe('Voice Note Workflow', () => {
  it('should complete end-to-end flow', async () => {
    // Create session
    const session = await service.createSession('user-123');
    
    // Process audio
    const audioChunks = getTestAudioChunks();
    for (const chunk of audioChunks) {
      await service.processAudioChunk(session.id, chunk);
    }
    
    // Finalize
    const result = await service.finalizeVoiceNote(session.id, userContacts);
    
    expect(result.voiceNote.transcript).toBeDefined();
    expect(result.proposal.contactProposals.length).toBeGreaterThan(0);
  });
});
```

## Performance Considerations

### Audio Streaming

- Chunk size: 4KB recommended for optimal latency
- Sample rate: 16kHz for Google Speech-to-Text
- Encoding: LINEAR16 (PCM)

### Transcription

- Interim results: ~200-500ms latency
- Final results: ~1-2s after speech pause
- Reconnection: Exponential backoff (1s, 2s, 4s)

### Memory Management

- Audio buffer: Limited to last 10 seconds
- Session cleanup: Automatic on disconnect
- Event listeners: Removed on session end

## Security

### Authentication

- User ID required for WebSocket connection
- JWT token validation recommended
- Session ownership verification

### Data Privacy

- Transcripts stored encrypted at rest
- Audio not persisted (streaming only)
- Contact data access controlled by user ID

## Requirements Mapping

- **1.1-1.9**: Real-time recording and transcription
- **2.1-2.6**: Multiple contact support
- **3.1-3.6**: Entity extraction for multiple contacts
- **7.7**: Real-time status updates via WebSocket

## Future Enhancements

- [ ] Audio file upload support (non-streaming)
- [ ] Multi-language support with auto-detection
- [ ] Speaker diarization for group conversations
- [ ] Offline recording with sync when online
- [ ] Audio playback from stored voice notes
- [ ] Transcript editing and correction
