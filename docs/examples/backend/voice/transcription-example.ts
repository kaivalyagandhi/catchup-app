/**
 * Example usage of TranscriptionService
 * 
 * This file demonstrates how to use the TranscriptionService for real-time
 * audio transcription with Google Cloud Speech-to-Text API.
 */

import { TranscriptionService } from './transcription-service';

/**
 * Example: Basic streaming transcription
 */
async function basicStreamingExample() {
  const transcriptionService = new TranscriptionService();

  // Set up event handlers
  transcriptionService.onInterimResult((result) => {
    console.log(`[Interim] ${result.transcript}`);
  });

  transcriptionService.onFinalResult((result) => {
    console.log(`[Final] ${result.transcript} (confidence: ${result.confidence})`);
  });

  transcriptionService.onError((error) => {
    console.error('Transcription error:', error);
  });

  // Start streaming
  const stream = await transcriptionService.startStream({
    languageCode: 'en-US',
    sampleRateHertz: 16000,
    interimResults: true,
  });

  // Simulate sending audio chunks
  // In a real application, these would come from a microphone or audio file
  const audioChunks = getAudioChunks(); // Your audio data source
  
  for (const chunk of audioChunks) {
    await transcriptionService.sendAudioChunk(stream, chunk);
  }

  // Close the stream when done
  await transcriptionService.closeStream(stream);
}

/**
 * Example: Streaming with reconnection handling
 */
async function streamingWithReconnectionExample() {
  const transcriptionService = new TranscriptionService();

  // Configure reconnection behavior
  transcriptionService.setReconnectionConfig({
    maxRetries: 5,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  });

  // Set up event handlers
  transcriptionService.onInterimResult((result) => {
    console.log(`[Interim] ${result.transcript}`);
  });

  transcriptionService.onFinalResult((result) => {
    console.log(`[Final] ${result.transcript}`);
  });

  transcriptionService.onReconnecting((attempt) => {
    console.log(`Reconnecting... (attempt ${attempt})`);
  });

  transcriptionService.onReconnected(() => {
    console.log('Successfully reconnected!');
  });

  transcriptionService.onError((error) => {
    console.error('Transcription error:', error);
  });

  // Start streaming
  const stream = await transcriptionService.startStream({
    languageCode: 'en-US',
    sampleRateHertz: 16000,
    interimResults: true,
  });

  // Your audio streaming logic here
  // ...

  await transcriptionService.closeStream(stream);
}

/**
 * Example: WebSocket integration for browser audio
 */
async function webSocketIntegrationExample() {
  const transcriptionService = new TranscriptionService();
  
  let currentStream: any = null;

  // WebSocket server handler (pseudo-code)
  const handleWebSocketConnection = async (ws: any) => {
    // Start transcription stream
    currentStream = await transcriptionService.startStream({
      languageCode: 'en-US',
      sampleRateHertz: 16000,
      interimResults: true,
    });

    // Forward interim results to client
    transcriptionService.onInterimResult((result) => {
      ws.send(JSON.stringify({
        type: 'interim',
        transcript: result.transcript,
      }));
    });

    // Forward final results to client
    transcriptionService.onFinalResult((result) => {
      ws.send(JSON.stringify({
        type: 'final',
        transcript: result.transcript,
        confidence: result.confidence,
      }));
    });

    // Handle incoming audio chunks from browser
    ws.on('message', async (data: Buffer) => {
      if (currentStream) {
        await transcriptionService.sendAudioChunk(currentStream, data);
      }
    });

    // Clean up on disconnect
    ws.on('close', async () => {
      if (currentStream) {
        await transcriptionService.closeStream(currentStream);
      }
    });
  };

  return handleWebSocketConnection;
}

/**
 * Placeholder function for getting audio chunks
 * In a real application, this would read from a microphone or file
 */
function getAudioChunks(): Buffer[] {
  // This is just a placeholder
  // In reality, you would:
  // 1. Read from a microphone using node-record-lpcm16 or similar
  // 2. Read from an audio file in chunks
  // 3. Receive chunks from a WebSocket connection
  return [];
}

// Export examples
export {
  basicStreamingExample,
  streamingWithReconnectionExample,
  webSocketIntegrationExample,
};
