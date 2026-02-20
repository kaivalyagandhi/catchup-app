---
inclusion: manual
---

# Voice Notes Architecture

## Overview
Users record audio notes about contacts → real-time transcription via Google Speech-to-Text → entity extraction via Google Gemini → enrichment proposals for contact updates. Communication via WebSocket.

## Frontend Components (`public/js/`)

### AudioManager (`audio-manager.js`)
MediaRecorder wrapper: start/pause/resume/stop, audio level detection, silence detection.
Config: 16kHz sample rate, 100ms chunk interval, 100MB buffer limit, -50dB silence threshold, 3s silence timeout.
Outputs LINEAR16 PCM chunks via `onAudioChunk` callback.

### TranscriptManager (`transcript-manager.js`)
Segment-based transcript state: interim segments (temporary), final segments (confirmed), pause markers.
Key methods: `addInterimText()`, `finalizeText()`, `getFinalTranscript()`, `getFullTranscript()`.

### EnrichmentPanel (`enrichment-panel.js`)
Displays real-time enrichment suggestions grouped by type (tag/group/field/note) with confidence indicators.

## Backend Services (`src/voice/`)

### TranscriptionService (`transcription-service.ts`)
Streaming recognition with Google Speech-to-Text. Config: LINEAR16, 16kHz, en-US, `latest_long` model, interim results enabled.
Auto-reconnection: 3 retries, exponential backoff (1s→10s), buffers audio during reconnection.

### EntityExtractionService (`entity-extraction-service.ts`)
Extracts structured metadata from transcripts using Gemini (`gemini-1.5-flash`, temp 0.1).
Output schema: fields (email, phone, linkedin, company, etc.), tags[], groups[], notes, lastContactDate.
Modes: known contact, generic, contact context list, multi-contact.

### ContactDisambiguationService (`contact-disambiguation-service.ts`)
Identifies mentioned contacts via Gemini name extraction + fuzzy matching (Levenshtein).
Thresholds: >0.65 auto-match, 0.45-0.65 partial (user review), <0.45 unmatched.

### EnrichmentService (`enrichment-service.ts`)
Generates proposals from extracted entities, applies accepted items in DB transactions.
Handles: tag creation/association, group assignment, field updates, notes.

### VoiceNoteWebSocketHandler (`websocket-handler.ts`)
WebSocket at `ws://localhost:3000/ws/voice-notes`, JWT auth via query param.

Client→Server: `start_session`, `audio_chunk`, `pause_session`, `resume_session`, `end_session`, `cancel_session`
Server→Client: `session_started`, `interim_transcript`, `final_transcript`, `enrichment_update`, `status_change`, `error`, `reconnecting`, `reconnected`, `session_finalized`

### VoiceNoteService (`voice-note-service.ts`)
Orchestrates recording sessions: coordinates transcription, entity extraction, disambiguation, and enrichment.

## Data Flow
1. User records → AudioManager captures 100ms chunks → WebSocket `audio_chunk`
2. Server → TranscriptionService → Google Speech-to-Text → interim/final results
3. Server broadcasts `interim_transcript` / `final_transcript` → TranscriptManager updates UI
4. On final transcript → EntityExtractionService → Gemini extracts entities
5. EnrichmentService generates proposals → server broadcasts `enrichment_update`
6. User reviews/accepts → EnrichmentService applies in DB transaction

## Testing
- Manual: `tests/html/audio-manager.test.html`, `transcript-manager.test.html`, `enrichment-panel.test.html`
- Unit: mock Google Speech-to-Text and Gemini APIs
- Property tests: `src/voice/*-properties.test.ts`
