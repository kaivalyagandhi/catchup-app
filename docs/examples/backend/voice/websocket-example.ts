/**
 * WebSocket Integration Example
 * 
 * Demonstrates how to integrate the VoiceNoteWebSocketHandler with an Express server.
 * This example shows the complete setup for real-time voice note recording.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { VoiceNoteWebSocketHandler } from './websocket-handler';
import { VoiceNoteService } from './voice-note-service';

/**
 * Set up Express server with WebSocket support for voice notes
 */
export function setupVoiceNoteWebSocket(app: express.Application): void {
  // Create HTTP server
  const server = createServer(app);

  // Create WebSocket server on /ws/voice-notes path
  const wss = new WebSocketServer({
    server,
    path: '/ws/voice-notes',
  });

  // Create voice note service
  const voiceNoteService = new VoiceNoteService();

  // Create WebSocket handler
  const wsHandler = new VoiceNoteWebSocketHandler(wss, voiceNoteService);

  console.log('Voice Note WebSocket server initialized on /ws/voice-notes');

  // Optional: Add health check endpoint
  app.get('/api/voice-notes/ws/health', (req, res) => {
    res.json({
      status: 'ok',
      activeSessions: wsHandler.getActiveSessionCount(),
      connectedClients: wsHandler.getConnectedClientCount(),
    });
  });

  // Start server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws/voice-notes`);
  });
}


/**
 * Example client-side usage (for reference)
 * 
 * This would be implemented in the frontend JavaScript/TypeScript:
 * 
 * ```javascript
 * // Connect to WebSocket
 * const ws = new WebSocket('ws://localhost:3000/ws/voice-notes?userId=user-123');
 * 
 * // Handle connection open
 * ws.onopen = () => {
 *   console.log('Connected to voice note WebSocket');
 *   
 *   // Start recording session
 *   ws.send(JSON.stringify({
 *     type: 'start_session',
 *     data: { languageCode: 'en-US' }
 *   }));
 * };
 * 
 * // Handle incoming messages
 * ws.onmessage = (event) => {
 *   const message = JSON.parse(event.data);
 *   
 *   switch (message.type) {
 *     case 'session_started':
 *       console.log('Session started:', message.data.sessionId);
 *       startAudioRecording();
 *       break;
 *       
 *     case 'interim_transcript':
 *       updateTranscriptDisplay(message.data.transcript, false);
 *       break;
 *       
 *     case 'final_transcript':
 *       updateTranscriptDisplay(message.data.transcript, true);
 *       break;
 *       
 *     case 'status_change':
 *       updateStatusIndicator(message.data.status);
 *       break;
 *       
 *     case 'session_finalized':
 *       showEnrichmentProposal(message.data.proposal);
 *       break;
 *       
 *     case 'error':
 *       showError(message.data.error);
 *       break;
 *   }
 * };
 * 
 * // Send audio chunks
 * function sendAudioChunk(audioBuffer) {
 *   if (ws.readyState === WebSocket.OPEN) {
 *     ws.send(audioBuffer); // Send raw audio data
 *   }
 * }
 * 
 * // End recording session
 * function stopRecording(userContacts) {
 *   ws.send(JSON.stringify({
 *     type: 'end_session',
 *     data: { userContacts }
 *   }));
 * }
 * 
 * // Cancel recording session
 * function cancelRecording() {
 *   ws.send(JSON.stringify({
 *     type: 'cancel_session',
 *     data: {}
 *   }));
 * }
 * ```
 */

/**
 * Example: Integrate with existing Express app
 */
export function exampleIntegration(): void {
  const app = express();

  // Add your existing middleware and routes
  app.use(express.json());

  // Add REST API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Set up WebSocket for voice notes
  setupVoiceNoteWebSocket(app);
}

// Uncomment to run example
// exampleIntegration();
