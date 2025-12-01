/**
 * WebSocket Handler for Voice Notes
 *
 * Provides real-time communication for voice note recording sessions:
 * - Audio streaming from client to server
 * - Interim transcript updates
 * - Final transcript updates
 * - Status change notifications
 * - Error notifications
 *
 * Requirements: 1.4, 1.5, 7.7
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { VoiceNoteService, SessionEvent } from './voice-note-service';
import { Contact } from '../types';

/**
 * WebSocket message types
 */
export enum WSMessageType {
  // Client -> Server
  START_SESSION = 'start_session',
  AUDIO_CHUNK = 'audio_chunk',
  PAUSE_SESSION = 'pause_session',
  RESUME_SESSION = 'resume_session',
  END_SESSION = 'end_session',
  CANCEL_SESSION = 'cancel_session',

  // Server -> Client
  SESSION_STARTED = 'session_started',
  INTERIM_TRANSCRIPT = 'interim_transcript',
  FINAL_TRANSCRIPT = 'final_transcript',
  ENRICHMENT_UPDATE = 'enrichment_update',
  CONNECTION_STATUS = 'connection_status',
  STATUS_CHANGE = 'status_change',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
  RECONNECTED = 'reconnected',
  SESSION_FINALIZED = 'session_finalized',
}

/**
 * WebSocket message structure
 */
export interface WSMessage {
  type: WSMessageType;
  data: any;
}

/**
 * Client connection metadata
 */
interface ClientConnection {
  ws: WebSocket;
  userId: string;
  sessionId?: string;
}

/**
 * WebSocket Handler for Voice Notes
 */
export class VoiceNoteWebSocketHandler {
  private wss: WebSocketServer;
  private voiceNoteService: VoiceNoteService;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private sessionClients: Map<string, WebSocket> = new Map();

  constructor(wss: WebSocketServer, voiceNoteService?: VoiceNoteService) {
    this.wss = wss;
    this.voiceNoteService = voiceNoteService || VoiceNoteService.getInstance();
    this.setupWebSocketServer();
    this.setupServiceEventHandlers();
  }

  /**
   * Set up WebSocket server event handlers
   *
   * @private
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      console.log('New WebSocket connection established');

      // Extract user ID from query parameters or headers
      const userId = this.extractUserId(request);
      if (!userId) {
        ws.close(1008, 'User ID required');
        return;
      }

      // Store client connection
      this.clients.set(ws, { ws, userId });

      // Set up message handler
      ws.on('message', (data: Buffer) => {
        this.handleClientMessage(ws, data);
      });

      // Set up close handler
      ws.on('close', () => {
        this.handleClientDisconnect(ws);
      });

      // Set up error handler
      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
      });

      // Send connection confirmation
      this.sendMessage(ws, {
        type: WSMessageType.STATUS_CHANGE,
        data: { status: 'connected' },
      });
    });
  }

  /**
   * Set up voice note service event handlers
   *
   * @private
   */
  private setupServiceEventHandlers(): void {
    // Interim transcript events
    this.voiceNoteService.on(SessionEvent.INTERIM_TRANSCRIPT, (event: any) => {
      const ws = this.sessionClients.get(event.sessionId);
      if (ws) {
        this.sendMessage(ws, {
          type: WSMessageType.INTERIM_TRANSCRIPT,
          data: {
            transcript: event.transcript,
            confidence: event.confidence,
          },
        });
      }
    });

    // Final transcript events
    this.voiceNoteService.on(SessionEvent.FINAL_TRANSCRIPT, (event: any) => {
      const ws = this.sessionClients.get(event.sessionId);
      if (ws) {
        this.sendMessage(ws, {
          type: WSMessageType.FINAL_TRANSCRIPT,
          data: {
            transcript: event.transcript,
            fullTranscript: event.fullTranscript,
            confidence: event.confidence,
          },
        });
      }
    });

    // Status change events
    this.voiceNoteService.on(SessionEvent.STATUS_CHANGE, (event: any) => {
      const ws = this.sessionClients.get(event.sessionId);
      if (ws) {
        this.sendMessage(ws, {
          type: WSMessageType.STATUS_CHANGE,
          data: {
            status: event.status,
          },
        });
      }
    });

    // Error events
    this.voiceNoteService.on(SessionEvent.ERROR, (event: any) => {
      const ws = this.sessionClients.get(event.sessionId);
      if (ws) {
        this.sendMessage(ws, {
          type: WSMessageType.ERROR,
          data: {
            error: event.error,
          },
        });
      }
    });

    // Reconnecting events
    this.voiceNoteService.on(SessionEvent.RECONNECTING, (event: any) => {
      const ws = this.sessionClients.get(event.sessionId);
      if (ws) {
        this.sendMessage(ws, {
          type: WSMessageType.RECONNECTING,
          data: {
            attempt: event.attempt,
          },
        });
      }
    });

    // Reconnected events
    this.voiceNoteService.on(SessionEvent.RECONNECTED, (event: any) => {
      const ws = this.sessionClients.get(event.sessionId);
      if (ws) {
        this.sendMessage(ws, {
          type: WSMessageType.RECONNECTED,
          data: {},
        });
      }
    });

    // Enrichment update events (will be implemented in task 6)
    this.voiceNoteService.on('enrichment_update', (event: any) => {
      const ws = this.sessionClients.get(event.sessionId);
      if (ws) {
        this.sendMessage(ws, {
          type: WSMessageType.ENRICHMENT_UPDATE,
          data: {
            suggestions: event.suggestions,
          },
        });
      }
    });
  }

  /**
   * Handle incoming client message
   *
   * @param ws - WebSocket connection
   * @param data - Message data
   * @private
   */
  private async handleClientMessage(ws: WebSocket, data: Buffer): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) {
      console.error('Client not found in clients map');
      return;
    }

    try {
      // Try to parse as JSON message
      const message: WSMessage = JSON.parse(data.toString());
      console.log('Received WebSocket message:', message.type, message.data);

      switch (message.type) {
        case WSMessageType.STATUS_CHANGE:
          // Associate existing session with this WebSocket (legacy support)
          if ((message as any).sessionId) {
            client.sessionId = (message as any).sessionId;
            this.sessionClients.set((message as any).sessionId, ws);
            console.log(`Associated session ${(message as any).sessionId} with WebSocket`);

            // Send confirmation
            this.sendMessage(ws, {
              type: WSMessageType.STATUS_CHANGE,
              data: { status: 'session_associated', sessionId: (message as any).sessionId },
            });
          }
          break;

        case WSMessageType.START_SESSION:
          await this.handleStartSession(ws, client, message.data);
          break;

        case WSMessageType.PAUSE_SESSION:
          await this.handlePauseSession(ws, client);
          break;

        case WSMessageType.RESUME_SESSION:
          await this.handleResumeSession(ws, client);
          break;

        case WSMessageType.END_SESSION:
          await this.handleEndSession(ws, client, message.data);
          break;

        case WSMessageType.CANCEL_SESSION:
          await this.handleCancelSession(ws, client);
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (parseError) {
      // If not JSON, treat as audio chunk
      if (client.sessionId) {
        await this.handleAudioChunk(client.sessionId, data);
      } else {
        console.error('Received audio chunk without active session');
      }
    }
  }

  /**
   * Handle start session request
   *
   * @param ws - WebSocket connection
   * @param client - Client connection metadata
   * @param data - Session start data
   * @private
   */
  private async handleStartSession(
    ws: WebSocket,
    client: ClientConnection,
    data: any
  ): Promise<void> {
    try {
      console.log('handleStartSession called for user:', client.userId);
      console.log('handleStartSession data:', JSON.stringify(data));
      const languageCode = data?.languageCode || 'en-US';
      const userContacts: Contact[] = data?.userContacts || [];
      console.log(`handleStartSession received ${userContacts.length} contacts`);

      // Create voice note session
      console.log('Creating session with languageCode:', languageCode);
      const session = await this.voiceNoteService.createSession(client.userId, languageCode);

      console.log('Session created:', session.id);

      // Set user contacts for incremental enrichment context (Proposal B)
      if (userContacts.length > 0) {
        this.voiceNoteService.setSessionContacts(session.id, userContacts);
        console.log(`Set ${userContacts.length} contacts for incremental enrichment`);
      }

      // Associate session with client
      client.sessionId = session.id;
      this.sessionClients.set(session.id, ws);

      // Send session started confirmation
      console.log('Sending session_started message');
      this.sendMessage(ws, {
        type: WSMessageType.SESSION_STARTED,
        data: {
          sessionId: session.id,
          startTime: session.startTime,
        },
      });
      console.log('session_started message sent');
    } catch (error) {
      console.error('Error in handleStartSession:', error);
      this.sendMessage(ws, {
        type: WSMessageType.ERROR,
        data: {
          error: error instanceof Error ? error.message : 'Failed to start session',
        },
      });
    }
  }

  /**
   * Handle audio chunk
   *
   * @param sessionId - Session ID
   * @param audioChunk - Audio data buffer
   * @private
   */
  private async handleAudioChunk(sessionId: string, audioChunk: Buffer): Promise<void> {
    try {
      await this.voiceNoteService.processAudioChunk(sessionId, audioChunk);
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      const ws = this.sessionClients.get(sessionId);
      if (ws) {
        this.sendMessage(ws, {
          type: WSMessageType.ERROR,
          data: {
            error: error instanceof Error ? error.message : 'Failed to process audio',
          },
        });
      }
    }
  }

  /**
   * Handle pause session request
   *
   * @param ws - WebSocket connection
   * @param client - Client connection metadata
   * @private
   */
  private async handlePauseSession(ws: WebSocket, client: ClientConnection): Promise<void> {
    if (!client.sessionId) {
      this.sendMessage(ws, {
        type: WSMessageType.ERROR,
        data: { error: 'No active session' },
      });
      return;
    }

    try {
      await this.voiceNoteService.pauseSession(client.sessionId);

      this.sendMessage(ws, {
        type: WSMessageType.STATUS_CHANGE,
        data: { status: 'paused' },
      });
    } catch (error) {
      this.sendMessage(ws, {
        type: WSMessageType.ERROR,
        data: {
          error: error instanceof Error ? error.message : 'Failed to pause session',
        },
      });
    }
  }

  /**
   * Handle resume session request
   *
   * @param ws - WebSocket connection
   * @param client - Client connection metadata
   * @private
   */
  private async handleResumeSession(ws: WebSocket, client: ClientConnection): Promise<void> {
    if (!client.sessionId) {
      this.sendMessage(ws, {
        type: WSMessageType.ERROR,
        data: { error: 'No active session' },
      });
      return;
    }

    try {
      await this.voiceNoteService.resumeSession(client.sessionId);

      this.sendMessage(ws, {
        type: WSMessageType.STATUS_CHANGE,
        data: { status: 'recording' },
      });
    } catch (error) {
      this.sendMessage(ws, {
        type: WSMessageType.ERROR,
        data: {
          error: error instanceof Error ? error.message : 'Failed to resume session',
        },
      });
    }
  }

  /**
   * Handle end session request
   *
   * @param ws - WebSocket connection
   * @param client - Client connection metadata
   * @param data - Session end data (includes userContacts)
   * @private
   */
  private async handleEndSession(
    ws: WebSocket,
    client: ClientConnection,
    data: any
  ): Promise<void> {
    if (!client.sessionId) {
      this.sendMessage(ws, {
        type: WSMessageType.ERROR,
        data: { error: 'No active session' },
      });
      return;
    }

    try {
      // Get user contacts from data or fetch from database
      const userContacts: Contact[] = data.userContacts || [];

      // Finalize voice note
      const result = await this.voiceNoteService.finalizeVoiceNote(client.sessionId, userContacts);

      // Send finalization result
      this.sendMessage(ws, {
        type: WSMessageType.SESSION_FINALIZED,
        data: {
          voiceNote: result.voiceNote,
          proposal: result.proposal,
        },
      });

      // Clean up session mapping
      this.sessionClients.delete(client.sessionId);
      client.sessionId = undefined;
    } catch (error) {
      this.sendMessage(ws, {
        type: WSMessageType.ERROR,
        data: {
          error: error instanceof Error ? error.message : 'Failed to finalize session',
        },
      });
    }
  }

  /**
   * Handle cancel session request
   *
   * @param ws - WebSocket connection
   * @param client - Client connection metadata
   * @private
   */
  private async handleCancelSession(ws: WebSocket, client: ClientConnection): Promise<void> {
    if (!client.sessionId) {
      return;
    }

    try {
      await this.voiceNoteService.cancelSession(client.sessionId);

      // Clean up session mapping
      this.sessionClients.delete(client.sessionId);
      client.sessionId = undefined;

      this.sendMessage(ws, {
        type: WSMessageType.STATUS_CHANGE,
        data: { status: 'cancelled' },
      });
    } catch (error) {
      console.error('Error cancelling session:', error);
    }
  }

  /**
   * Handle client disconnect
   *
   * @param ws - WebSocket connection
   * @private
   */
  private handleClientDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client) {
      return;
    }

    console.log(`Client disconnected: ${client.userId}`);

    // Don't cancel the session - keep it alive for finalization via REST API
    // Just remove the WebSocket association
    if (client.sessionId) {
      this.sessionClients.delete(client.sessionId);
      console.log(
        `WebSocket disconnected but session ${client.sessionId} kept alive for finalization`
      );
    }

    // Remove client
    this.clients.delete(ws);
  }

  /**
   * Send message to client
   *
   * @param ws - WebSocket connection
   * @param message - Message to send
   * @private
   */
  private sendMessage(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Extract user ID from request
   *
   * @param request - Incoming HTTP request
   * @returns User ID or null
   * @private
   */
  private extractUserId(request: IncomingMessage): string | null {
    // Try to get from query parameters
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const userId = url.searchParams.get('userId');

    if (userId) {
      return userId;
    }

    // Try to get from headers (e.g., Authorization header)
    // This is a placeholder - in production, you'd decode JWT token
    const authHeader = request.headers.authorization;
    if (authHeader) {
      // Extract user ID from token
      // For now, just return a placeholder
      return 'user-from-token';
    }

    return null;
  }

  /**
   * Broadcast message to all clients
   *
   * @param message - Message to broadcast
   */
  broadcastMessage(message: WSMessage): void {
    this.clients.forEach((client) => {
      this.sendMessage(client.ws, message);
    });
  }

  /**
   * Send message to specific user
   *
   * @param userId - User ID
   * @param message - Message to send
   */
  sendToUser(userId: string, message: WSMessage): void {
    this.clients.forEach((client) => {
      if (client.userId === userId) {
        this.sendMessage(client.ws, message);
      }
    });
  }

  /**
   * Send connection status update to a session
   *
   * @param sessionId - Session ID
   * @param status - Connection status
   * @param attempt - Reconnection attempt number (optional)
   */
  sendConnectionStatus(
    sessionId: string,
    status: 'connected' | 'reconnecting' | 'disconnected',
    attempt?: number
  ): void {
    const ws = this.sessionClients.get(sessionId);
    if (ws) {
      this.sendMessage(ws, {
        type: WSMessageType.CONNECTION_STATUS,
        data: { status, attempt },
      });
    }
  }

  /**
   * Get active session count
   *
   * @returns Number of active sessions
   */
  getActiveSessionCount(): number {
    return this.sessionClients.size;
  }

  /**
   * Get connected client count
   *
   * @returns Number of connected clients
   */
  getConnectedClientCount(): number {
    return this.clients.size;
  }
}
