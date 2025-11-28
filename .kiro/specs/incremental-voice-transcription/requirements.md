# Requirements Document

## Introduction

This feature enhances the voice notes recording experience to provide real-time, incremental transcription and enrichment analysis as audio is captured. The system will transcribe audio in segments as they are recorded, display interim and final transcripts dynamically, and progressively analyze content for enrichment suggestions. A persistent, visually prominent recording indicator will ensure users always know when audio capture is active.

## Glossary

- **Incremental Transcription**: The process of transcribing audio in small segments as it is recorded, rather than waiting until recording is complete
- **Interim Transcript**: Temporary transcription text that may change as more audio context becomes available
- **Final Transcript**: Confirmed transcription text that will not change
- **Enrichment Suggestion**: AI-generated proposals to update contact information based on voice note content (tags, notes, interests)
- **Recording Indicator**: A persistent visual element that clearly shows audio recording is in progress
- **Audio Segment**: A chunk of audio data (typically 100-500ms) sent for transcription
- **Streaming Recognition**: Real-time speech-to-text processing that returns results as audio is received

## Requirements

### Requirement 1

**User Story:** As a user, I want to see my speech transcribed in real-time as I record, so that I can verify the system is capturing my words correctly.

#### Acceptance Criteria

1. WHEN audio recording begins THEN the Incremental Transcription System SHALL start streaming audio segments to the transcription service within 500 milliseconds
2. WHEN an audio segment is processed THEN the Incremental Transcription System SHALL display interim transcript text within 1 second of speech
3. WHEN interim transcript text is confirmed THEN the Incremental Transcription System SHALL convert the interim text to final transcript and append it to the transcript display
4. WHEN new interim text arrives THEN the Incremental Transcription System SHALL replace the previous interim text while preserving all final transcript text
5. WHEN the transcription service returns confidence scores THEN the Incremental Transcription System SHALL visually distinguish low-confidence text from high-confidence text

### Requirement 2

**User Story:** As a user, I want enrichment suggestions to appear progressively as I speak, so that I can see the system understanding my content in real-time.

#### Acceptance Criteria

1. WHEN final transcript text accumulates to a meaningful segment (50+ words or natural pause detected) THEN the Enrichment Analysis System SHALL trigger incremental entity extraction
2. WHEN entities are extracted from a transcript segment THEN the Enrichment Analysis System SHALL display preliminary enrichment suggestions in a dedicated panel
3. WHEN additional transcript segments are analyzed THEN the Enrichment Analysis System SHALL merge new suggestions with existing ones and update the display
4. WHEN duplicate or conflicting suggestions are detected THEN the Enrichment Analysis System SHALL consolidate them and show the most confident version
5. WHEN recording ends THEN the Enrichment Analysis System SHALL perform a final comprehensive analysis and present the complete enrichment proposal

### Requirement 3

**User Story:** As a user, I want a clear, persistent visual indicator when recording is active, so that I never accidentally leave the microphone on.

#### Acceptance Criteria

1. WHEN recording starts THEN the Recording Indicator SHALL display a prominent, animated visual element that remains visible regardless of scroll position
2. WHILE recording is active THEN the Recording Indicator SHALL display a pulsing animation and elapsed time counter
3. WHILE recording is active THEN the Recording Indicator SHALL remain fixed at the top or bottom of the viewport
4. WHEN the user navigates away from the voice notes page while recording THEN the Recording Indicator SHALL display a warning and offer to stop recording
5. IF the browser tab loses focus while recording THEN the Recording Indicator SHALL continue recording and display a notification when focus returns

### Requirement 4

**User Story:** As a user, I want to see audio visualization while recording, so that I have confidence the microphone is capturing my voice.

#### Acceptance Criteria

1. WHEN recording is active THEN the Audio Visualization System SHALL display a real-time waveform or frequency visualization
2. WHEN audio input levels change THEN the Audio Visualization System SHALL update the visualization within 50 milliseconds
3. WHEN audio input is silent for more than 3 seconds THEN the Audio Visualization System SHALL display a visual hint suggesting the user speak
4. WHEN audio input levels are too low THEN the Audio Visualization System SHALL display a warning about low microphone volume
5. WHEN audio input levels are clipping THEN the Audio Visualization System SHALL display a warning about audio distortion

### Requirement 5

**User Story:** As a user, I want the transcription to handle network interruptions gracefully, so that I don't lose my recording if connectivity drops briefly.

#### Acceptance Criteria

1. WHEN the WebSocket connection is lost THEN the Incremental Transcription System SHALL buffer audio locally and attempt reconnection with exponential backoff
2. WHEN reconnection succeeds THEN the Incremental Transcription System SHALL resume streaming from the buffered audio without data loss
3. IF reconnection fails after 3 attempts THEN the Incremental Transcription System SHALL notify the user and offer to save the audio for later transcription
4. WHILE disconnected THEN the Recording Indicator SHALL display a connection status warning
5. WHEN connection is restored THEN the Incremental Transcription System SHALL process any buffered audio and update the transcript

### Requirement 6

**User Story:** As a user, I want to pause and resume recording, so that I can collect my thoughts without creating multiple voice notes.

#### Acceptance Criteria

1. WHEN the user clicks the pause button THEN the Recording System SHALL stop capturing audio and preserve the current transcript state
2. WHEN the user clicks resume THEN the Recording System SHALL continue capturing audio and appending to the existing transcript
3. WHILE paused THEN the Recording Indicator SHALL display a paused state with total elapsed recording time
4. WHEN paused for more than 5 minutes THEN the Recording System SHALL prompt the user to continue or finalize the recording
5. WHEN resuming after pause THEN the Incremental Transcription System SHALL insert a visual separator in the transcript to indicate the pause point

### Requirement 7

**User Story:** As a developer, I want the incremental transcription to use efficient streaming protocols, so that the system performs well on mobile devices.

#### Acceptance Criteria

1. WHEN streaming audio THEN the Audio Streaming System SHALL use WebSocket binary frames to minimize overhead
2. WHEN encoding audio THEN the Audio Streaming System SHALL use Opus codec at 16kHz sample rate for optimal quality-to-bandwidth ratio
3. WHEN the device has limited bandwidth THEN the Audio Streaming System SHALL adapt audio quality to maintain real-time streaming
4. WHEN memory usage exceeds 100MB for audio buffers THEN the Audio Streaming System SHALL flush older segments to prevent memory exhaustion
5. WHEN the recording exceeds 10 minutes THEN the Audio Streaming System SHALL segment the audio into manageable chunks for processing
