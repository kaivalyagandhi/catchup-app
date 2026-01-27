# Voice Notes Architecture

## Overview

The voice notes feature enables users to record audio notes about their contacts, which are automatically transcribed and enriched with structured metadata. The system uses a real-time streaming architecture with WebSocket communication, Google Cloud Speech-to-Text for transcription, and Google Gemini for entity extraction.

## Architecture Components

### Frontend Components (Client-Side)

#### 1. AudioManager (`public/js/audio-manager.js`)
**Purpose**: Manages audio capture with pause/resume and level detection

**Key Responsibilities**:
- MediaRecorder wrapper with state management
- Audio chunk buffering and streaming
- Real-time audio level detection
- Silence detection and timeout handling
- Clipping and low-level warnings

**State Management**:
```javascript
state: 'inactive' | 'recording' | 'paused'
```

**Configuration Options**:
- `sampleRate`: 16000 Hz (required for Google Speech-to-Text)
- `chunkIntervalMs`: 100ms (streaming interval)
- `maxBufferSizeBytes`: 100MB buffer limit
- `silenceThresholdDb`: -50dB (silence detection)
- `silenceTimeoutMs`: 3000ms (auto-pause timeout)

**Key Methods**:
- `start()`: Initialize microphone and start recording
- `pause()`: Pause recording (maintains session)
- `resume()`: Resume recording from pause
- `stop()`: Stop recording and finalize
- `getElapsedTime()`: Get recording duration
- `getCurrentLevel()`: Get current audio level in dB

**Event Callbacks**:
- `onAudioChunk(chunk)`: Fired when audio chunk is ready for streaming
- `onLevelChange(level)`: Fired when audio level changes
- `onSilenceDetected()`: Fired when silence timeout is reached
- `onClippingDetected()`: Fired when audio is clipping
- `onLowLevelDetected()`: Fired when audio level is too low

**Audio Processing**:
- Uses Web Audio API for level analysis
- Converts audio to LINEAR16 PCM format at 16kHz
- Buffers chunks for efficient streaming
- Monitors buffer size to prevent memory issues

#### 2. TranscriptManager (`public/js/transcript-manager.js`)
**Purpose**: Manages transcript state with interim/final text handling

**Key Responsibilities**:
- Segment-based transcript management
- Interim and final text differentiation
- Pause marker insertion
- Word counting and confidence tracking
- Timestamp management

**Data Structure**:
```javascript
{
  segments: [
    {
      id: 'final-0',
      text: 'Hello world',
      isFinal: true,
      confidence: 0.95,
      timestamp: 1234567890,
      isPauseMarker: false
    },
    {
      id: 'interim-1',
      text: 'this is',
      isFinal: false,
      confidence: 0.85,
      timestamp: 1234567891,
      isPauseMarker: false
    }
  ],
  currentInterim: { ... },
  wordCount: 2,
  lastFinalizedAt: 1234567890
}
```

**Key Methods**:
- `addInterimText(text, confidence)`: Add temporary transcript text
- `finalizeText(text, confidence)`: Convert interim to final text
- `insertPauseMarker()`: Add pause indicator in transcript
- `getFinalTranscript()`: Get only finalized text
- `getFullTranscript()`: Get final + interim text
- `clear()`: Reset transcript state

**Segment Types**:
- **Interim segments**: Temporary, may change as speech continues
- **Final segments**: Confirmed, won't change
- **Pause markers**: Visual indicators of recording pauses

#### 3. EnrichmentPanel (`public/js/enrichment-panel.js`)
**Purpose**: Displays progressive enrichment suggestions during recording

**Key Responsibilities**:
- Real-time suggestion display
- Grouping by type (tags, groups, fields)
- Confidence indicators
- Animation for new/updated suggestions
- Multi-contact support

**Suggestion Types**:
```javascript
{
  id: 'unique-id',
  type: 'tag' | 'group' | 'field' | 'note',
  value: 'suggestion value',
  confidence: 0.85,
  contactName: 'John Doe',
  contactId: 'contact-123'
}
```

**Key Methods**:
- `show()`: Display the enrichment panel
- `hide()`: Hide the enrichment panel
- `updateSuggestions(suggestions)`: Update with new suggestions
- `clear()`: Clear all suggestions
- `render()`: Re-render the panel

**Visual Features**:
- Confidence bars (color-coded by confidence level)
- New item animations (fade-in effect)
- Merged item animations (highlight when confidence changes)
- Grouped display by suggestion type
- Contact name badges for multi-contact notes

### Backend Services (Server-Side)

#### 4. TranscriptionService (`src/voice/transcription-service.ts`)
**Purpose**: Handles real-time audio transcription using Google Cloud Speech-to-Text API

**Key Responsibilities**:
- Streaming recognition with Google Speech-to-Text
- Interim and final result handling
- Automatic reconnection with exponential backoff
- Audio buffer management during reconnection
- Stream lifecycle management

**Configuration**:
```typescript
{
  encoding: LINEAR16,
  sampleRateHertz: 16000,
  languageCode: 'en-US',
  interimResults: true,
  enableAutomaticPunctuation: true,
  model: 'latest_long'
}
```

**Key Methods**:
- `startStream(config)`: Start new streaming recognition session
- `sendAudioChunk(streamId, audioChunk)`: Send audio data to Google
- `stopStream(streamId)`: Stop streaming and finalize
- `reconnectStream(streamId)`: Reconnect after error with buffered audio

**Reconnection Strategy**:
- Max retries: 3
- Initial delay: 1000ms
- Max delay: 10000ms
- Backoff multiplier: 2
- Buffers audio during reconnection to prevent data loss

**Event Handlers**:
- `onInterimResult(result)`: Fired for interim transcripts
- `onFinalResult(result)`: Fired for final transcripts
- `onError(error)`: Fired on transcription errors
- `onReconnecting(attempt)`: Fired when reconnecting
- `onReconnected()`: Fired when reconnection succeeds

#### 5. EntityExtractionService (`src/voice/entity-extraction-service.ts`)
**Purpose**: Extracts structured contact metadata from transcripts using Google Gemini

**Key Responsibilities**:
- Structured JSON output using Gemini's responseSchema
- Context-aware extraction based on known contacts
- Multi-contact support for group voice notes
- Field validation and normalization

**Extraction Schema**:
```typescript
{
  fields: {
    email?: string,
    phone?: string,
    linkedin?: string,
    instagram?: string,
    x_handle?: string,
    location?: string,
    company?: string,
    job_title?: string,
    birthday?: string
  },
  tags: string[],
  groups: string[],
  notes?: string,
  lastContactDate?: string
}
```

**Key Methods**:
- `extractForContact(transcript, contact)`: Extract for known contact
- `extractGeneric(transcript)`: Extract without contact context
- `extractWithContactContext(transcript, contacts)`: Extract with contact list
- `extractForMultipleContacts(transcript, contacts)`: Extract for group notes

**Extraction Modes**:
1. **Known Contact**: Uses contact info for context-aware extraction
2. **Generic**: Performs extraction without contact context
3. **Contact Context**: Uses contact list to improve name matching
4. **Multi-Contact**: Processes each contact separately

**Gemini Integration**:
- Uses `gemini-1.5-flash` model for fast extraction
- Structured output with `responseSchema` for reliable JSON
- Handles API errors with fallback to empty entities
- Validates extracted data before returning

#### 6. ContactDisambiguationService (`src/voice/contact-disambiguation-service.ts`)
**Purpose**: Identifies which contacts are mentioned in voice note transcripts

**Key Responsibilities**:
- Multi-contact identification
- Fuzzy name matching with Levenshtein distance
- Partial match support for user review
- Fallback to manual selection

**Matching Strategy**:
```typescript
{
  EXACT_MATCH_THRESHOLD: 0.65,    // Auto-match confidence
  PARTIAL_MATCH_THRESHOLD: 0.45,  // Show for review
  MAX_CANDIDATES: 3                // Max partial matches
}
```

**Key Methods**:
- `disambiguate(transcript, contacts)`: Identify all mentioned contacts
- `identifyContactNames(transcript)`: Extract person names using Gemini
- `fuzzyMatchContact(name, contacts)`: Match name to contact list
- `calculateSimilarity(name1, name2)`: Levenshtein distance calculation

**Result Types**:
```typescript
{
  matches: Contact[],              // High confidence matches
  partialMatches: PartialMatch[],  // Need user review
  unmatchedNames: string[]         // No matches found
}
```

**Matching Algorithm**:
1. Extract person names from transcript using Gemini
2. For each name, calculate similarity to all contacts
3. Exact match (>0.65): Auto-select contact
4. Partial match (0.45-0.65): Show candidates for review
5. No match (<0.45): Prompt for manual selection

#### 7. EnrichmentService (`src/voice/enrichment-service.ts`)
**Purpose**: Orchestrates generation and application of enrichment proposals

**Key Responsibilities**:
- Generate enrichment proposals from extracted entities
- Apply accepted enrichment items with transaction management
- Create/associate tags with contacts
- Create/assign groups to contacts
- Update contact fields with validation

**Proposal Structure**:
```typescript
{
  voiceNoteId: string,
  contactProposals: [
    {
      contactId: string | null,
      contactName: string,
      items: [
        {
          id: string,
          type: 'tag' | 'group' | 'field' | 'note',
          value: any,
          confidence: number,
          applied: boolean
        }
      ]
    }
  ],
  requiresContactSelection: boolean
}
```

**Key Methods**:
- `generateProposal(entities, contacts)`: Create enrichment proposal
- `applyEnrichment(proposal, acceptedItems)`: Apply accepted items
- `applyContactEnrichment(contactId, items)`: Apply items to one contact
- `deduplicateItems(items)`: Remove duplicate suggestions

**Transaction Management**:
- Uses database transactions for atomic updates
- Rolls back on any error during application
- Validates all data before applying
- Logs all enrichment operations

#### 8. VoiceNoteWebSocketHandler (`src/voice/websocket-handler.ts`)
**Purpose**: Provides real-time communication for voice note recording sessions

**Key Responsibilities**:
- WebSocket connection management
- Audio streaming from client to server
- Transcript update broadcasting
- Status change notifications
- Error handling and reconnection

**Message Types**:
```typescript
// Client -> Server
START_SESSION, AUDIO_CHUNK, PAUSE_SESSION, 
RESUME_SESSION, END_SESSION, CANCEL_SESSION

// Server -> Client
SESSION_STARTED, INTERIM_TRANSCRIPT, FINAL_TRANSCRIPT,
ENRICHMENT_UPDATE, STATUS_CHANGE, ERROR,
RECONNECTING, RECONNECTED, SESSION_FINALIZED
```

**Connection Flow**:
1. Client connects with user ID
2. Client sends START_SESSION
3. Server creates voice note session
4. Client streams AUDIO_CHUNK messages
5. Server broadcasts INTERIM_TRANSCRIPT updates
6. Server broadcasts FINAL_TRANSCRIPT updates
7. Server broadcasts ENRICHMENT_UPDATE suggestions
8. Client sends END_SESSION
9. Server finalizes and sends SESSION_FINALIZED

**Key Methods**:
- `handleClientMessage(ws, data)`: Process client messages
- `broadcastToSession(sessionId, message)`: Send to session client
- `handleStartSession(ws, data)`: Initialize recording session
- `handleAudioChunk(ws, data)`: Process audio data
- `handleEndSession(ws, data)`: Finalize recording

## Data Flow

### Recording Flow

```
1. User clicks "Record"
   ↓
2. AudioManager.start()
   - Request microphone access
   - Initialize MediaRecorder
   - Start audio level monitoring
   ↓
3. AudioManager captures audio chunks (100ms intervals)
   ↓
4. Audio chunks sent via WebSocket (AUDIO_CHUNK)
   ↓
5. Server receives chunks → TranscriptionService
   ↓
6. TranscriptionService streams to Google Speech-to-Text
   ↓
7. Google returns interim results
   ↓
8. Server broadcasts INTERIM_TRANSCRIPT via WebSocket
   ↓
9. TranscriptManager.addInterimText()
   - Update UI with interim text
   ↓
10. Google returns final results
    ↓
11. Server broadcasts FINAL_TRANSCRIPT via WebSocket
    ↓
12. TranscriptManager.finalizeText()
    - Convert interim to final
    - Update word count
```

### Enrichment Flow

```
1. Final transcript received
   ↓
2. EntityExtractionService.extractWithContactContext()
   - Send transcript + contact list to Gemini
   - Receive structured entities (tags, groups, fields)
   ↓
3. EnrichmentService.generateProposal()
   - Create enrichment items from entities
   - Calculate confidence scores
   - Deduplicate suggestions
   ↓
4. Server broadcasts ENRICHMENT_UPDATE via WebSocket
   ↓
5. EnrichmentPanel.updateSuggestions()
   - Display suggestions grouped by type
   - Show confidence indicators
   - Animate new items
   ↓
6. User reviews and accepts/rejects suggestions
   ↓
7. Client sends accepted items to server
   ↓
8. EnrichmentService.applyEnrichment()
   - Validate all items
   - Apply in database transaction
   - Create tags, groups, update fields
   - Rollback on error
```

### Pause/Resume Flow

```
1. User clicks "Pause"
   ↓
2. AudioManager.pause()
   - Stop MediaRecorder
   - Record pause timestamp
   ↓
3. Client sends PAUSE_SESSION via WebSocket
   ↓
4. Server pauses transcription stream
   ↓
5. TranscriptManager.insertPauseMarker()
   - Add visual pause indicator
   ↓
6. User clicks "Resume"
   ↓
7. AudioManager.resume()
   - Restart MediaRecorder
   - Update elapsed time calculation
   ↓
8. Client sends RESUME_SESSION via WebSocket
   ↓
9. Server resumes transcription stream
   ↓
10. Recording continues from where it left off
```

## WebSocket Communication Protocol

### Message Format
```typescript
{
  type: WSMessageType,
  data: {
    // Message-specific data
  }
}
```

### Client Messages

#### START_SESSION
```typescript
{
  type: 'start_session',
  data: {
    contactId?: string,  // Optional: pre-selected contact
    contactIds?: string[] // Optional: multiple contacts
  }
}
```

#### AUDIO_CHUNK
```typescript
{
  type: 'audio_chunk',
  data: {
    sessionId: string,
    chunk: ArrayBuffer,  // LINEAR16 PCM audio data
    timestamp: number
  }
}
```

#### PAUSE_SESSION / RESUME_SESSION / END_SESSION
```typescript
{
  type: 'pause_session' | 'resume_session' | 'end_session',
  data: {
    sessionId: string
  }
}
```

### Server Messages

#### SESSION_STARTED
```typescript
{
  type: 'session_started',
  data: {
    sessionId: string,
    voiceNoteId: string
  }
}
```

#### INTERIM_TRANSCRIPT
```typescript
{
  type: 'interim_transcript',
  data: {
    text: string,
    confidence: number,
    timestamp: number
  }
}
```

#### FINAL_TRANSCRIPT
```typescript
{
  type: 'final_transcript',
  data: {
    text: string,
    confidence: number,
    timestamp: number
  }
}
```

#### ENRICHMENT_UPDATE
```typescript
{
  type: 'enrichment_update',
  data: {
    suggestions: EnrichmentItem[],
    contactName: string,
    contactId: string
  }
}
```

#### ERROR
```typescript
{
  type: 'error',
  data: {
    code: string,
    message: string,
    recoverable: boolean
  }
}
```

## Google Speech-to-Text Integration

### Configuration
- **Encoding**: LINEAR16 (16-bit PCM)
- **Sample Rate**: 16000 Hz
- **Language**: en-US
- **Model**: latest_long (optimized for longer audio)
- **Interim Results**: Enabled
- **Automatic Punctuation**: Enabled

### Streaming Pattern
```typescript
// 1. Create recognition stream
const stream = client.streamingRecognize({
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US',
    interimResults: true
  },
  interimResults: true
});

// 2. Handle results
stream.on('data', (data) => {
  if (data.results[0].isFinal) {
    // Final transcript
  } else {
    // Interim transcript
  }
});

// 3. Send audio chunks
stream.write(audioChunk);

// 4. End stream
stream.end();
```

### Error Handling
- **Network errors**: Automatic reconnection with exponential backoff
- **API errors**: Log and notify client
- **Timeout errors**: Restart stream with buffered audio
- **Rate limit errors**: Queue requests and retry

## Google Gemini Integration

### Entity Extraction Configuration
- **Model**: gemini-1.5-flash (fast, cost-effective)
- **Output**: Structured JSON using responseSchema
- **Temperature**: 0.1 (deterministic output)
- **Max Tokens**: 1000

### Structured Output Schema
```typescript
{
  type: "object",
  properties: {
    fields: {
      type: "object",
      properties: {
        email: { type: "string" },
        phone: { type: "string" },
        linkedin: { type: "string" },
        instagram: { type: "string" },
        x_handle: { type: "string" },
        location: { type: "string" },
        company: { type: "string" },
        job_title: { type: "string" },
        birthday: { type: "string" }
      }
    },
    tags: {
      type: "array",
      items: { type: "string" }
    },
    groups: {
      type: "array",
      items: { type: "string" }
    },
    notes: { type: "string" },
    lastContactDate: { type: "string" }
  }
}
```

### Prompt Engineering
- **Context**: Provide contact information for better extraction
- **Instructions**: Clear, specific extraction guidelines
- **Examples**: Few-shot examples for consistent output
- **Constraints**: Limit tag length, validate field formats

## Performance Considerations

### Audio Streaming
- **Chunk Size**: 100ms intervals (balance latency vs. overhead)
- **Buffer Management**: 100MB max buffer to prevent memory issues
- **Compression**: Use LINEAR16 (no compression) for quality

### Transcription
- **Latency**: ~200-500ms for interim results
- **Accuracy**: Improves with longer audio context
- **Cost**: ~$0.006 per minute of audio

### Entity Extraction
- **Latency**: ~1-2 seconds per extraction
- **Batch Processing**: Extract after final transcript, not interim
- **Cost**: ~$0.00015 per request (1000 tokens)

### WebSocket
- **Connection Pooling**: Reuse connections per user
- **Message Batching**: Batch interim transcripts to reduce overhead
- **Heartbeat**: Ping/pong to detect disconnections

## Error Handling

### Client-Side Errors
- **Microphone Access Denied**: Show permission instructions
- **WebSocket Disconnection**: Auto-reconnect with exponential backoff
- **Audio Level Issues**: Show warnings for silence/clipping
- **Browser Compatibility**: Detect and show unsupported browser message

### Server-Side Errors
- **Transcription Errors**: Retry with exponential backoff
- **API Rate Limits**: Queue requests and retry
- **Database Errors**: Rollback transactions, log errors
- **Validation Errors**: Return clear error messages to client

### Recovery Strategies
- **Transcription Failure**: Buffer audio and retry
- **WebSocket Disconnection**: Reconnect and resume session
- **Enrichment Failure**: Save transcript, allow manual enrichment later
- **Database Failure**: Retry transaction, fallback to partial save

## Testing

### Manual Testing
- **Audio Manager**: `tests/html/audio-manager.test.html`
- **Transcript Manager**: `tests/html/transcript-manager.test.html`
- **Enrichment Panel**: `tests/html/enrichment-panel.test.html`
- **Voice Notes Integration**: `tests/html/voice-notes-integration.test.html`

### Unit Testing
- **TranscriptionService**: Mock Google Speech-to-Text API
- **EntityExtractionService**: Mock Gemini API responses
- **ContactDisambiguationService**: Test fuzzy matching algorithm
- **EnrichmentService**: Test proposal generation and application

### Integration Testing
- **End-to-End Flow**: Record → Transcribe → Extract → Enrich
- **WebSocket Communication**: Test all message types
- **Error Recovery**: Test reconnection and retry logic
- **Multi-Contact**: Test group voice notes

## Related Documentation

- **Voice Notes Feature**: `docs/features/voice-notes/`
- **Google Speech-to-Text Setup**: `docs/features/voice-notes/GOOGLE_SPEECH_SETUP.md`
- **Testing Guide**: `.kiro/steering/testing-guide.md`
- **API Reference**: `docs/API.md` - Voice notes endpoints
- **Examples**: `docs/examples/backend/voice/` - Code examples
